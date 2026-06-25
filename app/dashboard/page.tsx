'use client'

import { useEffect, useState, useMemo } from 'react'
import { getDealers, getMetrics, getFilterOptions } from '@/lib/queries'
import { Select } from '@/components/ui/select'
import { TrendingUp, MapPin, Activity, Phone, Navigation, Eye, Zap } from 'lucide-react'

// ─── Constants ────────────────────────────────────────────────────────────────

const MONTH_OPTIONS = [
  { value: '', label: 'All Months' },
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

const TIER_OPTIONS = [
  { value: '', label: 'All Tiers' },
  { value: 'tier1', label: 'Tier 1' },
  { value: 'tier2', label: 'Tier 2' },
  { value: 'tier3', label: 'Tier 3' },
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

// ─── Sub-components ───────────────────────────────────────────────────────────

function KpiCard({
  icon,
  label,
  value,
  note,
  prefix,
  suffix,
}: {
  icon: React.ReactNode
  label: string
  value: string
  note?: string
  prefix?: string
  suffix?: string
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs text-slate-500 uppercase tracking-wide font-medium">{label}</span>
      </div>
      <div className={`text-2xl font-bold ${note ? 'text-slate-400' : 'text-slate-900'}`}>
        {prefix}{value}{suffix}
      </div>
      {note && <div className="text-xs text-slate-400 mt-1">{note}</div>}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OverviewPage() {
  const [dealers, setDealers] = useState<any[]>([])
  const [metrics, setMetrics] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [zones, setZones] = useState<string[]>([])
  const [states, setStates] = useState<string[]>([])
  const [filters, setFilters] = useState({
    zone: '',
    state: '',
    month: '',
    tier: '',
  })

  // Load filter options + dealers on mount
  useEffect(() => {
    async function init() {
      const [allDealers, opts] = await Promise.all([getDealers(), getFilterOptions()])
      setDealers(allDealers)
      setZones(opts.zones.filter(Boolean) as string[])
      setStates(opts.markets.filter(Boolean) as string[])
    }
    init().catch(console.error)
  }, [])

  // Load metrics when filters change
  useEffect(() => {
    if (dealers.length === 0) return
    let cancelled = false

    async function load() {
      setLoading(true)
      try {
        let filtered = dealers
        if (filters.zone) filtered = filtered.filter((d: any) => d.zone === filters.zone)
        if (filters.state) filtered = filtered.filter((d: any) => d.market === filters.state)

        const dealerIds = filtered.map((d: any) => d.id)

        let dateFrom = '2025-05-28'
        let dateTo = '2026-03-31'
        if (filters.month) {
          dateFrom = `${filters.month}-01`
          const [year, month] = filters.month.split('-')
          const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate()
          dateTo = `${filters.month}-${String(lastDay).padStart(2, '0')}`
        }

        const data = await getMetrics(dealerIds, dateFrom, dateTo, [])
        if (!cancelled) setMetrics(data)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [dealers, filters])

  // ── KPI computations ─────────────────────────────────────────────────────────

  const kpi = useMemo(() => {
    let directions = 0, websiteVisits = 0
    let googleSpend = 0, googleClicks = 0
    let metaSpend = 0, metaImpressions = 0
    let totalClicks = 0, totalImpressions = 0

    metrics.forEach((m: any) => {
      if (m.platform === 'google') {
        directions += m.driving_directions || 0
        googleSpend += m.spend_inr || 0
        googleClicks += m.link_clicks || 0
        totalClicks += m.link_clicks || 0
        totalImpressions += m.impressions || 0
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

    return { directions, websiteVisits, avgCpc, avgCpm, overallCtr }
  }, [metrics])

  // Top 15 dealers (alphabetical) as placeholder
  const top15Dealers = useMemo(() => dealers.slice(0, 15), [dealers])

  // ── Filter bar helpers ────────────────────────────────────────────────────────

  const selectCls =
    'w-full h-9 rounded-lg border border-slate-200 bg-white px-3 text-[13px] text-slate-700 ' +
    'focus:border-indigo-400 focus:outline-none transition'

  function handleFilter(key: keyof typeof filters, val: string) {
    setFilters((prev) => ({ ...prev, [key]: val }))
  }

  // ── JSX ──────────────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-[1440px] px-6 lg:px-8 py-6 lg:py-8 space-y-6">

      {/* ── Header ── */}
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Overview</h1>
        <p className="text-sm text-slate-500 mt-1">Aggregate performance across all dealers</p>
      </div>

      {/* ── Filter Bar ── */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">Zone</label>
            <Select
              value={filters.zone}
              onChange={(e) => handleFilter('zone', e.target.value)}
              className={selectCls}
            >
              <option value="">All</option>
              {['NORTH', 'SOUTH', 'EAST', 'WEST', 'CENTRAL'].map((z) => (
                <option key={z} value={z}>{z}</option>
              ))}
            </Select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">State</label>
            <Select
              value={filters.state}
              onChange={(e) => handleFilter('state', e.target.value)}
              className={selectCls}
            >
              <option value="">All</option>
              {states.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </Select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">Month</label>
            <Select
              value={filters.month}
              onChange={(e) => handleFilter('month', e.target.value)}
              className={selectCls}
            >
              {MONTH_OPTIONS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </Select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">Tier</label>
            <Select
              value={filters.tier}
              onChange={(e) => handleFilter('tier', e.target.value)}
              className={selectCls}
            >
              {TIER_OPTIONS.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </Select>
          </div>
        </div>
      </div>

      {/* ── KPI Strip (8 cards, 4 per row) ── */}
      {loading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-slate-100 animate-pulse rounded-xl h-24" />
            ))}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Row 1 */}
          <KpiCard
            icon={<Phone size={16} className="text-slate-300" />}
            label="Calls"
            value="—"
            note="Dashlog (coming soon)"
          />
          <KpiCard
            icon={<MapPin size={16} className="text-slate-300" />}
            label="Store Visits"
            value="—"
            note="Connector pending"
          />
          <KpiCard
            icon={<Navigation size={16} className="text-emerald-500" />}
            label="Driving Directions"
            value={formatNumber(kpi.directions)}
          />
          <KpiCard
            icon={<Activity size={16} className="text-blue-500" />}
            label="Website Visits"
            value={formatNumber(kpi.websiteVisits)}
          />

          {/* Row 2 */}
          <KpiCard
            icon={<TrendingUp size={16} className="text-indigo-500" />}
            label="Avg CPC (Google)"
            value={formatCurrency(kpi.avgCpc)}
          />
          <KpiCard
            icon={<Eye size={16} className="text-purple-500" />}
            label="Avg CPM (Meta)"
            value={formatCurrency(kpi.avgCpm)}
          />
          <KpiCard
            icon={<Zap size={16} className="text-amber-500" />}
            label="Overall CTR"
            value={kpi.overallCtr.toFixed(2)}
            suffix="%"
          />
          <KpiCard
            icon={<TrendingUp size={16} className="text-slate-300" />}
            label="Spend vs Planned"
            value="—/—"
            note="Budget data pending"
          />
        </div>
      )}

      {/* ── Top 15 Performers Table ── */}
      <div>
        <div className="flex items-center justify-between border-l-4 border-indigo-500 pl-3 mb-3">
          <div>
            <span className="text-sm font-semibold text-slate-800">Top Performers — Call Volume</span>
          </div>
          <span className="text-xs text-slate-400">Dashlog call data (coming soon)</span>
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
                style={{ tableLayout: 'fixed', minWidth: '920px' }}
              >
                <colgroup>
                  <col style={{ width: '48px' }} />
                  <col />
                  <col style={{ width: '110px' }} />
                  <col style={{ width: '80px' }} />
                  <col style={{ width: '88px' }} />
                  <col style={{ width: '100px' }} />
                  <col style={{ width: '90px' }} />
                  <col style={{ width: '180px' }} />
                </colgroup>
                <thead>
                  <tr className="bg-slate-50">
                    <th className="text-xs uppercase text-slate-400 font-medium px-4 py-3 text-left">#</th>
                    <th className="text-xs uppercase text-slate-400 font-medium px-4 py-3 text-left">Store Name</th>
                    <th className="text-xs uppercase text-slate-400 font-medium px-4 py-3 text-left">Zone</th>
                    <th className="text-xs uppercase text-slate-400 font-medium px-4 py-3 text-right">Tier</th>
                    <th className="text-xs uppercase text-slate-400 font-medium px-4 py-3 text-right">Calls</th>
                    <th className="text-xs uppercase text-slate-400 font-medium px-4 py-3 text-right">Answered</th>
                    <th className="text-xs uppercase text-slate-400 font-medium px-4 py-3 text-right">Missed</th>
                    <th className="text-xs uppercase text-slate-400 font-medium px-4 py-3 text-left">Progress</th>
                  </tr>
                </thead>
                <tbody>
                  {top15Dealers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-12 text-slate-400">
                        No data for selected period
                      </td>
                    </tr>
                  ) : (
                    top15Dealers.map((dealer: any, i: number) => (
                      <tr key={dealer.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 text-slate-400 text-xs font-mono border-b border-slate-50">{i + 1}</td>
                        <td className="px-4 py-3 font-medium text-slate-900 text-sm border-b border-slate-50 truncate">{dealer.dealer_name}</td>
                        <td className="px-4 py-3 text-slate-500 text-sm border-b border-slate-50">{dealer.zone || '—'}</td>
                        <td className="px-4 py-3 text-slate-400 text-sm text-right border-b border-slate-50">—</td>
                        <td className="px-4 py-3 text-slate-400 text-sm text-right border-b border-slate-50">—</td>
                        <td className="px-4 py-3 text-slate-400 text-sm text-right border-b border-slate-50">—</td>
                        <td className="px-4 py-3 text-slate-400 text-sm text-right border-b border-slate-50">—</td>
                        <td className="px-4 py-3 border-b border-slate-50">
                          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-indigo-500 rounded-full transition-all"
                              style={{ width: '0%' }}
                            />
                          </div>
                          <p className="text-xs text-slate-300 mt-1">(call data pending)</p>
                        </td>
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
