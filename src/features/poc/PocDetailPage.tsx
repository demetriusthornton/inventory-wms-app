import React, { useState } from "react";
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
} from "firebase/firestore";
import type { Firestore } from "firebase/firestore";
import { Modal } from "../../components/Modal";
import type { ActivityLog, PocDocument, PocEquipmentItem, PocProject } from "../../types";
import { PocFormModal, isEquipmentRowValid, pocInputCls, pocLabelCls } from "./PocFormModal";
import { DaysLeft, POC_STATUS_COLORS, formatIsoDate } from "./PocPage";
import { isValidLink, makeLinkDocument } from "./pocStorage";

interface PocDetailPageProps {
  db: Firestore;
  basePath: string;
  poc: PocProject;
  equipment: PocEquipmentItem[];
  getUserName: () => string;
  onBack: () => void;
  onLogActivity: (
    entry: Omit<ActivityLog, "id" | "timestamp" | "userName">,
  ) => Promise<void>;
  onAlert: (msg: string) => void;
  onConfirm: (msg: string) => Promise<boolean | undefined>;
}

interface ItemForm {
  name: string;
  modelNumber: string;
  manufactureName: string;
  serialNumber: string;
  quantity: string;
}

const emptyItemForm = (): ItemForm => ({
  name: "",
  modelNumber: "",
  manufactureName: "",
  serialNumber: "",
  quantity: "1",
});

const Req = () => <span className="text-red-500">*</span>;

