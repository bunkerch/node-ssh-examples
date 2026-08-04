# modernssh examples

A pnpm monorepo containing three strict-TypeScript SSH servers powered by
[`@bunkerch/modernssh`](https://modernssh.bunkerx.dev) and a Vinext landing page with connection
commands.

## Applications

| App | Default port | Authentication | Purpose |
| --- | ---: | --- | --- |
| `hello-server` | 2222 | `none` | Prints the requested greeting and closes the session. |
| `readonly-sftp` | 2223 | `none` | Serves the bundled `assets/` tree over read-only SFTP. |
| `key-list-server` | 2224 | anonymous fallback | Prints unsigned keys offered by the client. |
| `web` | 3000 | n/a | Shows ports and copyable SSH/SFTP commands using Vinext. |

OpenSSH sends an initial `none` discovery request before it offers public keys and does not retry
`none` afterward. The key-list server rejects that first request, records and rejects every unsigned
public-key offer without requesting a signature, then accepts the client's prompt-free
keyboard-interactive fallback. This lets an ordinary OpenSSH client finish without asking an agent,
1Password, or a passphrase-protected key to sign anything. The server increases the authentication
attempt limit to accommodate agents containing many keys.

## Requirements

- Node.js 20.19 or newer (the Dockerfiles use Node.js 24)
- pnpm 10.19
- An unencrypted or passphrase-free SSH private key for the server host key

Install and validate everything:

```sh
pnpm install
pnpm typecheck
pnpm build
```

## Run locally

Generate one development host key outside the repository:

```sh
ssh-keygen -q -t ed25519 -N '' -f /tmp/modernssh-example-host-key
export SSH_HOST_KEY_PRIVATE_KEY="$(cat /tmp/modernssh-example-host-key)"
```

Start all four apps, or use `pnpm --filter <package-name> dev` to start one:

```sh
pnpm dev
```

Then try:

```sh
ssh -o PreferredAuthentications=none -o PubkeyAuthentication=no -p 2222 demo@localhost
sftp -o PreferredAuthentications=none -o PubkeyAuthentication=no -P 2223 demo@localhost
ssh -p 2224 demo@localhost
```

The username is deliberately ignored by every example. The key-list server intentionally performs
no identity verification; it uses keyboard-interactive without prompts only as an interoperable
anonymous fallback after key enumeration. These servers are demonstrations, not production
authorization policies.

## Configuration

All SSH apps accept:

| Variable | Meaning |
| --- | --- |
| `SSH_HOST_KEY_PRIVATE_KEY` | Required encoded private host key. Actual newlines and `\\n`-escaped newlines are supported. |
| `HOST` | Bind address; defaults to `0.0.0.0`. |
| `PORT` | Listen port; defaults to the value in the app table. |

The web app reads its values at request time, so its image can be configured after it is built:

| Variable | Default |
| --- | --- |
| `EXAMPLES_DOMAIN` | `localhost` |
| `HELLO_SSH_PORT` | `2222` |
| `SFTP_SSH_PORT` | `2223` |
| `KEYS_SSH_PORT` | `2224` |
| `SSH_USERNAME` | `demo` |
| `HOST` / `PORT` | `0.0.0.0` / `3000` |

## Docker

Each app owns a Dockerfile. Build from the monorepo root because the build needs the workspace lock
file:

```sh
docker build -f apps/hello-server/Dockerfile -t modernssh-hello .
docker build -f apps/readonly-sftp/Dockerfile -t modernssh-sftp .
docker build -f apps/key-list-server/Dockerfile -t modernssh-keys .
docker build -f apps/web/Dockerfile -t modernssh-web .
```

Example run command:

```sh
docker run --rm -p 2222:2222 \
  -e SSH_HOST_KEY_PRIVATE_KEY="$(cat /tmp/modernssh-example-host-key)" \
  modernssh-hello
```

The server images run as the unprivileged `node` user. The web image uses Vinext's standalone Node
output and can receive the deployment domain and exposed SSH ports through environment variables.
