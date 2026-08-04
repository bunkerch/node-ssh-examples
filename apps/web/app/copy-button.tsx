"use client"

import { useState } from "react"

export function CopyButton({ value }: Readonly<{ value: string }>) {
  const [copied, setCopied] = useState(false)

  async function copy(): Promise<void> {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1_500)
  }

  return (
    <button className="code-copy" type="button" onClick={() => void copy()}>
      {copied ? "Copied" : "Copy code"}
    </button>
  )
}
