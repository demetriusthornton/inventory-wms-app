import React, { useEffect, useState } from "react";
import { collection, doc, writeBatch, updateDoc } from "firebase/firestore";
import type { Firestore } from "firebase/firestore";
import { Modal } from "../../components/Modal";
import type {
  ActivityLog,
  PocDocument,
  PocEquipmentItem,
  PocProject,
} from "../../types";
import { addDays } from "../../utils/pocDates";
import { isValidLink, makeLinkDocument } from "./pocStorage";

export const pocInputCls =
  "w-full border border-[var(--input-border)] rounded-md px-3 py-2 text-sm bg-[var(--input-bg)] text-[var(--input-fg)] focus:outline-none focus:ring-2 focus:ring-[#0ea5e9]";
export const pocLabelCls = "block text-xs font-medium text-[var(--fg)] mb-1";
const smInputCls =
  "w-full border border-[var(--input-border)] rounded px-2 py-1 text-xs bg-[var(--input-bg)] text-[var(--input-fg)] focus:outline-none focus:ring-1 focus:ring-[#0ea5e9]";

const Req = () => <span className="text-red-500">*</span>;

interface EquipmentRow {
  key: string;
  name: string;
  modelNumber: string;
  manufactureName: string;
  serialNumber: string;
  quantity: string;
}

interface LinkRow {
  key: string;
  name: string;
  url: string;
}

const emptyEquipmentRow = (): EquipmentRow => ({
  key: crypto.randomUUID(),
  name: "",
  modelNumber: "",
  manufactureName: "",
  serialNumber: "",
  quantity: "1",
});

export const isEquipmentRowValid = (r: {
  name: string;
  modelNumber: string;
  manufactureName: string;
  quantity: string;
}) => {
  const qty = Number(r.quantity);
  return (
    !!r.name.trim() &&
    !!r.modelNumber.trim() &&
    !!r.manufactureName.trim() &&
    Number.isInteger(qty) &&
    qty >= 1
  );
};

interface PocFormModalProps {
  open: boolean;
  onClose: () => void;
  db: Firestore;
  basePath: string;
  /** null = create a new POC; otherwise edit header fields of this POC. */
  editing: PocProject | null;
  getUserName: () => string;
  onLogActivity: (
    entry: Omit<ActivityLog, "id" | "timestamp" | "userName">,
  ) => Promise<void>;
  onAlert: (msg: string) => void;
}

