interface MetricRowProps {
  items: Array<{
    label: string
    value: string | number
    icon?: React.ReactNode
  }>
}

export default function MetricRow({ items }: MetricRowProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
        {items.map((item, idx) => (
          <div key={idx} className="flex items-center gap-3">
            {item.icon && <div className="text-2xl text-gray-400">{item.icon}</div>}
            <div>
              <p className="text-xs text-gray-500 mb-1">{item.label}</p>
              <p className="text-lg font-bold text-gray-900">{item.value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
