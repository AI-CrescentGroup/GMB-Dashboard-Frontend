'use client'

import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import { EmptyState } from '@/components/EmptyState'
import PlacementTab from './PlacementTab'

type SubTab = 'placement' | 'audience' | 'creative'

const SUB_TABS: { id: SubTab; label: string }[] = [
  { id: 'placement', label: 'Placement' },
  { id: 'audience', label: 'Audience' },
  { id: 'creative', label: 'Creative analysis' },
]

export default function PlacementAnalysisPanel({ role }: { role: string }) {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('placement')

  return (
    <div className="mx-auto max-w-[1440px] px-6 lg:px-8 py-6 lg:py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Placement, audience &amp; creative analysis</h1>
        <p className="text-sm text-slate-500 mt-1">Channel and placement breakdown across Google, Facebook &amp; Instagram</p>
      </div>

      {/* Secondary pill sub-nav — same pill visual language as Header.tsx's top nav */}
      <nav className="inline-flex items-center gap-1 bg-slate-100 rounded-full p-1">
        {SUB_TABS.map((tab) => {
          const isActive = activeSubTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSubTab(tab.id)}
              className={`px-4 sm:px-5 py-1.5 rounded-full text-[12px] sm:text-[13px] font-medium transition whitespace-nowrap ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-[0_1px_2px_rgba(15,23,42,0.08)]'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          )
        })}
      </nav>

      {activeSubTab === 'placement' && <PlacementTab role={role} />}

      {activeSubTab === 'audience' && (
        <EmptyState
          icon={<Sparkles className="h-5 w-5" />}
          title="Coming soon"
          description="Audience breakdown analysis is not built yet."
        />
      )}

      {activeSubTab === 'creative' && (
        <EmptyState
          icon={<Sparkles className="h-5 w-5" />}
          title="Coming soon"
          description="Creative analysis is not built yet."
        />
      )}
    </div>
  )
}
