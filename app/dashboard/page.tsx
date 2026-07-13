'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts'
import { getDealers, getMetrics, getMetricsSummary, getMetricsByDealerMonth, getCallMetrics, getBudgets, getReach } from '@/lib/queries'
import { TrendingUp, MapPin, Activity, Phone, Navigation, Eye, Zap, MousePointerClick } from 'lucide-react'
import { ALL_TIME_DATE_FROM, ALL_TIME_DATE_TO } from '@/lib/constants'
import { DateRangeFilter, isRangeMonthAligned, type DateRange } from '@/components/DateRangeFilter'

// Full data range — used to preload the month-grain RPC + calls once on mount.
const DATE_FROM = ALL_TIME_DATE_FROM
const DATE_TO = ALL_TIME_DATE_TO

// ─── Chart constants ──────────────────────────────────────────────────────────

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

const TOP_PERFORMERS_KPI_OPTIONS = [
  { value: 'calls_received', label: 'Call Volume' },
  { value: 'website_visits', label: 'Website Visits' },
  { value: 'driving_directions', label: 'Driving Directions' },
] as const

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
  title,
}: {
  icon: React.ReactNode
  label: string
  value: string
  note?: string
  prefix?: string
  suffix?: string
  subtitle?: string
  title?: string
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4" title={title}>
      <div className="flex items-center gap-2 mb-1.5">
        {icon}
        <span className="text-[11px] text-slate-500 uppercase tracking-wide font-medium">{label}</span>
      </div>
      <div className="text-xl font-bold text-slate-900">
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
  // Month-aligned ranges (incl. All-time default): fast pre-aggregated
  // (dealer, month, platform) rows from RPC, preloaded once over the full range.
  const [monthlyAgg, setMonthlyAgg] = useState<any[]>([])
  // Day-precise ranges only: raw day-level rows, fetched scoped to the selected
  // window (never the full year) whenever a non-month-aligned range is chosen.
  const [rangeMetrics, setRangeMetrics] = useState<any[]>([])
  const [rangeLoading, setRangeLoading] = useState(false)
  const rangeCacheKey = useRef('')
  const [metricsSummary, setMetricsSummary] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [overviewCalls, setOverviewCalls] = useState<any[]>([])
  const [overviewBudgets, setOverviewBudgets] = useState<any[]>([])

  // Single date filter driving the whole page — presets + calendar. Default = All time.
  const [range, setRange] = useState<DateRange>({ from: ALL_TIME_DATE_FROM, to: ALL_TIME_DATE_TO })
  const monthAligned = useMemo(() => isRangeMonthAligned(range.from, range.to), [range])
  const fromMonth = range.from.substring(0, 7)
  const toMonth = range.to.substring(0, 7)

  // chart controls
  const [selectedKpi, setSelectedKpi] = useState('driving_directions')
  const [topPerformersKpi, setTopPerformersKpi] = useState<'calls_received' | 'website_visits' | 'driving_directions'>('calls_received')
  const [selectedState, setSelectedState] = useState('all')

  // Live Meta reach KPI card — live call, now scoped to the selected range.
  const [reachData, setReachData] = useState<Awaited<ReturnType<typeof getReach>>>(null)
  const [reachLoading, setReachLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setReachLoading(true)
    getReach(null, range.from, range.to, ['facebook', 'instagram']).then((data) => {
      if (cancelled) return
      setReachData(data)
      setReachLoading(false)
    })
    return () => { cancelled = true }
  }, [range])

  // Load range-independent data once on mount: dealers, the month-grain RPC (full
  // range, powers month-aligned chart views incl. All-time), all-period calls, and
  // static budgets. The raw scan is NOT run here — it's deferred to the day-precise
  // effect below, and the KPI summary has its own range-reactive effect.
  useEffect(() => {
    let cancelled = false
    async function init() {
      setLoading(true)
      try {
        const allDealers = await getDealers()
        if (!cancelled) setDealers(allDealers)
        const dealerIds = allDealers.map((d: any) => d.id)
        const agg = await getMetricsByDealerMonth(dealerIds, DATE_FROM, DATE_TO, [])
        if (!cancelled) setMonthlyAgg(agg)
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

  // KPI-strip totals — range-reactive, always the fast platform-grain RPC for ANY
  // range (incl. All-time). Never a raw scan. Fires once dealers load, then on range change.
  useEffect(() => {
    if (dealers.length === 0) return
    let cancelled = false
    const dealerIds = dealers.map((d: any) => d.id)
    getMetricsSummary(dealerIds, range.from, range.to, []).then((summary) => {
      if (!cancelled) setMetricsSummary(summary)
    })
    return () => { cancelled = true }
  }, [dealers, range])

  // Scoped raw fetch — ONLY for day-precise (non-month-aligned) ranges. Month-aligned
  // ranges (incl. the All-time default) use monthlyAgg and never hit this, so default
  // load fires zero raw scans. Scoped to [from,to] so e.g. "Last 7 days" is a tiny fetch.
  useEffect(() => {
    if (monthAligned) return
    if (dealers.length === 0) return
    const key = `${range.from}|${range.to}`
    if (rangeCacheKey.current === key) return
    let cancelled = false
    setRangeLoading(true)
    const dealerIds = dealers.map((d: any) => d.id)
    getMetrics(dealerIds, range.from, range.to, [])
      .then((data) => {
        if (cancelled) return
        setRangeMetrics(data)
        rangeCacheKey.current = key
      })
      .finally(() => { if (!cancelled) setRangeLoading(false) })
    return () => { cancelled = true }
  }, [monthAligned, range, dealers])

  // ── KPI computations ─────────────────────────────────────────────────────────

  // KPI totals are computed server-side (SUM/COUNT in Postgres via get_metrics_summary),
  // not by looping over the full raw `metrics` array. Derived ratios (CPC/CPM/CTR) are
  // computed from these SUMMED totals — never averaged from per-row ctr_percent/avg_cpc_inr,
  // which would produce a mathematically wrong blended rate.
  const summaryByPlatform = useMemo(() => {
    const map: Record<string, any> = {}
    metricsSummary.forEach((row: any) => { map[row.platform] = row })
    return map
  }, [metricsSummary])

  const kpi = useMemo(() => {
    const google = summaryByPlatform['google'] || {}
    const facebook = summaryByPlatform['facebook'] || {}
    const instagram = summaryByPlatform['instagram'] || {}
    const ga4 = summaryByPlatform['ga4'] || {}
    const gmb = summaryByPlatform['gmb'] || {}

    const directions = Number(gmb.total_driving_directions) || 0
    const storeVisits = Number(gmb.total_store_visits) || 0
    const websiteVisits = Number(ga4.total_website_visits) || 0

    const googleSpend = Number(google.total_spend_inr) || 0
    const googleClicks = Number(google.total_link_clicks) || 0

    const metaSpend = (Number(facebook.total_spend_inr) || 0) + (Number(instagram.total_spend_inr) || 0)
    const metaImpressions = (Number(facebook.total_impressions) || 0) + (Number(instagram.total_impressions) || 0)

    const totalClicks = googleClicks + (Number(facebook.total_link_clicks) || 0) + (Number(instagram.total_link_clicks) || 0)
    const totalImpressions = (Number(google.total_impressions) || 0) + metaImpressions

    const avgCpc = googleClicks > 0 ? googleSpend / googleClicks : 0
    const avgCpm = metaImpressions > 0 ? (metaSpend / metaImpressions) * 1000 : 0
    const overallCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0
    const totalSpend = googleSpend + metaSpend

    return { directions, storeVisits, websiteVisits, avgCpc, avgCpm, overallCtr, totalSpend, totalImpressions, totalClicks }
  }, [summaryByPlatform])

  // Calls KPI — range-reactive via month overlap (call_metrics is month-grain).
  const callsReceivedInRange = useMemo(
    () => overviewCalls
      .filter((r: any) => r.month >= fromMonth && r.month <= toMonth)
      .reduce((s: number, r: any) => s + (r.calls_received || 0), 0),
    [overviewCalls, fromMonth, toMonth]
  )

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
      // Calls have only month grain, so range filtering is always by month overlap.
      if (!(r.month >= fromMonth && r.month <= toMonth)) return
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
  }, [overviewCalls, dealers, fromMonth, toMonth])

  // ── Top Performers (website visits / driving directions) ───────────────────────
  // Same metrics/date-filter pattern as topPerformers above, but sourced from
  // `metrics` (daily_metrics) gated by platform, mirroring the `kpi` useMemo's
  // explicit platform gate rather than the pie/bar charts' implicit null-field reliance.

  const topPerformersByMetric = useMemo(() => {
    if (topPerformersKpi === 'calls_received') return []
    const platform = topPerformersKpi === 'website_visits' ? 'ga4' : 'gmb'
    const field = topPerformersKpi
    const byDealer: Record<string, number> = {}
    const rows = monthAligned ? monthlyAgg : rangeMetrics
    rows.forEach((row: any) => {
      if (row.platform !== platform) return
      const include = monthAligned
        ? (row.month >= fromMonth && row.month <= toMonth)
        : (row.metric_date >= range.from && row.metric_date <= range.to)
      if (!include) return
      byDealer[row.dealer_id] = (byDealer[row.dealer_id] || 0) + (row[field] || 0)
    })
    return Object.entries(byDealer)
      .map(([dealer_id, value]) => {
        const dealer = dealers.find((od: any) => od.id === dealer_id)
        return {
          dealer_id,
          value,
          dealer_name: dealer?.dealer_name ?? '—',
          zone: dealer?.zone ?? '—',
          tier: dealer?.market ?? '—',
        }
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, 15)
  }, [monthlyAgg, rangeMetrics, dealers, topPerformersKpi, monthAligned, fromMonth, toMonth, range])

  // ── Pie chart data ────────────────────────────────────────────────────────────

  const zonePieData = useMemo((): { name: string; value: number }[] => {
    const agg: Record<string, number> = {}
    if (selectedKpi === 'calls_received') {
      const answeredAgg: Record<string, number> = {}
      const missedAgg: Record<string, number> = {}
      overviewCalls.forEach((r: any) => {
        if (!(r.month >= fromMonth && r.month <= toMonth)) return
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
      const rows = monthAligned ? monthlyAgg : rangeMetrics
      rows.forEach((row: any) => {
        const include = monthAligned
          ? (row.month >= fromMonth && row.month <= toMonth)
          : (row.metric_date >= range.from && row.metric_date <= range.to)
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
  }, [monthlyAgg, rangeMetrics, overviewCalls, dealersMap, selectedKpi, monthAligned, fromMonth, toMonth, range])

  const tierPieData = useMemo((): { name: string; value: number }[] => {
    const agg: Record<string, number> = {}
    if (selectedKpi === 'calls_received') {
      const answeredAgg: Record<string, number> = {}
      const missedAgg: Record<string, number> = {}
      overviewCalls.forEach((r: any) => {
        if (!(r.month >= fromMonth && r.month <= toMonth)) return
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
      const rows = monthAligned ? monthlyAgg : rangeMetrics
      rows.forEach((row: any) => {
        const include = monthAligned
          ? (row.month >= fromMonth && row.month <= toMonth)
          : (row.metric_date >= range.from && row.metric_date <= range.to)
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
  }, [monthlyAgg, rangeMetrics, overviewCalls, dealersMap, selectedKpi, monthAligned, fromMonth, toMonth, range])

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
    // Only show month buckets that fall within the selected range.
    const relevantMonths = MONTHS_FOR_CHART.filter(m => m.key >= fromMonth && m.key <= toMonth)
    relevantMonths.forEach((m) => { agg[m.key] = 0 })

    if (selectedKpi === 'calls_received') {
      const answeredAgg: Record<string, number> = {}
      const missedAgg: Record<string, number> = {}
      relevantMonths.forEach((m) => { answeredAgg[m.key] = 0; missedAgg[m.key] = 0 })
      overviewCalls.forEach((r: any) => {
        if (!agg.hasOwnProperty(r.month)) return
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
      const rows = monthAligned ? monthlyAgg : rangeMetrics
      rows.forEach((row: any) => {
        const monthKey = monthAligned ? row.month : row.metric_date?.substring(0, 7)
        if (!monthKey || !agg.hasOwnProperty(monthKey)) return
        // For day-precise ranges, also clip to exact day bounds within the edge months.
        if (!monthAligned && !(row.metric_date >= range.from && row.metric_date <= range.to)) return
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
  }, [monthlyAgg, rangeMetrics, overviewCalls, dealersMap, selectedKpi, selectedState, monthAligned, fromMonth, toMonth, range])

  // Top 15 dealers (alphabetical) as placeholder
  const top15Dealers = useMemo(() => dealers.slice(0, 15), [dealers])

  // Charts show a loading state during the initial mount fetch AND during a
  // day-precise scoped raw fetch, so they never flash a misleading "No data for
  // selected period" while rangeMetrics is still in flight.
  const chartsLoading = loading || (!monthAligned && rangeLoading)

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
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Overview</h1>
          <p className="text-sm text-slate-500 mt-1">Aggregate performance across all dealers</p>
        </div>
        <DateRangeFilter value={range} onChange={setRange} />
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
            value={
              reachLoading ? '…'
              : reachData?.reach == null ? '—'
              : formatMillions(reachData.reach)
            }
            note={
              reachLoading ? 'All Meta campaigns'
              : reachData?.reach == null ? 'Reach unavailable'
              : reachData.dealers_covered < reachData.dealers_requested
                ? `All Meta campaigns · ${reachData.dealers_covered}/${reachData.dealers_requested} dealers`
                : 'All Meta campaigns'
            }
            title={!reachLoading && reachData?.reach == null ? 'Reach unavailable — check connection' : undefined}
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
            value={formatNumber(callsReceivedInRange)}
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

        {/* Controls row — the date filter now lives in the page header (top-right);
            this row keeps only the chart's own KPI selector. */}
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
        </div>

        {/* Two pie charts */}
        {chartsLoading ? (
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
                  <div className="flex-1 aspect-square max-w-[260px] min-h-[170px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={zonePieData}
                          cx="50%"
                          cy="45%"
                          innerRadius="48%"
                          outerRadius="80%"
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
                  <div className="flex-1 aspect-square max-w-[260px] min-h-[170px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={tierPieData}
                          cx="50%"
                          cy="45%"
                          innerRadius="48%"
                          outerRadius="80%"
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

          {chartsLoading ? (
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
            <span className="text-sm font-semibold text-slate-800">
              Top (#15) Performers - {TOP_PERFORMERS_KPI_OPTIONS.find((o) => o.value === topPerformersKpi)?.label}
            </span>
          </div>
          <select
            value={topPerformersKpi}
            onChange={(e) => setTopPerformersKpi(e.target.value as typeof topPerformersKpi)}
            className={selectCls}
          >
            {TOP_PERFORMERS_KPI_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          {dealers.length === 0 && loading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="bg-slate-100 animate-pulse rounded h-10" />
              ))}
            </div>
          ) : topPerformersKpi === 'calls_received' ? (
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
          ) : (
            <div className="overflow-x-auto">
              <table
                className="w-full text-sm"
                style={{ tableLayout: 'fixed', minWidth: '700px' }}
              >
                <colgroup>
                  <col style={{ width: '48px' }} />
                  <col style={{ width: '300px' }} />
                  <col style={{ width: '140px' }} />
                  <col style={{ width: '100px' }} />
                  <col style={{ width: '165px' }} />
                </colgroup>
                <thead>
                  <tr className="bg-slate-50">
                    <th className="text-xs uppercase text-slate-400 font-medium px-4 py-3 text-center">#</th>
                    <th className="text-xs uppercase text-slate-400 font-medium px-4 py-3 text-center">Store Name</th>
                    <th className="text-xs uppercase text-slate-400 font-medium px-4 py-3 text-center">Zone</th>
                    <th className="text-xs uppercase text-slate-400 font-medium px-4 py-3 text-center">Tier</th>
                    <th className="text-xs uppercase text-slate-400 font-medium px-4 py-3 text-center">
                      {TOP_PERFORMERS_KPI_OPTIONS.find((o) => o.value === topPerformersKpi)?.label}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {topPerformersByMetric.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-12 text-slate-400">
                        No data for selected period
                      </td>
                    </tr>
                  ) : (
                    topPerformersByMetric.map((d, i) => (
                      <tr key={d.dealer_id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 text-slate-400 text-xs font-mono border-b border-slate-50 text-center">{i + 1}</td>
                        <td className="px-4 py-3 font-medium text-slate-900 text-sm border-b border-slate-50 truncate text-center">{d.dealer_name}</td>
                        <td className="px-4 py-3 text-slate-500 text-sm border-b border-slate-50 text-center">{d.zone}</td>
                        <td className="px-4 py-3 text-slate-500 text-sm border-b border-slate-50 text-center">{d.tier}</td>
                        <td className="px-4 py-3 text-slate-700 text-sm border-b border-slate-50 text-center">{formatNumber(d.value)}</td>
                      </tr>
                    ))
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
