import { AlertCircle } from 'lucide-react';

interface DataLoadErrorProps {
  message: string;
  onRetry?: () => void;
}

export function DataLoadError({ message, onRetry }: DataLoadErrorProps) {
  return (
    <div
      className="mb-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
      role="alert"
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1">
        <p>{message}</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-2 font-semibold underline underline-offset-2 hover:text-red-950"
          >
            Try again
          </button>
        )}
      </div>
    </div>
  );
}
