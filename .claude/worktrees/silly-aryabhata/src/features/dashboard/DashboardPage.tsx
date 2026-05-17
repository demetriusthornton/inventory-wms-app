import React, { useMemo } from "react";
import type { InventoryItem, Warehouse, ActivityLog } from "../../types";
import { getStockStatus } from "../../utils/stockStatus";
import { DashboardPanel } from "./DashboardPanel";

type PageKey =
  | "dashboard"
  | "itemDetail"
  | "inventory"
  | "pos"
  | "poHistory"
  | "transfers"
  | "warehouses"
  | "activityHistory";

interface DashboardPageProps {
  inventory: InventoryItem[];
  warehouses: Warehouse[];
  activityHistory: ActivityLog[];
  onNavigateToItem: (item: InventoryItem) => void;
  onOpenAdjust: (item: InventoryItem) => void;
  onNavigateTo: (page: PageKey) => void;
  onOpenSearch: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  inventory,
  warehouses,
  activityHistory,
  onNavigateToItem,
  onOpenAdjust,
  onNavigateTo,
  onOpenSearch,
}) => {
  const warehouseMap = useMemo(() => {
    const m = new Map<string, Warehouse>();
    warehouses.forEach((w) => m.set(w.id, w));
    return m;
  }, [warehouses]);

  const lowStockItems = useMemo(
    () =>
      inventory
        .filter((i) => {
          const s = getStockStatus(i);
          return s === "low";
        })
        .sort((a, b) => a.amountInInventory - b.amountInInventory)
        .slice(0, 5),
    [inventory],
  );

  const negativeStockItems = useMemo(
    () => inventory.filter((i) => i.amountInInventory < 0).slice(0, 5),
    [inventory],
  );

  const recentAdjustments = useMemo(() => {
    return activityHistory
      .filter(
        (a) =>
          a.action === "inventory_adjust" ||
          a.action.toLowerCase().includes("adjust"),
      )
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      )
      .slice(0, 5);
  }, [activityHistory]);

  const frequentChanges = useMemo(() => {
    const counts = new Map<string, { count: number; itemId: string }>();
    activityHistory
      .filter(
        (a) =>
          a.action === "inventory_adjust" ||
          a.action.toLowerCase().includes("adjust"),
      )
      .forEach((a) => {
        const key = a.itemId || a.docId || "";
        if (!key) return;
        const prev = counts.get(key);
        counts.set(key, { count: (prev?.count || 0) + 1, itemId: key });
      });
    return [...counts.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map((c) => ({
        ...c,
        item: inventory.find((i) => i.id === c.itemId),
      }));
  }, [activityHistory, inventory]);

  const getWarehouseLabel = (branchId: string) =>
    warehouseMap.get(branchId)?.shortCode || branchId;

  return (
    <div className="space-y-6">
      {/* Top bar: Search + Quick Adjust */}
      <div className="flex items-center gap-4">
        <button
          onClick={onOpenSearch}
          className="flex-1 flex items-center gap-3 px-4 py-3 bg-[var(--card)] border border-[var(--border)] rounded-xl text-left hover:border-[var(--accent)] transition-colors"
        >
          <svg
            className="w-5 h-5 text-[var(--muted)]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <span className="text-sm text-[var(--muted)]">
            Search items by name or SKU...
          </span>
          <kbd className="ml-auto hidden sm:inline-flex items-center px-2 py-0.5 text-xs font-mono text-[var(--muted)] bg-[var(--surface-1)] border border-[var(--border)] rounded">
            ⌘K
          </kbd>
        </button>
        <button
          className="flex items-center gap-2 px-5 py-3 bg-[var(--accent)] text-white rounded-xl font-medium text-sm hover:opacity-90 shadow-sm"
          onClick={() => {
            // Open adjust modal with no pre-selected item (handled in App.tsx)
            onNavigateTo("inventory");
          }}
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
          Quick Adjust
        </button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          label="Total Items"
          value={inventory.length}
          color="var(--accent)"
        />
        <StatCard
          label="Low Stock"
          value={
            inventory.filter((i) => getStockStatus(i) === "low").length
          }
          color="#f59e0b"
        />
        <StatCard
          label="Negative Stock"
          value={negativeStockItems.length}
          color="#ef4444"
        />
        <StatCard
          label="Healthy"
          value={
            inventory.filter((i) => getStockStatus(i) === "healthy").length
          }
          color="#10b981"
        />
      </div>

      {/* Panel grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Low Stock */}
        <DashboardPanel
          title="Low Stock"
          accentBorder="#f59e0b"
          onViewAll={() => onNavigateTo("inventory")}
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          }
        >
          {lowStockItems.length === 0 ? (
            <p className="text-sm text-[var(--muted)] text-center py-4">
              No low stock items
            </p>
          ) : (
            <ul className="divide-y divide-[var(--border)]">
              {lowStockItems.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center gap-3 py-2 cursor-pointer hover:bg-[var(--surface-1)] -mx-4 px-4 transition-colors"
                  onClick={() => onNavigateToItem(item)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--fg)] truncate">
                      {item.name || item.modelNumber}
                    </p>
                    <p className="text-xs text-[var(--muted)]">
                      {getWarehouseLabel(item.assignedBranchId)} · Qty:{" "}
                      {item.amountInInventory} / Min: {item.minStockLevel}
                    </p>
                  </div>
                  <button
                    className="text-xs px-2 py-1 rounded border border-[var(--border)] text-[var(--accent)] hover:bg-[var(--surface-1)]"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenAdjust(item);
                    }}
                  >
                    ±
                  </button>
                </li>
              ))}
            </ul>
          )}
        </DashboardPanel>

        {/* Negative Stock */}
        <DashboardPanel
          title="Negative Stock Alerts"
          accentBorder="#ef4444"
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.618 5.984A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          }
        >
          {negativeStockItems.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-sm text-emerald-600 font-medium">All clear</p>
              <p className="text-xs text-[var(--muted)]">
                No items with negative stock
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-[var(--border)]">
              {negativeStockItems.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center gap-3 py-2 cursor-pointer hover:bg-[var(--surface-1)] -mx-4 px-4 transition-colors"
                  onClick={() => onNavigateToItem(item)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--fg)] truncate">
                      {item.name || item.modelNumber}
                    </p>
                    <p className="text-xs text-[var(--muted)]">
                      {getWarehouseLabel(item.assignedBranchId)}
                    </p>
                  </div>
                  <span className="font-mono text-sm font-bold text-red-600">
                    {item.amountInInventory}
                  </span>
                  <button
                    className="text-xs px-2 py-1 rounded border border-[var(--border)] text-[var(--accent)] hover:bg-[var(--surface-1)]"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenAdjust(item);
                    }}
                  >
                    ±
                  </button>
                </li>
              ))}
            </ul>
          )}
        </DashboardPanel>

        {/* Recently Adjusted */}
        <DashboardPanel
          title="Recently Adjusted"
          accentBorder="var(--accent)"
          onViewAll={() => onNavigateTo("activityHistory")}
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        >
          {recentAdjustments.length === 0 ? (
            <p className="text-sm text-[var(--muted)] text-center py-4">
              No recent adjustments
            </p>
          ) : (
            <ul className="divide-y divide-[var(--border)]">
              {recentAdjustments.map((log) => {
                const item = inventory.find(
                  (i) => i.id === (log.itemId || log.docId),
                );
                return (
                  <li
                    key={log.id}
                    className="py-2 cursor-pointer hover:bg-[var(--surface-1)] -mx-4 px-4 transition-colors"
                    onClick={() => item && onNavigateToItem(item)}
                  >
                    <p className="text-sm text-[var(--fg)]">
                      {item?.name || log.docId || "Unknown item"}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-[var(--muted)]">
                        {log.userName}
                      </span>
                      {log.delta != null && (
                        <span
                          className={`text-xs font-mono ${log.delta > 0 ? "text-emerald-600" : "text-red-600"}`}
                        >
                          {log.delta > 0 ? "+" : ""}
                          {log.delta}
                        </span>
                      )}
                      <span className="text-xs text-[var(--muted)]">
                        {new Date(log.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </DashboardPanel>

        {/* Frequent Changes */}
        <DashboardPanel
          title="Frequent Changes"
          accentBorder="#8b5cf6"
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          }
        >
          {frequentChanges.length === 0 ? (
            <p className="text-sm text-[var(--muted)] text-center py-4">
              No frequent changes yet
            </p>
          ) : (
            <ul className="divide-y divide-[var(--border)]">
              {frequentChanges.map((fc) => (
                <li
                  key={fc.itemId}
                  className="flex items-center justify-between py-2 cursor-pointer hover:bg-[var(--surface-1)] -mx-4 px-4 transition-colors"
                  onClick={() => fc.item && onNavigateToItem(fc.item)}
                >
                  <p className="text-sm text-[var(--fg)] truncate">
                    {fc.item?.name || fc.item?.modelNumber || fc.itemId}
                  </p>
                  <span className="text-xs text-[var(--muted)] bg-[var(--surface-1)] px-2 py-0.5 rounded-full">
                    {fc.count} changes
                  </span>
                </li>
              ))}
            </ul>
          )}
        </DashboardPanel>
      </div>

      {/* Quick Actions */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
        <h3 className="text-sm font-semibold text-[var(--fg)] mb-3">
          Quick Actions
        </h3>
        <div className="flex flex-wrap gap-2">
          <QuickAction
            label="Inventory"
            onClick={() => onNavigateTo("inventory")}
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            }
          />
          <QuickAction
            label="Purchase Orders"
            onClick={() => onNavigateTo("pos")}
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            }
          />
          <QuickAction
            label="Transfers"
            onClick={() => onNavigateTo("transfers")}
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            }
          />
          <QuickAction
            label="Warehouses"
            onClick={() => onNavigateTo("warehouses")}
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            }
          />
          <QuickAction
            label="Activity Log"
            onClick={() => onNavigateTo("activityHistory")}
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            }
          />
        </div>
      </div>
    </div>
  );
};

// Internal sub-components

const StatCard: React.FC<{
  label: string;
  value: number;
  color: string;
}> = ({ label, value, color }) => (
  <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 text-center">
    <p className="text-2xl font-bold font-mono" style={{ color }}>
      {value}
    </p>
    <p className="text-xs text-[var(--muted)] mt-1">{label}</p>
  </div>
);

const QuickAction: React.FC<{
  label: string;
  onClick: () => void;
  icon: React.ReactNode;
}> = ({ label, onClick, icon }) => (
  <button
    className="flex items-center gap-2 px-4 py-2 bg-[var(--surface-1)] border border-[var(--border)] rounded-lg text-sm text-[var(--fg)] hover:bg-[var(--surface-2)] transition-colors"
    onClick={onClick}
  >
    {icon}
    {label}
  </button>
);
