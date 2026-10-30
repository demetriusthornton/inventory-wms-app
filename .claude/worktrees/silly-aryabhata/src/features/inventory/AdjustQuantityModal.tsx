import React, { useState, useEffect } from "react";
import { doc, updateDoc } from "firebase/firestore";
import type { Firestore } from "firebase/firestore";
import { Modal } from "../../components/Modal";
import type { InventoryItem, Warehouse, ActivityLog } from "../../types";

interface AdjustQuantityModalProps {
  open: boolean;
  item: InventoryItem | null;
  warehouse: Warehouse | undefined;
  onClose: () => void;
  onSaved: (delta: number, resultingQty: number, reason: string) => void;
  db: Firestore;
  basePath: string;
  onLogActivity: (
    entry: Omit<ActivityLog, "id" | "timestamp" | "userName">,
  ) => Promise<void>;
  onConfirm: (message: string) => Promise<boolean>;
}

const LARGE_DELTA_THRESHOLD = 10;

export const AdjustQuantityModal: React.FC<AdjustQuantityModalProps> = ({
  open,
  item,
  warehouse,
  onClose,
  onSaved,
  db,
  basePath,
  onLogActivity,
  onConfirm,
}) => {
  const [deltaStr, setDeltaStr] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setDeltaStr("");
      setReason("");
      setSaving(false);
      setValidationError(null);
    }
  }, [open, item?.id]);

  if (!item) return null;

  const delta = parseInt(deltaStr, 10);
  const deltaValid = !isNaN(delta) && deltaStr.trim() !== "";
  const result = deltaValid ? item.amountInInventory + delta : null;
  const deltaPercent =
    item.amountInInventory !== 0
      ? Math.abs(delta) / Math.abs(item.amountInInventory)
      : Infinity;
  const isLargeAdjust = deltaValid && Math.abs(delta) > LARGE_DELTA_THRESHOLD;
  const reasonRequired = isLargeAdjust;

  const handleSave = async () => {
    if (!deltaValid || delta === 0) {
      setValidationError("Delta cannot be zero.");
      return;
    }
    if (reasonRequired && !reason.trim()) {
      setValidationError("Reason is required for large adjustments.");
      return;
    }

    const finalResult = item.amountInInventory + delta;

    if (finalResult < 0) {
      const ok = await onConfirm(
        `This adjustment will result in negative stock (${finalResult}). Proceed?`,
      );
      if (!ok) return;
    }

    if (deltaPercent > 0.5) {
      const ok = await onConfirm(
        `This is a large adjustment (${delta > 0 ? "+" : ""}${delta}, ${Math.round(deltaPercent * 100)}% of current). Proceed?`,
      );
      if (!ok) return;
    }

    setSaving(true);
    setValidationError(null);

    try {
      const itemRef = doc(db, `${basePath}/inventory/${item.id}`);
      await updateDoc(itemRef, { amountInInventory: finalResult });

      await onLogActivity({
        action: "inventory_adjust",
        collection: "inventory",
        docId: item.id,
        summary: `Adjusted ${item.name || item.modelNumber}: ${delta > 0 ? "+" : ""}${delta} → ${finalResult}`,
        itemId: item.id,
        delta,
        resultingQuantity: finalResult,
        reason: reason.trim() || undefined,
        locationId: item.assignedBranchId,
      });

      onSaved(delta, finalResult, reason.trim());
    } catch (err) {
      setValidationError("Failed to save. Please try again.");
      console.error("Adjust save error:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      title="Adjust Quantity"
      onClose={onClose}
      maxWidthClass="max-w-md"
      footer={
        <div className="flex justify-end gap-3">
          <button
            className="btn-outline px-4 py-2 rounded-md text-sm"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            className="px-4 py-2 rounded-md bg-[var(--accent)] text-white text-sm hover:opacity-90 disabled:opacity-50"
            onClick={handleSave}
            disabled={saving || !deltaValid || delta === 0}
          >
            {saving ? "Saving..." : "Save Adjustment"}
          </button>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Item header */}
        <div className="flex items-center gap-3">
          {item.imageUrl ? (
            <img
              src={item.imageUrl}
              alt=""
              className="w-12 h-12 rounded-md object-cover border border-[var(--border)]"
            />
          ) : (
            <div className="w-12 h-12 rounded-md bg-[var(--surface-1)] flex items-center justify-center text-lg text-[var(--muted)]">
              ?
            </div>
          )}
          <div>
            <p className="text-sm font-semibold text-[var(--fg)]">
              {item.name || item.modelNumber}
            </p>
            <p className="text-xs text-[var(--muted)]">
              SKU: {item.modelNumber}
            </p>
          </div>
        </div>

        {/* Location */}
        {warehouse && (
          <div className="text-xs text-[var(--muted)]">
            Location:{" "}
            <span className="inline-flex items-center px-2 py-0.5 rounded bg-[var(--surface-1)] text-[var(--fg)] font-medium">
              {warehouse.shortCode} — {warehouse.name}
            </span>
          </div>
        )}

        {/* Current Quantity */}
        <div className="bg-[var(--surface-1)] rounded-lg p-4 text-center">
          <p className="text-xs uppercase tracking-wider text-[var(--muted)] mb-1">
            Current Quantity
          </p>
          <p className="font-mono text-4xl font-bold text-[var(--fg)]">
            {item.amountInInventory}
          </p>
        </div>

        {/* Delta input */}
        <div>
          <label className="block text-xs font-medium text-[var(--muted)] mb-1">
            Adjustment Delta (+/-)
          </label>
          <input
            type="number"
            className="w-full rounded-md border border-[var(--border)] bg-[var(--input-bg)] text-[var(--input-fg)] px-3 py-2 text-lg font-mono text-center focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            placeholder="e.g. -5 or +10"
            value={deltaStr}
            onChange={(e) => {
              setDeltaStr(e.target.value);
              setValidationError(null);
            }}
            autoFocus
          />
        </div>

        {/* Result preview */}
        {deltaValid && delta !== 0 && (
          <div
            className={`rounded-lg p-3 text-center border ${
              result! < 0
                ? "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800"
                : "bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800"
            }`}
          >
            <p className="text-xs text-[var(--muted)] mb-1">Result Preview</p>
            <p className="font-mono text-lg">
              <span className="text-[var(--muted)]">
                {item.amountInInventory}
              </span>
              <span className={delta > 0 ? "text-emerald-600" : "text-red-600"}>
                {" "}
                {delta > 0 ? "+" : ""}
                {delta}
              </span>
              <span className="text-[var(--muted)]"> = </span>
              <span
                className={`font-bold ${result! < 0 ? "text-red-600" : "text-[var(--fg)]"}`}
              >
                {result}
              </span>
            </p>
          </div>
        )}

        {/* Reason */}
        <div>
          <label className="block text-xs font-medium text-[var(--muted)] mb-1">
            Reason{reasonRequired && <span className="text-red-500"> *</span>}
          </label>
          <input
            type="text"
            className="w-full rounded-md border border-[var(--border)] bg-[var(--input-bg)] text-[var(--input-fg)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            placeholder={
              reasonRequired
                ? "Required for large adjustments"
                : "Optional note"
            }
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              setValidationError(null);
            }}
          />
        </div>

        {/* Validation error */}
        {validationError && (
          <div className="text-sm text-red-600 bg-[var(--error-bg)] border border-[var(--error-border)] rounded-md px-3 py-2">
            {validationError}
          </div>
        )}
      </div>
    </Modal>
  );
};
