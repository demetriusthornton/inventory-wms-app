import React, { useMemo, useState } from "react";
import type { ReactNode } from "react";

export interface DataTableColumn<T> {
  key: string;
  label: string;
  render?: (row: T) => ReactNode;
  sortFn?: (a: T, b: T) => number;
}

export interface DataTableFilterField<T> {
  key: keyof T;
  label: string;
  type: "text" | "select";
  options?: { label: string; value: string }[];
}

export interface DataTableProps<T> {
  title: string;
  data: T[];
  columns: DataTableColumn<T>[];
  searchFields: (keyof T)[];
  filterFields?: DataTableFilterField<T>[];
  getRowId: (row: T) => string;
  actions?: (row: T) => ReactNode;
  children?: ReactNode;
  expandable?: boolean;
  renderExpandedRow?: (row: T) => ReactNode;
}

export function DataTable<T extends Record<string, any>>({
  title,
  data,
  columns,
  searchFields,
  filterFields,
  getRowId,
  actions,
  children,
  expandable,
  renderExpandedRow,
}: DataTableProps<T>) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  const handleSort = (key: string) => {
    setSortKey((prev) => {
      if (prev === key) {
        setSortDir((prevDir) => (prevDir === "asc" ? "desc" : "asc"));
        return prev;
      }
      setSortDir("asc");
      return key;
    });
  };

  const filteredData = useMemo(() => {
    let rows = [...data];

    if (search.trim()) {
      const searchLower = search.toLowerCase();
      rows = rows.filter((row) =>
        searchFields.some((field) => {
          const value = row[field];
          if (value === undefined || value === null) return false;
          return String(value).toLowerCase().includes(searchLower);
        })
      );
    }

    if (filterFields && filterFields.length > 0) {
      rows = rows.filter((row) =>
        filterFields.every((field) => {
          const value = filters[String(field.key)];
          if (!value) return true;
          const rowVal = row[field.key];
          return String(rowVal) === value;
        })
      );
    }

    if (sortKey) {
      const col = columns.find((c) => c.key === sortKey);
      rows.sort((a, b) => {
        if (col?.sortFn) {
          const result = col.sortFn(a, b);
          return sortDir === "asc" ? result : -result;
        }
        const av = a[sortKey];
        const bv = b[sortKey];
        if (av === undefined && bv === undefined) return 0;
        if (av === undefined) return sortDir === "asc" ? -1 : 1;
        if (bv === undefined) return sortDir === "asc" ? 1 : -1;
        if (av < bv) return sortDir === "asc" ? -1 : 1;
        if (av > bv) return sortDir === "asc" ? 1 : -1;
        return 0;
      });
    }

    return rows;
  }, [
    data,
    search,
    searchFields,
    filters,
    filterFields,
    sortKey,
    sortDir,
    columns,
  ]);

  return (
    <div className="bg-[var(--card)] rounded-xl shadow-sm border border-[var(--border)]">
      <div className="px-4 sm:px-6 py-4 border-b border-[var(--border)] flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-[var(--fg)]">{title}</h2>
          {children && <div className="flex flex-wrap gap-2">{children}</div>}
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
          <input
            className="border border-[var(--input-border)] rounded-md px-3 py-1.5 text-sm bg-[var(--input-bg)] text-[var(--input-fg)] placeholder:text-[var(--input-placeholder)] focus:outline-none focus:ring-2 focus:ring-[#0ea5e9] focus:border-[#0ea5e9]"
            placeholder="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {filterFields && filterFields.length > 0 && (
            <div className="flex flex-wrap gap-2 sm:justify-end">
              {filterFields.map((field) => (
                <select
                  key={String(field.key)}
                  className="border border-[var(--input-border)] rounded-md px-2 py-1 text-xs bg-[var(--input-bg)] text-[var(--input-fg)] focus:outline-none focus:ring-2 focus:ring-[#0ea5e9]"
                  value={filters[String(field.key)] ?? ""}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      [String(field.key)]: e.target.value,
                    }))
                  }
                >
                  <option value="">{field.label}</option>
                  {field.options?.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="overflow-x-auto px-4 sm:px-6">
        <table className="min-w-full text-sm">
          <thead className="bg-[var(--surface-1)]">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="px-3 py-2 text-left text-xs font-semibold text-[var(--fg)] cursor-pointer select-none"
                  onClick={() => handleSort(col.key)}
                >
                  <div className="flex items-center gap-1">
                    <span>{col.label}</span>
                    {sortKey === col.key && (
                      <span className="text-[10px]">
                        {sortDir === "asc" ? "▲" : "▼"}
                      </span>
                    )}
                  </div>
                </th>
              ))}
              {actions && (
                <th className="px-3 py-2 text-right text-xs font-semibold text-[var(--fg)]">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {filteredData.length === 0 && (
              <tr>
                <td
                  colSpan={columns.length + (actions ? 1 : 0)}
                  className="px-3 py-6 text-center text-[var(--muted)]"
                >
                  No records
                </td>
              </tr>
            )}
            {filteredData.map((row) => {
              const rowId = getRowId(row);
              const isExpanded = expandable && expandedRowId === rowId;

              return (
                <React.Fragment key={rowId}>
                  <tr
                    className="border-t border-[var(--border)] odd:bg-[var(--row-odd)] even:bg-[var(--row-even)] hover:bg-[var(--row-hover)]"
                    onClick={() => {
                      if (!expandable) return;
                      setExpandedRowId((prev) =>
                        prev === rowId ? null : rowId
                      );
                    }}
                  >
                    {columns.map((col) => (
                      <td key={col.key} className="px-3 py-2 align-top">
                        {col.render
                          ? col.render(row)
                          : String(row[col.key] ?? "")}
                      </td>
                    ))}
                    {actions && (
                      <td className="px-3 py-2 text-right whitespace-nowrap">
                        {actions(row)}
                      </td>
                    )}
                  </tr>
                  {isExpanded && renderExpandedRow && (
                    <tr>
                      <td
                        colSpan={columns.length + (actions ? 1 : 0)}
                        className="px-3 py-4 bg-[var(--surface-1)]"
                      >
                        {renderExpandedRow(row)}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
