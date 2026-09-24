'use client'

import { useMemo, useState, useEffect, useRef } from 'react'
import {
  LayoutDashboard,
  ShieldAlert,
  BarChart3,
  History as HistoryIcon,
  CircleHelp,
  ShieldCheck,
  UserCheck,
  ChevronRight,
  LogOut
} from 'lucide-react'

// Sub-components
import Overview from './pages/Overview'
import Analytics from './pages/Analytics'
import History from './pages/History'
import Architecture from './pages/Architecture'
import AdversarialRobustness from './components/AdversarialRobustness'
import SecurityReport from './pages/SecurityReport'
import Hero from "./pages/Hero";
import Admin from "./pages/Admin";

// Utilities
import { initialHistories, getAnalyticsData } from './utils/helpers'

export default function App() {
  // =========================================================
  // AUTHENTICATION STATE
  // =========================================================
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  // =========================================================
  // DASHBOARD STATE
  // =========================================================
  const [activePage, setActivePage] = useState('overview')
  const [streams, setStreams] = useState({})
  const [streamHistories, setStreamHistories] = useState(initialHistories)
  const [activeStreamId, setActiveStreamId] = useState(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isBackendOnline, setIsBackendOnline] = useState(false)
  const [inputMode, setInputMode] = useState('mic')
  const [micStatus, setMicStatus] = useState('Disconnected')
  const [securityTerminated, setSecurityTerminated] = useState(false)
  const [micLevel, setMicLevel] = useState(0)
  const [showInspector, setShowInspector] = useState(false)
  const [isLiveMonitoring, setIsLiveMonitoring] = useState(false)
  const [transactionAmountInr, setTransactionAmountInr] = useState('525000')
  const [selectedScenario, setSelectedScenario] = useState('high_value_transaction')
  const [contextConfigured, setContextConfigured] = useState(false)

  // Refs for WebSockets and Audio
  const monitorGainRef = useRef(null)
  const wsRef = useRef(null)
  const uniqueStreamIdRef = useRef(
    `sih_live_${Math.random().toString(36).substring(2, 9)}`
  )
  const audioContextRef = useRef(null)
  const mediaStreamRef = useRef(null)
  const processorRef = useRef(null)
  const sourceRef = useRef(null)
  const fileIntervalRef = useRef(null)
  const fileStreamActiveRef = useRef(false)
  const securityTerminatedRef = useRef(false)
  const transactionAmountRef = useRef('525000')
  const selectedScenarioRef = useRef('high_value_transaction')

  const selected = activeStreamId ? (streams[activeStreamId] || {}) : {}
  const analytics = getAnalyticsData(selected)
  const currentHistory = streamHistories[activeStreamId] || []

  /* =========================================================
     WEBSOCKET CONNECTION (Only runs after authentication)
     ========================================================= */
  useEffect(() => {
    // Only connect if the user is authenticated and on the dashboard
    if (!isAuthenticated) return

    let isUnmounted = false
    let reconnectTimeout = null

    const connect = () => {
      if (isUnmounted) return

      const streamId = uniqueStreamIdRef.current
      const wsUrl =
        import.meta.env.VITE_RISK_WS_URL ||
        `ws://127.0.0.1:8000/ws/audio?stream_id=${streamId}`

      console.log('Connecting Risk WebSocket:', wsUrl)

      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        console.log('Risk WebSocket connected')
        setIsConnected(true)
        setIsBackendOnline(true)
        setMicStatus('Select Security Context')
        setContextConfigured(false)
      }

      ws.onclose = () => {
        console.log('Risk WebSocket closed')
        setIsConnected(false)
        setIsBackendOnline(securityTerminatedRef.current)
        setMicStatus(
          securityTerminatedRef.current
            ? 'STREAM TERMINATED — SECURITY ALERT'
            : 'Disconnected'
        )

        // Automatically attempt reconnection if not security-terminated
        if (!isUnmounted && !securityTerminatedRef.current) {
          reconnectTimeout = setTimeout(() => {
            console.log('Attempting WebSocket reconnect...')
            connect()
          }, 2000)
        }
      }

    ws.onerror = (error) => {
      console.error('Risk WebSocket error:', error)
      setIsConnected(false)
      setIsBackendOnline(securityTerminatedRef.current)
      setMicStatus(
        securityTerminatedRef.current
          ? 'STREAM TERMINATED — SECURITY ALERT'
          : 'Backend Connection Error'
      )
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        console.log('RiskResult:', data)

        if (data.type === 'session_context_ack') {
          console.log('Session context acknowledged:', data)

          setStreams((prev) => ({
            ...prev,
            [data.stream_id]: {
              ...(prev[data.stream_id] || {}),
              stream_id: data.stream_id,
              transaction_amount_inr: data.transaction_amount_inr,
              notification_scenario: data.scenario,
              scenario_source: data.scenario_source,
              response_workflow_status: 'MONITORING'
            }
          }))

          setActiveStreamId(data.stream_id)
          setContextConfigured(true)
          setMicStatus('Security Context Ready')
          return
        }

        if (data.alert_triggered === true) {
          console.warn('HIGH-RISK ALERT: HARD STOPPING FILE STREAM')
          securityTerminatedRef.current = true
          setSecurityTerminated(true)
          fileStreamActiveRef.current = false

          if (fileIntervalRef.current) {
            clearInterval(fileIntervalRef.current)
            fileIntervalRef.current = null
          }

          setMicLevel(0)
          setMicStatus('ALERT: Synthetic Voice Clone Detected')
        }

        const currentStreamId = data.stream_id || streamId

        setStreams((prev) => {
          const existing = prev[currentStreamId] || {
            stream_id: currentStreamId,
            name: inputMode === 'mic' ? 'Live Mic Stream' : 'Audio File Stream',
            timeSeries: []
          }

          const probability = data.ai_probability
          const existingSeries = existing.timeSeries || []

          const newTsEntry =
            probability !== null && probability !== undefined
              ? {
                  time: `${existingSeries.length * 3}s`,
                  prob: Math.round(Number(probability) * 100)
                }
              : null

          return {
            ...prev,
            [currentStreamId]: {
              ...existing,
              ...data,
              alert_triggered:
                data.alert_triggered === true ||
                existing.alert_triggered === true,
              alert_reason:
                data.alert_reason || existing.alert_reason || null,
              alert_consecutive_flags:
                data.alert_triggered === true
                  ? (data.consecutive_flags ?? 0)
                  : (existing.alert_consecutive_flags ?? null),
              timeSeries: newTsEntry
                ? [...existingSeries, newTsEntry].slice(-60)
                : existingSeries,
              name: data.name || existing.name || currentStreamId
            }
          }
        })

        setActiveStreamId(currentStreamId)

        setStreamHistories((prev) => {
          const hist = prev[currentStreamId] || []

          const newEntry = {
            window_id: data.window_id ?? hist.length + 1,
            timestamp: data.timestamp
              ? new Date(Number(data.timestamp) * 1000).toLocaleTimeString()
              : new Date().toLocaleTimeString(),
            speech_detected:
              data.speech_detected ??
              (data.ai_probability !== null &&
                data.ai_probability !== undefined),
            ai_probability: data.ai_probability ?? null,
            rolling_score: data.rolling_score ?? null,
            risk_level: data.risk_level ?? null
          }

          return {
            ...prev,
            [currentStreamId]: [newEntry, ...hist].slice(0, 30)
          }
        })
      } catch (error) {
        console.error('Failed to parse RiskResult:', error)
      }
    }

    }

    connect()

    return () => {
      isUnmounted = true
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout)
      }
      if (
        wsRef.current &&
        (wsRef.current.readyState === WebSocket.CONNECTING ||
          wsRef.current.readyState === WebSocket.OPEN)
      ) {
        console.log('Cleaning up Risk WebSocket')
        wsRef.current.close()
      }

      wsRef.current = null
      stopMicrophoneStream()
    }
  }, [isAuthenticated]) // Re-run effect if authentication status changes

  /* =========================================================
     AUDIO HELPERS
     ========================================================= */

  const TARGET_SAMPLE_RATE = 16000

  const resampleTo16k = (input, inputSampleRate) => {
    if (inputSampleRate === TARGET_SAMPLE_RATE) return input

    const ratio = inputSampleRate / TARGET_SAMPLE_RATE
    const outputLength = Math.round(input.length / ratio)
    const output = new Float32Array(outputLength)

    for (let i = 0; i < outputLength; i++) {
      const position = i * ratio
      const index = Math.floor(position)
      const fraction = position - index
      const sample1 = input[index] || 0
      const sample2 =
        index + 1 < input.length ? input[index + 1] : sample1

      output[i] = sample1 + (sample2 - sample1) * fraction
    }

    return output
  }

  const float32ToPCM16 = (float32Data) => {
    const pcm16 = new Int16Array(float32Data.length)

    for (let i = 0; i < float32Data.length; i++) {
      const sample = Math.max(-1, Math.min(1, float32Data[i]))

      pcm16[i] =
        sample < 0
          ? sample * 0x8000
          : sample * 0x7fff
    }

    return pcm16
  }

  const calculateRMS = (audio) => {
    if (!audio || audio.length === 0) return 0

    let sum = 0

    for (let i = 0; i < audio.length; i++) {
      sum += audio[i] * audio[i]
    }

    return Math.sqrt(sum / audio.length)
  }

  /* =========================================================
     MICROPHONE STREAM
     ========================================================= */

  const configureSecurityContext = () => {
    const ws = wsRef.current

    if (!ws || ws.readyState !== WebSocket.OPEN) {
      setMicStatus('Backend Connection Required')
      return false
    }

    const rawAmount = String(transactionAmountRef.current).trim()
    const parsedAmount = rawAmount === '' ? null : Number(rawAmount)
    const scenario = selectedScenarioRef.current

    if (
      parsedAmount !== null &&
      (!Number.isFinite(parsedAmount) || parsedAmount < 0)
    ) {
      setMicStatus('Invalid Transaction Amount')
      return false
    }

    if (
      scenario === 'high_value_transaction' &&
      parsedAmount === null
    ) {
      setMicStatus('Transaction Amount Required')
      return false
    }

    const payload = {
      type: 'session_context',
      scenario:
        scenario === 'high_value_transaction' ? null : scenario,
      transaction_amount_inr: parsedAmount // FIXED: Sending parsedAmount for all scenarios
    }

    ws.send(JSON.stringify(payload))

    console.log('Security context sent:', payload)
    setMicStatus('Configuring Security Context...')

    return true
  }

  const startMicrophoneStream = async () => {
    if (!contextConfigured) {
      setMicStatus('Configure Security Context First')
      return
    }

    try {
      setInputMode('mic')
      setMicStatus('Connecting Mic...')

      const constraints = {
        audio: {
          channelCount: { ideal: 1 },
          echoCancellation: { exact: false },
          noiseSuppression: { exact: false },
          autoGainControl: { exact: false }
        }
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints)
      mediaStreamRef.current = mediaStream

      const AudioContextClass = window.AudioContext || window.webkitAudioContext
      const audioCtx = new AudioContextClass()
      audioContextRef.current = audioCtx

      const actualSampleRate = audioCtx.sampleRate
      const source = audioCtx.createMediaStreamSource(mediaStream)
      sourceRef.current = source

      const bufferSize = 4096
      const processor = audioCtx.createScriptProcessor(bufferSize, 1, 1)
      processorRef.current = processor

      const silentGain = audioCtx.createGain()
      silentGain.gain.value = 0

      // Buffers to accumulate audio and prevent React render spam
      let pcmBuffer = new Int16Array(0)
      let rmsAccumulator = 0
      let rmsCount = 0
      const CHUNK_SIZE = 8000 // 0.5 seconds at 16kHz to match file upload

      processor.onaudioprocess = (event) => {
        const ws = wsRef.current
        if (!ws || ws.readyState !== WebSocket.OPEN) return

        const inputData = event.inputBuffer.getChannelData(0)
        
        // 1. Accumulate RMS to average it out over the 500ms chunk
        rmsAccumulator += calculateRMS(inputData)
        rmsCount++

        // 2. Resample and convert to PCM16
        const audio16k = resampleTo16k(inputData, actualSampleRate)
        const pcm16 = float32ToPCM16(audio16k)

        // 3. Append new samples to our holding buffer
        const newBuffer = new Int16Array(pcmBuffer.length + pcm16.length)
        newBuffer.set(pcmBuffer, 0)
        newBuffer.set(pcm16, pcmBuffer.length)
        pcmBuffer = newBuffer

        // 4. Only send data when we have a full chunk (matches File Stream behavior)
        while (pcmBuffer.length >= CHUNK_SIZE) {
          const chunk = pcmBuffer.slice(0, CHUNK_SIZE)
          ws.send(chunk.buffer)

          // Update UI Mic Level only twice a second (stops React stuttering)
          const avgRms = rmsCount > 0 ? rmsAccumulator / rmsCount : 0
          setMicLevel(Math.min(Math.round(avgRms * 200), 100))

          // Reset accumulators and keep remainder of buffer
          rmsAccumulator = 0
          rmsCount = 0
          pcmBuffer = pcmBuffer.slice(CHUNK_SIZE)
        }
      }

      source.connect(processor)
      processor.connect(silentGain)
      silentGain.connect(audioCtx.destination)

      const monitorGain = audioCtx.createGain()
      monitorGain.gain.value = 0

      source.connect(monitorGain)
      monitorGain.connect(audioCtx.destination)
      monitorGainRef.current = monitorGain

      if (audioCtx.state === 'suspended') {
        await audioCtx.resume()
      }

      setMicStatus('Live Mic Streaming...')
    } catch (error) {
      console.error('Microphone access error:', error)
      setMicStatus('Mic Permission Denied')
    }
  }

  const stopMicrophoneStream = () => {
    if (processorRef.current) {
      processorRef.current.disconnect()
      processorRef.current = null
    }

    if (sourceRef.current) {
      sourceRef.current.disconnect()
      sourceRef.current = null
    }

    if (monitorGainRef.current) {
      monitorGainRef.current.disconnect()
      monitorGainRef.current = null
    }

    setIsLiveMonitoring(false)

    if (mediaStreamRef.current) {
      mediaStreamRef.current
        .getTracks()
        .forEach((track) => track.stop())

      mediaStreamRef.current = null
    }

    if (
      audioContextRef.current &&
      audioContextRef.current.state !== 'closed'
    ) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }

    if (fileIntervalRef.current) {
      clearInterval(fileIntervalRef.current)
      fileIntervalRef.current = null
    }

    setMicLevel(0)

    if (isConnected) {
      setMicStatus('Connected / Ready')
    }
  }

  const toggleLiveMonitor = () => {
    if (!monitorGainRef.current) return

    const next = !isLiveMonitoring

    monitorGainRef.current.gain.value = next ? 1 : 0

    setIsLiveMonitoring(next)
  }

  /* =========================================================
     AUDIO FILE STREAMING
     ========================================================= */

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0]

    if (!file) return

    if (!contextConfigured) {
      setMicStatus('Configure Security Context First')
      event.target.value = ''
      return
    }

    try {
      stopMicrophoneStream()

      setInputMode('file')
      setMicStatus(`Preparing: ${file.name}`)

      const arrayBuffer = await file.arrayBuffer()

      const AudioContextClass =
        window.AudioContext || window.webkitAudioContext

      const audioCtx = new AudioContextClass()

      const decodedAudio =
        await audioCtx.decodeAudioData(arrayBuffer)

      const channelData =
        decodedAudio.getChannelData(0)

      const sampleRate =
        decodedAudio.sampleRate

      const resampled =
        resampleTo16k(channelData, sampleRate)

      const pcm16 =
        float32ToPCM16(resampled)

      const ws = wsRef.current

      if (
        !ws ||
        ws.readyState !== WebSocket.OPEN
      ) {
        alert(
          'WebSocket is not connected to the backend.'
        )

        await audioCtx.close()
        return
      }

      const chunkSize = 8000
      let offset = 0

      setMicStatus(
        `Streaming File: ${file.name}`
      )

      fileStreamActiveRef.current = true

      fileIntervalRef.current =
        setInterval(() => {
          if (!fileStreamActiveRef.current) {
            clearInterval(fileIntervalRef.current)
            fileIntervalRef.current = null
            return
          }

          if (offset >= pcm16.length) {
            fileStreamActiveRef.current = false

            clearInterval(fileIntervalRef.current)
            fileIntervalRef.current = null

            setMicLevel(0)
            setMicStatus('File Stream Complete')

            audioCtx.close()

            return
          }

          const chunk =
            pcm16.subarray(
              offset,
              offset + chunkSize
            )

          ws.send(chunk)

          const chunkRms =
            calculateRMS(
              resampled.subarray(
                offset,
                Math.min(
                  offset + chunkSize,
                  resampled.length
                )
              )
            )

          setMicLevel(
            Math.min(
              Math.round(chunkRms * 200),
              100
            )
          )

          offset += chunkSize
        }, 500)
    } catch (error) {
      console.error(
        'Audio file processing error:',
        error
      )

      setMicStatus('Audio File Error')

      alert(
        'Failed to decode audio file. Please use a valid WAV/MP3 file.'
      )
    }
  }

  const acknowledgeAlert = () => {
    if (fileIntervalRef.current) {
      console.warn(
        'ACKNOWLEDGE ALERT: stopping active file stream'
      )

      clearInterval(fileIntervalRef.current)
      fileIntervalRef.current = null

      setMicLevel(0)
      setMicStatus('Stream frozen after alert')
    }

    setStreams((prev) => ({
      ...prev,
      [activeStreamId]: {
        ...prev[activeStreamId],
        alert_triggered: false
      }
    }))
  }

  const summary = useMemo(() => {
    const streamList = Object.values(streams)

    const backendStreams = streamList.filter(
      (stream) =>
        stream.ai_probability !== undefined ||
        stream.rolling_score !== undefined ||
        stream.risk_level !== undefined
    )

    return {
      total: streamList.length,
      high: backendStreams.filter(
        (stream) => stream.risk_level === 'HIGH'
      ).length,
      active: backendStreams.filter(
        (stream) => stream.speech_detected === true
      ).length
    }
  }, [streams])

  // =========================================================
  // RENDER LOGIC
  // =========================================================

  // 1. Show Landing Page if not authenticated
  if (!isAuthenticated) {
    return <Hero onLogin={() => setIsAuthenticated(true)} />
  }

  // 2. Show Dashboard if authenticated
  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden bg-[#03040b] font-sans text-white md:flex-row">

      {/* =====================================================
          AURORA BACKGROUND
          ===================================================== */}

      <div className="pointer-events-none fixed inset-0 overflow-hidden">

        {/* Aurora glow */}
        <div className="absolute -left-40 -top-40 h-[560px] w-[560px] rounded-full bg-cyan-400/[0.13] blur-[150px]" />

        <div className="absolute right-[-180px] top-[5%] h-[650px] w-[650px] rounded-full bg-violet-500/[0.16] blur-[170px]" />

        <div className="absolute bottom-[-240px] left-[20%] h-[600px] w-[800px] rounded-full bg-fuchsia-500/[0.10] blur-[180px]" />

        <div className="absolute bottom-[0%] right-[12%] h-[400px] w-[400px] rounded-full bg-emerald-400/[0.08] blur-[140px]" />

        {/* subtle cyan beam */}
        <div className="absolute left-[38%] top-[-10%] h-[750px] w-[1px] rotate-[24deg] bg-gradient-to-b from-transparent via-cyan-300/[0.10] to-transparent blur-[1px]" />

        {/* technical grid */}
        <div
          className="absolute inset-0 opacity-[0.045]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(148,163,184,0.35) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.35) 1px, transparent 1px)',
            backgroundSize: '42px 42px'
          }}
        />

        {/* vignette */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_30%,rgba(2,3,10,0.72)_100%)]" />
      </div>

      {/* =====================================================
          SIDEBAR (EXPANDABLE ON HOVER)
          ===================================================== */}

      <aside className="group relative z-20 flex w-full flex-col border-b border-white/[0.10] bg-[#060711]/90 p-4 shadow-[8px_0_40px_rgba(0,0,0,0.18)] backdrop-blur-2xl transition-all duration-300 ease-in-out md:h-screen md:w-24 md:shrink-0 md:border-b-0 md:border-r md:p-5 md:hover:w-64 lg:md:hover:w-72">

        {/* BRANDING */}

        <div className="mb-8 flex items-center gap-3 overflow-hidden">

          <div className="relative flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-cyan-300/30 bg-gradient-to-br from-cyan-400/20 via-violet-500/20 to-fuchsia-500/20 shadow-[0_0_30px_rgba(34,211,238,0.20)]">

            <div className="absolute inset-0 bg-gradient-to-br from-cyan-300/10 to-fuchsia-400/10" />

            <ShieldCheck
              size={23}
              strokeWidth={2.2}
              className="relative z-10 text-cyan-200 drop-shadow-[0_0_8px_rgba(103,232,249,0.8)]"
            />

            <div className="absolute inset-0 rounded-xl bg-cyan-400/10 blur-md" />
          </div>

          <div className="whitespace-nowrap transition-opacity duration-300 md:opacity-0 md:group-hover:opacity-100">

            <p className="text-[19px] font-extrabold leading-[0.95] tracking-tight text-white drop-shadow-[0_0_14px_rgba(255,255,255,0.12)]">
              VeriVox
            </p>

            <p className="mt-1 bg-gradient-to-r from-cyan-200 via-violet-200 to-fuchsia-200 bg-clip-text text-[9px] font-mono font-semibold uppercase tracking-[0.24em] text-transparent">
              Neural Guard
            </p>

          </div>
        </div>

        {/* NAVIGATION */}

        <nav className="flex flex-1 flex-col gap-2">

          {[
            {
              id: 'overview',
              label: 'Live Dashboard',
              icon: LayoutDashboard
            },
            {
              id: 'adversarial',
              label: 'Adversarial',
              icon: ShieldAlert
            },
            {
              id: 'analytics',
              label: 'Deep Analytics',
              icon: BarChart3
            },
            {
              id: 'history',
              label: 'History',
              icon: HistoryIcon
            },
            {
              id: 'security',
              label: 'Security Report',
              icon: ShieldCheck
            },
            {
              id: 'how',
              label: 'Architecture',
              icon: CircleHelp
            }
          ].map(
            ({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActivePage(id)}
                className={`group/btn relative flex w-full items-center gap-3 overflow-hidden rounded-xl border p-3 text-[13px] font-semibold tracking-[0.01em] transition-all duration-300 ${
                  activePage === id
                    ? 'border-cyan-300/30 bg-gradient-to-r from-cyan-400/[0.14] via-violet-500/[0.12] to-fuchsia-500/[0.10] text-white shadow-[0_0_28px_rgba(34,211,238,0.10),inset_0_1px_0_rgba(255,255,255,0.08)]'
                    : 'border-transparent text-slate-300 hover:border-white/[0.12] hover:bg-white/[0.055] hover:text-white hover:shadow-[0_0_20px_rgba(34,211,238,0.05)]'
                }`}
              >

                {activePage === id && (
                  <>
                    <span className="absolute left-0 top-1/2 h-8 w-[2px] -translate-y-1/2 rounded-full bg-gradient-to-b from-cyan-300 via-violet-400 to-fuchsia-400 shadow-[0_0_12px_rgba(34,211,238,0.9)]" />

                    <span className="absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-cyan-300/[0.07] to-transparent" />
                  </>
                )}

                <Icon
                  size={18}
                  strokeWidth={activePage === id ? 2.2 : 1.9}
                  className={`shrink-0 transition-all ${
                    activePage === id
                      ? 'relative z-10 text-cyan-200 drop-shadow-[0_0_7px_rgba(103,232,249,0.7)]'
                      : 'relative z-10 text-slate-400 group-hover/btn:text-cyan-200 group-hover/btn:drop-shadow-[0_0_6px_rgba(103,232,249,0.5)]'
                  }`}
                />

                <span className="relative z-10 whitespace-nowrap transition-opacity duration-300 md:opacity-0 md:group-hover:opacity-100">
                  {label}
                </span>

                {activePage === id && (
                  <span className="ml-auto size-1.5 shrink-0 rounded-full bg-cyan-300 shadow-[0_0_9px_rgba(103,232,249,0.9)] transition-opacity duration-300 md:opacity-0 md:group-hover:opacity-100" />
                )}
              </button>
            )
          )}
        </nav>

        {/* BOTTOM STATUS, ACTIONS & ADMIN PROFILE */}

        <div className="mt- auto flex flex-col gap-3 pt-4">

          {/* RETURN TO HERO BUTTON */}
          <button
            onClick={() => setIsAuthenticated(false)}
            className="group/btn relative flex w-full items-center gap-2 overflow-hidden rounded-xl border border-cyan-300/20 bg-gradient-to-r from-cyan-400/[0.07] via-violet-500/[0.05] to-fuchsia-500/[0.06] p-2.5 text-left text-[11px] font-mono font-semibold tracking-wide text-cyan-200 shadow-[0_0_22px_rgba(34,211,238,0.05)] transition-all duration-300 hover:border-cyan-300/40 hover:bg-cyan-400/10 hover:text-cyan-100 hover:shadow-[0_0_30px_rgba(34,211,238,0.12)]"
          >
            <LogOut size={16} className="shrink-0 text-cyan-300" />

            <div className="flex flex-1 items-center justify-between whitespace-nowrap transition-opacity duration-300 md:opacity-0 md:group-hover:opacity-100">
              <span>
                Return to Home
              </span>
              <ChevronRight size={14} className="text-cyan-400/50 group-hover/btn:translate-x-0.5" />
            </div>
          </button>

          {/* SYSTEM STATUS CARD */}
          <div className="relative overflow-hidden rounded-xl border border-white/[0.11] bg-white/[0.045] p-3 text-xs backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">

            <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/[0.04] via-transparent to-violet-500/[0.07]" />

            <div className="relative flex items-center gap-2.5">

              <span
                className={`size-2.5 shrink-0 rounded-full ${
                  selected.security_terminated ||
                  securityTerminated
                    ? 'bg-amber-300 shadow-[0_0_14px_rgba(252,211,77,1)]'
                    : isBackendOnline
                    ? 'bg-emerald-300 shadow-[0_0_14px_rgba(52,211,153,0.9)] animate-pulse'
                    : 'bg-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.9)]'
                }`}
              />

              <span className="whitespace-nowrap font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-white transition-opacity duration-300 md:opacity-0 md:group-hover:opacity-100">
                System Status
              </span>
            </div>

            <div className="hidden whitespace-nowrap transition-opacity duration-300 md:group-hover:block md:opacity-0 md:group-hover:opacity-100">
              <span className="relative mt-2 block font-mono text-[9px] font-semibold leading-relaxed tracking-[0.08em] text-slate-400">
                {securityTerminated
                  ? 'TERMINATED · SECURITY ALERT'
                  : isBackendOnline
                  ? isConnected
                    ? 'BACKEND ONLINE · STREAM ACTIVE'
                    : 'BACKEND ONLINE'
                  : 'BACKEND OFFLINE'}
              </span>

              <div className="relative mt-2 h-px w-full bg-gradient-to-r from-cyan-400/20 via-violet-400/10 to-transparent" />

              <div className="relative mt-2 flex items-center justify-between text-[8px] font-mono uppercase tracking-[0.14em] text-slate-500">
                <span>VERIVOX CORE</span>
                <span className="text-cyan-300/70">
                  LIVE
                </span>
              </div>
            </div>
          </div>

          {/* ADMIN PROFILE HANDLING */}
