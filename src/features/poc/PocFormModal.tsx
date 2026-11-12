import React, { useEffect, useState } from "react";
import { collection, doc, writeBatch, updateDoc, increment } from "firebase/firestore";
import type { Firestore } from "firebase/firestore";
import { Modal } from "../../components/Modal";
import type {
  ActivityLog,
  InventoryItem,
  PocDocument,
  PocEquipmentItem,
  PocProject,
  Warehouse,
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
  /** Set when the row was imported from the default branch inventory. */
  sourceItemId?: string;
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
  /** User's default branch; enables "Import" when creating a POC. */
  defaultBranch?: Warehouse | null;
  /** Inventory items assigned to the default branch. */
  defaultBranchInventory?: InventoryItem[];
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
  defaultBranch = null,
  defaultBranchInventory = [],
}) => {
  const [pocName, setPocName] = useState("");
  const [summary, setSummary] = useState("");
  const [vendorName, setVendorName] = useState("");
  const [receivedDate, setReceivedDate] = useState("");
  const [durationDays, setDurationDays] = useState("");
  const [equipment, setEquipment] = useState<EquipmentRow[]>([]);
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [importItemId, setImportItemId] = useState("");

  const inventoryById = new Map(defaultBranchInventory.map((i) => [i.id, i]));
  const importCandidates = defaultBranchInventory
    .filter((i) => i.amountInInventory > 0)
    .filter((i) => !equipment.some((r) => r.sourceItemId === i.id))
    .sort((a, b) => a.name.localeCompare(b.name));

  const importAvailable = (r: EquipmentRow) =>
    r.sourceItemId ? inventoryById.get(r.sourceItemId)?.amountInInventory ?? 0 : Infinity;

  const handleImportRow = () => {
    const item = inventoryById.get(importItemId);
    if (!item) return;
    const row: EquipmentRow = {
      key: crypto.randomUUID(),
      name: item.name,
      modelNumber: item.modelNumber,
      manufactureName: item.manufactureName,
      serialNumber: "",
      quantity: "1",
      sourceItemId: item.id,
    };
    setEquipment((rows) => {
      // Replace the untouched blank starter row instead of leaving it behind.
      const blank = (x: EquipmentRow) =>
        !x.sourceItemId && !x.name && !x.modelNumber && !x.manufactureName && !x.serialNumber;
      return [...rows.filter((x) => !blank(x)), row];
    });
    setImportItemId("");
  };

  useEffect(() => {
    if (!open) return;
    setPocName(editing?.pocName ?? "");
    setSummary(editing?.summary ?? "");
    setVendorName(editing?.vendorName ?? "");
    setReceivedDate(editing?.receivedDate ?? "");
    setDurationDays(editing ? String(editing.loanDurationDays) : "");
    setEquipment(editing ? [] : [emptyEquipmentRow()]);
    setLinks([]);
    setImportItemId("");
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
    !!editing ||
    (equipment.length > 0 &&
      equipment.every(
        (r) => isEquipmentRowValid(r) && Number(r.quantity) <= importAvailable(r),
      ));
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
      const imported: { inv: InventoryItem; qty: number }[] = [];
      for (const r of equipment) {
        const id = crypto.randomUUID();
        const qty = Number(r.quantity);
        const inv = r.sourceItemId ? inventoryById.get(r.sourceItemId) : undefined;
        const item: PocEquipmentItem = {
          id,
          pocId,
          name: r.name.trim(),
          modelNumber: r.modelNumber.trim(),
          manufactureName: r.manufactureName.trim(),
          ...(r.serialNumber.trim() ? { serialNumber: r.serialNumber.trim() } : {}),
          quantity: qty,
          ...(inv && defaultBranch
            ? { sourceItemId: inv.id, sourceBranchId: defaultBranch.id }
            : {}),
          createdAt: nowIso,
          createdBy: userName,
        };
        batch.set(doc(collection(db, `${basePath}/pocEquipment`), id), item);
        if (inv) {
          batch.update(doc(collection(db, `${basePath}/inventory`), inv.id), {
            amountInInventory: increment(-qty),
          });
          imported.push({ inv, qty });
        }
      }
      await batch.commit();

      for (const { inv, qty } of imported) {
        await onLogActivity({
          action: "poc_equipment_import",
          collection: "inventory",
          docId: inv.id,
          itemId: inv.id,
          delta: -qty,
          resultingQuantity: inv.amountInInventory - qty,
          ...(defaultBranch ? { locationId: defaultBranch.id } : {}),
          summary: `Moved ${qty}× ${inv.name} (${inv.modelNumber}) from ${defaultBranch?.name ?? "default branch"} to POC ${poc.pocName}`,
        });
      }

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
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-[var(--fg)]">
                  Equipment <Req />
                </h3>
                <div className="flex flex-wrap items-center gap-2">
                <select
                  className={`${smInputCls} w-auto max-w-[16rem]`}
                  value={importItemId}
                  onChange={(e) => setImportItemId(e.target.value)}
                  disabled={!defaultBranch}
                  title={defaultBranch ? undefined : "Set a default branch in User Settings first"}
                >
                  <option value="">
                    {!defaultBranch
                      ? "Import: no default branch set"
                      : importCandidates.length
                        ? `Import from ${defaultBranch.shortCode || defaultBranch.name}...`
                        : `No in-stock items at ${defaultBranch.shortCode || defaultBranch.name}`}
                  </option>
                  {importCandidates.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name} — {i.modelNumber} ({i.amountInInventory} available)
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="px-3 py-1 rounded-md border border-[var(--border)] text-xs text-[var(--fg)] hover:bg-[var(--surface-1)] disabled:opacity-50"
                  onClick={handleImportRow}
                  disabled={!importItemId}
                >
                  Import from Inventory
                </button>
                <button
                  type="button"
                  className="px-3 py-1 rounded-md bg-[#005691] text-xs text-white hover:bg-[#00426e]"
                  onClick={() => setEquipment((rows) => [...rows, emptyEquipmentRow()])}
                >
                  + Add Row
                </button>
                </div>
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
                          <input className={smInputCls} value={r.name} readOnly={!!r.sourceItemId} onChange={(e) => updateRow(r.key, { name: e.target.value })} />
                          {r.sourceItemId && (
                            <span className="text-[10px] text-[var(--muted)]">
                              from {defaultBranch?.shortCode || defaultBranch?.name}
                            </span>
                          )}
                        </td>
                        <td className="px-2 py-1">
                          <input className={smInputCls} value={r.modelNumber} readOnly={!!r.sourceItemId} onChange={(e) => updateRow(r.key, { modelNumber: e.target.value })} />
                        </td>
                        <td className="px-2 py-1">
                          <input className={smInputCls} value={r.manufactureName} readOnly={!!r.sourceItemId} onChange={(e) => updateRow(r.key, { manufactureName: e.target.value })} />
                        </td>
                        <td className="px-2 py-1">
                          <input className={smInputCls} placeholder="Optional" value={r.serialNumber} onChange={(e) => updateRow(r.key, { serialNumber: e.target.value })} />
                        </td>
                        <td className="px-2 py-1">
                          <input
                            type="number"
                            min={1}
                            max={r.sourceItemId ? importAvailable(r) : undefined}
                            step={1}
                            className={`${smInputCls} ${Number(r.quantity) > importAvailable(r) ? "border-red-500" : ""}`}
                            value={r.quantity}
                            onChange={(e) => updateRow(r.key, { quantity: e.target.value })}
                          />
                          {r.sourceItemId && (
                            <span className="text-[10px] text-[var(--muted)]">max {importAvailable(r)}</span>
                          )}
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
