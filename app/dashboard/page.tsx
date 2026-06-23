'use client'

import { useEffect, useState, useMemo } from 'react'
import Card from '@/components/Card'
import StatsCard from '@/components/StatsCard'
import { MonthlySpendChart, DrivingDirectionsChart, WebsiteVisitsChart, PlatformBreakdownChart, ZoneComparisonChart } from '@/components/Charts'
import { getDealers, getMetricsByMonth, getMetrics, getTopPerformers } from '@/lib/queries'
import { TrendingUp, MapPin, Zap, Eye, Activity } from 'lucide-react'
import FilterBar from '@/components/FilterBar'
import TopPerformersTable from '@/components/TopPerformersTable'
import { supabase } from '@/lib/supabase'

export default function OverviewPage() {
  const [metrics, setMetrics] = useState<any[]>([])
  const [monthlyData, setMonthlyData] = useState<any>({})
  const [filters, setFilters] = useState({
    month: '',
    zone: '',
    market: '',
    campaignStatus: '',
  })
  const [loading, setLoading] = useState(true)
  const [dealers, setDealers] = useState<any[]>([])
  const [uiFilteredDealers, setUiFilteredDealers] = useState<any[]>([])

  // Compute top performers synchronously from existing metrics state
  const ddTopPerformers = useMemo(
    () => getTopPerformers(metrics, uiFilteredDealers, 'dd'),
    [metrics, uiFilteredDealers]
  )
  const wvTopPerformers = useMemo(
    () => getTopPerformers(metrics, uiFilteredDealers, 'wv'),
    [metrics, uiFilteredDealers]
  )

  useEffect(() => {
    let cancelled = false

    async function loadData() {
      setLoading(true)
      try {
        const allDealers = await getDealers()
        setDealers(allDealers)

        let filteredDealers = allDealers
        if (filters.zone) filteredDealers = filteredDealers.filter((d) => d.zone === filters.zone)
        if (filters.market) filteredDealers = filteredDealers.filter((d) => d.market === filters.market)
        if (filters.campaignStatus)
          filteredDealers = filteredDealers.filter((d) => d.campaign_status === filters.campaignStatus)

        setUiFilteredDealers(filteredDealers)

        const dealerIds = filteredDealers.map((d) => d.id)

        let dateFrom = '2025-05-28'
        let dateTo = '2026-03-31'
        if (filters.month) {
          dateFrom = `${filters.month}-01`
          const [year, month] = filters.month.split('-')
          const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate()
          dateTo = `${filters.month}-${lastDay}`
        }

        const allMetrics = await getMetrics(dealerIds, dateFrom, dateTo, [])
        if (!cancelled) {
          setMetrics(allMetrics)
          setLoading(false)
        }

        const monthlyAgg = await getMetricsByMonth(dealerIds, [], dateFrom, dateTo)
        if (!cancelled) {
          setMonthlyData(monthlyAgg)
        }
      } catch (error) {
        if (!cancelled) {
          setLoading(false)
        }
        throw error
      }
    }

    loadData()

    return () => {
      cancelled = true
    }
  }, [filters])

  function formatSpend(val: number): string {
    if (val >= 100_000) return `₹${(val / 100_000).toFixed(2)}L`
    if (val >= 1_000) return `₹${(val / 1_000).toFixed(1)}K`
    return `₹${val.toFixed(2)}`
  }
  function formatCount(val: number): string {
    if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(2)}M`
    if (val >= 1_000) return `${(val / 1_000).toFixed(1)}K`
    return val.toLocaleString('en-IN')
  }

  const totalSpend = metrics.reduce((sum, m) => sum + (m.spend_inr || 0), 0)
  const totalWebsiteVisits = metrics.reduce((sum, m) => sum + (m.website_visits || 0), 0)
  const totalDirections = metrics.reduce((sum, m) => sum + (m.driving_directions || 0), 0)
  const googleSpend = metrics.reduce((sum, m) => sum + (m.platform === 'google' ? (m.spend_inr || 0) : 0), 0)
  const instagramSpend = metrics.reduce((sum, m) => sum + (m.platform === 'instagram' ? (m.spend_inr || 0) : 0), 0)
  const facebookSpend = metrics.reduce((sum, m) => sum + (m.platform === 'facebook' ? (m.spend_inr || 0) : 0), 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Activity size={40} className="text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-8 space-y-6">
      {/* Filters */}
      <FilterBar filters={filters} onFilterChange={setFilters} filteredDealers={uiFilteredDealers} />

      {/* Stats Grid - Row 1: 4 columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          label="Total Planned Budget"
          value="—"
          subtitle="Pending budget data"
          icon={<TrendingUp size={24} />}
        />
        <StatsCard
          label="Total Spend"
          value={formatSpend(totalSpend)}
          icon={<TrendingUp size={24} />}
        />
        <StatsCard
          label="Driving Directions"
          value={formatCount(totalDirections)}
          icon={<MapPin size={24} />}
        />
        <StatsCard
          label="Website Visits"
          value={formatCount(totalWebsiteVisits)}
          icon={<Activity size={24} />}
        />
      </div>

      {/* Stats Grid - Row 2: 3 columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatsCard
          label="Google Spend"
          value={formatSpend(googleSpend)}
          icon={<TrendingUp size={24} />}
        />
        <StatsCard
          label="Instagram Spend"
          value={formatSpend(instagramSpend)}
          icon={<TrendingUp size={24} />}
        />
        <StatsCard
          label="Facebook Spend"
          value={formatSpend(facebookSpend)}
          icon={<TrendingUp size={24} />}
        />
      </div>

      {/* Charts Grid - 2 columns max */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Monthly Spend by Platform" subtitle="Track spending across all channels">
          <MonthlySpendChart data={monthlyData} />
        </Card>

        <Card title="Platform Breakdown" subtitle="Spend distribution by channel">
          <PlatformBreakdownChart data={monthlyData} />
        </Card>
      </div>

      {/* Full width sections */}
      <div className="space-y-6">
        <Card title="Driving Directions" subtitle="Month-over-month trend">
          <DrivingDirectionsChart data={monthlyData} />
        </Card>

        <Card title="Website Visits" subtitle="Traffic from all sources">
          <WebsiteVisitsChart data={monthlyData} />
        </Card>

        <Card title="📊 Zone-wise Monthly Comparison" subtitle="Compare key metrics across zones">
          <ZoneComparisonChart
            dealerIds={uiFilteredDealers.map(d => d.id)}
            dateFrom={filters.month ? `${filters.month}-01` : '2025-05-28'}
            dateTo={filters.month
              ? `${filters.month}-${new Date(parseInt(filters.month.split('-')[0]), parseInt(filters.month.split('-')[1]), 0).getDate()}`
              : '2026-03-31'}
          />
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TopPerformersTable
            title="🏆 Top Performers — Driving Directions"
            data={ddTopPerformers}
            valueLabel="Directions"
            accentColor="#10B981"
          />
          <TopPerformersTable
            title="🏆 Top Performers — Website Visits"
            data={wvTopPerformers}
            valueLabel="Visits"
            accentColor="#3B82F6"
          />
        </div>
      </div>
    </div>
  )
}
