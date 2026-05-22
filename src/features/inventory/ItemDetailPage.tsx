import React, { useState, useMemo } from "react";
import type { InventoryItem, Warehouse, ActivityLog } from "../../types";
import { getStockStatus } from "../../utils/stockStatus";
import { StatusChip } from "../../components/StatusChip";
import { sanitizeImageUrl } from "../../utils/helpers";

interface ItemDetailPageProps {
  item: InventoryItem;
  warehouse: Warehouse | undefined;
  activityHistory: ActivityLog[];
  onBack: () => void;
  onOpenAdjust: (item: InventoryItem) => void;
  onBuildTransfer?: () => void;
  onRequestQuote?: () => void;
}

type TabKey = "overview" | "activity" | "metadata";

export const ItemDetailPage: React.FC<ItemDetailPageProps> = ({
  item,
  warehouse,
  activityHistory,
  onBack,
  onOpenAdjust,
  onBuildTransfer,
  onRequestQuote,
}) => {
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const status = getStockStatus(item);

  const itemActivity = useMemo(() => {
    return activityHistory
      .filter(
        (log) =>
          log.itemId === item.id ||
          log.docId === item.id,
      )
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      );
  }, [activityHistory, item.id]);

  const quantityColor =
    item.amountInInventory < 0
      ? "text-red-600"
      : item.amountInInventory === 0
        ? "text-amber-600"
        : "text-emerald-600";

  return (
    <div className="space-y-6">
      {/* Back button */}
      <button
        className="flex items-center gap-1 text-sm text-[var(--accent)] hover:underline"
        onClick={onBack}
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19l-7-7 7-7"
          />
        </svg>
        Back to Inventory
      </button>

      {/* Item header card */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6">
        <div className="flex flex-col sm:flex-row items-start gap-6">
          {/* Image */}
          <div className="shrink-0">
            {item.imageUrl ? (
              <img
                src={sanitizeImageUrl(item.imageUrl)}
                alt={item.name}
                className="w-24 h-24 rounded-lg object-cover border border-[var(--border)]"
              />
            ) : (
              <div className="w-24 h-24 rounded-lg bg-[var(--surface-1)] flex items-center justify-center text-2xl text-[var(--muted)]">
                ?
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-[var(--fg)]">
              {item.name || item.modelNumber}
            </h2>
            <p className="text-sm text-[var(--muted)] mt-1">
              SKU: {item.modelNumber}
              {item.upc && ` · UPC: ${item.upc}`}
            </p>
            <div className="flex flex-wrap items-center gap-2 mt-3">
              {warehouse && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--surface-1)] text-[var(--fg)] border border-[var(--border)]">
                  {warehouse.shortCode} — {warehouse.name}
                </span>
              )}
              <StatusChip status={status} />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-2 shrink-0">
            <button
              className="flex items-center gap-2 px-5 py-2.5 bg-[var(--accent)] text-white rounded-lg font-medium text-sm hover:opacity-90 shadow-sm"
              onClick={() => onOpenAdjust(item)}
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
              Adjust Quantity
            </button>
            {onBuildTransfer && (
              <button
                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-lg font-medium text-sm hover:bg-emerald-700 shadow-sm"
                onClick={onBuildTransfer}
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                  />
                </svg>
                Build Transfer
              </button>
            )}
            {onRequestQuote && (
              <button
                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-lg font-medium text-sm hover:bg-indigo-700 shadow-sm"
                onClick={onRequestQuote}
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
                Request Quote
              </button>
            )}
          </div>
        </div>

        {/* Hero quantity block */}
        <div className="mt-6 bg-[var(--surface-1)] rounded-lg p-6 text-center">
          <p className="text-xs uppercase tracking-wider text-[var(--muted)] mb-2">
            Current Quantity
          </p>
          <p className={`font-mono text-5xl font-bold ${quantityColor}`}>
            {item.amountInInventory}
          </p>
          <p className="text-xs text-[var(--muted)] mt-2">
            Min Stock Level: {item.minStockLevel}
            {item.numOnOrder > 0 && ` · On Order: ${item.numOnOrder}`}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden">
        <div className="flex border-b border-[var(--border)]">
          {(
            [
              { key: "overview", label: "Overview" },
              { key: "activity", label: "Activity Timeline" },
              { key: "metadata", label: "Metadata" },
            ] as { key: TabKey; label: string }[]
          ).map((tab) => (
            <button
              key={tab.key}
              className={`px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? "text-[var(--accent)] border-b-2 border-[var(--accent)]"
                  : "text-[var(--muted)] hover:text-[var(--fg)]"
              }`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {activeTab === "overview" && (
            <OverviewTab item={item} warehouse={warehouse} />
          )}
          {activeTab === "activity" && (
            <ActivityTab activity={itemActivity} />
          )}
          {activeTab === "metadata" && <MetadataTab item={item} />}
        </div>
      </div>
    </div>
  );
};

// Tab sub-components

const OverviewTab: React.FC<{
  item: InventoryItem;
  warehouse: Warehouse | undefined;
}> = ({ item, warehouse }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
    <FieldPair label="Category" value={item.category || "—"} />
    <FieldPair
      label="Tags"
      value={item.tags?.join(", ") || "—"}
    />
    <FieldPair label="Manufacturer" value={item.manufactureName || "—"} />
    <FieldPair
      label="Manufacturer Part #"
      value={item.manufacturePartNumber || "—"}
    />
    <FieldPair label="UPC" value={item.upc || "—"} />
    <FieldPair
      label="Location"
      value={
        warehouse
          ? `${warehouse.shortCode} — ${warehouse.name}, ${warehouse.city}, ${warehouse.state}`
          : item.assignedBranchId
      }
    />
    {item.description && (
      <div className="sm:col-span-2">
        <FieldPair label="Description" value={item.description} />
      </div>
    )}
  </div>
);

const ActivityTab: React.FC<{ activity: ActivityLog[] }> = ({ activity }) => {
  if (activity.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-[var(--muted)]">
          No activity recorded for this item yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {activity.map((log, idx) => {
        const isAdjust =
          log.action === "inventory_adjust" ||
          log.action.toLowerCase().includes("adjust");
        const dotColor =
          isAdjust && log.delta != null
            ? log.delta > 0
              ? "bg-emerald-500"
              : "bg-red-500"
            : "bg-[var(--accent)]";

        return (
          <div key={log.id} className="flex gap-4">
            {/* Timeline line + dot */}
            <div className="flex flex-col items-center">
              <div className={`w-3 h-3 rounded-full ${dotColor} shrink-0 mt-1`} />
              {idx < activity.length - 1 && (
                <div className="w-px flex-1 bg-[var(--border)]" />
              )}
            </div>

            {/* Content */}
            <div className="pb-6 flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-[var(--fg)]">
                  {log.action}
                </span>
                {log.delta != null && (
                  <span
                    className={`text-xs font-mono font-bold ${log.delta > 0 ? "text-emerald-600" : "text-red-600"}`}
                  >
                    {log.delta > 0 ? "+" : ""}
                    {log.delta}
                  </span>
                )}
                {log.resultingQuantity != null && (
                  <span className="text-xs text-[var(--muted)]">
                    → {log.resultingQuantity}
                  </span>
                )}
              </div>
              <p className="text-xs text-[var(--muted)] mt-0.5">
                {log.userName} · {new Date(log.timestamp).toLocaleString()}
              </p>
              {log.reason && (
                <p className="text-xs text-[var(--muted)] mt-1 italic">
                  "{log.reason}"
                </p>
              )}
              {!log.delta && log.summary && (
                <p className="text-xs text-[var(--muted)] mt-0.5">
                  {log.summary}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const MetadataTab: React.FC<{ item: InventoryItem }> = ({ item }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
    <FieldPair label="Item ID" value={item.id} />
    <FieldPair label="Model Number" value={item.modelNumber} />
    <FieldPair label="UPC" value={item.upc || "—"} />
    <FieldPair label="Category" value={item.category || "—"} />
    <FieldPair label="Manufacturer" value={item.manufactureName || "—"} />
    <FieldPair
      label="Manufacturer Part Number"
      value={item.manufacturePartNumber || "—"}
    />
    <FieldPair label="Assigned Branch ID" value={item.assignedBranchId} />
    <FieldPair
      label="Amount in Inventory"
      value={String(item.amountInInventory)}
    />
    <FieldPair label="Min Stock Level" value={String(item.minStockLevel)} />
    <FieldPair label="On Order" value={String(item.numOnOrder)} />
    <FieldPair label="Image URL" value={item.imageUrl || "—"} />
    {item.tags && item.tags.length > 0 && (
      <FieldPair label="Tags" value={item.tags.join(", ")} />
    )}
    {item.description && (
      <div className="sm:col-span-2">
        <FieldPair label="Description" value={item.description} />
      </div>
    )}
  </div>
);

const FieldPair: React.FC<{ label: string; value: string }> = ({
  label,
  value,
}) => (
  <div>
    <dt className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider">
      {label}
    </dt>
    <dd className="mt-1 text-sm text-[var(--fg)] break-all">{value}</dd>
  </div>
);
