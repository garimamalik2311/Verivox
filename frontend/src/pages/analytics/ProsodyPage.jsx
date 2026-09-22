import { Activity } from 'lucide-react'
import StatusPill from '../../components/StatusPill'

export default function ProsodyPage({ analytics, selected }) {
  const prosody = analytics.prosody || {}

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-cyan-400 font-mono">Module 01</p>
        <h1 className="text-3xl font-black text-white mt-1">Prosody & Behavioral Analysis</h1>
        <p className="text-sm text-slate-400 mt-2">
          Analyzes rhythm, temporal alignment, and pitch dynamics to detect unnatural speech patterns common in text-to-speech (TTS) engines.
        </p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-800 bg-[#0c1017] p-5">
          <p className="text-[10px] uppercase font-mono text-slate-500">Rhythm Score</p>
          <p className="text-2xl font-bold font-mono text-white mt-2">{prosody.rhythm_score ?? '--'}</p>
          <p className="text-xs text-slate-400 mt-1">Measures syllable-to-syllable timing consistency.</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-[#0c1017] p-5">
          <p className="text-[10px] uppercase font-mono text-slate-500">Pitch Variance</p>
          <p className="text-2xl font-bold font-mono text-cyan-300 mt-2">{prosody.pitch_variance ?? '--'}</p>
          <p className="text-xs text-slate-400 mt-1">Evaluates fundamental frequency ($F_0$) fluctuation.</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-[#0c1017] p-5">
          <p className="text-[10px] uppercase font-mono text-slate-500">Timing Variance</p>
          <p className="text-2xl font-bold font-mono text-indigo-300 mt-2">{prosody.timing_variance ?? '--'}</p>
          <p className="text-xs text-slate-400 mt-1">Tracks pause frequency and duration anomalies.</p>
        </div>
      </div>

      {/* Educational & Detailed Breakdown */}
      <div className="rounded-2xl border border-slate-800 bg-[#0c1017] p-6 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Activity size={16} className="text-cyan-400" /> How Prosody Analysis Works
        </h3>
        <p className="text-xs text-slate-300 leading-relaxed">
          Synthetic speech models often struggle with human-like micro-pauses, emotional inflection, and organic pitch drift. This module tracks the continuous Mel-Frequency Cepstral Coefficients (MFCCs) and $F_0$ contours over rolling windows to flag flat cadence or algorithmic cadence loops.
        </p>
        <div className="border-t border-slate-800 pt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-400 font-mono">
          <div><strong className="text-slate-200">Active Status:</strong> <StatusPill status={prosody.status || selected.risk_level} /></div>
          <div><strong className="text-slate-200">Window ID:</strong> {selected.window_id ?? '--'}</div>
        </div>
      </div>
    </div>
  )
}