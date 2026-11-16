import { Component } from 'react'
import type { ReactNode } from 'react'

export default class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) return <main className="fatal-error" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}>
      <section style={{ maxWidth: 440 }}>
        <h1>The app could not load</h1>
        <p>Reload the page to try again. Your saved sessions will still be available.</p>
        <button type="button" className="primary-button" onClick={() => window.location.reload()}>Reload</button>
      </section>
    </main>
    return this.props.children
  }
}
