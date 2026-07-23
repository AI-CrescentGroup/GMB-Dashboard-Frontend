'use client'

import { useEffect, useState, useMemo } from 'react'
import type { ReactNode } from 'react'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid,
} from 'recharts'
import { getDealers, getMetrics, getMetricsSummary, getCampaignSummary, getMetricsByDealerMonth, getLatestMetricDate, getCallMetrics, getBudgets, getAdCreatives, getAdPreviews, getGoogleAdPreviews, getReach } from '@/lib/queries'
import { exportDealerPPT } from '@/lib/exportPPT'
import { Select } from '@/components/ui/select'
import { ALL_TIME_DATE_FROM, ALL_TIME_DATE_TO } from '@/lib/constants'
import { DateRangeFilter, type DateRange } from '@/components/DateRangeFilter'
import {
  Download, Navigation, MapPin, TrendingUp, Activity, Camera, HelpCircle, X,
  Eye, MousePointerClick, Percent, IndianRupee, Gauge,
} from 'lucide-react'

// ─── Constants ────────────────────────────────────────────────────────────────

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
  if (val >= 10_000_000) return `${(val / 10_000_000).toFixed(2)}Cr`
  if (val >= 100_000) return `${(val / 100_000).toFixed(2)}L`
  if (val >= 1_000) return `${(val / 1_000).toFixed(2)}K`
  return val.toLocaleString('en-IN')
}

function formatCurrency(val: number): string {
  if (val >= 10_000_000) return `₹${(val / 10_000_000).toFixed(2)}Cr`
  if (val >= 100_000) return `₹${(val / 100_000).toFixed(2)}L`
  if (val >= 1_000) return `₹${(val / 1_000).toFixed(2)}K`
  return `₹${val.toLocaleString('en-IN')}`
}

// Reach / Clicks / Impressions only. These run to the billions, so they get a
// raw integer under 1K, K through the thousands, and "M+" (not "Mn") from a
// million up — the "+" reads as "at least this much" for a rounded headline
// figure. The exact count is always one hover away via exactValue() below.
function formatReachStyle(val: number): string {
  // Up to 2 decimals, trailing zeros trimmed — "2.07M+" keeps both, but a round
  // axis tick reads "350M+" rather than "350.00M+".
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(2).replace(/\.?0+$/, '')}M+`
  if (val >= 1_000) return `${(val / 1_000).toFixed(1)}K`
  return val.toLocaleString('en-IN')
}

// Store Visits / Website Visits / Driving Directions — every count-type metric
// that ISN'T reach/clicks/impressions. Same L/Cr thresholds and 2-decimal
// precision as formatCurrency above, just without the ₹: these are read by an
// Indian audience where lakh/crore is the natural scale for this magnitude.
function formatLakhStyle(val: number): string {
  if (val >= 10_000_000) return `${(val / 10_000_000).toFixed(2)}Cr`
  if (val >= 100_000) return `${(val / 100_000).toFixed(2)}L`
  if (val >= 1_000) return `${(val / 1_000).toFixed(1)}K`
  return val.toLocaleString('en-IN')
}

// Hover text for every value rendered through the two formatters above —
// applied unconditionally, including to values under 1K that are already exact.
// An abbreviated number should never be the only version a dealer can see.
function exactValue(val: number): string {
  return val.toLocaleString('en-IN')
}

function formatPeriod(startDate: string | null, endDate: string | null): string {
  if (!startDate || !endDate) return '—'
  const fmt = (d: string) => {
    const dt = new Date(d)
    const day = dt.getDate()
    const month = dt.toLocaleString('en-US', { month: 'short' })
    const year = String(dt.getFullYear()).slice(-2)
    return `${day} ${month}'${year}`
  }
  return `${fmt(startDate)}–${fmt(endDate)}`
}

function groupCampaigns(rows: any[]) {
  const map: Record<string, {
    name: string; impressions: number; clicks: number; spend: number;
    startDate: string | null; endDate: string | null
  }> = {}
  rows.forEach((row) => {
    const name = (row.campaign_name as string | null) || '(No Campaign)'
    if (!map[name]) map[name] = { name, impressions: 0, clicks: 0, spend: 0, startDate: null, endDate: null }
    map[name].impressions += (row.impressions as number) || 0
    map[name].clicks += (row.link_clicks as number) || 0
    map[name].spend += (row.spend_inr as number) || 0
    const rowStart = row.start_date as string | null
    const rowEnd = row.end_date as string | null
    if (rowStart && (!map[name].startDate || rowStart < map[name].startDate!)) {
      map[name].startDate = rowStart
    }
    if (rowEnd && (!map[name].endDate || rowEnd > map[name].endDate!)) {
      map[name].endDate = rowEnd
    }
  })
  return Object.values(map).map((c) => ({
    name: c.name,
    impressions: c.impressions,
    clicks: c.clicks,
    spend: c.spend,
    startDate: c.startDate,
    endDate: c.endDate,
    ctr: c.impressions > 0 ? ((c.clicks / c.impressions) * 100).toFixed(2) : '0.00',
    cpc: c.clicks > 0 ? (c.spend / c.clicks).toFixed(2) : '0.00',
    cpm: c.impressions > 0 ? ((c.spend / c.impressions) * 1000).toFixed(2) : '0.00',
  }))
}

// Same aggregate formula CampaignTable uses internally for its "Results from N
// campaigns" row (totalSpend/totalClicks/totalImpressions/summaryCtr/summaryCpc) —
// hoisted here so the platform share chart + cards can reuse the identical sums
// without a second data path. Always fed the same googleCampaigns/facebookCampaigns/
// instagramCampaigns arrays already passed to the tables.
function platformTotals(campaigns: ReturnType<typeof groupCampaigns>) {
  const spend = campaigns.reduce((s, c) => s + c.spend, 0)
  const clicks = campaigns.reduce((s, c) => s + c.clicks, 0)
  const impressions = campaigns.reduce((s, c) => s + c.impressions, 0)
  const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0
  const cpc = clicks > 0 ? spend / clicks : 0
  const cpm = impressions > 0 ? (spend / impressions) * 1000 : 0
  return { spend, clicks, impressions, ctr, cpc, cpm }
}

const PLATFORM_COLORS = { google: '#2a78d6', facebook: '#1baf7a', instagram: '#e34948' } as const

// Derive the KPI-strip totals from get_metrics_summary rows (one row per platform).
// Mirrors the original raw-row logic exactly: spend summed across ALL platforms;
// impressions/clicks only from google/facebook/instagram; website visits only from ga4.
// Number() coercion is required because PostgREST serializes numeric (spend) as a string.
function kpiFromSummary(rows: any[]) {
  let totalSpend = 0, totalImpressions = 0, totalClicks = 0, websiteVisits = 0
  rows.forEach((r: any) => {
    totalSpend += Number(r.total_spend_inr) || 0
    if (r.platform === 'google' || r.platform === 'facebook' || r.platform === 'instagram') {
      totalImpressions += Number(r.total_impressions) || 0
      totalClicks += Number(r.total_link_clicks) || 0
    }
    if (r.platform === 'ga4') websiteVisits += Number(r.total_website_visits) || 0
  })
  return { totalSpend, totalImpressions, totalClicks, websiteVisits }
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
  title,
}: {
  icon: ReactNode
  label: string
  value: string
  note?: string
  subtitle?: string
  bgClass?: string
  title?: string
}) {
  return (
    <div className={`${bgClass} rounded-xl border border-slate-200 shadow px-4 py-3`} title={title}>
      <div className="flex items-center gap-1.5 mb-1.5">
        {icon}
        <span className="text-[11px] text-slate-500 uppercase tracking-wide font-medium">{label}</span>
      </div>
      <div className="text-xl font-bold text-slate-900">{value}</div>
      {subtitle && <div className="text-[11px] text-slate-400 mt-0.5">{subtitle}</div>}
      {note && <div className="text-[11px] text-slate-400 mt-0.5">{note}</div>}
    </div>
  )
}

// Shared pill-toggle style — used by MetricLineChart's metric buttons and
// the Audience Demographics cards' platform toggles, so both read as one
// design language (filled/dark = active, outline/muted = inactive).
function toggleButtonClass(active: boolean): string {
  return active
    ? 'px-3 py-1.5 rounded-full text-[12px] font-medium bg-indigo-600 text-white shadow-sm whitespace-nowrap'
    : 'px-3 py-1.5 rounded-full text-[12px] font-medium bg-white text-slate-500 border border-slate-200 hover:bg-slate-50 whitespace-nowrap'
}

