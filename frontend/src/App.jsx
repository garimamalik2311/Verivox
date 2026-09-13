'use client'

import { useMemo, useState, useEffect, useRef } from 'react'
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  CircleHelp,
  Gauge,
  History,
  LayoutDashboard,
  Mic,
  Radio,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Volume2,
  Waves,
  X,
} from 'lucide-react'

const initialStreams = {
  'call_001': {
    stream_id: 'call_001',
    name: 'Support call',
    rolling_score: 0.79,
    consecutive_flags: 3,
    risk_level: 'HIGH',
    alert_triggered: true,
    alert_reason: 'Consecutive high-probability synthetic signatures detected',
    speech_detected: true,
    ai_probability: 0.87,
    model_version: 'xgb_v1',
    feature_latency_ms: 3.8,
    lastSeen: 'Just now',
    call_duration: '00:01:12',
    timeSeries: [
      { time: '0s', prob: 5 },
      { time: '10s', prob: 18 },
      { time: '20s', prob: 22 },
      { time: '30s', prob: 48 },
      { time: '40s', prob: 78 },
      { time: '50s', prob: 75 },
      { time: '60s', prob: 87 },
    ]
  },
  'call_002': {
    stream_id: 'call_002',
    name: 'Sales call',
    rolling_score: 0.18,
    consecutive_flags: 0,
    risk_level: 'LOW',
    alert_triggered: false,
    alert_reason: null,
    speech_detected: true,
    ai_probability: 0.12,
    model_version: 'xgb_v1',
    feature_latency_ms: 4.1,
    lastSeen: '12 sec ago',
    call_duration: '00:00:45',
    timeSeries: [
      { time: '0s', prob: 10 },
      { time: '10s', prob: 15 },
      { time: '20s', prob: 12 },
      { time: '30s', prob: 18 },
      { time: '40s', prob: 12 },
    ]
  },
  'call_003': {
    stream_id: 'call_003',
    name: 'Team meeting',
    rolling_score: 0.52,
    consecutive_flags: 1,
    risk_level: 'MEDIUM',
    alert_triggered: false,
    alert_reason: null,
    speech_detected: false,
    ai_probability: null,
    model_version: 'xgb_v1',
    feature_latency_ms: 3.5,
    lastSeen: '28 sec ago',
    call_duration: '00:02:10',
    timeSeries: [
      { time: '0s', prob: 30 },
      { time: '30s', prob: 45 },
      { time: '60s', prob: 52 },
    ]
  }
}

const initialHistories = {
  'call_001': [
    { window_id: 42, timestamp: '18:55:40', speech_detected: true, ai_probability: 0.87, rolling_score: 0.79, risk_level: 'HIGH' },
    { window_id: 41, timestamp: '18:55:39.5', speech_detected: true, ai_probability: 0.91, rolling_score: 0.74, risk_level: 'HIGH' },
  ],
  'call_002': [
    { window_id: 104, timestamp: '18:55:40', speech_detected: true, ai_probability: 0.12, rolling_score: 0.18, risk_level: 'LOW' },
  ],
  'call_003': [
    { window_id: 12, timestamp: '18:55:40', speech_detected: false, ai_probability: null, rolling_score: 0.52, risk_level: 'MEDIUM' },
  ]
}

