import { CopyCommand } from "./copy-command"
import { getExamples } from "./example-data"

export const dynamic = "force-dynamic"

export default function HomePage() {
  const examples = getExamples()

  return (
    <main className="page-shell">
      <section className="home-hero">
        <div className="hero-copy">
          <div className="eyebrow"><span /> Runnable SSH examples</div>
          <h1>Learn modernssh<br />by running it.</h1>
          <p>
            Small, focused servers built with strict TypeScript. Connect to the live instances,
            inspect the complete minimal code, then use it as a starting point for your own server.
          </p>
          <div className="hero-actions">
            <a className="button primary" href="/hello">Explore the examples</a>
            <a className="button secondary" href="https://modernssh.bunkerx.dev">Read the docs <span>↗</span></a>
          </div>
        </div>
        <div className="hero-terminal" aria-label="Example SSH command">
          <div className="terminal-bar">
            <div className="window-dots" aria-hidden="true"><i /><i /><i /></div>
            <span>terminal</span>
          </div>
          <div className="terminal-body">
            <p><b>$</b> {examples[0]!.commands[0]!.value}</p>
            <p className="terminal-output">Connected with @bunkerch/modernssh</p>
            <p className="terminal-cursor"><b>$</b> <i /></p>
          </div>
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading">
          <div>
            <p className="section-kicker">Examples</p>
            <h2>Three servers. One small idea each.</h2>
          </div>
          <p>Every example has its own source, Dockerfile, port, and live connection command.</p>
        </div>

        <div className="example-grid">
          {examples.map((example) => (
            <article className="example-card" key={example.id}>
              <div className="example-card-top">
                <span className="example-index">{example.index}</span>
                <span className="badge">:{example.port}</span>
              </div>
              <h3>{example.shortTitle}</h3>
              <p>{example.description}</p>
              <div className="mini-command">
                <CopyCommand command={example.commands[0]!.value} />
              </div>
              <a className="card-link" href={`/${example.id}`}>
                View example <span aria-hidden="true">→</span>
              </a>
            </article>
          ))}
        </div>
      </section>

      <section className="principles">
        <div><strong>Strict TypeScript</strong><span>No loose example code or hidden JavaScript.</span></div>
        <div><strong>Container ready</strong><span>Every server ships with its own Dockerfile.</span></div>
        <div><strong>Policy explicit</strong><span>Authentication and channel access are visible in the code.</span></div>
      </section>
    </main>
  )
}
