'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center">
      <div className="max-w-md w-full mx-4">
        <div className="text-center">
          <div className="mx-auto mb-6 w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
            <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>

          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Something went wrong!
          </h1>

          <p className="text-gray-600 dark:text-gray-400 mb-6">
            We encountered an unexpected error. This has been logged and our team will look into it.
          </p>

          <div className="space-y-3">
            <Button
              onClick={reset}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              Try Again
            </Button>

            <Button
              variant="outline"
              onClick={() => window.location.href = '/'}
              className="w-full"
            >
              Go Home
            </Button>
          </div>

          {process.env.NODE_ENV === 'development' && (
            <details className="mt-6 text-left">
              <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                Error Details (Development Only)
              </summary>
              <pre className="mt-2 text-xs bg-gray-100 dark:bg-gray-800 p-3 rounded overflow-auto">
                {error.message}
                {error.stack && `\n\n${error.stack}`}
              </pre>
            </details>
          )}
        </div>
      </div>
    </div>
  );
}
