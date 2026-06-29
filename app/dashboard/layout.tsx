'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Header from '@/components/Header'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState('')
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}')
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

  return (
    <div className="min-h-screen bg-slate-50">
      <Header role={role} />
      <main>
        {children}
      </main>
    </div>
  )
}
