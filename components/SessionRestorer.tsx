'use client'

import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function SessionRestorer() {
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        supabase.auth.setSession(session)
      }
    })
  }, [])

  return null
}
