import React, { useMemo, useState, useCallback } from "react";
import { DataTable } from "../../components/DataTable";
import type { InventoryItem, Warehouse, ActivityLog } from "../../types";

interface ActivityHistoryPageProps {
  activityHistory: ActivityLog[];
  inventory: InventoryItem[];
  warehouses: Warehouse[];
  onNavigateToItem: (item: InventoryItem) => void;
}

export const ActivityHistoryPage: React.FC<ActivityHistoryPageProps> = ({
  activityHistory,
  inventory,
  warehouses,
  onNavigateToItem,
}) => {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const warehouseMap = useMemo(() => {
    const m = new Map<string, Warehouse>();
    warehouses.forEach((w) => m.set(w.id, w));
    return m;
  }, [warehouses]);

  const inventoryMap = useMemo(() => {
    const m = new Map<string, InventoryItem>();
    inventory.forEach((i) => m.set(i.id, i));
    return m;
  }, [inventory]);

  // Pre-filter by date range before passing to DataTable
  const dateFilteredData = useMemo(() => {
    let data = [...activityHistory];
    if (dateFrom) {
      const from = new Date(dateFrom).getTime();
      data = data.filter((row) => new Date(row.timestamp).getTime() >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo + "T23:59:59").getTime();
      data = data.filter((row) => new Date(row.timestamp).getTime() <= to);
    }
    return data;
  }, [activityHistory, dateFrom, dateTo]);

  // Build filter options
  const filterOptions = useMemo(() => {
    const actions = new Set<string>();
    const users = new Set<string>();
    activityHistory.forEach((log) => {
      if (log.action) actions.add(log.action);
      if (log.userName) users.add(log.userName);
    });
    return {
      actions: [...actions].sort().map((a) => ({ label: a, value: a })),
      users: [...users].sort().map((u) => ({ label: u, value: u })),
    };
  }, [activityHistory]);

  const handleCsvExport = useCallback(() => {
    const headers = [
      "Date",
      "Item",
      "User",
      "Action",
      "Delta",
      "Result",
      "Reason",
      "Location",
    ];
    const rows = dateFilteredData.map((log) => {
      const item = inventoryMap.get(log.itemId || log.docId || "");
      const wh = warehouseMap.get(log.locationId || "");
      return [
        log.timestamp ? new Date(log.timestamp).toLocaleString() : "",
        item?.name || item?.modelNumber || log.docId || "",
        log.userName || "",
        log.action || "",
        log.delta != null ? String(log.delta) : "",
        log.resultingQuantity != null ? String(log.resultingQuantity) : "",
        log.reason || "",
        wh?.shortCode || log.locationId || "",
      ];
    });

    const csvContent = [
      headers.join(","),
      ...rows.map((r) =>
        r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","),
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `activity-log-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [dateFilteredData, inventoryMap, warehouseMap]);

  return (
    <div className="space-y-4">
      {/* Date range filters + export */}
      <div className="flex flex-wrap items-end gap-3 bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
        <div>
          <label className="block text-xs font-medium text-[var(--muted)] mb-1">
            From
          </label>
          <input
            type="date"
            className="rounded-md border border-[var(--border)] bg-[var(--input-bg)] text-[var(--input-fg)] px-3 py-1.5 text-sm"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-[var(--muted)] mb-1">
            To
          </label>
          <input
            type="date"
            className="rounded-md border border-[var(--border)] bg-[var(--input-bg)] text-[var(--input-fg)] px-3 py-1.5 text-sm"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </div>
        {(dateFrom || dateTo) && (
          <button
            className="text-xs text-[var(--accent)] hover:underline py-1.5"
            onClick={() => {
              setDateFrom("");
              setDateTo("");
            }}
          >
            Clear dates
          </button>
        )}
        <div className="flex-1" />
        <button
          className="flex items-center gap-2 px-4 py-1.5 bg-[var(--surface-1)] border border-[var(--border)] rounded-md text-sm text-[var(--fg)] hover:bg-[var(--surface-2)] transition-colors"
          onClick={handleCsvExport}
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
              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          Export CSV
        </button>
      </div>

      <DataTable<ActivityLog>
        title="Activity History"
        data={dateFilteredData}
        defaultSortKey="timestamp"
        defaultSortDir="desc"
        searchFields={[
          "summary",
          "action",
          "userName",
          "collection",
          "docId",
          "reason",
        ]}
        filterFields={[
          {
            key: "action",
            label: "Action",
            type: "select",
            options: filterOptions.actions,
          },
          {
            key: "userName",
            label: "User",
            type: "select",
            options: filterOptions.users,
          },
        ]}
        columns={[
          {
            key: "timestamp",
            label: "Date",
            render: (row) =>
              row.timestamp
                ? new Date(row.timestamp).toLocaleString()
                : "—",
            sortFn: (a, b) =>
              (a.timestamp || "").localeCompare(b.timestamp || ""),
          },
          {
            key: "item",
            label: "Item",
            render: (row) => {
              const item = inventoryMap.get(
                row.itemId || row.docId || "",
              );
              if (!item) return row.docId || "—";
              return (
                <button
                  className="text-[var(--accent)] hover:underline text-left"
                  onClick={(e) => {
                    e.stopPropagation();
                    onNavigateToItem(item);
                  }}
                >
                  {item.name || item.modelNumber}
                </button>
              );
            },
          },
          { key: "userName", label: "User" },
          {
            key: "action",
            label: "Action",
            render: (row) => (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--surface-1)] text-[var(--fg)]">
                {row.action}
              </span>
            ),
          },
          {
            key: "delta",
            label: "Delta",
            render: (row) => {
              if (row.delta == null) return "—";
              return (
                <span
                  className={`font-mono font-bold ${row.delta > 0 ? "text-emerald-600" : "text-red-600"}`}
                >
                  {row.delta > 0 ? "+" : ""}
                  {row.delta}
                </span>
              );
            },
          },
          {
            key: "resultingQuantity",
            label: "Result",
            render: (row) =>
              row.resultingQuantity != null
                ? String(row.resultingQuantity)
                : "—",
          },
          {
            key: "reason",
            label: "Reason",
            render: (row) => row.reason || "—",
          },
          {
            key: "location",
            label: "Location",
            render: (row) => {
              if (!row.locationId) return "—";
              const wh = warehouseMap.get(row.locationId);
              return wh?.shortCode || row.locationId;
            },
          },
        ]}
        getRowId={(row) => row.id}
      />
    </div>
  );
};
