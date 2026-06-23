'use client'

import { useEffect, useState } from 'react'
import FilterBar from '@/components/FilterBar'
import Card from '@/components/Card'
import StatsCard from '@/components/StatsCard'
import { EventCountChart, DrivingDirectionsChart, WebsiteVisitsChart } from '@/components/Charts'
import { getDealers, getMetricsByMonth, getMetrics } from '@/lib/queries'
import { Zap, MapPin, TrendingUp, Activity } from 'lucide-react'

export default function ConversionsPage() {
  const [dealers, setDealers] = useState<any[]>([])
  const [metrics, setMetrics] = useState<any[]>([])
  const [monthlyData, setMonthlyData] = useState<any>({})
  const [filters, setFilters] = useState({
    month: '',
    zone: '',
    market: '',
    campaignStatus: '',
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
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

        const dealerIds = filteredDealers.map((d) => d.id)

        let dateFrom = '2025-11-01'
        let dateTo = '2026-03-31'
        if (filters.month) {
          dateFrom = `${filters.month}-01`
          const [year, month] = filters.month.split('-')
          const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate()
          dateTo = `${filters.month}-${lastDay}`
        }

        const allMetrics = await getMetrics(dealerIds, dateFrom, dateTo, [])
        setMetrics(allMetrics)

        const monthlyAgg = await getMetricsByMonth(dealerIds, [], dateFrom, dateTo)
        setMonthlyData(monthlyAgg)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [filters])

  const totalDirections = metrics.reduce((sum, m) => sum + (m.driving_directions || 0), 0)
  const totalWebsiteVisits = metrics.reduce((sum, m) => sum + (m.website_visits || 0), 0)
  const totalEvents = metrics.reduce((sum, m) => sum + (m.event_count || 0), 0)

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="title-lg text-gray-900">Conversions</h1>
        <p className="text-gray-500 mt-2">Track conversion metrics and customer actions</p>
      </div>

      {/* Filters */}
      <FilterBar filters={filters} onFilterChange={setFilters} filteredDealers={[]} />

      {loading ? (
        <div className="flex items-center justify-center h-96">
          <Activity size={40} className="text-brand-600 animate-spin" />
        </div>
      ) : (
        <>
          {/* KPI Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatsCard
              label="Driving Directions"
              value={totalDirections.toLocaleString('en-IN')}
              icon={<MapPin size={20} />}
            />
            <StatsCard
              label="Website Visits"
              value={totalWebsiteVisits.toLocaleString('en-IN')}
              icon={<TrendingUp size={20} />}
            />
            <StatsCard
              label="Event Count"
              value={totalEvents.toLocaleString('en-IN')}
              icon={<Zap size={20} />}
            />
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card title="Driving Directions" subtitle="Month-over-month trend">
              <DrivingDirectionsChart data={monthlyData} />
            </Card>

            <Card title="Website Visits" subtitle="Traffic source analysis">
              <WebsiteVisitsChart data={monthlyData} />
            </Card>
          </div>

          {/* Full Width Chart */}
          <Card title="Event Count" subtitle="User engagement metrics">
            <EventCountChart data={monthlyData} />
          </Card>
        </>
      )}
    </div>
  )
}
