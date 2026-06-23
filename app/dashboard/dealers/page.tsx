'use client'

import { useEffect, useState, useMemo } from 'react'
import Card from '@/components/Card'
import StatsCard from '@/components/StatsCard'
import { getDealers, getMetrics, getGoogleMetricsByMonth } from '@/lib/queries'
import { Eye, Zap, TrendingUp, Activity, Calendar, Download } from 'lucide-react'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { BarChart, Bar, LineChart, Line, ComposedChart, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { exportDealerPPT } from '@/lib/exportPPT'

const MONTHS = [
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

const PLATFORMS = [
  { id: 'google', label: 'Google' },
  { id: 'facebook', label: 'Facebook' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'conversions', label: 'Conversions' },
]

export default function DealersPage() {
  const [dealers, setDealers] = useState<any[]>([])
  const [selectedDealerId, setSelectedDealerId] = useState('')
  const [allDealersMetrics, setAllDealersMetrics] = useState<any[]>([])
  const [displayMetrics, setSelectedDealerMetrics] = useState<any[]>([])
  const [selectedPlatform, setSelectedPlatform] = useState('google')
  const [selectedMonth, setSelectedMonth] = useState('all')
  const [viewMode, setViewMode] = useState<'monthly' | 'daterange'>('monthly')
  const [dateFrom, setDateFrom] = useState('2025-05-28')
  const [dateTo, setDateTo] = useState('2026-03-31')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadDealers() {
      const allDealers = await getDealers()
      setDealers(allDealers)
    }
    loadDealers()
  }, [])

  useEffect(() => {
    async function loadMetrics() {
      setLoading(true)
      try {
        let finalDateFrom = dateFrom
        let finalDateTo = dateTo

        // If in monthly mode, derive dates from selectedMonth
        if (viewMode === 'monthly') {
          if (!selectedMonth || selectedMonth === 'all') {
            finalDateFrom = '2025-05-28'
            finalDateTo = '2026-03-31'
          } else {
            const [year, month] = selectedMonth.split('-')
            const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate()
            finalDateFrom = `${selectedMonth}-01`
            finalDateTo = `${selectedMonth}-${lastDay}`
          }
        }

        // Load all dealers aggregated
        const allDealerIds = dealers.map((d) => d.id)
        const allMetrics = await getMetrics(
          allDealerIds,
          finalDateFrom,
          finalDateTo,
          []
        )
        setAllDealersMetrics(allMetrics)

        // Load selected dealer
        if (selectedDealerId) {
          const dealerMetrics = await getMetrics([selectedDealerId], finalDateFrom, finalDateTo, [])
          setSelectedDealerMetrics(dealerMetrics)
        }
      } finally {
        setLoading(false)
      }
    }

    if (dealers.length > 0) {
      loadMetrics()
    }
  }, [selectedDealerId, selectedMonth, dateFrom, dateTo, viewMode, dealers])

  const defaultMetrics = {
    reach: 0,
    impressions: 0,
    clicks: 0,
    ctr: '0.00',
    cpm: '0.00',
    cpc: '0.00',
    spend: 0,
    directions: 0,
    visits: 0,
    events: 0,
  }

  const calculateMetrics = (metricsData: any[], platform: string) => {
    if (!metricsData || metricsData.length === 0) return defaultMetrics

    if (platform === 'conversions') {
      return {
        ...defaultMetrics,
        directions: metricsData.reduce((sum, m) => sum + (m.driving_directions || 0), 0),
        visits: metricsData.reduce((sum, m) => sum + (m.website_visits || 0), 0),
        events: metricsData.reduce((sum, m) => sum + (m.event_count || 0), 0),
      }
    }

    const platformMetrics = metricsData.filter((m) => m.platform === platform)
    const totalImpressions = platformMetrics.reduce((sum, m) => sum + (m.impressions || 0), 0)
    const totalClicks = platformMetrics.reduce((sum, m) => sum + (m.link_clicks || 0), 0)
    const totalSpend = platformMetrics.reduce((sum, m) => sum + (m.spend_inr || 0), 0)

    if (platform === 'google') {
      const avgCtr = platformMetrics.length > 0
        ? (platformMetrics.reduce((sum, m) => sum + (parseFloat(m.ctr_percent || 0)), 0) / platformMetrics.length).toFixed(2)
        : '0.00'
      const avgCpc = platformMetrics.length > 0
        ? (platformMetrics.reduce((sum, m) => sum + (m.avg_cpc_inr || 0), 0) / platformMetrics.length).toFixed(2)
        : '0.00'
      return {
        ...defaultMetrics,
        impressions: totalImpressions,
        clicks: totalClicks,
        ctr: avgCtr,
        cpc: avgCpc,
        spend: totalSpend,
      }
    }

    return {
      ...defaultMetrics,
      reach: platformMetrics.reduce((sum, m) => sum + (m.reach || 0), 0),
      impressions: totalImpressions,
      clicks: totalClicks,
      ctr: totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : '0.00',
      cpm: totalImpressions > 0 ? ((totalSpend / (totalImpressions / 1000))).toFixed(2) : '0.00',
      spend: totalSpend,
    }
  }

  const allDealersMetric = calculateMetrics(allDealersMetrics, selectedPlatform)
  const selectedDealerMetric = calculateMetrics(displayMetrics, selectedPlatform)

  // When no specific dealer is selected, show all dealers metrics
  const displayMetric = selectedDealerId ? selectedDealerMetric : allDealersMetric

  const handleExportPPT = () => {
    if (!selectedDealerId) {
      alert('Please select a dealer first')
      return
    }

    const selectedDealer = dealers.find((d) => d.id === selectedDealerId)
    if (!selectedDealer) return

    // Calculate date range
    let currentDateFrom = dateFrom
    let currentDateTo = dateTo
    let dateRangeText = ''

    if (viewMode === 'monthly') {
      if (!selectedMonth || selectedMonth === 'all') {
        currentDateFrom = '2025-05-28'
        currentDateTo = '2026-03-31'
        dateRangeText = 'May 2025 - Mar 2026'
      } else {
        const [year, month] = selectedMonth.split('-')
        const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate()
        currentDateFrom = `${selectedMonth}-01`
        currentDateTo = `${selectedMonth}-${lastDay}`
        const monthDate = new Date(selectedMonth + '-01')
        dateRangeText = monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      }
    } else {
      dateRangeText = `${currentDateFrom} to ${currentDateTo}`
    }

    const metricsSource = selectedDealerId ? displayMetrics : allDealersMetrics

    // Google metrics
    const googleRows = metricsSource.filter(
      (r) => r.platform === 'google' && r.metric_date >= currentDateFrom && r.metric_date <= currentDateTo
    )
    const googleImpressions = googleRows.reduce((s, r) => s + (r.impressions || 0), 0)
    const googleClicks = googleRows.reduce((s, r) => s + (r.link_clicks || 0), 0)
    const googleCTR =
      googleRows.length > 0
        ? (googleRows.reduce((s, r) => s + (r.ctr_percent || 0), 0) / googleRows.length).toFixed(2)
        : '0.00'
    const googleAvgCPC =
      googleRows.length > 0
        ? (googleRows.reduce((s, r) => s + (r.avg_cpc_inr || 0), 0) / googleRows.length).toFixed(2)
        : '0.00'
    const googleSpent = googleRows.reduce((s, r) => s + (r.spend_inr || 0), 0)

    const googleData = {
      impressions: formatImpressions(googleImpressions),
      clicks: formatCount(googleClicks),
      ctr: googleCTR + '%',
      cpc: '₹' + googleAvgCPC,
      spent: formatSpend(googleSpent),
    }

    // Facebook metrics
    const fbRows = metricsSource.filter(
      (r) => r.platform === 'facebook' && r.metric_date >= currentDateFrom && r.metric_date <= currentDateTo
    )
    const fbImpressions = fbRows.reduce((s, r) => s + (r.impressions || 0), 0)
    const fbClicks = fbRows.reduce((s, r) => s + (r.link_clicks || 0), 0)
    const fbCTR =
      fbRows.length > 0
        ? (fbRows.reduce((s, r) => s + (r.ctr_percent || 0), 0) / fbRows.length).toFixed(2)
        : '0.00'
    const fbAvgCPM =
      fbRows.length > 0 ? (fbRows.reduce((s, r) => s + (r.cpm_inr || 0), 0) / fbRows.length).toFixed(2) : '0.00'
    const fbSpent = fbRows.reduce((s, r) => s + (r.spend_inr || 0), 0)

    const facebookData = {
      impressions: formatImpressions(fbImpressions),
      clicks: formatCount(fbClicks),
      ctr: fbCTR + '%',
      cpm: '₹' + fbAvgCPM,
      spent: formatSpend(fbSpent),
    }

    // Instagram metrics
    const igRows = metricsSource.filter(
      (r) => r.platform === 'instagram' && r.metric_date >= currentDateFrom && r.metric_date <= currentDateTo
    )
    const igImpressions = igRows.reduce((s, r) => s + (r.impressions || 0), 0)
    const igClicks = igRows.reduce((s, r) => s + (r.link_clicks || 0), 0)
    const igCTR =
      igRows.length > 0
        ? (igRows.reduce((s, r) => s + (r.ctr_percent || 0), 0) / igRows.length).toFixed(2)
        : '0.00'
    const igAvgCPM =
      igRows.length > 0 ? (igRows.reduce((s, r) => s + (r.cpm_inr || 0), 0) / igRows.length).toFixed(2) : '0.00'
    const igSpent = igRows.reduce((s, r) => s + (r.spend_inr || 0), 0)

    const instagramData = {
      impressions: formatImpressions(igImpressions),
      clicks: formatCount(igClicks),
      ctr: igCTR + '%',
      cpm: '₹' + igAvgCPM,
      spent: formatSpend(igSpent),
    }

    // Conversions (directions from google, visits+events from ga4)
    const ga4Rows = metricsSource.filter(
      (r) => r.platform === 'ga4' && r.metric_date >= currentDateFrom && r.metric_date <= currentDateTo
    )
    const directions = googleRows.reduce((s, r) => s + (r.driving_directions || 0), 0)
    const visits = ga4Rows.reduce((s, r) => s + (r.website_visits || 0), 0)
    const events = ga4Rows.reduce((s, r) => s + (r.event_count || 0), 0)

    const conversionsData = {
      directions: formatCount(directions),
      visits: formatCount(visits),
      events: formatCount(events),
    }

    exportDealerPPT({
      dealerName: selectedDealer.dealer_name,
      dateRange: dateRangeText,
      google: googleData,
      facebook: facebookData,
      instagram: instagramData,
      conversions: conversionsData,
    })
  }

  // Adaptive formatting helpers
  const formatImpressions = (val: number): string => {
    if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(2)}M`
    if (val >= 1_000) return `${(val / 1_000).toFixed(1)}K`
    return val.toLocaleString('en-IN')
  }

  const formatSpend = (val: number): string => {
    if (val >= 100_000) return `₹${(val / 100_000).toFixed(2)}L`
    if (val >= 1_000) return `₹${(val / 1_000).toFixed(1)}K`
    return `₹${val.toFixed(2)}`
  }

  const formatCount = (val: number): string => {
    if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(2)}M`
    if (val >= 1_000) return `${(val / 1_000).toFixed(1)}K`
    return val.toLocaleString('en-IN')
  }

  // Compute Google metrics by month for charts
  const getMonthlyDataByPlatform = (metricsArray: any[], platform: string) => {
    const MONTHS = ['2025-05', '2025-06', '2025-07', '2025-08', '2025-09', '2025-10', '2025-11', '2025-12', '2026-01', '2026-02', '2026-03']
    const monthMap: { [key: string]: { impressions: number; clicks: number; ctrSum: number; count: number } } = {}

    MONTHS.forEach((m) => {
      monthMap[m] = { impressions: 0, clicks: 0, ctrSum: 0, count: 0 }
    })

    metricsArray.forEach((row) => {
      if (row.platform !== platform) return
      const month = row.metric_date.substring(0, 7)
      if (!monthMap[month]) return
      monthMap[month].impressions += row.impressions || 0
      monthMap[month].clicks += row.link_clicks || 0
      monthMap[month].ctrSum += parseFloat(row.ctr_percent || 0)
      monthMap[month].count += 1
    })

    return MONTHS.map((month) => ({
      month,
      impressions: monthMap[month].impressions,
      clicks: monthMap[month].clicks,
      ctr: monthMap[month].count > 0 ? monthMap[month].ctrSum / monthMap[month].count : 0,
    }))
  }

  const googleMonthlyData = useMemo(() => {
    const metricsToUse = selectedDealerId ? displayMetrics : allDealersMetrics

    // Calculate final date range (same logic as in useEffect)
    let finalDateFrom = dateFrom
    let finalDateTo = dateTo
    if (viewMode === 'monthly') {
      if (!selectedMonth || selectedMonth === 'all') {
        finalDateFrom = '2025-05-28'
        finalDateTo = '2026-03-31'
      } else {
        const [year, month] = selectedMonth.split('-')
        const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate()
        finalDateFrom = `${selectedMonth}-01`
        finalDateTo = `${selectedMonth}-${lastDay}`
      }
    }

    // Filter metrics by date range before aggregating
    const filteredMetrics = metricsToUse.filter(r => r.metric_date >= finalDateFrom && r.metric_date <= finalDateTo)
    const data = getGoogleMetricsByMonth(filteredMetrics)
    return data.map((d) => ({
      ...d,
      monthLabel: new Date(d.month + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
    }))
  }, [displayMetrics, allDealersMetrics, selectedDealerId, selectedMonth, dateFrom, dateTo, viewMode])

  const fbMonthlyData = useMemo(() => {
    const metricsToUse = selectedDealerId ? displayMetrics : allDealersMetrics

    // Calculate final date range
    let finalDateFrom = dateFrom
    let finalDateTo = dateTo
    if (viewMode === 'monthly') {
      if (!selectedMonth || selectedMonth === 'all') {
        finalDateFrom = '2025-05-28'
        finalDateTo = '2026-03-31'
      } else {
        const [year, month] = selectedMonth.split('-')
        const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate()
        finalDateFrom = `${selectedMonth}-01`
        finalDateTo = `${selectedMonth}-${lastDay}`
      }
    }

    const filteredMetrics = metricsToUse.filter(r => r.metric_date >= finalDateFrom && r.metric_date <= finalDateTo)
    const data = getMonthlyDataByPlatform(filteredMetrics, 'facebook')
    return data.map((d) => ({
      ...d,
      monthLabel: new Date(d.month + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
    }))
  }, [displayMetrics, allDealersMetrics, selectedDealerId, selectedMonth, dateFrom, dateTo, viewMode])

  const igMonthlyData = useMemo(() => {
    const metricsToUse = selectedDealerId ? displayMetrics : allDealersMetrics

    // Calculate final date range
    let finalDateFrom = dateFrom
    let finalDateTo = dateTo
    if (viewMode === 'monthly') {
      if (!selectedMonth || selectedMonth === 'all') {
        finalDateFrom = '2025-05-28'
        finalDateTo = '2026-03-31'
      } else {
        const [year, month] = selectedMonth.split('-')
        const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate()
        finalDateFrom = `${selectedMonth}-01`
        finalDateTo = `${selectedMonth}-${lastDay}`
      }
    }

    const filteredMetrics = metricsToUse.filter(r => r.metric_date >= finalDateFrom && r.metric_date <= finalDateTo)
    const data = getMonthlyDataByPlatform(filteredMetrics, 'instagram')
    return data.map((d) => ({
      ...d,
      monthLabel: new Date(d.month + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
    }))
  }, [displayMetrics, allDealersMetrics, selectedDealerId, selectedMonth, dateFrom, dateTo, viewMode])

  const directionsMonthlyData = useMemo(() => {
    const metricsToUse = selectedDealerId ? displayMetrics : allDealersMetrics

    // Calculate final date range
    let finalDateFrom = dateFrom
    let finalDateTo = dateTo
    if (viewMode === 'monthly') {
      if (!selectedMonth || selectedMonth === 'all') {
        finalDateFrom = '2025-05-28'
        finalDateTo = '2026-03-31'
      } else {
        const [year, month] = selectedMonth.split('-')
        const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate()
        finalDateFrom = `${selectedMonth}-01`
        finalDateTo = `${selectedMonth}-${lastDay}`
      }
    }

    const MONTHS = ['2025-05', '2025-06', '2025-07', '2025-08', '2025-09', '2025-10', '2025-11', '2025-12', '2026-01', '2026-02', '2026-03']
    const monthMap: { [key: string]: number } = {}

    MONTHS.forEach((m) => {
      monthMap[m] = 0
    })

    const filteredMetrics = metricsToUse.filter(
      (r) => r.platform === 'google' && r.metric_date >= finalDateFrom && r.metric_date <= finalDateTo
    )

    filteredMetrics.forEach((row) => {
      const month = row.metric_date.substring(0, 7)
      if (!(month in monthMap)) return
      monthMap[month] += row.driving_directions || 0
    })

    return MONTHS.map((month) => ({
      month,
      monthLabel: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      directions: monthMap[month],
    }))
  }, [displayMetrics, allDealersMetrics, selectedDealerId, selectedMonth, dateFrom, dateTo, viewMode])

  const visitsMonthlyData = useMemo(() => {
    const metricsToUse = selectedDealerId ? displayMetrics : allDealersMetrics

    // Calculate final date range
    let finalDateFrom = dateFrom
    let finalDateTo = dateTo
    if (viewMode === 'monthly') {
      if (!selectedMonth || selectedMonth === 'all') {
        finalDateFrom = '2025-05-28'
        finalDateTo = '2026-03-31'
      } else {
        const [year, month] = selectedMonth.split('-')
        const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate()
        finalDateFrom = `${selectedMonth}-01`
        finalDateTo = `${selectedMonth}-${lastDay}`
      }
    }

    const MONTHS = ['2025-05', '2025-06', '2025-07', '2025-08', '2025-09', '2025-10', '2025-11', '2025-12', '2026-01', '2026-02', '2026-03']
    const monthMap: { [key: string]: number } = {}

    MONTHS.forEach((m) => {
      monthMap[m] = 0
    })

    const filteredMetrics = metricsToUse.filter(
      (r) => r.platform === 'ga4' && r.metric_date >= finalDateFrom && r.metric_date <= finalDateTo
    )

    filteredMetrics.forEach((row) => {
      const month = row.metric_date.substring(0, 7)
      if (!(month in monthMap)) return
      monthMap[month] += row.website_visits || 0
    })

    return MONTHS.map((month) => ({
      month,
      monthLabel: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      visits: monthMap[month],
    }))
  }, [displayMetrics, allDealersMetrics, selectedDealerId, selectedMonth, dateFrom, dateTo, viewMode])

  const [activeEventIndex, setActiveEventIndex] = useState<number>(0)

  const eventPieData = useMemo(() => {
    const metricsToUse = selectedDealerId ? displayMetrics : allDealersMetrics

    // Calculate final date range
    let finalDateFrom = dateFrom
    let finalDateTo = dateTo
    if (viewMode === 'monthly') {
      if (!selectedMonth || selectedMonth === 'all') {
        finalDateFrom = '2025-05-28'
        finalDateTo = '2026-03-31'
      } else {
        const [year, month] = selectedMonth.split('-')
        const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate()
        finalDateFrom = `${selectedMonth}-01`
        finalDateTo = `${selectedMonth}-${lastDay}`
      }
    }

    const filteredMetrics = metricsToUse.filter(
      (r) => r.platform === 'ga4' && r.metric_date >= finalDateFrom && r.metric_date <= finalDateTo
    )

    const eventMap = {
      'Call Number Track': { sum: 0, color: '#3B82F6' },
      'Call Track': { sum: 0, color: '#10B981' },
      'Download Catalogue': { sum: 0, color: '#F59E0B' },
      'Drive Direction': { sum: 0, color: '#EC4899' },
      'Enquiry Track': { sum: 0, color: '#8B5CF6' },
      'Form Submit': { sum: 0, color: '#EF4444' },
    }

    filteredMetrics.forEach((row) => {
      eventMap['Call Number Track'].sum += row.event_call_number_track || 0
      eventMap['Call Track'].sum += row.event_call_track || 0
      eventMap['Download Catalogue'].sum += row.event_download_catalogue || 0
      eventMap['Drive Direction'].sum += row.event_drive_direction || 0
      eventMap['Enquiry Track'].sum += row.event_enquiry_track || 0
      eventMap['Form Submit'].sum += row.event_form_submit || 0
    })

    return Object.entries(eventMap)
      .filter(([_, data]) => data.sum > 0)
      .map(([name, data]) => ({
        name,
        value: data.sum,
        color: data.color,
      }))
  }, [displayMetrics, allDealersMetrics, selectedDealerId, selectedMonth, dateFrom, dateTo, viewMode])

  return (
    <div className="space-y-10">
      {/* Page Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-gray-900">Individual Dealers</h1>
        <p className="text-gray-600">Deep dive into dealer performance and metrics</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-96">
          <Activity size={40} className="text-blue-600 animate-spin" />
        </div>
      ) : (
        <>
          {/* Controls Row */}
          <div className="bg-white rounded-2xl p-6 flex items-end gap-4 flex-wrap" style={{ boxShadow: 'var(--shadow-card)' }}>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs font-semibold text-gray-600 uppercase mb-2 tracking-widest">
                Select Dealer
              </label>
              <Select value={selectedDealerId} onChange={(e) => setSelectedDealerId(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 bg-white h-10">
                <option value="">-- All Dealers (Aggregated) --</option>
                {dealers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.dealer_name}
                  </option>
                ))}
              </Select>
            </div>

            {viewMode === 'monthly' ? (
              <div className="flex-1 min-w-[150px]">
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-2 tracking-widest">
                  Month
                </label>
                <Select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 bg-white h-10">
                  {MONTHS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </Select>
              </div>
            ) : (
              <>
                <div className="flex-1 min-w-[140px]">
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-2 tracking-widest">
                    From Date
                  </label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full px-3 py-2 h-10 border border-gray-200 rounded-xl text-sm text-gray-700 bg-white"
                  />
                </div>
                <div className="flex-1 min-w-[140px]">
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-2 tracking-widest">
                    To Date
                  </label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full px-3 py-2 h-10 border border-gray-200 rounded-xl text-sm text-gray-700 bg-white"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase mb-2 tracking-widest invisible">
                View Mode
              </label>
              <div className="flex gap-1 h-10">
                <button
                  className={`px-3 py-2 rounded-xl text-sm font-medium transition ${viewMode === 'monthly' ? 'bg-[#e07856] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                  onClick={() => setViewMode('monthly')}
                >
                  Monthly
                </button>
                <button
                  className={`px-3 py-2 rounded-xl text-sm font-medium transition ${viewMode === 'daterange' ? 'bg-[#e07856] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                  onClick={() => setViewMode('daterange')}
                >
                  Date Range
                </button>
              </div>
            </div>

            <div className="ml-auto">
              <label className="block text-xs font-semibold text-gray-600 uppercase mb-2 tracking-widest invisible">
                Export
              </label>
              <button
                onClick={handleExportPPT}
                className="h-10 px-4 rounded-xl text-sm font-medium text-white bg-[#e07856] hover:bg-[#d46a47] transition flex items-center gap-2"
              >
                <Download size={16} />
                Download PPT
              </button>
            </div>
          </div>

          {/* Platform Chips */}
          <div className="flex flex-wrap gap-2">
            {PLATFORMS.map((platform) => (
              <button
                key={platform.id}
                onClick={() => setSelectedPlatform(platform.id)}
                className={`h-9 px-4 rounded-xl text-sm font-medium transition flex items-center gap-2 ${
                  selectedPlatform === platform.id
                    ? 'bg-[#e07856] text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {platform.id !== 'conversions' && (
                  <span className="w-2 h-2 rounded-full" style={{
                    backgroundColor: platform.id === 'google' ? '#4285F4' :
                                     platform.id === 'facebook' ? '#1877F2' : '#E4405F'
                  }} />
                )}
                {platform.label}
              </button>
            ))}
          </div>

          {/* Metrics Cards - Platform Specific */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {selectedPlatform === 'conversions' ? (
              <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                {/* KPI Cards Grid - 3 columns for 3 cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                  <StatsCard
                    label="Driving Directions"
                    value={formatCount(displayMetric?.directions ?? 0)}
                    icon={<TrendingUp size={20} />}
                  />
                  <StatsCard
                    label="Website Visits"
                    value={formatCount(displayMetric?.visits ?? 0)}
                    icon={<Eye size={20} />}
                  />
                  <StatsCard
                    label="Event Count"
                    value={formatCount(displayMetric?.events ?? 0)}
                    icon={<Activity size={20} />}
                  />
                </div>

                {/* Bar Charts Grid - 2 columns */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                  <Card title="Driving Directions by Month" subtitle="Monthly trend">
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={directionsMonthlyData} margin={{ top: 10, right: 30, left: 0, bottom: 30 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                        <XAxis dataKey="monthLabel" stroke="#6B7280" angle={-45} textAnchor="end" height={80} />
                        <YAxis stroke="#6B7280" />
                        <Tooltip formatter={(value: any) => typeof value === 'number' ? formatCount(value) : value} />
                        <Bar dataKey="directions" fill="#10B981" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </Card>

                  <Card title="Website Visits by Month" subtitle="Monthly trend">
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={visitsMonthlyData} margin={{ top: 10, right: 30, left: 0, bottom: 30 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                        <XAxis dataKey="monthLabel" stroke="#6B7280" angle={-45} textAnchor="end" height={80} />
                        <YAxis stroke="#6B7280" />
                        <Tooltip formatter={(value: any) => typeof value === 'number' ? formatCount(value) : value} />
                        <Bar dataKey="visits" fill="#3B82F6" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </Card>
                </div>

                {/* Pie Chart - Full Width */}
                <Card title="📊 Event Count Breakdown" subtitle="Distribution of conversion events">
                  <ResponsiveContainer width="100%" height={400}>
                    <PieChart>
                      <Pie
                        data={eventPieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="45%"
                        innerRadius={80}
                        outerRadius={160}
                        onMouseEnter={(_, index) => setActiveEventIndex(index)}
                      >
                        {eventPieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                        {eventPieData.length > 0 && (
                          <text
                            x="50%"
                            y="45%"
                            textAnchor="middle"
                            dominantBaseline="central"
                            style={{ pointerEvents: 'none' }}
                          >
                            <tspan x="50%" dy="0" style={{ fontSize: '12px', fill: '#6B7280', fontWeight: 'normal' }}>
                              Total
                            </tspan>
                            <tspan x="50%" dy="20" style={{ fontSize: '24px', fill: '#111827', fontWeight: 'bold' }}>
                              {formatCount(eventPieData.reduce((sum, e) => sum + e.value, 0))}
                            </tspan>
                          </text>
                        )}
                      </Pie>
                      <Tooltip
                        formatter={(value: any) => [formatCount(value), 'Count']}
                        labelFormatter={(label) => {
                          const entry = eventPieData.find((e) => e.value === label)
                          const total = eventPieData.reduce((sum, e) => sum + e.value, 0)
                          const percent = total > 0 ? ((label / total) * 100).toFixed(1) : '0'
                          return `${entry?.name}: ${percent}%`
                        }}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </Card>
              </div>
            ) : selectedPlatform === 'google' ? (
              <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                {/* KPI Cards Grid - 3 columns for 6 cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                  <StatsCard
                    label="Impressions"
                    value={formatImpressions(displayMetric?.impressions ?? 0)}
                    icon={<Eye size={20} />}
                  />
                  <StatsCard
                    label="Clicks"
                    value={formatCount(displayMetric?.clicks ?? 0)}
                    icon={<Zap size={20} />}
                  />
                  <StatsCard
                    label="Avg CTR"
                    value={`${displayMetric?.ctr ?? '0.00'}%`}
                    icon={<TrendingUp size={20} />}
                  />
                  <StatsCard
                    label="Avg CPC"
                    value={`₹${displayMetric?.cpc ?? '0.00'}`}
                    icon={<TrendingUp size={20} />}
                  />
                  <StatsCard
                    label="Google Spent"
                    value={formatSpend(displayMetric?.spend ?? 0)}
                    icon={<TrendingUp size={20} />}
                  />
                  <StatsCard
                    label="Google Budget"
                    value="—"
                    icon={<TrendingUp size={20} />}
                  />
                </div>

                {/* Charts Grid - 2 columns */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                  <Card title="Google Impressions" subtitle="Monthly trend">
                    <ResponsiveContainer width="100%" height={350}>
                      <BarChart data={googleMonthlyData} margin={{ top: 10, right: 30, left: 0, bottom: 30 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                        <XAxis dataKey="monthLabel" stroke="#6B7280" angle={-45} textAnchor="end" height={80} />
                        <YAxis stroke="#6B7280" />
                        <Tooltip formatter={(value: any) => typeof value === 'number' ? value.toLocaleString('en-IN') : value} />
                        <Bar dataKey="impressions" fill="#3B82F6" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </Card>

                  <Card title="Google Clicks & CTR" subtitle="Monthly comparison">
                    <ResponsiveContainer width="100%" height={350}>
                      <ComposedChart data={googleMonthlyData} margin={{ top: 10, right: 60, left: 0, bottom: 30 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                        <XAxis dataKey="monthLabel" stroke="#6B7280" angle={-45} textAnchor="end" height={80} />
                        <YAxis id="left" stroke="#6B7280" />
                        <YAxis yAxisId="right" orientation="right" stroke="#8B5CF6" />
                        <Tooltip formatter={(value: any) => typeof value === 'number' && value > 100 ? value.toLocaleString('en-IN') : (value as any)?.toFixed?.(2) ?? value} />
                        <Legend />
                        <Bar yAxisId="left" dataKey="clicks" fill="#3B82F6" radius={[8, 8, 0, 0]} name="Clicks" />
                        <Line yAxisId="right" type="monotone" dataKey="ctr" stroke="#8B5CF6" name="CTR %" strokeWidth={2} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </Card>
                </div>
              </div>
            ) : (
              <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                {/* KPI Cards Grid - 3 columns for 6 cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                  <StatsCard
                    label="Impressions"
                    value={formatImpressions(displayMetric?.impressions ?? 0)}
                    icon={<Eye size={20} />}
                  />
                  <StatsCard
                    label="Link Clicks"
                    value={formatCount(displayMetric?.clicks ?? 0)}
                    icon={<Zap size={20} />}
                  />
                  <StatsCard
                    label="Avg CTR"
                    value={`${displayMetric?.ctr ?? '0.00'}%`}
                    icon={<TrendingUp size={20} />}
                  />
                  <StatsCard
                    label="Avg CPM"
                    value={`₹${displayMetric?.cpm ?? '0.00'}`}
                    icon={<TrendingUp size={20} />}
                  />
                  <StatsCard
                    label="Spent"
                    value={formatSpend(displayMetric?.spend ?? 0)}
                    icon={<TrendingUp size={20} />}
                  />
                  <StatsCard
                    label="Budget"
                    value="—"
                    icon={<TrendingUp size={20} />}
                  />
                </div>

                {/* Charts Grid - 2 columns */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                  <Card title={`${selectedPlatform.charAt(0).toUpperCase() + selectedPlatform.slice(1)} Impressions`} subtitle="Monthly trend">
                    <ResponsiveContainer width="100%" height={350}>
                      <BarChart data={selectedPlatform === 'facebook' ? fbMonthlyData : igMonthlyData} margin={{ top: 10, right: 30, left: 0, bottom: 30 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                        <XAxis dataKey="monthLabel" stroke="#6B7280" angle={-45} textAnchor="end" height={80} />
                        <YAxis stroke="#6B7280" />
                        <Tooltip formatter={(value: any) => typeof value === 'number' ? value.toLocaleString('en-IN') : value} />
                        <Bar dataKey="impressions" fill={selectedPlatform === 'facebook' ? '#1877F2' : '#E4405F'} radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </Card>

                  <Card title={`${selectedPlatform.charAt(0).toUpperCase() + selectedPlatform.slice(1)} Clicks & CTR`} subtitle="Monthly comparison">
                    <ResponsiveContainer width="100%" height={350}>
                      <ComposedChart data={selectedPlatform === 'facebook' ? fbMonthlyData : igMonthlyData} margin={{ top: 10, right: 60, left: 0, bottom: 30 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                        <XAxis dataKey="monthLabel" stroke="#6B7280" angle={-45} textAnchor="end" height={80} />
                        <YAxis id="left" stroke="#6B7280" />
                        <YAxis yAxisId="right" orientation="right" stroke={selectedPlatform === 'facebook' ? '#1877F2' : '#E4405F'} />
                        <Tooltip formatter={(value: any) => typeof value === 'number' && value > 100 ? value.toLocaleString('en-IN') : (value as any)?.toFixed?.(2) ?? value} />
                        <Legend />
                        <Bar yAxisId="left" dataKey="clicks" fill={selectedPlatform === 'facebook' ? '#1877F2' : '#E4405F'} radius={[8, 8, 0, 0]} name="Link Clicks" />
                        <Line yAxisId="right" type="monotone" dataKey="ctr" stroke={selectedPlatform === 'facebook' ? '#1877F2' : '#E4405F'} name="CTR %" strokeWidth={2} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </Card>
                </div>
              </div>
            )}
          </div>

        </>
      )}
    </div>
  )
}
