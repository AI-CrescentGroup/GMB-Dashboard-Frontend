'use client'

import { useEffect, useState, useMemo } from 'react'
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts'
import { getDealers, getMetrics, getCallMetrics, getBudgets } from '@/lib/queries'
import { TrendingUp, MapPin, Activity, Phone, Navigation, Eye, Zap, MousePointerClick } from 'lucide-react'

const DATE_FROM = '2025-05-28'
const DATE_TO = '2026-03-31'

// ─── Chart constants ──────────────────────────────────────────────────────────

const CHART_MONTH_OPTIONS = [
  { value: 'all', label: 'All Months' },
  { value: '2025-05', label: 'May 2025' },
  { value: '2025-06', label: 'Jun 2025' },
  { value: '2025-07', label: 'Jul 2025' },
  { value: '2025-08', label: 'Aug 2025' },
  { value: '2025-09', label: 'Sep 2025' },
  { value: '2025-10', label: 'Oct 2025' },
  { value: '2025-11', label: 'Nov 2025' },
  { value: '2025-12', label: 'Dec 2025' },
  { value: '2026-01', label: 'Jan 2026' },
  { value: '2026-02', label: 'Feb 2026' },
  { value: '2026-03', label: 'Mar 2026' },
]

const STATE_OPTIONS = [
  { value: 'all', label: 'All States' },
  { value: 'ANDHRA PRADESH', label: 'Andhra Pradesh' },
  { value: 'ASSAM', label: 'Assam' },
  { value: 'BIHAR', label: 'Bihar' },
  { value: 'CHANDIGARH', label: 'Chandigarh' },
  { value: 'CHHATTISGARH', label: 'Chhattisgarh' },
  { value: 'DELHI', label: 'Delhi' },
  { value: 'GOA', label: 'Goa' },
  { value: 'GUJARAT', label: 'Gujarat' },
  { value: 'HARYANA', label: 'Haryana' },
  { value: 'HIMACHAL PRADESH', label: 'Himachal Pradesh' },
  { value: 'J&K', label: 'J&K' },
  { value: 'JHARKHAND', label: 'Jharkhand' },
  { value: 'KARNATAKA', label: 'Karnataka' },
  { value: 'KERALA', label: 'Kerala' },
  { value: 'MADHYA PRADESH', label: 'Madhya Pradesh' },
  { value: 'MAHARASHTRA', label: 'Maharashtra' },
  { value: 'ODISHA', label: 'Odisha' },
  { value: 'PUNJAB', label: 'Punjab' },
  { value: 'RAJASTHAN', label: 'Rajasthan' },
  { value: 'TAMIL NADU', label: 'Tamil Nadu' },
  { value: 'TELANGANA', label: 'Telangana' },
  { value: 'UTTAR PRADESH', label: 'Uttar Pradesh' },
  { value: 'UTTRAKHAND', label: 'Uttrakhand' },
  { value: 'WEST BENGAL', label: 'West Bengal' },
]

const KPI_OPTIONS = [
  { value: 'calls_received', label: 'Calls' },
  { value: 'driving_directions', label: 'Driving Directions' },
  { value: 'website_visits', label: 'Website Visits' },
  { value: 'impressions', label: 'Impressions' },
  { value: 'link_clicks', label: 'Link Clicks' },
  { value: 'spend_inr', label: 'Total Spend vs Planned' },
]

const ZONE_COLORS: Record<string, string> = {
  CENTRAL: '#6366f1',
  EAST: '#f59e0b',
  NORTH: '#10b981',
  SOUTH: '#3b82f6',
  WEST: '#f43f5e',
}

