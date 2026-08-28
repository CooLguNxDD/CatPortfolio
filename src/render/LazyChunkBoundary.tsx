import { Component, Fragment, type ErrorInfo, type ReactNode } from "react";

/**
 * Isolates a failed lazy chunk so a sibling leaf in the same Composite block
 * keeps rendering. Fallback offers Retry, which remounts the Suspense subtree.
 */
export class LazyChunkBoundary extends Component<
  { children: ReactNode; label?: string },
  { hasError: boolean; retry: number }
> {
  state = { hasError: false, retry: 0 };

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.warn(
      `[LazyChunkBoundary] chunk failed${this.props.label ? ` (${this.props.label})` : ""}:`,
      error,
      info.componentStack,
    );
  }

  handleRetry = (): void => {
    this.setState((s) => ({ hasError: false, retry: s.retry + 1 }));
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex h-40 w-full flex-col items-center justify-center gap-2 rounded bg-(--bg-sunken) text-sm text-(--fg-muted)">
          <p>Chart failed to load.</p>
          <button
            type="button"
            className="rounded-lg border border-(--hairline) px-2.5 py-1 text-xs text-(--fg) hover:border-(--amber)/35"
            onClick={this.handleRetry}
          >
            Retry
          </button>
        </div>
      );
    }
    return <Fragment key={this.state.retry}>{this.props.children}</Fragment>;
  }
}
