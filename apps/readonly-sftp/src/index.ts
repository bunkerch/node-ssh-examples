import { randomBytes } from "node:crypto"
import type { Stats } from "node:fs"
import { readdir, readFile, stat } from "node:fs/promises"
import { posix, resolve, sep } from "node:path"
import { fileURLToPath } from "node:url"
import {
  Server,
  SessionChannel,
  SFTPOpenFlags,
  SFTPStatusCode,
  type SFTPAttributes,
  type SFTPNameEntry,
  type SFTPServer,
} from "@bunkerch/modernssh"
import { hostKeyFromEnvironment, listenPort } from "./config.js"

const assetsRoot = fileURLToPath(new URL("../assets/", import.meta.url))
const decoder = new TextDecoder("utf-8", { fatal: true })

interface HandleState {
  path: string
  directoryEntries?: readonly SFTPNameEntry[]
}

function handleId(handle: Buffer): string {
  return handle.toString("base64")
}

function virtualPath(rawPath: Buffer): { absolute: string; display: string } {
  const requested = decoder.decode(rawPath).replaceAll("\\", "/")
  const display = posix.normalize(`/${requested}`)
  const absolute = resolve(assetsRoot, `.${display}`)
  const root = resolve(assetsRoot)
  if (absolute !== root && !absolute.startsWith(`${root}${sep}`)) {
    throw new Error("Path leaves the sample root")
  }
  return { absolute, display }
}

function attributes(info: Stats): SFTPAttributes {
  return {
    size: BigInt(info.size),
    permissions: (info.isDirectory() ? 0o040000 : 0o100000) | (info.mode & 0o555),
    accessTime: Math.floor(info.atimeMs / 1000),
    modificationTime: Math.floor(info.mtimeMs / 1000),
  }
}

async function directoryNames(absolute: string): Promise<readonly SFTPNameEntry[]> {
  const entries = await readdir(absolute, { withFileTypes: true })
  return Promise.all(
    entries.map(async (entry) => {
      const name = Buffer.from(entry.name)
      return {
        filename: name,
        longname: name,
        attributes: attributes(await stat(resolve(absolute, entry.name))),
      }
    }),
  )
}

function attachReadOnlyFilesystem(sftp: SFTPServer): void {
  const handles = new Map<string, HandleState>()

  sftp.hooker.hook("REALPATH", async (_hook, request) => {
    try {
      const path = virtualPath(request.path)
      await stat(path.absolute)
      await sftp.name(request.requestId, {
        filename: Buffer.from(path.display),
        longname: Buffer.from(path.display),
        attributes: attributes(await stat(path.absolute)),
      })
    } catch {
      await sftp.status(request.requestId, SFTPStatusCode.NoSuchFile)
    }
  })

  const sendPathAttributes = async (requestId: number, rawPath: Buffer): Promise<void> => {
    try {
      await sftp.attributes(requestId, attributes(await stat(virtualPath(rawPath).absolute)))
    } catch {
      await sftp.status(requestId, SFTPStatusCode.NoSuchFile)
    }
  }
  sftp.hooker.hook("STAT", (_hook, request) => sendPathAttributes(request.requestId, request.path))
  sftp.hooker.hook("LSTAT", (_hook, request) => sendPathAttributes(request.requestId, request.path))

  sftp.hooker.hook("OPEN", async (_hook, request) => {
    const writeFlags =
      SFTPOpenFlags.Write |
      SFTPOpenFlags.Append |
      SFTPOpenFlags.Create |
      SFTPOpenFlags.Truncate |
      SFTPOpenFlags.Exclusive
    if ((request.flags & SFTPOpenFlags.Read) === 0 || (request.flags & writeFlags) !== 0) {
      await sftp.status(request.requestId, SFTPStatusCode.PermissionDenied, "Read-only server")
      return
    }
    try {
      const path = virtualPath(request.filename).absolute
      if (!(await stat(path)).isFile()) throw new Error("Not a file")
      const handle = randomBytes(24)
      handles.set(handleId(handle), { path })
      await sftp.handle(request.requestId, handle)
    } catch {
      await sftp.status(request.requestId, SFTPStatusCode.NoSuchFile)
    }
  })

  sftp.hooker.hook("READ", async (_hook, request) => {
    const handle = handles.get(handleId(request.handle))
    if (!handle) {
      await sftp.status(request.requestId, SFTPStatusCode.Failure)
      return
    }
    const file = await readFile(handle.path)
    if (request.offset >= BigInt(file.length)) {
      await sftp.status(request.requestId, SFTPStatusCode.EOF)
      return
    }
    const start = Number(request.offset)
    await sftp.data(request.requestId, file.subarray(start, start + request.length))
  })

  sftp.hooker.hook("OPENDIR", async (_hook, request) => {
    try {
      const path = virtualPath(request.path).absolute
      if (!(await stat(path)).isDirectory()) throw new Error("Not a directory")
      const handle = randomBytes(24)
      handles.set(handleId(handle), { path, directoryEntries: await directoryNames(path) })
      await sftp.handle(request.requestId, handle)
    } catch {
      await sftp.status(request.requestId, SFTPStatusCode.NoSuchFile)
    }
  })

  sftp.hooker.hook("READDIR", async (_hook, request) => {
    const handle = handles.get(handleId(request.handle))
    if (!handle?.directoryEntries) {
      await sftp.status(request.requestId, SFTPStatusCode.EOF)
      return
    }
    const entries = handle.directoryEntries
    delete handle.directoryEntries
    await sftp.name(request.requestId, entries)
  })

  sftp.hooker.hook("FSTAT", async (_hook, request) => {
    const handle = handles.get(handleId(request.handle))
    if (!handle) {
      await sftp.status(request.requestId, SFTPStatusCode.Failure)
      return
    }
    await sftp.attributes(request.requestId, attributes(await stat(handle.path)))
  })

  sftp.hooker.hook("CLOSE", async (_hook, request) => {
    handles.delete(handleId(request.handle))
    await sftp.status(request.requestId, SFTPStatusCode.Ok)
  })

  sftp.hooker.hook("request", async (_hook, request) => {
    await sftp.status(request.requestId, SFTPStatusCode.PermissionDenied, "Read-only server")
  })
}

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
    channel.hooker.hook("subsystemRequest", (_hook, context, decision) => {
      decision.success = context.subsystem === "sftp"
    })
    channel.events.on("sftp", attachReadOnlyFilesystem)
  })
})

const port = listenPort(2223)
server.listen({ host: process.env.HOST ?? "0.0.0.0", port })
server.on("listening", () => console.log(`Read-only SFTP server listening on port ${port}`))
