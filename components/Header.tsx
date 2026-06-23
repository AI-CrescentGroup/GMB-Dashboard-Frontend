'use client'

import { useRouter, usePathname } from 'next/navigation'
import { logoutUser, getCurrentUser } from '@/lib/auth'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { LogOut, BarChart3, Users } from 'lucide-react'

const navItems = [
  { href: '/dashboard', label: 'Overview', icon: BarChart3 },
  { href: '/dashboard/dealers', label: 'Dealers', icon: Users },
]

export default function Header() {
  const [user, setUser] = useState<any>(null)
  const router = useRouter()
  const pathname = usePathname()

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
    <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
      <div className="w-full px-8 py-4" style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center' }}>
        {/* Left: Logo + Title */}
        <div className="flex items-center gap-3" style={{ justifySelf: 'start' }}>
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
            GMB
          </div>
          <div>
            <h1 className="text-base font-bold text-gray-900 leading-tight">GMB Dashboard</h1>
            <p className="text-xs text-gray-400">Jaquar Analytics</p>
          </div>
        </div>

        {/* Center: Pill Nav */}
        <nav className="flex items-center gap-1 bg-gray-50 rounded-full p-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-6 py-2 rounded-full text-sm font-semibold transition whitespace-nowrap ${
                  isActive
                    ? 'bg-[#e07856] text-white'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Right: User + Logout */}
        <div className="flex items-center justify-end gap-4" style={{ justifySelf: 'end' }}>
          {user && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-700 font-medium">{user.username}</span>
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                style={{ backgroundColor: '#e07856' }}
              >
                {userInitials}
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
            title="Logout"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </header>
  )
}
