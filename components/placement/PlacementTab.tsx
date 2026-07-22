'use client'

import { useEffect, useState, useMemo } from 'react'
import { getDealers, getPlacementBreakdown } from '@/lib/queries'
import { Select } from '@/components/ui/select'
import { ALL_TIME_DATE_FROM, ALL_TIME_DATE_TO } from '@/lib/constants'
import { DateRangeFilter, type DateRange } from '@/components/DateRangeFilter'

type Row = { breakdown_value: string; link_clicks: number }
type DisplayRow = { label: string; link_clicks: number }

// Link clicks are a Reach/Clicks/Impressions-style metric (same family as the
// Clicks KPI card), so they get the M+/K treatment here too — not Cr/L, which
// is reserved for GMB/GA4 counts (Store Visits, Website Visits, etc.).
function formatNumber(val: number): string {
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(2).replace(/\.?0+$/, '')}M+`
  if (val >= 1_000) return `${(val / 1_000).toFixed(1)}K`
  return val.toLocaleString('en-IN')
}

// Hover text for every formatted value above — same "tooltip on everything"
// convention as the Clicks KPI card, so an abbreviated number is never the
// only version visible.
function exactValue(val: number): string {
  return val.toLocaleString('en-IN')
}

// ── Display-mapping (frontend-only — never touches the stored breakdown_value) ──

// Google: CONTENT -> Display, SEARCH + SEARCH_PARTNERS summed into one "Search"
// bar, GMAIL -> Gmail, MAPS -> Maps, YOUTUBE -> YouTube, DISCOVER -> Discovery.
const GOOGLE_LABELS: Record<string, string> = {
  CONTENT: 'Display',
  SEARCH: 'Search',
  SEARCH_PARTNERS: 'Search',
  GMAIL: 'Gmail',
  MAPS: 'Maps',
  YOUTUBE: 'YouTube',
  DISCOVER: 'Discovery',
}

// Meta: cosmetic relabeling of the raw platform_position values.
const META_LABELS: Record<string, string> = {
  instagram_reels: 'Reels',
  facebook_stories: 'Stories',
  instagram_stories: 'Stories',
  feed: 'Feed',
  marketplace: 'Marketplace',
  right_hand_column: 'Right column',
  instagram_explore: 'Explore',
  instagram_explore_grid_home: 'Explore grid',
}

// Fallback for any raw value not covered by the explicit maps above (e.g. a
// new Meta placement Meta adds later) — snake_case -> Title Case, so the UI
// never silently drops or blanks a bucket that has real link_clicks.
function fallbackLabel(raw: string): string {
  return raw
    .split('_')
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ')
}

// Google needs an aggregation step (SEARCH + SEARCH_PARTNERS -> one "Search"
// bar); Meta is a pure 1:1 relabel. Both funnel through the same fallback and
// the same "sort by link_clicks descending" rule.
function mapGoogleRows(rows: Row[]): DisplayRow[] {
  const byLabel: Record<string, number> = {}
  for (const r of rows) {
    const label = GOOGLE_LABELS[r.breakdown_value] ?? fallbackLabel(r.breakdown_value)
    byLabel[label] = (byLabel[label] || 0) + r.link_clicks
  }
  return Object.entries(byLabel)
    .map(([label, link_clicks]) => ({ label, link_clicks }))
    .sort((a, b) => b.link_clicks - a.link_clicks)
}

function mapMetaRows(rows: Row[]): DisplayRow[] {
  return rows
    .map((r) => ({
      label: META_LABELS[r.breakdown_value] ?? fallbackLabel(r.breakdown_value),
      link_clicks: r.link_clicks,
    }))
    .sort((a, b) => b.link_clicks - a.link_clicks)
}

// ── Bar list card ────────────────────────────────────────────────────────────

function PlatformCard({
  title,
  accentClassName,
  rows,
  loading,
}: {
  title: string
  accentClassName: string
  rows: DisplayRow[]
  loading: boolean
}) {
  const maxClicks = rows.length > 0 ? rows[0].link_clicks : 0
  const total = rows.reduce((s, r) => s + r.link_clicks, 0)

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-semibold text-slate-800">{title}</span>
        {!loading && (
          <span className="text-xs text-slate-400" title={exactValue(total)}>{formatNumber(total)} link clicks</span>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-slate-100 animate-pulse rounded h-6" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="flex items-center justify-center h-32 text-sm text-slate-400">
          No data for selected period
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => {
            const pct = maxClicks > 0 ? Math.max((r.link_clicks / maxClicks) * 100, 2) : 0
            return (
              <div key={r.label}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[13px] text-slate-600">{r.label}</span>
                  <span className="text-[13px] font-medium text-slate-800" title={exactValue(r.link_clicks)}>{formatNumber(r.link_clicks)}</span>
                </div>
                <div className="bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${accentClassName}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Placement tab ─────────────────────────────────────────────────────────────

export default function PlacementTab({ role }: { role: string }) {
  const [dealers, setDealers] = useState<any[]>([])
  const [selectedDealerId, setSelectedDealerId] = useState('')
  const [range, setRange] = useState<DateRange>({ from: ALL_TIME_DATE_FROM, to: ALL_TIME_DATE_TO })

  const [rawData, setRawData] = useState<{ google: Row[]; facebook: Row[]; instagram: Row[] }>({
    google: [],
    facebook: [],
    instagram: [],
  })
  const [loading, setLoading] = useState(true)

  // Same pattern as dealers/page.tsx: dealer role never sees the selector,
  // their own dealer_id is force-selected from localStorage.
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    if (user?.role === 'dealer' && user?.dealer_id) {
      setSelectedDealerId(user.dealer_id)
    }
  }, [])

  useEffect(() => {
    getDealers().then(setDealers)
  }, [])

  // Three parallel RPC calls (one per platform — the RPC has no platform
  // column, so a single null-platform call would silently merge raw values
  // that collide across platforms, e.g. Meta's 'feed'). Same
  // Promise.all + cancelled-flag + try/finally pattern as dealers/page.tsx's
  // metrics-loading effect.
  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const dealerId = selectedDealerId || null
        const [google, facebook, instagram] = await Promise.all([
          getPlacementBreakdown(dealerId, 'google', range.from, range.to),
          getPlacementBreakdown(dealerId, 'facebook', range.from, range.to),
          getPlacementBreakdown(dealerId, 'instagram', range.from, range.to),
        ])
        if (!cancelled) setRawData({ google, facebook, instagram })
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [selectedDealerId, range])

  const googleRows = useMemo(() => mapGoogleRows(rawData.google), [rawData.google])
  const facebookRows = useMemo(() => mapMetaRows(rawData.facebook), [rawData.facebook])
  const instagramRows = useMemo(() => mapMetaRows(rawData.instagram), [rawData.instagram])

  return (
    <div className="space-y-6">
      {/* Filters — same components + state pattern as dealers/page.tsx */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-2">
        {role !== 'dealer' && (
          <Select
            value={selectedDealerId}
            onChange={(e) => setSelectedDealerId(e.target.value)}
            className="w-full sm:w-[240px] h-9 rounded-lg border border-slate-200 bg-white px-3 text-[13px] text-slate-700 focus:border-indigo-400 focus:outline-none"
          >
            <option value="">-- All Dealers (Aggregated) --</option>
            {dealers.map((d: any) => (
              <option key={d.id} value={d.id}>{d.dealer_name}</option>
            ))}
          </Select>
        )}
        <DateRangeFilter value={range} onChange={setRange} className="w-full sm:w-auto" buttonClassName="w-full sm:w-auto" />
      </div>

      {/* One card per platform */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <PlatformCard title="Google" accentClassName="bg-blue-500" rows={googleRows} loading={loading} />
        <PlatformCard title="Facebook" accentClassName="bg-indigo-500" rows={facebookRows} loading={loading} />
        <PlatformCard title="Instagram" accentClassName="bg-fuchsia-500" rows={instagramRows} loading={loading} />
      </div>
    </div>
  )
}
