// src/components/ErrorBoundary.tsx
// Top-level React Error Boundary to catch uncaught render errors and present a
// graceful fallback instead of a blank white screen (White Screen of Death).
//
// Usage: Wrap the root component tree in <ErrorBoundary> in App.tsx.

import React, { Component, ReactNode } from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';

interface Props {
    children: ReactNode;
    /** Optional context label shown in logs and fallback UI (e.g. "Launcher", "Overlay"). */
    context?: string;
}

interface State {
    hasError: boolean;
    errorMessage: string;
    componentStack: string;
}

export class ErrorBoundary extends Component<Props, State> {
    state: State = {
        hasError: false,
        errorMessage: '',
        componentStack: ''
    };

    static getDerivedStateFromError(error: Error): Partial<State> {
        return {
            hasError: true,
            errorMessage: error?.message ?? String(error)
        };
    }

    componentDidCatch(error: Error, info: React.ErrorInfo): void {
        const context = this.props.context ?? 'App';
        console.error(`[ErrorBoundary:${context}] Uncaught render error:`, error, info.componentStack);
        this.setState({ componentStack: info.componentStack ?? '' });

        // Report to analytics if IPC is available (non-blocking)
        try {
            // @ts-ignore  
            window.electronAPI?.logErrorToMain?.({
                type: 'uncaught-render-error',
                context,
                message: error?.message,
                stack: error?.stack,
                componentStack: info.componentStack
            });
        } catch { /* analytics must never crash the handler */ }
    }

    private handleReload = (): void => {
        // Attempt soft UI reset first (state reset)
        this.setState({ hasError: false, errorMessage: '', componentStack: '' });
    };

    private handleHardReload = (): void => {
        window.location.reload();
    };

    render(): ReactNode {
        if (!this.state.hasError) {
            return this.props.children;
        }

        const context = this.props.context ?? 'Application';

        return (
            <div className="flex flex-col items-center justify-center h-full min-h-[200px] p-8 bg-[#111111] text-[#E0E0E0] font-[Inter,system-ui,sans-serif] gap-4 text-center">
                <AlertTriangle size={36} color="#ff4444" className="mb-[4px]" />
                <h2 className="m-0 text-[16px] font-semibold text-white">
                    {context} crashed
                </h2>
                <p className="m-0 text-[12px] text-[#888] max-w-[320px] leading-[1.5]">
                    An unexpected error occurred. Your data is safe — click below to recover.
                </p>
                {this.state.errorMessage && (
                    <code className="text-[11px] text-[#ff6666] bg-[rgba(255,68,68,0.08)] px-[10px] py-[6px] rounded-[6px] max-w-[360px] overflow-hidden text-ellipsis whitespace-nowrap block">
                        {this.state.errorMessage}
                    </code>
                )}
                <div className="flex gap-2 mt-2">
                    <button
                        onClick={this.handleReload}
                        className="flex items-center gap-[6px] px-[14px] py-2 rounded-[8px] border-none bg-[#222] text-[#ccc] text-[12px] cursor-default font-medium"
                    >
                        <RefreshCw size={13} />
                        Try to recover
                    </button>
                    <button
                        onClick={this.handleHardReload}
                        className="flex items-center gap-[6px] px-[14px] py-2 rounded-[8px] border-none bg-[#ff4444] text-white text-[12px] cursor-default font-medium"
                    >
                        <RefreshCw size={13} />
                        Reload UI
                    </button>
                </div>
            </div>
        );
    }
}

export default ErrorBoundary;
