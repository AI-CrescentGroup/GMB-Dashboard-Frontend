'use client'

import { useEffect, useState } from 'react'
import { getFilterOptions, getStatusCounts } from '@/lib/queries'
import { X, SlidersHorizontal } from 'lucide-react'
import { Select } from '@/components/ui/select'

interface FilterBarProps {
  filters: {
    month: string
    zone: string
    market: string
    campaignStatus: string
  }
  onFilterChange: (filters: any) => void
  filteredDealers?: any[]
}

const MONTHS = [
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

export default function FilterBar({ filters, onFilterChange, filteredDealers = [] }: FilterBarProps) {
  const [zones, setZones] = useState<string[]>([])
  const [markets, setMarkets] = useState<string[]>([])
  const [statuses, setStatuses] = useState<string[]>([])
  const [statusCounts, setStatusCounts] = useState({ completed: 0, paused: 0, notLive: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadOptions() {
      try {
        const options = await getFilterOptions()
        setZones(options.zones.filter(Boolean))
        setMarkets(options.markets.filter(Boolean))
        setStatuses(options.statuses.filter(Boolean))
      } finally {
        setLoading(false)
      }
    }
    loadOptions()
  }, [])

  useEffect(() => {
    const counts = getStatusCounts(filteredDealers)
    setStatusCounts(counts)
  }, [filteredDealers])

  function handleChange(key: string, value: string) {
    onFilterChange({ ...filters, [key]: value })
  }

  function handleReset() {
    onFilterChange({ month: '', zone: '', market: '', campaignStatus: '' })
  }

  const activeFilters = Object.values(filters).filter(Boolean).length

  const selectClass =
    "w-full h-9 rounded-lg border border-slate-200 bg-white px-3 text-[13px] text-slate-700 " +
    "focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-100 transition"

  return (
    <div
      className="bg-white rounded-2xl p-5"
      style={{ boxShadow: '0 2px 12px rgba(15,23,42,0.06)' }}
    >
      {/* Header row */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 flex-shrink-0">
            <SlidersHorizontal size={16} />
          </div>
          <span className="text-[14px] font-semibold text-slate-900">Filters</span>
        </div>

        {/* Status badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Completed ({statusCounts.completed})
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-700">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            Paused ({statusCounts.paused})
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
            <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
            Not Live ({statusCounts.notLive})
          </span>
        </div>
      </div>

      {/* Filter controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
        <div>
          <label className="block text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-1.5">Month</label>
          <Select
            value={filters.month}
            onChange={(e) => handleChange('month', e.target.value)}
            disabled={loading}
            className={selectClass}
          >
            <option value="">All Months</option>
            {MONTHS.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </Select>
        </div>

        <div>
          <label className="block text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-1.5">Zone</label>
          <Select
            value={filters.zone}
            onChange={(e) => handleChange('zone', e.target.value)}
            disabled={loading}
            className={selectClass}
          >
            <option value="">All Zones</option>
            {zones.map((z) => (
              <option key={z} value={z}>{z}</option>
            ))}
          </Select>
        </div>

        <div>
          <label className="block text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-1.5">Tier / Market</label>
          <Select
            value={filters.market}
            onChange={(e) => handleChange('market', e.target.value)}
            disabled={loading}
            className={selectClass}
          >
            <option value="">All Tiers</option>
            {markets.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </Select>
        </div>

        <div>
          <label className="block text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-1.5">Status</label>
          <Select
            value={filters.campaignStatus}
            onChange={(e) => handleChange('campaignStatus', e.target.value)}
            disabled={loading}
            className={selectClass}
          >
            <option value="">All Statuses</option>
            {statuses.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </Select>
        </div>

        <div className="flex items-end">
          <button
            onClick={handleReset}
            disabled={activeFilters === 0}
            className="w-full h-9 px-3 rounded-lg text-[13px] font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-50 border border-slate-200 transition disabled:opacity-40 flex items-center justify-center gap-1.5"
          >
            <X size={14} />
            Reset
          </button>
        </div>
      </div>
    </div>
  )
}
