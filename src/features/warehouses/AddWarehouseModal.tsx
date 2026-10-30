import React, { useState, useEffect } from "react";
import { collection, doc, setDoc } from "firebase/firestore";
import type { Firestore } from "firebase/firestore";
import { Modal } from "../../components/Modal";
import type { Warehouse, ActivityLog } from "../../types";

interface AddWarehouseModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: (warehouse: Warehouse) => void;
  db: Firestore;
  basePath: string;
  existing?: Warehouse | null;
  onLogActivity: (
    entry: Omit<ActivityLog, "id" | "timestamp" | "userName">,
  ) => Promise<void>;
}

export const AddWarehouseModal: React.FC<AddWarehouseModalProps> = ({
  open,
  onClose,
  onSaved,
  db,
  basePath,
  existing,
  onLogActivity,
}) => {
  const [shortCode, setShortCode] = useState("");
  const [name, setName] = useState("");
  const [streetAddress, setStreetAddress] = useState("");
  const [city, setCity] = useState("");
  const [stateVal, setStateVal] = useState("");
  const [zip, setZip] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (existing) {
      setShortCode(existing.shortCode);
      setName(existing.name);
      setStreetAddress(existing.streetAddress);
      setCity(existing.city);
      setStateVal(existing.state);
      setZip(existing.zip ?? "");
    } else {
      setShortCode("");
      setName("");
      setStreetAddress("");
      setCity("");
      setStateVal("");
      setZip("");
    }
    setSaveError(null);
  }, [existing, open]);

  const handleSave = async () => {
    if (!name.trim() || !shortCode.trim()) return;
    setSaving(true);
    setSaveError(null);
    try {
      const id = existing?.id ?? crypto.randomUUID();
      const ref = doc(collection(db, `${basePath}/warehouses`), id);
      const warehouse: Warehouse = {
        id,
        shortCode: shortCode.trim(),
        name: name.trim(),
        streetAddress: streetAddress.trim(),
        city: city.trim(),
        state: stateVal.trim(),
        zip: zip.trim(),
      };
      await setDoc(ref, warehouse);
      await onLogActivity({
        action: existing ? "warehouse_update" : "warehouse_create",
        collection: "warehouses",
        docId: id,
        summary: `${existing ? "Updated" : "Created"} warehouse ${warehouse.name}`,
      });
      onSaved(warehouse);
      onClose();
    } catch (err: unknown) {
      setSaveError(
        err instanceof Error ? err.message : "Failed to save. Try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={existing ? "Edit Branch" : "Add Branch"}
      footer={
        <div className="flex justify-end gap-3">
          <button
            className="px-4 py-2 rounded-md bg-[#dc2626] text-sm text-white hover:bg-[#b91c1c]"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            className="px-4 py-2 rounded-md bg-[var(--accent)] text-sm text-white hover:bg-[var(--accent-hover)]"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {saveError && (
          <div className="col-span-2 p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm">
            {saveError}
          </div>
        )}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Short Code <span className="text-red-500">*</span>
          </label>
          <input
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            value={shortCode}
            onChange={(e) => setShortCode(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Name <span className="text-red-500">*</span>
          </label>
          <input
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Street Address
          </label>
          <input
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            value={streetAddress}
            onChange={(e) => setStreetAddress(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            City
          </label>
          <input
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            value={city}
            onChange={(e) => setCity(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            State
          </label>
          <input
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            value={stateVal}
            onChange={(e) => setStateVal(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Zip
          </label>
          <input
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            value={zip}
            onChange={(e) => setZip(e.target.value)}
          />
        </div>
      </div>
    </Modal>
  );
};
