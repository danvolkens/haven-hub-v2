'use client';

import { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button, Card } from '@/components/ui';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error boundary caught an error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Card className="p-6">
          <div className="flex flex-col items-center text-center">
            <div className="h-12 w-12 rounded-full bg-error/10 flex items-center justify-center mb-4">
              <AlertTriangle className="h-6 w-6 text-error" />
            </div>
            <h3 className="text-h3 mb-2">Something went wrong</h3>
            <p className="text-body text-[var(--color-text-secondary)] mb-4 max-w-md">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <Button onClick={this.handleRetry} leftIcon={<RefreshCw className="h-4 w-4" />}>
              Try again
            </Button>
          </div>
        </Card>
      );
    }

    return this.props.children;
  }
}
