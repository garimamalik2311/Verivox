import React, { useState, useRef, useEffect } from 'react'
import {
  Mic,
  Upload,
  Database,
  Play,
  Pause,
  ShieldCheck,
  ShieldAlert,
  Flame,
  RefreshCw,
  TrendingDown,
  Shield
} from 'lucide-react'

export default function AdversarialRobustness() {
  const [sourceType, setSourceType] = useState('dataset')
  const [datasetSamples, setDatasetSamples] = useState([])
  const [selectedDatasetPath, setSelectedDatasetPath] = useState('')
  const [uploadedFile, setUploadedFile] = useState(null)
  const [attackType, setAttackType] = useState('opus')
  const [intensity, setIntensity] = useState(3)
  const [enableDefense, setEnableDefense] = useState(true)
  const [isRecording, setIsRecording] = useState(false)
  const [recordedBlob, setRecordedBlob] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [results, setResults] = useState(null)
  const [hoveredPoint, setHoveredPoint] = useState(null)

  // Audio Playback states
  const [currentlyPlaying, setCurrentlyPlaying] = useState(null)
  const audioRef = useRef(new Audio())
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])

  useEffect(() => {
    fetch('http://localhost:8000/api/adversarial/dataset-samples')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.samples && data.samples.length > 0) {
          setDatasetSamples(data.samples)
          setSelectedDatasetPath(data.samples[0].id)
        }
      })
      .catch(() => {})

    const audioElem = audioRef.current
    audioElem.onended = () => setCurrentlyPlaying(null)
  }, [])

  const togglePlayAudio = (url, key) => {
    if (currentlyPlaying === key) {
      audioRef.current.pause()
      setCurrentlyPlaying(null)
    } else {
      audioRef.current.src = `http://localhost:8000${url}`
      audioRef.current.play()
      setCurrentlyPlaying(key)
    }
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      audioChunksRef.current = []
      const recorder = new MediaRecorder(stream)
      mediaRecorderRef.current = recorder

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data)
      }

      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/wav' })
        setRecordedBlob(blob)
      }

      recorder.start()
      setIsRecording(true)
    } catch {
      alert('Unable to access microphone')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop())
      setIsRecording(false)
    }
  }

  const runAnalysis = async () => {
    setIsProcessing(true)
    const formData = new FormData()
    formData.append('attack_type', attackType)
    formData.append('intensity', intensity)
    formData.append('enable_defense', enableDefense)

    if (sourceType === 'dataset') {
      formData.append('dataset_path', selectedDatasetPath)
    } else if (sourceType === 'upload' && uploadedFile) {
      formData.append('file', uploadedFile)
    } else if (sourceType === 'mic' && recordedBlob) {
      formData.append('file', recordedBlob, 'mic_recording.wav')
    }

    try {
      const res = await fetch('http://localhost:8000/api/adversarial/analyze', {
        method: 'POST',
        body: formData,
      })
      if (!res.ok) throw new Error('Analysis failed')
      const data = await res.json()
      setResults(data)
    } catch {
      alert('Error running adversarial evaluation. Make sure backend is running on port 8000.')
    } finally {
      setIsProcessing(false)
    }
  }

  // Dynamic Chart Geometry
  const chartWidth = 720
  const chartHeight = 250
  const pad = { top: 25, right: 30, bottom: 40, left: 45 }

  const getY = (val) => chartHeight - pad.bottom - (val / 1.0) * (chartHeight - pad.top - pad.bottom)
  const getX = (idx) => pad.left + (idx / 4) * (chartWidth - pad.left - pad.right)

  const buildPath = (points) => {
    if (!points || points.length === 0) return ''
    return points
      .map((val, idx) => `${idx === 0 ? 'M' : 'L'} ${getX(idx)} ${getY(val)}`)
      .join(' ')
  }

  const curve = results?.curve_data

  return (
    <div className="space-y-6 max-w-5xl mx-auto text-slate-100">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 border-b border-[var(--color-verivox-border)] pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <ShieldAlert className="text-[var(--color-verivox-cyan)] size-6" />
            Adversarial Attack & Defense Studio
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Red-team VeriVox under real-world telecom codecs, noise & pitch attacks — and defend in real time.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[var(--color-verivox-cyan)]/10 text-[var(--color-verivox-cyan)] border border-[var(--color-verivox-cyan)]/30">
            <ShieldCheck className="size-3.5" />
            Active Purifier Shield Ready
          </span>
        </div>
      </div>

      {/* Control Studio Box */}
      <div className="rounded-2xl border border-[var(--color-verivox-border)] bg-[var(--color-verivox-dark)] p-6 space-y-6">
        {/* 1. Universal Ingestion Selector */}
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 font-mono block mb-3">
            1. Select Audio Source
          </label>
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => setSourceType('dataset')}
              className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition border cursor-pointer ${
                sourceType === 'dataset'
                  ? 'bg-[var(--color-verivox-cyan)]/10 border-[var(--color-verivox-cyan)] text-[var(--color-verivox-cyan)] shadow-[0_0_15px_rgba(65,234,212,0.15)]'
                  : 'bg-[var(--color-verivox-darkest)] border-[var(--color-verivox-border)] text-slate-400 hover:border-slate-700'
              }`}
            >
              <Database size={15} /> Dataset Library
            </button>
            <button
              onClick={() => setSourceType('upload')}
              className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition border cursor-pointer ${
                sourceType === 'upload'
                  ? 'bg-[var(--color-verivox-cyan)]/10 border-[var(--color-verivox-cyan)] text-[var(--color-verivox-cyan)] shadow-[0_0_15px_rgba(65,234,212,0.15)]'
                  : 'bg-[var(--color-verivox-darkest)] border-[var(--color-verivox-border)] text-slate-400 hover:border-slate-700'
              }`}
            >
              <Upload size={15} /> Upload Audio
            </button>
            <button
              onClick={() => setSourceType('mic')}
              className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition border cursor-pointer ${
                sourceType === 'mic'
                  ? 'bg-[var(--color-verivox-cyan)]/10 border-[var(--color-verivox-cyan)] text-[var(--color-verivox-cyan)] shadow-[0_0_15px_rgba(65,234,212,0.15)]'
                  : 'bg-[var(--color-verivox-darkest)] border-[var(--color-verivox-border)] text-slate-400 hover:border-slate-700'
              }`}
            >
              <Mic size={15} /> Live Mic Recording
            </button>
          </div>

          <div className="mt-3 p-3.5 bg-[var(--color-verivox-darkest)]/40 rounded-xl border border-[var(--color-verivox-border)]/80">
            {sourceType === 'dataset' && (
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400 font-mono">Sample:</span>
                <select
                  value={selectedDatasetPath}
                  onChange={(e) => setSelectedDatasetPath(e.target.value)}
                  className="bg-[var(--color-verivox-darkest)] border border-[var(--color-verivox-border)] text-xs rounded-lg px-3 py-1.5 flex-1 text-slate-200 focus:outline-none focus:border-[var(--color-verivox-cyan)] font-mono"
                >
                  {datasetSamples.map((s) => (
                    <option key={s.id} value={s.id}>
                      [{s.language.toUpperCase()}] {s.name} ({s.label})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {sourceType === 'upload' && (
              <div className="flex items-center gap-3">
                <input
                  type="file"
                  accept="audio/*"
                  onChange={(e) => setUploadedFile(e.target.files[0])}
                  className="text-xs text-slate-300 file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[var(--color-verivox-cyan)]/20 file:text-[var(--color-verivox-cyan)] hover:file:bg-[var(--color-verivox-cyan)]/30 cursor-pointer"
                />
              </div>
            )}

            {sourceType === 'mic' && (
              <div className="flex items-center gap-4">
                {!isRecording ? (
                  <button
                    onClick={startRecording}
                    className="flex items-center gap-2 px-4 py-1.5 bg-[var(--color-verivox-pink)] hover:opacity-90 text-white rounded-lg text-xs font-bold transition cursor-pointer"
                  >
                    <Mic size={14} /> Start Mic Recording
                  </button>
                ) : (
                  <button
                    onClick={stopRecording}
                    className="flex items-center gap-2 px-4 py-1.5 bg-[var(--color-verivox-yellow)] hover:opacity-95 text-black rounded-lg text-xs font-bold animate-pulse transition cursor-pointer"
                  >
                    Stop Recording
                  </button>
                )}
                {recordedBlob && (
                  <span className="text-xs text-[var(--color-verivox-cyan)] font-mono">✓ Audio captured (ready to test)</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 2. Attack & Defense Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 font-mono block mb-2">
              Adversarial Attack
            </label>
            <select
              value={attackType}
              onChange={(e) => setAttackType(e.target.value)}
              className="w-full bg-[var(--color-verivox-darkest)] border border-[var(--color-verivox-border)] text-xs rounded-xl px-3.5 py-2 text-slate-200 focus:outline-none focus:border-[var(--color-verivox-cyan)] font-mono"
            >
              <option value="opus">Opus VoIP Compression (WhatsApp/Cellular)</option>
              <option value="mp3">MP3 Compression (Lossy Sub-band)</option>
              <option value="pink_noise">Pink Noise (Cafe / Street Background)</option>
              <option value="white_noise">White Noise (Gaussian Line Noise)</option>
              <option value="pitch">Pitch Shift (Vocal Formant Modulation)</option>
            </select>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 font-mono">
                Attack Intensity
              </label>
              <span className="text-xs text-[var(--color-verivox-cyan)] font-mono">Level {intensity}/4</span>
            </div>
            <input
              type="range"
              min="1"
              max="4"
              value={intensity}
              onChange={(e) => setIntensity(Number(e.target.value))}
              className="w-full accent-[var(--color-verivox-cyan)] cursor-pointer h-2 bg-[var(--color-verivox-darkest)] rounded-lg"
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 font-mono block mb-2">
              Defense Shield
            </label>
            <button
              onClick={() => setEnableDefense(!enableDefense)}
              className={`w-full py-2 px-3.5 rounded-xl text-xs font-bold transition flex items-center justify-between border cursor-pointer ${
                enableDefense
                  ? 'bg-[var(--color-verivox-cyan)]/10 border-[var(--color-verivox-cyan)]/50 text-[var(--color-verivox-cyan)]'
                  : 'bg-[var(--color-verivox-darkest)] border-[var(--color-verivox-border)] text-slate-400'
              }`}
            >
              <span>{enableDefense ? '🛡️ Shield Active' : 'Off (Unprotected)'}</span>
              <span className={`size-2 rounded-full ${enableDefense ? 'bg-[var(--color-verivox-cyan)] animate-pulse' : 'bg-slate-600'}`} />
            </button>
          </div>
        </div>

        {/* 3. Execute Button */}
        <button
          onClick={runAnalysis}
          disabled={isProcessing}
          className="w-full py-3 bg-gradient-to-r from-[var(--color-verivox-cyan)] to-blue-600 hover:opacity-90 text-[var(--color-verivox-darkest)] font-bold rounded-xl text-xs font-mono tracking-wider transition shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          {isProcessing ? (
            <>
              <RefreshCw className="animate-spin size-4" /> Running DSP Defense Pipeline & Plotting Response Curves...
            </>
          ) : (
            <>
              <Flame className="size-4" /> Run Adversarial Attack & Defense Test
            </>
          )}
        </button>
      </div>

      {/* Results HUD */}
      {results && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Clean Audio Card */}
            <div className="bg-[var(--color-verivox-dark)] border border-[var(--color-verivox-border)] rounded-2xl p-5 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">1. Original Clean</span>
                <span className="text-[10px] bg-[var(--color-verivox-darkest)] px-2 py-0.5 rounded text-slate-300 font-mono">Baseline</span>
              </div>
              <div>
                <p className="text-3xl font-extrabold text-white font-mono">
                  {(results.clean.ai_probability * 100).toFixed(1)}%
                </p>
                <p className="text-xs text-slate-400 mt-1">Risk: {results.clean.risk_level}</p>
              </div>
              <button
                onClick={() => togglePlayAudio(results.clean.preview_url, 'clean')}
                className="w-full py-2 bg-[var(--color-verivox-darkest)] hover:opacity-80 text-[var(--color-verivox-cyan)] rounded-lg text-xs font-bold font-mono flex items-center justify-center gap-2 transition cursor-pointer"
              >
                {currentlyPlaying === 'clean' ? <Pause size={14} /> : <Play size={14} />} Listen to Original
              </button>
            </div>

            {/* Attacked Audio Card */}
            <div className={`border rounded-2xl p-5 space-y-3 ${
              results.attacked.evasion_detected
                ? 'bg-[var(--color-verivox-pink)]/10 border-[var(--color-verivox-pink)]/50 shadow-[0_0_20px_rgba(255,32,110,0.1)]'
                : 'bg-[var(--color-verivox-dark)] border-[var(--color-verivox-border)]'
            }`}>
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-verivox-pink)] font-mono">2. Attacked Audio</span>
                {results.attacked.evasion_detected && (
                  <span className="text-[10px] bg-[var(--color-verivox-pink)]/20 text-[var(--color-verivox-pink)] px-2 py-0.5 rounded font-mono font-bold animate-pulse">
                    🚨 EVADED!
                  </span>
                )}
              </div>
              <div>
                <p className="text-3xl font-extrabold text-white font-mono">
                  {(results.attacked.ai_probability * 100).toFixed(1)}%
                </p>
                <p className="text-xs text-[var(--color-verivox-pink)] mt-1">Risk: {results.attacked.risk_level}</p>
              </div>
              <button
                onClick={() => togglePlayAudio(results.attacked.preview_url, 'attacked')}
                className="w-full py-2 bg-[var(--color-verivox-darkest)] hover:opacity-80 text-[var(--color-verivox-pink)] rounded-lg text-xs font-bold font-mono flex items-center justify-center gap-2 transition cursor-pointer"
              >
                {currentlyPlaying === 'attacked' ? <Pause size={14} /> : <Play size={14} />} Listen to Attacked
              </button>
            </div>

            {/* Defended Audio Card */}
            <div className="bg-[var(--color-verivox-dark)] border border-[var(--color-verivox-cyan)]/40 rounded-2xl p-5 space-y-3 shadow-[0_0_20px_rgba(65,234,212,0.1)]">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-verivox-cyan)] font-mono">3. Defended Audio</span>
                <span className="text-[10px] bg-[var(--color-verivox-cyan)]/20 text-[var(--color-verivox-cyan)] px-2 py-0.5 rounded font-mono font-bold">
                  🛡️ RESTORED
                </span>
              </div>
              <div>
                <p className="text-3xl font-extrabold text-white font-mono">
                  {(results.defended.ai_probability * 100).toFixed(1)}%
                </p>
                <p className="text-xs text-[var(--color-verivox-cyan)] mt-1">
                  Recovery: {results.defended.recovery_delta_percent > 0 ? '+' : ''}{results.defended.recovery_delta_percent}%
                </p>
              </div>
              <button
                onClick={() => togglePlayAudio(results.defended.preview_url, 'defended')}
                className="w-full py-2 bg-[var(--color-verivox-darkest)] hover:opacity-80 text-[var(--color-verivox-cyan)] rounded-lg text-xs font-bold font-mono flex items-center justify-center gap-2 transition cursor-pointer"
              >
                {currentlyPlaying === 'defended' ? <Pause size={14} /> : <Play size={14} />} Listen to Defended
              </button>
            </div>
          </div>

          {/* Defense Telemetry Bar */}
          <div className="bg-[var(--color-verivox-darkest)]/80 border border-[var(--color-verivox-border)] rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 font-mono text-xs">
            <div>
              <span className="text-slate-400">Attack Signature: </span>
              <span className="text-[var(--color-verivox-pink)] font-bold">{results.defended.attack_detected}</span>
            </div>
            <div>
              <span className="text-slate-400">Defense Algorithm: </span>
              <span className="text-[var(--color-verivox-cyan)] font-bold">{results.defended.defense_applied}</span>
            </div>
            <div>
              <span className="text-slate-400">Purification Latency: </span>
              <span className="text-[var(--color-verivox-cyan)] font-bold">{results.defended.defense_latency_ms} ms</span>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================
          LIVE DYNAMIC 3-CURVE RESPONSE GRAPH
         =================================================== */}
      <div className="rounded-2xl border border-[var(--color-verivox-border)] bg-[var(--color-verivox-dark)] p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <TrendingDown size={16} className="text-[var(--color-verivox-pink)]" />
              Live Attack Dip vs. Defense Restoration Curve
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Dynamically generated from real model evaluations on this specific audio file across 5 intensity levels
            </p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-6 py-2 border-y border-[var(--color-verivox-border)]/80 font-mono text-xs">
          <div className="flex items-center gap-2">
            <span className="size-2.5 rounded-full bg-[var(--color-verivox-cyan)] shadow-[0_0_8px_var(--color-verivox-cyan)]" />
            <span className="text-slate-300 font-semibold">1. Baseline Voice (Clean)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="size-2.5 rounded-full bg-[var(--color-verivox-pink)] shadow-[0_0_8px_var(--color-verivox-pink)]" />
            <span className="text-[var(--color-verivox-pink)] font-semibold">2. The Dip (Attacked Voice)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="size-2.5 rounded-full bg-[var(--color-verivox-yellow)] shadow-[0_0_8px_var(--color-verivox-yellow)]" />
            <span className="text-[var(--color-verivox-yellow)] font-semibold">3. The Defense (Shield Active)</span>
          </div>
        </div>

        {/* SVG Canvas */}
        <div className="relative w-full pt-2">
          {curve ? (
            <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-auto overflow-visible select-none">
              {/* Evasion Zone (<0.50 Threshold) */}
              <rect
                x={pad.left}
                y={getY(0.5)}
                width={chartWidth - pad.left - pad.right}
                height={getY(0.0) - getY(0.5)}
                fill="rgba(255, 32, 110, 0.05)"
              />
              <text
                x={chartWidth - pad.right - 10}
                y={getY(0.25)}
                fill="rgba(255, 32, 110, 0.35)"
                fontSize="12"
                fontWeight="bold"
                textAnchor="end"
                className="font-mono tracking-widest uppercase"
              >
                🚨 Critical Evasion Zone (AI Bypasses Detector)
              </text>

              {/* Grid lines & Y axis ticks */}
              {[1.0, 0.8, 0.6, 0.5, 0.4, 0.2, 0].map((val) => {
                const y = getY(val)
                const isThresh = val === 0.5
                return (
                  <g key={val}>
                    <line
                      x1={pad.left}
                      y1={y}
                      x2={chartWidth - pad.right}
                      y2={y}
                      stroke={isThresh ? 'var(--color-verivox-pink)' : 'var(--color-verivox-border)'}
                      strokeWidth={isThresh ? 1.5 : 0.8}
                      strokeDasharray={isThresh ? '4 4' : undefined}
                      strokeOpacity={isThresh ? 0.8 : 1}
                    />
                    <text
                      x={pad.left - 8}
                      y={y + 3.5}
                      fill={isThresh ? 'var(--color-verivox-pink)' : '#64748b'}
                      fontSize="10"
                      fontWeight={isThresh ? 'bold' : 'normal'}
                      textAnchor="end"
                      className="font-mono"
                    >
                      {val.toFixed(1)}
                    </text>
                  </g>
                )
              })}

              {/* Decision Threshold Tag */}
              <text
                x={chartWidth - pad.right}
                y={getY(0.5) - 6}
                fill="var(--color-verivox-pink)"
                fontSize="10"
                fontWeight="bold"
                textAnchor="end"
                className="font-mono"
              >
                50% Decision Threshold
              </text>

              {/* X-axis ticks */}
              {curve.x_labels.map((lbl, idx) => {
                const x = getX(idx)
                return (
                  <g key={idx}>
                    <line x1={x} y1={chartHeight - pad.bottom} x2={x} y2={chartHeight - pad.bottom + 4} stroke="#475569" strokeWidth="1" />
                    <text x={x} y={chartHeight - pad.bottom + 18} fill="#94a3b8" fontSize="10" textAnchor="middle" className="font-mono">
                      {lbl}
                    </text>
                  </g>
                )
              })}

              {/* Curve 1: Baseline Voice */}
              <path
                d={buildPath(curve.baseline)}
                fill="none"
                stroke="var(--color-verivox-cyan)"
                strokeWidth="2.5"
                strokeDasharray="5 5"
                className="opacity-70"
              />

              {/* Curve 2: The Dip */}
              <path
                d={buildPath(curve.attacked)}
                fill="none"
                stroke="var(--color-verivox-pink)"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="drop-shadow(0 0 6px rgba(255, 32, 110, 0.4))"
              />

              {/* Curve 3: The Defense */}
              <path
                d={buildPath(curve.defended)}
                fill="none"
                stroke="var(--color-verivox-yellow)"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="drop-shadow(0 0 6px rgba(251, 255, 18, 0.4))"
              />

              {/* Data Points */}
              {curve.x_labels.map((_, idx) => {
                const pClean = curve.baseline[idx]
                const pAtk = curve.attacked[idx]
                const pDef = curve.defended[idx]
                const isActive = idx === curve.active_level
                return (
                  <g key={idx}>
                    {/* Clean Dot */}
                    <circle cx={getX(idx)} cy={getY(pClean)} r="4" fill="var(--color-verivox-dark)" stroke="var(--color-verivox-cyan)" strokeWidth="2" />

                    {/* Attacked Dot */}
                    <circle
                      cx={getX(idx)}
                      cy={getY(pAtk)}
                      r={isActive ? 7 : 5}
                      fill="var(--color-verivox-pink)"
                      stroke={isActive ? '#ffffff' : 'none'}
                      strokeWidth={isActive ? 2 : 0}
                      className="cursor-pointer hover:r-8 transition-all"
                      onMouseEnter={() => setHoveredPoint({ x: getX(idx), y: getY(pAtk), text: `Attacked: ${(pAtk * 100).toFixed(1)}%` })}
                      onMouseLeave={() => setHoveredPoint(null)}
                    />

                    {/* Defended Dot */}
                    <circle
                      cx={getX(idx)}
                      cy={getY(pDef)}
                      r={isActive ? 7 : 5}
                      fill="var(--color-verivox-yellow)"
                      stroke={isActive ? '#ffffff' : 'none'}
                      strokeWidth={isActive ? 2 : 0}
                      className="cursor-pointer hover:r-8 transition-all"
                      onMouseEnter={() => setHoveredPoint({ x: getX(idx), y: getY(pDef), text: `Defended: ${(pDef * 100).toFixed(1)}%` })}
                      onMouseLeave={() => setHoveredPoint(null)}
                    />
                  </g>
                )
              })}

              {/* Hover Tooltip */}
              {hoveredPoint && (
                <g transform={`translate(${hoveredPoint.x}, ${hoveredPoint.y - 12})`}>
                  <rect x="-45" y="-20" width="90" height="20" rx="4" fill="#0f172a" stroke="#475569" strokeWidth="1" />
                  <text x="0" y="-6" fill="#ffffff" fontSize="10" fontWeight="bold" textAnchor="middle" className="font-mono">
                    {hoveredPoint.text}
                  </text>
                </g>
              )}
            </svg>
          ) : (
            <div className="h-48 border border-dashed border-[var(--color-verivox-border)] rounded-xl flex flex-col items-center justify-center text-slate-500 font-mono text-xs space-y-2">
              <TrendingDown size={24} className="opacity-40" />
              <p>Click "Run Adversarial Attack & Defense Test" above to generate live response curves.</p>
            </div>
          )}
        </div>

        {/* Dynamic Footer Telemetry */}
        {curve && (
          <div className="flex items-center justify-between p-3.5 bg-[var(--color-verivox-darkest)]/40 rounded-xl border border-[var(--color-verivox-border)]/80 font-mono text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <Shield size={14} className="text-[var(--color-verivox-cyan)]" />
              <span>Live evaluated on current audio sample across 5 intensities (0..4)</span>
            </div>
            <span className="text-[var(--color-verivox-cyan)] font-bold">
              Peak Recovery: +{Math.max(0, ...curve.defended.map((d, i) => Math.round((d - curve.attacked[i]) * 100)))}%
            </span>
          </div>
        )}
      </div>
    </div>
  )
}