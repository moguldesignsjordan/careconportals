
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8 text-center">
          <div className="w-24 h-24 bg-red-50 rounded-[2.5rem] flex items-center justify-center text-red-500 mb-8 animate-pulse">
            <AlertTriangle size={48} />
          </div>
          <h1 className="text-4xl font-black text-gray-900 uppercase tracking-tighter mb-4">Site Under Inspection</h1>
          <p className="text-gray-500 max-w-md mx-auto mb-8 font-medium">
            Something went wrong during the build process. We've logged the issue and are looking into the foundations.
          </p>
          <div className="bg-gray-50 p-4 rounded-xl mb-8 max-w-lg overflow-auto">
            <code className="text-xs text-red-400 font-mono break-all">
              {this.state.error?.toString()}
            </code>
          </div>
          <button
            onClick={this.handleReset}
            className="flex items-center gap-2 bg-[#1A1A1A] text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-care-orange transition-all"
          >
            <RotateCcw size={18} />
            Rebuild Workspace
          </button>
        </div>
      );
    }

    // Fix: Accessing children from props in a React Class Component
    return this.props.children;
  }
}
