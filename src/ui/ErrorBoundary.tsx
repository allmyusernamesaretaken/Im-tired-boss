// Shows render errors on the page instead of leaving it half empty, so users
// can report them. Only the error name and message are shown.

import { Component, type ComponentChildren } from 'preact';

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<{ children: ComponentChildren }, State> {
  override state: State = { error: null };

  override componentDidCatch(error: unknown): void {
    this.setState({ error: error instanceof Error ? error : new Error(String(error)) });
  }

  override render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <div class="error-box" role="alert">
        <strong>Something went wrong.</strong>
        <pre>{`${error.name}: ${error.message}`}</pre>
      </div>
    );
  }
}
