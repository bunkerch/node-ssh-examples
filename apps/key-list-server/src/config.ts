export function hostKeyFromEnvironment(): string {
  const value = process.env.SSH_HOST_KEY_PRIVATE_KEY
  if (!value) throw new Error("SSH_HOST_KEY_PRIVATE_KEY must contain an SSH host private key")
  return value.includes("\\n") && !value.includes("\n") ? value.replaceAll("\\n", "\n") : value
}

export function listenPort(defaultPort: number): number {
  const port = Number(process.env.PORT ?? defaultPort)
  if (!Number.isSafeInteger(port) || port < 1 || port > 65_535) {
    throw new Error("PORT must be an integer from 1 through 65535")
  }
  return port
}
