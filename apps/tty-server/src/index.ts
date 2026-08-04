import { once } from "node:events"
import {
  Server,
  SessionChannel,
  type SessionWindowDimensions,
  type Shell,
} from "@bunkerch/modernssh"
import { hostKeyFromEnvironment, listenPort } from "./config.js"

const ESC = "\u001b["
const reset = `${ESC}0m`
const border = `${ESC}38;5;75m`
const muted = `${ESC}38;5;245m`
const bright = `${ESC}1;38;5;255m`
const accent = `${ESC}1;38;5;213m`

function center(value: string, width: number): string {
  if (value.length >= width) return value.slice(0, width)
  const left = Math.floor((width - value.length) / 2)
  return `${" ".repeat(left)}${value}${" ".repeat(width - value.length - left)}`
}

function row(content: string, width: number, color = bright): string {
  return `${border}│${reset}${color}${center(content, width - 2)}${reset}${border}│${reset}`
}

function renderFrame(dimensions: Readonly<SessionWindowDimensions>): string {
  const { columns, rows } = dimensions
  if (columns < 36 || rows < 12) {
    return `${ESC}H${ESC}2J${accent}Resize this terminal to at least 36 × 12.${reset}`
  }

  const width = Math.min(columns, 82)
  const height = Math.min(rows - 1, 22)
  const emptyRows = Math.max(0, height - 9)
  const lines = [
    `${border}╭${"─".repeat(width - 2)}╮${reset}`,
    row("modernssh TTY", width, accent),
    row("", width),
    row("A real PTY was allocated for this SSH session.", width),
    row(`${columns} columns × ${rows} rows`, width, bright),
    row("", width),
    row("Resize the window and this frame will follow.", width, muted),
    ...Array.from({ length: emptyRows }, () => row("", width)),
    row("Press q or Ctrl-C to disconnect", width, muted),
    `${border}╰${"─".repeat(width - 2)}╯${reset}`,
  ]
  return `${ESC}H${lines.join("\r\n")}${ESC}J`
}

async function closeSession(shell: Shell): Promise<void> {
  await shell.writeStdout(`${ESC}?25h${ESC}?1049l${reset}`)
  const closed = once(shell, "close")
  shell.exit(0).close()
  await closed
}

const port = listenPort(2225)
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

    let shell: Shell | undefined
    let dimensions: Readonly<SessionWindowDimensions> | undefined
    let closing = false

    channel.hooker.hook("ptyRequest", (_hook, requested, decision) => {
      dimensions = requested
      decision.success = true
    })
    channel.hooker.hook("shellRequest", (_hook, decision) => {
      decision.success = true
    })
    channel.hooker.hook("windowChange", async (_hook, resized) => {
      dimensions = resized
      if (shell && !closing) await shell.writeStdout(renderFrame(resized))
    })

    channel.events.on("shell", (openedShell) => {
      shell = openedShell
      if (!channel.pty || !dimensions) {
        void (async () => {
          await openedShell.writeStdout("No TTY detected. Reconnect with ssh -t.\n")
          const closed = once(openedShell, "close")
          openedShell.exit(1).close()
          await closed
          await connection.close()
        })().catch((error: unknown) => {
          openedShell.destroy(error instanceof Error ? error : new Error(String(error)))
        })
        return
      }

      void openedShell
        .writeStdout(`${ESC}?1049h${ESC}?25l${ESC}2J${renderFrame(dimensions)}`)
        .catch((error: unknown) => {
          openedShell.destroy(error instanceof Error ? error : new Error(String(error)))
        })

      openedShell.on("data", (data: Buffer) => {
        if (closing || (!data.includes(0x03) && !data.includes(0x71))) return
        closing = true
        void closeSession(openedShell)
          .then(() => connection.close())
          .catch((error: unknown) => {
            openedShell.destroy(error instanceof Error ? error : new Error(String(error)))
          })
      })
    })
  })
})

server.listen({ host: process.env.HOST ?? "0.0.0.0", port })
server.on("listening", () => console.log(`TTY SSH server listening on port ${port}`))
