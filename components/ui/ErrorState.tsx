import { AlertTriangle } from "lucide-react";
import { buttonClasses } from "./button";

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center rounded-2xl border border-red-200 bg-red-50 px-6 py-10 text-center">
      <AlertTriangle className="mb-2 size-8 text-red-500" aria-hidden />
      <p className="font-medium text-red-800">Algo deu errado</p>
      <p className="mt-1 max-w-sm text-sm break-words text-red-700">{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className={buttonClasses("secondary", "sm", "mt-4")}>
          Tentar novamente
        </button>
      )}
    </div>
  );
}
