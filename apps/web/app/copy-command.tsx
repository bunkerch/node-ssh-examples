"use client"

import { useState } from "react"

export function CopyCommand({ command }: Readonly<{ command: string }>) {
  const [copied, setCopied] = useState(false)

  async function copy(): Promise<void> {
    await navigator.clipboard.writeText(command)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1_500)
  }

  return (
    <div className="command-row">
      <span className="prompt" aria-hidden="true">$</span>
      <code>{command}</code>
      <button type="button" onClick={() => void copy()} aria-label={`Copy command: ${command}`}>
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  )
}
