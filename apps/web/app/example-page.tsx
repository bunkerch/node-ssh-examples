import { CodeBlock } from "./code-block"
import { CopyCommand } from "./copy-command"
import type { ExampleData } from "./example-data"

export function ExamplePage({ example }: Readonly<{ example: ExampleData }>) {
  const folders = {
    hello: "hello-server",
    sftp: "readonly-sftp",
    keys: "key-list-server",
    tty: "tty-server",
  } as const

  return (
    <main className="page-shell example-page">
      <div className="breadcrumbs"><a href="/">Examples</a><span>/</span><span>{example.shortTitle}</span></div>

      <section className="example-hero">
        <div>
          <h1>{example.title}</h1>
          <p>{example.description}</p>
          <div className="example-badges">
            <span>Port {example.port}</span>
            <span>Auth: {example.auth}</span>
          </div>
        </div>
      </section>

      <div className="detail-content">
        <section className="connect-section">
          <h2>Connect</h2>
          <div className="commands">
            {example.commands.map((command) => (
              <div key={command.label}>
                <p className="command-label">{command.label}</p>
                <CopyCommand command={command.value} />
              </div>
            ))}
          </div>
          {example.note ? <aside className="note"><strong>Why the fallback?</strong><p>{example.note}</p></aside> : null}
        </section>
      </div>

      <section className="source-section">
        <div className="source-heading">
          <h2>Minimal server</h2>
          <a href={`https://github.com/bunkerch/node-ssh-examples/tree/master/apps/${folders[example.id]}`}>
            View complete container <span aria-hidden="true">↗</span>
          </a>
        </div>
        <CodeBlock code={example.code} />
      </section>

      <nav className="example-pagination" aria-label="Example navigation">
        <a href="/">← All examples</a>
        {example.id === "hello" ? <a href="/sftp">Next: Read-only SFTP →</a> : null}
        {example.id === "sftp" ? <a href="/keys">Next: Public-key mirror →</a> : null}
        {example.id === "keys" ? <a href="/tty">Next: TTY interface →</a> : null}
      </nav>
    </main>
  )
}
