import type { ReactNode } from "react"
import "./styles.css"

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <div className="site-header-inner">
            <a className="brand" href="/" aria-label="modernssh examples home">
              <span className="brand-icon" aria-hidden="true">$</span>
              <span>modernssh examples</span>
            </a>
            <nav aria-label="Main navigation">
              <a href="/hello">Hello</a>
              <a href="/sftp">SFTP</a>
              <a href="/keys">Public keys</a>
              <a href="/tty">TTY</a>
              <a className="nav-github" href="https://github.com/bunkerch/node-ssh-examples">
                GitHub <span aria-hidden="true">↗</span>
              </a>
            </nav>
          </div>
        </header>
        {children}
        <footer className="site-footer">
          <div>
            <span>Built with @bunkerch/modernssh and Vinext.</span>
            <a href="https://modernssh.bunkerx.dev">Documentation</a>
            <a href="https://www.npmjs.com/package/@bunkerch/modernssh">npm</a>
          </div>
        </footer>
      </body>
    </html>
  )
}