<button 
  onClick={() => setActivePage('admin')}
  className={`group/admin relative flex w-full overflow-hidden rounded-xl border p-2 transition-all duration-300 text-left ${
    activePage === 'admin'
      ? 'border-cyan-300/40 bg-gradient-to-r from-cyan-400/[0.14] via-violet-500/[0.12] to-fuchsia-500/[0.10] shadow-[0_0_20px_rgba(34,211,238,0.15)]'
      : 'border-white/[0.10] bg-white/[0.03] hover:border-cyan-300/30 hover:bg-white/[0.06]'
  }`}
>
  <div className="flex items-center gap-3 w-full">
    <div className={`relative flex size-9 shrink-0 items-center justify-center rounded-lg border transition-colors ${
      activePage === 'admin' 
        ? 'border-cyan-300 bg-cyan-400/30 text-white' 
        : 'border-cyan-400/30 bg-gradient-to-br from-cyan-500/20 via-violet-600/20 to-fuchsia-600/20 text-cyan-200'
    }`}>
      <UserCheck size={18} />
      <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border border-[#060711] bg-emerald-400" />
    </div>

    <div className="flex flex-1 flex-col overflow-hidden whitespace-nowrap transition-opacity duration-300 md:opacity-0 md:group-hover:opacity-100">
      <span className={`truncate text-xs font-bold ${activePage === 'admin' ? 'text-white' : 'text-slate-200'}`}>
        Admin
      </span>
      <span className="truncate text-[10px] font-mono tracking-wider text-cyan-400/80 uppercase">
        Security Admin
      </span>
    </div>
  </div>
</button>

        </div>
      </aside>

      {/* =====================================================
          MAIN CONTENT AREA
          ===================================================== */}

      <div className="relative z-10 flex-1 overflow-y-auto md:h-screen">

        <div className="mx-auto max-w-7xl px-5 py-8 lg:p-10">

          {activePage === 'overview' && (
            <Overview
              micStatus={micStatus}
              inputMode={inputMode}
              micLevel={micLevel}
              isLiveMonitoring={isLiveMonitoring}
              selected={selected}
              activeStreamId={activeStreamId}
              securityTerminated={securityTerminated}
              showInspector={showInspector}
              summary={summary}
              streams={streams}
              startMicrophoneStream={startMicrophoneStream}
              stopMicrophoneStream={stopMicrophoneStream}
              toggleLiveMonitor={toggleLiveMonitor}
              handleFileUpload={handleFileUpload}
              acknowledgeAlert={acknowledgeAlert}
              setActiveStreamId={setActiveStreamId}
              transactionAmountInr={transactionAmountInr}
              setTransactionAmountInr={(value) => {
                setTransactionAmountInr(value)
                transactionAmountRef.current = value
              }}
              selectedScenario={selectedScenario}
              setSelectedScenario={(value) => {
                setSelectedScenario(value)
                selectedScenarioRef.current = value
              }}
              contextConfigured={contextConfigured}
              configureSecurityContext={configureSecurityContext}
            />
          )}

          {activePage === 'adversarial' && (
            <div className="mx-auto max-w-6xl space-y-8">
              <AdversarialRobustness />
            </div>
          )}
          {activePage === 'how' && <Architecture />}
          
          {/* Add this block for the Admin Page */}
          {activePage === 'admin' && (
            <Admin />
          )}

          {activePage === 'analytics' && (
            <Analytics
              streams={streams}
              activeStreamId={activeStreamId}
              setActiveStreamId={setActiveStreamId}
              analytics={analytics}
              selected={selected}
            />
          )}

          {activePage === 'history' && (
            <History
              streams={streams}
              activeStreamId={activeStreamId}
              setActiveStreamId={setActiveStreamId}
              currentHistory={currentHistory}
            />
          )}

          {activePage === 'security' && (
            <SecurityReport
              streams={streams}
              selected={selected}
            />
          )}

          {activePage === 'how' && <Architecture />}
        </div>
      </div>
    </main>
  )
}