function StatusPill({ status }) {
  const normalizedStatus = status ? status.toLowerCase() : 'low'
  const styles = {
    high: 'border-rose-400/30 bg-rose-400/10 text-rose-300',
    medium: 'border-amber-400/30 bg-amber-400/10 text-amber-300',
    low: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300',
    clear: 'border-slate-700 bg-slate-800/60 text-slate-300',
  }
  return <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold uppercase ${styles[normalizedStatus] || styles.low}`}>{status}</span>
}

export default function App() {
  const [activePage, setActivePage] = useState('overview')
  const [streams, setStreams] = useState(initialStreams)
  const [streamHistories, setStreamHistories] = useState(initialHistories)
  const [activeStreamId, setActiveStreamId] = useState('call_001')
  const [speechDetected, setSpeechDetected] = useState(true)
  const [probability, setProbability] = useState(0.87)
  const [windowId, setWindowId] = useState(43)
  const [isConnected, setIsConnected] = useState(false)
  const [showInspector, setShowInspector] = useState(false)
  const wsRef = useRef(null)

  const selected = streams[activeStreamId] || streams['call_001']
  const currentHistory = streamHistories[activeStreamId] || []

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:8000/ws')
    wsRef.current = ws

    ws.onopen = () => setIsConnected(true)
    ws.onclose = () => setIsConnected(false)
    ws.onerror = () => setIsConnected(false)
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.stream_id) {
          const streamId = data.stream_id
          setStreams((prev) => {
            const existing = prev[streamId] || {}
            const newProb = data.ai_probability ?? existing.ai_probability ?? 0.5
            const newTsEntry = { time: `${(existing.timeSeries?.length || 0) * 10}s`, prob: Math.round(newProb * 100) }
            return {
              ...prev,
              [streamId]: { 
                ...existing, 
                ...data, 
                name: existing.name || streamId,
                timeSeries: [...(existing.timeSeries || []), newTsEntry]
              }
            }
          })
          setStreamHistories((prev) => {
            const currentHistory = prev[streamId] || []
            const newEntry = {
              window_id: data.window_id || windowId,
              timestamp: new Date().toLocaleTimeString(),
              speech_detected: data.speech_detected ?? true,
              ai_probability: data.ai_probability,
              rolling_score: data.rolling_score,
              risk_level: data.risk_level || 'LOW'
            }
            return {
              ...prev,
              [streamId]: [newEntry, ...currentHistory].slice(0, 10)
            }
          })
        }
      } catch (err) {
        console.error("Failed to parse incoming WebSocket message", err)
      }
    }

    return () => {
      ws.close()
    }
  }, [windowId])

  const summary = useMemo(() => {
    const streamList = Object.values(streams)
    return {
      high: streamList.filter((s) => s.risk_level === 'HIGH' || s.status === 'High').length,
      active: streamList.filter((s) => s.speech_detected ?? s.speech).length,
      average: streamList.reduce((sum, s) => sum + (s.rolling_score ?? s.score ?? 0), 0) / streamList.length,
    }
  }, [streams])

  function sendPrediction() {
    const payload = {
      schema_version: '1.0',
      stream_id: activeStreamId,
      window_id: windowId,
      timestamp: Date.now() / 1000,
      speech_detected: speechDetected,
      ai_probability: speechDetected ? Number(probability) : null,
      model_version: 'xgb_v1',
      feature_latency_ms: (Math.random() * 1.5 + 3.0).toFixed(2),
      vector_dim: 30
    }

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(payload))
    }

    setStreams((prev) => {
      const current = prev[activeStreamId] || {}
      const newProb = speechDetected ? Number(probability) : (current.ai_probability || 0.1)
      const currentScore = current.rolling_score ?? current.score ?? 0.2
      const newRolling = Number((currentScore * 0.7 + newProb * 0.3).toFixed(3))
      const risk = newRolling > 0.7 ? 'HIGH' : newRolling > 0.4 ? 'MEDIUM' : 'LOW'
      const alertActive = risk === 'HIGH'
      const updatedTimeSeries = [
        ...(current.timeSeries || []),
        { time: `${((current.timeSeries?.length || 0) + 1) * 5}s`, prob: Math.round(newProb * 100) }
      ]

      return {
        ...prev,
        [activeStreamId]: {
          ...current,
          stream_id: activeStreamId,
          window_id: windowId,
          ai_probability: speechDetected ? newProb : null,
          rolling_score: newRolling,
          score: newRolling,
          consecutive_flags: risk === 'HIGH' ? (current.consecutive_flags || 0) + 1 : 0,
          risk_level: risk,
          status: risk === 'HIGH' ? 'High' : risk === 'MEDIUM' ? 'Medium' : 'Low',
          alert_triggered: alertActive,
          alert_reason: alertActive ? `Rolling threshold crossed (${newRolling} > 0.70) at Win #${windowId}` : null,
          speech_detected: speechDetected,
          speech: speechDetected,
          lastSeen: 'Just now',
          timeSeries: updatedTimeSeries
        }
      }
    })

    setStreamHistories((prev) => {
      const currentHistory = prev[activeStreamId] || []
      const newEntry = {
        window_id: windowId,
        timestamp: new Date().toLocaleTimeString(),
        speech_detected: speechDetected,
        ai_probability: speechDetected ? Number(probability) : null,
        rolling_score: streams[activeStreamId]?.rolling_score || 0.5,
        risk_level: streams[activeStreamId]?.risk_level || 'LOW'
      }
      return {
        ...prev,
        [activeStreamId]: [newEntry, ...currentHistory].slice(0, 10)
      }
    })

    setWindowId((prev) => prev + 1)
  }

  // Helper SVG generator for the real-time probability curve matching user picture
  const renderLiveGraph = (timeSeries = []) => {
    const points = timeSeries.length > 0 ? timeSeries : [{ time: '0s', prob: 10 }, { time: '60s', prob: 50 }]
    const width = 600
    const height = 240
    const padding = 30

    const maxProb = 100
    const coords = points.map((p, idx) => {
      const x = padding + (idx / (Math.max(points.length - 1, 1))) * (width - padding * 2)
      const y = height - padding - (p.prob / maxProb) * (height - padding * 2)
      return { x, y, ...p }
    })

    const pathString = coords.reduce((acc, curr, idx) => (idx === 0 ? `M ${curr.x} ${curr.y}` : `${acc} L ${curr.x} ${curr.y}`), '')
    const areaString = `${pathString} L ${coords[coords.length - 1].x} ${height - padding} L ${coords[0].x} ${height - padding} Z`

    // 71.7% threshold line Y position
    const thresholdY = height - padding - (71.7 / maxProb) * (height - padding * 2)

    return (
      <div className="relative w-full overflow-hidden rounded-xl bg-[#090d16] border border-slate-800/80 p-4">
        {/* Top Header of Card matching image */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-white tracking-tight">Synthetic Voice Probability (Real-time)</span>
          </div>
          <div className="flex items-center gap-3 font-mono text-xs">
            <span className="flex items-center gap-1.5 bg-rose-500/10 text-rose-400 border border-rose-500/30 px-2.5 py-1 rounded-full">
              <span className="size-2 rounded-full bg-rose-500 animate-pulse" /> LIVE
            </span>
            <span className="text-slate-300">{selected.name || activeStreamId}</span>
            <span className="text-slate-500">|</span>
            <span className="text-cyan-400">{selected.call_duration || '00:01:12'}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_240px] gap-4 items-center">
          {/* SVG Graph Canvas */}
          <div className="relative h-[220px] w-full">
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
              <defs>
                <linearGradient id="probGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Background Horizontal Grid Lines */}
              {[0, 25, 50, 75, 100].map((val) => {
                const y = height - padding - (val / maxProb) * (height - padding * 2)
                return (
                  <g key={val}>
                    <line x1={padding} y1={y} x2={width - padding} y2={y} stroke="#1e293b" strokeDasharray="3 3" strokeWidth="1" />
                    <text x={padding - 8} y={y + 3} fill="#64748b" fontSize="10" textAnchor="end" className="font-mono">
                      {val}%
                    </text>
                  </g>
                )
              })}

              {/* Threshold Line (71.7%) */}
              <line x1={padding} y1={thresholdY} x2={width - padding} y2={thresholdY} stroke="#22d3ee" strokeDasharray="4 4" strokeWidth="1.5" />

              {/* Area fill */}
              <path d={areaString} fill="url(#probGradient)" />

              {/* Main Line */}
              <path d={pathString} fill="none" stroke="#f43f5e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

              {/* Data points & Pulsing indicator on the latest point */}
              {coords.map((pt, idx) => {
                const isLast = idx === coords.length - 1
                return (
                  <g key={idx}>
                    <circle cx={pt.x} cy={pt.y} r={isLast ? 5 : 3} className={isLast ? 'fill-rose-500 animate-ping' : 'fill-rose-400'} />
                    <circle cx={pt.x} cy={pt.y} r={isLast ? 4 : 2} className="fill-white" />
                  </g>
                )
              })}
            </svg>

            {/* Floating Callout box like in user's design image */}
            {coords.length > 0 && (
              <div 
                className="absolute z-10 hidden sm:block bg-[#120d16] border border-rose-500/50 rounded-xl px-3 py-2 shadow-2xl pointer-events-none"
                style={{ 
                  top: '15%', 
                  right: '15%' 
                }}
              >
                <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-rose-400">
                  <span>{coords[coords.length - 1].prob}%</span>
                </div>
                <div className="text-[10px] text-slate-300 font-mono">Synthetic voice detected</div>
                <div className="text-[9px] text-slate-500 font-mono">{selected.call_duration || '00:01:12'}</div>
              </div>
            )}

            {/* X-Axis labels */}
            <div className="flex justify-between px-7 text-[10px] font-mono text-slate-500 mt-1">
              <span>0s</span>
              <span>10s</span>
              <span>20s</span>
              <span>30s</span>
              <span>40s</span>
              <span>50s</span>
              <span>60s+</span>
            </div>
          </div>

          {/* Right Side Stats Panel matching user picture */}
          <div className="rounded-xl border border-slate-800 bg-[#0c1017] p-4 flex flex-col justify-between">
            <div>
              <p className="text-xs text-slate-400 font-mono">Current Probability</p>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-4xl font-black font-mono text-rose-500">
                  {Math.round((selected.ai_probability ?? selected.rolling_score ?? 0.5) * 100)}%
                </span>
              </div>
              <div className="mt-3">
                <span className="inline-block rounded-full border border-rose-500/40 bg-rose-500/10 px-3 py-1 text-[11px] font-bold text-rose-400 uppercase tracking-wider">
                  {selected.risk_level || 'HIGH'} RISK
                </span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800/80">
              <p className="text-xs text-slate-300 font-mono leading-relaxed">
                <span className="font-bold text-cyan-400">{selected.consecutive_flags || 3} consecutive</span> high-probability segments detected
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-[#07090e] text-slate-100 font-sans">
      <header className="border-b border-slate-800/80 bg-[#0c1017]/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-cyan-400 text-slate-950 font-bold">
              <ShieldCheck size={22} />
            </div>
            <div>
              <p className="text-lg font-bold tracking-tight text-white">VeriVox <span className="text-xs text-cyan-400 font-mono font-normal">Neural Guard</span></p>
              <p className="text-xs text-slate-400 font-mono">Voice safety monitor</p>
            </div>
          </div>
          <nav className="flex flex-wrap gap-1 rounded-xl border border-slate-800 bg-[#07090e] p-1" aria-label="Main navigation">
            {[
              { id: 'overview', label: 'Overview', icon: LayoutDashboard },
              { id: 'history', label: 'History', icon: History },
              { id: 'how', label: 'How it works', icon: CircleHelp },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActivePage(id)}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                  activePage === id ? 'bg-cyan-400 text-slate-950 shadow-md shadow-cyan-400/20' : 'text-slate-400 hover:bg-[#121824] hover:text-white'
                }`}
              >
                <Icon size={15} />
                {label}
              </button>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowInspector(!showInspector)}
              className="text-xs bg-[#121824] hover:bg-slate-800 text-cyan-300 px-3 py-1.5 rounded-lg border border-cyan-500/30 transition font-mono"
            >
              {showInspector ? 'Hide Contract' : '</> JSON Payload'}
            </button>
            <div className="flex items-center gap-2 text-xs font-medium text-slate-300 bg-[#121824] px-3 py-1.5 rounded-lg border border-slate-800">
              <span className={`size-2.5 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
              <span className="font-mono">{isConnected ? 'WS 8000 Connected' : 'Simulation Mode'}</span>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-8 lg:py-10">
        {activePage === 'overview' && (
          <div className="space-y-8">
            <section className="max-w-3xl">
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-cyan-400 font-mono">Today&apos;s overview</p>
              <h1 className="text-3xl font-black tracking-tight text-white md:text-4xl">Keep every conversation trustworthy.</h1>
              <p className="mt-3 max-w-2xl leading-7 text-slate-400 text-sm">
                VeriVox checks live audio for signs of an AI-generated voice. Select a conversation to inspect safety status and test telemetry injection.
              </p>
            </section>

            {/* Real-time Streaming Probability Waveform Element (Matching User Image) */}
            <section className="space-y-4">
              {renderLiveGraph(selected.timeSeries)}
            </section>

            {selected.alert_triggered && (
              <section className="flex flex-col gap-4 rounded-2xl border border-rose-500/40 bg-rose-950/30 p-5 md:flex-row md:items-center md:justify-between shadow-lg shadow-rose-950/20">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 text-rose-400">
                    <AlertTriangle size={22} />
                  </div>
                  <div>
                    <h2 className="font-bold text-rose-200 text-sm">Synthetic Voice Clone Detected</h2>
                    <p className="mt-1 text-xs leading-5 text-rose-300/80 font-mono">
                      {selected.alert_reason || 'The selected conversation has shown high-probability signature warnings.'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setStreams(prev => ({
                      ...prev,
                      [activeStreamId]: { ...prev[activeStreamId], alert_triggered: false }
                    }))
                  }}
                  className="flex shrink-0 items-center gap-2 text-xs font-bold text-rose-300 hover:text-white bg-rose-500/20 px-3 py-1.5 rounded-lg border border-rose-500/40 transition"
                >
                  <X size={14} /> Acknowledge Alert
                </button>
              </section>
            )}

            <section className="grid gap-4 sm:grid-cols-3" aria-label="Summary">
              {[
                { label: 'Active Channels', value: Object.keys(streams).length, detail: 'Monitored streams', icon: Radio },
                { label: 'Need your attention', value: summary.high, detail: summary.high ? 'High risk alerts active' : 'Everything looks calm', icon: AlertTriangle },
                { label: 'Speech detected now', value: `${summary.active}/${Object.keys(streams).length}`, detail: 'Active voice activity', icon: Volume2 },
              ].map(({ label, value, detail, icon: Icon }) => (
                <div key={label} className="rounded-2xl border border-slate-800 bg-[#0c1017]/90 p-5 shadow-xl">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-slate-400">{label}</p>
                    <Icon size={18} className="text-cyan-400" />
                  </div>
                  <p className="mt-4 text-3xl font-black tracking-tight text-white">{value}</p>
                  <p className="mt-1 text-xs text-slate-500 font-mono">{detail}</p>
                </div>
              ))}
            </section>

            <section className="grid gap-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.5fr)]">
              <div className="space-y-4 rounded-2xl border border-slate-800 bg-[#0c1017]/90 p-5 shadow-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-bold text-sm text-white">Your conversations</h2>
                    <p className="mt-0.5 text-xs text-slate-400">Choose one to inspect</p>
                  </div>
                  <Settings2 size={18} className="text-slate-500" />
                </div>
                <div className="space-y-2">
                  {Object.keys(streams).map((id) => {
                    const stream = streams[id]
                    const risk = stream.risk_level || stream.status || 'LOW'
                    return (
                      <button
                        key={id}
                        onClick={() => setActiveStreamId(id)}
                        className={`w-full rounded-xl border p-4 text-left transition ${
                          activeStreamId === id
                            ? 'border-cyan-400/60 bg-cyan-950/20 shadow-md shadow-cyan-950/50'
                            : 'border-slate-800/80 bg-[#121824]/60 hover:border-slate-700 hover:bg-[#121824]'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-bold text-sm text-white">{stream.name || id}</p>
                            <p className="mt-1 font-mono text-[11px] text-slate-400">
                              {id} &middot; {stream.lastSeen || 'Live'}
                            </p>
                          </div>
                          <StatusPill status={risk} />
                        </div>
                        <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                          <span>{stream.speech_detected !== false ? 'Speech active' : 'Silence'}</span>
                          <span className="font-mono text-cyan-300 font-semibold">Score {(stream.rolling_score ?? stream.score ?? 0).toFixed(2)}</span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="space-y-6 rounded-2xl border border-slate-800 bg-[#0c1017]/90 p-5 shadow-xl md:p-6">
                <div className="flex flex-col gap-3 border-b border-slate-800 pb-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h2 className="font-bold text-base text-white">{selected.name || activeStreamId}</h2>
                      <StatusPill status={selected.risk_level || selected.status} />
                    </div>
                    <p className="mt-1 text-xs text-slate-400">Real-time XGBoost safety metrics for this stream</p>
                  </div>
                  <span className="font-mono text-xs text-cyan-400 bg-cyan-950/60 border border-cyan-800/60 px-2.5 py-1 rounded-lg">
                    {activeStreamId}
                  </span>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border border-slate-800 bg-[#121824]/80 p-5">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                      <Gauge size={16} className="text-cyan-400" /> Rolling Risk Score
                    </div>
                    <p className="mt-3 text-4xl font-black font-mono text-white">
                      {(selected.rolling_score ?? selected.score ?? 0).toFixed(3)}
                    </p>
                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-800">
                      <div
                        className="h-full rounded-full transition-all duration-500 bg-cyan-400"
                        style={{ width: `${Math.min((selected.rolling_score ?? selected.score ?? 0) * 100, 100)}%` }}
                      />
                    </div>
                    <p className="mt-3 text-[11px] leading-5 text-slate-400">
                      Scores above 0.70 trigger automated SOC high-risk escalation.
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-800 bg-[#121824]/80 p-5">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                      <Waves size={16} className="text-cyan-400" /> Feature Latency
                    </div>
                    <p className="mt-3 text-xl font-bold font-mono text-white">{selected.feature_latency_ms || '3.8'} ms</p>
                    <p className="mt-2 text-xs leading-5 text-slate-400">
                      30-Dimensional Feature Vector (13 MFCC + 5 Spectral + 12 Chroma).
                    </p>
                    <div className="mt-5 flex items-center gap-2 text-xs font-medium text-emerald-400">
                      <CheckCircle2 size={15} /> Model: {selected.model_version || 'xgb_v1'}
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-800 bg-[#121824]/80 p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white">Simulation Telemetry Injection</h3>
                      <p className="mt-0.5 text-xs text-slate-400">Transmit a 1-second audio window to your FastAPI WebSocket server.</p>
                    </div>
                    <SlidersHorizontal size={18} className="text-slate-500" />
                  </div>
                  <div className="mt-5 space-y-5">
                    <label className="flex items-center justify-between gap-4 text-xs font-medium text-slate-300">
                      <span>VAD Speech Activity</span>
                      <input
                        type="checkbox"
                        checked={speechDetected}
                        onChange={(event) => setSpeechDetected(event.target.checked)}
                        className="size-4 accent-cyan-400 rounded cursor-pointer"
                      />
                    </label>
                    <label className="block text-xs font-medium text-slate-300">
                      <div className="mb-2 flex justify-between">
                        <span>XGBoost Window Probability</span>
                        <span className="font-mono text-cyan-300 font-bold">
                          {speechDetected ? Number(probability).toFixed(2) : 'NULL (Silence)'}
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={probability}
                        onChange={(event) => setProbability(event.target.value)}
                        disabled={!speechDetected}
                        className="w-full accent-cyan-400 disabled:opacity-30 cursor-pointer bg-slate-800 rounded-lg h-2"
                      />
                    </label>
                    <button
                      onClick={sendPrediction}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-indigo-500 px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-950 transition hover:opacity-90 shadow-lg shadow-cyan-400/20 active:scale-[0.99]"
                    >
                      <span>Transmit Window</span> <span className="font-mono text-[10px] bg-black/20 px-2 py-0.5 rounded"># {windowId}</span> <ArrowRight size={16} />
                    </button>
                  </div>
                </div>

                {showInspector && (
                  <div className="bg-black p-4 rounded-xl border border-cyan-500/40 font-mono text-xs text-cyan-300 overflow-x-auto shadow-2xl">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Active WebSocket State Payload</span>
                      <span className="text-[10px] text-cyan-400">Schema v1.0</span>
                    </div>
                    <pre>{JSON.stringify(selected, null, 2)}</pre>
                  </div>
                )}
              </div>
            </section>
          </div>
        )}

        {activePage === 'history' && (
          <section className="max-w-5xl space-y-6">
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-cyan-400 font-mono">Activity Log</p>
              <h1 className="text-3xl font-black tracking-tight text-white">Recent Window Telemetry ({activeStreamId})</h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-400">
                Timeline of window checks processed across the selected conversation stream.
              </p>
            </div>
            <div className="overflow-hidden rounded-2xl border border-slate-800 bg-[#0c1017]/90 shadow-xl">
              <div className="hidden grid-cols-[100px_1fr_1fr_100px_100px] gap-4 border-b border-slate-800 px-5 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 md:grid font-mono">
                <span>Window</span>
                <span>Timestamp</span>
                <span>VAD & Probability</span>
                <span>Rolling</span>
                <span>Risk State</span>
              </div>
              {currentHistory.length === 0 ? (
                <p className="p-5 text-xs text-slate-500 font-mono">No telemetry windows recorded yet.</p>
              ) : (
                currentHistory.map((item, idx) => (
                  <div
                    key={idx}
                    className="grid gap-3 border-b border-slate-800/80 px-5 py-4 last:border-0 md:grid-cols-[100px_1fr_1fr_100px_100px] md:items-center md:gap-4 hover:bg-[#121824]/40 transition text-xs font-mono"
                  >
                    <span className="text-cyan-400 font-bold">Win #{item.window_id}</span>
                    <span className="text-slate-400">{item.timestamp}</span>
                    <span className="text-slate-300">{item.speech_detected ? `Prob: ${item.ai_probability?.toFixed(2)}` : 'Silence'}</span>
                    <span className="text-slate-200">{item.rolling_score?.toFixed(3)}</span>
                    <span>
                      <StatusPill status={item.risk_level} />
                    </span>
                  </div>
                ))
              )}
            </div>
          </section>
        )}

        {activePage === 'how' && (
          <section className="max-w-4xl space-y-8">
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-cyan-400 font-mono">Pipeline Architecture</p>
              <h1 className="text-3xl font-black tracking-tight text-white">How VeriVox processes audio</h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-400">
                End-to-end Sprint 1–3 architecture specifications for real-time inference.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {[
                { icon: Mic, title: '1. Ingestion & VAD', text: '16kHz Mono audio split into 1-second rolling windows with WebRTC VAD filtering.' },
                { icon: Activity, title: '2. 30-Dim Vector', text: 'Extracts 13 MFCCs, 5 spectral descriptors, and 12 chroma features.' },
                { icon: ShieldCheck, title: '3. XGBoost & Risk', text: 'Evaluates probability via model xgb_v1 and aggregates rolling risk scores.' },
              ].map(({ icon: Icon, title, text }) => (
                <div key={title} className="rounded-2xl border border-slate-800 bg-[#0c1017]/90 p-6 shadow-xl">
                  <div className="mb-6 flex size-10 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300 border border-cyan-400/20">
                    <Icon size={20} />
                  </div>
                  <h2 className="text-base font-bold text-white">{title}</h2>
                  <p className="mt-2 text-xs leading-6 text-slate-400">{text}</p>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  )
}