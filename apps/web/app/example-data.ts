export type ExampleId = "hello" | "sftp" | "keys"

export interface ExampleData {
  id: ExampleId
  index: string
  title: string
  shortTitle: string
  description: string
  port: string
  auth: string
  commands: readonly { label: string; value: string }[]
  features: readonly string[]
  code: string
  note?: string
}

function environment(name: string, fallback: string): string {
  return process.env[name]?.trim() || fallback
}

const helloCode = String.raw`import { once } from "node:events"
import { Server, SessionChannel } from "@bunkerch/modernssh"

const hostKey = process.env.SSH_HOST_KEY_PRIVATE_KEY
if (!hostKey) throw new Error("SSH_HOST_KEY_PRIVATE_KEY is required")

const server = new Server({ hostKeys: [hostKey] })

server.hooker.hook("noneAuthentication", (_hook, _context, decision) => {
  decision.allowLogin = true
})

server.hooker.hook("channelOpenRequest", (_hook, channel, decision) => {
  decision.allowOpen = channel instanceof SessionChannel
})

server.on("connection", (connection) => {
  connection.on("channel", (channel) => {
    if (!(channel instanceof SessionChannel)) return

    channel.hooker.hook("shellRequest", (_hook, decision) => {
      decision.success = true
    })

    channel.events.on("shell", (shell) => {
      void (async () => {
        await shell.writeStdout(
          "Hello! This is a simple ssh server using " +
            "https://www.npmjs.com/package/@bunkerch/modernssh! " +
            "Unfortunately, we do not provide shell access.\n",
        )
        const closed = once(shell, "close")
        shell.exit(0).close()
        await closed
        await connection.close()
      })().catch((error: unknown) => shell.destroy(error as Error))
    })
  })
})

server.listen({ host: "0.0.0.0", port: Number(process.env.PORT ?? 2222) })`

const sftpCode = String.raw`import { Server, SessionChannel, SFTPOpenFlags, SFTPStatusCode } from "@bunkerch/modernssh"

const hostKey = process.env.SSH_HOST_KEY_PRIVATE_KEY
if (!hostKey) throw new Error("SSH_HOST_KEY_PRIVATE_KEY is required")

const contents = Buffer.from("Hello from modernssh!\n")
const fileHandle = Buffer.from("hello.txt")
const directoryHandle = Buffer.from("root")
const fileAttributes = { size: BigInt(contents.length), permissions: 0o100444 }
const directoryAttributes = { size: 0n, permissions: 0o040555 }
const server = new Server({ hostKeys: [hostKey] })

server.hooker.hook("noneAuthentication", (_hook, _context, decision) => {
  decision.allowLogin = true
})
server.hooker.hook("channelOpenRequest", (_hook, channel, decision) => {
  decision.allowOpen = channel instanceof SessionChannel
})

server.on("connection", (connection) => {
  connection.on("channel", (channel) => {
    if (!(channel instanceof SessionChannel)) return
    channel.hooker.hook("subsystemRequest", (_hook, context, decision) => {
      decision.success = context.subsystem === "sftp"
    })

    channel.events.on("sftp", (sftp) => {
      let directoryWasRead = false

      sftp.hooker.hook("REALPATH", async (_hook, request) => {
        await sftp.name(request.requestId, {
          filename: Buffer.from("/"), longname: Buffer.from("/"), attributes: directoryAttributes,
        })
      })
      sftp.hooker.hook("STAT", async (_hook, request) => {
        const path = request.path.toString()
        await sftp.attributes(request.requestId, path === "/hello.txt" ? fileAttributes : directoryAttributes)
      })
      sftp.hooker.hook("LSTAT", async (_hook, request) => {
        const path = request.path.toString()
        await sftp.attributes(request.requestId, path === "/hello.txt" ? fileAttributes : directoryAttributes)
      })
      sftp.hooker.hook("OPENDIR", async (_hook, request) => {
        directoryWasRead = false
        await sftp.handle(request.requestId, directoryHandle)
      })
      sftp.hooker.hook("READDIR", async (_hook, request) => {
        if (directoryWasRead) {
          await sftp.status(request.requestId, SFTPStatusCode.EOF)
          return
        }
        directoryWasRead = true
        await sftp.name(request.requestId, {
          filename: Buffer.from("hello.txt"),
          longname: Buffer.from("hello.txt"),
          attributes: fileAttributes,
        })
      })
      sftp.hooker.hook("OPEN", async (_hook, request) => {
        if (request.filename.toString() !== "/hello.txt" || request.flags !== SFTPOpenFlags.Read) {
          await sftp.status(request.requestId, SFTPStatusCode.PermissionDenied)
          return
        }
        await sftp.handle(request.requestId, fileHandle)
      })
      sftp.hooker.hook("READ", async (_hook, request) => {
        const start = Number(request.offset)
        if (start >= contents.length) {
          await sftp.status(request.requestId, SFTPStatusCode.EOF)
          return
        }
        await sftp.data(request.requestId, contents.subarray(start, start + request.length))
      })
      sftp.hooker.hook("CLOSE", async (_hook, request) => {
        await sftp.status(request.requestId, SFTPStatusCode.Ok)
      })
      sftp.hooker.hook("request", async (_hook, request) => {
        await sftp.status(request.requestId, SFTPStatusCode.PermissionDenied, "Read-only server")
      })
    })
  })
})

server.listen({ host: "0.0.0.0", port: Number(process.env.PORT ?? 2223) })`

