import { CopyCommand } from "./copy-command"

interface Example {
  accent: string
  description: string
  eyebrow: string
  number: string
  port: string
  title: string
  commands: readonly { label: string; value: string }[]
}

function environment(name: string, fallback: string): string {
  const value = process.env[name]?.trim()
  return value || fallback
}

export const dynamic = "force-dynamic"

export default function HomePage() {
  const domain = environment("EXAMPLES_DOMAIN", "localhost")
  const username = environment("SSH_USERNAME", "demo")
  const helloPort = environment("HELLO_SSH_PORT", "2222")
  const sftpPort = environment("SFTP_SSH_PORT", "2223")
  const keysPort = environment("KEYS_SSH_PORT", "2224")
  const noneOptions = "-o PreferredAuthentications=none -o PubkeyAuthentication=no"

  const examples: readonly Example[] = [
    {
      number: "01",
      eyebrow: "First contact",
      title: "Hello, then goodbye",
      description:
        "Accepts the SSH none authentication method, prints one friendly message, and closes the session.",
      accent: "mint",
      port: helloPort,
      commands: [
        { label: "Connect", value: `ssh ${noneOptions} -p ${helloPort} ${username}@${domain}` },
      ],
    },
    {
      number: "02",
      eyebrow: "Browse safely",
      title: "Read-only SFTP shelf",
      description:
        "Explore a small collection of text, JSON, and image files. Every mutating operation is denied.",
      accent: "amber",
      port: sftpPort,
      commands: [
        { label: "Browse", value: `sftp ${noneOptions} -P ${sftpPort} ${username}@${domain}` },
        {
          label: "Fetch a file",
          value: `sftp ${noneOptions} -P ${sftpPort} ${username}@${domain}:/hello.txt ./hello.txt`,
        },
      ],
    },
    {
      number: "03",
      eyebrow: "Know your keys",
      title: "Public-key mirror",
      description:
        "Records every unsigned public key offer without requesting a signature, then admits the session anonymously.",
      accent: "violet",
      port: keysPort,
      commands: [
        {
          label: "Use your SSH agent",
          value: `ssh -p ${keysPort} ${username}@${domain}`,
        },
        {
          label: "Offer one key",
          value: `ssh -o IdentitiesOnly=yes -i ~/.ssh/id_ed25519 -p ${keysPort} ${username}@${domain}`,
        },
      ],
    },
  ]

  return (
    <main>
      <header className="hero">
        <div className="hero-mark" aria-hidden="true">
          <span>&gt;_</span>
        </div>
        <div>
          <p className="kicker">@bunkerch/modernssh · live examples</p>
          <h1>SSH, in the open.</h1>
          <p className="lede">
            Three tiny TypeScript servers. No accounts to create—just open a terminal and connect.
          </p>
        </div>
        <div className="status"><i /> All examples configured for <strong>{domain}</strong></div>
      </header>

      <section className="examples" aria-label="SSH examples">
        {examples.map((example) => (
          <article className={`card ${example.accent}`} key={example.number}>
            <div className="card-topline">
              <span className="number">{example.number}</span>
              <span className="port">TCP :{example.port}</span>
            </div>
            <p className="eyebrow">{example.eyebrow}</p>
            <h2>{example.title}</h2>
            <p className="description">{example.description}</p>
            <div className="commands">
              {example.commands.map((command) => (
                <div key={command.label}>
                  <p className="command-label">{command.label}</p>
                  <CopyCommand command={command.value} />
                </div>
              ))}
            </div>
          </article>
        ))}
      </section>

      <aside className="protocol-note">
        <span>Protocol note</span>
        <p>
          OpenSSH sends its initial none request before offering keys and does not retry it. The key
          mirror rejects that discovery request, collects every unsigned key offer, and then uses a
          prompt-free keyboard-interactive fallback. Your agent is never asked to sign.
        </p>
      </aside>

      <footer>
        <p>Built with strict TypeScript, modernssh, and Vinext.</p>
        <a href="https://modernssh.bunkerx.dev">Read the modernssh docs <span>↗</span></a>
      </footer>
    </main>
  )
}
