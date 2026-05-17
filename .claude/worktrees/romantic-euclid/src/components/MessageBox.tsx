import { forwardRef, useImperativeHandle, useRef, useState } from "react";

export type MessageBoxType = "alert" | "confirm";

export interface MessageBoxHandle {
  alert: (message: string) => void;
  confirm: (message: string) => Promise<boolean>;
}

interface MessageBoxState {
  open: boolean;
  message: string;
  type: MessageBoxType;
}

export const MessageBox = forwardRef<MessageBoxHandle>((_, ref) => {
  const [state, setState] = useState<MessageBoxState>({
    open: false,
    message: "",
    type: "alert",
  });
  const resolverRef = useRef<(value: boolean) => void>();

  const close = (result: boolean) => {
    setState((prev) => ({ ...prev, open: false }));
    if (resolverRef.current) {
      resolverRef.current(result);
      resolverRef.current = undefined;
    }
  };

  useImperativeHandle(ref, () => ({
    alert(message: string) {
      setState({ open: true, message, type: "alert" });
      resolverRef.current = undefined;
    },
    confirm(message: string) {
      setState({ open: true, message, type: "confirm" });
      return new Promise<boolean>((resolve) => {
        resolverRef.current = resolve;
      });
    },
  }));

  if (!state.open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-[var(--modal-bg)] border border-[var(--modal-border)] rounded-lg shadow-lg max-w-md w-full p-6">
        <h2 className="text-lg font-semibold mb-4 text-[var(--fg)]">
          {state.type === "alert" ? "Message" : "Confirm"}
        </h2>
        <p className="text-[var(--muted)] mb-6 whitespace-pre-line">
          {state.message}
        </p>
        <div className="flex justify-end gap-3">
          {state.type === "confirm" && (
            <button
              className="btn-outline px-4 py-2 rounded-md text-sm"
              onClick={() => close(false)}
            >
              Cancel
            </button>
          )}
          <button
            className="px-4 py-2 rounded-md bg-[#0ea5e9] text-white text-sm hover:bg-[#0284c7]"
            onClick={() => close(true)}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
});

MessageBox.displayName = "MessageBox";
