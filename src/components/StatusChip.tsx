import React from "react";
import type { StockStatus } from "../types";

const statusStyles: Record<StockStatus, string> = {
  healthy: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  low: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  negative: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

const statusLabels: Record<StockStatus, string> = {
  healthy: "Healthy",
  low: "Low",
  negative: "Negative",
};

interface StatusChipProps {
  status: StockStatus;
}

export const StatusChip: React.FC<StatusChipProps> = ({ status }) => (
  <span
    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyles[status]}`}
  >
    {statusLabels[status]}
  </span>
);
