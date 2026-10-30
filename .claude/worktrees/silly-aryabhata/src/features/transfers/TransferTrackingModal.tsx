import React from "react";
import { Modal } from "../../components/Modal";
import type { Transfer } from "../../types";

interface TransferTrackingModalProps {
  open: boolean;
  transfer: Transfer | null;
  trackingValue: string;
  onChange: (value: string) => void;
  onCancel: () => void;
  onSave: () => void;
}

export const TransferTrackingModal: React.FC<TransferTrackingModalProps> = ({
  open,
  transfer,
  trackingValue,
  onChange,
  onCancel,
  onSave,
}) => {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={
        transfer ? `Edit Tracking - ${transfer.transferId}` : "Edit Tracking"
      }
      maxWidthClass="max-w-lg"
      footer={
        <div className="flex justify-end gap-3">
          <button
            className="px-4 py-2 rounded-md bg-[#FF6347] text-sm text-white hover:bg-[#e4573d]"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            className="px-4 py-2 rounded-md bg-[#005691] text-sm text-white hover:bg-[#00426e]"
            onClick={onSave}
          >
            Save
          </button>
        </div>
      }
    >
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">
          Tracking Number
        </label>
        <input
          className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005691]"
          value={trackingValue}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Optional shipment tracking number"
        />
      </div>
    </Modal>
  );
};