const TIER_COLORS: Record<string, string> = {
  'Metros': '#8b5cf6',
  'Tier 1': '#06b6d4',
  'Other Cities': '#f97316',
  'Noida': '#84cc16',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatNumber(val: number): string {
  if (val >= 10_000_000) return `${(val / 10_000_000).toFixed(1)}Cr`
  if (val >= 100_000) return `${(val / 100_000).toFixed(1)}L`
  if (val >= 1_000) return `${(val / 1_000).toFixed(1)}K`
  return val.toLocaleString('en-IN')
}

function formatCurrency(val: number): string {
  if (val >= 10_000_000) return `₹${(val / 10_000_000).toFixed(1)}Cr`
  if (val >= 100_000) return `₹${(val / 100_000).toFixed(1)}L`
  if (val >= 1_000) return `₹${(val / 1_000).toFixed(1)}K`
  return `₹${val.toLocaleString('en-IN')}`
}

function fmtKpiValue(val: number, kpi: string): string {
  return kpi === 'spend_inr' ? formatCurrency(val) : formatNumber(val)
}

// Admin-only page: Impressions/Clicks use Mn notation, not the Cr/L/K scale above.
function formatMillions(val: number): string {
  return `${(val / 1_000_000).toFixed(1)}Mn`
}


// ─── Sub-components ───────────────────────────────────────────────────────────

function KpiCard({
  icon,
  label,
  value,
  note,
  prefix,
  suffix,
  subtitle,
}: {
  icon: React.ReactNode
  label: string
  value: string
  note?: string
  prefix?: string
  suffix?: string
  subtitle?: string
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
      <div className="flex items-center gap-2 mb-1.5">
        {icon}
        <span className="text-[11px] text-slate-500 uppercase tracking-wide font-medium">{label}</span>
      </div>
      <div className={`text-xl font-bold ${note ? 'text-slate-400' : 'text-slate-900'}`}>
        {prefix}{value}{suffix}
      </div>
      {subtitle && <div className="text-xs text-slate-400 mt-1">{subtitle}</div>}
      {note && <div className="text-xs text-slate-400 mt-1">{note}</div>}
    </div>
  )
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const entry = payload[0]
  if (!entry) return null
  const data = entry.payload

  // Calls pie tooltip — show breakdown
  if (data?.answered !== undefined && data?.missed !== undefined) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-3 text-xs space-y-1 min-w-[140px]">
        <p className="font-semibold text-slate-800 mb-1">{data.name}</p>
        <p className="text-slate-600">Total: <span className="font-medium text-slate-900">{formatNumber(data.value)}</span></p>
        <p className="text-slate-600">Answered: <span className="font-medium text-emerald-600">{formatNumber(data.answered)}</span></p>
        <p className="text-slate-600">Missed: <span className="font-medium text-red-500">{formatNumber(data.missed)}</span></p>
      </div>
    )
  }

  // Spend tooltip
  if (entry.name === 'spend_inr' || data?.name === 'spend_inr') {
    return (
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-3 text-xs space-y-1">
        <p className="font-semibold text-slate-800">{entry.name}</p>
        <p className="text-slate-600">Total Spent: <span className="font-medium text-slate-900 ml-1">{formatCurrency(entry.value)}</span></p>
      </div>
    )
  }

  // Default tooltip
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-3 text-xs">
      <p className="font-semibold text-slate-800 mb-1">{data?.name ?? entry.name}</p>
      <p className="text-slate-600">{entry.value ? formatNumber(entry.value) : '—'}</p>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OverviewPage() {
  const [dealers, setDealers] = useState<any[]>([])
  const [metrics, setMetrics] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [overviewCalls, setOverviewCalls] = useState<any[]>([])
  const [overviewBudgets, setOverviewBudgets] = useState<any[]>([])

  // chart controls
  const [selectedKpi, setSelectedKpi] = useState('driving_directions')
  const [selectedChartMonth, setSelectedChartMonth] = useState('all')
  const [selectedState, setSelectedState] = useState('all')
  const [viewMode, setViewMode] = useState<'monthly' | 'daterange'>('monthly')
  const [dateFrom, setDateFrom] = useState('2025-05-28')
  const [dateTo, setDateTo] = useState('2026-03-31')

  // Load dealers then metrics once on mount — hardcoded full campaign date range
  useEffect(() => {
    let cancelled = false
    async function init() {
      setLoading(true)
      try {
        const allDealers = await getDealers()
        if (!cancelled) setDealers(allDealers)
        const dealerIds = allDealers.map((d: any) => d.id)
        const data = await getMetrics(dealerIds, DATE_FROM, DATE_TO, [])
        if (!cancelled) setMetrics(data)
        const calls = await getCallMetrics(dealerIds, '2025-05', '2026-03')
        if (!cancelled) setOverviewCalls(calls)
        const budgets = await getBudgets(dealerIds)
        if (!cancelled) setOverviewBudgets(budgets)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    init().catch(console.error)
    return () => { cancelled = true }
  }, [])

  // ── KPI computations ─────────────────────────────────────────────────────────

  const kpi = useMemo(() => {
    let directions = 0, storeVisits = 0, websiteVisits = 0
    let googleSpend = 0, googleClicks = 0
    let metaSpend = 0, metaImpressions = 0
    let totalClicks = 0, totalImpressions = 0

    metrics.forEach((m: any) => {
      if (m.platform === 'google') {
        googleSpend += m.spend_inr || 0
        googleClicks += m.link_clicks || 0
        totalClicks += m.link_clicks || 0
        totalImpressions += m.impressions || 0
      }
      if (m.platform === 'gmb') {
        directions += m.driving_directions || 0
        storeVisits += m.store_visits || 0
      }
      if (m.platform === 'ga4') websiteVisits += m.website_visits || 0
      if (m.platform === 'facebook' || m.platform === 'instagram') {
        metaSpend += m.spend_inr || 0
        metaImpressions += m.impressions || 0
        totalClicks += m.link_clicks || 0
        totalImpressions += m.impressions || 0
      }
    })

    const avgCpc = googleClicks > 0 ? googleSpend / googleClicks : 0
    const avgCpm = metaImpressions > 0 ? (metaSpend / metaImpressions) * 1000 : 0
    const overallCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0
    const totalSpend = googleSpend + metaSpend

    return { directions, storeVisits, websiteVisits, avgCpc, avgCpm, overallCtr, totalSpend, totalImpressions, totalClicks }
  }, [metrics])

  // ── Dealer lookup map ─────────────────────────────────────────────────────────

  const dealersMap = useMemo(() => {
    const map: Record<string, { zone: string; market: string; state: string }> = {}
    dealers.forEach((d: any) => {
      const rawState = (d.state || '').toUpperCase()
      const state = (rawState === 'U.P. WEST' || rawState === 'UP WEST') ? 'UTTAR PRADESH' : rawState
      map[d.id] = {
        zone: d.zone || '',
        market: d.market || '',
        state,
      }
    })
    return map
  }, [dealers])

  // ── Top Performers (calls) ─────────────────────────────────────────────────────

  const topPerformers = useMemo(() => {
    const byDealer: Record<string, any> = {}
    overviewCalls.forEach((r: any) => {
      let include = false
      if (viewMode === 'monthly') {
        include = selectedChartMonth === 'all' || r.month === selectedChartMonth
      } else {
        const monthKey = r.month
        include = monthKey >= dateFrom.substring(0, 7) && monthKey <= dateTo.substring(0, 7)
      }
      if (!include) return
      if (!byDealer[r.dealer_id]) {
        byDealer[r.dealer_id] = {
          dealer_id: r.dealer_id,
          calls_received: 0,
          calls_answered: 0,
          calls_missed: 0,
        }
      }
      byDealer[r.dealer_id].calls_received += r.calls_received || 0
      byDealer[r.dealer_id].calls_answered += r.calls_answered || 0
      byDealer[r.dealer_id].calls_missed += r.calls_missed || 0
    })
    return Object.values(byDealer)
      .map((d: any) => {
        const dealer = dealers.find((od: any) => od.id === d.dealer_id)
        return {
          ...d,
          dealer_name: dealer?.dealer_name ?? '—',
          zone: dealer?.zone ?? '—',
          tier: dealer?.market ?? '—',
        }
      })
      .sort((a: any, b: any) => b.calls_received - a.calls_received)
      .slice(0, 15)
  }, [overviewCalls, dealers, selectedChartMonth, viewMode, dateFrom, dateTo])

  // ── Pie chart data ────────────────────────────────────────────────────────────

  const zonePieData = useMemo((): { name: string; value: number }[] => {
    const agg: Record<string, number> = {}
    if (selectedKpi === 'calls_received') {
      const answeredAgg: Record<string, number> = {}
      const missedAgg: Record<string, number> = {}
      overviewCalls.forEach((r: any) => {
        let include = false
        if (viewMode === 'monthly') {
          include = selectedChartMonth === 'all' || r.month === selectedChartMonth
        } else {
          include = r.month >= dateFrom.substring(0, 7) && r.month <= dateTo.substring(0, 7)
        }
        if (!include) return
        const dealer = dealersMap[r.dealer_id]
        if (!dealer?.zone) return
        agg[dealer.zone] = (agg[dealer.zone] || 0) + (r.calls_received || 0)
        answeredAgg[dealer.zone] = (answeredAgg[dealer.zone] || 0) + (r.calls_answered || 0)
        missedAgg[dealer.zone] = (missedAgg[dealer.zone] || 0) + (r.calls_missed || 0)
      })
      return Object.entries(agg)
        .map(([name, value]) => ({ name, value, answered: answeredAgg[name] || 0, missed: missedAgg[name] || 0 }))
        .filter((e) => e.value > 0)
        .sort((a, b) => b.value - a.value)
    } else {
      metrics.forEach((row: any) => {
        let include = false
        if (viewMode === 'monthly') {
          include = selectedChartMonth === 'all' || row.metric_date?.startsWith(selectedChartMonth)
        } else {
          include = row.metric_date >= dateFrom && row.metric_date <= dateTo
        }
        if (!include) return
        const dealer = dealersMap[row.dealer_id]
        if (!dealer?.zone) return
        agg[dealer.zone] = (agg[dealer.zone] || 0) + ((row[selectedKpi] as number) || 0)
      })
      return Object.entries(agg)
        .map(([name, value]) => ({ name, value }))
        .filter((e) => e.value > 0)
        .sort((a, b) => b.value - a.value)
    }
  }, [metrics, overviewCalls, dealersMap, selectedKpi, selectedChartMonth, viewMode, dateFrom, dateTo])

  const tierPieData = useMemo((): { name: string; value: number }[] => {
    const agg: Record<string, number> = {}
    if (selectedKpi === 'calls_received') {
      const answeredAgg: Record<string, number> = {}
      const missedAgg: Record<string, number> = {}
      overviewCalls.forEach((r: any) => {
        let include = false
        if (viewMode === 'monthly') {
          include = selectedChartMonth === 'all' || r.month === selectedChartMonth
        } else {
          include = r.month >= dateFrom.substring(0, 7) && r.month <= dateTo.substring(0, 7)
        }
        if (!include) return
        const dealer = dealersMap[r.dealer_id]
        if (!dealer?.market) return
        agg[dealer.market] = (agg[dealer.market] || 0) + (r.calls_received || 0)
        answeredAgg[dealer.market] = (answeredAgg[dealer.market] || 0) + (r.calls_answered || 0)
        missedAgg[dealer.market] = (missedAgg[dealer.market] || 0) + (r.calls_missed || 0)
      })
      return Object.entries(agg)
        .map(([name, value]) => ({ name, value, answered: answeredAgg[name] || 0, missed: missedAgg[name] || 0 }))
        .filter((e) => e.value > 0)
        .sort((a, b) => b.value - a.value)
    } else {
      metrics.forEach((row: any) => {
        let include = false
        if (viewMode === 'monthly') {
          include = selectedChartMonth === 'all' || row.metric_date?.startsWith(selectedChartMonth)
        } else {
          include = row.metric_date >= dateFrom && row.metric_date <= dateTo
        }
        if (!include) return
        const dealer = dealersMap[row.dealer_id]
        if (!dealer?.market) return
        agg[dealer.market] = (agg[dealer.market] || 0) + ((row[selectedKpi] as number) || 0)
      })
      return Object.entries(agg)
        .map(([name, value]) => ({ name, value }))
        .filter((e) => e.value > 0)
        .sort((a, b) => b.value - a.value)
    }
  }, [metrics, overviewCalls, dealersMap, selectedKpi, selectedChartMonth, viewMode, dateFrom, dateTo])

  // ── State bar chart data (by month) ────────────────────────────────────────

  const MONTHS_FOR_CHART = [
    { key: '2025-05', label: 'May 2025' },
    { key: '2025-06', label: 'Jun 2025' },
    { key: '2025-07', label: 'Jul 2025' },
    { key: '2025-08', label: 'Aug 2025' },
    { key: '2025-09', label: 'Sep 2025' },
    { key: '2025-10', label: 'Oct 2025' },
    { key: '2025-11', label: 'Nov 2025' },
    { key: '2025-12', label: 'Dec 2025' },
    { key: '2026-01', label: 'Jan 2026' },
    { key: '2026-02', label: 'Feb 2026' },
    { key: '2026-03', label: 'Mar 2026' },
  ]

  const stateBarData = useMemo((): { month: string; value: number }[] => {
    const agg: Record<string, number> = {}
    const relevantMonths = viewMode === 'monthly'
      ? MONTHS_FOR_CHART
      : MONTHS_FOR_CHART.filter(m => m.key >= dateFrom.substring(0, 7) && m.key <= dateTo.substring(0, 7))
    relevantMonths.forEach((m) => { agg[m.key] = 0 })

    if (selectedKpi === 'calls_received') {
      const answeredAgg: Record<string, number> = {}
      const missedAgg: Record<string, number> = {}
      relevantMonths.forEach((m) => { answeredAgg[m.key] = 0; missedAgg[m.key] = 0 })
      overviewCalls.forEach((r: any) => {
        if (!agg.hasOwnProperty(r.month)) return
        let include = false
        if (viewMode === 'monthly') {
          include = selectedState === 'all' || true
        } else {
          include = r.month >= dateFrom.substring(0, 7) && r.month <= dateTo.substring(0, 7)
        }
        if (!include) return
        const dealer = dealersMap[r.dealer_id]
        if (!dealer?.state) return
        if (selectedState !== 'all' && dealer.state !== selectedState) return
        agg[r.month] += (r.calls_received || 0)
        answeredAgg[r.month] += (r.calls_answered || 0)
        missedAgg[r.month] += (r.calls_missed || 0)
      })
      return relevantMonths.map((m) => ({
        month: m.label,
        value: agg[m.key],
        answered: answeredAgg[m.key],
        missed: missedAgg[m.key],
      }))
    } else {
      metrics.forEach((row: any) => {
        const monthKey = row.metric_date?.substring(0, 7)
        if (!monthKey || !agg.hasOwnProperty(monthKey)) return
        let include = false
        if (viewMode === 'monthly') {
          include = selectedState === 'all' || true
        } else {
          include = row.metric_date >= dateFrom && row.metric_date <= dateTo
        }
        if (!include) return
        const dealer = dealersMap[row.dealer_id]
        if (!dealer?.state) return
        if (selectedState !== 'all' && dealer.state !== selectedState) return
        agg[monthKey] += ((row[selectedKpi] as number) || 0)
      })
      return relevantMonths.map((m) => ({
        month: m.label,
        value: agg[m.key],
      }))
    }
  }, [metrics, overviewCalls, dealersMap, selectedKpi, selectedState, viewMode, dateFrom, dateTo])

  // Top 15 dealers (alphabetical) as placeholder
  const top15Dealers = useMemo(() => dealers.slice(0, 15), [dealers])

  const totalZone = zonePieData.reduce((s, d) => s + d.value, 0)
  const totalTier = tierPieData.reduce((s, d) => s + d.value, 0)
  const kpiLabel = KPI_OPTIONS.find((o) => o.value === selectedKpi)?.label ?? selectedKpi
  const stateBarHeight = 320

  const selectCls =
    'h-9 rounded-lg border border-slate-200 bg-white px-3 text-[13px] text-slate-700 ' +
    'focus:border-indigo-400 focus:outline-none transition'

  // ── JSX ──────────────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-[1440px] px-6 lg:px-8 py-6 lg:py-8 space-y-6">

      {/* ── Header ── */}
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Overview</h1>
        <p className="text-sm text-slate-500 mt-1">Aggregate performance across all dealers</p>
      </div>

      {/* ── KPI Strip (11 cards, 4 per row) ── */}
      {loading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 11 }).map((_, i) => (
              <div key={i} className="bg-slate-100 animate-pulse rounded-xl h-20" />
            ))}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Row 1 */}
          <KpiCard
            icon={<Eye size={16} className="text-blue-500" />}
            label="Impressions"
            value={formatMillions(kpi.totalImpressions)}
          />
          <KpiCard
            icon={<MousePointerClick size={16} className="text-amber-500" />}
            label="Clicks"
            value={formatMillions(kpi.totalClicks)}
          />
          <KpiCard
            icon={<Activity size={16} className="text-slate-300" />}
            label="Reach"
            value="—"
            note="Meta API (coming soon)"
          />
          <KpiCard
            icon={<TrendingUp size={16} className="text-indigo-500" />}
            label="Spend vs Planned"
            value={(() => {
              const totalBudget = overviewBudgets
                .filter((b: any) => b.platform === 'total')
                .reduce((s: number, b: any) => s + (b.budget_inr || 0), 0)
              return totalBudget > 0
                ? `${formatCurrency(kpi.totalSpend)} / ${formatCurrency(totalBudget)}`
                : '—'
            })()}
            subtitle={(() => {
              const totalBudget = overviewBudgets
                .filter((b: any) => b.platform === 'total')
                .reduce((s: number, b: any) => s + (b.budget_inr || 0), 0)
              if (totalBudget === 0) return 'No budget data'
              const pct = ((kpi.totalSpend / totalBudget) * 100).toFixed(1)
              return `${pct}% of planned budget`
            })()}
          />

          {/* Row 2 */}
          <KpiCard
            icon={<TrendingUp size={16} className="text-indigo-500" />}
            label="Avg CPC (Google)"
            value={`₹${kpi.avgCpc.toFixed(2)}`}
          />
          <KpiCard
            icon={<Eye size={16} className="text-purple-500" />}
            label="Avg CPM (Meta)"
            value={`₹${kpi.avgCpm.toFixed(2)}`}
          />
          <KpiCard
            icon={<Zap size={16} className="text-amber-500" />}
            label="Overall CTR"
            value={kpi.overallCtr.toFixed(2)}
            suffix="%"
          />
          <KpiCard
            icon={<Phone size={16} className="text-emerald-500" />}
            label="Calls"
            value={formatNumber(overviewCalls.reduce((s: number, r: any) => s + (r.calls_received || 0), 0))}
          />

          {/* Row 3 */}
          <KpiCard
            icon={<MapPin size={16} className="text-emerald-500" />}
            label="Store Visits"
            value={formatNumber(kpi.storeVisits)}
            subtitle="From Google Ads"
          />
          <KpiCard
            icon={<Navigation size={16} className="text-emerald-500" />}
            label="Driving Directions"
            value={formatNumber(kpi.directions)}
            subtitle="From Google Ads"
          />
          <KpiCard
            icon={<Activity size={16} className="text-blue-500" />}
            label="Website Visits"
            value={formatNumber(kpi.websiteVisits)}
          />
        </div>
      )}

      {/* ── Performance Trends ── */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
        <div className="border-b border-slate-100 pb-4 mb-6">
          <span className="text-sm font-semibold text-slate-800">Performance Trends</span>
        </div>

        {/* Controls row */}
        <div className="flex flex-wrap gap-3 items-end mb-6">
          <div>
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">KPI</label>
            <select
              value={selectedKpi}
              onChange={(e) => setSelectedKpi(e.target.value)}
              className={selectCls}
            >
              {KPI_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {viewMode === 'monthly' ? (
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">Month</label>
              <select
                value={selectedChartMonth}
                onChange={(e) => setSelectedChartMonth(e.target.value)}
                className={selectCls}
              >
                {CHART_MONTH_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">
                  From Date
                </label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="min-w-[140px] px-3 h-9 border border-slate-200 rounded-lg text-[13px] text-slate-700 bg-white focus:border-indigo-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">
                  To Date
                </label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="min-w-[140px] px-3 h-9 border border-slate-200 rounded-lg text-[13px] text-slate-700 bg-white focus:border-indigo-400 focus:outline-none"
                />
              </div>
            </>
          )}

          {/* Toggle */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wide invisible">
              View
            </label>
            <div className="flex gap-1 h-9 bg-slate-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('monthly')}
                className={`px-3 rounded-md text-[13px] font-medium transition ${
                  viewMode === 'monthly'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setViewMode('daterange')}
                className={`px-3 rounded-md text-[13px] font-medium transition ${
                  viewMode === 'daterange'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Date Range
              </button>
            </div>
          </div>
        </div>

        {/* Two pie charts */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-slate-100 animate-pulse rounded-xl h-72" />
            <div className="bg-slate-100 animate-pulse rounded-xl h-72" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">

            {/* Left: By Zone */}
            <div>
              <p className="text-sm font-semibold text-slate-700 mb-3">By Zone</p>
              {zonePieData.length === 0 ? (
                <div className="flex items-center justify-center h-60 text-sm text-slate-400">
                  No data for selected period
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <div className="flex flex-col justify-center min-w-[90px]">
                    <div className="text-xl font-bold text-slate-900">
                      {fmtKpiValue(totalZone, selectedKpi)}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">{kpiLabel}</div>
                  </div>
                  <div className="flex-1">
                    <ResponsiveContainer width="100%" height={260}>
                      <PieChart>
                        <Pie
                          data={zonePieData}
                          cx="50%"
                          cy="45%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {zonePieData.map((entry) => (
                            <Cell key={entry.name} fill={ZONE_COLORS[entry.name] ?? '#cbd5e1'} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                        <Legend
                          iconType="circle"
                          iconSize={8}
                          wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>

            {/* Right: By Tier */}
            <div>
              <p className="text-sm font-semibold text-slate-700 mb-3">By Tier</p>
              {tierPieData.length === 0 ? (
                <div className="flex items-center justify-center h-60 text-sm text-slate-400">
                  No data for selected period
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <div className="flex flex-col justify-center min-w-[90px]">
                    <div className="text-xl font-bold text-slate-900">
                      {fmtKpiValue(totalTier, selectedKpi)}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">{kpiLabel}</div>
                  </div>
                  <div className="flex-1">
                    <ResponsiveContainer width="100%" height={260}>
                      <PieChart>
                        <Pie
                          data={tierPieData}
                          cx="50%"
                          cy="45%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {tierPieData.map((entry) => (
                            <Cell key={entry.name} fill={TIER_COLORS[entry.name] ?? '#cbd5e1'} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                        <Legend
                          iconType="circle"
                          iconSize={8}
                          wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>

          </div>
        )}

        {/* Divider */}
        <div className="border-t border-slate-100 my-6" />

        {/* State bar chart */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-slate-700">By State</p>
            <select
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              className={selectCls}
            >
              {STATE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {loading ? (
            <div className="bg-slate-100 animate-pulse rounded-xl h-64" />
          ) : stateBarData.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-sm text-slate-400">
              No data for selected period
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={stateBarHeight}>
              <BarChart
                data={stateBarData}
                margin={{ top: 0, right: 8, left: 8, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                />
                <YAxis
                  tickFormatter={(v: number) => formatNumber(v)}
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  width={60}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="value"
                  fill="#6366f1"
                  radius={[4, 4, 0, 0]}
                  barSize={28}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Top 15 Performers Table ── */}
      <div>
        <div className="flex items-center justify-between border-l-4 border-indigo-500 pl-3 mb-3">
          <div>
            <span className="text-sm font-semibold text-slate-800">Top Performers — Call Volume</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          {dealers.length === 0 && loading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="bg-slate-100 animate-pulse rounded h-10" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table
                className="w-full text-sm"
                style={{ tableLayout: 'fixed', minWidth: '1000px' }}
              >
                <colgroup>
                  <col style={{ width: '48px' }} />
                  <col style={{ width: '242px' }} />
                  <col style={{ width: '107px' }} />
                  <col style={{ width: '78px' }} />
                  <col style={{ width: '111px' }} />
                  <col style={{ width: '126px' }} />
                  <col style={{ width: '111px' }} />
                  <col style={{ width: '165px' }} />
                </colgroup>
                <thead>
                  <tr className="bg-slate-50">
                    <th className="text-xs uppercase text-slate-400 font-medium px-4 py-3 text-center">#</th>
                    <th className="text-xs uppercase text-slate-400 font-medium px-4 py-3 text-center">Store Name</th>
                    <th className="text-xs uppercase text-slate-400 font-medium px-4 py-3 text-center">Zone</th>
                    <th className="text-xs uppercase text-slate-400 font-medium px-4 py-3 text-center">Tier</th>
                    <th className="text-xs uppercase text-slate-400 font-medium px-4 py-3 text-center">Calls</th>
                    <th className="text-xs uppercase text-slate-400 font-medium px-4 py-3 text-center">Answered</th>
                    <th className="text-xs uppercase text-slate-400 font-medium px-4 py-3 text-center">Missed</th>
                    <th className="text-xs uppercase text-slate-400 font-medium px-4 py-3 text-center">Answered %</th>
                  </tr>
                </thead>
                <tbody>
                  {topPerformers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-12 text-slate-400">
                        No data for selected period
                      </td>
                    </tr>
                  ) : (
                    topPerformers.map((d: any, i: number) => {
                      const pct = d.calls_received > 0
                        ? Math.round((d.calls_answered / d.calls_received) * 100)
                        : 0
                      return (
                        <tr key={d.dealer_id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 text-slate-400 text-xs font-mono border-b border-slate-50 text-center">{i + 1}</td>
                          <td className="px-4 py-3 font-medium text-slate-900 text-sm border-b border-slate-50 truncate text-center">{d.dealer_name}</td>
                          <td className="px-4 py-3 text-slate-500 text-sm border-b border-slate-50 text-center">{d.zone}</td>
                          <td className="px-4 py-3 text-slate-500 text-sm border-b border-slate-50 text-center">{d.tier}</td>
                          <td className="px-4 py-3 text-slate-700 text-sm border-b border-slate-50 text-center">{formatNumber(d.calls_received)}</td>
                          <td className="px-4 py-3 text-slate-700 text-sm border-b border-slate-50 text-center">{formatNumber(d.calls_answered)}</td>
                          <td className="px-4 py-3 text-slate-700 text-sm border-b border-slate-50 text-center">{formatNumber(d.calls_missed)}</td>
                          <td className="px-4 py-3 border-b border-slate-50 text-center">
                            <div className="flex items-center gap-2 min-w-[120px] mx-auto">
                              <div className="flex-1 bg-slate-100 h-2 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-indigo-500 rounded-full transition-all"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="text-xs text-slate-500 w-8 text-right">
                                {pct > 0 ? `${pct}%` : '—'}
                              </span>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
