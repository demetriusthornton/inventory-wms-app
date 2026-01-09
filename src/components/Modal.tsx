import React from "react";
import type { ReactNode } from "react";

export interface ModalProps {
  open: boolean;
  title?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  maxWidthClass?: string;
}

export const Modal: React.FC<ModalProps> = ({
  open,
  title,
  onClose,
  children,
  footer,
  maxWidthClass = "max-w-2xl",
}) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
      <div
        className={`bg-[var(--modal-bg)] rounded-lg shadow-xl w-full ${maxWidthClass} max-h-[90vh] flex flex-col border border-[var(--modal-border)]`}
      >
        <div className="flex justify-between items-center px-6 py-4 border-b border-[var(--modal-border)]">
          <h2 className="text-lg font-semibold text-[var(--fg)]">
            {title ?? ""}
          </h2>
          <button
            className="text-[var(--muted)] hover:text-[var(--fg)] text-xl leading-none"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        <div className="px-6 py-4 overflow-y-auto flex-1">{children}</div>
        {footer && (
          <div className="px-6 py-4 border-t border-[var(--modal-border)] bg-[var(--modal-footer)]">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
