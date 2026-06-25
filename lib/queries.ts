import { supabase } from './supabase'

// Get all dealers accessible to current user (respects RLS)
export async function getDealers() {
  const { data, error } = await supabase
    .from('dealers')
    .select('id, dealer_name, zone, state, market, campaign_status')
    .order('dealer_name', { ascending: true })

  if (error) throw error
  return data || []
}

// Get metrics for specific dealer(s) with date & platform filters
export async function getMetrics(
  dealerIds: string[],
  dateFrom: string,
  dateTo: string,
  platforms: string[]
) {
  let allData: any[] = []
  let lastId = 0
  const pageSize = 1000
  let hasMore = true

  while (hasMore) {
    let query = supabase
      .from('daily_metrics')
      .select('id, dealer_id, client_id, metric_date, platform, campaign_name, impressions, reach, link_clicks, spend_inr, cpm_inr, ctr_percent, avg_cpc_inr, frequency, website_visits, event_count, event_call_number_track, event_call_track, event_download_catalogue, event_drive_direction, event_enquiry_track, event_form_submit, store_visits, driving_directions, data_source, created_at')
      .gt('id', lastId)
      .order('id', { ascending: true })
      .limit(pageSize)

    if (dealerIds.length > 0 && dealerIds.length < 173) {
      query = query.in('dealer_id', dealerIds)
    }

    query = query.gte('metric_date', dateFrom).lte('metric_date', dateTo)

    if (platforms.length > 0) {
      query = query.in('platform', platforms)
    }

    const { data, error } = await query

    if (error) throw error

    if (!data || data.length === 0) {
      hasMore = false
    } else {
      allData = allData.concat(data)
      lastId = data[data.length - 1].id
      if (data.length < pageSize) {
        hasMore = false
      }
    }
  }

  return allData
}

// Aggregate metrics by month
export async function getMetricsByMonth(dealerIds: string[], platforms: string[], dateFrom: string, dateTo: string) {
  const metrics = await getMetrics(dealerIds, dateFrom, dateTo, platforms)
  return aggregateByMonth(metrics)
}

// Aggregate in JS
function aggregateByMonth(metrics: any[]) {
  const months = ['2025-05', '2025-06', '2025-07', '2025-08', '2025-09', '2025-10', '2025-11', '2025-12', '2026-01', '2026-02', '2026-03']
  const monthMap: { [key: string]: any } = {}

  months.forEach((month) => {
    monthMap[month] = {
      google: { spend: 0, impressions: 0, clicks: 0, visits: 0, directions: 0, events: 0 },
      facebook: { spend: 0, impressions: 0, clicks: 0, visits: 0, directions: 0, events: 0 },
      instagram: { spend: 0, impressions: 0, clicks: 0, visits: 0, directions: 0, events: 0 },
      ga4: {
        spend: 0,
        impressions: 0,
        clicks: 0,
        visits: 0,
        directions: 0,
        events: 0,
        event_call_number_track: 0,
        event_call_track: 0,
        event_download_catalogue: 0,
        event_drive_direction: 0,
        event_enquiry_track: 0,
        event_form_submit: 0
      },
      gmb: { spend: 0, impressions: 0, clicks: 0, visits: 0, directions: 0, events: 0 },
    }
  })

  metrics.forEach((row) => {
    const monthKey = row.metric_date.substring(0, 7)
    if (monthMap[monthKey]) {
      const platform = row.platform
      const baseAgg: any = {
        spend: (monthMap[monthKey][platform]?.spend || 0) + (row.spend_inr || 0),
        impressions: (monthMap[monthKey][platform]?.impressions || 0) + (row.impressions || 0),
        clicks: (monthMap[monthKey][platform]?.clicks || 0) + (row.link_clicks || 0),
        visits: (monthMap[monthKey][platform]?.visits || 0) + (row.website_visits || 0),
        directions: (monthMap[monthKey][platform]?.directions || 0) + (row.driving_directions || 0),
        events: (monthMap[monthKey][platform]?.events || 0) + (row.event_count || 0),
      }

      // Add GA4 event fields if platform is ga4
      if (platform === 'ga4') {
        baseAgg['event_call_number_track'] = (monthMap[monthKey][platform]?.event_call_number_track || 0) + (row.event_call_number_track || 0)
        baseAgg['event_call_track'] = (monthMap[monthKey][platform]?.event_call_track || 0) + (row.event_call_track || 0)
        baseAgg['event_download_catalogue'] = (monthMap[monthKey][platform]?.event_download_catalogue || 0) + (row.event_download_catalogue || 0)
        baseAgg['event_drive_direction'] = (monthMap[monthKey][platform]?.event_drive_direction || 0) + (row.event_drive_direction || 0)
        baseAgg['event_enquiry_track'] = (monthMap[monthKey][platform]?.event_enquiry_track || 0) + (row.event_enquiry_track || 0)
        baseAgg['event_form_submit'] = (monthMap[monthKey][platform]?.event_form_submit || 0) + (row.event_form_submit || 0)
      }

      monthMap[monthKey][platform] = baseAgg
    }
  })

  return monthMap
}

// Get unique filter options (NO DISTINCT — deduplicate in JS)
export async function getFilterOptions() {
  const { data: allDealers, error } = await supabase
    .from('dealers')
    .select('zone, market, campaign_status')

  if (error) throw error

  // Deduplicate in JavaScript
  const zones = [...new Set(allDealers?.map((d: any) => d.zone).filter(Boolean))]
  const markets = [...new Set(allDealers?.map((d: any) => d.market).filter(Boolean))]
  const statuses = [...new Set(allDealers?.map((d: any) => d.campaign_status).filter(Boolean))]

  return { zones, markets, statuses }
}

