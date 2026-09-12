'use client'

import { useMemo, useState, useEffect, useRef } from 'react'
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
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
    lastSeen: 'Just now'
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
    lastSeen: '12 sec ago'
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
    lastSeen: '28 sec ago'
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
  const [activeTab, setActiveTab] = useState('telemetry')
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
          setStreams((prev) => ({
            ...prev,
            [streamId]: { ...prev[streamId], ...data, name: prev[streamId]?.name || streamId }
          }))
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
          lastSeen: 'Just now'
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

  const currentResult = streams[activeStreamId] || {
    stream_id: activeStreamId,
    rolling_score: 0.0,
    consecutive_flags: 0,
    risk_level: 'LOW',
    alert_triggered: false,
    alert_reason: null,
    speech_detected: true,
    ai_probability: 0.0,
    model_version: 'xgb_v1',
    feature_latency_ms: 3.8,
    vector_dim: 30
  };

  const getRiskBadgeColor = (level) => {
    if (level === 'HIGH') return 'bg-rose-500/20 text-rose-400 border border-rose-500/60 shadow-lg shadow-rose-900/40 animate-pulse';
    if (level === 'MEDIUM') return 'bg-amber-500/20 text-amber-400 border border-amber-500/60 shadow-md shadow-amber-900/20';
    return 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/60';
  };

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 p-4 md:p-8 font-sans selection:bg-cyan-500 selection:text-black">
      
      {/* Top Header Navigation */}
      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 border-b border-slate-800/80 pb-5 gap-4">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white flex items-center gap-2.5">
              VeriVox <span className="bg-gradient-to-r from-cyan-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent font-extrabold text-lg">Neural Voiceguard</span>
            </h1>
            <p className="text-xs text-slate-400 font-mono mt-0.5">Real-Time 30-Dim Feature Pipeline &middot; XGBoost Sub-5ms Telemetry Engine</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-[#0c1017] p-1 rounded-xl border border-slate-800">
            <button 
              onClick={() => setActiveTab('telemetry')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${activeTab === 'telemetry' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-white'}`}
            >
              Live Telemetry
            </button>
            <button 
              onClick={() => setActiveTab('architecture')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${activeTab === 'architecture' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40' : 'text-slate-400 hover:text-white'}`}
            >
              Pipeline Architecture
            </button>
          </div>

          <button 
            onClick={() => setShowInspector(!showInspector)}
            className="text-xs bg-[#0c1017] hover:bg-slate-800 text-cyan-300 px-3.5 py-2 rounded-xl border border-cyan-500/30 transition font-mono shadow-sm flex items-center gap-1.5"
          >
            <span>{showInspector ? 'Hide Payload' : '</> JSON Contract'}</span>
          </button>

          <div className="flex items-center gap-2.5 bg-[#0c1017] px-4 py-2 rounded-xl border border-slate-800 shadow-inner">
            <span className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-emerald-400 shadow-lg shadow-emerald-400/50 animate-pulse' : 'bg-rose-500'}`} />
            <span className="text-xs font-mono font-bold tracking-wide text-slate-300">{isConnected ? 'WS 8000 Active' : 'Simulation Mode'}</span>
          </div>
        </div>
      </header>

      {/* Security Critical Alert Banner */}
      {currentResult.alert_triggered && (
        <div className="mb-6 p-4 bg-gradient-to-r from-rose-950/80 via-slate-950 to-rose-950/80 border border-rose-500/60 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between shadow-2xl backdrop-blur-md gap-3">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-rose-500/20 border border-rose-500/40 rounded-xl text-rose-400 text-xl animate-bounce">
              🚨
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-black text-rose-200 text-sm md:text-base tracking-wide">
                  SYNTHETIC VOICE CLONE DETECTED IN STREAM
                </h2>
                <span className="px-2 py-0.5 bg-rose-500 text-black font-black text-[10px] rounded uppercase tracking-wider">
                  HIGH RISK ESCALATION
                </span>
              </div>
              <p className="text-xs text-rose-300/80 font-mono mt-1">{currentResult.alert_reason}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <span className="text-xs font-mono text-slate-400">Stream: <strong className="text-rose-300">{activeStreamId}</strong></span>
            <button 
              onClick={() => {
                setStreams(prev => ({
                  ...prev,
                  [activeStreamId]: { ...prev[activeStreamId], alert_triggered: false }
                }));
              }}
              className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/40 text-rose-200 border border-rose-500/50 rounded-lg text-xs font-mono transition"
            >
              Acknowledge
            </button>
          </div>
        </div>
      )}

      {/* Conditional View Tabs */}
      {activeTab === 'architecture' ? (
        <div className="bg-[#0c1017]/90 backdrop-blur-xl p-6 md:p-8 rounded-2xl border border-slate-800/80 shadow-2xl space-y-6">
          <div className="flex justify-between items-center border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>Sprint 1–3 End-to-End Pipeline Specifications</span>
              </h2>
              <p className="text-xs text-slate-400 font-mono mt-1">Architecture finalized for live production evaluation standards.</p>
            </div>
            <button onClick={() => setActiveTab('telemetry')} className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-black font-bold rounded-xl text-xs transition">
              Back to Live SOC Dashboard
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-900/80 p-5 rounded-xl border border-cyan-500/30">
              <span className="text-[10px] font-mono uppercase bg-cyan-950 text-cyan-400 px-2 py-0.5 rounded border border-cyan-800">Sprint 1</span>
              <h3 className="text-sm font-bold text-white mt-2 mb-1">Audio Ingestion & Feature Pipeline</h3>
              <p className="text-xs text-slate-400 mb-3">16kHz Mono standard input &rarr; WebRTC VAD (20ms frames) &rarr; 1-Sec Windowing with 50% Overlap.</p>
              <div className="bg-black/40 p-3 rounded-lg font-mono text-[11px] text-cyan-300 space-y-1">
                <div>[13 MFCC Features]</div>
                <div>[5 Spectral (Centroid, Rolloff, ZCR, RMS)]</div>
                <div>[12 Chroma Features]</div>
                <div className="text-cyan-400 font-bold border-t border-cyan-900 pt-1">= 30-Dimensional Vector</div>
              </div>
            </div>

            <div className="bg-slate-900/80 p-5 rounded-xl border border-indigo-500/30">
              <span className="text-[10px] font-mono uppercase bg-indigo-950 text-indigo-400 px-2 py-0.5 rounded border border-indigo-800">Sprint 2</span>
              <h3 className="text-sm font-bold text-white mt-2 mb-1">XGBoost Core AI Model</h3>
              <p className="text-xs text-slate-400 mb-3">Maps 30-dim vector to <code className="text-indigo-300 font-mono">ai_probability</code> (0 = Real, 1 = Synthetic).</p>
              <div className="bg-black/40 p-3 rounded-lg font-mono text-[11px] text-indigo-300 space-y-1">
                <div>Dataset: ASVspoof / DEEP-VOICE</div>
                <div>Speaker-disjoint 80/20 validation</div>
                <div>Latency Target: &lt;5ms inference</div>
                <div className="text-indigo-400 font-bold border-t border-indigo-900 pt-1">Model Version: xgb_v1</div>
              </div>
            </div>

            <div className="bg-slate-900/80 p-5 rounded-xl border border-purple-500/30">
              <span className="text-[10px] font-mono uppercase bg-purple-950 text-purple-400 px-2 py-0.5 rounded border border-purple-800">Sprint 3</span>
              <h3 className="text-sm font-bold text-white mt-2 mb-1">Streaming & Rolling Risk Engine</h3>
              <p className="text-xs text-slate-400 mb-3">FastAPI WebSocket server aggregates rolling score and evaluates consecutive flags.</p>
              <div className="bg-black/40 p-3 rounded-lg font-mono text-[11px] text-purple-300 space-y-1">
                <div>Low: 0.00 &ndash; 0.40</div>
                <div>Medium: 0.40 &ndash; 0.70</div>
                <div>High Risk: 0.70 &ndash; 1.00</div>
                <div className="text-purple-400 font-bold border-t border-purple-900 pt-1">Triggers Instant SOC Alert</div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Main Grid Layout */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column: Stream Isolation & Simulation Injection */}
          <div className="bg-[#0c1017]/90 backdrop-blur-xl p-6 rounded-2xl border border-slate-800/80 shadow-2xl flex flex-col justify-between space-y-6">
            <div>
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-slate-400 text-xs font-bold uppercase tracking-widest">Active Stream Isolation</h3>
                <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-900">Multi-Channel</span>
              </div>
              <div className="grid grid-cols-3 gap-2 mb-6">
                {['call_001', 'call_002', 'call_003'].map((id) => {
                  const sRisk = streams[id]?.risk_level || 'LOW';
                  return (
                    <button
                      key={id}
                      onClick={() => setActiveStreamId(id)}
                      className={`py-3 px-2 rounded-xl text-xs font-bold transition truncate flex flex-col items-center gap-1 ${
                        activeStreamId === id 
                          ? 'bg-gradient-to-br from-cyan-600 to-indigo-600 text-white shadow-lg shadow-cyan-600/30 border border-cyan-400' 
                          : 'bg-[#121824] text-slate-400 border border-slate-800 hover:bg-slate-800 hover:text-slate-200'
                      }`}
                    >
                      <span className="font-mono">{id}</span>
                      <span className={`text-[9px] px-1.5 py-0.2 rounded font-black ${sRisk === 'HIGH' ? 'bg-rose-500 text-black' : sRisk === 'MEDIUM' ? 'bg-amber-500 text-black' : 'bg-emerald-500 text-black'}`}>
                        {sRisk}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="border-t border-slate-800/80 pt-5">
                <h3 className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-3">Simulation Telemetry Injection</h3>
                <div className="space-y-4 bg-[#121824]/80 p-4 rounded-xl border border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-300 font-medium">VAD Speech Activity</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={speechDetected}
                        onChange={(e) => setSpeechDetected(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-500"></div>
                    </label>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs text-slate-400 mb-2">
                      <span>XGBoost Window Probability (v1)</span>
                      <span className="font-mono font-bold text-cyan-400">{speechDetected ? Number(probability).toFixed(2) : 'NULL (Silence)'}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      disabled={!speechDetected}
                      value={probability}
                      onChange={(e) => setProbability(e.target.value)}
                      className="w-full accent-cyan-400 disabled:opacity-30 cursor-pointer bg-slate-800 rounded-lg h-2"
                    />
                  </div>

                  <div className="pt-2 text-[11px] font-mono text-slate-400 flex justify-between">
                    <span>Feature Vector:</span>
                    <span className="text-cyan-300 font-bold">30-Dim (13 MFCC + 5 Spec + 12 Chroma)</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4">
              <button
                onClick={sendPrediction}
                className="w-full bg-gradient-to-r from-cyan-500 via-indigo-600 to-indigo-500 hover:from-cyan-400 hover:to-indigo-400 active:scale-[0.99] text-black font-black py-3.5 px-4 rounded-xl shadow-xl shadow-cyan-500/20 transition flex items-center justify-center gap-2 text-xs uppercase tracking-wider"
              >
                <span>Transmit 1-Sec Window</span>
                <span className="font-mono text-[11px] bg-black/30 px-2 py-0.5 rounded text-cyan-300"># {windowId}</span>
              </button>
            </div>
          </div>

          {/* Right Columns: Metrics & Live Visualizer */}
          <div className="bg-[#0c1017]/90 backdrop-blur-xl p-6 md:p-8 rounded-2xl border border-slate-800/80 shadow-2xl lg:col-span-2 flex flex-col justify-between space-y-6">
            <div>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 border-b border-slate-800/80 pb-4 gap-3">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2.5">
                    <span>Live Stream Telemetry</span>
                    <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-950/60 px-2.5 py-0.5 rounded border border-cyan-800/50">
                      {activeStreamId}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">Model: {currentResult.model_version} &bull; Extraction Latency: {currentResult.feature_latency_ms || '3.8'}ms</p>
                </div>
                <span className={`px-4 py-1.5 rounded-full text-xs font-black tracking-widest ${getRiskBadgeColor(currentResult.risk_level)}`}>
                  {currentResult.risk_level || 'LOW'} RISK STATE
                </span>
              </div>

              {/* Core Metrics Grid with High-Tech Glow */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-[#121824]/90 p-4 rounded-xl border border-slate-800 relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-1 h-full bg-cyan-500"></div>
                  <span className="text-[11px] uppercase tracking-wider text-slate-400 block mb-1 font-mono">Rolling Risk Score</span>
                  <span className="text-2xl font-black font-mono text-cyan-400">
                    {Number(currentResult.rolling_score || 0).toFixed(3)}
                  </span>
                  <div className="w-full bg-slate-800 h-1 rounded-full mt-2 overflow-hidden">
                    <div className="bg-cyan-400 h-full transition-all duration-500" style={{ width: `${Math.min((currentResult.rolling_score || 0) * 100, 100)}%` }}></div>
                  </div>
                </div>

                <div className="bg-[#121824]/90 p-4 rounded-xl border border-slate-800 relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-1 h-full bg-amber-500"></div>
                  <span className="text-[11px] uppercase tracking-wider text-slate-400 block mb-1 font-mono">Consecutive Flags</span>
                  <span className="text-2xl font-black font-mono text-amber-400">
                    {currentResult.consecutive_flags || 0}
                  </span>
                  <span className="text-[10px] text-slate-500 block mt-1 font-mono">Threshold trigger: &gt;2</span>
                </div>

                <div className="bg-[#121824]/90 p-4 rounded-xl border border-slate-800 relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
                  <span className="text-[11px] uppercase tracking-wider text-slate-400 block mb-1 font-mono">VAD Status</span>
                  <span className={`text-xs font-bold font-mono px-2.5 py-1 rounded-md inline-block mt-0.5 ${currentResult.speech_detected !== false ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60' : 'bg-slate-900 text-slate-500 border border-slate-800'}`}>
                    {currentResult.speech_detected !== false ? 'SPEECH ACTIVE' : 'SILENCE'}
                  </span>
                </div>

                <div className="bg-[#121824]/90 p-4 rounded-xl border border-slate-800 relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
                  <span className="text-[11px] uppercase tracking-wider text-slate-400 block mb-1 font-mono">Window Prob (v1)</span>
                  <span className="text-2xl font-black font-mono text-slate-200">
                    {currentResult.ai_probability !== null && currentResult.ai_probability !== undefined 
                      ? Number(currentResult.ai_probability).toFixed(2) 
                      : '---'}
                  </span>
                  <span className="text-[10px] text-slate-500 block mt-1 font-mono">XGBoost output</span>
                </div>
              </div>

              {/* Rolling Window History Log */}
              <div className="bg-[#121824]/80 rounded-xl border border-slate-800 p-4">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">Recent Window Telemetry Log ({activeStreamId})</h4>
                  <span className="text-[10px] font-mono text-cyan-400">16kHz &bull; 50% Overlap</span>
                </div>
                {currentHistory.length === 0 ? (
                  <p className="text-xs text-slate-600 font-mono py-2">No windows transmitted yet...</p>
                ) : (
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {currentHistory.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs font-mono bg-[#0c1017] px-3.5 py-2 rounded-lg border border-slate-800/80 hover:border-cyan-500/30 transition">
                        <div className="flex items-center gap-3">
                          <span className="text-cyan-400 font-bold">Win #{item.window_id}</span>
                          <span className="text-slate-500">{item.timestamp}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className={item.speech_detected ? 'text-cyan-300' : 'text-slate-500'}>
                            {item.speech_detected ? `Prob: ${item.ai_probability !== null ? Number(item.ai_probability).toFixed(2) : 'Null'}` : 'Silence Filtered'}
                          </span>
                          <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${item.risk_level === 'HIGH' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/50' : item.risk_level === 'MEDIUM' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/50' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50'}`}>
                            {item.risk_level}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* JSON Contract Inspector Drawer */}
            {showInspector && (
              <div className="bg-black p-4 rounded-xl border border-cyan-500/40 font-mono text-xs text-cyan-300 overflow-x-auto shadow-2xl">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Active Model-to-System Contract Payload</span>
                  <span className="text-[10px] text-cyan-400">Schema v1.0</span>
                </div>
                <pre>{JSON.stringify(currentResult, null, 2)}</pre>
              </div>
            )}

            <div className="bg-[#121824] px-4 py-3 rounded-xl border border-slate-800 flex flex-col sm:flex-row justify-between items-center text-xs text-slate-400 font-mono gap-2">
              <span>Pipeline: WebRTC VAD &rarr; 30-Dim Vector &rarr; XGBoost Classifier</span>
              <span className="text-cyan-400 font-bold">VeriVox SOC Engine v1.0</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}