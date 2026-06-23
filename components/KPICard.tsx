interface KPICardProps {
  label: string
  value: string | number
  unit?: string
  change?: number
  icon?: React.ReactNode
  accent?: 'blue' | 'orange' | 'green' | 'purple' | 'red'
}

const accentMap = {
  blue: 'bg-blue-50 text-blue-500',
  orange: 'bg-orange-50 text-orange-500',
  green: 'bg-green-50 text-green-500',
  purple: 'bg-purple-50 text-purple-500',
  red: 'bg-red-50 text-red-500',
}

export default function KPICard({ label, value, unit = '', change, icon, accent = 'blue' }: KPICardProps) {
  const valueStr = typeof value === 'number' ? value.toLocaleString('en-IN') : value
  let valueFontSize = 'text-2xl'
  if (valueStr.length > 8) valueFontSize = 'text-lg'
  else if (valueStr.length > 5) valueFontSize = 'text-xl'

  return (
    <div className="bg-white rounded-2xl p-6 transition-all overflow-hidden" style={{ boxShadow: 'var(--shadow-card)' }}>
      <div className="flex items-start justify-between mb-4">
        <p className="text-xs text-gray-400 font-semibold uppercase tracking-widest">{label}</p>
        {icon && (
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${accentMap[accent]}`}>{icon}</div>
        )}
      </div>
      <div className="flex items-baseline gap-2 overflow-hidden">
        <p className={`${valueFontSize} font-bold text-gray-900 overflow-hidden text-ellipsis`}>
          {valueStr}
        </p>
        {unit && <span className="text-sm text-gray-400 flex-shrink-0">{unit}</span>}
      </div>
      {change !== undefined && (
        <div className={`mt-3 text-xs font-semibold ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {change >= 0 ? '+' : ''}
          {change}% from last period
        </div>
      )}
    </div>
  )
}
