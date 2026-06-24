interface StatsCardProps {
  label: string
  value: string | number
  icon?: React.ReactNode
  trend?: number
  color?: 'blue'
  unit?: string
  subtitle?: string
}

export default function StatsCard({
  label,
  value,
  icon,
  trend,
  unit = '',
  subtitle,
}: StatsCardProps) {
  const valueStr = typeof value === 'number' ? value.toLocaleString('en-IN') : value
  let valueFontSize = 'text-[42px]'
  if (valueStr.length > 8) valueFontSize = 'text-[28px]'
  else if (valueStr.length > 6) valueFontSize = 'text-[34px]'

  return (
    <div
      className="bg-white rounded-2xl p-6 transition-shadow duration-200 overflow-visible"
      style={{
        boxShadow: '0 2px 12px rgba(15,23,42,0.06)',
        borderTop: '3px solid #6366F1',
        textAlign: 'center',
      }}
    >
      {icon && (
        <div className="flex items-center justify-center mb-5">
          <div className="h-9 w-9 flex items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
            {icon}
          </div>
        </div>
      )}

      <div className="flex flex-col items-center">
        <p className="text-[11px] font-medium text-slate-500 uppercase tracking-widest mb-2">{label}</p>
        <div className="flex items-baseline gap-1.5 justify-center">
          <p className={`${valueFontSize} font-semibold tracking-tight text-slate-900 tabular-nums leading-none`}>
            {valueStr}
          </p>
          {unit && <span className="text-[13px] font-medium text-slate-500 flex-shrink-0">{unit}</span>}
        </div>
        {subtitle && <p className="text-[11px] text-slate-400 mt-2">{subtitle}</p>}
      </div>

      {trend !== undefined && (
        <div
          className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-medium mt-4 tabular-nums ${
            trend >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
          }`}
        >
          {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}% vs last month
        </div>
      )}
    </div>
  )
}
