import { Component, Fragment, type ErrorInfo, type ReactNode } from "react";

/**
 * Isolates a single block render failure so one throwing component does not
 * unmount the whole layout tree. Renders a small retry affordance on error
 * (same pattern as LazyChunkBoundary) instead of silently vanishing — a
 * failed lazy chunk (deploy race, flaky network) is otherwise indistinguishable
 * from a block that was never in the layout.
 */
export class BlockErrorBoundary extends Component<
  { children: ReactNode; blockId?: string },
  { hasError: boolean; retry: number }
> {
  state = { hasError: false, retry: 0 };

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

  handleRetry = (): void => {
    this.setState((s) => ({ hasError: false, retry: s.retry + 1 }));
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex h-24 w-full flex-col items-center justify-center gap-2 rounded bg-(--bg-sunken) text-sm text-(--fg-muted)">
          <p>Block failed to load.</p>
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