export const PocFormModal: React.FC<PocFormModalProps> = ({
  open,
  onClose,
  db,
  basePath,
  editing,
  getUserName,
  onLogActivity,
  onAlert,
}) => {
  const [pocName, setPocName] = useState("");
  const [summary, setSummary] = useState("");
  const [vendorName, setVendorName] = useState("");
  const [receivedDate, setReceivedDate] = useState("");
  const [durationDays, setDurationDays] = useState("");
  const [equipment, setEquipment] = useState<EquipmentRow[]>([]);
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setPocName(editing?.pocName ?? "");
    setSummary(editing?.summary ?? "");
    setVendorName(editing?.vendorName ?? "");
    setReceivedDate(editing?.receivedDate ?? "");
    setDurationDays(editing ? String(editing.loanDurationDays) : "");
    setEquipment(editing ? [] : [emptyEquipmentRow()]);
    setLinks([]);
  }, [open, editing]);

  const durationNum = Number(durationDays);
  const durationValid = Number.isInteger(durationNum) && durationNum >= 1;
  const returnByDate =
    receivedDate && durationValid ? addDays(receivedDate, durationNum) : "";

  const headerValid =
    !!pocName.trim() &&
    !!summary.trim() &&
    !!vendorName.trim() &&
    !!returnByDate;
  const equipmentValid =
    !!editing || (equipment.length > 0 && equipment.every(isEquipmentRowValid));
  const linksValid = links.every((l) => isValidLink(l.url));
  const canSave = !saving && headerValid && equipmentValid && linksValid;

  const updateRow = (key: string, patch: Partial<EquipmentRow>) =>
    setEquipment((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    const userName = getUserName();
    const nowIso = new Date().toISOString();
    const header = {
      pocName: pocName.trim(),
      summary: summary.trim(),
      vendorName: vendorName.trim(),
      receivedDate,
      loanDurationDays: durationNum,
      returnByDate,
    };
    try {
      if (editing) {
        await updateDoc(doc(collection(db, `${basePath}/pocProjects`), editing.id), header);
        await onLogActivity({
          action: "poc_update",
          collection: "pocProjects",
          docId: editing.id,
          summary: `Updated POC ${header.pocName} (${header.vendorName}), return by ${returnByDate}`,
        });
        onClose();
        return;
      }

      const pocId = crypto.randomUUID();
      const documents: PocDocument[] = links.map((l) =>
        makeLinkDocument(l.name, l.url, userName),
      );

      const poc: PocProject = {
        id: pocId,
        ...header,
        status: "active",
        documents,
        createdAt: nowIso,
        createdBy: userName,
      };

      const batch = writeBatch(db);
      batch.set(doc(collection(db, `${basePath}/pocProjects`), pocId), poc);
      for (const r of equipment) {
        const id = crypto.randomUUID();
        const item: PocEquipmentItem = {
          id,
          pocId,
          name: r.name.trim(),
          modelNumber: r.modelNumber.trim(),
          manufactureName: r.manufactureName.trim(),
          ...(r.serialNumber.trim() ? { serialNumber: r.serialNumber.trim() } : {}),
          quantity: Number(r.quantity),
          createdAt: nowIso,
          createdBy: userName,
        };
        batch.set(doc(collection(db, `${basePath}/pocEquipment`), id), item);
      }
      await batch.commit();

      await onLogActivity({
        action: "poc_create",
        collection: "pocProjects",
        docId: pocId,
        summary: `Created POC ${poc.pocName} from ${poc.vendorName} with ${equipment.length} equipment line(s), return by ${returnByDate}`,
      });
      onClose();
    } catch (err: any) {
      console.error("Failed to save POC", err);
      onAlert(`Failed to save POC: ${err?.message ?? String(err)}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={() => !saving && onClose()}
      title={editing ? "Edit POC" : "New POC"}
      maxWidthClass="max-w-4xl"
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
            className="px-4 py-2 rounded-md bg-[#0ea5e9] text-sm text-white hover:bg-[#0284c7] disabled:opacity-50"
            onClick={handleSave}
            disabled={!canSave}
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      }
    >
      <div className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className={pocLabelCls}>
              POC Project Name <Req />
            </label>
            <input className={pocInputCls} value={pocName} onChange={(e) => setPocName(e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label className={pocLabelCls}>
              POC Summary <Req />
            </label>
            <textarea
              className={pocInputCls}
              rows={3}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={pocLabelCls}>
              Vendor (equipment on loan from) <Req />
            </label>
            <input className={pocInputCls} value={vendorName} onChange={(e) => setVendorName(e.target.value)} />
          </div>
          <div>
            <label className={pocLabelCls}>
              Date Received <Req />
            </label>
            <input
              type="date"
              className={pocInputCls}
              value={receivedDate}
              onChange={(e) => setReceivedDate(e.target.value)}
            />
          </div>
          <div>
            <label className={pocLabelCls}>
              Loan Duration (days) <Req />
            </label>
            <input
              type="number"
              min={1}
              step={1}
              className={pocInputCls}
              value={durationDays}
              onChange={(e) => setDurationDays(e.target.value)}
            />
          </div>
          <div className="sm:col-span-2 rounded-md border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 text-sm text-[var(--fg)]">
            Ship back by:{" "}
            <span className="font-semibold">
              {returnByDate
                ? new Date(`${returnByDate}T00:00:00`).toLocaleDateString()
                : "—"}
            </span>
          </div>
        </div>

        {!editing && (
          <>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[var(--fg)]">
                  Equipment <Req />
                </h3>
                <button
                  type="button"
                  className="px-3 py-1 rounded-md bg-[#005691] text-xs text-white hover:bg-[#00426e]"
                  onClick={() => setEquipment((rows) => [...rows, emptyEquipmentRow()])}
                >
                  + Add Row
                </button>
              </div>
              <div className="border border-[var(--border)] rounded-md overflow-x-auto">
                <table className="min-w-full text-xs">
                  <thead className="bg-[var(--surface-1)]">
                    <tr>
                      <th className="px-2 py-2 text-left">Name *</th>
                      <th className="px-2 py-2 text-left">Model # *</th>
                      <th className="px-2 py-2 text-left">Manufacturer *</th>
                      <th className="px-2 py-2 text-left">Serial #</th>
                      <th className="px-2 py-2 text-left w-20">Qty *</th>
                      <th className="px-2 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {equipment.map((r) => (
                      <tr key={r.key} className="border-t border-[var(--border)]">
                        <td className="px-2 py-1">
                          <input className={smInputCls} value={r.name} onChange={(e) => updateRow(r.key, { name: e.target.value })} />
                        </td>
                        <td className="px-2 py-1">
                          <input className={smInputCls} value={r.modelNumber} onChange={(e) => updateRow(r.key, { modelNumber: e.target.value })} />
                        </td>
                        <td className="px-2 py-1">
                          <input className={smInputCls} value={r.manufactureName} onChange={(e) => updateRow(r.key, { manufactureName: e.target.value })} />
                        </td>
                        <td className="px-2 py-1">
                          <input className={smInputCls} placeholder="Optional" value={r.serialNumber} onChange={(e) => updateRow(r.key, { serialNumber: e.target.value })} />
                        </td>
                        <td className="px-2 py-1">
                          <input type="number" min={1} step={1} className={smInputCls} value={r.quantity} onChange={(e) => updateRow(r.key, { quantity: e.target.value })} />
                        </td>
                        <td className="px-2 py-1 text-right">
                          <button
                            type="button"
                            className="px-2 py-0.5 rounded bg-[#dc2626] text-white hover:bg-[#b91c1c] disabled:opacity-40"
                            disabled={equipment.length === 1}
                            onClick={() => setEquipment((rows) => rows.filter((x) => x.key !== r.key))}
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-[var(--fg)]">
                Document Links <span className="text-xs font-normal text-[var(--muted)]">(optional)</span>
              </h3>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="px-3 py-1 rounded-md border border-[var(--border)] text-xs text-[var(--fg)] hover:bg-[var(--surface-1)]"
                  onClick={() => setLinks((l) => [...l, { key: crypto.randomUUID(), name: "", url: "" }])}
                >
                  + Add Link
                </button>
              </div>
              {links.map((l) => (
                <div key={l.key} className="grid grid-cols-1 sm:grid-cols-[1fr_2fr_auto] gap-2 items-center">
                  <input
                    className={smInputCls}
                    placeholder="Label"
                    value={l.name}
                    onChange={(e) => setLinks((rows) => rows.map((x) => (x.key === l.key ? { ...x, name: e.target.value } : x)))}
                  />
                  <input
                    className={`${smInputCls} ${l.url && !isValidLink(l.url) ? "border-red-500" : ""}`}
                    placeholder="https://..."
                    value={l.url}
                    onChange={(e) => setLinks((rows) => rows.map((x) => (x.key === l.key ? { ...x, url: e.target.value } : x)))}
                  />
                  <button
                    type="button"
                    className="text-xs text-[#dc2626] hover:underline"
                    onClick={() => setLinks((rows) => rows.filter((x) => x.key !== l.key))}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};
