import React, { useMemo, useState } from "react";
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
import type {
  ActivityLog,
  InventoryItem,
  Project,
  ProjectInventoryItem,
  ProjectShipment,
  ProjectShipmentLine,
  ProjectStatus,
  PurchaseOrder,
  Warehouse,
} from "../../types";

interface ProjectDetailPageProps {
  db: Firestore;
  basePath: string;
  project: Project;
  projectInventory: ProjectInventoryItem[];
  projectShipments: ProjectShipment[];
  purchaseOrders: PurchaseOrder[];
  poHistory: PurchaseOrder[];
  parentBranchInventory: InventoryItem[];
  warehouses: Warehouse[];
  getUserName: () => string;
  onBack: () => void;
  onLogActivity: (
    entry: Omit<ActivityLog, "id" | "timestamp" | "userName">,
  ) => Promise<void>;
  onAlert: (msg: string) => void;
  onConfirm: (msg: string) => Promise<boolean | undefined>;
}

type Tab = "inventory" | "purchaseOrders" | "shipments";

const STATUS_COLORS: Record<ProjectStatus, string> = {
  active: "bg-emerald-100 text-emerald-800",
  pending: "bg-blue-100 text-blue-800",
  "on-hold": "bg-amber-100 text-amber-800",
  closed: "bg-slate-100 text-slate-600",
};

const SHIPMENT_STATUS_COLORS = {
  pending: "bg-amber-100 text-amber-800",
  shipped: "bg-emerald-100 text-emerald-800",
};

const inputCls =
  "w-full border border-[var(--input-border)] rounded-md px-3 py-2 text-sm bg-[var(--input-bg)] text-[var(--input-fg)] focus:outline-none focus:ring-2 focus:ring-[#0ea5e9]";
const labelCls = "block text-xs font-medium text-[var(--fg)] mb-1";
const smInputCls =
  "border border-[var(--input-border)] rounded px-2 py-1 text-xs bg-[var(--input-bg)] text-[var(--input-fg)] focus:outline-none focus:ring-1 focus:ring-[#0ea5e9]";