// Small pill showing the currently-selected date range, top-right of each chart card.
function RangeChip({ label }: { label: string }) {
  return (
    <span className="text-[11px] text-slate-500 bg-slate-50 border border-slate-100 rounded-full px-2.5 py-1 whitespace-nowrap">
      {label}
    </span>
  )
}

// Calls doughnut — Answered / Missed split, total shown as text beside the ring.
// Reuses callTotals (no new fetch). call_metrics is month-grain, so a day-precise
// range reflects the containing month(s), which is expected.
function CallsDoughnut({
  answered, missed, received, rangeLabel,
}: { answered: number; missed: number; received: number; rangeLabel: string }) {
  const data = [
    { name: 'Answered', value: answered, color: '#1baf7a' },
    { name: 'Missed', value: missed, color: '#e34948' },
  ]
  // % of total calls RECEIVED (not answered+missed) — Answered + Missed won't
  // sum to 100%; the remainder is Dialled, which is intentional. Guard /0 → '—'.
  const pctOfReceived = (v: number) => (received > 0 ? `${((v / received) * 100).toFixed(2)}%` : '—')
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow p-5 h-full">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-semibold text-slate-800">Calls</span>
        <RangeChip label={rangeLabel} />
      </div>
      {received === 0 ? (
        <div className="flex items-center justify-center h-[200px] text-sm text-slate-400">No call data</div>
      ) : (
        <div className="flex items-center gap-5">
          <div className="w-[150px] h-[150px] shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data} dataKey="value" innerRadius="62%" outerRadius="100%" paddingAngle={2} stroke="none">
                  {data.map((d) => <Cell key={d.name} fill={d.color} />)}
                </Pie>
                <Tooltip formatter={(v: any, n: any) => [`${Number(v).toLocaleString('en-IN')} (${pctOfReceived(Number(v))})`, n]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-col gap-3">
            <div>
              <div className="text-[11px] text-slate-400 uppercase tracking-wide">Total calls</div>
              <div className="text-2xl font-bold text-slate-900">{received.toLocaleString('en-IN')}</div>
            </div>
            <div className="flex flex-col gap-1.5">
              {data.map((d) => (
                <div key={d.name} className="flex items-center gap-2 text-[13px]">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                  <span className="text-slate-600">{d.name}</span>
                  <span className="ml-auto flex items-baseline gap-1.5">
                    <span className="text-slate-900 font-medium">{d.value.toLocaleString('en-IN')}</span>
                    <span className="text-slate-400 text-[11px]">{pctOfReceived(d.value)}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const LINE_METRIC_OPTIONS = [
  { value: 'driving_directions', label: 'Driving Directions' },
  { value: 'website_visits', label: 'Website Visits' },
  { value: 'link_clicks', label: 'Clicks' },
  { value: 'impressions', label: 'Impressions' },
] as const

// Single-series monthly trend. y-axis compact; tooltip shows exact absolute value.
function MetricLineChart({
  series, metric, onMetric, rangeLabel,
}: {
  series: { month: string; value: number }[]
  metric: string
  onMetric: (m: string) => void
  rangeLabel: string
}) {
  const metricLabel = LINE_METRIC_OPTIONS.find((o) => o.value === metric)?.label ?? metric
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow p-5 h-full">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex flex-wrap items-center gap-1.5">
          {LINE_METRIC_OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => onMetric(o.value)}
              className={toggleButtonClass(metric === o.value)}
            >
              {o.label}
            </button>
          ))}
        </div>
        <RangeChip label={rangeLabel} />
      </div>
      {series.length === 0 ? (
        <div className="flex items-center justify-center h-[240px] text-sm text-slate-400">No data for selected period</div>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={series} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} />
            <YAxis tickFormatter={(v: number) => compactAxis(v)} tick={{ fontSize: 11, fill: '#94a3b8' }} width={52} />
            <Tooltip formatter={(v: any) => [Number(v).toLocaleString('en-IN'), metricLabel]} />
            <Line type="monotone" dataKey="value" stroke="#2a78d6" strokeWidth={2} dot={{ r: 3, fill: '#2a78d6' }} activeDot={{ r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}

// Compact axis ticks: 12.3M / 45.6K / 789.
function compactAxis(val: number): string {
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`
  if (val >= 1_000) return `${(val / 1_000).toFixed(1)}K`
  return `${val}`
}

// "2025-10" → "Oct '25" for the x-axis.
function monthShort(monthKey: string): string {
  const d = new Date(monthKey + '-01T00:00:00')
  return `${d.toLocaleDateString('en-US', { month: 'short' })} '${String(d.getFullYear()).slice(2)}`
}

// "2025-05-28" → "28 May" for the range chip.
function chipDate(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

// ─── Platform-wise visualization (cards first, share charts below) ───────────
// Pure placement/visualization layer — every number here is a pass-through of
// googleTotals/facebookTotals/instagramTotals (identical formula to the campaign
// table's own aggregate row) and the existing tableReach state. No new fetch,
// no new metric math.

// Grid width for any section that renders one block per active platform. Tailwind
// needs literal class names, so the count maps to a fixed class rather than being
// interpolated: 1 platform fills the row, 2 split it evenly, 3 keep today's layout.
const PLATFORM_GRID_COLS: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-3',
}

const PLATFORM_SHARE_ROWS: { key: 'spend' | 'clicks' | 'impressions'; label: string }[] = [
  { key: 'spend', label: 'Spend' },
  { key: 'clicks', label: 'Clicks' },
  { key: 'impressions', label: 'Impressions' },
]

function formatShareValue(key: 'spend' | 'clicks' | 'impressions', value: number): string {
  return key === 'spend' ? formatCurrency(value) : formatReachStyle(value)
}

function PlatformShareCharts({
  google, facebook, instagram, platforms,
}: {
  google: { spend: number; clicks: number; impressions: number }
  facebook: { spend: number; clicks: number; impressions: number }
  instagram: { spend: number; clicks: number; impressions: number }
  // Only the platforms this dealer runs campaigns on. Absent platforms lose
  // their legend dot AND their entry in every Spend/Clicks/Impressions row —
  // and are excluded from the row total, so the percentages re-base correctly.
  platforms: readonly ('google' | 'instagram' | 'facebook')[]
}) {
  // Nothing to compare when the dealer runs no paid platforms at all.
  if (platforms.length === 0) return null
  const totalsByPlatform = { google, instagram, facebook }
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow p-5">
      <div className="flex items-center justify-between mb-5">
        <span className="text-sm font-semibold text-slate-800">Platform Share</span>
        <div className="flex items-center gap-4">
          {platforms.map((p) => (
            <div key={p} className="flex items-center gap-1.5 text-[12px] text-slate-600">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: PLATFORM_COLORS[p] }} />
              <span className="capitalize">{p}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-4">
        {PLATFORM_SHARE_ROWS.map(({ key, label }) => {
          const segments = platforms.map((p) => ({
            platform: p,
            value: totalsByPlatform[p][key],
            color: PLATFORM_COLORS[p],
          }))
          const total = segments.reduce((s, seg) => s + seg.value, 0)
          const pct = (v: number) => (total > 0 ? (v / total) * 100 : 0)
          return (
            <div key={key}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</span>
                {total === 0 && <span className="text-xs text-slate-400">No data</span>}
              </div>
              {total > 0 && (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-1.5">
                  {segments.map((s) => s.value > 0 && (
                    <span key={s.platform} className="flex items-center gap-1.5 text-[12px] text-slate-700">
                      <span className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: s.color }} />
                      {/* Spend keeps its existing currency formatting and gets no
                          exact-value hover — the tooltip covers count metrics only. */}
                      <span
                        className="font-medium"
                        title={key === 'spend' ? undefined : exactValue(s.value)}
                      >
                        {formatShareValue(key, s.value)}
                      </span>
                      <span className="text-slate-400">({pct(s.value).toFixed(1)}%)</span>
                    </span>
                  ))}
                </div>
              )}
              <div className="flex h-6 w-full rounded-md overflow-hidden bg-slate-100">
                {total === 0 ? null : segments.map((s, idx) => (
                  s.value > 0 && (
                    <div
                      key={s.platform}
                      className="h-full flex items-center justify-center text-[10px] font-medium text-white"
                      style={{
                        width: `${pct(s.value)}%`,
                        backgroundColor: s.color,
                        marginLeft: idx > 0 ? '2px' : 0,
                      }}
                      title={`${s.platform}: ${pct(s.value).toFixed(1)}%`}
                    >
                      {pct(s.value) >= 8 ? `${pct(s.value).toFixed(1)}%` : ''}
                    </div>
                  )
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function PlatformCard({
  platform, label, color, budget, spend, clicks, impressions, ctr, cpc, cpm, showCpm, reach, reachLoading,
  isAllDealers, campaignCount, singleCampaign, dealerStatus,
}: {
  platform: string
  label: string
  color: string
  budget: number
  spend: number
  clicks: number
  impressions: number
  ctr: number
  cpc: number
  cpm: number
  // Mirrors CampaignTable's own showCpm convention: false → Google (CPC, spend
  // is click-billed), true → Meta platforms (CPM, spend is impression-billed).
  showCpm: boolean
  reach?: number | null
  reachLoading?: boolean
  // Campaign identity block — same aggregate-vs-single-campaign branching the
  // (now-removed) campaign table used: "All Dealers" or multiple campaigns on
  // this platform → "N campaigns" placeholder; exactly one campaign → its own
  // name/status/period, dealerStatus being a dealer-level field (not per-campaign).
  isAllDealers: boolean
  campaignCount: number
  singleCampaign: { name: string; startDate: string | null; endDate: string | null } | null
  dealerStatus: string | null | undefined
}) {
  // `title` carries the exact-integer hover for the count rows (Reach/Clicks/
  // Impressions); currency and rate rows pass nothing and stay as they were.
  const Row = ({ label, value, title }: { label: string; value: ReactNode; title?: string }) => (
    <div className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-b-0">
      <span className="text-xs text-slate-500">{label}</span>
      <span className="text-sm font-medium text-slate-800" title={title}>{value}</span>
    </div>
  )
  const showSingle = !isAllDealers && singleCampaign !== null
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
        <span className="text-sm font-semibold text-slate-800">{label}</span>
      </div>
      <div className="mb-3 pb-3 border-b border-slate-100">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm text-slate-700 font-medium truncate" title={showSingle ? singleCampaign!.name : undefined}>
            {showSingle ? singleCampaign!.name : <span className="text-slate-500 italic">{campaignCount} campaigns</span>}
          </span>
          {showSingle ? <StatusBadge status={dealerStatus} /> : <span className="text-slate-400 text-xs">—</span>}
        </div>
        <div className="text-xs text-slate-400 mt-1">
          {showSingle && singleCampaign!.startDate && singleCampaign!.endDate
            ? formatPeriod(singleCampaign!.startDate, singleCampaign!.endDate)
            : '—'}
        </div>
      </div>
      <Row label="Budget" value={budget > 0 ? formatCurrency(budget) : <span className="text-slate-400">—</span>} />
      <Row label="Spend" value={formatCurrency(spend)} />
      {reach !== undefined && (
        <Row
          label="Reach"
          value={
            reachLoading
              ? <span className="inline-block h-3 w-3 rounded-full border-2 border-slate-300 border-t-indigo-500 animate-spin" />
              : reach == null
                ? <span className="text-slate-400">—</span>
                : formatReachStyle(reach)
          }
          title={!reachLoading && reach != null ? exactValue(reach) : undefined}
        />
      )}
      <Row label="Clicks" value={formatReachStyle(clicks)} title={exactValue(clicks)} />
      <Row label="Impressions" value={formatReachStyle(impressions)} title={exactValue(impressions)} />
      <Row label="CTR %" value={`${ctr.toFixed(2)}%`} />
      {showCpm
        ? <Row label="CPM ₹" value={`₹${cpm.toFixed(2)}`} />
        : <Row label="CPC ₹" value={`₹${cpc.toFixed(2)}`} />}
    </div>
  )
}

// ─── Shared modal shell (backdrop + outside-click-to-close) ───────────────────
// Callers own their own header/close-button styling — this only owns the
// overlay, centering, and click-outside behavior so it isn't duplicated
// between the KPI glossary and the ad creatives lightbox.

function Modal({
  onClose,
  children,
  maxWidthClass = 'max-w-4xl',
}: {
  onClose: () => void
  children: ReactNode
  maxWidthClass?: string
}) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className={`relative ${maxWidthClass} max-h-[90vh] w-full`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}

// ─── KPI glossary content ──────────────────────────────────────────────────────

const KPI_GLOSSARY: { label: string; definition: string }[] = [
  { label: 'Total Spend', definition: 'Total amount spent across Google, Facebook, and Instagram ads for the selected period.' },
  { label: 'Impressions', definition: 'Number of times your ads were displayed to users, across all platforms.' },
  { label: 'Reach', definition: 'Number of unique people who saw your Facebook or Instagram ads at least once (Meta platforms only — Google does not report reach).' },
  { label: 'Link Clicks', definition: 'Number of times users clicked through from an ad to your website or landing page.' },
  { label: 'CTR % (Click-Through Rate)', definition: 'Share of impressions that resulted in a click — link clicks divided by impressions.' },
  { label: 'CPC ₹ (Cost Per Click)', definition: 'Average amount spent per click on Google Ads — spend divided by link clicks.' },
  { label: 'CPM ₹ (Cost Per Mille)', definition: 'Average cost per 1,000 impressions on Facebook/Instagram ads — spend divided by impressions, ×1,000.' },
  { label: 'Website Visits', definition: 'Number of sessions on your website, tracked via Google Analytics (GA4).' },
  { label: 'Call Clicks', definition: 'Number of times a user tapped a tracked call button or phone number on your website.' },
  { label: 'Download Catalogue', definition: 'Number of times users downloaded a product catalogue from your website.' },
  { label: 'Drive Direction', definition: 'Number of times users requested directions from your website (GA4-tracked — distinct from the "Driving Directions" metric below, which comes from your Google Business Profile).' },
  { label: 'Enquiry Track', definition: 'Number of enquiry or contact-form interactions tracked on your website.' },
  { label: 'Form Submit', definition: 'Number of times users submitted a form on your website.' },
  { label: 'Driving Directions', definition: 'Number of times users requested directions to your store from your Google Business Profile listing.' },
  { label: 'Store Visits', definition: 'Number of visits to your physical store attributed to your Google Business Profile listing.' },
  { label: 'Calls', definition: 'Total phone calls received on your tracked number, broken down into Answered, Missed, and Dialled (attempted).' },
  { label: 'Budget', definition: 'The planned ad spend allocated to a campaign or platform for the selected period.' },
]

// ─── Creative carousel component ──────────────────────────────────────────────

function CreativeCarousel({
  platform,
  label,
  badgeClass,
  creatives,
  index,
  onIndexChange,
  onImageClick,
  showTypeTag,
}: {
  platform: string
  label: string
  badgeClass: string
  creatives: any[]
  index: number
  onIndexChange: (newIndex: number) => void
  onImageClick: () => void
  showTypeTag: boolean
}) {
  if (creatives.length === 0) return null

  const current = creatives[index]
  const canPrev = index > 0
  const canNext = index < creatives.length - 1
  // Google preview rows (google_ad_previews_current) carry no headline/ad_name/
  // campaign_name. source_deck is deliberately NOT used as a fallback here: it's
  // a category-level attribute (which dealer's deck was used as the template
  // when that brand_category's slides were rendered), identical across every
  // dealer sharing the category — showing it under a different dealer's preview
  // reads as if that dealer's name is being shown, which is misleading. Omit the
  // title line entirely for Google, same as Facebook/Instagram previews.
  const title = current.headline || current.ad_name || current.campaign_name

  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 mb-3">
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${badgeClass}`}>{label}</span>
        <span className="text-xs text-slate-400">{index + 1} of {creatives.length}</span>
      </div>
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="relative h-56 bg-slate-50">
          <img
            src={current.storage_url}
            alt={current.headline || current.ad_name || 'creative'}
            className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
            onClick={onImageClick}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
          {canPrev && (
            <button
              onClick={() => onIndexChange(index - 1)}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 shadow-md flex items-center justify-center text-slate-700 hover:bg-white transition-colors"
              aria-label="Previous creative"
            >
              ‹
            </button>
          )}
          {canNext && (
            <button
              onClick={() => onIndexChange(index + 1)}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 shadow-md flex items-center justify-center text-slate-700 hover:bg-white transition-colors"
              aria-label="Next creative"
            >
              ›
            </button>
          )}
        </div>
        <div className="p-3">
          {title && (
            <p className="text-xs text-slate-600 font-medium leading-tight line-clamp-2">
              {title}
            </p>
          )}
          {current.description && (
            <p className="text-xs text-slate-400 mt-1 line-clamp-1">{current.description}</p>
          )}
          {showTypeTag && (
            <span className="text-xs px-1.5 py-0.5 rounded-full mt-1.5 inline-block bg-blue-50 text-blue-700 border border-blue-100">
              {current.creative_type || 'image'}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DealersPage() {
  const [role, setRole] = useState('')
  const [dealers, setDealers] = useState<any[]>([])
  const [selectedDealerId, setSelectedDealerId] = useState('')
  // Server-aggregated sources (replace the old raw full-table fetch):
  //   summaryRows  — one row per platform (get_metrics_summary) → KPI strip + conversions
  //   campaignRows — one row per (campaign_name, platform) (get_campaign_summary) → platform cards
  const [summaryRows, setSummaryRows] = useState<any[]>([])
  const [campaignRows, setCampaignRows] = useState<any[]>([])
  // (dealer_id, month, platform) grain from the fast month-grain RPC — powers the trend line chart.
  const [monthlyRows, setMonthlyRows] = useState<any[]>([])
  const [lineMetric, setLineMetric] = useState('driving_directions')
  const [pptLoading, setPptLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  // Single date filter driving the whole page — presets + calendar. Default = All time.
  const [range, setRange] = useState<DateRange>({ from: ALL_TIME_DATE_FROM, to: ALL_TIME_DATE_TO })
  const [latestDate, setLatestDate] = useState('—')
  const [callMetrics, setCallMetrics] = useState<any[]>([])
  const [budgets, setBudgets] = useState<any[]>([])
  const [creativesData, setCreativesData] = useState<{ google: any[]; facebook: any[]; instagram: any[] }>({ google: [], facebook: [], instagram: [] })
  const [creativesLoading, setCreativesLoading] = useState(false)
  const [lightboxPlatform, setLightboxPlatform] = useState<'google' | 'facebook' | 'instagram' | null>(null)
  const [carouselIndex, setCarouselIndex] = useState<{ google: number; facebook: number; instagram: number }>({ google: 0, facebook: 0, instagram: 0 })
  const [previewsData, setPreviewsData] = useState<{ google: any[]; facebook: any[]; instagram: any[] }>({ google: [], facebook: [], instagram: [] })
  const [previewsLoading, setPreviewsLoading] = useState(false)
  const [previewLightboxPlatform, setPreviewLightboxPlatform] = useState<'google' | 'facebook' | 'instagram' | null>(null)
  const [previewCarouselIndex, setPreviewCarouselIndex] = useState<{ google: number; facebook: number; instagram: number }>({ google: 0, facebook: 0, instagram: 0 })
  const [showGlossary, setShowGlossary] = useState(false)

  // Live Meta reach — filtered KPI card (all roles)
  const [reachData, setReachData] = useState<Awaited<ReturnType<typeof getReach>>>(null)
  const [reachLoading, setReachLoading] = useState(true)

  // Live Meta reach — feeds the Facebook/Instagram platform cards' Reach row.
  // Skipped (null, not loading) for the single-dealer + single-day combination —
  // no separate raw-row fallback for that edge case (see the effect below).
  const [tableReach, setTableReach] = useState<{
    facebook: { value: number | null; loading: boolean }
    instagram: { value: number | null; loading: boolean }
  }>({
    facebook: { value: null, loading: false },
    instagram: { value: null, loading: false },
  })

  const isRestrictedRole = role === 'dealer' || role === 'branch_head'

  // Read role + auto-select dealer from localStorage
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    const userRole = user?.role || ''
    setRole(userRole)
    if (userRole === 'dealer' && user?.dealer_id) {
      setSelectedDealerId(user.dealer_id)
    }
  }, [])

  // Load dealers + latest date on mount
  useEffect(() => {
    getDealers()
      .then(setDealers)
      .catch(err => { console.error('getDealers error:', err); setDealers([]) })
    getLatestMetricDate().then(setLatestDate).catch(() => {})
  }, [])

  // Load aggregated metrics whenever filters change. Server-side aggregation via two
  // RPCs replaces the old raw ~162k-row paginated fetch: get_metrics_summary (platform
  // grain, for the KPI strip + conversions) and get_campaign_summary (campaign grain,
  // for the 3 ad tables). Fired in parallel — neither depends on the other.
  useEffect(() => {
    if (dealers.length === 0) return
    let cancelled = false

    async function load() {
      setLoading(true)
      try {
        const ids = selectedDealerId ? [selectedDealerId] : dealers.map((d: any) => d.id)
        const [summary, campaigns, monthly] = await Promise.all([
          getMetricsSummary(ids, range.from, range.to, []),
          getCampaignSummary(ids, range.from, range.to),
          // Fast month-grain RPC (NOT a raw daily_metrics scan) for the trend line chart.
          getMetricsByDealerMonth(ids, range.from, range.to, []),
        ])
        if (!cancelled) {
          setSummaryRows(summary)
          setCampaignRows(campaigns)
          setMonthlyRows(monthly)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [dealers, selectedDealerId, range])

  // Load call metrics whenever filters change
  useEffect(() => {
    if (dealers.length === 0) return
    const monthFrom = range.from.substring(0, 7)
    const monthTo = range.to.substring(0, 7)
    const ids = selectedDealerId ? [selectedDealerId] : dealers.map((d: any) => d.id)
    getCallMetrics(ids, monthFrom, monthTo).then(setCallMetrics)
  }, [dealers, selectedDealerId, range])

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
      .then(data => {
        setCreativesData(data)
        setCarouselIndex({ google: 0, facebook: 0, instagram: 0 })
      })
      .catch(err => console.error('creatives fetch error:', err))
      .finally(() => setCreativesLoading(false))
  }, [selectedDealerId])

  useEffect(() => {
    if (!selectedDealerId) {
      setPreviewsData({ google: [], facebook: [], instagram: [] })
      return
    }
    setPreviewsLoading(true)
    // Meta previews (dealer_id-keyed) and Google previews (brand_category-keyed,
    // resolved inside getGoogleAdPreviews) are independent fetches — run in
    // parallel and merge, same as the summary/campaigns/monthly Promise.all above.
    Promise.all([
      getAdPreviews(selectedDealerId),
      getGoogleAdPreviews(selectedDealerId),
    ])
      .then(([data, googlePreviews]) => {
        setPreviewsData({ ...data, google: googlePreviews })
        setPreviewCarouselIndex({ google: 0, facebook: 0, instagram: 0 })
      })
      .catch(err => console.error('previews fetch error:', err))
      .finally(() => setPreviewsLoading(false))
  }, [selectedDealerId])

  // ── Single source of truth for EVERY platform-conditional block on this page ──
  // Platform cards, Platform Share, Audience Demographics, Ad Creatives and Ad
  // Previews all gate on these three booleans and nothing else. They read the same
  // campaignRows that feed the <platform>Campaigns arrays below (from
  // get_campaign_summary), so they re-derive automatically per dealer AND per date
  // range — no hardcoded platform lists, no per-dealer special-casing anywhere.
  // Declared here rather than beside those arrays because the audience effects
  // below depend on them.
  const hasGoogle = useMemo(() => campaignRows.some((r: any) => r.platform === 'google'), [campaignRows])
  const hasFacebook = useMemo(() => campaignRows.some((r: any) => r.platform === 'facebook'), [campaignRows])
  const hasInstagram = useMemo(() => campaignRows.some((r: any) => r.platform === 'instagram'), [campaignRows])

  // Display order is fixed (Google → Instagram → Facebook); only membership varies.
  const activePlatforms = useMemo(
    () => (['google', 'instagram', 'facebook'] as const)
      .filter((p) => (p === 'google' ? hasGoogle : p === 'instagram' ? hasInstagram : hasFacebook)),
    [hasGoogle, hasInstagram, hasFacebook]
  )

  // Ad Creatives / Ad Previews gate on the SAME booleans, intersected with
  // "actually has an asset to show" — so a stale creative for a platform the
  // dealer no longer runs doesn't resurrect a block. Google previews additionally
  // require a resolved brand_category with rows in google_ad_previews_current
  // (see getGoogleAdPreviews) — a dealer with an active Google campaign but no
  // brand_category match still yields previewsData.google = [] and drops out here.
  const creativePlatforms = useMemo(
    () => activePlatforms.filter((p) => creativesData[p].length > 0),
    [activePlatforms, creativesData]
  )
  const previewPlatforms = useMemo(
    () => activePlatforms.filter(
      (p): p is 'facebook' | 'instagram' | 'google' => previewsData[p].length > 0
    ),
    [activePlatforms, previewsData]
  )

  // ── Derived state ────────────────────────────────────────────────────────────

  const selectedDealer = useMemo(
    () => dealers.find((d: any) => d.id === selectedDealerId) ?? null,
    [dealers, selectedDealerId]
  )

  const isSingleDay = useMemo(() => range.from === range.to, [range])

  // Filtered Reach KPI card — ALWAYS a live call (Rule A: combined KPI
  // never uses stored data), scoped to the current filter state. All roles now
  // get filter-reactive reach (admin, branch_head, dealer).
  useEffect(() => {
    let cancelled = false
    const ids = selectedDealerId ? [selectedDealerId] : null

    setReachLoading(true)
    setReachData(null)
    getReach(ids, range.from, range.to, ['facebook', 'instagram']).then((result) => {
      if (cancelled) return
      setReachData(result)
      setReachLoading(false)
    })
    return () => { cancelled = true }
  }, [isRestrictedRole, selectedDealerId, range])

  // Facebook/Instagram platform card Reach — single dealer + single day skips
  // the live call (null, not loading); every other combination (multi-day
  // range, or "all dealers") makes a live call.
  useEffect(() => {
    const useLiveFetch = !(selectedDealerId && isSingleDay)
    if (!useLiveFetch) {
      setTableReach({
        facebook: { value: null, loading: false },
        instagram: { value: null, loading: false },
      })
      return
    }

    let cancelled = false
    const ids = selectedDealerId ? [selectedDealerId] : null

    setTableReach({
      facebook: { value: null, loading: true },
      instagram: { value: null, loading: true },
    })

    getReach(ids, range.from, range.to, ['facebook']).then((result) => {
      if (cancelled) return
      setTableReach((prev) => ({ ...prev, facebook: { value: result ? result.reach : null, loading: false } }))
    })
    getReach(ids, range.from, range.to, ['instagram']).then((result) => {
      if (cancelled) return
      setTableReach((prev) => ({ ...prev, instagram: { value: result ? result.reach : null, loading: false } }))
    })

    return () => { cancelled = true }
  }, [selectedDealerId, isSingleDay, range])

  const kpi = useMemo(() => kpiFromSummary(summaryRows), [summaryRows])

  // campaignRows is already at (campaign_name, platform) grain from get_campaign_summary,
  // shaped to match what groupCampaigns consumes — so groupCampaigns still owns the
  // ctr/cpc/cpm math and the tables render unchanged.
  const googleCampaigns = useMemo(
    () => groupCampaigns(campaignRows.filter((m: any) => m.platform === 'google')),
    [campaignRows]
  )
  const facebookCampaigns = useMemo(
    () => groupCampaigns(campaignRows.filter((m: any) => m.platform === 'facebook')),
    [campaignRows]
  )
  const instagramCampaigns = useMemo(
    () => groupCampaigns(campaignRows.filter((m: any) => m.platform === 'instagram')),
    [campaignRows]
  )

  // Per-platform Spend/Clicks/Impressions/CTR/CPC — identical formula to each
  // CampaignTable's own aggregate row, computed from the same campaigns arrays.
  // Feeds the platform share charts + cards below; the tables' own totals stay
  // exactly as they are (each table still does this reduce internally too).
  const googleTotals = useMemo(() => platformTotals(googleCampaigns), [googleCampaigns])
  const facebookTotals = useMemo(() => platformTotals(facebookCampaigns), [facebookCampaigns])
  const instagramTotals = useMemo(() => platformTotals(instagramCampaigns), [instagramCampaigns])

  // Conversions from get_metrics_summary rows (one per platform). Same platform/field
  // selection as the original raw-row logic: gmb → directions/store visits; ga4 → website
  // visits + the six event counters. Number() coercion guards PostgREST string serialization.
  const conversions = useMemo(() => {
    let directions = 0, storeVisits = 0, websiteVisits = 0, callNumberTrack = 0, callTrack = 0,
      downloadCatalogue = 0, driveDirection = 0, enquiryTrack = 0, formSubmit = 0
    summaryRows.forEach((r: any) => {
      if (r.platform === 'gmb') {
        directions += Number(r.total_driving_directions) || 0
        storeVisits += Number(r.total_store_visits) || 0
      }
      if (r.platform === 'ga4') {
        websiteVisits += Number(r.total_website_visits) || 0
        callNumberTrack += Number(r.total_event_call_number_track) || 0
        callTrack += Number(r.total_event_call_track) || 0
        downloadCatalogue += Number(r.total_event_download_catalogue) || 0
        driveDirection += Number(r.total_event_drive_direction) || 0
        enquiryTrack += Number(r.total_event_enquiry_track) || 0
        formSubmit += Number(r.total_event_form_submit) || 0
      }
    })
    return { directions, storeVisits, websiteVisits, callNumberTrack, callTrack, downloadCatalogue, driveDirection, enquiryTrack, formSubmit }
  }, [summaryRows])

  // KPI-strip rates, all from SUMMED get_metrics_summary totals (never per-row averages):
  //   CTR — clicks/impressions across the 3 paid platforms
  //   CPC — Google only (click-billed)
  //   CPM — Meta only (facebook+instagram, impression-billed)
  const kpiRates = useMemo(() => {
    let gSpend = 0, gClicks = 0, metaSpend = 0, metaImpr = 0
    let allClicks = 0, allImpr = 0
    summaryRows.forEach((r: any) => {
      const spend = Number(r.total_spend_inr) || 0
      const impr = Number(r.total_impressions) || 0
      const clicks = Number(r.total_link_clicks) || 0
      if (r.platform === 'google') { gSpend += spend; gClicks += clicks }
      if (r.platform === 'facebook' || r.platform === 'instagram') {
        metaSpend += spend; metaImpr += impr
      }
      if (r.platform === 'google' || r.platform === 'facebook' || r.platform === 'instagram') {
        allClicks += clicks; allImpr += impr
      }
    })
    return {
      ctr: allImpr > 0 ? (allClicks / allImpr) * 100 : 0,
      cpc: gClicks > 0 ? gSpend / gClicks : 0,
      cpm: metaImpr > 0 ? (metaSpend / metaImpr) * 1000 : 0,
    }
  }, [summaryRows])

  const callTotals = useMemo(() => {
    const received = callMetrics.reduce((s: number, r: any) => s + (r.calls_received || 0), 0)
    const answered = callMetrics.reduce((s: number, r: any) => s + (r.calls_answered || 0), 0)
    const missed = callMetrics.reduce((s: number, r: any) => s + (r.calls_missed || 0), 0)
    const dialled = callMetrics.reduce((s: number, r: any) => s + (r.calls_dialled || 0), 0)
    return { received, answered, missed, dialled }
  }, [callMetrics])

  // Monthly trend series for the line chart — summed across dealers per month. The
  // per-platform metric selection mirrors the KPI totals (kpiFromSummary/conversions)
  // exactly, so the chart reconciles with the stat cards and campaign tables.
  const lineSeries = useMemo(() => {
    const byMonth: Record<string, number> = {}
    const months = new Set<string>()
    monthlyRows.forEach((r: any) => {
      months.add(r.month)
      let v = 0
      if (lineMetric === 'driving_directions') {
        if (r.platform === 'gmb') v = r.driving_directions || 0
      } else if (lineMetric === 'website_visits') {
        if (r.platform === 'ga4') v = r.website_visits || 0
      } else if (r.platform === 'google' || r.platform === 'facebook' || r.platform === 'instagram') {
        // link_clicks / impressions → paid platforms only
        v = (lineMetric === 'link_clicks' ? r.link_clicks : r.impressions) || 0
      }
      byMonth[r.month] = (byMonth[r.month] || 0) + v
    })
    return [...months].sort().map((m) => ({ month: monthShort(m), value: byMonth[m] || 0 }))
  }, [monthlyRows, lineMetric])

  const rangeChip = `${chipDate(range.from)} – ${chipDate(range.to)}`

  // call_metrics is one row per dealer per month. In any multi-dealer scope
  // (all dealers, or a branch_head's assigned subset) callMetrics holds many
  // rows per month, so the Call Summary table must sum every dealer's row
  // for that month, not just grab a single one.
  const callSummaryByMonth = useMemo(() => {
    const map: Record<string, { received: number; answered: number; missed: number; dialled: number }> = {}
    callMetrics.forEach((r: any) => {
      if (!map[r.month]) map[r.month] = { received: 0, answered: 0, missed: 0, dialled: 0 }
      map[r.month].received += r.calls_received || 0
      map[r.month].answered += r.calls_answered || 0
      map[r.month].missed += r.calls_missed || 0
      map[r.month].dialled += r.calls_dialled || 0
    })
    return map
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

  // Static full-year planned figure — mirrors Overview's Spend vs Planned pattern.
  // Does not react to the date filter (only spend does).
  const totalPlannedBudget = useMemo(() =>
    budgets
      .filter((b: any) => b.platform === 'total')
      .reduce((s: number, b: any) => s + (b.budget_inr || 0), 0),
    [budgets]
  )

  const callSummaryMonths = useMemo(() => {
    const fromMonth = range.from.substring(0, 7)
    const toMonth = range.to.substring(0, 7)
    return CALL_MONTHS.filter((m) => m.value >= fromMonth && m.value <= toMonth)
  }, [range])

  // ── PPT Export ───────────────────────────────────────────────────────────────

  async function handleExportPPT() {
    if (!selectedDealerId) {
      alert('Please select a dealer first')
      return
    }
    if (!selectedDealer) return

    const from = range.from
    const to = range.to
    const dateRangeText = (from === ALL_TIME_DATE_FROM && to === ALL_TIME_DATE_TO)
      ? 'May 2025 – Mar 2026'
      : `${from} to ${to}`

    setPptLoading(true)
    try {
    // Raw per-platform rows are needed for the PPT's averaged fields (ctr_percent,
    // avg_cpc_inr) which the aggregated RPCs don't carry. Fetch them on demand here —
    // scoped to the single selected dealer, so it's a small, fast query — rather than
    // holding ~162k rows in memory on every page load just for this button.
    const rows = await getMetrics([selectedDealerId], from, to, [])

    const sum = (arr: any[], key: string) => arr.reduce((s: number, r: any) => s + (r[key] || 0), 0)
    const avgField = (arr: any[], key: string) =>
      arr.length > 0 ? (arr.reduce((s: number, r: any) => s + parseFloat(r[key] || 0), 0) / arr.length).toFixed(2) : '0.00'

    const gRows = rows.filter((r: any) => r.platform === 'google')
    const gmbRows = rows.filter((r: any) => r.platform === 'gmb')
    const fbRows = rows.filter((r: any) => r.platform === 'facebook')
    const igRows = rows.filter((r: any) => r.platform === 'instagram')
    const ga4Rows = rows.filter((r: any) => r.platform === 'ga4')

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
        directions: formatNumber(sum(gmbRows, 'driving_directions')),
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
    } finally {
      setPptLoading(false)
    }
  }

  // ── Ad creative download ─────────────────────────────────────────────────────
  // Fetch + blob forces a real download regardless of the storage host's CORS
  // policy (confirmed live: Supabase Storage sends permissive CORS headers,
  // so this path works). Falls back to opening the image in a new tab if the
  // fetch itself is blocked, so the user can still save it manually.
  async function handleDownloadCreative(url: string) {
    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error(`fetch failed: ${res.status}`)
      const blob = await res.blob()
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = url.split('/').pop() || 'creative.jpg'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(blobUrl)
    } catch (e) {
      console.error('creative download failed, opening in new tab instead:', e)
      window.open(url, '_blank')
    }
  }

  // Lightbox derived state — platform + shared carouselIndex are the single
  // source of truth, so the lightbox and small carousel can never drift apart.
  const lightboxCreatives = lightboxPlatform ? creativesData[lightboxPlatform] : []
  const lightboxIndex = lightboxPlatform ? carouselIndex[lightboxPlatform] : 0
  const lightboxCreative = lightboxCreatives[lightboxIndex] ?? null

  const previewLightboxCreatives = previewLightboxPlatform ? previewsData[previewLightboxPlatform] : []
  const previewLightboxIndex = previewLightboxPlatform ? previewCarouselIndex[previewLightboxPlatform] : 0
  const previewLightboxCreative = previewLightboxCreatives[previewLightboxIndex] ?? null

  // ── JSX ──────────────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-[1440px] px-6 lg:px-8 py-6 lg:py-8">

      {/* ── Header ── */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200 mb-6">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold text-slate-900">Marketing Campaign Reports</h1>
          <button
            onClick={() => setShowGlossary(true)}
            className="flex items-center gap-1.5 pl-2.5 pr-3 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 hover:bg-indigo-100 transition text-xs font-medium whitespace-nowrap"
            title="What do these metrics mean?"
            aria-label="Open KPI glossary"
          >
            <HelpCircle size={14} />
            How to read this report
          </button>
        </div>
        <span className="text-xs text-slate-400">Updated till: {latestDate}</span>
      </div>

      {/* ── Top row: 3 stat cards (left) + control stack (right) ── */}
      <div className="flex flex-col lg:flex-row gap-4 mb-4">
        {/* Stat cards — Row 1: Total Spend · Reach · Impressions · Clicks;
            Row 2: CTR % · CPC ₹ · CPM ₹ · Store Visits */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 flex-1 content-start">
          {loading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-slate-100 animate-pulse rounded-xl h-[88px]" />
            ))
          ) : (
            <>
              <KpiCard
                icon={<TrendingUp size={16} className="text-indigo-500" />}
                label="Total Spend"
                value={totalPlannedBudget > 0
                  ? `${formatCurrency(kpi.totalSpend)} / ${formatCurrency(totalPlannedBudget)}`
                  : '—'}
                subtitle={totalPlannedBudget === 0
                  ? 'No budget data'
                  : `${((kpi.totalSpend / totalPlannedBudget) * 100).toFixed(1)}% of planned budget`}
              />
              <KpiCard
                icon={<Activity size={16} className="text-slate-300" />}
                label="Reach"
                value={
                  reachLoading ? '…'
                  : reachData?.reach == null ? '—'
                  : formatReachStyle(reachData.reach)
                }
                note={
                  role === 'admin' && !reachLoading && reachData?.reach != null
                  && reachData.dealers_covered < reachData.dealers_requested
                    ? `${reachData.dealers_covered}/${reachData.dealers_requested} dealers`
                    : undefined
                }
                title={
                  reachLoading ? undefined
                  : reachData?.reach == null ? 'Reach unavailable — check connection'
                  : exactValue(reachData.reach)
                }
              />
              <KpiCard
                icon={<Eye size={16} className="text-sky-500" />}
                label="Impressions"
                value={formatReachStyle(kpi.totalImpressions)}
                title={exactValue(kpi.totalImpressions)}
              />
              <KpiCard
                icon={<MousePointerClick size={16} className="text-violet-500" />}
                label="Clicks"
                value={formatReachStyle(kpi.totalClicks)}
                title={exactValue(kpi.totalClicks)}
              />
              <KpiCard
                icon={<Percent size={16} className="text-amber-500" />}
                label="CTR %"
                value={`${kpiRates.ctr.toFixed(2)}%`}
              />
              <KpiCard
                icon={<IndianRupee size={16} className="text-rose-500" />}
                label="CPC ₹"
                value={`₹${kpiRates.cpc.toFixed(2)}`}
              />
              <KpiCard
                icon={<Gauge size={16} className="text-teal-500" />}
                label="CPM ₹"
                value={`₹${kpiRates.cpm.toFixed(2)}`}
              />
              <KpiCard
                icon={<MapPin size={16} className="text-emerald-500" />}
                label="Store Visits"
                value={formatLakhStyle(conversions.storeVisits)}
                title={exactValue(conversions.storeVisits)}
              />
            </>
          )}
        </div>

        {/* Control stack — Select Dealer (unless dealer role) → Date filter → Download PPT */}
        <div className="flex flex-col gap-2 lg:w-[240px] shrink-0">
          {role !== 'dealer' && (
            <Select
              value={selectedDealerId}
              onChange={(e) => setSelectedDealerId(e.target.value)}
              className="w-full h-9 rounded-lg border border-slate-200 bg-white px-3 text-[13px] text-slate-700 focus:border-indigo-400 focus:outline-none"
            >
              <option value="">-- All Dealers (Aggregated) --</option>
              {dealers.map((d: any) => (
                <option key={d.id} value={d.id}>{d.dealer_name}</option>
              ))}
            </Select>
          )}
          <DateRangeFilter value={range} onChange={setRange} className="w-full" buttonClassName="w-full" />
          <button
            onClick={handleExportPPT}
            disabled={pptLoading}
            className="h-9 px-3.5 rounded-lg text-[13px] font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Download size={15} />
            {pptLoading ? 'Generating…' : 'Download PPT'}
          </button>
        </div>
      </div>

      {/* ── Charts row + report content (loading-gated) ── */}
      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="bg-slate-100 animate-pulse rounded-xl h-[260px] lg:col-span-1" />
            <div className="bg-slate-100 animate-pulse rounded-xl h-[260px] lg:col-span-2" />
          </div>
          <div className="bg-slate-100 animate-pulse rounded-xl h-48" />
          <div className="bg-slate-100 animate-pulse rounded-xl h-48" />
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {/* ── Charts row: Calls doughnut (narrow) + metric trend (wide, 1:2) ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-1">
              <CallsDoughnut
                answered={callTotals.answered}
                missed={callTotals.missed}
                received={callTotals.received}
                rangeLabel={rangeChip}
              />
            </div>
            <div className="lg:col-span-2">
              <MetricLineChart
                series={lineSeries}
                metric={lineMetric}
                onMetric={setLineMetric}
                rangeLabel={rangeChip}
              />
            </div>
          </div>

          {/* ── Platform-wise visualization: platform cards first, share charts below (clear barrier between raw numbers and infographics) ── */}
          {activePlatforms.length > 0 && (
            <div className={`grid ${PLATFORM_GRID_COLS[activePlatforms.length]} gap-3`}>
              {activePlatforms.map((p) => {
                // Google is click-billed (CPC, no reach); Meta platforms are
                // impression-billed (CPM) and carry a reach figure.
                const cfg = {
                  google: {
                    label: 'Google', budget: googleBudget, totals: googleTotals, showCpm: false,
                    campaigns: googleCampaigns,
                    reach: undefined as number | null | undefined, reachLoading: undefined as boolean | undefined,
                  },
                  instagram: {
                    label: 'Instagram', budget: instagramBudget, totals: instagramTotals, showCpm: true,
                    campaigns: instagramCampaigns,
                    reach: tableReach.instagram.value, reachLoading: tableReach.instagram.loading,
                  },
                  facebook: {
                    label: 'Facebook', budget: facebookBudget, totals: facebookTotals, showCpm: true,
                    campaigns: facebookCampaigns,
                    reach: tableReach.facebook.value, reachLoading: tableReach.facebook.loading,
                  },
                }[p]
                return (
                  <PlatformCard
                    key={p}
                    platform={p}
                    label={cfg.label}
                    color={PLATFORM_COLORS[p]}
                    budget={cfg.budget}
                    spend={cfg.totals.spend}
                    clicks={cfg.totals.clicks}
                    impressions={cfg.totals.impressions}
                    ctr={cfg.totals.ctr}
                    cpc={cfg.totals.cpc}
                    cpm={cfg.totals.cpm}
                    showCpm={cfg.showCpm}
                    reach={cfg.reach}
                    reachLoading={cfg.reachLoading}
                    isAllDealers={!selectedDealerId}
                    campaignCount={cfg.campaigns.length}
                    singleCampaign={cfg.campaigns.length === 1 ? cfg.campaigns[0] : null}
                    dealerStatus={selectedDealer?.campaign_status}
                  />
                )
              })}
            </div>
          )}
          <PlatformShareCharts
            google={googleTotals}
            facebook={facebookTotals}
            instagram={instagramTotals}
            platforms={activePlatforms}
          />

          {/* ── Conversions Section ── */}
          <div className="bg-white rounded-xl border border-slate-200 shadow p-6">
            <div className="flex items-center justify-between border-l-4 border-emerald-500 pl-3 mb-6">
              <span className="text-sm font-semibold text-slate-800">Conversions &amp; Website Activity</span>
              <span className="text-xs text-slate-400">Real-time conversion tracking</span>
            </div>

            {/* Two columns: left = 3 stacked cards (Driving Directions, Store Visits,
                Website Visits & User Journey); right = Call Summary, stretched via
                flexbox default align-items to match the left column's total height. */}
            <div className="flex flex-col lg:flex-row gap-4">

              {/* LEFT COLUMN — narrower, ~1 part of a 1:1.6 ratio */}
              <div className="flex flex-col gap-3 lg:w-[38%] lg:flex-shrink-0">
                <KpiCard
                  icon={<Navigation size={16} className="text-emerald-500" />}
                  label="Driving Directions"
                  value={formatLakhStyle(conversions.directions)}
                  subtitle="From Google Ads"
                  bgClass="bg-slate-50"
                  title={exactValue(conversions.directions)}
                />
                <KpiCard
                  icon={<MapPin size={16} className="text-emerald-500" />}
                  label="Store Visits"
                  value={formatLakhStyle(conversions.storeVisits)}
                  subtitle="From Google Ads"
                  bgClass="bg-slate-50"
                  title={exactValue(conversions.storeVisits)}
                />

                {/* Website Visits & User Journey — content/styling unchanged, just narrower now */}
                <div className="bg-slate-50 rounded-xl border border-slate-200 shadow-sm p-4">
                  <h3 className="text-sm font-semibold text-slate-800 mb-3">Website - Visits and User Journey</h3>
                  <table className="w-full">
                    <tbody>
                      <tr>
                        <td className="py-2 text-sm text-slate-700 font-medium">Website Visits</td>
                        <td
                          className="py-2 text-right text-xl font-bold text-slate-900 font-mono"
                          title={exactValue(conversions.websiteVisits)}
                        >
                          {formatLakhStyle(conversions.websiteVisits)}
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
                        { label: 'Call Clicks', value: conversions.callNumberTrack + conversions.callTrack },
                        { label: 'Download Catalogue', value: conversions.downloadCatalogue },
                        { label: 'Drive Direction', value: conversions.driveDirection },
                        { label: 'Enquiry Track', value: conversions.enquiryTrack },
                        { label: 'Form Submit', value: conversions.formSubmit },
                      ].map(({ label, value }) => (
                        <tr key={label}>
                          <td className="py-1.5 pl-4 text-sm text-slate-600">{label}</td>
                          <td
                            className="py-1.5 text-right text-sm font-mono text-slate-700"
                            title={exactValue(value)}
                          >
                            {formatLakhStyle(value)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* RIGHT COLUMN — Call Summary, stretched to the left column's full height */}
              <div className="flex-1 bg-slate-50 rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col min-h-0">
                <h3 className="text-sm font-semibold text-slate-800 flex-shrink-0">Call Summary</h3>
                <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0" style={{ maxHeight: '100%' }}>
                  <table className="w-full text-sm" style={{ tableLayout: 'fixed', minWidth: '700px' }}>
                    <colgroup>
                      <col style={{ width: '90px' }} />
                      <col style={{ width: '130px' }} />
                      <col style={{ width: '120px' }} />
                      <col style={{ width: '100px' }} />
                      <col style={{ width: '100px' }} />
                      <col style={{ width: '160px' }} />
                    </colgroup>
                    <thead>
                      <tr className="bg-slate-50">
                        <th className="text-xs uppercase text-slate-400 font-medium px-3 py-2 text-center whitespace-nowrap">Month</th>
                        <th className="text-xs uppercase text-slate-400 font-medium px-3 py-2 text-center whitespace-nowrap">Calls Received</th>
                        <th className="text-xs uppercase text-slate-400 font-medium px-3 py-2 text-center whitespace-nowrap">Answered</th>
                        <th className="text-xs uppercase text-slate-400 font-medium px-3 py-2 text-center whitespace-nowrap">Missed</th>
                        <th className="text-xs uppercase text-slate-400 font-medium px-3 py-2 text-center whitespace-nowrap">Dialled</th>
                        <th className="text-xs uppercase text-slate-400 font-medium px-3 py-2 text-center whitespace-nowrap">Answered %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {callSummaryMonths.map((m) => {
                        const row = callSummaryByMonth[m.value]
                        const pct = row && row.received > 0
                          ? Math.round((row.answered / row.received) * 100)
                          : 0
                        return (
                          <tr key={m.value} className="border-b border-slate-50">
                            <td className="px-3 py-2 text-center text-slate-700">{m.label}</td>
                            <td className="px-3 py-2 text-center text-slate-700">
                              {row ? formatNumber(row.received) : '—'}
                            </td>
                            <td className="px-3 py-2 text-center text-slate-700">
                              {row ? formatNumber(row.answered) : '—'}
                            </td>
                            <td className="px-3 py-2 text-center text-slate-700">
                              {row ? formatNumber(row.missed) : '—'}
                            </td>
                            <td className="px-3 py-2 text-center text-slate-700">
                              {row ? formatNumber(row.dialled) : '—'}
                            </td>
                            <td className="px-3 py-2 text-center">
                              <div className="flex items-center justify-center gap-2 min-w-[100px]">
                                <div className="flex-1 bg-slate-100 h-2 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-indigo-500 rounded-full transition-all"
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                                <span className="text-xs text-slate-500 w-8">
                                  {row && row.received > 0 ? `${pct}%` : '—'}
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

          {/* ── Ad Creatives (dealer selected + runs at least one platform) ──
              Same gate as everything else: a dealer with no paid platforms has no
              section at all. "No creatives found" stays for the different case of
              a dealer who DOES run platforms but has no assets uploaded. ── */}
{selectedDealerId && activePlatforms.length > 0 && (
  <div>
    <div className="flex items-center justify-between border-l-4 border-pink-500 pl-3 mb-4">
      <span className="text-sm font-semibold text-slate-800">Ad Creatives</span>
      <span className="text-xs text-slate-400">All creatives for this dealer</span>
    </div>

    {creativesLoading ? (
      <div className="text-center py-12 text-slate-400 text-sm">Loading creatives...</div>
    ) : creativePlatforms.length === 0 ? (
      <div className="text-center py-12 text-slate-400 text-sm">No creatives found for this dealer</div>
    ) : (
      // flex-1 on each carousel means the row re-splits itself to however many
      // blocks actually render — no dead space held for an absent platform.
      <div className="flex flex-col md:flex-row gap-6">
        {creativePlatforms.map((p) => {
          const cfg = {
            google: { label: 'Google', badgeClass: 'text-blue-700 bg-blue-50 border border-blue-100', showTypeTag: true },
            facebook: { label: 'Facebook', badgeClass: 'text-indigo-700 bg-indigo-50 border border-indigo-100', showTypeTag: false },
            instagram: { label: 'Instagram', badgeClass: 'text-pink-700 bg-pink-50 border border-pink-100', showTypeTag: false },
          }[p]
          return (
            <CreativeCarousel
              key={p}
              platform={p}
              label={cfg.label}
              badgeClass={cfg.badgeClass}
              creatives={creativesData[p]}
              index={carouselIndex[p]}
              onIndexChange={(newIndex) => setCarouselIndex(prev => ({ ...prev, [p]: newIndex }))}
              onImageClick={() => setLightboxPlatform(p)}
              showTypeTag={cfg.showTypeTag}
            />
          )
        })}
      </div>
    )}
  </div>
)}

          {/* ── Ad Previews (dealer selected + has preview data for at least one platform) ──
              Google previews need BOTH an active Google campaign (already required via
              activePlatforms) AND a resolved brand_category with rows in
              google_ad_previews_current (see getGoogleAdPreviews) — neither alone is
              enough, so a Google-only-by-campaign dealer with no matching brand_category
              still drops the tile, same as any other empty-data platform. ── */}
{selectedDealerId && previewPlatforms.length > 0 && (
  <div>
    <div className="flex items-center justify-between border-l-4 border-purple-500 pl-3 mb-4">
      <span className="text-sm font-semibold text-slate-800">Ad Previews</span>
      <span className="text-xs text-slate-400">Live ad preview for this dealer</span>
    </div>

    {previewsLoading ? (
      <div className="text-center py-12 text-slate-400 text-sm">Loading previews...</div>
    ) : previewPlatforms.length === 0 ? (
      <div className="text-center py-12 text-slate-400 text-sm">No ad previews found for this dealer</div>
    ) : (
      // Same flex-1 re-split as Ad Creatives above.
      <div className="flex flex-col md:flex-row gap-6">
        {previewPlatforms.map((p) => {
          const cfg = {
            google: { label: 'Google', badgeClass: 'text-blue-700 bg-blue-50 border border-blue-100' },
            facebook: { label: 'Facebook', badgeClass: 'text-indigo-700 bg-indigo-50 border border-indigo-100' },
            instagram: { label: 'Instagram', badgeClass: 'text-pink-700 bg-pink-50 border border-pink-100' },
          }[p]
          return (
            <CreativeCarousel
              key={p}
              platform={p}
              label={cfg.label}
              badgeClass={cfg.badgeClass}
              creatives={previewsData[p]}
              index={previewCarouselIndex[p]}
              onIndexChange={(newIndex) => setPreviewCarouselIndex(prev => ({ ...prev, [p]: newIndex }))}
              onImageClick={() => setPreviewLightboxPlatform(p)}
              showTypeTag={false}
            />
          )
        })}
      </div>
    )}
  </div>
)}
        </div>
      )}

      {showGlossary && (
        <Modal onClose={() => setShowGlossary(false)} maxWidthClass="max-w-2xl">
          <div className="bg-white rounded-xl shadow-xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-base font-semibold text-slate-900">KPI Glossary</h2>
              <button
                onClick={() => setShowGlossary(false)}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                aria-label="Close glossary"
              >
                <X size={16} />
              </button>
            </div>
            <div className="px-6 py-4 overflow-y-auto space-y-4">
              {KPI_GLOSSARY.map(({ label, definition }) => (
                <div key={label}>
                  <div className="text-xs font-semibold uppercase tracking-wide text-indigo-600">{label}</div>
                  <div className="text-sm text-slate-600 mt-0.5">{definition}</div>
                </div>
              ))}
            </div>
          </div>
        </Modal>
      )}

      {lightboxPlatform && lightboxCreative && (
        <Modal onClose={() => setLightboxPlatform(null)}>
          <div className="absolute -top-10 right-0 flex items-center gap-4">
            <button
              onClick={() => handleDownloadCreative(lightboxCreative.storage_url)}
              className="flex items-center gap-1.5 text-white text-sm hover:text-slate-300"
            >
              <Download size={15} />
              Download
            </button>
            <button
              onClick={() => setLightboxPlatform(null)}
              className="text-white text-sm hover:text-slate-300"
            >
              ✕ Close
            </button>
          </div>
          {lightboxIndex > 0 && (
            <button
              onClick={() => setCarouselIndex(prev => ({ ...prev, [lightboxPlatform]: lightboxIndex - 1 }))}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 shadow-md flex items-center justify-center text-slate-700 hover:bg-white transition-colors"
              aria-label="Previous creative (lightbox)"
            >
              ‹
            </button>
          )}
          {lightboxIndex < lightboxCreatives.length - 1 && (
            <button
              onClick={() => setCarouselIndex(prev => ({ ...prev, [lightboxPlatform]: lightboxIndex + 1 }))}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 shadow-md flex items-center justify-center text-slate-700 hover:bg-white transition-colors"
              aria-label="Next creative (lightbox)"
            >
              ›
            </button>
          )}
          <img
            src={lightboxCreative.storage_url}
            alt="Creative preview"
            className="w-full h-full object-contain rounded-lg max-h-[85vh]"
          />
        </Modal>
      )}

      {previewLightboxPlatform && previewLightboxCreative && (
        <Modal onClose={() => setPreviewLightboxPlatform(null)}>
          <div className="absolute -top-10 right-0 flex items-center gap-4">
            <button
              onClick={() => handleDownloadCreative(previewLightboxCreative.storage_url)}
              className="flex items-center gap-1.5 text-white text-sm hover:text-slate-300"
            >
              <Download size={15} />
              Download
            </button>
            <button
              onClick={() => setPreviewLightboxPlatform(null)}
              className="text-white text-sm hover:text-slate-300"
            >
              ✕ Close
            </button>
          </div>
          {previewLightboxPlatform === 'facebook' ? (
            <div className="relative inline-block max-w-full mx-auto">
              {previewLightboxIndex > 0 && (
                <button
                  onClick={() => setPreviewCarouselIndex(prev => ({ ...prev, [previewLightboxPlatform]: previewLightboxIndex - 1 }))}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 shadow-md flex items-center justify-center text-slate-700 hover:bg-white transition-colors"
                  aria-label="Previous preview (lightbox)"
                >
                  ‹
                </button>
              )}
              {previewLightboxIndex < previewLightboxCreatives.length - 1 && (
                <button
                  onClick={() => setPreviewCarouselIndex(prev => ({ ...prev, [previewLightboxPlatform]: previewLightboxIndex + 1 }))}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 shadow-md flex items-center justify-center text-slate-700 hover:bg-white transition-colors"
                  aria-label="Next preview (lightbox)"
                >
                  ›
                </button>
              )}
              <img
                src={previewLightboxCreative.storage_url}
                alt="Ad preview"
                className="block max-w-full max-h-[85vh] w-auto h-auto object-contain rounded-lg"
              />
            </div>
          ) : (
            <>
              {previewLightboxIndex > 0 && (
                <button
                  onClick={() => setPreviewCarouselIndex(prev => ({ ...prev, [previewLightboxPlatform]: previewLightboxIndex - 1 }))}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 shadow-md flex items-center justify-center text-slate-700 hover:bg-white transition-colors"
                  aria-label="Previous preview (lightbox)"
                >
                  ‹
                </button>
              )}
              {previewLightboxIndex < previewLightboxCreatives.length - 1 && (
                <button
                  onClick={() => setPreviewCarouselIndex(prev => ({ ...prev, [previewLightboxPlatform]: previewLightboxIndex + 1 }))}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 shadow-md flex items-center justify-center text-slate-700 hover:bg-white transition-colors"
                  aria-label="Next preview (lightbox)"
                >
                  ›
                </button>
              )}
              <img
                src={previewLightboxCreative.storage_url}
                alt="Ad preview"
                className="w-full h-full object-contain rounded-lg max-h-[85vh]"
              />
            </>
          )}
        </Modal>
      )}
    </div>
  )
}
