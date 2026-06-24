import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react"
import { Card } from "@/components/ui/card"

export interface KPICardProps {
  label: string
  value: string | number
  delta?: number
  deltaLabel?: string
  icon?: React.ReactNode
  loading?: boolean
  format?: (v: string | number) => string
  unit?: string
  change?: number
  accent?: string
}

export default function KPICard({
  label, value, delta, deltaLabel = "vs last period", icon, loading, format, unit = '', change,
}: KPICardProps) {
  const effectiveDelta = delta ?? change
  const trend = effectiveDelta == null ? "flat" : effectiveDelta > 0 ? "up" : effectiveDelta < 0 ? "down" : "flat"
  const TrendIcon = trend === "up" ? ArrowUpRight : trend === "down" ? ArrowDownRight : Minus

  const valueStr = typeof value === 'number' ? value.toLocaleString('en-IN') : value
  const displayValue = format ? format(value) : valueStr

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-medium text-slate-500">{label}</span>
        {icon && (
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 text-slate-600">
            {icon}
          </span>
        )}
      </div>

      {loading ? (
        <div className="h-9 w-24 animate-pulse rounded-md bg-slate-100" />
      ) : (
        <div className="text-[28px] font-semibold tracking-tight text-slate-900 tabular-nums leading-none">
          {displayValue}{unit && <span className="text-[16px] text-slate-500 ml-1">{unit}</span>}
        </div>
      )}

      {effectiveDelta != null && (
        <div className="flex items-center gap-2 text-xs">
          <span
            className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 font-medium tabular-nums ${
              trend === "up" ? "bg-emerald-50 text-emerald-700" :
              trend === "down" ? "bg-rose-50 text-rose-700" :
              "bg-slate-100 text-slate-600"
            }`}
          >
            <TrendIcon className="h-3 w-3" strokeWidth={2.5} />
            {Math.abs(effectiveDelta).toFixed(1)}%
          </span>
          <span className="text-slate-500">{deltaLabel}</span>
        </div>
      )}
    </Card>
  )
}
