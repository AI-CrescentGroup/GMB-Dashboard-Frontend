'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { fetchZoneMetricsRaw, aggregateZoneMetrics, type ZoneMetric } from '@/lib/queries'

interface ChartProps {
  data: any[]
  title?: string
}

const PLATFORM_COLORS: { [key: string]: string } = {
  google: '#3B82F6',
  facebook: '#1D4ED8',
  instagram: '#EC4899',
  ga4: '#8B5CF6',
  gmb: '#10B981',
}

export function MonthlySpendChart({ data }: ChartProps) {
  const chartData = Object.entries(data).map(([month, platforms]: [string, any]) => ({
    month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short' }),
    google: platforms.google?.spend || 0,
    facebook: platforms.facebook?.spend || 0,
    instagram: platforms.instagram?.spend || 0,
  }))

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 60 }}>
          <defs>
            <linearGradient id="colorGoogle" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1} />
            </linearGradient>
            <linearGradient id="colorFacebook" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#1D4ED8" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#1D4ED8" stopOpacity={0.1} />
            </linearGradient>
            <linearGradient id="colorInstagram" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#EC4899" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#EC4899" stopOpacity={0.1} />
            </linearGradient>
            <linearGradient id="colorGA4" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.1} />
            </linearGradient>
            <linearGradient id="colorGMB" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10B981" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#10B981" stopOpacity={0.1} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
          <XAxis dataKey="month" stroke="#9CA3AF" angle={-35} textAnchor="end" height={70} tick={{ fontSize: 11 }} />
          <YAxis stroke="#9CA3AF" tick={{ fontSize: 11 }} tickFormatter={(val: number) => val >= 1000000 ? `₹${(val/1000000).toFixed(0)}M` : val >= 1000 ? `₹${(val/1000).toFixed(0)}K` : `₹${val}`} />
          <Tooltip
            contentStyle={{
              borderRadius: '12px',
              border: 'none',
              boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
              fontSize: '13px'
            }}
            formatter={(value) => `₹${(value as number).toLocaleString('en-IN')}`}
          />
          <Legend wrapperStyle={{ paddingTop: '20px' }} />
          <Bar dataKey="google" stackId="a" fill="url(#colorGoogle)" radius={[8, 8, 0, 0]} />
          <Bar dataKey="facebook" stackId="a" fill="url(#colorFacebook)" radius={[8, 8, 0, 0]} />
          <Bar dataKey="instagram" stackId="a" fill="url(#colorInstagram)" radius={[8, 8, 0, 0]} />
        </BarChart>
    </ResponsiveContainer>
  )
}

export function DrivingDirectionsChart({ data }: ChartProps) {
  const chartData = Object.entries(data).map(([month, platforms]: [string, any]) => {
    let total = 0
    Object.values(platforms).forEach((p: any) => {
      total += p.directions || 0
    })
    return {
      month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short' }),
      directions: total,
    }
  })

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 60 }}>
          <defs>
            <linearGradient id="colorDirections" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10B981" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#10B981" stopOpacity={0.1} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
          <XAxis dataKey="month" stroke="#9CA3AF" angle={-35} textAnchor="end" height={70} tick={{ fontSize: 11 }} />
          <YAxis stroke="#9CA3AF" tick={{ fontSize: 11 }} tickFormatter={(val: number) => val >= 1000000 ? `${(val/1000000).toFixed(0)}M` : val >= 1000 ? `${(val/1000).toFixed(0)}K` : `${val}`} />
          <Tooltip
            contentStyle={{
              borderRadius: '12px',
              border: 'none',
              boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
              fontSize: '13px'
            }}
            formatter={(value: any) => typeof value === 'number' ? value.toLocaleString('en-IN') : value}
          />
          <Line
            type="monotone"
            dataKey="directions"
            stroke="#10B981"
            strokeWidth={3}
            dot={{ fill: '#10B981', r: 5 }}
            activeDot={{ r: 7 }}
            fill="url(#colorDirections)"
          />
        </LineChart>
    </ResponsiveContainer>
  )
}

