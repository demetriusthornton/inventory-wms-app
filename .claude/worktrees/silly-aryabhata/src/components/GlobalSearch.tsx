import React, { useState, useRef, useEffect, useMemo } from "react";
import type { InventoryItem, Warehouse } from "../types";
import { getStockStatus } from "../utils/stockStatus";
import { StatusChip } from "./StatusChip";

interface GlobalSearchProps {
  open: boolean;
  items: InventoryItem[];
  warehouses: Warehouse[];
  onSelectItem: (item: InventoryItem) => void;
  onClose: () => void;
}

export const GlobalSearch: React.FC<GlobalSearchProps> = ({
  open,
  items,
  warehouses,
  onSelectItem,
  onClose,
}) => {
  const [query, setQuery] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIdx(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return items
      .filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          item.modelNumber.toLowerCase().includes(q) ||
          (item.upc && item.upc.toLowerCase().includes(q)),
      )
      .slice(0, 10);
  }, [query, items]);

  useEffect(() => {
    setSelectedIdx(0);
  }, [results]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIdx((prev) => Math.min(prev + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIdx((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && results[selectedIdx]) {
      onSelectItem(results[selectedIdx]);
    }
  };

  const getWarehouseName = (branchId: string) =>
    warehouses.find((w) => w.id === branchId)?.shortCode || branchId;

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-2xl w-full max-w-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)]">
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
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent text-[var(--fg)] text-base outline-none placeholder-[var(--muted)] border-none"
            placeholder="Search items by name, SKU, or UPC..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 text-xs font-mono text-[var(--muted)] bg-[var(--surface-1)] border border-[var(--border)] rounded">
            ESC
          </kbd>
        </div>

        {query.trim() && (
          <div className="max-h-80 overflow-y-auto">
            {results.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-[var(--muted)]">
                No items found for "{query}"
              </div>
            ) : (
              <ul>
                {results.map((item, idx) => (
                  <li
                    key={item.id}
                    className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${
                      idx === selectedIdx
                        ? "bg-[var(--accent)]/10"
                        : "hover:bg-[var(--surface-1)]"
                    }`}
                    onClick={() => onSelectItem(item)}
                    onMouseEnter={() => setSelectedIdx(idx)}
                  >
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt=""
                        className="w-8 h-8 rounded object-cover border border-[var(--border)]"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded bg-[var(--surface-1)] flex items-center justify-center text-xs text-[var(--muted)]">
                        ?
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--fg)] truncate">
                        {item.name || item.modelNumber}
                      </p>
                      <p className="text-xs text-[var(--muted)]">
                        SKU: {item.modelNumber}
                        {item.upc && ` · UPC: ${item.upc}`}
                      </p>
                    </div>
                    <span className="text-xs text-[var(--muted)] bg-[var(--surface-1)] px-2 py-0.5 rounded">
                      {getWarehouseName(item.assignedBranchId)}
                    </span>
                    <StatusChip status={getStockStatus(item)} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {!query.trim() && (
          <div className="px-4 py-6 text-center text-sm text-[var(--muted)]">
            Start typing to search inventory items...
          </div>
        )}
      </div>
    </div>
  );
};
