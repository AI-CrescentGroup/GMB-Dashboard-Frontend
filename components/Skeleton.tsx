export function Skeleton({ className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`animate-pulse rounded-md bg-slate-100 ${className}`}
      {...props}
    />
  )
}

export function KPICardSkeleton() {
  return (
    <div className="flex flex-col gap-5 rounded-2xl bg-white p-6" style={{ boxShadow: '0 2px 12px rgba(15,23,42,0.06)' }}>
      <div className="flex items-center justify-between">
        <Skeleton className="h-3.5 w-24" />
        <Skeleton className="h-8 w-8 rounded-lg" />
      </div>
      <Skeleton className="h-9 w-28" />
      <Skeleton className="h-4 w-32" />
    </div>
  )
}

export function ChartCardSkeleton({ height = 280 }: { height?: number }) {
  return (
    <div className="rounded-2xl bg-white p-6" style={{ boxShadow: '0 2px 12px rgba(15,23,42,0.06)' }}>
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-28" />
        </div>
        <Skeleton className="h-8 w-8 rounded-lg" />
      </div>
      <Skeleton className="mt-4 h-8 w-32" />
      <Skeleton className="mt-5 w-full rounded-lg" style={{ height }} />
    </div>
  )
}

export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="overflow-hidden rounded-2xl bg-white" style={{ boxShadow: '0 2px 12px rgba(15,23,42,0.06)' }}>
      <div className="border-b border-slate-100 bg-slate-50/50 px-5 py-3">
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
          {Array.from({ length: cols }).map((_, i) => (
            <Skeleton key={i} className="h-3 w-20" />
          ))}
        </div>
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="border-b border-slate-50 px-5 py-4 last:border-0">
          <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
            {Array.from({ length: cols }).map((_, c) => (
              <Skeleton key={c} className="h-3 w-full max-w-[120px]" />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