export function EventCountChart({ data }: ChartProps) {
  const chartData = Object.entries(data).map(([month, platforms]: [string, any]) => {
    let total = 0
    Object.values(platforms).forEach((p: any) => {
      total += p.events || 0
    })
    return {
      month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short' }),
      events: total,
    }
  })

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 60 }}>
          <defs>
            <linearGradient id="colorEvents" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.1} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
          <XAxis dataKey="month" stroke="#9CA3AF" angle={-35} textAnchor="end" height={70} tick={{ fontSize: 11 }} />
          <YAxis stroke="#9CA3AF" tick={{ fontSize: 11 }} />
          <Tooltip
            contentStyle={{
              borderRadius: '12px',
              border: 'none',
              boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
              fontSize: '13px'
            }}
            formatter={(value: any) => typeof value === 'number' ? value.toLocaleString('en-IN') : value}
          />
          <Line
            type="monotone"
            dataKey="events"
            stroke="#F59E0B"
            strokeWidth={3}
            dot={{ fill: '#F59E0B', r: 5 }}
            activeDot={{ r: 7 }}
            fill="url(#colorEvents)"
          />
        </LineChart>
    </ResponsiveContainer>
  )
}

export function WebsiteVisitsChart({ data }: ChartProps) {
  const chartData = Object.entries(data).map(([month, platforms]: [string, any]) => {
    let total = 0
    Object.values(platforms).forEach((p: any) => {
      total += p.visits || 0
    })
    return {
      month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short' }),
      visits: total,
    }
  })

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 60 }}>
          <defs>
            <linearGradient id="colorVisits" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
          <XAxis dataKey="month" stroke="#9CA3AF" angle={-35} textAnchor="end" height={70} tick={{ fontSize: 11 }} />
          <YAxis stroke="#9CA3AF" tick={{ fontSize: 11 }} />
          <Tooltip
            contentStyle={{
              borderRadius: '12px',
              border: 'none',
              boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
              fontSize: '13px'
            }}
            formatter={(value: any) => typeof value === 'number' ? value.toLocaleString('en-IN') : value}
          />
          <Line
            type="monotone"
            dataKey="visits"
            stroke="#3B82F6"
            strokeWidth={3}
            dot={{ fill: '#3B82F6', r: 5 }}
            activeDot={{ r: 7 }}
            fill="url(#colorVisits)"
          />
        </LineChart>
    </ResponsiveContainer>
  )
}

export function PlatformBreakdownChart({ data }: ChartProps) {
  const total = Object.entries(data).reduce((sum, [_, platforms]: [string, any]) => {
    return sum + Object.values(platforms).reduce((pSum: number, p: any) => pSum + (p.spend || 0), 0)
  }, 0)

  const chartData = [
    {
      name: 'Google',
      value: Object.values(data).reduce((sum, platforms: any) => sum + (platforms.google?.spend || 0), 0),
      color: '#3B82F6',
    },
    {
      name: 'Facebook',
      value: Object.values(data).reduce((sum, platforms: any) => sum + (platforms.facebook?.spend || 0), 0),
      color: '#1D4ED8',
    },
    {
      name: 'Instagram',
      value: Object.values(data).reduce((sum, platforms: any) => sum + (platforms.instagram?.spend || 0), 0),
      color: '#EC4899',
    },
    {
      name: 'GA4',
      value: Object.values(data).reduce((sum, platforms: any) => sum + (platforms.ga4?.spend || 0), 0),
      color: '#8B5CF6',
    },
    {
      name: 'GMB',
      value: Object.values(data).reduce((sum, platforms: any) => sum + (platforms.gmb?.spend || 0), 0),
      color: '#10B981',
    },
  ].filter((p) => p.value > 0)

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-gray-400">
        No spend data available
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {chartData.map((p) => (
        <div key={p.name}>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">{p.name}</span>
            <span className="text-sm font-semibold text-gray-900">₹{p.value.toLocaleString('en-IN')}</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
            <div
              className="h-2 rounded-full transition-all duration-500"
              style={{
                width: `${(p.value / total) * 100}%`,
                backgroundColor: p.color,
              }}
            />
          </div>
          <span className="text-xs text-gray-500 mt-1 block">
            {((p.value / total) * 100).toFixed(1)}%
          </span>
        </div>
      ))}
    </div>
  )
}

