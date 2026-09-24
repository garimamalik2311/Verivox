import { Activity } from 'lucide-react'
import StatusPill from '../../components/StatusPill'

export default function ProsodyPage({ analytics, selected }) {
  const prosody = analytics.prosody || {}

  const formatHz = (value) =>
    value != null && !Number.isNaN(Number(value))
      ? `${Number(value).toFixed(1)} Hz`
      : '--'

  const formatPercent = (value) =>
    value != null && !Number.isNaN(Number(value))
      ? `${Number(value).toFixed(1)}%`
      : '--'

  const formatNumber = (value) =>
    value != null && !Number.isNaN(Number(value))
      ? Number(value).toFixed(4)
      : '--'

  const formatFlatProsody = (value) => {
    if (value === true) return 'YES'
    if (value === false) return 'NO'
    return '--'
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-cyan-400 font-mono">
          Module 01
        </p>
        <h1 className="text-3xl font-black text-white mt-1">
          Prosody & Behavioral Analysis
        </h1>
        <p className="text-sm text-slate-400 mt-2">
          Analyzes rhythm, temporal alignment, and pitch dynamics to detect
          unnatural speech patterns common in text-to-speech (TTS) engines.
        </p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Pitch Mean */}
        <div className="rounded-xl border border-slate-800 bg-[#0c1017] p-5">
          <p className="text-[10px] uppercase font-mono text-slate-500">
            Pitch Mean
          </p>
          <p className="text-2xl font-bold font-mono text-white mt-2">
            {formatHz(prosody.pitch_mean_hz)}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Mean fundamental frequency across the rolling prosody window.
          </p>
        </div>

        {/* Pitch Variance */}
        <div className="rounded-xl border border-slate-800 bg-[#0c1017] p-5">
          <p className="text-[10px] uppercase font-mono text-slate-500">
            Pitch Variance
          </p>
          <p className="text-2xl font-bold font-mono text-cyan-300 mt-2">
            {formatPercent(prosody.pitch_variance_percent)}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Normalized pitch variation expressed as a percentage.
          </p>
        </div>

        {/* Pitch Std Dev */}
        <div className="rounded-xl border border-slate-800 bg-[#0c1017] p-5">
          <p className="text-[10px] uppercase font-mono text-slate-500">
            Pitch Std Dev
          </p>
          <p className="text-2xl font-bold font-mono text-indigo-300 mt-2">
            {formatHz(prosody.pitch_std_hz)}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Standard deviation of the observed pitch measurements.
          </p>
        </div>

        {/* Timing Variance */}
        <div className="rounded-xl border border-slate-800 bg-[#0c1017] p-5">
          <p className="text-[10px] uppercase font-mono text-slate-500">
            Timing Variance
          </p>
          <p className="text-2xl font-bold font-mono text-indigo-300 mt-2">
            {formatNumber(prosody.timing_variance)}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Variance of timing intervals between processed windows.
          </p>
        </div>

        {/* Flat Prosody */}
        <div className="rounded-xl border border-slate-800 bg-[#0c1017] p-5">
          <p className="text-[10px] uppercase font-mono text-slate-500">
            Flat Prosody
          </p>
          <p className="text-2xl font-bold font-mono text-cyan-300 mt-2">
            {formatFlatProsody(prosody.flat_prosody)}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Indicates whether pitch variation falls below the flat-prosody threshold.
          </p>
        </div>

        {/* YIN F0 Mean */}
        <div className="rounded-xl border border-slate-800 bg-[#0c1017] p-5">
          <p className="text-[10px] uppercase font-mono text-slate-500">
            YIN F0 Mean
          </p>
          <p className="text-2xl font-bold font-mono text-cyan-300 mt-2">
            {selected.yin_analysis?.f0_mean != null
              ? `${Number(selected.yin_analysis.f0_mean).toFixed(1)} Hz`
              : '--'}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Auxiliary YIN fundamental-frequency estimate.
          </p>
        </div>

        {/* YIN F0 Std Dev */}
        <div className="rounded-xl border border-slate-800 bg-[#0c1017] p-5">
          <p className="text-[10px] uppercase font-mono text-slate-500">
            YIN F0 Std Dev
          </p>
          <p className="text-2xl font-bold font-mono text-indigo-300 mt-2">
            {selected.yin_analysis?.f0_std != null
              ? `${Number(selected.yin_analysis.f0_std).toFixed(1)} Hz`
              : '--'}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Pitch variability measured by the auxiliary YIN analyzer.
          </p>
        </div>

        {/* YIN Voiced Ratio */}
        {/* Prosody ML Probability */}
        <div className="rounded-xl border border-slate-800 bg-[#0c1017] p-5">
          <p className="text-[10px] uppercase font-mono text-slate-500">
            Prosody ML Probability
          </p>
          <p className="text-2xl font-bold font-mono text-amber-300 mt-2">
            {prosody.spoof_probability != null
              ? `${(Number(prosody.spoof_probability) * 100).toFixed(1)}%`
              : '--'}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Language-free HGB supporting spoof probability.
          </p>
        </div>

        {/* Prosody ML Signal */}
        <div className="rounded-xl border border-slate-800 bg-[#0c1017] p-5">
          <p className="text-[10px] uppercase font-mono text-slate-500">
            Prosody ML Signal
          </p>
          <p className="text-2xl font-bold font-mono text-amber-300 mt-2">
            {{BONAFIDE_SUPPORT: 'Human', SPOOF_SUPPORT: 'Spoof', INCONCLUSIVE: 'Inconclusive', UNAVAILABLE: 'Unavailable'}[prosody.signal] || 'Unavailable'}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Supporting evidence only; does not replace the primary detector.
          </p>
        </div>

        {/* Prosody ML Model */}
        <div className="rounded-xl border border-slate-800 bg-[#0c1017] p-5">
          <p className="text-[10px] uppercase font-mono text-slate-500">
            Prosody ML Model
          </p>
          <p className="text-sm font-bold font-mono text-slate-200 mt-3 break-all">
            {prosody.model_version || '--'}
          </p>
          <p className="text-xs text-slate-400 mt-2">
            Language-independent supporting model.
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-[#0c1017] p-5">
          <p className="text-[10px] uppercase font-mono text-slate-500">
            YIN Voiced Ratio
          </p>
          <p className="text-2xl font-bold font-mono text-cyan-300 mt-2">
            {selected.yin_analysis?.voiced_ratio != null
              ? `${(Number(selected.yin_analysis.voiced_ratio) * 100).toFixed(1)}%`
              : '--'}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Proportion of the window classified as voiced.
          </p>
        </div>

      </div>

      {/* Educational & Detailed Breakdown */}
      <div className="rounded-2xl border border-slate-800 bg-[#0c1017] p-6 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Activity size={16} className="text-cyan-400" />
          How Prosody Analysis Works
        </h3>

        <p className="text-xs text-slate-300 leading-relaxed">
          Synthetic speech models often struggle with human-like micro-pauses,
          emotional inflection, and organic pitch drift. This module tracks
          pitch statistics over rolling windows to identify unusually flat or
          algorithmic prosody patterns.
        </p>

        <div className="border-t border-slate-800 pt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-400 font-mono">
          <div>
            <strong className="text-slate-200">Active Status:</strong>{' '}
            <StatusPill status={selected.risk_level || '--'} />
          </div>

          <div>
            <strong className="text-slate-200">Window ID:</strong>{' '}
            {selected.window_id ?? '--'}
          </div>
        </div>
      </div>
    </div>
  )
}