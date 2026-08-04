import { CodeBlock } from "./code-block"
import { CopyCommand } from "./copy-command"
import type { ExampleData } from "./example-data"

export function ExamplePage({ example }: Readonly<{ example: ExampleData }>) {
  return (
    <main className="page-shell example-page">
      <div className="breadcrumbs"><a href="/">Examples</a><span>/</span><span>{example.shortTitle}</span></div>

      <section className="example-hero">
        <div>
          <div className="eyebrow"><span /> Example {example.index}</div>
          <h1>{example.title}</h1>
          <p>{example.description}</p>
        </div>
        <dl className="example-meta">
          <div><dt>Port</dt><dd>{example.port}</dd></div>
          <div><dt>Authentication</dt><dd>{example.auth}</dd></div>
          <div><dt>Runtime</dt><dd>Node.js 20.19+</dd></div>
        </dl>
      </section>

      <div className="detail-grid">
        <article className="content-card connect-card">
          <div className="content-heading">
            <span className="step-number">1</span>
            <div><h2>Try the live server</h2><p>Paste a command into your terminal.</p></div>
          </div>
          <div className="commands">
            {example.commands.map((command) => (
              <div key={command.label}>
                <p className="command-label">{command.label}</p>
                <CopyCommand command={command.value} />
              </div>
            ))}
          </div>
          {example.note ? <aside className="note"><strong>Why the fallback?</strong><p>{example.note}</p></aside> : null}
        </article>

        <aside className="content-card behavior-card">
          <p className="section-kicker">Behavior</p>
          <h2>What it demonstrates</h2>
          <ul>{example.features.map((feature) => <li key={feature}>{feature}</li>)}</ul>
        </aside>
      </div>

      <section className="source-section">
        <div className="source-heading">
          <div>
            <div className="content-heading">
              <span className="step-number">2</span>
              <div><h2>The smallest useful version</h2><p>One file, explicit policy, no framework glue.</p></div>
            </div>
          </div>
          <a href={`https://github.com/bunkerch/node-ssh-examples/tree/master/apps/${example.id === "hello" ? "hello-server" : example.id === "sftp" ? "readonly-sftp" : "key-list-server"}`}>
            View complete container <span aria-hidden="true">↗</span>
          </a>
        </div>
        <CodeBlock code={example.code} />
      </section>

      <nav className="example-pagination" aria-label="Example navigation">
        <a href="/">← All examples</a>
        {example.id === "hello" ? <a href="/sftp">Next: Read-only SFTP →</a> : null}
        {example.id === "sftp" ? <a href="/keys">Next: Public-key mirror →</a> : null}
      </nav>
    </main>
  )
}
