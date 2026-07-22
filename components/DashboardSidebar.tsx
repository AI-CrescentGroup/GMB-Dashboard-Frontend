'use client'

import { BarChart3, LayoutGrid } from 'lucide-react'

export type OverviewSidebarView = 'overview' | 'placement'

const ITEMS: { id: OverviewSidebarView; label: string; icon: typeof BarChart3 }[] = [
  { id: 'overview', label: 'Overview metrics', icon: BarChart3 },
  { id: 'placement', label: 'Placement & Creative analysis', icon: LayoutGrid },
]

// In-page state-based view switcher for the Overview tab — NOT route-based.
// Selecting an item does not navigate; it flips a parent useState so the
// existing Overview content and the new Placement/Audience/Creative panel
// can share the /dashboard route without their own URLs.
export default function DashboardSidebar({
  activeView,
  onSelect,
}: {
  activeView: OverviewSidebarView
  onSelect: (view: OverviewSidebarView) => void
}) {
  return (
    // Below `lg` there's no room for the full 256px rail, so it collapses to an
    // icon-only strip (still on the left, same footprint as before) rather than
    // disappearing entirely — otherwise tablet/mobile users have no way to reach
    // the Placement & Creative view at all.
    <aside className="w-14 lg:w-64 shrink-0 sticky top-16 self-start border-r border-slate-100 bg-white min-h-[calc(100vh-4rem)] px-2 lg:px-3 py-6">
      <nav className="space-y-1">
        {ITEMS.map((item) => {
          const isActive = activeView === item.id
          const Icon = item.icon
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              title={item.label}
              className={`w-full flex items-start justify-center lg:justify-start gap-2.5 px-2 lg:px-3 py-2.5 rounded-lg text-left text-[13px] font-medium leading-snug transition ${
                isActive
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Icon size={16} className={`mt-0.5 shrink-0 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
              <span className="hidden lg:inline">{item.label}</span>
            </button>
          )
        })}
      </nav>
    </aside>
  )
}
