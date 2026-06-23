interface CircleChartProps {
  percentage: number
  label: string
  value: string
  color?: 'orange' | 'blue' | 'green' | 'purple'
}

const colorMap = {
  orange: '#ff6b4a',
  blue: '#3b82f6',
  green: '#10b981',
  purple: '#8b5cf6',
}

export default function CircleChart({
  percentage,
  label,
  value,
  color = 'orange',
}: CircleChartProps) {
  const circumference = 2 * Math.PI * 45
  const strokeDashoffset = circumference - (percentage / 100) * circumference

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-32 h-32 mb-4">
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="64"
            cy="64"
            r="45"
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="8"
          />
          <circle
            cx="64"
            cy="64"
            r="45"
            fill="none"
            stroke={colorMap[color]}
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-500"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-2xl font-bold text-gray-900">{percentage}%</p>
          <p className="text-xs text-gray-500">Growth</p>
        </div>
      </div>
      <p className="text-sm font-medium text-gray-700 text-center">{label}</p>
      <p className="text-lg font-bold text-gray-900">{value}</p>
    </div>
  )
}
