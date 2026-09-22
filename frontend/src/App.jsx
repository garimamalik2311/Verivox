'use client'

import { useMemo, useState, useEffect, useRef } from 'react'
import { LayoutDashboard, ShieldAlert, BarChart3, History as HistoryIcon, CircleHelp, ShieldCheck } from 'lucide-react'

// Sub-components
import Overview from './pages/Overview'
import Analytics from './pages/Analytics'
import History from './pages/History'
import Architecture from './pages/Architecture'
import AdversarialRobustness from './components/AdversarialRobustness'
import SecurityReport from './pages/SecurityReport'

// Utilities
import { initialHistories, getAnalyticsData } from './utils/helpers'

export default function App() {
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
  const uniqueStreamIdRef = useRef(`sih_live_${Math.random().toString(36).substring(2, 9)}`)
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
     WEBSOCKET CONNECTION
     ========================================================= */
  useEffect(() => {
    const streamId = uniqueStreamIdRef.current
    const wsUrl = import.meta.env.VITE_RISK_WS_URL || `ws://127.0.0.1:8000/ws/audio?stream_id=${streamId}`
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
      setMicStatus(securityTerminatedRef.current ? 'STREAM TERMINATED — SECURITY ALERT' : 'Disconnected')
    }

    ws.onerror = (error) => {
      console.error('Risk WebSocket error:', error)
      setIsConnected(false)
      setIsBackendOnline(securityTerminatedRef.current)
      setMicStatus(securityTerminatedRef.current ? 'STREAM TERMINATED — SECURITY ALERT' : 'Backend Connection Error')
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
          const newTsEntry = probability !== null && probability !== undefined
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
              alert_triggered: data.alert_triggered === true || existing.alert_triggered === true,
              alert_reason: data.alert_reason || existing.alert_reason || null,
              alert_consecutive_flags: data.alert_triggered === true
                ? (data.consecutive_flags ?? 0)
                : (existing.alert_consecutive_flags ?? null),
              timeSeries: newTsEntry ? [...existingSeries, newTsEntry].slice(-60) : existingSeries,
              name: data.name || existing.name || currentStreamId
            }
          }
        })

        setActiveStreamId(currentStreamId)

        setStreamHistories((prev) => {
          const hist = prev[currentStreamId] || []
          const newEntry = {
            window_id: data.window_id ?? hist.length + 1,
            timestamp: data.timestamp ? new Date(Number(data.timestamp) * 1000).toLocaleTimeString() : new Date().toLocaleTimeString(),
            speech_detected: data.speech_detected ?? (data.ai_probability !== null && data.ai_probability !== undefined),
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

    return () => {
      if (ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.OPEN) {
        console.log('Cleaning up Risk WebSocket:', wsUrl)
        ws.close()
      }
      if (wsRef.current === ws) {
        wsRef.current = null
      }
      stopMicrophoneStream()
    }
  }, [])

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
      const sample2 = index + 1 < input.length ? input[index + 1] : sample1
      output[i] = sample1 + (sample2 - sample1) * fraction
    }
    return output
  }

  const float32ToPCM16 = (float32Data) => {
    const pcm16 = new Int16Array(float32Data.length)
    for (let i = 0; i < float32Data.length; i++) {
      const sample = Math.max(-1, Math.min(1, float32Data[i]))
      pcm16[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff
    }
    return pcm16
  }

  const calculateRMS = (audio) => {
    if (!audio || audio.length === 0) return 0
    let sum = 0
    for (let i = 0; i < audio.length; i++) sum += audio[i] * audio[i]
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

    if (scenario === 'high_value_transaction' && parsedAmount === null) {
      setMicStatus('Transaction Amount Required')
      return false
    }

    const payload = {
      type: 'session_context',
      scenario: scenario === 'high_value_transaction' ? null : scenario,
      transaction_amount_inr:
        scenario === 'high_value_transaction' ? parsedAmount : null,
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

      processor.onaudioprocess = (event) => {
        const ws = wsRef.current
        if (!ws || ws.readyState !== WebSocket.OPEN) return

        const inputData = event.inputBuffer.getChannelData(0)
        const rms = calculateRMS(inputData)
        setMicLevel(Math.min(Math.round(rms * 200), 100))

        const audio16k = resampleTo16k(inputData, actualSampleRate)
        const pcm16 = float32ToPCM16(audio16k)
        if (pcm16.length > 0) {
          ws.send(pcm16.buffer)
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
      mediaStreamRef.current.getTracks().forEach((track) => track.stop())
      mediaStreamRef.current = null
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
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
      const AudioContextClass = window.AudioContext || window.webkitAudioContext
      const audioCtx = new AudioContextClass()
      const decodedAudio = await audioCtx.decodeAudioData(arrayBuffer)
      const channelData = decodedAudio.getChannelData(0)
      const sampleRate = decodedAudio.sampleRate
      const resampled = resampleTo16k(channelData, sampleRate)
      const pcm16 = float32ToPCM16(resampled)

      const ws = wsRef.current
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        alert('WebSocket is not connected to the backend.')
        await audioCtx.close()
        return
      }

      const chunkSize = 8000 // 0.5 sec at 16kHz PCM16
      let offset = 0
      setMicStatus(`Streaming File: ${file.name}`)
      fileStreamActiveRef.current = true

      fileIntervalRef.current = setInterval(() => {
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

        const chunk = pcm16.subarray(offset, offset + chunkSize)
        ws.send(chunk.buffer)

        const chunkRms = calculateRMS(resampled.subarray(offset, Math.min(offset + chunkSize, resampled.length)))
        setMicLevel(Math.min(Math.round(chunkRms * 200), 100))
        offset += chunkSize
      }, 500)
    } catch (error) {
      console.error('Audio file processing error:', error)
      setMicStatus('Audio File Error')
      alert('Failed to decode audio file. Please use a valid WAV/MP3 file.')
    }
  }

  const acknowledgeAlert = () => {
    if (fileIntervalRef.current) {
      console.warn('ACKNOWLEDGE ALERT: stopping active file stream')
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
    const backendStreams = streamList.filter(stream => stream.ai_probability !== undefined || stream.rolling_score !== undefined || stream.risk_level !== undefined)
    return {
      total: streamList.length,
      high: backendStreams.filter(stream => stream.risk_level === 'HIGH').length,
      active: backendStreams.filter(stream => stream.speech_detected === true).length
    }
  }, [streams])

  return (
    <main className="flex min-h-screen flex-col md:flex-row bg-verivox-darkest text-slate-100 font-sans">
      
      {/* =====================================================
          SIDEBAR (Retro Future Theme)
         ===================================================== */}
      <aside className="flex w-full flex-col border-b border-verivox-border bg-verivox-surface/90 p-5 md:h-screen md:w-64 md:shrink-0 md:border-b-0 md:border-r lg:w-72">
        
        {/* BRANDING */}
        <div className="mb-8 flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-verivox-cyan text-verivox-darkest">
            <ShieldCheck size={22} />
          </div>
          <div>
            <p className="text-lg font-bold tracking-tight text-white leading-tight">
              VeriVox <br/>
              <span className="text-[10px] text-verivox-yellow font-mono font-normal uppercase tracking-wider">
                Neural Guard
              </span>
            </p>
          </div>
        </div>

        {/* NAVIGATION */}
        <nav className="flex flex-col gap-2 flex-1">
          {[
            { id: 'overview', label: 'Live Dashboard', icon: LayoutDashboard },
            { id: 'adversarial', label: 'Adversarial', icon: ShieldAlert },
            { id: 'analytics', label: 'Deep Analytics', icon: BarChart3 },
            { id: 'history', label: 'History', icon: HistoryIcon },
            { id: 'security', label: 'Security Report', icon: ShieldCheck },
            { id: 'how', label: 'Architecture', icon: CircleHelp }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActivePage(id)}
              className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-semibold transition-all ${
                activePage === id
                  ? 'bg-verivox-yellow text-verivox-darkest shadow-md shadow-verivox-pink/20'
                  : 'text-slate-400 hover:bg-verivox-cardHover hover:text-white'
              }`}
            >
              <Icon size={18} />
              {label}
            </button>
          ))}
        </nav>

        {/* BOTTOM STATUS & ACTIONS */}
        <div className="mt-8 flex flex-col gap-4">
          <button
            onClick={() => setShowInspector((v) => !v)}
            className="w-full rounded-lg border border-verivox-cyan/40 bg-verivox-cardHover px-4 py-2.5 text-xs font-mono text-verivox-cyan transition hover:bg-verivox-border"
          >
            {showInspector ? 'Hide Contract' : '</> JSON Payload'}
          </button>

          <div className="flex flex-col gap-2 rounded-lg border border-verivox-border bg-verivox-cardHover p-3 text-xs font-medium text-slate-300">
            <div className="flex items-center gap-2">
              <span
                className={`size-2.5 shrink-0 rounded-full ${
                  selected.security_terminated || securityTerminated
                    ? 'bg-verivox-yellow'
                    : isBackendOnline
                    ? 'bg-emerald-400 animate-pulse'
                    : 'bg-verivox-cyan'
                }`}
              />
              <span className="font-mono font-bold text-white">Status</span>
            </div>
            <span className="font-mono text-[10px] text-slate-400 leading-tight">
              {securityTerminated
                ? 'TERMINATED · SECURITY ALERT'
                : isBackendOnline
                ? isConnected
                  ? 'BACKEND ONLINE · STREAM ACTIVE'
                  : 'BACKEND ONLINE'
                : 'BACKEND OFFLINE'}
            </span>
          </div>
        </div>
      </aside>

      {/* =====================================================
          MAIN CONTENT AREA
         ===================================================== */}
      <div className="flex-1 overflow-y-auto md:h-screen bg-verivox-dark">
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
          {activePage === 'security' && <SecurityReport streams={streams} selected={selected} />}
          {activePage === 'how' && <Architecture />}
        </div>
      </div>
      
    </main>
  )
}