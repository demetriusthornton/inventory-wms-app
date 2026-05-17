import React from "react";
import type { ReactNode } from "react";

interface DashboardPanelProps {
  title: string;
  icon?: ReactNode;
  viewAllLabel?: string;
  onViewAll?: () => void;
  children: ReactNode;
  className?: string;
  accentBorder?: string;
}

export const DashboardPanel: React.FC<DashboardPanelProps> = ({
  title,
  icon,
  viewAllLabel,
  onViewAll,
  children,
  className = "",
  accentBorder,
}) => (
  <div
    className={`bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-sm overflow-hidden ${className}`}
    style={accentBorder ? { borderTopColor: accentBorder, borderTopWidth: 3 } : undefined}
  >
    <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
      <div className="flex items-center gap-2">
        {icon && <span className="text-[var(--muted)]">{icon}</span>}
        <h3 className="text-sm font-semibold text-[var(--fg)]">{title}</h3>
      </div>
      {onViewAll && (
        <button
          className="text-xs text-[var(--accent)] hover:underline"
          onClick={onViewAll}
        >
          {viewAllLabel || "View All"}
        </button>
      )}
    </div>
    <div className="p-4">{children}</div>
  </div>
);
