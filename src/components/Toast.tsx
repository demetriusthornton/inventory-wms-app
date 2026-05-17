import React, { useEffect, useState } from "react";
import type { ToastMessage, AdjustUndoPayload } from "../types";

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
  onUndo: (payload: AdjustUndoPayload) => void;
}

const typeStyles: Record<ToastMessage["type"], string> = {
  success: "border-l-4 border-l-emerald-500",
  error: "border-l-4 border-l-red-500",
  info: "border-l-4 border-l-[var(--accent)]",
};

export const Toast: React.FC<ToastProps> = ({ toasts, onDismiss, onUndo }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 z-[60] flex flex-col gap-2 sm:max-w-sm">
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onDismiss={onDismiss}
          onUndo={onUndo}
        />
      ))}
    </div>
  );
};

interface ToastItemProps {
  toast: ToastMessage;
  onDismiss: (id: string) => void;
  onUndo: (payload: AdjustUndoPayload) => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onDismiss, onUndo }) => {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setExiting(true), 3600);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className={`${typeStyles[toast.type]} bg-[var(--card)] shadow-lg rounded-md px-4 py-3 flex items-start gap-3 transition-opacity duration-300 ${exiting ? "opacity-0" : "opacity-100"}`}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm text-[var(--fg)]">{toast.message}</p>
        {toast.undoPayload && (
          <button
            className="mt-1 text-xs font-medium text-[var(--accent)] hover:underline"
            onClick={() => onUndo(toast.undoPayload!)}
          >
            Undo
          </button>
        )}
      </div>
      <button
        className="text-[var(--muted)] hover:text-[var(--fg)] text-sm leading-none"
        onClick={() => onDismiss(toast.id)}
      >
        ×
      </button>
    </div>
  );
};
