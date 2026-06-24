"use client"
import { ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react"

export interface Column<T> {
  key: keyof T | string
  header: string
  align?: "left" | "right" | "center"
  width?: string
  sortable?: boolean
  render?: (row: T) => React.ReactNode
}

export interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  rowKey: (row: T) => string
  sortKey?: string
  sortDir?: "asc" | "desc"
  onSort?: (key: string) => void
  onRowClick?: (row: T) => void
  loading?: boolean
  empty?: React.ReactNode
}

export function DataTable<T>({
  columns, data, rowKey, sortKey, sortDir, onSort, onRowClick, loading, empty,
}: DataTableProps<T>) {
  return (
    <div className="overflow-hidden rounded-2xl bg-white" style={{ boxShadow: '0 2px 12px rgba(15,23,42,0.06)' }}>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/50">
              {columns.map((c) => {
                const active = sortKey === String(c.key)
                const Icon = !c.sortable ? null : active ? (sortDir === "asc" ? ChevronUp : ChevronDown) : ChevronsUpDown
                return (
                  <th
                    key={String(c.key)}
                    style={{ width: c.width, textAlign: c.align ?? "left" }}
                    className="px-5 py-3 text-[11px] font-medium uppercase tracking-wider text-slate-500"
                  >
                    <button
                      type="button"
                      onClick={() => c.sortable && onSort?.(String(c.key))}
                      className={`inline-flex items-center gap-1.5 ${
                        c.sortable ? "hover:text-slate-700 transition cursor-pointer" : "cursor-default"
                      }`}
                    >
                      {c.header}
                      {Icon && <Icon className={`h-3 w-3 ${active ? "text-slate-700" : "text-slate-400"}`} />}
                    </button>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="border-b border-slate-50">
                  {columns.map((c) => (
                    <td key={String(c.key)} className="px-5 py-4">
                      <div className="h-3 w-24 animate-pulse rounded bg-slate-100" />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-5 py-16 text-center text-sm text-slate-500">
                  {empty ?? "No results"}
                </td>
              </tr>
            ) : (
              data.map((row) => (
                <tr
                  key={rowKey(row)}
                  onClick={() => onRowClick?.(row)}
                  className={`border-b border-slate-50 last:border-0 transition-colors ${
                    onRowClick ? "cursor-pointer hover:bg-slate-50/60" : ""
                  }`}
                >
                  {columns.map((c) => (
                    <td
                      key={String(c.key)}
                      style={{ textAlign: c.align ?? "left" }}
                      className="px-5 py-3.5 align-middle text-slate-700 tabular-nums"
                    >
                      {c.render ? c.render(row) : (row as any)[c.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
