'use client'

import {
  Mic,
  RadioTower,
  Play,
  Square,
  FileAudio,
  AlertTriangle,
  X,
  Radio,
  Volume2,
  Settings2,
  Gauge,
  Waves,
  Bell,
  ShieldAlert,
  CheckCircle2
} from 'lucide-react'

import AudioPlaybackBar from '../components/AudioPlaybackBar'
import StatusPill from '../components/StatusPill'
import LiveGraph from '../components/LiveGraph'
import { formatScore } from '../utils/helpers'

export default function Overview({
  micStatus,
  inputMode,
  micLevel,
  isLiveMonitoring,
  selected,
  activeStreamId,
  securityTerminated,
  showInspector,
  summary,
  streams,
  startMicrophoneStream,
  stopMicrophoneStream,
  toggleLiveMonitor,
  handleFileUpload,
  acknowledgeAlert,
  setActiveStreamId,
  transactionAmountInr,
  setTransactionAmountInr,
  selectedScenario,
  setSelectedScenario,
  contextConfigured,
  configureSecurityContext
}) {
  const securityNotifications = [
    {
      id: 'notif_1',
      type: selected.risk_level === 'HIGH' ? 'danger' : 'info',
      title: selected.risk_level === 'HIGH' ? 'Synthetic Clone Flagged' : 'Neural Guard Active',
      message: selected.risk_level === 'HIGH'
        ? `Stream ${activeStreamId} breached probability threshold (${Math.round((selected.ai_probability || 0) * 100)}%).`
        : `Monitoring stream ${activeStreamId} via WebSocket 16kHz PCM pipeline.`,
      time: 'Just now'
    },
    {
      id: 'notif_2',
      type: securityTerminated ? 'danger' : 'success',
      title: securityTerminated ? 'Kill-Switch Engaged' : 'System Integrity Normal',
      message: securityTerminated
        ? 'Active file stream frozen due to security policy enforcement.'
        : 'All 58-dimensional feature extractors operating within normal parameters.',
      time: 'Real-time'
    }
  ]

  // Calculate circular progress metrics for the new Risk Score display
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const currentScore = selected.rolling_score || 0;
  const strokeDashoffset = circumference - currentScore * circumference;

  return (
    <div className="relative space-y-8">

      {/* 1. SYNTHETIC VOICE ALERT */}
      {selected.alert_triggered && (
        <section className="relative flex flex-col gap-4 overflow-hidden rounded-2xl border border-red-400/55 bg-gradient-to-r from-red-500/[0.16] via-red-500/[0.07] to-transparent p-5 shadow-[0_0_55px_rgba(239,68,68,0.14)] md:flex-row md:items-center md:justify-between">
          <div className="pointer-events-none absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-red-300 via-red-500 to-orange-400 shadow-[0_0_15px_rgba(239,68,68,0.6)]" />
          <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-red-500/15 blur-3xl" />
          <div className="relative flex items-start gap-3">
            <div className="mt-0.5 flex size-12 shrink-0 items-center justify-center rounded-xl border border-red-300/35 bg-red-400/10 shadow-[0_0_25px_rgba(239,68,68,0.15)]">
              <AlertTriangle size={26} className="animate-pulse text-red-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-md border border-red-300/30 bg-red-400/10 px-2.5 py-0.5 text-xs font-black font-mono uppercase tracking-widest text-red-200">
                  Critical Detection
                </span>
              </div>
              <h2 className="mt-2 text-lg font-bold text-white">Synthetic Voice Clone Detected</h2>
              <p className="mt-1 text-sm leading-relaxed font-mono text-slate-200">
                {selected.alert_reason === 'persistent_high_ai_probability'
                  ? `High synthetic-voice probability detected across ${selected.alert_consecutive_flags || selected.consecutive_flags || 3} consecutive audio windows.`
                  : selected.alert_reason || 'Backend Risk Engine has triggered an alert for this stream.'}
              </p>
            </div>
          </div>
          <button onClick={acknowledgeAlert} className="relative flex shrink-0 items-center gap-2 rounded-lg border border-red-300/40 bg-red-500/15 px-4 py-2.5 text-sm font-bold font-mono text-red-200 transition hover:border-red-200/60 hover:bg-red-500/25 hover:text-white hover:shadow-[0_0_20px_rgba(239,68,68,0.15)]">
            <X size={16} />
            Acknowledge & Escalate
          </button>
        </section>
      )}

      {/* 2. VOICE INGESTION & ROLLING RISK PIE CHART */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.3fr_1fr]">
        
        {/* VOICE INGESTION */}
        <section className="relative overflow-hidden flex flex-col justify-center rounded-2xl border border-cyan-300/25 bg-[#07111f]/75 p-5 shadow-[0_0_45px_rgba(34,211,238,0.07)] backdrop-blur-xl">
          <div className="pointer-events-none absolute -right-6 -top-6 opacity-[0.09]">
            <RadioTower size={150} className="text-cyan-300" />
          </div>

          <div className="relative mb-5 flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div className="flex items-center gap-3">
              <div className={`flex size-12 items-center justify-center rounded-xl border ${micStatus === 'Live Mic Streaming...' ? 'animate-pulse border-cyan-300/60 bg-cyan-400/15 text-cyan-200 shadow-[0_0_28px_rgba(34,211,238,0.25)]' : 'border-cyan-300/30 bg-cyan-400/[0.08] text-cyan-200'}`}>
                <Mic size={24} />
              </div>
              <div>
                <h2 className="flex flex-wrap items-center gap-2 text-lg font-bold text-white">
                  Live Voice Ingestion
                  <span className="rounded-full border border-cyan-300/20 bg-cyan-400/[0.07] px-2.5 py-0.5 text-xs font-bold font-mono uppercase tracking-wide text-cyan-200">{micStatus}</span>
                </h2>
                <p className="mt-1 text-sm font-mono text-slate-400">16kHz Mono PCM • Backend VAD</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button onClick={() => micStatus === 'Live Mic Streaming...' ? stopMicrophoneStream() : startMicrophoneStream()} className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold font-mono transition-all duration-200 ${micStatus === 'Live Mic Streaming...' ? 'border border-red-400/40 bg-red-500/10 text-red-200 hover:border-red-300/60 hover:bg-red-500/20' : 'border border-green-200/50 bg-gradient-to-r from-green-300 to-cyan-400 text-[#030712] hover:scale-[1.02]'}`}>
                {micStatus === 'Live Mic Streaming...' ? <><Square size={16} /> Stop Mic</> : <><Play size={16} /> Start Live Mic</>}
              </button>
              <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-cyan-300/25 bg-white-400/[0.05] px-4 py-2.5 text-sm font-bold font-mono text-white-200 transition-all hover:bg-cyan-400/10">
                <FileAudio size={16} /> Upload Audio
                <input type="file" accept="audio/*" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>
          </div>

          <div className="relative grid grid-cols-1 items-center gap-6 rounded-xl border border-cyan-300/10 bg-[#030712]/65 p-5 backdrop-blur-sm xl:grid-cols-[1fr_240px]">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm font-mono">
                <span className="font-semibold uppercase tracking-wider text-slate-400">Active Audio Signal</span>
                <span className="font-black text-cyan-200">{micLevel}% RMS</span>
              </div>
              <div className="flex h-14 items-center gap-1 overflow-hidden rounded-lg border border-cyan-300/10 bg-black/40 px-3 py-2">
                {Array.from({ length: 32 }).map((_, index) => {
                  const wave = 20 + ((index * 17) % 40)
                  const height = micLevel > 0 ? Math.min(100, Math.max(10, micLevel * (0.45 + wave / 100))) : 10
                  return (
                    <div key={index} className={`flex-1 rounded-full transition-all duration-75 ${micLevel > 15 ? 'bg-gradient-to-t from-cyan-400 via-violet-400 to-fuchsia-400 shadow-[0_0_9px_rgba(34,211,238,0.45)]' : 'bg-gradient-to-t from-cyan-500 to-cyan-200'}`} style={{ height: `${height}%` }} />
                  )
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 xl:border-l border-cyan-300/10 xl:pl-5 text-sm font-mono">
              <div><span className="block text-xs font-bold uppercase tracking-widest text-slate-500">Input</span><span className="font-bold text-white">{inputMode === 'mic' ? 'MIC' : 'FILE'}</span></div>
              <div><span className="block text-xs font-bold uppercase tracking-widest text-slate-500">Sample Rate</span><span className="font-bold text-cyan-200">16 kHz</span></div>
              <div><span className="block text-xs font-bold uppercase tracking-widest text-slate-500">Channels</span><span className="font-bold text-white">1 Mono</span></div>
              <div><span className="block text-xs font-bold uppercase tracking-widest text-slate-500">Transport</span><span className="font-bold text-emerald-200">WebSocket</span></div>
            </div>
          </div>

          {inputMode === 'mic' && micStatus === 'Live Mic Streaming...' && (
            <div className="mt-5"><AudioPlaybackBar label="Live Mic Monitor" isPlaying={isLiveMonitoring} level={micLevel} onToggle={toggleLiveMonitor} /></div>
          )}
        </section>

        {/* NEW CIRCULAR ROLLING RISK SCORE PIE CHART */}
        <section className="relative overflow-hidden flex flex-col items-center justify-center rounded-2xl border border-cyan-300/25 bg-[#07111f]/75 p-5 shadow-[0_0_45px_rgba(34,211,238,0.07)] backdrop-blur-xl h-full min-h-[260px]">
          <div className="absolute top-5 left-5 flex items-center gap-3">
            <div className={`flex size-12 items-center justify-center rounded-xl border ${selected.risk_level === 'HIGH' ? 'border-red-300/60 bg-red-400/15 text-red-200 shadow-[0_0_20px_rgba(239,68,68,0.25)] animate-pulse' : 'border-cyan-300/30 bg-cyan-400/[0.08] text-cyan-200'}`}>
              <Gauge size={22} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white leading-tight">Rolling Risk Score</h2>
              <p className="mt-0.5 text-xs font-mono text-slate-400">Live Prediction Window</p>
            </div>
          </div>

          <div className="relative mt-10 flex h-40 w-40 items-center justify-center">
            <svg className="h-full w-full -rotate-90 transform drop-shadow-[0_0_15px_rgba(34,211,238,0.2)]" viewBox="0 0 120 120">
              {/* Background circle track */}
              <circle
                cx="60"
                cy="60"
                r={radius}
                fill="none"
                stroke="rgba(255, 255, 255, 0.05)"
                strokeWidth="10"
              />
              {/* Progress pie line */}
              <circle
                cx="60"
                cy="60"
                r={radius}
                fill="none"
                stroke={selected.risk_level === 'HIGH' ? '#ef4444' : (currentScore > 0.4 ? '#fb923c' : '#22d3ee')}
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-700 ease-out"
              />
            </svg>
            
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-4xl font-black font-mono text-white tracking-tighter">
                {Math.round(currentScore * 100)}<span className="text-lg text-slate-400 ml-1">%</span>
              </span>
              <span className={`mt-2 rounded-md border px-2 py-0.5 text-xs font-black font-mono uppercase tracking-widest ${selected.risk_level === 'HIGH' ? 'border-red-500/40 bg-red-500/20 text-red-200' : (currentScore > 0.4 ? 'border-orange-500/40 bg-orange-500/20 text-orange-200' : 'border-cyan-500/40 bg-cyan-500/20 text-cyan-200')}`}>
                {selected.risk_level || 'LOW'} RISK
              </span>
            </div>
          </div>
        </section>

      </div>

      {/* 3. LIVE GRAPH (Synthetic Voice Probability) */}
      <LiveGraph timeSeries={selected.timeSeries} inputMode={inputMode} selected={selected} activeStreamId={activeStreamId} />

      {/* 4. SUMMARY CARDS */}
      <section className="grid gap-4 sm:grid-cols-3">
        {[
          { label: 'Monitored Channels', value: summary.total, description: 'Backend streams', icon: Radio, iconClass: 'text-cyan-200', glow: 'hover:border-cyan-300/40' },
          { label: 'Need Attention', value: summary.high, description: 'Backend HIGH risk streams', icon: AlertTriangle, iconClass: 'text-red-200', glow: 'hover:border-red-300/40' },
          { label: 'Speech Active', value: summary.active, description: 'Backend VAD state', icon: Volume2, iconClass: 'text-emerald-200', glow: 'hover:border-emerald-300/40' }
        ].map((item) => {
          const Icon = item.icon
          return (
            <div key={item.label} className={`group rounded-2xl border border-white/10 bg-[#07111f]/75 p-6 shadow-[0_0_30px_rgba(0,0,0,0.15)] backdrop-blur-xl transition-all duration-300 ${item.glow}`}>
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-slate-300">{item.label}</p>
                <div className="rounded-lg border border-white/10 bg-white/[0.04] p-2.5"><Icon size={20} className={item.iconClass} /></div>
              </div>
              <p className="mt-4 text-4xl font-black text-white">{item.value}</p>
              <p className="mt-2 text-sm font-mono text-slate-500">{item.description}</p>
            </div>
          )
        })}
      </section>

      {/* 5. AUDIO SPECTROGRAM */}
      <section className="relative overflow-hidden flex flex-col justify-between rounded-2xl border border-violet-400/25 bg-[#07111f]/75 p-6 shadow-[0_0_45px_rgba(139,92,246,0.07)] backdrop-blur-xl h-full min-h-[240px]">
        <div className="pointer-events-none absolute -left-10 -bottom-10 h-40 w-40 rounded-full bg-fuchsia-500/10 blur-3xl" />
        <div className="flex items-center justify-between mb-5 relative z-10">
          <div className="flex items-center gap-3">
            <div className={`flex size-12 items-center justify-center rounded-xl border ${micLevel > 5 ? 'border-violet-300/60 bg-violet-400/15 text-violet-200 shadow-[0_0_20px_rgba(139,92,246,0.25)] animate-pulse' : 'border-violet-300/30 bg-violet-400/[0.08] text-violet-200'}`}>
              <Waves size={22} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white leading-tight">Live Spectrogram</h2>
              <p className="mt-0.5 text-xs font-mono text-slate-400">Time / Freq Analysis</p>
            </div>
          </div>
          <span className="rounded-md border border-violet-300/20 bg-violet-400/[0.07] px-3 py-1.5 text-xs font-bold font-mono uppercase tracking-wider text-violet-200 shadow-[0_0_10px_rgba(139,92,246,0.1)]">
            {micLevel > 0 ? 'Analyzing' : 'Standby'}
          </span>
        </div>

        <div className="flex-1 w-full relative z-10 rounded-xl border border-violet-300/15 bg-black/50 p-2 overflow-hidden flex flex-col justify-between gap-[2px]">
          {Array.from({ length: 10 }).map((_, bandIdx) => (
            <div key={bandIdx} className="w-full flex-1 flex items-center gap-[2px]">
              {Array.from({ length: 72 }).map((_, timeIdx) => { 
                const base = (bandIdx * 13 + timeIdx * 19) % 100;
                const active = micLevel > 0;
                const threshold = active ? (micLevel * (1 + (10 - bandIdx)/10)) : 8;
                const isLit = base < threshold;
                let colorClass = 'bg-violet-500/10';
                if (isLit) {
                  if (bandIdx < 3) colorClass = 'bg-fuchsia-400 shadow-[0_0_8px_rgba(232,121,249,0.5)]';
                  else if (bandIdx < 7) colorClass = 'bg-violet-400 shadow-[0_0_8px_rgba(167,139,250,0.5)]';
                  else colorClass = 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.5)]';
                }
                return <div key={timeIdx} className={`h-full flex-1 rounded-[1px] transition-all duration-100 ${colorClass}`} style={{ opacity: isLit ? Math.min(1, 0.4 + threshold/100) : 0.2 }} />
              })}
            </div>
          ))}
        </div>
        <div className="mt-4 relative z-10 flex items-center justify-between text-xs font-mono font-bold uppercase tracking-widest text-slate-500">
          <span>0 kHz</span><span>8 kHz</span>
        </div>
      </section>

      {/* 6. SECURITY CONTEXT */}
      <section className="relative overflow-hidden rounded-2xl border border-cyan-300/20 bg-[#07111f]/75 p-6 shadow-[0_0_40px_rgba(34,211,238,0.05)] backdrop-blur-xl">
        <div className="pointer-events-none absolute right-0 top-0 h-52 w-52 rounded-full bg-violet-500/12 blur-3xl" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <p className="text-xs font-bold font-mono uppercase tracking-widest text-cyan-200">Security Context</p>
              <span className="rounded-full border border-violet-300/25 bg-violet-400/10 px-2.5 py-0.5 text-xs font-bold font-mono uppercase tracking-wider text-violet-200">Demo · Simulated</span>
            </div>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">Select the security scenario before voice analysis. Audio remains the live detector input; this context simulates the transaction or access workflow used by the risk engine.</p>
          </div>
          <button type="button" onClick={configureSecurityContext} disabled={contextConfigured || isLiveMonitoring || securityTerminated} className="rounded-xl border border-cyan-300/35 bg-cyan-400/[0.08] px-5 py-3 text-sm font-bold font-mono uppercase tracking-widest text-cyan-200 transition-all hover:bg-cyan-400/15 disabled:opacity-40">
            {contextConfigured ? 'Context Applied' : 'Apply Security Context'}
          </button>
        </div>
        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-xs font-bold font-mono uppercase tracking-widest text-slate-500">Security Scenario</label>
            <select value={selectedScenario} onChange={(e) => setSelectedScenario(e.target.value)} disabled={contextConfigured || isLiveMonitoring || securityTerminated} className="w-full rounded-xl border border-cyan-300/15 bg-[#030712]/70 px-4 py-3 text-sm font-mono text-white outline-none disabled:opacity-50">
              <option value="high_value_transaction">High-Value Transaction</option>
              <option value="privileged_access">Privileged Access</option>
              <option value="routine_support">Routine Support</option>
            </select>
          </div>
          <div>
            <label className="mb-2 block text-xs font-bold font-mono uppercase tracking-widest text-slate-500">Transaction Amount · INR</label>
            <div className="flex items-center rounded-xl border border-cyan-300/15 bg-[#030712]/70 px-4 focus-within:border-cyan-300/50">
              <span className="mr-3 text-base font-black font-mono text-cyan-200">₹</span>
              <input type="number" min="0" step="1000" value={transactionAmountInr} onChange={(e) => setTransactionAmountInr(e.target.value)} disabled={selectedScenario !== 'high_value_transaction' || contextConfigured || isLiveMonitoring || securityTerminated} placeholder="e.g. 525000" className="w-full bg-transparent py-3 text-sm font-mono text-white outline-none placeholder:text-slate-600 disabled:opacity-50" />
            </div>
          </div>
        </div>
      </section>

      {/* 7. SECURITY RESPONSE */}
      {selected.notification_triggered && (
        <section className="relative overflow-hidden rounded-2xl border border-red-400/50 bg-gradient-to-br from-red-500/[0.15] via-red-500/[0.06] to-transparent p-6 shadow-[0_0_55px_rgba(239,68,68,0.12)]">
          <div className="pointer-events-none absolute inset-y-0 left-0 w-2 bg-gradient-to-b from-red-300 via-red-500 to-orange-400" />
          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-red-500/15 blur-3xl" />
          <div className="relative flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div className="flex items-start gap-4">
              <div className="mt-1 flex size-12 shrink-0 items-center justify-center rounded-xl border border-red-300/35 bg-red-400/10"><ShieldAlert size={26} className="animate-pulse text-red-200" /></div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <p className="text-xs font-black font-mono uppercase tracking-[0.16em] text-red-200">SIH SECURITY RESPONSE</p>
                  <span className="rounded-md border border-red-300/35 bg-red-400/10 px-2.5 py-0.5 text-xs font-black font-mono text-red-200">{selected.notification_severity || 'HIGH'}</span>
                </div>
                <h2 className="mt-2 text-xl font-bold text-white">{selected.notification_title || 'Voice Impersonation Alert'}</h2>
                {selected.notification_message && <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-200">{selected.notification_message}</p>}
              </div>
            </div>
            <div className="shrink-0 rounded-lg border border-red-300/15 bg-black/30 px-4 py-3 text-xs font-mono text-slate-400">
              <div>Scenario: <span className="font-bold text-white">{selected.notification_scenario || 'routine_support'}</span></div>
              <div className="mt-1.5">Privacy: <span className="font-bold text-cyan-200">{selected.privacy_mode || 'feature_only'}</span></div>
            </div>
          </div>
          
          <div className="relative mt-6 border-t border-red-300/15 pt-5">
            <p className="mb-4 text-xs font-bold font-mono uppercase tracking-widest text-slate-400">Detection Policy</p>
            <div className="grid gap-3 md:grid-cols-3">
              {[
                { label: 'AI Threshold', value: typeof selected.notification_threshold === 'number' ? `${(selected.notification_threshold * 100).toFixed(0)}%` : '—' },
                { label: 'Required Persistence', value: `${selected.notification_required_consecutive_flags || '—'} windows` },
                { label: 'Current Risk', value: typeof selected.rolling_score === 'number' ? `${(selected.rolling_score * 100).toFixed(1)}%` : '—' }
              ].map(item => (
                <div key={item.label} className="rounded-xl border border-red-300/10 bg-[#030712]/55 px-4 py-4">
                  <p className="text-xs font-bold font-mono uppercase tracking-widest text-slate-500">{item.label}</p>
                  <p className="mt-1.5 text-base font-black text-white">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 8. STREAMS + TELEMETRY */}
      <section className="grid gap-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.5fr)]">
        <div className="relative space-y-4 overflow-hidden rounded-2xl border border-white/10 bg-[#07111f]/75 p-6 shadow-[0_0_35px_rgba(0,0,0,0.15)] backdrop-blur-xl">
          <div className="relative flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">Your Conversations</h2>
              <p className="mt-1 text-sm text-slate-400">Select a backend stream to inspect</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/[0.04] p-2.5"><Settings2 size={20} className="text-slate-400" /></div>
          </div>
          <div className="relative space-y-3">
            {Object.keys(streams).map((id) => {
              const stream = streams[id]
              return (
                <button key={id} onClick={() => setActiveStreamId(id)} className={`group/stream relative w-full overflow-hidden rounded-xl border p-5 text-left transition-all duration-300 ${activeStreamId === id ? 'border-cyan-300/50 bg-gradient-to-r from-cyan-400/[0.12] via-violet-500/[0.08] to-transparent shadow-[0_0_28px_rgba(34,211,238,0.09)]' : 'border-white/10 bg-white/[0.02] hover:border-cyan-300/25 hover:bg-white/[0.04]'}`}>
                  {activeStreamId === id && <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-cyan-300 via-violet-400 to-fuchsia-400" />}
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-base font-bold text-white">{stream.name || id}</p>
                      <p className="mt-1.5 font-mono text-sm text-slate-500">{id}</p>
                    </div>
                    <StatusPill status={stream.risk_level} />
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        <div className="relative space-y-6 overflow-hidden rounded-2xl border border-white/10 bg-[#07111f]/75 p-6 shadow-[0_0_35px_rgba(0,0,0,0.15)] backdrop-blur-xl md:p-8">
          <div className="relative flex flex-col gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-bold text-white">{selected.name || activeStreamId}</h2>
                <StatusPill status={selected.risk_level} />
              </div>
              <p className="mt-1.5 text-sm text-slate-400">Backend-generated RiskResult telemetry</p>
            </div>
            <span className="rounded-lg border border-cyan-300/25 bg-cyan-400/[0.07] px-3 py-1.5 font-mono text-sm font-bold text-cyan-200">{activeStreamId}</span>
          </div>

          <div className="relative grid gap-5 sm:grid-cols-2">
            <div className="rounded-xl border border-cyan-300/15 bg-[#030712]/60 p-6 transition hover:border-cyan-300/30">
              <div className="flex items-center gap-2.5 text-sm font-bold text-slate-300"><Gauge size={20} className="text-cyan-200" /> Rolling Risk Score</div>
              <p className="mt-4 text-5xl font-black font-mono text-white">{formatScore(selected.rolling_score, 3)}</p>
            </div>
            <div className="rounded-xl border border-violet-300/15 bg-[#030712]/60 p-6 transition hover:border-violet-300/30">
              <div className="flex items-center gap-2.5 text-sm font-bold text-slate-300"><Waves size={20} className="text-violet-200" /> Feature Latency</div>
              <p className="mt-4 text-2xl font-black font-mono text-white">{selected.feature_latency_ms !== undefined ? `${selected.feature_latency_ms} ms` : '--'}</p>
            </div>
          </div>

          {showInspector && (
            <div className="relative overflow-x-auto rounded-xl border border-cyan-300/30 bg-black/50 p-5 font-mono text-sm text-cyan-200 shadow-[0_0_30px_rgba(34,211,238,0.08)]">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Backend RiskResult Payload</span>
                <span className="rounded-md border border-cyan-300/20 bg-cyan-400/10 px-2.5 py-1 text-xs font-bold text-cyan-200">JSON</span>
              </div>
              <pre>{JSON.stringify(selected, null, 2)}</pre>
            </div>
          )}
        </div>
      </section>

      {/* 9. NOTIFICATIONS FEED */}
      <section className="group relative overflow-hidden rounded-2xl border border-cyan-300/30 bg-[#07111f]/80 p-5 shadow-[0_0_45px_rgba(34,211,238,0.08)] backdrop-blur-xl mt-8">
        <div className="pointer-events-none absolute -right-24 -top-28 h-72 w-72 rounded-full bg-violet-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 left-1/3 h-56 w-56 rounded-full bg-cyan-400/12 blur-3xl" />
        
        <div className="relative mb-5 flex items-center justify-between border-b border-cyan-300/15 pb-4">
          <div className="flex items-center gap-3 text-sm font-bold font-mono uppercase tracking-wider">
            <div className="flex size-8 items-center justify-center rounded-lg border border-cyan-300/30 bg-cyan-300/10 shadow-[0_0_18px_rgba(34,211,238,0.15)]">
              <Bell size={18} className="animate-pulse text-cyan-200" />
            </div>
            <span className="bg-gradient-to-r from-cyan-200 via-violet-200 to-fuchsia-200 bg-clip-text text-transparent">
              Live Security Notifications & Telemetry Feed
            </span>
          </div>
          <span className="rounded-md border border-cyan-300/40 bg-cyan-300/10 px-3 py-1.5 text-xs font-bold font-mono tracking-wider text-cyan-200 shadow-[0_0_18px_rgba(34,211,238,0.08)]">
            ● SEC-OPS ACTIVE
          </span>
        </div>

        <div className="relative grid grid-cols-1 gap-4 md:grid-cols-2">
          {securityNotifications.map((notif) => (
            <div key={notif.id} className={`group/notif relative flex items-start gap-4 overflow-hidden rounded-xl border p-5 backdrop-blur-sm transition-all duration-300 ${notif.type === 'danger' ? 'border-red-400/45 bg-gradient-to-r from-red-500/[0.14] via-red-500/[0.06] to-transparent text-red-200' : notif.type === 'success' ? 'border-emerald-400/40 bg-gradient-to-r from-emerald-400/[0.12] via-emerald-400/[0.04] to-transparent text-emerald-200' : 'border-cyan-400/30 bg-gradient-to-r from-cyan-400/[0.10] via-violet-400/[0.04] to-transparent text-slate-200'}`}>
              <div className="mt-0.5 shrink-0">
                {notif.type === 'danger' ? (
                  <div className="flex size-10 items-center justify-center rounded-lg border border-red-300/30 bg-red-400/10"><ShieldAlert size={20} className="animate-pulse text-red-200" /></div>
                ) : notif.type === 'success' ? (
                  <div className="flex size-10 items-center justify-center rounded-lg border border-emerald-300/30 bg-emerald-400/10"><CheckCircle2 size={20} className="text-emerald-200" /></div>
                ) : (
                  <div className="flex size-10 items-center justify-center rounded-lg border border-cyan-300/30 bg-cyan-400/10"><Radio size={20} className="animate-pulse text-cyan-200" /></div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-base font-bold tracking-tight text-white">{notif.title}</p>
                  <span className="shrink-0 text-xs font-bold font-mono uppercase tracking-wide text-slate-400">{notif.time}</span>
                </div>
                <p className="mt-2 truncate text-sm font-mono leading-relaxed text-slate-300">{notif.message}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

    </div>
  )
}