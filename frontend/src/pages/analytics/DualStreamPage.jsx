import { useState } from 'react'
import { Layers, Cpu, Sparkles, CheckCircle2, Upload, AlertTriangle, ShieldCheck } from 'lucide-react'
import StatusPill from '../../components/StatusPill'
import { formatProbability } from '../../utils/helpers'

export default function DualStreamPage({ analytics = {}, selected = {} }) {
  const dual = analytics.dual_stream || {}
  const [testResult, setTestResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const alpha = dual.alpha ?? 0.64
  const sslPercent = Math.round(alpha * 100)
  const dspPercent = 100 - sslPercent
  const liveProb = dual.probability !== null ? dual.probability : (selected.ai_probability ?? null)

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setLoading(true)
    setError(null)
    setTestResult(null)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('http://127.0.0.1:8000/api/detect/dual-stream', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (data.error) {
        setError(data.error)
      } else {
        setTestResult(data)
      }
    } catch (err) {
      setError(`Connection failed: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-cyan-400 font-mono">Module 05</p>
        <h1 className="text-3xl font-black text-white mt-1">Dual-Stream Neural Acoustic Fusion</h1>
        <p className="text-sm text-slate-400 mt-2">
          Fuses self-supervised representations (<strong>facebook/mms-300m</strong>, 1024-D) with physics-based 
          handcrafted spectral formants (58-D DSP) via a learned adaptive modality gate.
        </p>
      </div>

      {/* Trilingual Coverage Badges */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs font-mono font-bold text-slate-400">Supported Languages:</span>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold font-mono bg-cyan-950/60 border border-cyan-500/40 text-cyan-300">
          🇬🇧 English (en) <CheckCircle2 size={13} className="text-cyan-400" />
        </span>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold font-mono bg-emerald-950/60 border border-emerald-500/40 text-emerald-300">
          🇮🇳 Hindi (hi) <CheckCircle2 size={13} className="text-emerald-400" />
        </span>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold font-mono bg-violet-950/60 border border-violet-500/40 text-violet-300">
          🇮🇳 Tamil (ta) <CheckCircle2 size={13} className="text-violet-400" />
        </span>
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Live Probability */}
        <div className="rounded-xl border border-slate-800 bg-[#0c1017] p-5">
          <p className="text-[10px] uppercase font-mono text-slate-500">Dual-Stream AI Probability</p>
          <p className="text-2xl font-black font-mono mt-2 text-cyan-300">
            {formatProbability(liveProb)}
          </p>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs text-slate-400 font-mono">Risk Status:</span>
            <StatusPill status={liveProb >= 0.70 ? 'CRITICAL' : liveProb >= 0.40 ? 'SUSPICIOUS' : 'NORMAL'} />
          </div>
        </div>

        {/* Modality Gate */}
        <div className="rounded-xl border border-slate-800 bg-[#0c1017] p-5">
          <p className="text-[10px] uppercase font-mono text-slate-500">Learned Modality Gate (α)</p>
          <p className="text-2xl font-black font-mono mt-2 text-violet-300">
            α = {alpha.toFixed(2)}
          </p>
          <div className="mt-3 space-y-1">
            <div className="flex justify-between text-[11px] font-mono text-slate-400">
              <span>SSL: {sslPercent}%</span>
              <span>DSP: {dspPercent}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden flex">
              <div className="bg-gradient-to-r from-violet-500 to-cyan-400 h-full" style={{ width: `${sslPercent}%` }} />
              <div className="bg-gradient-to-r from-emerald-500 to-amber-500 h-full" style={{ width: `${dspPercent}%` }} />
            </div>
          </div>
        </div>

        {/* Model Architecture Specs */}
        <div className="rounded-xl border border-slate-800 bg-[#0c1017] p-5">
          <p className="text-[10px] uppercase font-mono text-slate-500">Architecture Dimensions</p>
          <p className="text-xs font-mono text-slate-300 mt-2 space-y-1">
            <span className="block">• SSL Latents: <strong>1,024-D</strong></span>
            <span className="block">• Handcrafted DSP: <strong>58-D</strong></span>
            <span className="block">• Joint Projection: <strong>128-D</strong></span>
          </p>
        </div>
      </div>

      {/* Interactive Audio Inspector */}
      <div className="rounded-2xl border border-slate-800 bg-[#0c1017] p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Sparkles size={16} className="text-cyan-400" /> On-Demand Audio File Inspector
          </h3>
          <span className="text-[11px] font-mono text-slate-400">REST API: /api/detect/dual-stream</span>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          Upload any audio clip (.wav, .mp3, .ogg) to test it directly against the MMS-300M Dual-Stream Model.
        </p>

        <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-700 hover:border-cyan-400/60 rounded-xl cursor-pointer bg-white/[0.015] hover:bg-white/[0.03] transition-all">
          <Upload size={24} className="text-cyan-300 mb-2" />
          <span className="text-xs font-mono font-bold text-slate-300">
            {loading ? 'Evaluating Dual-Stream Audio...' : 'Click or Drop Audio File to Inspect'}
          </span>
          <input type="file" accept="audio/*" onChange={handleFileUpload} className="hidden" disabled={loading} />
        </label>

        {error && (
          <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs font-mono flex items-center gap-2">
            <AlertTriangle size={15} /> {error}
          </div>
        )}

        {testResult && (
          <div className="p-4 rounded-xl bg-slate-900/80 border border-cyan-400/30 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400">File: {testResult.filename}</span>
              <StatusPill status={testResult.risk_level === 'HIGH' ? 'CRITICAL' : testResult.risk_level === 'MEDIUM' ? 'SUSPICIOUS' : 'NORMAL'} />
            </div>
            <div className="text-lg font-bold font-mono text-white flex items-center justify-between">
              <span>AI Probability:</span>
              <span className={testResult.ai_probability >= 0.70 ? 'text-rose-400' : 'text-emerald-400'}>
                {(testResult.ai_probability * 100).toFixed(1)}%
              </span>
            </div>
            <div className="text-[11px] font-mono text-slate-400 flex justify-between border-t border-slate-800 pt-2">
              <span>Latency: {testResult.latency_ms} ms</span>
              <span>Modality Gate α: {testResult.modality_gate_alpha}</span>
              <span>Supported: EN, HI, TA</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}