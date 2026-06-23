'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const user = localStorage.getItem('user')
    if (!user) {
      router.push('/')
    } else {
      setIsAuthenticated(true)
    }
    setLoading(false)
  }, [router])

  if (loading || !isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#f9f7f4" }}>
      <Header />
      <main className="px-6 py-6 md:px-8 md:py-8">
        {children}
      </main>
    </div>
  )
}
