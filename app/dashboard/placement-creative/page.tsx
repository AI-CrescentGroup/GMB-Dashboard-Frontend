'use client'

import { useEffect, useState } from 'react'
import PlacementAnalysisPanel from '@/components/placement/PlacementAnalysisPanel'
import { getUserRole } from '@/lib/auth'

// Placement & Creative analysis — extracted verbatim from the former in-page
// view toggle on /dashboard into its own route. PlacementAnalysisPanel is
// unchanged; role is read from the shared localStorage helper and passed down
// exactly as before (it drives the role-gated bits inside PlacementTab).
export default function PlacementCreativePage() {
  const [role, setRole] = useState('')

  useEffect(() => {
    setRole(getUserRole())
  }, [])

  return <PlacementAnalysisPanel role={role} />
}
