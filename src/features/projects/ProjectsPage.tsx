import React, { useState } from "react";
import { collection, doc, setDoc, deleteDoc } from "firebase/firestore";
import type { Firestore } from "firebase/firestore";
import { DataTable } from "../../components/DataTable";
import { Modal } from "../../components/Modal";
import type {
  ActivityLog,
  Project,
  ProjectInventoryItem,
  ProjectStatus,
  Warehouse,
} from "../../types";

interface ProjectsPageProps {
  db: Firestore;
  basePath: string;
  projects: Project[];
  projectInventory: ProjectInventoryItem[];
  warehouses: Warehouse[];
  getUserName: () => string;
  onSelectProject: (project: Project) => void;
  onLogActivity: (
    entry: Omit<ActivityLog, "id" | "timestamp" | "userName">,
  ) => Promise<void>;
  onAlert: (msg: string) => void;
  onConfirm: (msg: string) => Promise<boolean | undefined>;
}

const STATUS_COLORS: Record<ProjectStatus, string> = {
  active: "bg-emerald-100 text-emerald-800",
  pending: "bg-blue-100 text-blue-800",
  "on-hold": "bg-amber-100 text-amber-800",
  closed: "bg-slate-100 text-slate-600",
};

const inputCls =
  "w-full border border-[var(--input-border)] rounded-md px-3 py-2 text-sm bg-[var(--input-bg)] text-[var(--input-fg)] focus:outline-none focus:ring-2 focus:ring-[#0ea5e9]";
const labelCls = "block text-xs font-medium text-[var(--fg)] mb-1";

interface ProjectForm {
  ipNumber: string;
  projectNumber: string;
  projectName: string;
  description: string;
  status: ProjectStatus;
  parentBranchId: string;
}

const emptyForm = (): ProjectForm => ({
  ipNumber: "",
  projectNumber: "",
  projectName: "",
  description: "",
  status: "active",
  parentBranchId: "",
});

