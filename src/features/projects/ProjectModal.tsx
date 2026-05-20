import React, { useState, useEffect } from "react";
import { Modal } from "../../components/Modal";
import type { Project, Warehouse } from "../../types";

interface ProjectModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: Omit<Project, "id" | "createdAt" | "createdBy">) => Promise<void>;
  existing?: Project | null;
  warehouses: Warehouse[];
}

export const ProjectModal: React.FC<ProjectModalProps> = ({
  open,
  onClose,
  onSave,
  existing,
  warehouses,
}) => {
  const [ipNumber, setIpNumber] = useState("");
  const [projectNumber, setProjectNumber] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [branchId, setBranchId] = useState("");
  const [status, setStatus] = useState<"active" | "closed">("active");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (existing) {
      setIpNumber(existing.ipNumber ?? "");
      setProjectNumber(existing.projectNumber ?? "");
      setName(existing.name ?? "");
      setDescription(existing.description ?? "");
      setBranchId(existing.branchId ?? "");
      setStatus(existing.status ?? "active");
    } else {
      setIpNumber("");
      setProjectNumber("");
      setName("");
      setDescription("");
      setBranchId("");
      setStatus("active");
    }
    setSaveError(null);
  }, [existing, open]);

  const handleSave = async () => {
    if (!(ipNumber ?? "").trim() || !(name ?? "").trim() || !branchId) return;
    setSaving(true);
    setSaveError(null);
    try {
      await onSave({
        ipNumber: ipNumber.trim(),
        projectNumber: projectNumber.trim() || undefined,
        name: name.trim(),
        description: description.trim() || undefined,
        branchId,
        status,
      });
      onClose();
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : "Failed to save. Try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={existing ? "Edit Project" : "New Project"}
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
            disabled={saving || !(ipNumber ?? "").trim() || !(name ?? "").trim() || !branchId}
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
            IP Number <span className="text-red-500">*</span>
          </label>
          <input
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            value={ipNumber}
            onChange={(e) => setIpNumber(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Project #
            <span className="ml-1 text-slate-400 font-normal">(Optional)</span>
          </label>
          <input
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            placeholder="Optional"
            value={projectNumber}
            onChange={(e) => setProjectNumber(e.target.value)}
          />
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Project Name <span className="text-red-500">*</span>
          </label>
          <input
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Description
          </label>
          <textarea
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] resize-none"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Branch <span className="text-red-500">*</span>
          </label>
          <select
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
          >
            <option value="">Select branch...</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.shortCode || w.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Status
          </label>
          <select
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            value={status}
            onChange={(e) => setStatus(e.target.value as "active" | "closed")}
          >
            <option value="active">Active</option>
            <option value="closed">Closed</option>
          </select>
        </div>
      </div>
    </Modal>
  );
};
