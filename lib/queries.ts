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
      .select('id, dealer_id, client_id, metric_date, platform, campaign_name, start_date, end_date, impressions, reach, link_clicks, spend_inr, cpm_inr, ctr_percent, avg_cpc_inr, frequency, website_visits, event_count, event_call_number_track, event_call_track, event_download_catalogue, event_drive_direction, event_enquiry_track, event_form_submit, store_visits, driving_directions, data_source, created_at')
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

// Dealer-list -> RPC param: empty or "all dealers" list means no filter (NULL),
// matching getMetrics()'s existing .in('dealer_id', ...) skip condition below.
function toRpcDealerIds(dealerIds: string[]): string[] | null {
  return (dealerIds.length > 0 && dealerIds.length < 173) ? dealerIds : null
}

// Get aggregated metrics totals, summed server-side via Postgres RPC (get_metrics_summary).
// Returns one row per platform. Use for KPI totals — never for per-dealer breakdowns
// (this RPC only groups by platform, not dealer_id).
export async function getMetricsSummary(
  dealerIds: string[],
  dateFrom: string,
  dateTo: string,
  platforms: string[]
): Promise<any[]> {
  const { data, error } = await supabase.rpc('get_metrics_summary', {
    p_dealer_ids: toRpcDealerIds(dealerIds),
    p_date_from: dateFrom || null,
    p_date_to: dateTo || null,
    p_platforms: platforms.length > 0 ? platforms : null,
  })
  if (error) throw error
  return data || []
}

const MONTHLY_AGG_MONTHS = ['2025-05', '2025-06', '2025-07', '2025-08', '2025-09', '2025-10', '2025-11', '2025-12', '2026-01', '2026-02', '2026-03']
const MONTHLY_AGG_PLATFORMS = ['google', 'facebook', 'instagram', 'ga4', 'gmb'] as const

function emptyMonthlyAgg(): { [month: string]: any } {
  const monthMap: { [key: string]: any } = {}
  MONTHLY_AGG_MONTHS.forEach((month) => {
    monthMap[month] = {}
    MONTHLY_AGG_PLATFORMS.forEach((platform) => {
      monthMap[month][platform] = { spend: 0, impressions: 0, clicks: 0, visits: 0, directions: 0, events: 0 }
    })
  })
  return monthMap
}

// Aggregate metrics by month, summed server-side via Postgres RPC (get_metrics_monthly).
// Reshapes the RPC's flat (month, platform) rows into the same nested monthMap shape
// the existing chart components (DrivingDirectionsChart, WebsiteVisitsChart,
// EventCountChart) already expect, so no chart changes are needed.
export async function getMetricsMonthlyAgg(dealerIds: string[], platforms: string[], dateFrom: string, dateTo: string) {
  const { data, error } = await supabase.rpc('get_metrics_monthly', {
    p_dealer_ids: toRpcDealerIds(dealerIds),
    p_date_from: dateFrom || null,
    p_date_to: dateTo || null,
    p_platforms: platforms.length > 0 ? platforms : null,
  })
  if (error) throw error

  const monthMap = emptyMonthlyAgg()
  ;(data || []).forEach((row: any) => {
    if (!monthMap[row.month] || !monthMap[row.month][row.platform]) return
    monthMap[row.month][row.platform] = {
      spend: Number(row.total_spend_inr) || 0,
      impressions: Number(row.total_impressions) || 0,
      clicks: Number(row.total_link_clicks) || 0,
      visits: Number(row.total_website_visits) || 0,
      directions: Number(row.total_driving_directions) || 0,
      events: Number(row.total_event_count) || 0,
    }
  })
  return monthMap
}

// Get metrics pre-aggregated to (dealer_id, month, platform) grain, summed server-side
// via Postgres RPC (get_metrics_by_dealer_month). Collapses ~162k raw rows into ~6.3k,
// letting the Overview charts keep full client-side interactivity (zone/tier/state/KPI/
// month) over a tiny payload — one RPC call instead of ~163 paginated .select() pages.
// Column names deliberately match the raw daily_metrics columns so the charts'
// row[selectedKpi] indexing works unchanged. Numeric coercion guards arithmetic safety
// (PostgREST can return numeric as a string). Reach is intentionally excluded.
export async function getMetricsByDealerMonth(
  dealerIds: string[],
  dateFrom: string,
  dateTo: string,
  platforms: string[]
): Promise<any[]> {
  const params = {
    p_dealer_ids: toRpcDealerIds(dealerIds),
    p_date_from: dateFrom || null,
    p_date_to: dateTo || null,
    p_platforms: platforms.length > 0 ? platforms : null,
  }
  // PostgREST caps every response at max-rows (1000 here), so a single .rpc() call
  // silently truncates the ~6.3k-row result and the charts under-count. Paginate with
  // .range() — only ~7 small pages (vs the old raw path's ~163). An explicit .order()
  // gives a stable sort across pages so no row is dropped or double-counted at the seams
  // (the SQL function itself has no ORDER BY).
  let all: any[] = []
  let from = 0
  const pageSize = 1000
  while (true) {
    const { data, error } = await supabase
      .rpc('get_metrics_by_dealer_month', params)
      .order('dealer_id', { ascending: true })
      .order('month', { ascending: true })
      .order('platform', { ascending: true })
      .range(from, from + pageSize - 1)
    if (error) throw error
    if (!data || data.length === 0) break
    all = all.concat(data)
    if (data.length < pageSize) break
    from += pageSize
  }
  return all.map((r: any) => ({
    dealer_id: r.dealer_id,
    month: r.month,
    platform: r.platform,
    impressions: Number(r.impressions) || 0,
    link_clicks: Number(r.link_clicks) || 0,
    spend_inr: Number(r.spend_inr) || 0,
    website_visits: Number(r.website_visits) || 0,
    driving_directions: Number(r.driving_directions) || 0,
  }))
}

