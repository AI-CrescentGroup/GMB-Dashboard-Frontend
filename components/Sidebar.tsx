"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard, Store, Star, MessageSquare, BarChart3,
  MapPin, Users, Settings, LogOut, ChevronLeft,
} from "lucide-react"
import { useState } from "react"

type Role = "admin" | "branch_head" | "dealer"

interface NavItem {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
  roles?: Role[]
  badge?: string | number
}

const NAV: { section: string; items: NavItem[] }[] = [
  {
    section: "Overview",
    items: [
      { href: "/dashboard",          label: "Dashboard", icon: LayoutDashboard },
      { href: "/dashboard/insights", label: "Insights",  icon: BarChart3 },
    ],
  },
  {
    section: "Network",
    items: [
      { href: "/dashboard/dealers",   label: "Dealers",   icon: Store,  roles: ["admin", "branch_head"] },
      { href: "/dashboard/locations", label: "Locations", icon: MapPin },
      { href: "/dashboard/reviews",   label: "Reviews",   icon: Star,   badge: 12 },
      { href: "/dashboard/posts",     label: "Posts",     icon: MessageSquare },
    ],
  },
  {
    section: "Admin",
    items: [
      { href: "/dashboard/users",    label: "Users",    icon: Users,    roles: ["admin"] },
      { href: "/dashboard/settings", label: "Settings", icon: Settings },
    ],
  },
]

export interface SidebarProps {
  role?: Role
  user?: { name: string; email: string }
  onSignOut?: () => void
}

export function Sidebar({ role = "admin", user, onSignOut }: SidebarProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  const visible = (item: NavItem) => !item.roles || item.roles.includes(role)

  return (
    <aside
      className={`sticky top-0 flex h-screen flex-col border-r border-slate-200/70 bg-white transition-[width] duration-200 ${
        collapsed ? "w-[68px]" : "w-[240px]"
      }`}
    >
      <div className="flex h-16 items-center gap-2.5 border-b border-slate-100 px-4">
        <div className="h-7 w-7 shrink-0 rounded-md bg-indigo-600" />
        {!collapsed && (
          <span className="text-[15px] font-semibold tracking-tight text-slate-900">
            Jaquar <span className="font-normal text-slate-400">GMB</span>
          </span>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {NAV.map((group) => {
          const items = group.items.filter(visible)
          if (!items.length) return null
          return (
            <div key={group.section} className="mb-5">
              {!collapsed && (
                <div className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  {group.section}
                </div>
              )}
              <ul className="space-y-0.5">
                {items.map((it) => {
                  const active = pathname === it.href || pathname.startsWith(it.href + "/")
                  const Icon = it.icon
                  return (
                    <li key={it.href}>
                      <Link
                        href={it.href}
                        className={`group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition ${
                          active
                            ? "bg-indigo-50 text-indigo-700"
                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                        } ${collapsed ? "justify-center px-0" : ""}`}
                      >
                        <Icon
                          className={`h-[18px] w-[18px] shrink-0 ${
                            active ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-600"
                          }`}
                          strokeWidth={2}
                        />
                        {!collapsed && (
                          <>
                            <span className="flex-1 truncate">{it.label}</span>
                            {it.badge != null && (
                              <span className="ml-auto inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-indigo-100 px-1.5 text-[10px] font-semibold text-indigo-700">
                                {it.badge}
                              </span>
                            )}
                          </>
                        )}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          )
        })}
      </nav>

      {user && (
        <div className="border-t border-slate-100 p-3">
          <div className={`flex items-center gap-2.5 rounded-lg p-2 ${!collapsed ? "hover:bg-slate-50" : ""}`}>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[11px] font-semibold text-indigo-700">
              {user.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-medium text-slate-900">{user.name}</div>
                <div className="truncate text-[11px] text-slate-500">{user.email}</div>
              </div>
            )}
            {!collapsed && (
              <button
                onClick={onSignOut}
                aria-label="Sign out"
                className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <LogOut className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      )}

      <button
        onClick={() => setCollapsed((c) => !c)}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        className="flex w-full items-center justify-center border-t border-slate-100 py-2 text-slate-400 hover:bg-slate-50 hover:text-slate-700"
      >
        <ChevronLeft className={`h-4 w-4 transition-transform ${collapsed ? "rotate-180" : ""}`} />
      </button>
    </aside>
  )
}
