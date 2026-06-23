'use client'

import { useEffect, useState } from 'react'
import { getFilterOptions, getStatusCounts } from '@/lib/queries'
import { X, Filter, Circle } from 'lucide-react'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'

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

  // Update status counts when filtered dealers change
  useEffect(() => {
    const counts = getStatusCounts(filteredDealers)
    setStatusCounts(counts)
  }, [filteredDealers])

  function handleChange(key: string, value: string) {
    const newFilters = { ...filters, [key]: value }
    onFilterChange(newFilters)
  }

  function handleReset() {
    const resetFilters = {
      month: '',
      zone: '',
      market: '',
      campaignStatus: '',
    }
    onFilterChange(resetFilters)
  }

  const activeFilters = Object.values(filters).filter(Boolean).length

  return (
    <div className="bg-white rounded-2xl p-6" style={{ boxShadow: 'var(--shadow-card)' }}>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#fff5f2', color: '#e07856' }}>
            <Filter size={20} />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
        </div>

        {/* Status Chips */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 px-3 h-7 rounded-full" style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
            <Circle size={6} style={{ color: '#22c55e', fill: '#22c55e' }} />
            <span className="text-xs font-medium text-gray-900">Completed ({statusCounts.completed})</span>
          </div>
          <div className="flex items-center gap-2 px-3 h-7 rounded-full" style={{ backgroundColor: '#fffbeb', border: '1px solid #fcd34d' }}>
            <Circle size={6} style={{ color: '#eab308', fill: '#eab308' }} />
            <span className="text-xs font-medium text-gray-900">Paused ({statusCounts.paused})</span>
          </div>
          <div className="flex items-center gap-2 px-3 h-7 rounded-full" style={{ backgroundColor: '#f5f5f5', border: '1px solid #d1d5db' }}>
            <Circle size={6} style={{ color: '#6b7280', fill: '#6b7280' }} />
            <span className="text-xs font-medium text-gray-900">Not Live ({statusCounts.notLive})</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Month */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 uppercase mb-2 tracking-widest">Month</label>
          <Select
            value={filters.month}
            onChange={(e) => handleChange('month', e.target.value)}
            disabled={loading}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 bg-white"
          >
            <option value="">All Months</option>
            {MONTHS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </Select>
        </div>

        {/* Zone */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 uppercase mb-2 tracking-widest">Zone</label>
          <Select
            value={filters.zone}
            onChange={(e) => handleChange('zone', e.target.value)}
            disabled={loading}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 bg-white"
          >
            <option value="">All Zones</option>
            {zones.map((z) => (
              <option key={z} value={z}>
                {z}
              </option>
            ))}
          </Select>
        </div>

        {/* Tier/Market */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 uppercase mb-2 tracking-widest">Tier/Market</label>
          <Select
            value={filters.market}
            onChange={(e) => handleChange('market', e.target.value)}
            disabled={loading}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 bg-white"
          >
            <option value="">All Tiers</option>
            {markets.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </Select>
        </div>

        {/* Status */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 uppercase mb-2 tracking-widest">Status</label>
          <Select
            value={filters.campaignStatus}
            onChange={(e) => handleChange('campaignStatus', e.target.value)}
            disabled={loading}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 bg-white"
          >
            <option value="">All Statuses</option>
            {statuses.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </div>

        {/* Reset Button */}
        <div className="flex items-end">
          <button
            onClick={handleReset}
            disabled={activeFilters === 0}
            className="w-full h-9 px-3 rounded-xl text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <X size={16} />
            Reset
          </button>
        </div>
      </div>
    </div>
  )
}
