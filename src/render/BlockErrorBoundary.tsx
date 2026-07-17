import { Component, type ErrorInfo, type ReactNode } from "react";

/**
 * Isolates a single block render failure so one throwing component does not
 * unmount the whole layout tree. Logs and renders null on error.
 */
export class BlockErrorBoundary extends Component<
  { children: ReactNode; blockId?: string },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.warn(
      `[BlockErrorBoundary] block render failed${this.props.blockId ? ` (${this.props.blockId})` : ""}:`,
      error,
      info.componentStack
    );
  }

  render(): ReactNode {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}
