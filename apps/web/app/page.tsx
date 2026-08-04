import { getExamples } from "./example-data"

export const dynamic = "force-dynamic"

export default function HomePage() {
  const examples = getExamples()

  return (
    <main className="page-shell">
      <section className="home-intro">
        <h1>modernssh examples</h1>
        <p>Three small SSH servers with live commands and minimal TypeScript source.</p>
      </section>

      <section className="example-list" aria-label="Examples">
        <div className="example-grid">
          {examples.map((example) => (
            <article className="example-card" key={example.id}>
              <div className="example-card-top">
                <span className="example-index">{example.index}</span>
                <span className="badge">:{example.port}</span>
              </div>
              <h3>{example.shortTitle}</h3>
              <p>{example.description}</p>
              <a className="card-link" href={`/${example.id}`}>
                Open <span aria-hidden="true">→</span>
              </a>
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}
