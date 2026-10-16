import { render, type ComponentChild } from 'preact';
import { ErrorBoundary } from './ErrorBoundary';

export function mount(app: ComponentChild): void {
  const root = document.getElementById('app');
  if (root) render(<ErrorBoundary>{app}</ErrorBoundary>, root);
}
