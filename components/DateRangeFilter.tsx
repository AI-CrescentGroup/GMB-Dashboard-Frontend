'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { Calendar, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { ALL_TIME_DATE_FROM, ALL_TIME_DATE_TO } from '@/lib/constants'

export type DateRange = { from: string; to: string } // YYYY-MM-DD (inclusive)

// ─── Local-time date helpers (avoid UTC parsing drift on YYYY-MM-DD) ───────────
function fmtISO(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
function parseISO(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}
function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}
function lastDayOfMonth(year: number, monthZero: number): number {
  return new Date(year, monthZero + 1, 0).getDate()
}
function fmtDisplay(s: string): string {
  // "28 May 2025"
  return parseISO(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ─── Preset routing helper (shared with the pages) ─────────────────────────────
// A range routes to the fast month-grain RPC when it's All-time OR spans whole
// calendar months (from = 1st of its month AND to = last day of its month).
// Everything else is day-precise and must use a scoped raw fetch.
export function isRangeMonthAligned(from: string, to: string): boolean {
  if (from === ALL_TIME_DATE_FROM && to === ALL_TIME_DATE_TO) return true
  const f = parseISO(from)
  const t = parseISO(to)
  if (f.getDate() !== 1) return false
  return t.getDate() === lastDayOfMonth(t.getFullYear(), t.getMonth())
}

// ─── Presets (order + resolution rules are exact per spec; Sunday week start) ───
type PresetId =
  | 'today' | 'yesterday' | 'this_week' | 'last_7'
  | 'last_week' | 'last_14' | 'this_month' | 'all_time' | 'custom'

const PRESETS: { id: PresetId; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: 'this_week', label: 'This week (Sun–Today)' },
  { id: 'last_7', label: 'Last 7 days' },
  { id: 'last_week', label: 'Last week (Sun–Sat)' },
  { id: 'last_14', label: 'Last 14 days' },
  { id: 'this_month', label: 'This month' },
  { id: 'all_time', label: 'All time' },
  { id: 'custom', label: 'Custom' },
]

// Relative presets resolve against REAL calendar today (Meta conventions). Since
// the data ends 2026-03-31, these will resolve into the future and return empty —
// that's expected and intentional, wired normally with no special-casing.
function resolvePreset(id: PresetId, now: Date): DateRange | null {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const dow = today.getDay() // 0 = Sunday
  const thisWeekSunday = addDays(today, -dow)
  switch (id) {
    case 'today': return { from: fmtISO(today), to: fmtISO(today) }
    case 'yesterday': { const y = addDays(today, -1); return { from: fmtISO(y), to: fmtISO(y) } }
    case 'this_week': return { from: fmtISO(thisWeekSunday), to: fmtISO(today) }
    case 'last_7': return { from: fmtISO(addDays(today, -7)), to: fmtISO(addDays(today, -1)) }
    case 'last_week': return { from: fmtISO(addDays(thisWeekSunday, -7)), to: fmtISO(addDays(thisWeekSunday, -1)) }
    case 'last_14': return { from: fmtISO(addDays(today, -14)), to: fmtISO(addDays(today, -1)) }
    case 'this_month': return { from: fmtISO(new Date(today.getFullYear(), today.getMonth(), 1)), to: fmtISO(today) }
    case 'all_time': return { from: ALL_TIME_DATE_FROM, to: ALL_TIME_DATE_TO }
    case 'custom': return null
  }
}

function matchPreset(range: DateRange, now: Date): PresetId {
  for (const p of PRESETS) {
    if (p.id === 'custom') continue
    const r = resolvePreset(p.id, now)
    if (r && r.from === range.from && r.to === range.to) return p.id
  }
  return 'custom'
}

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

// ─── Component ─────────────────────────────────────────────────────────────────
export function DateRangeFilter({
  value,
  onChange,
  className,
  buttonClassName,
}: {
  value: DateRange
  onChange: (r: DateRange) => void
  className?: string
  buttonClassName?: string
}) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<DateRange>(value)
  const [pickState, setPickState] = useState<'start' | 'end'>('start')
  const [viewDate, setViewDate] = useState<Date>(parseISO(value.from))
  const ref = useRef<HTMLDivElement>(null)
  const now = useMemo(() => new Date(), [])
  const todayISO = fmtISO(now)

  // Re-seed the draft from the committed value each time the popover opens, so
  // closing without Apply (or via outside-click) behaves as Cancel.
  useEffect(() => {
    if (open) {
      setDraft(value)
      setViewDate(parseISO(value.from))
      setPickState('start')
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const activePreset = matchPreset(value, now)
  const draftPreset = matchPreset(draft, now)

  const triggerLabel =
    value.from === value.to
      ? fmtDisplay(value.from)
      : `${fmtDisplay(value.from)} – ${fmtDisplay(value.to)}`

  function selectPreset(id: PresetId) {
    if (id === 'custom') { setPickState('start'); return }
    const r = resolvePreset(id, now)
    if (r) {
      setDraft(r)
      setViewDate(parseISO(r.from))
      setPickState('start')
    }
  }

  function clickDay(d: Date) {
    const iso = fmtISO(d)
    if (pickState === 'start') {
      setDraft({ from: iso, to: iso })
      setPickState('end')
    } else {
      if (iso < draft.from) setDraft({ from: iso, to: draft.from })
      else setDraft({ from: draft.from, to: iso })
      setPickState('start')
    }
  }

  function apply() {
    let { from, to } = draft
    if (to < from) { const t = from; from = to; to = t }
    onChange({ from, to })
    setOpen(false)
  }

  // Month grid for the calendar (Sunday-first).
  const grid = useMemo(() => {
    const y = viewDate.getFullYear()
    const m = viewDate.getMonth()
    const startDow = new Date(y, m, 1).getDay()
    const days = lastDayOfMonth(y, m)
    const cells: (Date | null)[] = []
    for (let i = 0; i < startDow; i++) cells.push(null)
    for (let d = 1; d <= days; d++) cells.push(new Date(y, m, d))
    return cells
  }, [viewDate])

  const inputCls =
    'h-8 px-2 border border-slate-200 rounded-md text-[12px] text-slate-700 bg-white ' +
    'focus:border-indigo-400 focus:outline-none'

  return (
    <div className={`relative ${className || ''}`} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`h-9 px-3 rounded-lg border border-slate-200 bg-white text-[13px] text-slate-700 flex items-center gap-2 shadow-sm hover:border-indigo-300 transition ${buttonClassName || ''}`}
      >
        <Calendar size={15} className="text-indigo-500 shrink-0" />
        <span className="font-medium whitespace-nowrap">{triggerLabel}</span>
        <ChevronDown size={15} className="text-slate-400 shrink-0 ml-auto" />
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 bg-white rounded-xl border border-slate-200 shadow-xl flex overflow-hidden">
          {/* Left: presets */}
          <div className="w-44 border-r border-slate-100 py-2 bg-slate-50/50">
            {PRESETS.map((p) => {
              const active = draftPreset === p.id
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => selectPreset(p.id)}
                  className={`w-full text-left px-3.5 py-1.5 text-[12.5px] transition ${
                    active
                      ? 'bg-indigo-600 text-white font-medium'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {p.label}
                </button>
              )
            })}
          </div>

          {/* Right: calendar */}
          <div className="p-3 w-[300px]">
            {/* Start / End inputs */}
            <div className="flex items-center gap-2 mb-3">
              <input
                type="date"
                value={draft.from}
                onChange={(e) => e.target.value && setDraft((d) => ({ ...d, from: e.target.value }))}
                className={inputCls}
              />
              <span className="text-slate-400 text-xs">→</span>
              <input
                type="date"
                value={draft.to}
                onChange={(e) => e.target.value && setDraft((d) => ({ ...d, to: e.target.value }))}
                className={inputCls}
              />
            </div>

            {/* Month nav */}
            <div className="flex items-center justify-between mb-2 px-1">
              <button
                type="button"
                onClick={() => setViewDate((v) => new Date(v.getFullYear(), v.getMonth() - 1, 1))}
                className="p-1 rounded hover:bg-slate-100 text-slate-500"
                aria-label="Previous month"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-[13px] font-semibold text-slate-700">
                {viewDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
              </span>
              <button
                type="button"
                onClick={() => setViewDate((v) => new Date(v.getFullYear(), v.getMonth() + 1, 1))}
                className="p-1 rounded hover:bg-slate-100 text-slate-500"
                aria-label="Next month"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Weekday header */}
            <div className="grid grid-cols-7 gap-0.5 mb-1">
              {WEEKDAYS.map((w) => (
                <div key={w} className="text-[10px] text-slate-400 text-center font-medium py-1">
                  {w}
                </div>
              ))}
            </div>

            {/* Days */}
            <div className="grid grid-cols-7 gap-0.5">
              {grid.map((d, i) => {
                if (!d) return <div key={`e${i}`} />
                const iso = fmtISO(d)
                const isEndpoint = iso === draft.from || iso === draft.to
                const inRange = iso >= draft.from && iso <= draft.to
                const isToday = iso === todayISO
                return (
                  <button
                    key={iso}
                    type="button"
                    onClick={() => clickDay(d)}
                    className={`h-8 text-[12px] rounded-md transition ${
                      isEndpoint
                        ? 'bg-indigo-600 text-white font-semibold'
                        : inRange
                          ? 'bg-indigo-50 text-indigo-700'
                          : 'text-slate-700 hover:bg-slate-100'
                    } ${isToday && !isEndpoint ? 'ring-1 ring-indigo-300' : ''}`}
                  >
                    {d.getDate()}
                  </button>
                )
              })}
            </div>

            {/* Apply / Cancel */}
            <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="h-8 px-3 rounded-md text-[12.5px] text-slate-600 hover:bg-slate-100 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={apply}
                className="h-8 px-4 rounded-md text-[12.5px] font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
