import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // You could log to an external service here
    console.error('Uncaught error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-red-50 text-red-900">
          <div className="max-w-xl text-center">
            <h2 className="text-2xl font-bold mb-4">Something went wrong</h2>
            <pre className="text-left whitespace-pre-wrap bg-white p-4 rounded shadow text-sm">
              {String(this.state.error && this.state.error.stack ? this.state.error.stack : this.state.error)}
            </pre>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