export const ProjectsPage: React.FC<ProjectsPageProps> = ({
  db,
  basePath,
  projects,
  projectInventory,
  warehouses,
  getUserName,
  onSelectProject,
  onLogActivity,
  onAlert,
  onConfirm,
}) => {
  const [formOpen, setFormOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [form, setForm] = useState<ProjectForm>(emptyForm());
  const [saving, setSaving] = useState(false);

  const standardWarehouses = [...warehouses]
    .filter((w) => !w.type || w.type === "standard")
    .sort((a, b) => b.name.localeCompare(a.name));

  const openNew = () => {
    setEditingProject(null);
    setForm(emptyForm());
    setFormOpen(true);
  };

  const openEdit = (project: Project) => {
    setEditingProject(project);
    setForm({
      ipNumber: project.ipNumber,
      projectNumber: project.projectNumber ?? "",
      projectName: project.projectName,
      description: project.description ?? "",
      status: project.status,
      parentBranchId: project.parentBranchId,
    });
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!form.ipNumber.trim() || !form.projectName.trim() || !form.parentBranchId) return;
    setSaving(true);
    try {
      const nowIso = new Date().toISOString();
      const userName = getUserName();
      if (editingProject) {
        const updated: Project = {
          ...editingProject,
          ipNumber: form.ipNumber.trim(),
          ...(form.projectNumber.trim() ? { projectNumber: form.projectNumber.trim() } : {}),
          projectName: form.projectName.trim(),
          ...(form.description.trim() ? { description: form.description.trim() } : {}),
          status: form.status,
          parentBranchId: form.parentBranchId,
        };
        await setDoc(
          doc(collection(db, `${basePath}/projects`), editingProject.id),
          updated,
        );
        await onLogActivity({
          action: "project_update",
          collection: "projects",
          docId: editingProject.id,
          summary: `Updated project ${updated.ipNumber} – ${updated.projectName}`,
        });
      } else {
        const id = crypto.randomUUID();
        const project: Project = {
          id,
          ipNumber: form.ipNumber.trim(),
          ...(form.projectNumber.trim() ? { projectNumber: form.projectNumber.trim() } : {}),
          projectName: form.projectName.trim(),
          ...(form.description.trim() ? { description: form.description.trim() } : {}),
          status: form.status,
          parentBranchId: form.parentBranchId,
          createdAt: nowIso,
          createdBy: userName,
        };
        await setDoc(doc(collection(db, `${basePath}/projects`), id), project);
        await onLogActivity({
          action: "project_create",
          collection: "projects",
          docId: id,
          summary: `Created project ${project.ipNumber} – ${project.projectName}`,
        });
      }
      setFormOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (project: Project) => {
    const hasInventory = projectInventory.some(
      (pi) => pi.projectId === project.id,
    );
    if (hasInventory) {
      onAlert(
        "Cannot delete a project with remaining inventory. Remove all inventory items first.",
      );
      return;
    }
    const confirmed = await onConfirm(
      `Delete project ${project.ipNumber} – ${project.projectName}? This cannot be undone.`,
    );
    if (!confirmed) return;
    await deleteDoc(doc(collection(db, `${basePath}/projects`), project.id));
    await onLogActivity({
      action: "project_delete",
      collection: "projects",
      docId: project.id,
      summary: `Deleted project ${project.ipNumber} – ${project.projectName}`,
    });
  };

  const getWarehouseName = (id: string) =>
    warehouses.find((w) => w.id === id)?.name ?? id;

  const getItemCount = (projectId: string) =>
    projectInventory
      .filter((pi) => pi.projectId === projectId)
      .reduce((sum, pi) => sum + pi.quantity, 0);

  return (
    <div className="space-y-4">
      <DataTable<Project>
        title="Projects"
        data={projects}
        searchFields={["ipNumber", "projectNumber", "projectName"]}
        filterFields={[
          {
            key: "status",
            label: "Status",
            type: "select",
            options: [
              { label: "Active", value: "active" },
              { label: "Pending", value: "pending" },
              { label: "On Hold", value: "on-hold" },
              { label: "Closed", value: "closed" },
            ],
          },
        ]}
        getRowId={(row) => row.id}
        defaultSortKey="createdAt"
        defaultSortDir="desc"
        columns={[
          { key: "projectName", label: "Name" },
          { key: "ipNumber", label: "IP #" },
          {
            key: "projectNumber",
            label: "Project #",
            render: (row) => row.projectNumber ?? "—",
          },
          {
            key: "status",
            label: "Status",
            render: (row) => (
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[row.status]}`}
              >
                {row.status.charAt(0).toUpperCase() + row.status.slice(1).replace("-", " ")}
              </span>
            ),
          },
          {
            key: "parentBranchId",
            label: "Branch",
            render: (row) => getWarehouseName(row.parentBranchId),
          },
          {
            key: "items",
            label: "Items (qty)",
            render: (row) => getItemCount(row.id),
          },
          {
            key: "createdAt",
            label: "Created",
            render: (row) =>
              row.createdAt ? new Date(row.createdAt).toLocaleDateString() : "—",
          },
        ]}
        actions={(row) => (
          <div className="flex gap-2">
            <button
              className="px-2 py-1 rounded bg-[#0ea5e9] text-xs text-white hover:bg-[#0284c7]"
              onClick={() => onSelectProject(row)}
            >
              View
            </button>
            <button
              className="px-2 py-1 rounded border border-[var(--border)] text-xs text-[var(--fg)] hover:bg-[var(--surface-1)]"
              onClick={() => openEdit(row)}
            >
              Edit
            </button>
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
          onClick={openNew}
        >
          + New Project
        </button>
      </DataTable>

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editingProject ? "Edit Project" : "New Project"}
        maxWidthClass="max-w-xl"
        footer={
          <div className="flex justify-end gap-3">
            <button
              className="px-4 py-2 rounded-md bg-[#dc2626] text-sm text-white hover:bg-[#b91c1c]"
              onClick={() => setFormOpen(false)}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              className="px-4 py-2 rounded-md bg-[#0ea5e9] text-sm text-white hover:bg-[#0284c7] disabled:opacity-50"
              onClick={handleSave}
              disabled={
                saving ||
                !form.ipNumber.trim() ||
                !form.projectName.trim() ||
                !form.parentBranchId
              }
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>
                IP Number <span className="text-red-500">*</span>
              </label>
              <input
                className={inputCls}
                value={form.ipNumber}
                onChange={(e) =>
                  setForm((p) => ({ ...p, ipNumber: e.target.value }))
                }
              />
            </div>
            <div>
              <label className={labelCls}>Project #</label>
              <input
                className={inputCls}
                placeholder="Optional"
                value={form.projectNumber}
                onChange={(e) =>
                  setForm((p) => ({ ...p, projectNumber: e.target.value }))
                }
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>
                Project Name <span className="text-red-500">*</span>
              </label>
              <input
                className={inputCls}
                value={form.projectName}
                onChange={(e) =>
                  setForm((p) => ({ ...p, projectName: e.target.value }))
                }
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Description</label>
              <textarea
                className={inputCls}
                rows={2}
                value={form.description}
                onChange={(e) =>
                  setForm((p) => ({ ...p, description: e.target.value }))
                }
              />
            </div>
            <div>
              <label className={labelCls}>
                Branch <span className="text-red-500">*</span>
              </label>
              <select
                className={inputCls}
                value={form.parentBranchId}
                onChange={(e) =>
                  setForm((p) => ({ ...p, parentBranchId: e.target.value }))
                }
              >
                <option value="">Select branch...</option>
                {standardWarehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.shortCode ? `${w.shortCode} — ${w.name}` : w.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Status</label>
              <select
                className={inputCls}
                value={form.status}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    status: e.target.value as ProjectStatus,
                  }))
                }
              >
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="on-hold">On Hold</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};