// Get campaigns pre-aggregated to (campaign_name, platform) grain, summed server-side
// via Postgres RPC (get_campaign_summary). Restricted to google/facebook/instagram.
// Returns rows shaped to match what groupCampaigns() consumes (campaign_name, platform,
// impressions, link_clicks, spend_inr, start_date, end_date) so the Dealers-page campaign
// tables keep using groupCampaigns unchanged — the ctr/cpc/cpm math stays byte-identical.
// ~494 rows for all dealers, so a single page covers it, but we paginate defensively:
// PostgREST silently caps responses at max-rows (1000), and an uncaught cap is exactly the
// under-count bug that hit the Overview by-dealer RPC. An explicit .order() keeps pages stable.
export async function getCampaignSummary(
  dealerIds: string[],
  dateFrom: string,
  dateTo: string
): Promise<any[]> {
  const params = {
    p_dealer_ids: toRpcDealerIds(dealerIds),
    p_date_from: dateFrom || null,
    p_date_to: dateTo || null,
  }
  let all: any[] = []
  let from = 0
  const pageSize = 1000
  while (true) {
    const { data, error } = await supabase
      .rpc('get_campaign_summary', params)
      .order('platform', { ascending: true })
      .order('campaign_name', { ascending: true })
      .range(from, from + pageSize - 1)
    if (error) throw error
    if (!data || data.length === 0) break
    all = all.concat(data)
    if (data.length < pageSize) break
    from += pageSize
  }
  return all.map((r: any) => ({
    campaign_name: r.campaign_name,
    platform: r.platform,
    impressions: Number(r.total_impressions) || 0,
    link_clicks: Number(r.total_link_clicks) || 0,
    spend_inr: Number(r.total_spend_inr) || 0,
    start_date: r.start_date,
    end_date: r.end_date,
  }))
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

// Get call metrics for specific dealer(s) and month range
export async function getCallMetrics(
  dealerIds: string[],
  monthFrom: string,
  monthTo: string
): Promise<any[]> {
  if (!dealerIds.length) return []
  let allData: any[] = []
  let from = 0
  const pageSize = 1000
  while (true) {
    const { data, error } = await supabase
      .from('call_metrics')
      .select('dealer_id, month, calls_received, calls_answered, calls_missed, calls_dialled')
      .in('dealer_id', dealerIds)
      .gte('month', monthFrom)
      .lte('month', monthTo)
      .order('month', { ascending: true })
      .range(from, from + pageSize - 1)
    if (error) { console.error('getCallMetrics error:', error); return [] }
    if (!data || data.length === 0) break
    allData = allData.concat(data)
    if (data.length < pageSize) break
    from += pageSize
  }
  return allData
}

// Get budgets for specific dealer(s)
export async function getBudgets(
  dealerIds: string[]
): Promise<any[]> {
  if (!dealerIds.length) return []
  const { data, error } = await supabase
    .from('budgets')
    .select('dealer_id, platform, budget_inr')
    .in('dealer_id', dealerIds)
    .is('month', null)
  if (error) { console.error('getBudgets error:', error); return [] }
  return data ?? []
}

// Get ad creatives for a specific dealer, grouped by platform
export async function getAdCreatives(dealerId: string): Promise<{
  google: any[];
  facebook: any[];
  instagram: any[];
}> {
  const { data, error } = await supabase
    .from('ad_creatives')
    .select('id, platform, campaign_name, ad_name, headline, description, storage_url, creative_type, status')
    .eq('dealer_id', dealerId)
    .order('platform', { ascending: true })
  if (error) { console.error('getAdCreatives error:', error); return { google: [], facebook: [], instagram: [] } }
  const rows = data ?? []
  return {
    google:    rows.filter(r => r.platform === 'google'),
    facebook:  rows.filter(r => r.platform === 'facebook'),
    instagram: rows.filter(r => r.platform === 'instagram'),
  }
}

// Get ad previews for a specific dealer, grouped by platform. Google is
// always empty for now — no Google preview pipeline exists yet.
export async function getAdPreviews(dealerId: string): Promise<{
  google: any[];
  facebook: any[];
  instagram: any[];
}> {
  const { data, error } = await supabase
    .from('ad_previews')
    .select('id, platform, ad_id, card_index, storage_url')
    .eq('dealer_id', dealerId)
    .order('platform', { ascending: true })
    .order('card_index', { ascending: true })
  if (error) { console.error('getAdPreviews error:', error); return { google: [], facebook: [], instagram: [] } }
  const rows = data ?? []
  return {
    google:    rows.filter(r => r.platform === 'google'),
    facebook:  rows.filter(r => r.platform === 'facebook'),
    instagram: rows.filter(r => r.platform === 'instagram'),
  }
}

const AUDIENCE_AGE_ORDER = ['18-24', '25-34', '35-44', '45-54', '55-64', '65+']

// Get Meta audience (age/gender) link-click breakdown via get_audience_breakdown
// RPC — SECURITY INVOKER, RLS applies automatically, same convention as
// get_metrics_summary. dealerId=null aggregates across all RLS-visible dealers.
// The RPC already excludes the 'Unknown'/'unknown' buckets server-side.
export async function getAudienceBreakdown(
  dealerId: string | null,
  platform: 'instagram' | 'facebook',
  dateFrom: string,
  dateTo: string
): Promise<{ age: { bucket: string; clicks: number }[]; gender: { bucket: string; clicks: number }[] }> {
  const { data, error } = await supabase.rpc('get_audience_breakdown', {
    p_dealer_id: dealerId,
    p_platform: platform,
    p_date_from: dateFrom,
    p_date_to: dateTo,
  })
  if (error) { console.error('getAudienceBreakdown error:', error); return { age: [], gender: [] } }
  const rows = data ?? []
  const age = AUDIENCE_AGE_ORDER.map(bucket => ({
    bucket,
    clicks: rows.find((r: any) => r.breakdown_type === 'age' && r.breakdown_value === bucket)?.total_link_clicks ?? 0,
  }))
  const gender = ['male', 'female'].map(bucket => ({
    bucket,
    clicks: rows.find((r: any) => r.breakdown_type === 'gender' && r.breakdown_value === bucket)?.total_link_clicks ?? 0,
  }))
  return { age, gender }
}

// Get channel/placement link-click breakdown via get_placement_breakdown RPC —
// SECURITY INVOKER, RLS applies automatically, same convention as
// getAudienceBreakdown(). dealerId=null aggregates across all RLS-visible dealers.
//
// IMPORTANT: the RPC result has NO platform column, so p_platform must NEVER be
// null when comparing across platforms — a null call silently merges raw values
// that collide across platforms (e.g. Meta's 'feed' exists under both facebook
// and instagram; a null-platform call would sum them into one indistinguishable
// bucket). Always call once per platform ('google' | 'facebook' | 'instagram')
// and combine client-side, never a single null-platform call.
//
// Returns RAW breakdown_value strings, unsorted, unmapped — display relabeling
// (e.g. CONTENT -> "Display") and sorting happen in the component, never here,
// so the raw stored values are never altered in this layer.
export async function getPlacementBreakdown(
  dealerId: string | null,
  platform: 'google' | 'facebook' | 'instagram',
  dateFrom: string,
  dateTo: string
): Promise<{ breakdown_value: string; link_clicks: number }[]> {
  const { data, error } = await supabase.rpc('get_placement_breakdown', {
    p_dealer_id: dealerId,
    p_platform: platform,
    p_date_from: dateFrom,
    p_date_to: dateTo,
  })
  if (error) { console.error('getPlacementBreakdown error:', error); return [] }
  const rows = data ?? []
  return rows.map((r: any) => ({
    breakdown_value: r.breakdown_value as string,
    link_clicks: Number(r.total_link_clicks) || 0,
  }))
}

// Get live Meta reach (calls the FastAPI backend, not Supabase directly)
export async function getReach(
  dealerIds: string[] | null,  // null = all dealers
  dateFrom: string,
  dateTo: string,
  platforms: string[]          // ['facebook'], ['instagram'], or both
): Promise<{
  reach: number | null;
  campaign_count: number;
  dealers_requested: number;
  dealers_covered: number;
  dealers_without_mapping: string[];
  cached: boolean;
} | null> {
  try {
    const params = new URLSearchParams({
      dealer_ids: dealerIds ? dealerIds.join(',') : 'all',
      date_from: dateFrom,
      date_to: dateTo,
      platforms: platforms.join(','),
    })
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/reach?${params}`)
    if (!res.ok) return null
    return await res.json()
  } catch (e) {
    console.error('getReach failed:', e)
    return null  // caller must treat null as "show —", never as 0
  }
}
