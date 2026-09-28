import React, { useState, useEffect, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

export const ErrorBoundary: React.FC<ErrorBoundaryProps> = ({ children }) => {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleGlobalError = (event: ErrorEvent) => {
      const msg = (event.message || '') + '';
      // Suppress external browser wallet extension failures (MetaMask, Phantom, etc.)
      if (
        msg.includes('MetaMask') ||
        msg.includes('metamask') ||
        msg.includes('ethereum') ||
        msg.includes('Failed to connect to MetaMask')
      ) {
        event.preventDefault();
        if (event.stopImmediatePropagation) event.stopImmediatePropagation();
        console.warn('[Extension Notice] Suppressed external browser extension error:', msg);
        return;
      }
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const msg = (typeof reason === 'string' ? reason : reason?.message || '') + '';
      if (
        msg.includes('MetaMask') ||
        msg.includes('metamask') ||
        msg.includes('ethereum') ||
        msg.includes('Failed to connect to MetaMask')
      ) {
        event.preventDefault();
        if (event.stopImmediatePropagation) event.stopImmediatePropagation();
        console.warn('[Extension Notice] Suppressed external browser extension rejection:', msg);
        return;
      }
    };

    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handleRejection);

    return () => {
      window.removeEventListener('error', handleGlobalError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  if (error) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4 font-sans text-stone-800">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-stone-200 p-6 text-center">
          <div className="w-12 h-12 bg-rose-50 border border-rose-200 text-rose-600 rounded-xl flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-stone-900 mb-2">Something went wrong</h2>
          <p className="text-xs text-stone-600 mb-6 leading-relaxed">
            An unexpected error occurred while rendering the application. You can safely reload the dashboard.
          </p>
          <div className="p-3 bg-stone-100 rounded-lg text-left text-[11px] font-mono text-stone-700 mb-6 overflow-x-auto max-h-32">
            {error}
          </div>
          <button
            onClick={() => {
              setError(null);
              window.location.reload();
            }}
            className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors shadow-xs"
          >
            <RefreshCw className="w-4 h-4" />
            Reload Application
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
