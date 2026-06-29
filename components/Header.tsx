'use client'

import { useRouter, usePathname } from 'next/navigation'
import { logoutUser, getCurrentUser } from '@/lib/auth'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { LogOut, BarChart3, Users } from 'lucide-react'

const allNavItems = [
  { href: '/dashboard', label: 'Overview', icon: BarChart3 },
  { href: '/dashboard/dealers', label: 'Dealers', icon: Users },
]

export default function Header({ role }: { role?: string }) {
  const [user, setUser] = useState<any>(null)
  const router = useRouter()
  const pathname = usePathname()
  const navItems = (role === 'branch_head' || role === 'dealer') ? allNavItems.filter(item => item.href !== '/dashboard') : allNavItems

  useEffect(() => {
    async function loadUser() {
      const currentUser = await getCurrentUser()
      setUser(currentUser)
    }
    loadUser()
  }, [])

  async function handleLogout() {
    await logoutUser()
    router.push('/')
  }

  const userInitials = user?.username
    ? user.username
        .split(/[._]/)
        .map((part: string) => part[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'U'

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/80 backdrop-blur-md">
      <div
        className="w-full px-8 h-16"
        style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center' }}
      >
        {/* Left: Brand */}
        <div className="flex items-center gap-2.5" style={{ justifySelf: 'start' }}>
          <div className="h-7 w-7 rounded-md bg-indigo-600 flex items-center justify-center flex-shrink-0" />
          <div>
            <span className="text-[15px] font-semibold tracking-tight text-slate-900">
              Jaquar <span className="text-slate-400 font-normal">GMB</span>
            </span>
          </div>
        </div>

        {/* Center: Pill Nav */}
        <nav className="flex items-center gap-1 bg-slate-100 rounded-full p-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-6 py-1.5 rounded-full text-[13px] font-medium transition whitespace-nowrap ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-[0_1px_2px_rgba(15,23,42,0.08)]'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Right: User + Logout */}
        <div className="flex items-center justify-end gap-3" style={{ justifySelf: 'end' }}>
          {user && (
            <div className="flex items-center gap-2.5">
              <div className="hidden sm:block text-right">
                <div className="text-[13px] font-medium leading-tight text-slate-900">{user.username}</div>
              </div>
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-[11px] font-semibold text-indigo-700 flex-shrink-0">
                {userInitials}
              </div>
            </div>
          )}
          <div className="h-5 w-px bg-slate-200" />
          <button
            onClick={handleLogout}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition"
            title="Logout"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>
  )
}
