'use client'

import { useEffect, useState, useMemo } from 'react'
import type { ReactNode } from 'react'
import { getDealers, getMetrics, getLatestMetricDate, getCallMetrics, getBudgets, getAdCreatives } from '@/lib/queries'
import { exportDealerPPT } from '@/lib/exportPPT'
import { Select } from '@/components/ui/select'
import {
  Download, Navigation, MapPin, Phone, Eye, Zap, TrendingUp, Activity, Camera,
} from 'lucide-react'

// ─── Constants ────────────────────────────────────────────────────────────────

const MONTH_OPTIONS = [
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

const CALL_MONTHS = [
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

function computeDateRange(
  viewMode: 'monthly' | 'daterange',
  selectedMonth: string,
  dateFrom: string,
  dateTo: string
): { from: string; to: string } {
  if (viewMode === 'daterange') return { from: dateFrom, to: dateTo }
  if (!selectedMonth || selectedMonth === 'all') return { from: '2025-05-28', to: '2026-03-31' }
  const [year, month] = selectedMonth.split('-')
  const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate()
  return { from: `${selectedMonth}-01`, to: `${selectedMonth}-${String(lastDay).padStart(2, '0')}` }
}

function groupCampaigns(rows: any[]) {
  const map: Record<string, { name: string; impressions: number; clicks: number; spend: number }> = {}
  rows.forEach((row) => {
    const name = (row.campaign_name as string | null) || '(No Campaign)'
    if (!map[name]) map[name] = { name, impressions: 0, clicks: 0, spend: 0 }
    map[name].impressions += (row.impressions as number) || 0
    map[name].clicks += (row.link_clicks as number) || 0
    map[name].spend += (row.spend_inr as number) || 0
  })
  return Object.values(map).map((c) => ({
    name: c.name,
    impressions: c.impressions,
    clicks: c.clicks,
    spend: c.spend,
    ctr: c.impressions > 0 ? ((c.clicks / c.impressions) * 100).toFixed(2) : '0.00',
    cpc: c.clicks > 0 ? (c.spend / c.clicks).toFixed(2) : '0.00',
    cpm: c.impressions > 0 ? ((c.spend / c.impressions) * 1000).toFixed(2) : '0.00',
  }))
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string | null | undefined }) {
  if (!status) return <span className="text-slate-400">—</span>
  const s = status.toLowerCase()
  let cls = 'bg-red-50 text-red-700 border border-red-200'
  if (s.includes('active') || s.includes('live') || s.includes('complete') || s.includes('enabled')) {
    cls = 'bg-green-50 text-green-700 border border-green-200'
  } else if (s.includes('pause')) {
    cls = 'bg-amber-50 text-amber-700 border border-amber-200'
  }
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cls}`}>{status}</span>
}

function SectionHeader({
  left,
  right,
  borderColor = 'border-indigo-500',
}: {
  left: ReactNode
  right?: string
  borderColor?: string
}) {
  return (
    <div className={`flex items-center justify-between border-l-4 ${borderColor} pl-3 mb-3`}>
      <div className="flex items-center gap-2">{left}</div>
      {right && <span className="text-xs text-slate-400">{right}</span>}
    </div>
  )
}

function KpiCard({
  icon,
  label,
  value,
  note,
  subtitle,
  bgClass = 'bg-white',
}: {
  icon: ReactNode
  label: string
  value: string
  note?: string
  subtitle?: string
  bgClass?: string
}) {
  return (
    <div className={`${bgClass} rounded-xl border border-slate-200 shadow p-5`}>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs text-slate-500 uppercase tracking-wide font-medium">{label}</span>
      </div>
      <div className={`text-2xl font-bold ${note ? 'text-slate-400' : 'text-slate-900'}`}>{value}</div>
      {subtitle && <div className="text-xs text-slate-400 mt-1">{subtitle}</div>}
      {note && <div className="text-xs text-slate-400 mt-1">{note}</div>}
    </div>
  )
}

// ─── Table style constants ────────────────────────────────────────────────────

const TH = 'text-xs uppercase text-slate-400 font-medium px-4 py-3 text-right whitespace-nowrap'
const TD = 'px-4 py-3 text-slate-700 border-b border-slate-50 text-right text-sm'

// ─── Campaign table component ─────────────────────────────────────────────────

function CampaignTable({
  campaigns,
  dealerStatus,
  showCpm,
  isAllDealers,
  budgetInr,
  reachValue,
  showReachLabel,
}: {
  campaigns: ReturnType<typeof groupCampaigns>
  dealerStatus: string | null | undefined
  showCpm: boolean
  isAllDealers: boolean
  budgetInr?: number
  reachValue?: number
  showReachLabel?: boolean
}) {
  if (campaigns.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400 text-sm">No data for selected period</div>
    )
  }

  // Summary totals used for the all-dealers aggregated row
  const totalImpressions = campaigns.reduce((s, c) => s + c.impressions, 0)
  const totalClicks = campaigns.reduce((s, c) => s + c.clicks, 0)
  const totalSpend = campaigns.reduce((s, c) => s + c.spend, 0)
  const summaryCtr = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : '0.00'
  const summaryCpc = totalClicks > 0 ? (totalSpend / totalClicks).toFixed(2) : '0.00'
  const summaryCpm = totalImpressions > 0 ? ((totalSpend / totalImpressions) * 1000).toFixed(2) : '0.00'
  const campaignCount = campaigns.length

  return (
    <table className="w-full table-fixed text-sm">
      <thead>
        <tr className="bg-slate-50">
          <th className={`${TH} text-left w-[28%]`}>Campaign Name</th>
          <th className={`${TH} text-center w-[7%]`}>Status</th>
          <th className={`${TH} text-center w-[10%]`}>Period</th>
          <th className={`${TH} text-right w-[7%]`}>Budget</th>
          <th className={`${TH} text-right w-[7%]`}>
            {showReachLabel !== false ? 'Reach' : ''}
          </th>
          <th className={`${TH} text-right w-[9%]`}>Impressions</th>
          <th className={`${TH} text-right w-[7%]`}>CTR %</th>
          <th className={`${TH} text-right w-[8%]`}>{showCpm ? 'CPM ₹' : 'CPC ₹'}</th>
          <th className={`${TH} text-right w-[8%]`}>Link Clicks</th>
          <th className={`${TH} text-right w-[9%]`}>Spend ₹</th>
        </tr>
      </thead>
      <tbody>
        {isAllDealers ? (
          // All Dealers mode: single aggregated summary row
          <tr className="hover:bg-slate-50 transition-colors">
            <td className={`${TD} text-left w-[28%]`}>
              <span className="text-slate-500 italic">{campaignCount} campaigns</span>
            </td>
            <td className={`${TD} text-center w-[7%]`}><span className="text-slate-400">—</span></td>
            <td className={`${TD} text-center w-[10%]`}><span className="text-slate-400">—</span></td>
            <td className={`${TD} text-right w-[7%]`}>
              {budgetInr && budgetInr > 0 ? formatCurrency(budgetInr) : <span className="text-slate-400">—</span>}
            </td>
            <td
              className={`${TD} text-right w-[7%]`}
              title={showReachLabel !== false && !reachValue ? "Live Meta API — coming soon" : undefined}
            >
              {showReachLabel === false ? (
                <span className="text-slate-200">—</span>
              ) : reachValue && reachValue > 0 ? (
                <span className="text-slate-700 font-medium">
                  {formatNumber(reachValue)}
                </span>
              ) : (
                <span className="text-slate-400">—*</span>
              )}
            </td>
            <td className={`${TD} text-right w-[9%]`}>{formatNumber(totalImpressions)}</td>
            <td className={`${TD} text-right w-[7%]`}>{summaryCtr}%</td>
            <td className={`${TD} text-right w-[8%]`}>₹{showCpm ? summaryCpm : summaryCpc}</td>
            <td className={`${TD} text-right w-[8%]`}>{formatNumber(totalClicks)}</td>
            <td className={`${TD} text-right w-[9%]`}>{formatCurrency(totalSpend)}</td>
          </tr>
        ) : (
          // Single dealer mode: one row per campaign
          campaigns.map((c, i) => (
            <tr key={i} className="hover:bg-slate-50 transition-colors">
              <td className={`${TD} text-left font-medium text-slate-900 w-[28%] truncate max-w-0`}>
                <span className="block truncate" title={c.name}>{c.name}</span>
              </td>
              <td className={`${TD} text-center w-[7%]`}>
                <StatusBadge status={dealerStatus} />
              </td>
              <td className={`${TD} text-center w-[10%]`}><span className="text-slate-400">—</span></td>
              <td className={`${TD} text-right w-[7%]`}>
                {budgetInr && budgetInr > 0 ? formatCurrency(budgetInr) : <span className="text-slate-400">—</span>}
              </td>
              <td
                className={`${TD} text-right w-[7%]`}
                title={showReachLabel !== false && !reachValue ? "Live Meta API — coming soon" : undefined}
              >
                {showReachLabel === false ? (
                  <span className="text-slate-200">—</span>
                ) : reachValue && reachValue > 0 ? (
                  <span className="text-slate-700 font-medium">
                    {formatNumber(reachValue)}
                  </span>
                ) : (
                  <span className="text-slate-400">—*</span>
                )}
              </td>
              <td className={`${TD} text-right w-[9%]`}>{formatNumber(c.impressions)}</td>
              <td className={`${TD} text-right w-[7%]`}>{c.ctr}%</td>
              <td className={`${TD} text-right w-[8%]`}>₹{showCpm ? c.cpm : c.cpc}</td>
              <td className={`${TD} text-right w-[8%]`}>{formatNumber(c.clicks)}</td>
              <td className={`${TD} text-right w-[9%]`}>{formatCurrency(c.spend)}</td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DealersPage() {
  const [dealers, setDealers] = useState<any[]>([])
  const [selectedDealerId, setSelectedDealerId] = useState('')
  const [displayMetrics, setDisplayMetrics] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'monthly' | 'daterange'>('monthly')
  const [selectedMonth, setSelectedMonth] = useState('all')
  const [dateFrom, setDateFrom] = useState('2025-05-28')
  const [dateTo, setDateTo] = useState('2026-03-31')
  const [latestDate, setLatestDate] = useState('—')
  const [callMetrics, setCallMetrics] = useState<any[]>([])
  const [budgets, setBudgets] = useState<any[]>([])
  const [creativesData, setCreativesData] = useState<{ google: any[]; facebook: any[]; instagram: any[] }>({ google: [], facebook: [], instagram: [] })
  const [creativesLoading, setCreativesLoading] = useState(false)

  // Load dealers + latest date on mount
  useEffect(() => {
    getDealers().then(setDealers)
    getLatestMetricDate().then(setLatestDate).catch(() => {})
  }, [])

  // Load metrics whenever filters change
  useEffect(() => {
    if (dealers.length === 0) return
    let cancelled = false

    async function load() {
      setLoading(true)
      try {
        const { from, to } = computeDateRange(viewMode, selectedMonth, dateFrom, dateTo)
        const ids = selectedDealerId ? [selectedDealerId] : dealers.map((d: any) => d.id)
        const data = await getMetrics(ids, from, to, [])
        if (!cancelled) setDisplayMetrics(data)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [dealers, selectedDealerId, selectedMonth, dateFrom, dateTo, viewMode])

  // Load call metrics whenever filters change
  useEffect(() => {
    if (dealers.length === 0) return
    const { from, to } = computeDateRange(viewMode, selectedMonth, dateFrom, dateTo)
    const monthFrom = from.substring(0, 7)
    const monthTo = to.substring(0, 7)
    const ids = selectedDealerId ? [selectedDealerId] : dealers.map((d: any) => d.id)
    getCallMetrics(ids, monthFrom, monthTo).then(setCallMetrics)
  }, [dealers, selectedDealerId, selectedMonth, dateFrom, dateTo, viewMode])

  // Load budgets whenever dealer selection changes
  useEffect(() => {
    if (dealers.length === 0) return
    const ids = selectedDealerId ? [selectedDealerId] : dealers.map((d: any) => d.id)
    getBudgets(ids).then(setBudgets)
  }, [dealers, selectedDealerId])

  useEffect(() => {
    if (!selectedDealerId) {
      setCreativesData({ google: [], facebook: [], instagram: [] })
      return
    }
    setCreativesLoading(true)
    getAdCreatives(selectedDealerId)
      .then(data => setCreativesData(data))
      .catch(err => console.error('creatives fetch error:', err))
      .finally(() => setCreativesLoading(false))
  }, [selectedDealerId])

  // ── Derived state ────────────────────────────────────────────────────────────

  const selectedDealer = useMemo(
    () => dealers.find((d: any) => d.id === selectedDealerId) ?? null,
    [dealers, selectedDealerId]
  )

  const isSingleDay = useMemo(() => {
    const { from, to } = computeDateRange(viewMode, selectedMonth, dateFrom, dateTo)
    return from === to
  }, [viewMode, selectedMonth, dateFrom, dateTo])

  const reachByPlatform = useMemo(() => {
    if (!isSingleDay) return { facebook: 0, instagram: 0 }
    let facebook = 0
    let instagram = 0
    displayMetrics.forEach((m: any) => {
      if (m.platform === 'facebook') facebook += m.reach || 0
      if (m.platform === 'instagram') instagram += m.reach || 0
    })
    return { facebook, instagram }
  }, [displayMetrics, isSingleDay])

  const kpi = useMemo(() => {
    let totalSpend = 0, totalImpressions = 0, totalClicks = 0, websiteVisits = 0
    displayMetrics.forEach((m: any) => {
      totalSpend += m.spend_inr || 0
      if (m.platform === 'google' || m.platform === 'facebook' || m.platform === 'instagram') {
        totalImpressions += m.impressions || 0
        totalClicks += m.link_clicks || 0
      }
      if (m.platform === 'ga4') websiteVisits += m.website_visits || 0
    })
    return { totalSpend, totalImpressions, totalClicks, websiteVisits }
  }, [displayMetrics])

  const googleCampaigns = useMemo(
    () => groupCampaigns(displayMetrics.filter((m: any) => m.platform === 'google')),
    [displayMetrics]
  )
  const facebookCampaigns = useMemo(
    () => groupCampaigns(displayMetrics.filter((m: any) => m.platform === 'facebook')),
    [displayMetrics]
  )
  const instagramCampaigns = useMemo(
    () => groupCampaigns(displayMetrics.filter((m: any) => m.platform === 'instagram')),
    [displayMetrics]
  )

  const conversions = useMemo(() => {
    let directions = 0, storeVisits = 0, websiteVisits = 0, callNumberTrack = 0, callTrack = 0,
      downloadCatalogue = 0, driveDirection = 0, enquiryTrack = 0, formSubmit = 0
    displayMetrics.forEach((m: any) => {
      if (m.platform === 'google') {
        directions += m.driving_directions || 0
        storeVisits += m.store_visits || 0
      }
      if (m.platform === 'ga4') {
        websiteVisits += m.website_visits || 0
        callNumberTrack += m.event_call_number_track || 0
        callTrack += m.event_call_track || 0
        downloadCatalogue += m.event_download_catalogue || 0
        driveDirection += m.event_drive_direction || 0
        enquiryTrack += m.event_enquiry_track || 0
        formSubmit += m.event_form_submit || 0
      }
    })
    return { directions, storeVisits, websiteVisits, callNumberTrack, callTrack, downloadCatalogue, driveDirection, enquiryTrack, formSubmit }
  }, [displayMetrics])

  const callTotals = useMemo(() => {
    const received = callMetrics.reduce((s: number, r: any) => s + (r.calls_received || 0), 0)
    const answered = callMetrics.reduce((s: number, r: any) => s + (r.calls_answered || 0), 0)
    const missed = callMetrics.reduce((s: number, r: any) => s + (r.calls_missed || 0), 0)
    const dialled = callMetrics.reduce((s: number, r: any) => s + (r.calls_dialled || 0), 0)
    return { received, answered, missed, dialled }
  }, [callMetrics])

  const googleBudget = useMemo(() =>
    budgets
      .filter((b: any) => b.platform === 'google')
      .reduce((s: number, b: any) => s + (b.budget_inr || 0), 0),
    [budgets]
  )

  const facebookBudget = useMemo(() =>
    budgets
      .filter((b: any) => b.platform === 'facebook')
      .reduce((s: number, b: any) => s + (b.budget_inr || 0), 0),
    [budgets]
  )

  const instagramBudget = useMemo(() =>
    budgets
      .filter((b: any) => b.platform === 'instagram')
      .reduce((s: number, b: any) => s + (b.budget_inr || 0), 0),
    [budgets]
  )

  const callSummaryMonths = useMemo(() => {
    if (viewMode === 'monthly' && selectedMonth !== 'all') {
      return CALL_MONTHS.filter((m) => m.value === selectedMonth)
    }
    if (viewMode === 'daterange') {
      return CALL_MONTHS.filter(
        (m) => m.value >= dateFrom.substring(0, 7) && m.value <= dateTo.substring(0, 7)
      )
    }
    return CALL_MONTHS
  }, [viewMode, selectedMonth, dateFrom, dateTo])

  // ── PPT Export ───────────────────────────────────────────────────────────────

  async function handleExportPPT() {
    if (!selectedDealerId) {
      alert('Please select a dealer first')
      return
    }
    if (!selectedDealer) return

    const { from, to } = computeDateRange(viewMode, selectedMonth, dateFrom, dateTo)
    let dateRangeText = ''
    if (viewMode === 'monthly') {
      dateRangeText = !selectedMonth || selectedMonth === 'all'
        ? 'May 2025 – Mar 2026'
        : new Date(selectedMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    } else {
      dateRangeText = `${from} to ${to}`
    }

    const sum = (arr: any[], key: string) => arr.reduce((s: number, r: any) => s + (r[key] || 0), 0)
    const avgField = (arr: any[], key: string) =>
      arr.length > 0 ? (arr.reduce((s: number, r: any) => s + parseFloat(r[key] || 0), 0) / arr.length).toFixed(2) : '0.00'

    const gRows = displayMetrics.filter((r: any) => r.platform === 'google')
    const fbRows = displayMetrics.filter((r: any) => r.platform === 'facebook')
    const igRows = displayMetrics.filter((r: any) => r.platform === 'instagram')
    const ga4Rows = displayMetrics.filter((r: any) => r.platform === 'ga4')

    const fbSpend = sum(fbRows, 'spend_inr')
    const igSpend = sum(igRows, 'spend_inr')
    const fbImpressions = sum(fbRows, 'impressions')
    const igImpressions = sum(igRows, 'impressions')

    const result = await exportDealerPPT({
      dealerName: selectedDealer.dealer_name,
      dateRange: dateRangeText,
      google: {
        impressions: formatNumber(sum(gRows, 'impressions')),
        clicks: formatNumber(sum(gRows, 'link_clicks')),
        ctr: avgField(gRows, 'ctr_percent') + '%',
        spent: formatCurrency(sum(gRows, 'spend_inr')),
        cpc: '₹' + avgField(gRows, 'avg_cpc_inr'),
      },
      facebook: {
        impressions: formatNumber(sum(fbRows, 'impressions')),
        clicks: formatNumber(sum(fbRows, 'link_clicks')),
        ctr: avgField(fbRows, 'ctr_percent') + '%',
        spent: formatCurrency(fbSpend),
        cpm: '₹' + (fbImpressions > 0 ? ((fbSpend / fbImpressions) * 1000).toFixed(2) : '0.00'),
      },
      instagram: {
        impressions: formatNumber(sum(igRows, 'impressions')),
        clicks: formatNumber(sum(igRows, 'link_clicks')),
        ctr: avgField(igRows, 'ctr_percent') + '%',
        spent: formatCurrency(igSpend),
        cpm: '₹' + (igImpressions > 0 ? ((igSpend / igImpressions) * 1000).toFixed(2) : '0.00'),
      },
      conversions: {
        directions: formatNumber(sum(gRows, 'driving_directions')),
        visits: formatNumber(sum(ga4Rows, 'website_visits')),
        events: formatNumber(sum(ga4Rows, 'event_count')),
      },
    })

    const binaryString = atob(result.buffer)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i)
    const blob = new Blob([bytes], {
      type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = result.fileName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // ── JSX ──────────────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-[1440px] px-6 lg:px-8 py-6 lg:py-8">

      {/* ── Header ── */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200 mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Marketing Campaign Reports</h1>
        <span className="text-xs text-slate-400">Updated till: {latestDate}</span>
      </div>

      {/* ── Filter Bar ── */}
      <div className="flex flex-wrap items-end gap-3 mb-6 bg-white rounded-xl border border-slate-200 shadow px-5 py-4">

        {/* Dealer select */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
            Select Dealer
          </label>
          <Select
            value={selectedDealerId}
            onChange={(e) => setSelectedDealerId(e.target.value)}
            className="min-w-[280px] h-9 rounded-lg border border-slate-200 bg-white px-3 text-[13px] text-slate-700 focus:border-indigo-400 focus:outline-none"
          >
            <option value="">-- All Dealers (Aggregated) --</option>
            {dealers.map((d: any) => (
              <option key={d.id} value={d.id}>{d.dealer_name}</option>
            ))}
          </Select>
        </div>

        {/* Month or date inputs */}
        {viewMode === 'monthly' ? (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
              Month
            </label>
            <Select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="min-w-[200px] h-9 rounded-lg border border-slate-200 bg-white px-3 text-[13px] text-slate-700 focus:border-indigo-400 focus:outline-none"
            >
              {MONTH_OPTIONS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </Select>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                From Date
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="min-w-[140px] px-3 h-9 border border-slate-200 rounded-lg text-[13px] text-slate-700 bg-white focus:border-indigo-400 focus:outline-none"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
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

        {/* Download PPT */}
        <div className="ml-auto flex flex-col gap-1.5">
          <label className="text-xs font-medium text-slate-500 uppercase tracking-wide invisible">
            Export
          </label>
          <button
            onClick={handleExportPPT}
            className="h-9 px-3.5 rounded-lg text-[13px] font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition flex items-center gap-2 shadow-sm"
          >
            <Download size={15} />
            Download PPT
          </button>
        </div>
      </div>

      {/* ── Loading skeleton ── */}
      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-slate-100 animate-pulse rounded-xl h-24" />
            ))}
          </div>
          <div className="bg-slate-100 animate-pulse rounded-xl h-48" />
          <div className="bg-slate-100 animate-pulse rounded-xl h-48" />
          <div className="bg-slate-100 animate-pulse rounded-xl h-48" />
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {/* ── KPI Strip ── */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <KpiCard
              icon={<TrendingUp size={16} className="text-indigo-500" />}
              label="Total Spend"
              value={formatCurrency(kpi.totalSpend)}
            />
            <KpiCard
              icon={<Eye size={16} className="text-blue-500" />}
              label="Impressions"
              value={formatNumber(kpi.totalImpressions)}
            />
            <KpiCard
              icon={<Activity size={16} className="text-slate-300" />}
              label="Reach"
              value="—"
              note="Meta API (coming soon)"
            />
            <KpiCard
              icon={<Zap size={16} className="text-amber-500" />}
              label="Link Clicks"
              value={formatNumber(kpi.totalClicks)}
            />
            <KpiCard
              icon={<Activity size={16} className="text-emerald-500" />}
              label="Website Visits"
              value={formatNumber(kpi.websiteVisits)}
            />
            <KpiCard
              icon={<Phone size={16} className="text-emerald-500" />}
              label="Calls"
              value={callTotals.received > 0 ? formatNumber(callTotals.received) : '—'}
              subtitle={callTotals.received > 0
                ? `${Math.round((callTotals.answered / callTotals.received) * 100)}% answered`
                : 'No call data'}
            />
          </div>

          {/* ── Google Ads Table ── */}
          <div className="bg-white rounded-xl border border-slate-200 shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 border-l-4 border-indigo-500 pl-3">
                  <span className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                    G
                  </span>
                  <span className="text-sm font-semibold text-slate-800">Google Ads</span>
                </div>
                <span className="text-xs text-slate-400">Campaign performance for selected period</span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <CampaignTable
                campaigns={googleCampaigns}
                dealerStatus={selectedDealer?.campaign_status}
                showCpm={false}
                isAllDealers={!selectedDealerId}
                budgetInr={googleBudget}
                showReachLabel={false}
                reachValue={undefined}
              />
            </div>
          </div>

          {/* ── Facebook Ads Table ── */}
          <div className="bg-white rounded-xl border border-slate-200 shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 border-l-4 border-indigo-500 pl-3">
                  <span className="w-5 h-5 rounded-full bg-[#1877F2] flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                    f
                  </span>
                  <span className="text-sm font-semibold text-slate-800">Facebook Ads</span>
                </div>
                <span className="text-xs text-slate-400">Campaign performance for selected period</span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <CampaignTable
                campaigns={facebookCampaigns}
                dealerStatus={selectedDealer?.campaign_status}
                showCpm={true}
                isAllDealers={!selectedDealerId}
                budgetInr={facebookBudget}
                showReachLabel={true}
                reachValue={isSingleDay ? reachByPlatform.facebook : undefined}
              />
            </div>
          </div>

          {/* ── Instagram Ads Table ── */}
          <div className="bg-white rounded-xl border border-slate-200 shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 border-l-4 border-indigo-500 pl-3">
                  <span className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045)' }}>
                    IG
                  </span>
                  <span className="text-sm font-semibold text-slate-800">Instagram Ads</span>
                </div>
                <span className="text-xs text-slate-400">Campaign performance for selected period</span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <CampaignTable
                campaigns={instagramCampaigns}
                dealerStatus={selectedDealer?.campaign_status}
                showCpm={true}
                isAllDealers={!selectedDealerId}
                budgetInr={instagramBudget}
                showReachLabel={true}
                reachValue={isSingleDay ? reachByPlatform.instagram : undefined}
              />
            </div>
          </div>

          {/* ── Conversions Section ── */}
          <div className="bg-white rounded-xl border border-slate-200 shadow p-6">
            <div className="flex items-center justify-between border-l-4 border-emerald-500 pl-3 mb-6">
              <span className="text-sm font-semibold text-slate-800">Conversions &amp; Website Activity</span>
              <span className="text-xs text-slate-400">Real-time conversion tracking</span>
            </div>

            {/* Row 1: 2 KPI cards */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <KpiCard
                icon={<Navigation size={16} className="text-emerald-500" />}
                label="Driving Directions"
                value={formatNumber(conversions.directions)}
                subtitle="From Google Ads"
                bgClass="bg-slate-50"
              />
              <KpiCard
                icon={<MapPin size={16} className="text-emerald-500" />}
                label="Store Visits"
                value={formatNumber(conversions.storeVisits)}
                subtitle="From Google Ads"
                bgClass="bg-slate-50"
              />
            </div>

            {/* Row 2: Website visits + Call summary side by side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">

              {/* Website Visits & User Journey */}
              <div className="bg-slate-50 rounded-xl border border-slate-200 shadow-sm p-4">
                <h3 className="text-sm font-semibold text-slate-800 mb-3">Website Visits &amp; User Journey</h3>
                <table className="w-full">
                  <tbody>
                    <tr>
                      <td className="py-2 text-sm text-slate-700 font-medium">Website Visits</td>
                      <td className="py-2 text-right text-xl font-bold text-slate-900 font-mono">
                        {formatNumber(conversions.websiteVisits)}
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={2} className="py-0">
                        <div className="border-t border-slate-200 my-1" />
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={2} className="py-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        User Journey
                      </td>
                    </tr>
                    {[
                      { label: 'Call Number Track', value: conversions.callNumberTrack },
                      { label: 'Call Track', value: conversions.callTrack },
                      { label: 'Download Catalogue', value: conversions.downloadCatalogue },
                      { label: 'Drive Direction (GA4 event)', value: conversions.driveDirection },
                      { label: 'Enquiry Track', value: conversions.enquiryTrack },
                      { label: 'Form Submit', value: conversions.formSubmit },
                    ].map(({ label, value }) => (
                      <tr key={label}>
                        <td className="py-1.5 pl-4 text-sm text-slate-600">{label}</td>
                        <td className="py-1.5 text-right text-sm font-mono text-slate-700">
                          {formatNumber(value)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Call Summary */}
              <div className="bg-slate-50 rounded-xl border border-slate-200 shadow-sm p-4">
                <h3 className="text-sm font-semibold text-slate-800">Call Summary</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm table-fixed">
                    <thead>
                      <tr className="bg-slate-50">
                        <th className="text-xs uppercase text-slate-400 font-medium px-3 py-2 text-center whitespace-nowrap w-[15%]">Month</th>
                        <th className="text-xs uppercase text-slate-400 font-medium px-3 py-2 text-center whitespace-nowrap w-[17%]">Calls Received</th>
                        <th className="text-xs uppercase text-slate-400 font-medium px-3 py-2 text-center whitespace-nowrap w-[16%]">Answered</th>
                        <th className="text-xs uppercase text-slate-400 font-medium px-3 py-2 text-center whitespace-nowrap w-[14%]">Missed</th>
                        <th className="text-xs uppercase text-slate-400 font-medium px-3 py-2 text-center whitespace-nowrap w-[14%]">Dialled</th>
                        <th className="text-xs uppercase text-slate-400 font-medium px-3 py-2 text-center whitespace-nowrap w-[24%]">Answered %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {callSummaryMonths.map((m) => {
                        const row = callMetrics.find((r: any) => r.month === m.value)
                        const pct = row && row.calls_received > 0
                          ? Math.round((row.calls_answered / row.calls_received) * 100)
                          : 0
                        return (
                          <tr key={m.value} className="border-b border-slate-50">
                            <td className="px-3 py-2 text-center text-slate-700 w-[15%]">{m.label}</td>
                            <td className="px-3 py-2 text-center text-slate-700 w-[17%]">
                              {row ? formatNumber(row.calls_received) : '—'}
                            </td>
                            <td className="px-3 py-2 text-center text-slate-700 w-[16%]">
                              {row ? formatNumber(row.calls_answered) : '—'}
                            </td>
                            <td className="px-3 py-2 text-center text-slate-700 w-[14%]">
                              {row ? formatNumber(row.calls_missed) : '—'}
                            </td>
                            <td className="px-3 py-2 text-center text-slate-700 w-[14%]">
                              {row ? formatNumber(row.calls_dialled) : '—'}
                            </td>
                            <td className="px-3 py-2 text-center w-[24%]">
                              <div className="flex items-center justify-center gap-2 min-w-[100px]">
                                <div className="flex-1 bg-slate-100 h-2 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-indigo-500 rounded-full transition-all"
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                                <span className="text-xs text-slate-500 w-8">
                                  {row && row.calls_received > 0 ? `${pct}%` : '—'}
                                </span>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {/* ── Ad Creatives (only when a dealer is selected) ── */}
{selectedDealerId && (
  <div>
    <div className="flex items-center justify-between border-l-4 border-pink-500 pl-3 mb-4">
      <span className="text-sm font-semibold text-slate-800">Ad Creatives</span>
      <span className="text-xs text-slate-400">All creatives for this dealer</span>
    </div>

    {creativesLoading ? (
      <div className="text-center py-12 text-slate-400 text-sm">Loading creatives...</div>
    ) : (creativesData.google.length === 0 && creativesData.facebook.length === 0 && creativesData.instagram.length === 0) ? (
      <div className="text-center py-12 text-slate-400 text-sm">No creatives found for this dealer</div>
    ) : (
      <div className="flex flex-col gap-6">
        {/* Google strip */}
        {creativesData.google.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full">Google</span>
              <span className="text-xs text-slate-400">{creativesData.google.length} creatives</span>
            </div>
            <div className="overflow-x-auto">
              <div className="flex flex-row gap-3 pb-2" style={{ minWidth: 'max-content' }}>
                {creativesData.google.map((c, i) => (
                  <div key={i} className="w-48 bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden flex-shrink-0">
                    <div className="h-32 bg-slate-50 overflow-hidden">
                      <img
                        src={c.storage_url}
                        alt={c.headline || c.ad_name || 'Google creative'}
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                      />
                    </div>
                    <div className="p-2.5">
                      <p className="text-xs text-slate-600 font-medium leading-tight line-clamp-2">
                        {c.headline || c.ad_name || c.campaign_name}
                      </p>
                      {c.description && (
                        <p className="text-xs text-slate-400 mt-1 line-clamp-1">{c.description}</p>
                      )}
                      <span className="text-xs px-1.5 py-0.5 rounded-full mt-1.5 inline-block bg-blue-50 text-blue-700 border border-blue-100">
                        {c.creative_type || 'image'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Facebook strip */}
        {creativesData.facebook.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full">Facebook</span>
              <span className="text-xs text-slate-400">{creativesData.facebook.length} creatives</span>
            </div>
            <div className="overflow-x-auto">
              <div className="flex flex-row gap-3 pb-2" style={{ minWidth: 'max-content' }}>
                {creativesData.facebook.map((c, i) => (
                  <div key={i} className="w-48 bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden flex-shrink-0">
                    <div className="h-32 bg-slate-50 overflow-hidden">
                      <img
                        src={c.storage_url}
                        alt={c.headline || c.ad_name || 'Facebook creative'}
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                      />
                    </div>
                    <div className="p-2.5">
                      <p className="text-xs text-slate-600 font-medium leading-tight line-clamp-2">
                        {c.headline || c.ad_name || c.campaign_name}
                      </p>
                      {c.description && (
                        <p className="text-xs text-slate-400 mt-1 line-clamp-1">{c.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Instagram strip */}
        {creativesData.instagram.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-semibold text-pink-700 bg-pink-50 border border-pink-100 px-2 py-0.5 rounded-full">Instagram</span>
              <span className="text-xs text-slate-400">{creativesData.instagram.length} creatives</span>
            </div>
            <div className="overflow-x-auto">
              <div className="flex flex-row gap-3 pb-2" style={{ minWidth: 'max-content' }}>
                {creativesData.instagram.map((c, i) => (
                  <div key={i} className="w-48 bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden flex-shrink-0">
                    <div className="h-32 bg-slate-50 overflow-hidden">
                      <img
                        src={c.storage_url}
                        alt={c.headline || c.ad_name || 'Instagram creative'}
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                      />
                    </div>
                    <div className="p-2.5">
                      <p className="text-xs text-slate-600 font-medium leading-tight line-clamp-2">
                        {c.headline || c.ad_name || c.campaign_name}
                      </p>
                      {c.description && (
                        <p className="text-xs text-slate-400 mt-1 line-clamp-1">{c.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    )}
  </div>
)}
        </div>
      )}
    </div>
  )
}
