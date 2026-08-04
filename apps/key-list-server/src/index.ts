import { once } from "node:events"
import {
  Server,
  SessionChannel,
  type PublicKey,
  type ServerClient,
  type Shell,
} from "@bunkerch/modernssh"
import { hostKeyFromEnvironment, listenPort } from "./config.js"

interface AdvertisedKey {
  algorithm: string
  fingerprint: string
  authorizedKey: string
}

const advertisedKeys = new WeakMap<ServerClient, Map<string, AdvertisedKey>>()
const server = new Server({
  hostKeys: [hostKeyFromEnvironment()],
  maxAuthenticationAttempts: 256,
})

function describeKey(publicKey: PublicKey, algorithm: string): AdvertisedKey {
  return {
    algorithm,
    fingerprint: publicKey.hash("sha256"),
    authorizedKey: publicKey.toString(),
  }
}

server.on("error", (error) => console.error("SSH server error", error))
server.hooker.hook("noneAuthentication", (_hook, _context, decision) => {
  // OpenSSH uses this first request to discover the available authentication methods. Accepting
  // it would finish authentication before the client has a chance to advertise its public keys.
  decision.allowLogin = false
})
server.hooker.hook("publicKeyAuthentication", (_hook, context, decision, connection) => {
  let keys = advertisedKeys.get(connection)
  if (!keys) {
    keys = new Map()
    advertisedKeys.set(connection, keys)
  }

  const key = describeKey(context.publicKey, context.algorithm)
  keys.set(key.fingerprint, key)
  decision.requestSignature = false
  decision.allowLogin = false
})
server.hooker.hook("keyboardInteractiveAuthentication", (_hook, _context, decision) => {
  // OpenSSH reaches this method after exhausting its unsigned public-key offers. No prompts or
  // signatures are requested; keyboard-interactive is only the interoperable anonymous fallback.
  decision.allowLogin = true
})
server.hooker.hook("channelOpenRequest", (_hook, channel, decision) => {
  decision.allowOpen = channel instanceof SessionChannel
})

server.on("connection", (connection) => {
  advertisedKeys.set(connection, new Map())
  connection.on("error", (error) => console.error("SSH peer error", error))
  connection.on("channel", (channel) => {
    if (!(channel instanceof SessionChannel)) return

    channel.hooker.hook("shellRequest", (_hook, decision) => {
      decision.success = true
    })
    channel.hooker.hook("execRequest", (_hook, _context, decision) => {
      decision.success = true
    })

    const respond = (shell: Shell): void => {
      const keys = [...(advertisedKeys.get(connection)?.values() ?? [])]
      const lines = [
        `The client advertised ${keys.length} public key${keys.length === 1 ? "" : "s"} before anonymous access was granted.`,
        "",
        ...keys.flatMap((key, index) => [
          `${index + 1}. ${key.algorithm} ${key.fingerprint}`,
          `   ${key.authorizedKey}`,
        ]),
        "",
      ]
      void (async () => {
        await shell.writeStdout(lines.join("\n"))
        const closed = once(shell, "close")
        shell.exit(0).close()
        await closed
        await connection.close()
      })().catch((error: unknown) => {
        shell.destroy(error instanceof Error ? error : new Error(String(error)))
      })
    }
    channel.events.on("shell", respond)
    channel.events.on("exec", (_command, shell) => respond(shell))
  })
})

const port = listenPort(2224)
server.listen({ host: process.env.HOST ?? "0.0.0.0", port })
server.on("listening", () => console.log(`Public-key SSH server listening on port ${port}`))
