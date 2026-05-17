import React from "react";
import { DataTable } from "../../components/DataTable";
import type { ActivityLog, Transfer, TransferStatus } from "../../types";

interface Option {
  label: string;
  value: string;
}

interface TransfersTableProps {
  transfers: Transfer[];
  transferStatusOptions: Option[];
  transferSourceOptions: Option[];
  transferDestinationOptions: Option[];
  getWarehouseLabel: (id: string) => string;
  activityHistory: ActivityLog[];
  getUserName: () => string;
  onTrackTransfer: (transfer: Transfer) => void;
  onEditTracking: (transfer: Transfer) => void;
  onUpdateStatus: (transfer: Transfer, status: TransferStatus) => void;
  onInitiateTransfer: () => void;
}

export const TransfersTable: React.FC<TransfersTableProps> = ({
  transfers,
  transferStatusOptions,
  transferSourceOptions,
  transferDestinationOptions,
  getWarehouseLabel,
  activityHistory,
  getUserName,
  onTrackTransfer,
  onEditTracking,
  onUpdateStatus,
  onInitiateTransfer,
}) => {
  return (
    <DataTable<Transfer>
      title="Transfers"
      data={transfers}
      searchFields={[
        "transferId",
        "label",
        "trackingNumber",
        "sourceBranchId",
        "destinationBranchId",
        "status",
      ]}
      filterFields={[
        {
          key: "status",
          label: "Status",
          type: "select",
          options: transferStatusOptions,
        },
        {
          key: "sourceBranchId",
          label: "Source",
          type: "select",
          options: transferSourceOptions,
        },
        {
          key: "destinationBranchId",
          label: "Destination",
          type: "select",
          options: transferDestinationOptions,
        },
      ]}
      getRowId={(row) => row.id}
      columns={[
        { key: "transferId", label: "Transfer ID" },
        { key: "label", label: "Order Label" },
        { key: "trackingNumber", label: "Tracking #" },
        {
          key: "itemModelNumber",
          label: "First Model #",
          render: (row) => row.lines?.[0]?.itemModelNumber ?? "",
        },
        {
          key: "itemName",
          label: "First Item Name",
          render: (row) => row.lines?.[0]?.itemName ?? "",
        },
        {
          key: "sourceBranchId",
          label: "Source",
          render: (row) => getWarehouseLabel(row.sourceBranchId),
        },
        {
          key: "destinationBranchId",
          label: "Destination",
          render: (row) => getWarehouseLabel(row.destinationBranchId),
        },
        {
          key: "quantity",
          label: "Total Qty",
          render: (row) =>
            row.lines?.reduce((sum, line) => sum + line.quantity, 0) ?? 0,
        },
        {
          key: "status",
          label: "Status",
        },
      ]}
      actions={(row) => (
        <div className="flex gap-1 justify-end">
          <button
            className="btn-outline px-2 py-1 rounded-md border border-slate-300 text-xs hover:bg-slate-50"
            onClick={(e) => {
              e.stopPropagation();
              onEditTracking(row);
            }}
          >
            Edit Tracking
          </button>
          <button
            className="btn-outline px-2 py-1 rounded-md border border-slate-300 text-xs hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={(e) => {
              e.stopPropagation();
              onTrackTransfer(row);
            }}
            disabled={!row.trackingNumber}
          >
            Track
          </button>
          {row.status === "pending" && (
            <button
              className="px-2 py-1 rounded-md bg-[#005691] text-xs text-white hover:bg-[#00426e]"
              onClick={(e) => {
                e.stopPropagation();
                onUpdateStatus(row, "in-transit");
              }}
            >
              In-Transit
            </button>
          )}
          {(row.status === "pending" || row.status === "in-transit") && (
            <button
              className="px-2 py-1 rounded-md bg-emerald-600 text-xs text-white hover:bg-emerald-700"
              onClick={(e) => {
                e.stopPropagation();
                onUpdateStatus(row, "completed");
              }}
            >
              Completed
            </button>
          )}
          {(row.status === "pending" || row.status === "in-transit") && (
            <button
              className="px-2 py-1 rounded-md bg-[#FF6347] text-xs text-white hover:bg-[#e4573d]"
              onClick={(e) => {
                e.stopPropagation();
                onUpdateStatus(row, "cancelled");
              }}
            >
              Cancel
            </button>
          )}
        </div>
      )}
      expandable
      renderExpandedRow={(row) => {
        const entries = activityHistory
          .filter(
            (entry) => entry.collection === "moves" && entry.docId === row.id
          )
          .sort((a, b) => (b.timestamp || "").localeCompare(a.timestamp || ""));
        return (
          <div className="bg-slate-50 rounded-md p-3 max-h-48 overflow-y-auto space-y-2">
            {entries.length === 0 && (
              <p className="text-xs text-slate-500">No activity yet.</p>
            )}
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="text-xs text-slate-700 border-b border-slate-200 last:border-0 pb-2 last:pb-0"
              >
                <div className="font-semibold text-slate-800">
                  {entry.action}
                </div>
                <div className="text-slate-600">
                  {(entry.userName || getUserName()) ?? "Unknown"} ·{" "}
                  {entry.timestamp
                    ? new Date(entry.timestamp).toLocaleString()
                    : "—"}
                </div>
                {entry.summary && (
                  <div className="text-slate-600">{entry.summary}</div>
                )}
              </div>
            ))}
          </div>
        );
      }}
    >
      <div className="flex gap-2">
        <button
          className="px-3 py-2 rounded-md bg-[#005691] text-white text-xs sm:text-sm hover:bg-[#00426e]"
          onClick={onInitiateTransfer}
        >
          Initiate New Transfer
        </button>
      </div>
    </DataTable>
  );
};
