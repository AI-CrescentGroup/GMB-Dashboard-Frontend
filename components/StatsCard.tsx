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
  let valueFontSize = 'text-5xl'
  if (valueStr.length > 8) valueFontSize = 'text-3xl'
  else if (valueStr.length > 6) valueFontSize = 'text-4xl'

  return (
    <div
      className="bg-white rounded-2xl p-6 transition-all overflow-visible"
      style={{
        boxShadow: 'var(--shadow-card)',
        borderTop: '3px solid #e07856',
        textAlign: 'center',
      }}
    >
      <div className="flex items-center justify-center mb-6">
        {icon && (
          <div className="p-3 rounded-xl w-10 h-10 flex items-center justify-center" style={{ backgroundColor: '#fff5f2', color: '#e07856' }}>
            {icon}
          </div>
        )}
      </div>

      <div className="flex flex-col items-center">
        <p className="text-xs font-semibold text-gray-400 uppercase mb-2 tracking-widest">{label}</p>
        <div className="flex items-baseline gap-2 justify-center overflow-hidden">
          <p className={`${valueFontSize} font-bold text-gray-900 overflow-hidden text-ellipsis`}>
            {valueStr}
          </p>
          {unit && <span className="text-sm font-medium text-gray-600 flex-shrink-0">{unit}</span>}
        </div>
        {subtitle && <p className="text-xs text-gray-400 mt-3">{subtitle}</p>}
      </div>

      {trend !== undefined && (
        <div className={`text-xs font-semibold mt-4 ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}% vs last month
        </div>
      )}
    </div>
  )
}