// Get status counts for a dealer list
export function getStatusCounts(dealers: any[]) {
  const counts = {
    completed: 0,
    paused: 0,
    notLive: 0,
  }

  dealers.forEach((dealer) => {
    const status = dealer.campaign_status
    if (status === 'Completed') counts.completed++
    else if (status === 'Paused') counts.paused++
    else if (status === 'Not Live') counts.notLive++
  })

  return counts
}

// Types for zone comparison
export type ZoneMetric = 'dd' | 'wv' | 'gClicks' | 'gImpressions' | 'igClicks' | 'fbClicks'

// Fetch raw metrics + zone mapping (called once per dealerIds/date change)
export async function fetchZoneMetricsRaw(
  dealerIds: string[],
  dateFrom: string,
  dateTo: string
): Promise<{ rows: any[]; zoneMap: { [id: string]: string } }> {
  // Build dealerId -> zone lookup
  const { data: dealerRows, error: dealerErr } = await supabase
    .from('dealers')
    .select('id, zone')
  if (dealerErr) throw dealerErr
  const zoneMap: { [id: string]: string } = {}
  ;(dealerRows || []).forEach((d: any) => { zoneMap[d.id] = d.zone })

  // Fetch metrics (no platform filter — we need all rows for flexible metric calculation)
  const rows = await getMetrics(dealerIds, dateFrom, dateTo, [])
  return { rows, zoneMap }
}

// Pure aggregation function (called whenever metric changes, no network calls)
export function aggregateZoneMetrics(
  rows: any[],
  zoneMap: { [id: string]: string },
  metric: ZoneMetric
): { months: string[]; zones: { [zone: string]: number[] } } {
  const MONTHS = ['2025-05','2025-06','2025-07','2025-08','2025-09','2025-10','2025-11','2025-12','2026-01','2026-02','2026-03']
  const ALL_ZONES = ['CENTRAL', 'EAST', 'NORTH', 'SOUTH', 'WEST']

  const agg: { [zone: string]: { [month: string]: number } } = {}
  ALL_ZONES.forEach(z => {
    agg[z] = {}
    MONTHS.forEach(m => { agg[z][m] = 0 })
  })

  rows.forEach((row) => {
    const zone = zoneMap[row.dealer_id]
    if (!zone || !agg[zone]) return
    const month = row.metric_date.substring(0, 7)
    if (agg[zone][month] === undefined) return

    let value = 0
    if (metric === 'dd')            value = row.driving_directions || 0
    else if (metric === 'wv')       value = row.website_visits || 0
    else if (metric === 'gClicks' && row.platform === 'google')  value = row.link_clicks || 0
    else if (metric === 'gImpressions' && row.platform === 'google') value = row.impressions || 0
    else if (metric === 'igClicks' && row.platform === 'instagram') value = row.link_clicks || 0
    else if (metric === 'fbClicks' && row.platform === 'facebook') value = row.link_clicks || 0

    agg[zone][month] += value
  })

  const zonesOut: { [zone: string]: number[] } = {}
  ALL_ZONES.forEach(z => {
    zonesOut[z] = MONTHS.map(m => agg[z][m])
  })
  return { months: MONTHS, zones: zonesOut }
}

// Wrapper function
export async function getZoneMonthlyComparison(
  dealerIds: string[],
  dateFrom: string,
  dateTo: string,
  metric: ZoneMetric
): Promise<{ months: string[]; zones: { [zone: string]: number[] } }> {
  const { rows, zoneMap } = await fetchZoneMetricsRaw(dealerIds, dateFrom, dateTo)
  return aggregateZoneMetrics(rows, zoneMap, metric)
}

// Aggregate Google platform metrics by month
export function getGoogleMetricsByMonth(rows: any[]): Array<{ month: string; impressions: number; clicks: number; ctr: number }> {
  const MONTHS = ['2025-05', '2025-06', '2025-07', '2025-08', '2025-09', '2025-10', '2025-11', '2025-12', '2026-01', '2026-02', '2026-03']
  const monthMap: { [key: string]: { impressions: number; clicks: number; ctrSum: number; count: number } } = {}

  MONTHS.forEach((m) => {
    monthMap[m] = { impressions: 0, clicks: 0, ctrSum: 0, count: 0 }
  })

  rows.forEach((row) => {
    if (row.platform !== 'google') return
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

// Get the most recent metric_date across all data
export async function getLatestMetricDate(): Promise<string> {
  const { data, error } = await supabase
    .from('daily_metrics')
    .select('metric_date')
    .order('metric_date', { ascending: false })
    .limit(1)
  if (error) throw error
  return data?.[0]?.metric_date ?? '—'
}

// Get top 10 performers by metric (pure function, no network calls)
export function getTopPerformers(
  rows: any[],
  dealers: any[],
  metric: 'dd' | 'wv'
): { rank: number; dealer_name: string; zone: string; market: string; value: number }[] {
  // Build dealer lookup
  const dealerMap: { [id: string]: any } = {}
  dealers.forEach((d) => { dealerMap[d.id] = d })

  // Aggregate by dealer (exclude zeros)
  const dealerAgg: { [id: string]: number } = {}
  rows.forEach((row) => {
    const value = metric === 'dd' ? (row.driving_directions || 0) : (row.website_visits || 0)
    if (value > 0) {
      dealerAgg[row.dealer_id] = (dealerAgg[row.dealer_id] || 0) + value
    }
  })

  // Build result, sort descending, take top 10, add rank
  const result = Object.entries(dealerAgg)
    .map(([id, value]) => ({
      dealer_name: dealerMap[id]?.dealer_name || 'Unknown',
      zone: dealerMap[id]?.zone || '',
      market: dealerMap[id]?.market || '',
      value,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10)
    .map((item, i) => ({ rank: i + 1, ...item }))

  return result
}
