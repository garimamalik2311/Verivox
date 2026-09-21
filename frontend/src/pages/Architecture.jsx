import { Terminal, Zap, Layers, ShieldCheck, GitBranch } from 'lucide-react'

export default function Architecture() {
  return (
    <section className="max-w-5xl space-y-8">
      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-cyan-400 font-mono">
          SIH Technical Architecture
        </p>
        <h1 className="text-3xl font-black tracking-tight text-white">
          How VeriVox Guards Conversations
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-400">
          End-to-end real-time pipeline from browser audio ingestion to backend risk telemetry.
        </p>
      </div>

      <div className="bg-[#0c1017] p-5 rounded-2xl border border-cyan-500/30 space-y-3 shadow-xl">
        <h3 className="text-sm font-bold text-cyan-300 flex items-center gap-2">
          <Terminal size={16} /> End-to-End Real-Time Pipeline
        </h3>
        <p className="text-xs text-slate-300 font-mono leading-relaxed bg-[#07090e] p-4 rounded-lg border border-slate-800">
          Live Mic / Audio File {' → '} 16kHz PCM16 {' → '} WebSocket {' → '} Backend VAD {' → '} Window Accumulator {' → '} 58-D Feature Extraction {' → '} Calibrated XGBoost {' → '} Risk Engine {' → '} WebSocket RiskResult {' → '} VeriVox Dashboard
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="rounded-2xl border border-slate-800 bg-[#0c1017]/90 p-6 space-y-3 shadow-xl">
          <div className="size-10 rounded-xl bg-cyan-400/10 text-cyan-400 flex items-center justify-center border border-cyan-400/20">
            <Zap size={20} />
          </div>
          <h4 className="font-bold text-white text-sm">1. Real-Time Streaming</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            Browser microphone or audio files are converted to mono PCM16 at 16kHz and streamed to the backend over WebSockets.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-[#0c1017]/90 p-6 space-y-3 shadow-xl">
          <div className="size-10 rounded-xl bg-cyan-400/10 text-cyan-400 flex items-center justify-center border border-cyan-400/20">
            <Layers size={20} />
          </div>
          <h4 className="font-bold text-white text-sm">2. 58-D Feature Pipeline</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            Backend feature extraction generates the 58-dimensional acoustic representation used by the trained inference model.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-[#0c1017]/90 p-6 space-y-3 shadow-xl">
          <div className="size-10 rounded-xl bg-cyan-400/10 text-cyan-400 flex items-center justify-center border border-cyan-400/20">
            <ShieldCheck size={20} />
          </div>
          <h4 className="font-bold text-white text-sm">3. Backend Risk Engine</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            The backend owns AI probability, rolling risk, consecutive flags and final risk state. The frontend only visualizes those results.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-[#0c1017]/90 p-6 shadow-xl">
        <div className="flex items-center gap-3 mb-5">
          <div className="size-10 rounded-xl bg-cyan-400/10 text-cyan-400 flex items-center justify-center">
            <GitBranch size={20} />
          </div>
          <div>
            <h2 className="font-bold text-white">Frontend / Backend Contract</h2>
            <p className="text-xs text-slate-400">Source of truth for live telemetry</p>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {[
            ['ai_probability', 'Backend ML probability'],
            ['rolling_score', 'Backend rolling risk score'],
            ['risk_level', 'Backend final risk classification'],
            ['consecutive_flags', 'Backend consecutive-window state'],
            ['speech_detected', 'Backend VAD state'],
            ['model_version', 'Backend model identifier'],
            ['feature_latency_ms', 'Backend feature/inference telemetry'],
            ['window_id', 'Backend processing window']
          ].map(([key, description]) => (
            <div key={key} className="rounded-xl border border-slate-800 bg-[#121824]/70 p-3">
              <p className="text-xs font-mono text-cyan-300">{key}</p>
              <p className="text-[11px] text-slate-400 mt-1">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}