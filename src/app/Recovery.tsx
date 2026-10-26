import { Component, type ReactNode } from "react";
import { isChunkFailure, reloadSafely } from "./update-safety";
export class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (!this.state.error) return this.props.children;
    const stale = isChunkFailure(this.state.error);
    return (
      <section className="startup recovery" role="alert">
        <p className="eyebrow">YOUR SAVED WORKSPACE IS STILL ON THIS DEVICE</p>
        <h1>{stale ? "A newer PULSE is ready." : "Let’s find our footing."}</h1>
        <p>
          {stale
            ? "This screen could not load its application file. An update or lost connection may be the cause. Reconnect, finish any open edits, then reload when ready."
            : "PULSE could not open this screen. Your saved records have not been reset. Reload when you are ready, or use navigation to return to another screen."}
        </p>
        <button
          className="button primary"
          onClick={() => {
            if (!reloadSafely() && !navigator.onLine)
              window.alert(
                "Reconnect before loading a new application version. Your saved CRM remains on this device.",
              );
          }}
        >
          Reload current version
        </button>
        <p className="muted">
          No automatic reloads. Unsaved edits require your approval before
          discarding.
        </p>
      </section>
    );
  }
}
