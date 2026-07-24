'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { BarChart3, LayoutGrid, Store } from 'lucide-react'

// Unified admin left nav — replaces the old Header pill switcher AND the
// in-page DashboardSidebar view-toggle. Route-based now: each item is a real
// Next.js <Link>, active state derived from the URL.
const ITEMS: { href: string; label: string; icon: typeof BarChart3 }[] = [
  { href: '/dashboard', label: 'Overview metrics', icon: BarChart3 },
  { href: '/dashboard/placement-creative', label: 'Placement & Creative analysis', icon: LayoutGrid },
  { href: '/dashboard/dealers', label: 'Dealers', icon: Store },
]

// Collapsible icon rail overlay (Meta Ads Manager / Google Ads style).
// Positioned fixed so it never affects main content's layout (zero reflow).
//   • Collapsed by default → 56px icon-only rail (w-14).
//   • Hover (desktop only) → expands to 256px (w-64) with labels as a fixed
//     overlay (position: fixed), sits on top of content. Auto-collapses on leave.
//   • Pinned (via Header logo toggle) → stays expanded (256px), still a fixed
//     overlay (does not push main content).
//   • Below `lg` (tablet/mobile) → always icon-only (touch has no hover state).
//   • Admin-only (mounted conditionally in layout).
export default function Sidebar({ pinned }: { pinned: boolean }) {
  const pathname = usePathname()
  const [hovered, setHovered] = useState(false)
  const expanded = pinned || hovered

  return (
    <aside
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`fixed top-16 left-0 z-30 min-h-[calc(100vh-4rem)] overflow-hidden border-r border-slate-100 bg-white px-2 lg:px-3 py-6 transition-all duration-200 ease-in-out w-14 ${expanded ? 'lg:w-64' : ''}`}
    >
      <nav className="space-y-1">
        {ITEMS.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              className={`w-full flex items-center justify-center px-2 lg:px-3 py-2.5 rounded-lg text-[13px] font-medium leading-snug transition gap-2.5 ${
                expanded ? 'lg:justify-start' : ''
              } ${
                isActive
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Icon size={16} className={`shrink-0 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
              <span className={`whitespace-nowrap hidden ${expanded ? 'lg:inline' : ''}`}>{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
