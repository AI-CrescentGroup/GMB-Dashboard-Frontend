'use client'

import { useRouter } from 'next/navigation'
import { logoutUser, getCurrentUser } from '@/lib/auth'
import { useEffect, useState } from 'react'
import { LogOut } from 'lucide-react'

// `role` is retained for callers that still pass it, but the top-level
// Overview/Dealers pill nav that used to live here has moved into the unified
// collapsible Sidebar (admin-only). Header now renders just the brand, the
// user chip and logout. `onToggleSidebar` (passed only for admins) turns the
// logo square into the sidebar pin toggle.
export default function Header({ role, onToggleSidebar }: { role?: string; onToggleSidebar?: () => void }) {
  const [user, setUser] = useState<any>(null)
  const router = useRouter()

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
      <div className="w-full px-4 sm:px-8 h-16 flex items-center justify-between gap-4">
        {/* Left: Brand (logo square doubles as the sidebar pin toggle for admins) */}
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
          {onToggleSidebar ? (
            <button
              type="button"
              onClick={onToggleSidebar}
              title="Toggle sidebar"
              aria-label="Toggle sidebar"
              className="h-7 w-7 rounded-md bg-indigo-600 flex items-center justify-center flex-shrink-0 transition hover:bg-indigo-700"
            />
          ) : (
            <div className="h-7 w-7 rounded-md bg-indigo-600 flex items-center justify-center flex-shrink-0" />
          )}
          <span className="text-[15px] font-semibold tracking-tight text-slate-900 truncate">
            Jaquar <span className="hidden sm:inline text-slate-400 font-normal">GMB</span>
          </span>
        </div>

        {/* Right: User + Logout */}
        <div className="flex items-center justify-end gap-2 sm:gap-3 min-w-0">
          {user && (
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="hidden sm:block text-right">
                <div className="text-[13px] font-medium leading-tight text-slate-900">{user.username}</div>
              </div>
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-[11px] font-semibold text-indigo-700 flex-shrink-0">
                {userInitials}
              </div>
            </div>
          )}
          <div className="h-5 w-px bg-slate-200 flex-shrink-0" />
          <button
            onClick={handleLogout}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition flex-shrink-0"
            title="Logout"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>
  )
}
