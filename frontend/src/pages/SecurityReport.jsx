import { ShieldAlert, ShieldCheck, Cpu, RadioTower, Lock, FileText, CheckCircle2, AlertTriangle, Zap } from 'lucide-react'
import StatusPill from '../components/StatusPill'

export default function SecurityReport({ streams, selected }) {
  const streamList = Object.values(streams || {})
  const totalStreams = streamList.length
  const activeAlerts = streamList.filter(s => s.alert_triggered || s.risk_level === 'HIGH').length

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--color-verivox-border)] pb-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-verivox-cyan)] font-mono">Executive Audit & Compliance</p>
          <h1 className="text-3xl font-black text-white mt-1">System Security Report</h1>
          <p className="text-sm text-slate-400 mt-2">
            Comprehensive posture analysis, real-time threat telemetry, and architecture safeguards implemented across the VeriVox Neural Guard engine.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-2 rounded-xl border border-[var(--color-verivox-cyan)]/30 bg-[var(--color-verivox-cyan)]/10 px-4 py-2 font-mono text-xs text-[var(--color-verivox-cyan)]">
            <ShieldCheck size={16} /> SECURE POSTURE ACTIVE
          </span>
        </div>
      </div>

      {/* High-Level Posture Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-[var(--color-verivox-border)] bg-[var(--color-verivox-dark)] p-5 shadow-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
            <span>MONITORED CHANNELS</span>
            <RadioTower size={16} className="text-[var(--color-verivox-cyan)]" />
          </div>
          <p className="text-3xl font-black font-mono text-white mt-3">{totalStreams}</p>
          <p className="text-[11px] text-slate-500 mt-1">Active WebSocket endpoints</p>
        </div>

        <div className="rounded-2xl border border-[var(--color-verivox-border)] bg-[var(--color-verivox-dark)] p-5 shadow-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
            <span>ACTIVE SECURITY ALERTS</span>
            <AlertTriangle size={16} className="text-[var(--color-verivox-pink)]" />
          </div>
          <p className="text-3xl font-black font-mono text-[var(--color-verivox-pink)] mt-3">{activeAlerts}</p>
          <p className="text-[11px] text-slate-500 mt-1">Synthetic voice triggers latched</p>
        </div>

        <div className="rounded-2xl border border-[var(--color-verivox-border)] bg-[var(--color-verivox-dark)] p-5 shadow-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
            <span>PIPELINE LATENCY</span>
            <Cpu size={16} className="text-[var(--color-verivox-cyan)]" />
          </div>
          <p className="text-3xl font-black font-mono text-white mt-3">{selected.feature_latency_ms ?? '--'} <span className="text-sm font-normal text-slate-400">ms</span></p>
          <p className="text-[11px] text-slate-500 mt-1">58-D extraction & inference speed</p>
        </div>

        <div className="rounded-2xl border border-[var(--color-verivox-border)] bg-[var(--color-verivox-dark)] p-5 shadow-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
            <span>GLOBAL RISK STATUS</span>
            <ShieldAlert size={16} className="text-[var(--color-verivox-yellow)]" />
          </div>
          <div className="mt-3">
            <StatusPill status={activeAlerts > 0 ? 'HIGH' : 'CLEAR'} />
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Real-time state evaluation</p>
        </div>
      </div>

      {/* Core Defense Pillars Table/Grid */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Lock size={18} className="text-[var(--color-verivox-cyan)]" /> Active Protection Layers & Features
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Pillar 1 */}
          <div className="rounded-2xl border border-[var(--color-verivox-border)] bg-[var(--color-verivox-dark)] p-6 space-y-3">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-lg bg-[var(--color-verivox-cyan)]/10 text-[var(--color-verivox-cyan)] flex items-center justify-center border border-[var(--color-verivox-cyan)]/20">
                <RadioTower size={18} />
              </div>
              <h3 className="font-bold text-white text-sm">1. Real-Time PCM Ingestion & VAD</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Streams raw audio sampled at 16kHz mono via secure WebSockets. Voice Activity Detection (VAD) filters out background noise and silence windows, processing only active human speech to minimize false flags and optimize latency.
            </p>
            <div className="pt-2 flex items-center gap-2 text-[11px] text-[var(--color-verivox-cyan)] font-mono">
              <CheckCircle2 size={14} /> Active stream validation enabled
            </div>
          </div>

          {/* Pillar 2 */}
          <div className="rounded-2xl border border-[var(--color-verivox-border)] bg-[var(--color-verivox-dark)] p-6 space-y-3">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-lg bg-[var(--color-verivox-cyan)]/10 text-[var(--color-verivox-cyan)] flex items-center justify-center border border-[var(--color-verivox-cyan)]/20">
                <Cpu size={18} />
              </div>
              <h3 className="font-bold text-white text-sm">2. 58-Dimensional Feature Extraction</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Extracts robust acoustic vectors comprising pitch variance, temporal rhythm regularity, and spectral distribution properties evaluated by calibrated machine learning classifiers (XGBoost).
            </p>
            <div className="pt-2 flex items-center gap-2 text-[11px] text-[var(--color-verivox-cyan)] font-mono">
              <CheckCircle2 size={14} /> High-fidelity feature mapping operational
            </div>
          </div>

          {/* Pillar 3 */}
          <div className="rounded-2xl border border-[var(--color-verivox-border)] bg-[var(--color-verivox-dark)] p-6 space-y-3">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-lg bg-[var(--color-verivox-pink)]/10 text-[var(--color-verivox-pink)] flex items-center justify-center border border-[var(--color-verivox-pink)]/20">
                <ShieldAlert size={18} />
              </div>
              <h3 className="font-bold text-white text-sm">3. Vocoder & Deepfake Fingerprinting</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Scans audio streams for generative artifacts unique to modern neural vocoders (e.g., HiFi-GAN, WaveNet) and voice-cloning software to identify synthetic anomalies instantly.
            </p>
            <div className="pt-2 flex items-center gap-2 text-[11px] text-[var(--color-verivox-cyan)] font-mono">
              <CheckCircle2 size={14} /> Artifact signature scanning running
            </div>
          </div>

          {/* Pillar 4 */}
          <div className="rounded-2xl border border-[var(--color-verivox-border)] bg-[var(--color-verivox-dark)] p-6 space-y-3">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-lg bg-[var(--color-verivox-yellow)]/10 text-[var(--color-verivox-yellow)] flex items-center justify-center border border-[var(--color-verivox-yellow)]/20">
                <Zap size={18} />
              </div>
              <h3 className="font-bold text-white text-sm">4. Automated Kill-Switch & Mitigation</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              When consecutive high-risk windows cross safety thresholds, the backend triggers a hard security alert, instantly freezing input streams and mitigating potential social engineering or financial fraud attempts.
            </p>
            <div className="pt-2 flex items-center gap-2 text-[11px] text-[var(--color-verivox-cyan)] font-mono">
              <CheckCircle2 size={14} /> Latching safety interlocks active
            </div>
          </div>
        </div>
      </div>

      {/* Audit Log / Active Stream Summary */}
      <div className="rounded-2xl border border-[var(--color-verivox-border)] bg-[var(--color-verivox-dark)] p-6 space-y-4 shadow-xl">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <FileText size={16} className="text-[var(--color-verivox-cyan)]" /> Active Channel Telemetry Summary
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead>
              <tr className="border-b border-[var(--color-verivox-border)] text-slate-500">
                <th className="pb-3 font-semibold">STREAM ID</th>
                <th className="pb-3 font-semibold">CHANNEL NAME</th>
                <th className="pb-3 font-semibold">RISK LEVEL</th>
                <th className="pb-3 font-semibold">AI PROBABILITY</th>
                <th className="pb-3 font-semibold">ROLLING SCORE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-verivox-border)]/60 text-slate-300">
              {streamList.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-4 text-slate-500">No active streams found in state context.</td>
                </tr>
              ) : (
                streamList.map((stream) => (
                  <tr key={stream.stream_id} className="hover:bg-[var(--color-verivox-cardHover)]">
                    <td className="py-3 text-[var(--color-verivox-cyan)] font-bold">{stream.stream_id}</td>
                    <td className="py-3 text-white">{stream.name || 'Unnamed Stream'}</td>
                    <td className="py-3"><StatusPill status={stream.risk_level || 'CLEAR'} /></td>
                    <td className="py-3">{stream.ai_probability != null ? `${Math.round(Number(stream.ai_probability) * 100)}%` : '--'}</td>
                    <td className="py-3">{stream.rolling_score != null ? Number(stream.rolling_score).toFixed(3) : '--'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}