const keysCode = String.raw`import { once } from "node:events"
import { Server, SessionChannel, type PublicKey, type ServerClient } from "@bunkerch/modernssh"

const hostKey = process.env.SSH_HOST_KEY_PRIVATE_KEY
if (!hostKey) throw new Error("SSH_HOST_KEY_PRIVATE_KEY is required")

const keys = new WeakMap<ServerClient, Map<string, PublicKey>>()
const server = new Server({ hostKeys: [hostKey], maxAuthenticationAttempts: 256 })

server.hooker.hook("noneAuthentication", (_hook, _context, decision) => {
  decision.allowLogin = false
})
server.hooker.hook("publicKeyAuthentication", (_hook, context, decision, client) => {
  const advertised = keys.get(client) ?? new Map<string, PublicKey>()
  advertised.set(context.publicKey.hash("sha256"), context.publicKey)
  keys.set(client, advertised)

  // Reject the probe without SSH_MSG_USERAUTH_PK_OK, so the agent never signs.
  decision.requestSignature = false
  decision.allowLogin = false
})
server.hooker.hook("keyboardInteractiveAuthentication", (_hook, _context, decision) => {
  // OpenSSH reaches this fallback after it has offered every public key.
  decision.allowLogin = true
})
server.hooker.hook("channelOpenRequest", (_hook, channel, decision) => {
  decision.allowOpen = channel instanceof SessionChannel
})

server.on("connection", (connection) => {
  keys.set(connection, new Map())
  connection.on("channel", (channel) => {
    if (!(channel instanceof SessionChannel)) return
    channel.hooker.hook("shellRequest", (_hook, decision) => {
      decision.success = true
    })
    channel.events.on("shell", (shell) => {
      const output = [...(keys.get(connection) ?? [])]
        .map(([fingerprint, key]) => fingerprint + "\n" + key.toString())
        .join("\n\n")

      void (async () => {
        await shell.writeStdout(output + "\n")
        const closed = once(shell, "close")
        shell.exit(0).close()
        await closed
        await connection.close()
      })().catch((error: unknown) => shell.destroy(error as Error))
    })
  })
})

server.listen({ host: "0.0.0.0", port: Number(process.env.PORT ?? 2224) })`

export function getExamples(): readonly ExampleData[] {
  const domain = environment("EXAMPLES_DOMAIN", "localhost")
  const username = environment("SSH_USERNAME", "demo")
  const helloPort = environment("HELLO_SSH_PORT", "2222")
  const sftpPort = environment("SFTP_SSH_PORT", "2223")
  const keysPort = environment("KEYS_SSH_PORT", "2224")
  const none = "-o PreferredAuthentications=none -o PubkeyAuthentication=no"

  return [
    {
      id: "hello",
      index: "01",
      shortTitle: "Hello server",
      title: "Hello, then goodbye.",
      description: "A minimal SSH server that accepts anonymous connections, writes one message, and closes cleanly.",
      port: helloPort,
      auth: "none",
      commands: [{ label: "Connect", value: `ssh ${none} -p ${helloPort} ${username}@${domain}` }],
      features: ["Anonymous none authentication", "Session channels only", "Clean exit status and disconnect"],
      code: helloCode,
    },
    {
      id: "sftp",
      index: "02",
      shortTitle: "Read-only SFTP",
      title: "Files in, writes out.",
      description: "A read-only SFTP v3 server with downloadable sample files and an intentionally tiny attack surface.",
      port: sftpPort,
      auth: "none",
      commands: [
        { label: "Browse", value: `sftp ${none} -P ${sftpPort} ${username}@${domain}` },
        { label: "Download", value: `sftp ${none} -P ${sftpPort} ${username}@${domain}:/hello.txt ./hello.txt` },
      ],
      features: ["Anonymous none authentication", "Read and directory operations", "Every mutation denied"],
      code: sftpCode,
    },
    {
      id: "keys",
      index: "03",
      shortTitle: "Public-key mirror",
      title: "See what your agent offers.",
      description: "Lists unsigned public-key offers from your SSH client without ever asking your agent or password manager to sign.",
      port: keysPort,
      auth: "anonymous fallback",
      commands: [
        { label: "Inspect your agent", value: `ssh -p ${keysPort} ${username}@${domain}` },
        { label: "Offer one key", value: `ssh -o IdentitiesOnly=yes -i ~/.ssh/id_ed25519 -p ${keysPort} ${username}@${domain}` },
      ],
      features: ["Collects unsigned key probes", "Never requests a signature", "Prompt-free anonymous fallback"],
      code: keysCode,
      note: "OpenSSH sends none before public keys and never retries it. This server rejects that discovery request, records each unsigned key probe, and admits the later keyboard-interactive request without presenting a prompt.",
    },
  ]
}

export function getExample(id: ExampleId): ExampleData {
  const example = getExamples().find((candidate) => candidate.id === id)
  if (!example) throw new Error(`Unknown example: ${id}`)
  return example
}
