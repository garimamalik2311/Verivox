'use client'

import { Mic, RadioTower, Play, Square, FileAudio, AlertTriangle, X, Radio, Volume2, Settings2, Gauge, Waves, Bell, ShieldAlert, CheckCircle2 } from 'lucide-react'
import AudioPlaybackBar from '../components/AudioPlaybackBar'
import StatusPill from '../components/StatusPill'
import LiveGraph from '../components/LiveGraph'
import { formatScore } from '../utils/helpers'

export default function Overview({
  micStatus, inputMode, micLevel, isLiveMonitoring, selected, activeStreamId,
  securityTerminated, showInspector, summary, streams,
  startMicrophoneStream, stopMicrophoneStream, toggleLiveMonitor, handleFileUpload,
  acknowledgeAlert, setActiveStreamId
}) {
  // Generate dynamic security notification items based on current stream states
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
      message: securityTerminated ? 'Active file stream frozen due to security policy enforcement.' : 'All 58-dimensional feature extractors operating within normal parameters.',
      time: 'Real-time'
    }
  ]

  return (
    <div className="space-y-8">
      
      {/* =====================================================
          SECURITY NOTIFICATION BANNER / FEED
         ===================================================== */}
      <section className="rounded-2xl border border-verivox-cyan/20 bg-verivox-dark p-4 shadow-xl">
        <div className="flex items-center justify-between mb-3 border-b border-verivox-border pb-2.5">
          <div className="flex items-center gap-2 text-xs font-bold text-verivox-yellow font-mono uppercase tracking-wider">
            <Bell size={15} className="animate-bounce" />
            <span>Live Security Notifications & Telemetry Feed</span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-verivox-cyan/10 border border-verivox-cyan/30 text-verivox-cyan">
            SEC-OPS ACTIVE
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {securityNotifications.map((notif) => (
            <div 
              key={notif.id} 
              className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${
                notif.type === 'danger' 
                  ? 'border-verivox-pink/40 bg-verivox-pink/10 text-verivox-pink' 
                  : notif.type === 'success'
                  ? 'border-verivox-cyan/30 bg-verivox-cyan/10 text-verivox-cyan'
                  : 'border-verivox-border bg-verivox-cardHover text-slate-300'
              }`}
            >
              <div className="mt-0.5 shrink-0">
                {notif.type === 'danger' ? (
                  <ShieldAlert size={16} className="text-verivox-pink animate-pulse" />
                ) : (
                  <CheckCircle2 size={16} className="text-verivox-cyan" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold tracking-tight text-white">{notif.title}</p>
                  <span className="text-[10px] font-mono opacity-60">{notif.time}</span>
                </div>
                <p className="text-[11px] opacity-80 mt-0.5 font-mono truncate">{notif.message}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Hero Section */}
      {/* Hero Section */}
      <section className="max-w-3xl">
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-verivox-yellow font-mono">Live protection</p>
        <h1 className="text-3xl font-black tracking-tight text-white md:text-4xl">Keep every conversation trustworthy.</h1>
        <p className="mt-3 max-w-2xl leading-7 text-slate-400 text-sm">
          VeriVox receives live audio, processes rolling windows through the backend inference pipeline, and displays the resulting synthetic-voice risk telemetry in real time.
        </p>
      </section>

      {/* Voice Ingestion Box */}
      <section className="rounded-2xl border border-verivox-cyan/30 bg-verivox-dark p-5 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
          <RadioTower size={120} className="text-verivox-cyan" />
        </div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
          <div className="flex items-center gap-3">
            <div className={`size-10 rounded-xl flex items-center justify-center border ${
                micStatus === 'Live Mic Streaming...'
                  ? 'bg-verivox-cyan/20 text-verivox-cyan border-verivox-cyan/40 animate-pulse'
                  : 'bg-verivox-cyan/10 text-verivox-cyan border-verivox-cyan/20'
              }`}>
              <Mic size={20} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                Live Voice Ingestion
                <span className="text-[10px] px-2 py-0.5 rounded-full font-mono uppercase bg-verivox-cardHover text-slate-300">
                  {micStatus}
                </span>
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                16kHz Mono PCM • Backend VAD • 58-D Feature Extractor
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => micStatus === 'Live Mic Streaming...' ? stopMicrophoneStream() : startMicrophoneStream()}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold font-mono transition ${
                micStatus === 'Live Mic Streaming...'
                  ? 'bg-verivox-pink/20 text-verivox-pink border border-verivox-pink/40'
                  : 'bg-verivox-cyan text-verivox-darkest hover:bg-verivox-cyan/80'
              }`}
            >
              {micStatus === 'Live Mic Streaming...' ? (<><Square size={14} /> Stop Mic</>) : (<><Play size={14} /> Start Live Mic</>)}
            </button>
            <label className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold font-mono bg-verivox-cardHover text-verivox-cyan border border-verivox-cyan/30 hover:bg-verivox-border cursor-pointer transition">
              <FileAudio size={14} />
              Upload Audio
              <input type="file" accept="audio/*" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_280px] gap-6 items-center bg-verivox-darkest p-4 rounded-xl border border-verivox-border">
          <div className="space-y-2">
            <div className="flex justify-between items-center text-[11px] font-mono text-slate-400">
              <span>Active Audio Signal</span>
              <span className="text-verivox-cyan">{micLevel}% RMS</span>
            </div>
            <div className="flex items-center gap-1 h-12 bg-black/40 px-3 py-2 rounded-lg border border-verivox-border overflow-hidden">
              {Array.from({ length: 32 }).map((_, index) => {
                const wave = 20 + ((index * 17) % 40)
                const height = micLevel > 0 ? Math.min(100, Math.max(10, micLevel * (0.45 + wave / 100))) : 10
                return (
                  <div key={index} className={`flex-1 rounded-full transition-all duration-75 ${micLevel > 15 ? 'bg-verivox-pink' : 'bg-verivox-cyan'}`} style={{ height: `${height}%` }} />
                )
              })}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs font-mono border-l border-verivox-border pl-4">
            <div><span className="text-slate-500 block text-[10px]">INPUT</span><span className="text-white font-bold">{inputMode === 'mic' ? 'MIC' : 'FILE'}</span></div>
            <div><span className="text-slate-500 block text-[10px]">SAMPLE RATE</span><span className="text-verivox-cyan font-bold">16 kHz</span></div>
            <div><span className="text-slate-500 block text-[10px]">CHANNELS</span><span className="text-white font-bold">1 Mono</span></div>
            <div><span className="text-slate-500 block text-[10px]">TRANSPORT</span><span className="text-verivox-cyan font-bold">WebSocket</span></div>
          </div>
        </div>
        {inputMode === 'mic' && micStatus === 'Live Mic Streaming...' && (
          <div className="mt-4">
            <AudioPlaybackBar label="Live Mic Monitor" isPlaying={isLiveMonitoring} level={micLevel} onToggle={toggleLiveMonitor} />
          </div>
        )}
      </section>

      {selected.alert_triggered && (
        <section className="flex flex-col gap-4 rounded-2xl border border-verivox-pink/50 bg-verivox-pink/10 p-5 md:flex-row md:items-center md:justify-between shadow-xl">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 text-verivox-pink"><AlertTriangle size={23} /></div>
            <div>
              <h2 className="font-bold text-white text-sm">Synthetic Voice Clone Detected</h2>
              <p className="mt-1 text-xs leading-5 text-slate-300 font-mono">
                {selected.alert_reason === 'persistent_high_ai_probability'
                  ? `High synthetic-voice probability detected across ${selected.alert_consecutive_flags || selected.consecutive_flags || 3} consecutive audio windows.`
                  : selected.alert_reason || 'Backend Risk Engine has triggered an alert for this stream.'}
              </p>
            </div>
          </div>
          <button onClick={acknowledgeAlert} className="flex shrink-0 items-center gap-2 text-xs font-bold text-verivox-pink hover:text-white bg-verivox-pink/20 px-3 py-1.5 rounded-lg border border-verivox-pink/40 transition">
            <X size={14} /> Acknowledge Alert
          </button>
        </section>
      )}

      {selected.notification_triggered && (
        <section className="rounded-2xl border border-verivox-pink/50 bg-verivox-pink/10 p-5 shadow-xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 shrink-0 text-verivox-pink">
                <ShieldAlert size={22} className="animate-pulse" />
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[10px] font-mono font-bold uppercase tracking-[0.16em] text-verivox-pink">
                    SIH SECURITY RESPONSE
                  </p>

                  <span className="rounded-md border border-verivox-pink/40 bg-verivox-pink/10 px-2 py-0.5 text-[10px] font-mono font-bold text-verivox-pink">
                    {selected.notification_severity || 'HIGH'}
                  </span>
                </div>

                <h2 className="mt-2 text-base font-bold text-white">
                  {selected.notification_title || 'Voice Impersonation Alert'}
                </h2>

                {selected.notification_message && (
                  <p className="mt-2 max-w-3xl text-xs leading-5 text-slate-300">
                    {selected.notification_message}
                  </p>
                )}
              </div>
            </div>

            <div className="shrink-0 rounded-lg border border-verivox-border bg-black/30 px-3 py-2 text-[10px] font-mono text-slate-400">
              <div>
                Scenario:{' '}
                <span className="text-white">
                  {selected.notification_scenario || 'routine_support'}
                </span>
              </div>
              <div className="mt-1">
                Privacy:{' '}
                <span className="text-verivox-cyan">
                  {selected.privacy_mode || 'feature_only'}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-5 border-t border-verivox-pink/20 pt-4">
            <p className="mb-3 text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400">
              Detection Policy
            </p>

            <div className="grid gap-2 md:grid-cols-3">
              <div className="rounded-xl border border-verivox-border bg-verivox-darkest/70 px-3 py-3">
                <p className="text-[10px] font-mono uppercase text-slate-500">
                  AI Threshold
                </p>
                <p className="mt-1 text-sm font-bold text-white">
                  {typeof selected.notification_threshold === 'number'
                    ? `${(selected.notification_threshold * 100).toFixed(0)}%`
                    : '—'}
                </p>
              </div>

              <div className="rounded-xl border border-verivox-border bg-verivox-darkest/70 px-3 py-3">
                <p className="text-[10px] font-mono uppercase text-slate-500">
                  Required Persistence
                </p>
                <p className="mt-1 text-sm font-bold text-white">
                  {selected.notification_required_consecutive_flags || '—'} windows
                </p>
              </div>

              <div className="rounded-xl border border-verivox-border bg-verivox-darkest/70 px-3 py-3">
                <p className="text-[10px] font-mono uppercase text-slate-500">
                  Current Risk
                </p>
                <p className="mt-1 text-sm font-bold text-white">
                  {typeof selected.rolling_score === 'number'
                    ? `${(selected.rolling_score * 100).toFixed(1)}%`
                    : '—'}
                </p>
              </div>
            </div>
          </div>

          {Array.isArray(selected.recommended_actions) &&
            selected.recommended_actions.length > 0 && (
              <div className="mt-5 border-t border-verivox-pink/20 pt-4">
                <p className="mb-3 text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400">
                  Recommended Response Actions
                </p>

                <div className="grid gap-2 md:grid-cols-2">
                  {selected.recommended_actions.map((action, index) => (
                    <div
                      key={`${action}-${index}`}
                      className="flex items-start gap-3 rounded-xl border border-verivox-border bg-verivox-darkest/70 px-3 py-3"
                    >
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-verivox-pink/15 text-[10px] font-mono font-bold text-verivox-pink">
                        {index + 1}
                      </span>

                      <span className="text-xs leading-5 text-slate-200">
                        {action}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          {Array.isArray(selected.dispatch_channels) &&
            selected.dispatch_channels.length > 0 && (
              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-verivox-pink/20 pt-4">
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500">
                  Dispatch Channels
                </span>

                {selected.dispatch_channels.map((channel) => (
                  <span
                    key={channel}
                    className="rounded-md border border-verivox-cyan/25 bg-verivox-cyan/10 px-2 py-1 text-[10px] font-mono text-verivox-cyan"
                  >
                    {channel}
                  </span>
                ))}
              </div>
            )}
        </section>
      )}

      <LiveGraph timeSeries={selected.timeSeries} inputMode={inputMode} selected={selected} activeStreamId={activeStreamId} />

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-verivox-border bg-verivox-dark p-5 shadow-xl">
          <div className="flex items-center justify-between"><p className="text-xs font-semibold text-slate-400">Monitored Channels</p><Radio size={18} className="text-verivox-cyan" /></div>
          <p className="mt-4 text-3xl font-black text-white">{summary.total}</p>
          <p className="mt-1 text-xs text-slate-500 font-mono">Backend streams</p>
        </div>
        <div className="rounded-2xl border border-verivox-border bg-verivox-dark p-5 shadow-xl">
          <div className="flex items-center justify-between"><p className="text-xs font-semibold text-slate-400">Need Attention</p><AlertTriangle size={18} className="text-verivox-pink" /></div>
          <p className="mt-4 text-3xl font-black text-white">{summary.high}</p>
          <p className="mt-1 text-xs text-slate-500 font-mono">Backend HIGH risk streams</p>
        </div>
        <div className="rounded-2xl border border-verivox-border bg-verivox-dark p-5 shadow-xl">
          <div className="flex items-center justify-between"><p className="text-xs font-semibold text-slate-400">Speech Active</p><Volume2 size={18} className="text-verivox-cyan" /></div>
          <p className="mt-4 text-3xl font-black text-white">{summary.active}</p>
          <p className="mt-1 text-xs text-slate-500 font-mono">Backend VAD state</p>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.5fr)]">
        <div className="space-y-4 rounded-2xl border border-verivox-border bg-verivox-dark p-5 shadow-xl">
          <div className="flex items-center justify-between">
            <div><h2 className="font-bold text-sm text-white">Your Conversations</h2><p className="mt-0.5 text-xs text-slate-400">Select a backend stream to inspect</p></div>
            <Settings2 size={18} className="text-slate-500" />
          </div>
          <div className="space-y-2">
            {Object.keys(streams).map((id) => {
              const stream = streams[id]
              return (
                <button key={id} onClick={() => setActiveStreamId(id)} className={`w-full rounded-xl border p-4 text-left transition ${activeStreamId === id ? 'border-verivox-cyan/60 bg-verivox-cyan/10' : 'border-verivox-border bg-verivox-cardHover/60 hover:border-slate-700 hover:bg-verivox-cardHover'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-sm text-white">{stream.name || id}</p>
                      <p className="mt-1 font-mono text-[11px] text-slate-400">{id}</p>
                    </div>
                    <StatusPill status={stream.risk_level} />
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                    <span>{stream.speech_detected === true ? 'Speech active' : stream.speech_detected === false ? 'Silence' : 'Waiting for backend'}</span>
                    <span className="font-mono text-verivox-cyan font-semibold">Score {formatScore(stream.rolling_score, 2)}</span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        <div className="space-y-6 rounded-2xl border border-verivox-border bg-verivox-dark p-5 shadow-xl md:p-6">
          <div className="flex flex-col gap-3 border-b border-verivox-border pb-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="font-bold text-base text-white">{selected.name || activeStreamId}</h2>
                <StatusPill status={selected.risk_level} />
              </div>
              <p className="mt-1 text-xs text-slate-400">Backend-generated RiskResult telemetry</p>
            </div>
            <span className="font-mono text-xs text-verivox-cyan bg-verivox-cyan/10 border border-verivox-cyan/30 px-2.5 py-1 rounded-lg">{activeStreamId}</span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-verivox-border bg-verivox-cardHover p-5">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-400"><Gauge size={16} className="text-verivox-cyan" /> Rolling Risk Score</div>
              <p className="mt-3 text-4xl font-black font-mono text-white">{formatScore(selected.rolling_score, 3)}</p>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-verivox-border">
                <div className="h-full rounded-full transition-all duration-500 bg-verivox-cyan" style={{ width: selected.rolling_score !== undefined && selected.rolling_score !== null ? `${Math.min(Math.max(Number(selected.rolling_score) * 100, 0), 100)}%` : '0%' }} />
              </div>
              <p className="mt-3 text-[11px] leading-5 text-slate-400">Displayed directly from the backend rolling risk engine.</p>
            </div>
            <div className="rounded-xl border border-verivox-border bg-verivox-cardHover p-5">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-400"><Waves size={16} className="text-verivox-cyan" /> Feature Latency</div>
              <p className="mt-3 text-xl font-bold font-mono text-white">{selected.feature_latency_ms !== undefined ? `${selected.feature_latency_ms} ms` : '--'}</p>
              <p className="mt-2 text-xs leading-5 text-slate-400">58-dimensional feature vector processed by the backend pipeline.</p>
            </div>
          </div>

          {showInspector && (
            <div className="bg-black p-4 rounded-xl border border-verivox-cyan/40 font-mono text-xs text-verivox-cyan overflow-x-auto shadow-2xl">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Backend RiskResult Payload</span>
                <span className="text-[10px] text-verivox-cyan">JSON</span>
              </div>
              <pre>{JSON.stringify(selected, null, 2)}</pre>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}