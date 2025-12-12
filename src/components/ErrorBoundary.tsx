import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    private handleRefresh = () => {
        window.location.reload();
    };

    private handleGoHome = () => {
        window.location.href = '/';
    };

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-dark-900 flex items-center justify-center p-4">
                    <div className="max-w-md w-full text-center">
                        {/* Error Icon */}
                        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-500/10 flex items-center justify-center">
                            <AlertTriangle className="w-10 h-10 text-red-500" />
                        </div>

                        {/* Error Message */}
                        <h1 className="text-3xl font-bold text-white mb-2">Something Went Wrong</h1>
                        <p className="text-gray-400 mb-8">
                            We encountered an unexpected error. This might be a temporary issue with our servers.
                        </p>

                        {/* Error Details (collapsed) */}
                        {this.state.error && (
                            <details className="mb-8 text-left bg-dark-800/50 rounded-lg p-4 border border-white/10">
                                <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-400">
                                    Technical Details
                                </summary>
                                <pre className="mt-3 text-xs text-red-400 overflow-auto max-h-32">
                                    {this.state.error.message}
                                </pre>
                            </details>
                        )}

                        {/* Action Buttons */}
                        <div className="flex gap-4 justify-center">
                            <button
                                onClick={this.handleRefresh}
                                className="flex items-center gap-2 px-6 py-3 bg-gold-500 text-dark-900 font-semibold rounded-lg hover:bg-gold-400 transition-colors"
                            >
                                <RefreshCw className="w-4 h-4" />
                                Try Again
                            </button>
                            <button
                                onClick={this.handleGoHome}
                                className="flex items-center gap-2 px-6 py-3 bg-dark-800 text-white font-semibold rounded-lg border border-white/10 hover:bg-dark-700 transition-colors"
                            >
                                <Home className="w-4 h-4" />
                                Go Home
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
