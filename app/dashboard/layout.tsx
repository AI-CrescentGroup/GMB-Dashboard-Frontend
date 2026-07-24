'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Header from '@/components/Header'
import Sidebar from '@/components/Sidebar'
import { getStoredUser } from '@/lib/auth'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState('')
  // Pin state for the collapsible sidebar lives here (not in Sidebar) because the
  // toggle control is the logo square in Header — a sibling, not a child, of Sidebar.
  const [sidebarPinned, setSidebarPinned] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const user = getStoredUser()
    if (!user.email) {
      router.push('/')
    } else {
      setIsAuthenticated(true)
      setRole(user?.role || '')
      if ((user?.role === 'branch_head' || user?.role === 'dealer') && pathname === '/dashboard') {
        router.push('/dashboard/dealers')
      }
    }
    setLoading(false)
  }, [router, pathname])

  if (loading || !isAuthenticated) {
    return null
  }

  const isAdmin = role === 'admin'

  return (
    <div className="min-h-screen bg-slate-50">
      <Header
        role={role}
        onToggleSidebar={isAdmin ? () => setSidebarPinned((p) => !p) : undefined}
      />
      {isAdmin && <Sidebar pinned={sidebarPinned} />}
      {/* pl-14 permanently reserves the collapsed rail's 56px so content starts
          to its right — the fixed sidebar never overlaps this padding. Hover/pin
          expansion (to 256px) still overlays on top without changing this offset. */}
      <main className={`min-w-0 ${isAdmin ? 'pl-14' : ''}`}>
        {children}
      </main>
    </div>
  )
}
