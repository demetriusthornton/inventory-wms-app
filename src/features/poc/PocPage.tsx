import React, { useState } from "react";
import { collection, doc, writeBatch } from "firebase/firestore";
import type { Firestore } from "firebase/firestore";
import { DataTable } from "../../components/DataTable";
import type { ActivityLog, PocEquipmentItem, PocProject, PocStatus } from "../../types";
import { daysUntil } from "../../utils/pocDates";
import { PocFormModal } from "./PocFormModal";

interface PocPageProps {
  db: Firestore;
  basePath: string;
  pocProjects: PocProject[];
  pocEquipment: PocEquipmentItem[];
  getUserName: () => string;
  onSelectPoc: (poc: PocProject) => void;
  onLogActivity: (
    entry: Omit<ActivityLog, "id" | "timestamp" | "userName">,
  ) => Promise<void>;
  onAlert: (msg: string) => void;
  onConfirm: (msg: string) => Promise<boolean | undefined>;
}

export const POC_STATUS_COLORS: Record<PocStatus, string> = {
  active: "bg-emerald-100 text-emerald-800",
  returned: "bg-slate-100 text-slate-600",
};

export const formatIsoDate = (iso: string) =>
  iso ? new Date(`${iso}T00:00:00`).toLocaleDateString() : "—";

export const DaysLeft: React.FC<{ poc: PocProject }> = ({ poc }) => {
  if (poc.status === "returned") return <span className="text-[var(--muted)]">—</span>;
  const days = daysUntil(poc.returnByDate);
  if (days === null) return <span>—</span>;
  const cls =
    days < 0
      ? "bg-red-100 text-red-800"
      : days <= 7
        ? "bg-amber-100 text-amber-800"
        : "bg-emerald-100 text-emerald-800";
  const label =
    days < 0 ? `${-days}d overdue` : days === 0 ? "Due today" : `${days}d`;
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>{label}</span>;
};

export const PocPage: React.FC<PocPageProps> = ({
  db,
  basePath,
  pocProjects,
  pocEquipment,
  getUserName,
  onSelectPoc,
  onLogActivity,
  onAlert,
  onConfirm,
}) => {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PocProject | null>(null);

  const getItemCount = (pocId: string) =>
    pocEquipment
      .filter((e) => e.pocId === pocId)
      .reduce((sum, e) => sum + e.quantity, 0);

  const handleDelete = async (poc: PocProject) => {
    const confirmed = await onConfirm(
      `Delete POC "${poc.pocName}" and all of its equipment and document links? This cannot be undone.`,
    );
    if (!confirmed) return;
    try {
      const batch = writeBatch(db);
      pocEquipment
        .filter((e) => e.pocId === poc.id)
        .forEach((e) => batch.delete(doc(collection(db, `${basePath}/pocEquipment`), e.id)));
      batch.delete(doc(collection(db, `${basePath}/pocProjects`), poc.id));
      await batch.commit();
      await onLogActivity({
        action: "poc_delete",
        collection: "pocProjects",
        docId: poc.id,
        summary: `Deleted POC ${poc.pocName} (${poc.vendorName})`,
      });
    } catch (err: any) {
      onAlert(`Failed to delete POC: ${err?.message ?? String(err)}`);
    }
  };

  return (
    <div className="space-y-4">
      <DataTable<PocProject>
        title="POC Equipment"
        data={pocProjects}
        searchFields={["pocName", "vendorName", "summary"]}
        filterFields={[
          {
            key: "status",
            label: "Status",
            type: "select",
            options: [
              { label: "Active", value: "active" },
              { label: "Returned", value: "returned" },
            ],
          },
        ]}
        getRowId={(row) => row.id}
        defaultSortKey="returnByDate"
        defaultSortDir="asc"
        columns={[
          { key: "pocName", label: "POC Project" },
          { key: "vendorName", label: "Vendor" },
          {
            key: "receivedDate",
            label: "Received",
            render: (row) => formatIsoDate(row.receivedDate),
          },
          {
            key: "returnByDate",
            label: "Return By",
            render: (row) => formatIsoDate(row.returnByDate),
          },
          {
            key: "daysLeft",
            label: "Days Left",
            render: (row) => <DaysLeft poc={row} />,
            sortFn: (a, b) => a.returnByDate.localeCompare(b.returnByDate),
          },
          {
            key: "items",
            label: "Items (qty)",
            render: (row) => getItemCount(row.id),
            sortFn: (a, b) => getItemCount(a.id) - getItemCount(b.id),
          },
          {
            key: "status",
            label: "Status",
            render: (row) => (
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${POC_STATUS_COLORS[row.status]}`}>
                {row.status === "active" ? "Active" : "Returned"}
              </span>
            ),
          },
        ]}
        actions={(row) => (
          <div className="flex gap-2">
            <button
              className="px-2 py-1 rounded bg-[#0ea5e9] text-xs text-white hover:bg-[#0284c7]"
              onClick={() => onSelectPoc(row)}
            >
              View
            </button>
            {row.status === "active" && (
              <button
                className="px-2 py-1 rounded border border-[var(--border)] text-xs text-[var(--fg)] hover:bg-[var(--surface-1)]"
                onClick={() => {
                  setEditing(row);
                  setFormOpen(true);
                }}
              >
                Edit
              </button>
            )}
            <button
              className="px-2 py-1 rounded bg-[#dc2626] text-xs text-white hover:bg-[#b91c1c]"
              onClick={() => handleDelete(row)}
            >
              Delete
            </button>
          </div>
        )}
      >
        <button
          className="px-3 py-1.5 rounded-md bg-[#005691] text-sm text-white hover:bg-[#00426e]"
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          + New POC
        </button>
      </DataTable>

      <PocFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        db={db}
        basePath={basePath}
        editing={editing}
        getUserName={getUserName}
        onLogActivity={onLogActivity}
        onAlert={onAlert}
      />
    </div>
  );
};
