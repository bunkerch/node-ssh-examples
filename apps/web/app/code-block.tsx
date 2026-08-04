import Prism from "prismjs"
import "prismjs/components/prism-typescript.js"
import { CopyButton } from "./copy-button"

export function CodeBlock({ code }: Readonly<{ code: string }>) {
  const grammar = Prism.languages.typescript
  if (!grammar) throw new Error("Prism TypeScript grammar was not loaded")
  const highlighted = Prism.highlight(code.trim(), grammar, "typescript")

  return (
    <div className="code-block">
      <div className="code-toolbar">
        <div className="window-dots" aria-hidden="true"><i /><i /><i /></div>
        <span>server.ts</span>
        <CopyButton value={code.trim()} />
      </div>
      <pre aria-label="TypeScript source code">
        <code className="language-typescript" dangerouslySetInnerHTML={{ __html: highlighted }} />
      </pre>
    </div>
  )
}