export const ProjectDetailPage: React.FC<ProjectDetailPageProps> = ({
  db,
  basePath,
  project,
  projectInventory,
  projectShipments,
  purchaseOrders,
  poHistory,
  parentBranchInventory,
  warehouses,
  getUserName,
  onBack,
  onLogActivity,
  onAlert,
  onConfirm,
}) => {
  const [activeTab, setActiveTab] = useState<Tab>("inventory");
  const [savingAdd, setSavingAdd] = useState(false);
  const [savingShipment, setSavingShipment] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);

  // Add-item modal
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [addSearch, setAddSearch] = useState("");
  const [addItemId, setAddItemId] = useState("");
  const [addQty, setAddQty] = useState(1);

  // Adjust-qty modal
  const [adjustItem, setAdjustItem] = useState<ProjectInventoryItem | null>(null);
  const [adjustQty, setAdjustQty] = useState(0);

  // Create-shipment modal
  const [shipmentOpen, setShipmentOpen] = useState(false);
  const [shipDestId, setShipDestId] = useState("");
  const [shipLabel, setShipLabel] = useState("");
  const [shipTracking, setShipTracking] = useState("");
  const [shipLines, setShipLines] = useState<
    { projectItemId: string; name: string; modelNumber: string; maxQty: number; qty: number; selected: boolean }[]
  >([]);

  const [expandedShipmentId, setExpandedShipmentId] = useState<string | null>(null);

  const standardWarehouses = useMemo(
    () => warehouses.filter((w) => !w.type || w.type === "standard"),
    [warehouses],
  );

  const getWarehouseName = (id: string) =>
    warehouses.find((w) => w.id === id)?.name ?? id;

  const parentBranch = warehouses.find((w) => w.id === project.parentBranchId);

  // ── Status change ───────────────────────────────────────────────────────────

  const handleStatusChange = async (newStatus: ProjectStatus) => {
    setSavingStatus(true);
    try {
      const updates: Partial<Project> = { status: newStatus };
      if (newStatus === "closed") updates.closedDate = new Date().toISOString();
      await updateDoc(
        doc(collection(db, `${basePath}/projects`), project.id),
        updates,
      );
      await onLogActivity({
        action: "project_status_change",
        collection: "projects",
        docId: project.id,
        summary: `Changed project ${project.ipNumber} status to ${newStatus}`,
      });
    } finally {
      setSavingStatus(false);
    }
  };

  // ── Add item from stock ─────────────────────────────────────────────────────

  const availableItems = useMemo(
    () =>
      [...parentBranchInventory]
        .filter((i) => i.amountInInventory > 0)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [parentBranchInventory],
  );

  const filteredAddItems = useMemo(() => {
    if (!addSearch.trim()) return availableItems;
    const q = addSearch.toLowerCase();
    return availableItems.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        i.modelNumber.toLowerCase().includes(q) ||
        i.category.toLowerCase().includes(q),
    );
  }, [availableItems, addSearch]);

  const selectedAddItem = useMemo(
    () => availableItems.find((i) => i.id === addItemId) ?? null,
    [availableItems, addItemId],
  );

  const openAddItem = () => {
    setAddSearch("");
    setAddItemId("");
    setAddQty(1);
    setAddItemOpen(true);
  };

  const handleAddItem = async () => {
    if (!selectedAddItem || addQty < 1 || addQty > selectedAddItem.amountInInventory) return;
    setSavingAdd(true);
    try {
      const userName = getUserName();
      const nowIso = new Date().toISOString();
      const batch = writeBatch(db);

      const existing = projectInventory.find(
        (pi) => pi.sourceItemId === selectedAddItem.id,
      );

      if (existing) {
        batch.update(
          doc(collection(db, `${basePath}/projectInventory`), existing.id),
          { quantity: existing.quantity + addQty },
        );
      } else {
        const newId = crypto.randomUUID();
        const newItem: ProjectInventoryItem = {
          id: newId,
          projectId: project.id,
          sourceItemId: selectedAddItem.id,
          modelNumber: selectedAddItem.modelNumber,
          name: selectedAddItem.name,
          category: selectedAddItem.category,
          manufactureName: selectedAddItem.manufactureName,
          manufacturePartNumber: selectedAddItem.manufacturePartNumber,
          imageUrl: selectedAddItem.imageUrl,
          ...(selectedAddItem.upc ? { upc: selectedAddItem.upc } : {}),
          ...(selectedAddItem.description ? { description: selectedAddItem.description } : {}),
          quantity: addQty,
          allocatedAt: nowIso,
          createdBy: userName,
        };
        batch.set(
          doc(collection(db, `${basePath}/projectInventory`), newId),
          newItem,
        );
      }

      batch.update(
        doc(collection(db, `${basePath}/inventory`), selectedAddItem.id),
        { amountInInventory: selectedAddItem.amountInInventory - addQty },
      );

      await batch.commit();
      await onLogActivity({
        action: "project_inventory_add",
        collection: "projectInventory",
        docId: project.id,
        summary: `Added ${addQty}× ${selectedAddItem.name} to project ${project.ipNumber}`,
      });
      setAddItemOpen(false);
    } finally {
      setSavingAdd(false);
    }
  };

  // ── Adjust qty ──────────────────────────────────────────────────────────────

  const openAdjust = (pi: ProjectInventoryItem) => {
    setAdjustItem(pi);
    setAdjustQty(pi.quantity);
  };

  const handleAdjustQty = async () => {
    if (!adjustItem || adjustQty < 1) return;
    const mainItem = adjustItem.sourceItemId
      ? parentBranchInventory.find((i) => i.id === adjustItem.sourceItemId)
      : null;
    if (mainItem) {
      const maxAllowed = adjustItem.quantity + mainItem.amountInInventory;
      if (adjustQty > maxAllowed) {
        onAlert(`Cannot exceed available quantity (${maxAllowed}).`);
        return;
      }
    }
    setSavingAdd(true);
    try {
      const delta = adjustQty - adjustItem.quantity;
      const batch = writeBatch(db);
      batch.update(
        doc(collection(db, `${basePath}/projectInventory`), adjustItem.id),
        { quantity: adjustQty },
      );
      if (adjustItem.sourceItemId && mainItem) {
        batch.update(
          doc(collection(db, `${basePath}/inventory`), adjustItem.sourceItemId),
          { amountInInventory: mainItem.amountInInventory - delta },
        );
      }
      await batch.commit();
      await onLogActivity({
        action: "project_inventory_adjust",
        collection: "projectInventory",
        docId: adjustItem.id,
        summary: `Adjusted ${adjustItem.name} qty from ${adjustItem.quantity} to ${adjustQty} in project ${project.ipNumber}`,
      });
      setAdjustItem(null);
    } finally {
      setSavingAdd(false);
    }
  };

  // ── Remove inventory item ───────────────────────────────────────────────────

  const handleRemoveItem = async (pi: ProjectInventoryItem) => {
    if (pi.sourceItemId) {
      const mainItem = parentBranchInventory.find((i) => i.id === pi.sourceItemId);
      const batch = writeBatch(db);
      batch.delete(doc(collection(db, `${basePath}/projectInventory`), pi.id));
      if (mainItem) {
        batch.update(
          doc(collection(db, `${basePath}/inventory`), pi.sourceItemId),
          { amountInInventory: mainItem.amountInInventory + pi.quantity },
        );
      }
      await batch.commit();
      await onLogActivity({
        action: "project_inventory_remove",
        collection: "projectInventory",
        docId: pi.id,
        summary: `Removed ${pi.name} from project ${project.ipNumber}, returned ${pi.quantity} to stock`,
      });
    } else {
      const confirmed = await onConfirm(
        `Remove ${pi.name} from this project? Qty will NOT be returned to main inventory.`,
      );
      if (!confirmed) return;
      await deleteDoc(doc(collection(db, `${basePath}/projectInventory`), pi.id));
      await onLogActivity({
        action: "project_inventory_remove",
        collection: "projectInventory",
        docId: pi.id,
        summary: `Removed ${pi.name} from project ${project.ipNumber} (written off)`,
      });
    }
  };

  // ── Create shipment ─────────────────────────────────────────────────────────

  const openCreateShipment = () => {
    setShipDestId("");
    setShipLabel("");
    setShipTracking("");
    setShipLines(
      projectInventory.map((pi) => ({
        projectItemId: pi.id,
        name: pi.name,
        modelNumber: pi.modelNumber,
        maxQty: pi.quantity,
        qty: 0,
        selected: false,
      })),
    );
    setShipmentOpen(true);
  };

  const toggleShipLine = (idx: number) => {
    setShipLines((prev) =>
      prev.map((l, i) =>
        i === idx ? { ...l, selected: !l.selected, qty: !l.selected ? 1 : 0 } : l,
      ),
    );
  };

  const updateShipLineQty = (idx: number, qty: number) => {
    setShipLines((prev) =>
      prev.map((l, i) => (i === idx ? { ...l, qty } : l)),
    );
  };

  const selectedShipLines = useMemo(
    () => shipLines.filter((l) => l.selected && l.qty > 0),
    [shipLines],
  );

  const canCreateShipment =
    shipDestId &&
    selectedShipLines.length > 0 &&
    selectedShipLines.every((l) => l.qty >= 1 && l.qty <= l.maxQty);

  const handleCreateShipment = async () => {
    if (!canCreateShipment) return;
    setSavingShipment(true);
    try {
      const userName = getUserName();
      const nowIso = new Date().toISOString();
      const id = crypto.randomUUID();
      const lines: ProjectShipmentLine[] = selectedShipLines.map((l) => ({
        projectItemId: l.projectItemId,
        name: l.name,
        modelNumber: l.modelNumber,
        quantity: l.qty,
      }));
      const shipment: ProjectShipment = {
        id,
        projectId: project.id,
        destinationBranchId: shipDestId,
        ...(shipLabel.trim() ? { label: shipLabel.trim() } : {}),
        ...(shipTracking.trim() ? { trackingNumber: shipTracking.trim() } : {}),
        status: "pending",
        lines,
        createdAt: nowIso,
        createdBy: userName,
      };
      await setDoc(
        doc(collection(db, `${basePath}/projectShipments`), id),
        shipment,
      );
      await onLogActivity({
        action: "project_shipment_created",
        collection: "projectShipments",
        docId: id,
        summary: `Created shipment for project ${project.ipNumber} to ${getWarehouseName(shipDestId)}`,
      });
      setShipmentOpen(false);
    } finally {
      setSavingShipment(false);
    }
  };

  // ── Mark shipped ────────────────────────────────────────────────────────────

  const handleMarkShipped = async (shipment: ProjectShipment) => {
    const confirmed = await onConfirm(
      "Mark this shipment as shipped? Inventory will be deducted from the project.",
    );
    if (!confirmed) return;
    setSavingShipment(true);
    try {
      const nowIso = new Date().toISOString();
      const batch = writeBatch(db);

      batch.update(
        doc(collection(db, `${basePath}/projectShipments`), shipment.id),
        { status: "shipped", shippedAt: nowIso },
      );

      for (const line of shipment.lines) {
        const pi = projectInventory.find((p) => p.id === line.projectItemId);
        if (!pi) continue;
        const remaining = pi.quantity - line.quantity;
        if (remaining <= 0) {
          batch.delete(
            doc(collection(db, `${basePath}/projectInventory`), pi.id),
          );
        } else {
          batch.update(
            doc(collection(db, `${basePath}/projectInventory`), pi.id),
            { quantity: remaining },
          );
        }

        // Upsert destination inventory
        const destItem = parentBranchInventory.find(
          (i) =>
            i.assignedBranchId === shipment.destinationBranchId &&
            (i.modelNumber === line.modelNumber ||
              (pi.upc && i.upc === pi.upc)),
        );
        if (destItem) {
          batch.update(
            doc(collection(db, `${basePath}/inventory`), destItem.id),
            { amountInInventory: destItem.amountInInventory + line.quantity },
          );
        } else {
          const newId = crypto.randomUUID();
          batch.set(doc(collection(db, `${basePath}/inventory`), newId), {
            id: newId,
            upc: pi.upc ?? "",
            modelNumber: pi.modelNumber,
            name: pi.name,
            category: pi.category,
            description: pi.description ?? "",
            manufactureName: pi.manufactureName,
            manufacturePartNumber: pi.manufacturePartNumber,
            imageUrl: pi.imageUrl,
            assignedBranchId: shipment.destinationBranchId,
            amountInInventory: line.quantity,
            numOnOrder: 0,
            minStockLevel: 0,
          });
        }
      }

      await batch.commit();
      await onLogActivity({
        action: "project_shipment_shipped",
        collection: "projectShipments",
        docId: shipment.id,
        summary: `Marked shipment shipped for project ${project.ipNumber} to ${getWarehouseName(shipment.destinationBranchId)}`,
      });
    } finally {
      setSavingShipment(false);
    }
  };

  // ── All POs combined ────────────────────────────────────────────────────────

  const allLinkedPOs = useMemo(
    () => [...purchaseOrders, ...poHistory],
    [purchaseOrders, poHistory],
  );

  // ── Render ──────────────────────────────────────────────────────────────────

  const tabBtn = (tab: Tab, label: string, count: number) => (
    <button
      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
        activeTab === tab
          ? "border-[#0ea5e9] text-[#0ea5e9]"
          : "border-transparent text-[var(--muted)] hover:text-[var(--fg)]"
      }`}
      onClick={() => setActiveTab(tab)}
    >
      {label}{" "}
      <span className="ml-1 text-xs bg-[var(--surface-1)] px-1.5 py-0.5 rounded-full">
        {count}
      </span>
    </button>
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            className="px-3 py-1.5 rounded-md border border-[var(--border)] text-sm text-[var(--fg)] hover:bg-[var(--surface-1)]"
            onClick={onBack}
          >
            ← Back
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-[var(--fg)] text-base">
                {project.ipNumber}
              </span>
              {project.projectNumber && (
                <span className="text-sm text-[var(--muted)]">
                  #{project.projectNumber}
                </span>
              )}
              <span className="text-sm text-[var(--fg)]">{project.projectName}</span>
            </div>
            {project.description && (
              <p className="text-xs text-[var(--muted)] mt-0.5">
                {project.description}
              </p>
            )}
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {parentBranch && (
                <span className="text-xs bg-[var(--surface-1)] border border-[var(--border)] px-2 py-0.5 rounded-full text-[var(--fg)]">
                  {parentBranch.shortCode || parentBranch.name}
                </span>
              )}
              <span className="text-xs text-[var(--muted)]">
                Created{" "}
                {project.createdAt
                  ? new Date(project.createdAt).toLocaleDateString()
                  : "—"}
                {project.createdBy && ` by ${project.createdBy}`}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            className="border border-[var(--input-border)] rounded-md px-3 py-1.5 text-sm bg-[var(--input-bg)] text-[var(--input-fg)] focus:outline-none focus:ring-2 focus:ring-[#0ea5e9]"
            value={project.status}
            disabled={savingStatus}
            onChange={(e) => handleStatusChange(e.target.value as ProjectStatus)}
          >
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="on-hold">On Hold</option>
            <option value="closed">Closed</option>
          </select>
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[project.status]}`}
          >
            {project.status.charAt(0).toUpperCase() +
              project.status.slice(1).replace("-", " ")}
          </span>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-[var(--border)]">
        {tabBtn("inventory", "Inventory", projectInventory.length)}
        {tabBtn("purchaseOrders", "Purchase Orders", allLinkedPOs.length)}
        {tabBtn("shipments", "Shipments", projectShipments.length)}
      </div>

      {/* Inventory tab */}
      {activeTab === "inventory" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[var(--fg)]">
              Project Inventory
            </h3>
            {project.status !== "closed" && (
              <button
                className="px-3 py-1.5 rounded-md bg-[#005691] text-sm text-white hover:bg-[#00426e]"
                onClick={openAddItem}
                disabled={savingAdd}
              >
                + Add from Stock
              </button>
            )}
          </div>
          {projectInventory.length === 0 ? (
            <p className="text-sm text-[var(--muted)] py-2">
              No inventory in this project yet.
            </p>
          ) : (
            <div className="border border-[var(--border)] rounded-md overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead className="bg-[var(--surface-1)]">
                  <tr>
                    <th className="px-3 py-2 text-left">Name</th>
                    <th className="px-3 py-2 text-left">Model #</th>
                    <th className="px-3 py-2 text-left">Category</th>
                    <th className="px-3 py-2 text-right">Qty</th>
                    <th className="px-3 py-2 text-left">Source</th>
                    <th className="px-3 py-2 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {projectInventory.map((pi) => (
                    <tr
                      key={pi.id}
                      className="border-t border-[var(--border)] odd:bg-[var(--row-odd)] even:bg-[var(--row-even)]"
                    >
                      <td className="px-3 py-2">{pi.name}</td>
                      <td className="px-3 py-2">{pi.modelNumber}</td>
                      <td className="px-3 py-2">{pi.category}</td>
                      <td className="px-3 py-2 text-right font-medium">
                        {pi.quantity}
                      </td>
                      <td className="px-3 py-2 text-[var(--muted)]">
                        {pi.sourceItemId
                          ? "Main stock"
                          : pi.sourcePurchaseOrderId
                            ? "PO"
                            : "—"}
                      </td>
                      <td className="px-3 py-2">
                        {project.status !== "closed" && (
                          <div className="flex gap-1">
                            <button
                              className="px-2 py-0.5 rounded border border-[var(--border)] text-[var(--fg)] hover:bg-[var(--surface-1)]"
                              onClick={() => openAdjust(pi)}
                              disabled={savingAdd}
                            >
                              Adjust
                            </button>
                            <button
                              className="px-2 py-0.5 rounded bg-[#dc2626] text-white hover:bg-[#b91c1c]"
                              onClick={() => handleRemoveItem(pi)}
                              disabled={savingAdd}
                            >
                              Remove
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Purchase Orders tab */}
      {activeTab === "purchaseOrders" && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-[var(--fg)]">
            Linked Purchase Orders
          </h3>
          {allLinkedPOs.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">
              No purchase orders linked to this project.
            </p>
          ) : (
            <div className="border border-[var(--border)] rounded-md overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead className="bg-[var(--surface-1)]">
                  <tr>
                    <th className="px-3 py-2 text-left">PO #</th>
                    <th className="px-3 py-2 text-left">IP #</th>
                    <th className="px-3 py-2 text-left">Vendor</th>
                    <th className="px-3 py-2 text-left">Status</th>
                    <th className="px-3 py-2 text-right"># Items</th>
                    <th className="px-3 py-2 text-left">Order Date</th>
                  </tr>
                </thead>
                <tbody>
                  {allLinkedPOs.map((po) => (
                    <tr
                      key={po.id}
                      className="border-t border-[var(--border)] odd:bg-[var(--row-odd)] even:bg-[var(--row-even)]"
                    >
                      <td className="px-3 py-2">{po.orderNumber}</td>
                      <td className="px-3 py-2">{po.ipNumber ?? "—"}</td>
                      <td className="px-3 py-2">{po.vendor}</td>
                      <td className="px-3 py-2">
                        <span
                          className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${
                            po.status === "pending"
                              ? "bg-amber-100 text-amber-800"
                              : po.status === "received"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {po.status.charAt(0).toUpperCase() + po.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right">{po.items.length}</td>
                      <td className="px-3 py-2">
                        {po.orderDate
                          ? new Date(po.orderDate).toLocaleDateString()
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Shipments tab */}
      {activeTab === "shipments" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[var(--fg)]">Shipments</h3>
            {project.status !== "closed" && (
              <button
                className="px-3 py-1.5 rounded-md bg-emerald-600 text-sm text-white hover:bg-emerald-700 disabled:opacity-50"
                onClick={openCreateShipment}
                disabled={savingShipment || projectInventory.length === 0}
              >
                + Create Shipment
              </button>
            )}
          </div>
          {projectShipments.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">No shipments yet.</p>
          ) : (
            <div className="border border-[var(--border)] rounded-md overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead className="bg-[var(--surface-1)]">
                  <tr>
                    <th className="px-3 py-2 text-left">Label</th>
                    <th className="px-3 py-2 text-left">Destination</th>
                    <th className="px-3 py-2 text-right">Units</th>
                    <th className="px-3 py-2 text-left">Tracking</th>
                    <th className="px-3 py-2 text-left">Status</th>
                    <th className="px-3 py-2 text-left">Created</th>
                    <th className="px-3 py-2 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {[...projectShipments]
                    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                    .map((s) => (
                      <React.Fragment key={s.id}>
                        <tr
                          className="border-t border-[var(--border)] odd:bg-[var(--row-odd)] even:bg-[var(--row-even)] cursor-pointer"
                          onClick={() =>
                            setExpandedShipmentId(
                              expandedShipmentId === s.id ? null : s.id,
                            )
                          }
                        >
                          <td className="px-3 py-2">{s.label ?? "—"}</td>
                          <td className="px-3 py-2">
                            {getWarehouseName(s.destinationBranchId)}
                          </td>
                          <td className="px-3 py-2 text-right">
                            {s.lines.reduce((sum, l) => sum + l.quantity, 0)}
                          </td>
                          <td className="px-3 py-2">
                            {s.trackingNumber ?? "—"}
                          </td>
                          <td className="px-3 py-2">
                            <span
                              className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${SHIPMENT_STATUS_COLORS[s.status]}`}
                            >
                              {s.status.charAt(0).toUpperCase() + s.status.slice(1)}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            {s.createdAt
                              ? new Date(s.createdAt).toLocaleDateString()
                              : "—"}
                          </td>
                          <td className="px-3 py-2">
                            {s.status === "pending" && (
                              <button
                                className="px-2 py-0.5 rounded bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMarkShipped(s);
                                }}
                                disabled={savingShipment}
                              >
                                Mark Shipped
                              </button>
                            )}
                          </td>
                        </tr>
                        {expandedShipmentId === s.id && (
                          <tr className="border-t border-[var(--border)] bg-[var(--surface-1)]">
                            <td colSpan={7} className="px-4 py-2">
                              <ul className="space-y-0.5 text-xs text-[var(--muted)]">
                                {s.lines.map((l) => (
                                  <li key={l.projectItemId}>
                                    {l.name} ({l.modelNumber}) × {l.quantity}
                                  </li>
                                ))}
                              </ul>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Add Item Modal */}
      <Modal
        open={addItemOpen}
        onClose={() => setAddItemOpen(false)}
        title="Add Item from Stock"
        maxWidthClass="max-w-lg"
        footer={
          <div className="flex justify-end gap-3">
            <button
              className="px-4 py-2 rounded-md bg-[#dc2626] text-sm text-white hover:bg-[#b91c1c]"
              onClick={() => setAddItemOpen(false)}
              disabled={savingAdd}
            >
              Cancel
            </button>
            <button
              className="px-4 py-2 rounded-md bg-[#005691] text-sm text-white hover:bg-[#00426e] disabled:opacity-50"
              onClick={handleAddItem}
              disabled={
                savingAdd ||
                !selectedAddItem ||
                addQty < 1 ||
                addQty > (selectedAddItem?.amountInInventory ?? 0)
              }
            >
              {savingAdd ? "Adding..." : "Add to Project"}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className={labelCls}>Search Items</label>
            <input
              className={inputCls}
              placeholder="Name, model #, category…"
              value={addSearch}
              onChange={(e) => {
                setAddSearch(e.target.value);
                setAddItemId("");
              }}
            />
          </div>
          <div className="border border-[var(--border)] rounded-md max-h-48 overflow-y-auto">
            {filteredAddItems.length === 0 ? (
              <p className="text-xs text-[var(--muted)] p-3">
                {availableItems.length === 0
                  ? "No items with available stock in this branch."
                  : "No matching items."}
              </p>
            ) : (
              filteredAddItems.map((item) => (
                <button
                  key={item.id}
                  className={`w-full text-left px-3 py-2 text-xs border-b border-[var(--border)] last:border-0 transition-colors ${
                    addItemId === item.id
                      ? "bg-[#0ea5e9]/10 text-[#0ea5e9]"
                      : "hover:bg-[var(--surface-1)] text-[var(--fg)]"
                  }`}
                  onClick={() => {
                    setAddItemId(item.id);
                    setAddQty(1);
                  }}
                >
                  <span className="font-medium">{item.name}</span>{" "}
                  <span className="text-[var(--muted)]">
                    {item.modelNumber} · {item.category} · {item.amountInInventory} avail.
                  </span>
                </button>
              ))
            )}
          </div>
          {selectedAddItem && (
            <div>
              <label className={labelCls}>
                Quantity (max {selectedAddItem.amountInInventory})
              </label>
              <input
                type="number"
                className={inputCls}
                min={1}
                max={selectedAddItem.amountInInventory}
                value={addQty}
                onChange={(e) => setAddQty(Number(e.target.value))}
              />
            </div>
          )}
        </div>
      </Modal>

      {/* Adjust Qty Modal */}
      <Modal
        open={adjustItem !== null}
        onClose={() => setAdjustItem(null)}
        title="Adjust Quantity"
        maxWidthClass="max-w-sm"
        footer={
          <div className="flex justify-end gap-3">
            <button
              className="px-4 py-2 rounded-md bg-[#dc2626] text-sm text-white hover:bg-[#b91c1c]"
              onClick={() => setAdjustItem(null)}
              disabled={savingAdd}
            >
              Cancel
            </button>
            <button
              className="px-4 py-2 rounded-md bg-[#0ea5e9] text-sm text-white hover:bg-[#0284c7] disabled:opacity-50"
              onClick={handleAdjustQty}
              disabled={savingAdd || adjustQty < 1}
            >
              {savingAdd ? "Saving..." : "Save"}
            </button>
          </div>
        }
      >
        {adjustItem && (
          <div className="space-y-3">
            <p className="text-sm text-[var(--fg)]">
              Adjusting: <span className="font-medium">{adjustItem.name}</span>
            </p>
            <div>
              <label className={labelCls}>New Quantity</label>
              <input
                type="number"
                className={inputCls}
                min={1}
                value={adjustQty}
                onChange={(e) => setAdjustQty(Number(e.target.value))}
              />
            </div>
            {adjustItem.sourceItemId && (
              <p className="text-xs text-[var(--muted)]">
                Current: {adjustItem.quantity}. Delta will be applied to main stock.
              </p>
            )}
          </div>
        )}
      </Modal>

      {/* Create Shipment Modal */}
      <Modal
        open={shipmentOpen}
        onClose={() => setShipmentOpen(false)}
        title="Create Shipment"
        maxWidthClass="max-w-2xl"
        footer={
          <div className="flex justify-end gap-3">
            <button
              className="px-4 py-2 rounded-md bg-[#dc2626] text-sm text-white hover:bg-[#b91c1c]"
              onClick={() => setShipmentOpen(false)}
              disabled={savingShipment}
            >
              Cancel
            </button>
            <button
              className="px-4 py-2 rounded-md bg-emerald-600 text-sm text-white hover:bg-emerald-700 disabled:opacity-50"
              onClick={handleCreateShipment}
              disabled={!canCreateShipment || savingShipment}
            >
              {savingShipment ? "Creating..." : "Create Shipment"}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>
                Destination Branch <span className="text-red-500">*</span>
              </label>
              <select
                className={inputCls}
                value={shipDestId}
                onChange={(e) => setShipDestId(e.target.value)}
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
              <label className={labelCls}>Label</label>
              <input
                className={inputCls}
                placeholder="Optional"
                value={shipLabel}
                onChange={(e) => setShipLabel(e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Tracking Number</label>
              <input
                className={inputCls}
                placeholder="Optional"
                value={shipTracking}
                onChange={(e) => setShipTracking(e.target.value)}
              />
            </div>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-[var(--fg)] mb-2">
              Items to Ship
            </h4>
            <div className="border border-[var(--border)] rounded-md overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead className="bg-[var(--surface-1)]">
                  <tr>
                    <th className="px-2 py-2 text-left">Include</th>
                    <th className="px-2 py-2 text-left">Item</th>
                    <th className="px-2 py-2 text-left">Model #</th>
                    <th className="px-2 py-2 text-right">Available</th>
                    <th className="px-2 py-2 text-right">Ship Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {shipLines.map((line, idx) => (
                    <tr
                      key={line.projectItemId}
                      className="border-t border-[var(--border)] odd:bg-[var(--row-odd)] even:bg-[var(--row-even)]"
                    >
                      <td className="px-2 py-2">
                        <input
                          type="checkbox"
                          checked={line.selected}
                          onChange={() => toggleShipLine(idx)}
                        />
                      </td>
                      <td className="px-2 py-2">{line.name}</td>
                      <td className="px-2 py-2">{line.modelNumber}</td>
                      <td className="px-2 py-2 text-right">{line.maxQty}</td>
                      <td className="px-2 py-2 text-right">
                        {line.selected && (
                          <input
                            type="number"
                            className={`${smInputCls} w-16 text-right`}
                            min={1}
                            max={line.maxQty}
                            value={line.qty}
                            onChange={(e) =>
                              updateShipLineQty(idx, Number(e.target.value))
                            }
                          />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};