export const PocDetailPage: React.FC<PocDetailPageProps> = ({
  db,
  basePath,
  poc,
  equipment,
  getUserName,
  onBack,
  onLogActivity,
  onAlert,
  onConfirm,
}) => {
  const isActive = poc.status === "active";
  const documents = poc.documents ?? [];
  const pocRef = doc(collection(db, `${basePath}/pocProjects`), poc.id);

  const [editOpen, setEditOpen] = useState(false);

  // Equipment add/edit modal
  const [itemOpen, setItemOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PocEquipmentItem | null>(null);
  const [itemForm, setItemForm] = useState<ItemForm>(emptyItemForm());
  const [savingItem, setSavingItem] = useState(false);

  // Document links
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkName, setLinkName] = useState("");
  const [linkUrl, setLinkUrl] = useState("");

  // Return modal
  const [returnOpen, setReturnOpen] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [rmaNumber, setRmaNumber] = useState("");
  const [returning, setReturning] = useState(false);

  // ── Equipment ──────────────────────────────────────────────────────────────

  const openAddItem = () => {
    setEditingItem(null);
    setItemForm(emptyItemForm());
    setItemOpen(true);
  };

  const openEditItem = (item: PocEquipmentItem) => {
    setEditingItem(item);
    setItemForm({
      name: item.name,
      modelNumber: item.modelNumber,
      manufactureName: item.manufactureName,
      serialNumber: item.serialNumber ?? "",
      quantity: String(item.quantity),
    });
    setItemOpen(true);
  };

  const handleSaveItem = async () => {
    if (!isEquipmentRowValid(itemForm)) return;
    setSavingItem(true);
    try {
      const fields = {
        name: itemForm.name.trim(),
        modelNumber: itemForm.modelNumber.trim(),
        manufactureName: itemForm.manufactureName.trim(),
        quantity: Number(itemForm.quantity),
      };
      if (editingItem) {
        const { serialNumber: _old, ...rest } = editingItem;
        const updated: PocEquipmentItem = {
          ...rest,
          ...fields,
          ...(itemForm.serialNumber.trim() ? { serialNumber: itemForm.serialNumber.trim() } : {}),
        };
        await setDoc(doc(collection(db, `${basePath}/pocEquipment`), editingItem.id), updated);
        await onLogActivity({
          action: "poc_equipment_update",
          collection: "pocEquipment",
          docId: editingItem.id,
          summary: `Updated ${updated.name} (${updated.modelNumber}) qty ${updated.quantity} on POC ${poc.pocName}`,
        });
      } else {
        const id = crypto.randomUUID();
        const item: PocEquipmentItem = {
          id,
          pocId: poc.id,
          ...fields,
          ...(itemForm.serialNumber.trim() ? { serialNumber: itemForm.serialNumber.trim() } : {}),
          createdAt: new Date().toISOString(),
          createdBy: getUserName(),
        };
        await setDoc(doc(collection(db, `${basePath}/pocEquipment`), id), item);
        await onLogActivity({
          action: "poc_equipment_add",
          collection: "pocEquipment",
          docId: id,
          summary: `Added ${item.quantity}× ${item.name} (${item.modelNumber}) to POC ${poc.pocName}`,
        });
      }
      setItemOpen(false);
    } catch (err: any) {
      onAlert(`Failed to save equipment: ${err?.message ?? String(err)}`);
    } finally {
      setSavingItem(false);
    }
  };

  const handleRemoveItem = async (item: PocEquipmentItem) => {
    const confirmed = await onConfirm(`Remove ${item.name} (${item.modelNumber}) from this POC?`);
    if (!confirmed) return;
    await deleteDoc(doc(collection(db, `${basePath}/pocEquipment`), item.id));
    await onLogActivity({
      action: "poc_equipment_remove",
      collection: "pocEquipment",
      docId: item.id,
      summary: `Removed ${item.quantity}× ${item.name} (${item.modelNumber}) from POC ${poc.pocName}`,
    });
  };

  // ── Documents ──────────────────────────────────────────────────────────────

  const saveDocuments = (next: PocDocument[]) => updateDoc(pocRef, { documents: next });

  const handleAddLink = async () => {
    if (!isValidLink(linkUrl)) return;
    try {
      const d = makeLinkDocument(linkName, linkUrl, getUserName());
      await saveDocuments([...documents, d]);
      await onLogActivity({
        action: "poc_document_add",
        collection: "pocProjects",
        docId: poc.id,
        summary: `Added link "${d.name}" to POC ${poc.pocName}`,
      });
      setLinkOpen(false);
    } catch (err: any) {
      onAlert(`Failed to add link: ${err?.message ?? String(err)}`);
    }
  };

  const handleRemoveDocument = async (d: PocDocument) => {
    const confirmed = await onConfirm(`Remove document link "${d.name}"?`);
    if (!confirmed) return;
    try {
      await saveDocuments(documents.filter((x) => x.id !== d.id));
      await onLogActivity({
        action: "poc_document_remove",
        collection: "pocProjects",
        docId: poc.id,
        summary: `Removed document "${d.name}" from POC ${poc.pocName}`,
      });
    } catch (err: any) {
      onAlert(`Failed to remove document: ${err?.message ?? String(err)}`);
    }
  };

  // ── Return ─────────────────────────────────────────────────────────────────

  const openReturn = () => {
    setTrackingNumber("");
    setRmaNumber("");
    setReturnOpen(true);
  };

  const handleReturn = async () => {
    const tracking = trackingNumber.trim();
    if (!tracking) return;
    const rma = rmaNumber.trim();
    setReturning(true);
    try {
      const batch = writeBatch(db);
      equipment.forEach((e) =>
        batch.delete(doc(collection(db, `${basePath}/pocEquipment`), e.id)),
      );
      batch.update(pocRef, {
        status: "returned",
        returnTrackingNumber: tracking,
        ...(rma ? { returnRmaNumber: rma } : {}),
        returnedAt: new Date().toISOString(),
        returnedBy: getUserName(),
        returnedItems: equipment.map((e) => ({
          name: e.name,
          modelNumber: e.modelNumber,
          manufactureName: e.manufactureName,
          ...(e.serialNumber ? { serialNumber: e.serialNumber } : {}),
          quantity: e.quantity,
        })),
      });
      await batch.commit();
      const itemsText = equipment.map((e) => `${e.quantity}× ${e.name}`).join(", ") || "no items";
      await onLogActivity({
        action: "poc_return",
        collection: "pocProjects",
        docId: poc.id,
        summary: `Returned POC ${poc.pocName} equipment to ${poc.vendorName} (${itemsText}). Tracking ${tracking}${rma ? `, RMA ${rma}` : ""}`,
      });
      setReturnOpen(false);
    } catch (err: any) {
      onAlert(`Failed to return equipment: ${err?.message ?? String(err)}`);
    } finally {
      setReturning(false);
    }
  };

  const shownItems = isActive ? equipment : null;
  const totalQty = equipment.reduce((s, e) => s + e.quantity, 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <button
            className="px-3 py-1.5 rounded-md border border-[var(--border)] text-sm text-[var(--fg)] hover:bg-[var(--surface-1)]"
            onClick={onBack}
          >
            ← Back
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-[var(--fg)] text-base">{poc.pocName}</span>
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-medium ${POC_STATUS_COLORS[poc.status]}`}
              >
                {isActive ? "Active" : "Returned"}
              </span>
              <DaysLeft poc={poc} />
            </div>
            <p className="text-xs text-[var(--muted)] mt-0.5">
              Vendor: <span className="text-[var(--fg)]">{poc.vendorName}</span>
            </p>
          </div>
        </div>
        {isActive && (
          <div className="flex items-center gap-2">
            <button
              className="px-3 py-1.5 rounded-md border border-[var(--border)] text-sm text-[var(--fg)] hover:bg-[var(--surface-1)]"
              onClick={() => setEditOpen(true)}
            >
              Edit
            </button>
            <button
              className="px-3 py-1.5 rounded-md bg-[#dc2626] text-sm text-white hover:bg-[#b91c1c]"
              onClick={openReturn}
            >
              Return Equipment
            </button>
          </div>
        )}
      </div>

      {/* Details */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
        <div className="md:col-span-4 rounded-md border border-[var(--border)] p-3">
          <div className="text-xs text-[var(--muted)] mb-1">POC Summary</div>
          <p className="text-[var(--fg)] whitespace-pre-wrap">{poc.summary}</p>
        </div>
        <div className="rounded-md border border-[var(--border)] p-3">
          <div className="text-xs text-[var(--muted)]">Date Received</div>
          <div className="font-medium text-[var(--fg)]">{formatIsoDate(poc.receivedDate)}</div>
        </div>
        <div className="rounded-md border border-[var(--border)] p-3">
          <div className="text-xs text-[var(--muted)]">Loan Duration</div>
          <div className="font-medium text-[var(--fg)]">{poc.loanDurationDays} days</div>
        </div>
        <div className="rounded-md border border-[var(--border)] p-3">
          <div className="text-xs text-[var(--muted)]">Ship Back By</div>
          <div className="font-medium text-[var(--fg)]">{formatIsoDate(poc.returnByDate)}</div>
        </div>
        <div className="rounded-md border border-[var(--border)] p-3">
          <div className="text-xs text-[var(--muted)]">Created</div>
          <div className="font-medium text-[var(--fg)]">
            {new Date(poc.createdAt).toLocaleDateString()}
            {poc.createdBy && <span className="text-xs text-[var(--muted)]"> by {poc.createdBy}</span>}
          </div>
        </div>
        {!isActive && (
          <div className="md:col-span-4 rounded-md border border-[var(--border)] bg-[var(--surface-1)] p-3 grid grid-cols-1 sm:grid-cols-4 gap-2">
            <div>
              <div className="text-xs text-[var(--muted)]">Returned</div>
              <div className="font-medium text-[var(--fg)]">
                {poc.returnedAt ? new Date(poc.returnedAt).toLocaleDateString() : "—"}
              </div>
            </div>
            <div>
              <div className="text-xs text-[var(--muted)]">Returned By</div>
              <div className="font-medium text-[var(--fg)]">{poc.returnedBy ?? "—"}</div>
            </div>
            <div>
              <div className="text-xs text-[var(--muted)]">Tracking #</div>
              <div className="font-medium text-[var(--fg)]">{poc.returnTrackingNumber ?? "—"}</div>
            </div>
            <div>
              <div className="text-xs text-[var(--muted)]">RMA #</div>
              <div className="font-medium text-[var(--fg)]">{poc.returnRmaNumber ?? "—"}</div>
            </div>
          </div>
        )}
      </div>

      {/* Equipment */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[var(--fg)]">
            {isActive ? `Equipment (${totalQty})` : "Returned Equipment"}
          </h3>
          {isActive && (
            <button
              className="px-3 py-1.5 rounded-md bg-[#005691] text-sm text-white hover:bg-[#00426e]"
              onClick={openAddItem}
            >
              + Add Equipment
            </button>
          )}
        </div>
        {(() => {
          const rows = shownItems ?? poc.returnedItems ?? [];
          if (rows.length === 0) {
            return <p className="text-sm text-[var(--muted)] py-2">No equipment listed.</p>;
          }
          return (
            <div className="border border-[var(--border)] rounded-md overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead className="bg-[var(--surface-1)]">
                  <tr>
                    <th className="px-3 py-2 text-left">Name</th>
                    <th className="px-3 py-2 text-left">Model #</th>
                    <th className="px-3 py-2 text-left">Manufacturer</th>
                    <th className="px-3 py-2 text-left">Serial #</th>
                    <th className="px-3 py-2 text-right">Qty</th>
                    {isActive && <th className="px-3 py-2 text-left">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((e, i) => (
                    <tr
                      key={"id" in e ? (e as PocEquipmentItem).id : i}
                      className="border-t border-[var(--border)] odd:bg-[var(--row-odd)] even:bg-[var(--row-even)]"
                    >
                      <td className="px-3 py-2">{e.name}</td>
                      <td className="px-3 py-2">{e.modelNumber}</td>
                      <td className="px-3 py-2">{e.manufactureName}</td>
                      <td className="px-3 py-2">{e.serialNumber ?? "—"}</td>
                      <td className="px-3 py-2 text-right font-medium">{e.quantity}</td>
                      {isActive && (
                        <td className="px-3 py-2">
                          <div className="flex gap-1">
                            <button
                              className="px-2 py-0.5 rounded border border-[var(--border)] text-[var(--fg)] hover:bg-[var(--surface-1)]"
                              onClick={() => openEditItem(e as PocEquipmentItem)}
                            >
                              Edit
                            </button>
                            <button
                              className="px-2 py-0.5 rounded bg-[#dc2626] text-white hover:bg-[#b91c1c]"
                              onClick={() => handleRemoveItem(e as PocEquipmentItem)}
                            >
                              Remove
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })()}
      </div>

      {/* Documents */}
      <div className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="text-sm font-semibold text-[var(--fg)]">Document Links ({documents.length})</h3>
          <div className="flex gap-2">
            <button
              className="px-3 py-1.5 rounded-md border border-[var(--border)] text-sm text-[var(--fg)] hover:bg-[var(--surface-1)]"
              onClick={() => {
                setLinkName("");
                setLinkUrl("");
                setLinkOpen(true);
              }}
            >
              + Add Link
            </button>
          </div>
        </div>
        {documents.length === 0 ? (
          <p className="text-sm text-[var(--muted)] py-2">No document links yet.</p>
        ) : (
          <ul className="border border-[var(--border)] rounded-md divide-y divide-[var(--border)]">
            {documents.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                <div className="min-w-0">
                  <a
                    href={d.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#0ea5e9] hover:underline truncate block"
                  >
                    🔗 {d.name}
                  </a>
                  <div className="text-xs text-[var(--muted)]">
                    {new Date(d.addedAt).toLocaleDateString()} · {d.addedBy}
                  </div>
                </div>
                <button
                  className="px-2 py-0.5 rounded bg-[#dc2626] text-xs text-white hover:bg-[#b91c1c] shrink-0"
                  onClick={() => handleRemoveDocument(d)}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Edit POC header */}
      <PocFormModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        db={db}
        basePath={basePath}
        editing={poc}
        getUserName={getUserName}
        onLogActivity={onLogActivity}
        onAlert={onAlert}
      />

      {/* Equipment modal */}
      <Modal
        open={itemOpen}
        onClose={() => !savingItem && setItemOpen(false)}
        title={editingItem ? "Edit Equipment" : "Add Equipment"}
        maxWidthClass="max-w-xl"
        footer={
          <div className="flex justify-end gap-3">
            <button
              className="px-4 py-2 rounded-md bg-[#dc2626] text-sm text-white hover:bg-[#b91c1c]"
              onClick={() => setItemOpen(false)}
              disabled={savingItem}
            >
              Cancel
            </button>
            <button
              className="px-4 py-2 rounded-md bg-[#0ea5e9] text-sm text-white hover:bg-[#0284c7] disabled:opacity-50"
              onClick={handleSaveItem}
              disabled={savingItem || !isEquipmentRowValid(itemForm)}
            >
              {savingItem ? "Saving..." : "Save"}
            </button>
          </div>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {(
            [
              ["name", "Name", true],
              ["modelNumber", "Model #", true],
              ["manufactureName", "Manufacturer", true],
              ["serialNumber", "Serial #", false],
            ] as const
          ).map(([key, label, required]) => (
            <div key={key}>
              <label className={pocLabelCls}>
                {label} {required && <Req />}
              </label>
              <input
                className={pocInputCls}
                placeholder={required ? undefined : "Optional"}
                value={itemForm[key]}
                onChange={(e) => setItemForm((p) => ({ ...p, [key]: e.target.value }))}
              />
            </div>
          ))}
          <div>
            <label className={pocLabelCls}>
              Quantity <Req />
            </label>
            <input
              type="number"
              min={1}
              step={1}
              className={pocInputCls}
              value={itemForm.quantity}
              onChange={(e) => setItemForm((p) => ({ ...p, quantity: e.target.value }))}
            />
          </div>
        </div>
      </Modal>

      {/* Link modal */}
      <Modal
        open={linkOpen}
        onClose={() => setLinkOpen(false)}
        title="Add Link"
        maxWidthClass="max-w-lg"
        footer={
          <div className="flex justify-end gap-3">
            <button
              className="px-4 py-2 rounded-md bg-[#dc2626] text-sm text-white hover:bg-[#b91c1c]"
              onClick={() => setLinkOpen(false)}
            >
              Cancel
            </button>
            <button
              className="px-4 py-2 rounded-md bg-[#0ea5e9] text-sm text-white hover:bg-[#0284c7] disabled:opacity-50"
              onClick={handleAddLink}
              disabled={!isValidLink(linkUrl)}
            >
              Add
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className={pocLabelCls}>Label</label>
            <input className={pocInputCls} value={linkName} onChange={(e) => setLinkName(e.target.value)} />
          </div>
          <div>
            <label className={pocLabelCls}>
              URL <Req />
            </label>
            <input
              className={pocInputCls}
              placeholder="https://..."
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
            />
          </div>
        </div>
      </Modal>

      {/* Return modal */}
      <Modal
        open={returnOpen}
        onClose={() => !returning && setReturnOpen(false)}
        title="Return Equipment"
        maxWidthClass="max-w-xl"
        footer={
          <div className="flex justify-end gap-3">
            <button
              className="px-4 py-2 rounded-md border border-[var(--border)] text-sm text-[var(--fg)] hover:bg-[var(--surface-1)]"
              onClick={() => setReturnOpen(false)}
              disabled={returning}
            >
              Cancel
            </button>
            <button
              className="px-4 py-2 rounded-md bg-[#dc2626] text-sm text-white hover:bg-[#b91c1c] disabled:opacity-50"
              onClick={handleReturn}
              disabled={returning || !trackingNumber.trim()}
            >
              {returning ? "Returning..." : "Confirm Return"}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-[var(--fg)]">
            All equipment below will be removed from POC inventory and this POC will be marked
            <span className="font-semibold"> Returned</span> to {poc.vendorName}.
          </p>
          <ul className="text-xs border border-[var(--border)] rounded-md divide-y divide-[var(--border)] max-h-48 overflow-y-auto">
            {equipment.length === 0 ? (
              <li className="px-3 py-2 text-[var(--muted)]">No equipment listed.</li>
            ) : (
              equipment.map((e) => (
                <li key={e.id} className="px-3 py-1.5 flex justify-between gap-2">
                  <span>
                    {e.name} <span className="text-[var(--muted)]">({e.modelNumber})</span>
                    {e.serialNumber && <span className="text-[var(--muted)]"> · SN {e.serialNumber}</span>}
                  </span>
                  <span className="font-medium">× {e.quantity}</span>
                </li>
              ))
            )}
          </ul>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={pocLabelCls}>
                Tracking Number <Req />
              </label>
              <input
                className={pocInputCls}
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
              />
            </div>
            <div>
              <label className={pocLabelCls}>RMA Number</label>
              <input
                className={pocInputCls}
                placeholder="Optional"
                value={rmaNumber}
                onChange={(e) => setRmaNumber(e.target.value)}
              />
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};
