import { MoreHorizontal, TrendingUp, TrendingDown } from "lucide-react"
import { Card } from "@/components/ui/card"

export interface ChartCardProps {
  title: string
  subtitle?: string
  value?: string
  delta?: number
  legend?: Array<{ label: string; color: string }>
  actions?: React.ReactNode
  height?: number
  loading?: boolean
  children: React.ReactNode
}

export function ChartCard({
  title, subtitle, value, delta, legend, actions, height = 280, loading, children,
}: ChartCardProps) {
  const trendUp = (delta ?? 0) >= 0
  return (
    <Card className="flex flex-col">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-[15px] font-semibold tracking-tight text-slate-900">{title}</h3>
          {subtitle && <p className="mt-0.5 text-[12px] text-slate-500">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-1">
          {actions}
          <button
            aria-label="Chart options"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>
      </div>

      {(value || delta != null) && (
        <div className="mt-4 flex items-baseline gap-3">
          {value && (
            <span className="text-[28px] font-semibold tracking-tight tabular-nums text-slate-900">
              {value}
            </span>
          )}
          {delta != null && (
            <span className={`inline-flex items-center gap-0.5 text-[12px] font-medium tabular-nums ${
              trendUp ? "text-emerald-600" : "text-rose-600"
            }`}>
              {trendUp ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
              {Math.abs(delta).toFixed(1)}%
            </span>
          )}
        </div>
      )}

      {legend && legend.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5">
          {legend.map((l) => (
            <div key={l.label} className="flex items-center gap-1.5 text-[12px] text-slate-600">
              <span className="h-2 w-2 rounded-full" style={{ background: l.color }} />
              {l.label}
            </div>
          ))}
        </div>
      )}

      <div className="mt-5 -mx-1" style={{ height }}>
        {loading ? (
          <div className="h-full w-full animate-pulse rounded-lg bg-slate-100" />
        ) : (
          children
        )}
      </div>
    </Card>
  )
}
