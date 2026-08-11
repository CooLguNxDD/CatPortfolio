/**
 * Error boundary so a Three.js chunk failure falls back to the text layout
 * in place (no full-page crash).
 */

import { Component, type ErrorInfo, type ReactNode } from "react"

interface Props {
  fallback: ReactNode
  children: ReactNode
}

interface State {
  error: Error | null
}

/** Catches FishTankStage / canvas failures and shows text layout. */
export class FishTankErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn("FishTankErrorBoundary:", error, info.componentStack)
  }

  render() {
    if (this.state.error) return this.props.fallback
    return this.props.children
  }
}