const ZONE_COLORS: { [zone: string]: string } = {
  CENTRAL: '#3B82F6',
  EAST:    '#10B981',
  NORTH:   '#F59E0B',
  SOUTH:   '#EC4899',
  WEST:    '#8B5CF6',
}

const METRIC_OPTIONS = [
  { value: 'dd' as ZoneMetric,           label: 'Driving Directions' },
  { value: 'wv' as ZoneMetric,           label: 'Website Visits' },
  { value: 'gClicks' as ZoneMetric,      label: 'Google Clicks' },
  { value: 'gImpressions' as ZoneMetric, label: 'Google Impressions' },
  { value: 'igClicks' as ZoneMetric,     label: 'IG Clicks' },
  { value: 'fbClicks' as ZoneMetric,     label: 'FB Clicks' },
]

interface ZoneComparisonProps {
  dealerIds: string[]
  dateFrom: string
  dateTo: string
}

export function ZoneComparisonChart({ dealerIds, dateFrom, dateTo }: ZoneComparisonProps) {
  const [metric, setMetric] = useState<ZoneMetric>('dd')
  const [rawData, setRawData] = useState<{ rows: any[]; zoneMap: { [id: string]: string } } | null>(null)
  const [loading, setLoading] = useState(true)

  // Fetch raw metrics ONCE per dealerIds/dateFrom/dateTo change
  useEffect(() => {
    setLoading(true)
    fetchZoneMetricsRaw(dealerIds, dateFrom, dateTo)
      .then(data => setRawData(data))
      .finally(() => setLoading(false))
  }, [dealerIds, dateFrom, dateTo])

  // Pure aggregation: recompute synchronously when metric changes (instant, no network)
  const chartData = useMemo(() => {
    if (!rawData) return []
    const { months, zones } = aggregateZoneMetrics(rawData.rows, rawData.zoneMap, metric)
    return months.map((month, i) => {
      const point: any = {
        month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
      }
      Object.keys(zones).forEach(zone => { point[zone] = zones[zone][i] })
      return point
    })
  }, [rawData, metric])

  return (
    <div>
      <div style={{ marginBottom: '1rem' }}>
        <select
          value={metric}
          onChange={e => setMetric(e.target.value as ZoneMetric)}
          disabled={loading}
          style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #E5E7EB',
                   fontSize: '14px', backgroundColor: '#fff', cursor: loading ? 'not-allowed' : 'pointer',
                   opacity: loading ? 0.6 : 1 }}
        >
          {METRIC_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
      {loading ? (
        <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ color: '#6B7280' }}>Loading...</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
            <XAxis dataKey="month" stroke="#9CA3AF" angle={-35} textAnchor="end" height={70} tick={{ fontSize: 11 }} />
            <YAxis stroke="#9CA3AF" tick={{ fontSize: 11 }} />
            <Tooltip
              contentStyle={{ backgroundColor: '#fff', border: '1px solid #E5E7EB',
                              borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
              formatter={(value: any) => value.toLocaleString('en-IN')}
            />
            <Legend wrapperStyle={{ paddingTop: '20px' }} />
            {Object.keys(ZONE_COLORS).map(zone => (
              <Line key={zone} type="monotone" dataKey={zone}
                stroke={ZONE_COLORS[zone]} strokeWidth={2}
                dot={{ fill: ZONE_COLORS[zone], r: 4 }} activeDot={{ r: 6 }} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
