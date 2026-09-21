import { useState } from 'react'
import { Activity, UserCheck, Fingerprint, GitBranch } from 'lucide-react'
import ProsodyPage from './analytics/ProsodyPage'
import SpeakerPage from './analytics/SpeakerPage'
import VocoderPage from './analytics/VocoderPage'
import ExplainabilityPage from './analytics/ExplainabilityPage'

export default function Analytics({ streams, activeStreamId, setActiveStreamId, analytics, selected }) {
  const [subPage, setSubPage] = useState('prosody')

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Stream Selector Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--color-verivox-border)] pb-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-verivox-cyan)] font-mono">Deep Inspection Panel</p>
          <h1 className="text-2xl font-black text-white mt-1">Behavioral & Acoustic Analytics</h1>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {Object.keys(streams).map((id) => (
            <button
              key={id}
              onClick={() => setActiveStreamId(id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition border ${
                activeStreamId === id ? 'bg-[var(--color-verivox-cyan)] text-[var(--color-verivox-darkest)] border-[var(--color-verivox-cyan)]' : 'bg-[var(--color-verivox-dark)] text-slate-300 border-[var(--color-verivox-border)]'
              }`}
            >
              {streams[id].name || id}
            </button>
          ))}
        </div>
      </div>

      {/* Sub-navigation Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { id: 'prosody', label: 'Prosody & Behavior', icon: Activity },
          { id: 'speaker', label: 'Speaker Verification', icon: UserCheck },
          { id: 'vocoder', label: 'Vocoder Fingerprint', icon: Fingerprint },
          { id: 'explainability', label: 'Explainability / SHAP', icon: GitBranch },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setSubPage(id)}
            className={`flex items-center justify-center gap-2 p-3 rounded-xl text-xs font-bold font-mono transition border ${
              subPage === id
                ? 'bg-[var(--color-verivox-cyan)]/10 border-[var(--color-verivox-cyan)]/50 text-[var(--color-verivox-cyan)] shadow-lg'
                : 'bg-[var(--color-verivox-dark)] border-[var(--color-verivox-border)] text-slate-400 hover:text-white'
            }`}
          >
            <Icon size={16} />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* Render Active Subpage */}
      <div className="pt-2">
        {subPage === 'prosody' && <ProsodyPage analytics={analytics} selected={selected} />}
        {subPage === 'speaker' && <SpeakerPage selected={selected} />}
        {subPage === 'vocoder' && <VocoderPage selected={selected} />}
        {subPage === 'explainability' && <ExplainabilityPage analytics={analytics} selected={selected} />}
      </div>
    </div>
  )
}