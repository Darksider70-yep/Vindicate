/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useMemo, useState } from "react";

const ToastContext = createContext(null);

const TOAST_TIMEOUT_MS = 4000;

function statusClasses(status) {
  if (status === "success") {
    return "border-success/40 bg-success/15 text-success";
  }

  if (status === "error") {
    return "border-danger/40 bg-danger/15 text-danger";
  }

  if (status === "warning") {
    return "border-warning/40 bg-warning/15 text-warning";
  }

  return "border-primary/35 bg-primary/15 text-primary";
}

function ToastViewport({ toasts, onDismiss }) {
  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex justify-center px-3"
    >
      <div className="flex w-full max-w-xl flex-col gap-2">
        {toasts.map((toast) => (
          <article
            key={toast.id}
            className={`pointer-events-auto animate-fade-in rounded-xl border px-4 py-3 shadow-soft ${statusClasses(toast.status)}`}
            role="status"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-semibold leading-6">{toast.message}</p>
              <button
                type="button"
                aria-label="Dismiss notification"
                onClick={() => onDismiss(toast.id)}
                className="rounded-md border border-current/35 px-2 py-1 text-xs font-semibold transition hover:bg-current/10"
              >
                Close
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismissToast = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const pushToast = useCallback((message, status = "info", timeout = TOAST_TIMEOUT_MS) => {
    const id = crypto.randomUUID();
    setToasts((current) => [...current, { id, message, status }]);

    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, timeout);
  }, []);

  const value = useMemo(
    () => ({
      pushToast,
      dismissToast
    }),
    [dismissToast, pushToast]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }

  return context;
}