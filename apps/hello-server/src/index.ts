import { once } from "node:events"
import { Server, SessionChannel, type Shell } from "@bunkerch/modernssh"
import { hostKeyFromEnvironment, listenPort } from "./config.js"

const message =
  "Hello! This is a simple ssh server using [npm link]! Unfortunately, we do not provide shell access.\n"
const server = new Server({ hostKeys: [hostKeyFromEnvironment()] })

server.on("error", (error) => console.error("SSH server error", error))
server.hooker.hook("noneAuthentication", (_hook, _context, decision) => {
  decision.allowLogin = true
})
server.hooker.hook("channelOpenRequest", (_hook, channel, decision) => {
  decision.allowOpen = channel instanceof SessionChannel
})

server.on("connection", (connection) => {
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
      void (async () => {
        await shell.writeStdout(message)
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

const port = listenPort(2222)
server.listen({ host: process.env.HOST ?? "0.0.0.0", port })
server.on("listening", () => console.log(`Hello SSH server listening on port ${port}`))
