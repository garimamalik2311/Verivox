import { useState } from 'react'
import {
  Activity,
  UserCheck,
  Fingerprint,
  GitBranch,
  Layers
} from 'lucide-react'

import ProsodyPage from './analytics/ProsodyPage'
import SpeakerPage from './analytics/SpeakerPage'
import VocoderPage from './analytics/VocoderPage'
import ExplainabilityPage from './analytics/ExplainabilityPage'
import DualStreamPage from './analytics/DualStreamPage'

export default function Analytics({
  streams,
  activeStreamId,
  setActiveStreamId,
  analytics,
  selected
}) {
  const [subPage, setSubPage] = useState('prosody')

  return (
    <div className="relative mx-auto max-w-6xl space-y-7">

      {/* =====================================================
          AURORA BACKGROUND GLOW
      ===================================================== */}

      <div className="pointer-events-none absolute -left-32 top-0 h-72 w-72 rounded-full bg-cyan-400/[0.04] blur-3xl" />
      <div className="pointer-events-none absolute -right-32 top-20 h-80 w-80 rounded-full bg-violet-500/[0.05] blur-3xl" />

      {/* =====================================================
          STREAM SELECTOR HEADER
      ===================================================== */}

      <div className="relative flex flex-col gap-4 border-b border-white/10 pb-5 md:flex-row md:items-center md:justify-between">

        <div>

          <div className="flex items-center gap-2">

            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-300 shadow-[0_0_10px_rgba(34,211,238,0.7)]" />

            <p className="text-[11px] font-bold font-mono uppercase tracking-[0.18em] text-cyan-300">
              Deep Inspection Panel
            </p>

          </div>

          <h1 className="mt-1 bg-gradient-to-r from-white via-cyan-100 to-violet-200 bg-clip-text text-2xl font-black tracking-tight text-transparent md:text-3xl">
            Behavioral & Acoustic Analytics
          </h1>

          <p className="mt-1.5 text-[13px] leading-5 text-slate-500">
            Inspect acoustic behavior, speaker identity, vocoder signatures,
            model explainability, and trilingual neural fusion.
          </p>

        </div>

        {/* STREAM SELECTOR */}

        <div className="flex items-center gap-2 overflow-x-auto pb-1">

          {Object.keys(streams).map((id) => (

            <button
              key={id}
              onClick={() => setActiveStreamId(id)}
              className={`group relative shrink-0 overflow-hidden rounded-xl border px-3.5 py-2 text-xs font-bold font-mono transition-all ${
                activeStreamId === id
                  ? 'border-cyan-300/40 bg-gradient-to-r from-cyan-400/[0.14] via-violet-500/[0.10] to-transparent text-cyan-200 shadow-[0_0_22px_rgba(34,211,238,0.08)]'
                  : 'border-white/10 bg-white/[0.025] text-slate-400 hover:border-cyan-300/20 hover:bg-white/[0.045] hover:text-white'
              }`}
            >

              {activeStreamId === id && (
                <span className="absolute inset-y-0 left-0 w-0.5 bg-gradient-to-b from-cyan-300 via-violet-400 to-fuchsia-400" />
              )}

              <span className="relative">
                {streams[id].name || id}
              </span>

            </button>

          ))}

        </div>
      </div>

      {/* =====================================================
          SUB-NAVIGATION TABS (5 TABS)
      ===================================================== */}

      <div className="relative grid grid-cols-2 gap-2 sm:grid-cols-5">

        {[
          {
            id: 'prosody',
            label: 'Prosody & Behavior',
            icon: Activity
          },
          {
            id: 'speaker',
            label: 'Speaker Verification',
            icon: UserCheck
          },
          {
            id: 'vocoder',
            label: 'Vocoder Fingerprint',
            icon: Fingerprint
          },
          {
            id: 'explainability',
            label: 'Explainability / SHAP',
            icon: GitBranch
          },
          {
            id: 'dual_stream',
            label: 'Dual-Stream Fusion',
            icon: Layers
          }
        ].map(({ id, label, icon: Icon }) => (

          <button
            key={id}
            onClick={() => setSubPage(id)}
            className={`group relative flex items-center justify-center gap-2 overflow-hidden rounded-xl border p-3.5 text-[12px] font-bold font-mono transition-all ${
              subPage === id
                ? 'border-cyan-300/35 bg-gradient-to-r from-cyan-400/[0.12] via-violet-500/[0.09] to-fuchsia-500/[0.04] text-cyan-200 shadow-[0_0_28px_rgba(34,211,238,0.07)]'
                : 'border-white/10 bg-white/[0.025] text-slate-400 hover:border-white/20 hover:bg-white/[0.045] hover:text-white'
            }`}
          >

            {subPage === id && (
              <>
                <span className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-cyan-400 via-violet-400 to-fuchsia-400" />

                <span className="absolute -right-8 -top-8 h-20 w-20 rounded-full bg-cyan-400/10 blur-2xl" />
              </>
            )}

            <Icon
              size={17}
              className={`relative transition-all ${
                subPage === id
                  ? 'text-cyan-300'
                  : 'text-slate-500 group-hover:text-violet-300'
              }`}
            />

            <span className="relative">
              {label}
            </span>

          </button>

        ))}

      </div>

      {/* =====================================================
          ACTIVE ANALYTICS SUBPAGE
      ===================================================== */}

      <div className="relative pt-1">

        {subPage === 'prosody' && (
          <ProsodyPage
            analytics={analytics}
            selected={selected}
          />
        )}

        {subPage === 'speaker' && (
          <SpeakerPage
            selected={selected}
          />
        )}

        {subPage === 'vocoder' && (
          <VocoderPage
            selected={selected}
          />
        )}

        {subPage === 'explainability' && (
          <ExplainabilityPage
            analytics={analytics}
            selected={selected}
          />
        )}

        {subPage === 'dual_stream' && (
          <DualStreamPage
            analytics={analytics}
            selected={selected}
          />
        )}

      </div>

    </div>
  )
}