'use client'

import { Sparkles } from 'lucide-react'
import { EmptyState } from '@/components/EmptyState'
import PlacementTab from './PlacementTab'

export default function PlacementAnalysisPanel({ role }: { role: string }) {
  return (
    <div className="mx-auto max-w-[1440px] px-6 lg:px-8 py-6 lg:py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Placement &amp; Creative analysis</h1>
        <p className="text-sm text-slate-500 mt-1">Placement and Creative analysis breakdown across Google, Facebook &amp; Instagram</p>
      </div>

      <PlacementTab role={role} />

      <div>
        <div className="flex items-center justify-between border-l-4 border-indigo-500 pl-3 mb-4">
          <span className="text-sm font-semibold text-slate-800">Creative analysis</span>
        </div>
        <EmptyState
          icon={<Sparkles className="h-5 w-5" />}
          title="Coming soon"
          description="Creative analysis is not built yet."
        />
      </div>
    </div>
  )
}
