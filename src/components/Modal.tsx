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
        className={`bg-white rounded-lg shadow-xl w-full ${maxWidthClass} max-h-[90vh] flex flex-col`}
      >
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">
            {title ?? ""}
          </h2>
          <button
            className="text-slate-500 hover:text-slate-800 text-xl leading-none"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        <div className="px-6 py-4 overflow-y-auto flex-1">{children}</div>
        {footer && (
          <div className="px-6 py-4 border-t border-slate-200 bg-slate-50">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
