'use client'

import { useMemo, useState, useEffect, useRef } from 'react'
import {
  Activity,
  AlertTriangle,
  CircleHelp,
  Fingerprint,
  Gauge,
  GitBranch,
  History,
  LayoutDashboard,
  Mic,
  Radio,
  RadioTower,
  Play,
  Square,
  FileAudio,
  ShieldAlert,
  ShieldCheck,
  Settings2,
  UserCheck,
  Volume2,
  Waves,
  X,
  CheckCircle2,
  Terminal,
  Zap,
  Layers,
  Cpu,
  BarChart3
} from 'lucide-react'

import AdversarialRobustness from './components/AdversarialRobustness'
import SimulationTelemetry from './components/SimulationTelemetry'
import AudioPlaybackBar from './components/AudioPlaybackBar'


/* =========================================================
   STATIC METADATA ONLY
   ---------------------------------------------------------
   IMPORTANT:
   These objects intentionally DO NOT contain:
   - ai_probability
   - rolling_score
   - risk_level
   - consecutive_flags
   - alert_triggered

   Those values must come from the backend.
   ========================================================= */

const initialStreams = {
  call_001: {
    stream_id: 'call_001',
    name: 'Support call'
  },

  call_002: {
    stream_id: 'call_002',
    name: 'Sales call'
  },

  call_003: {
    stream_id: 'call_003',
    name: 'Team meeting'
  }
}

const initialHistories = {}


/* =========================================================
   STATUS PILL
   ========================================================= */

function StatusPill({ status }) {
  const normalizedStatus = status
    ? String(status).toLowerCase()
    : 'clear'

  const styles = {
    high:
      'border-rose-400/30 bg-rose-400/10 text-rose-300',

    medium:
      'border-amber-400/30 bg-amber-400/10 text-amber-300',

    low:
      'border-emerald-400/30 bg-emerald-400/10 text-emerald-300',

    clear:
      'border-slate-700 bg-slate-800/60 text-slate-300',

    verified:
      'border-emerald-400/30 bg-emerald-400/10 text-emerald-300',

    mismatch:
      'border-rose-400/30 bg-rose-400/10 text-rose-300',

    normal:
      'border-emerald-400/30 bg-emerald-400/10 text-emerald-300',

    monitoring:
      'border-amber-400/30 bg-amber-400/10 text-amber-300',

    anomalous:
      'border-rose-400/30 bg-rose-400/10 text-rose-300'
  }

  return (
    <span
      className={`rounded-full border px-2.5 py-1 text-xs font-semibold uppercase ${
        styles[normalizedStatus] || styles.clear
      }`}
    >
      {status || 'CLEAR'}
    </span>
  )
}


/* =========================================================
   SAFE NUMBER HELPERS
   ========================================================= */

function formatProbability(value, digits = 0) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '--'
  }

  return `${(Number(value) * 100).toFixed(digits)}%`
}

function formatScore(value, digits = 3) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '--'
  }

  return Number(value).toFixed(digits)
}


/* =========================================================
   ANALYTICS DATA NORMALIZATION
   Backend RiskResult uses flat fields. Analytics consumes
   this normalized shape so the UI stays independent of
   backend field naming.
   ========================================================= */

function getAnalyticsData(selected = {}) {
  return {
    prosody: {
      pitch_variance:
        selected.prosody_pitch_variance ?? null,
      timing_variance:
        selected.prosody_timing_variance ?? null,
    },

    speaker_verification: {
      match_score:
        selected.speaker_similarity ?? null,
      match:
        selected.speaker_match ?? null,
    },

    vocoder_fingerprint: {
      flagged:
        selected.vocoder_flag ?? false,
      diagnostic_cues:
        Array.isArray(selected.diagnostic_cues)
          ? selected.diagnostic_cues
          : [],
    },

    feature_latency_ms:
      selected.latency_ms ?? null,

    shap_features:
      Array.isArray(selected.shap_features)
        ? selected.shap_features
        : [],

    shap_top_features:
      Array.isArray(selected.shap_top_features)
        ? selected.shap_top_features
        : [],
  }
}


/* =========================================================
   MAIN APP
   ========================================================= */

export default function App() {
  const [activePage, setActivePage] = useState('overview')

  /*
   * These are ONLY metadata until the backend sends real results.
   */
  const [streams, setStreams] = useState(initialStreams)

  const [streamHistories, setStreamHistories] =
    useState(initialHistories)

  const [activeStreamId, setActiveStreamId] =
    useState('call_001')

  const [isConnected, setIsConnected] =
    useState(false)

  const [isBackendOnline, setIsBackendOnline] =
    useState(false)

  const [inputMode, setInputMode] =
    useState('mic')

  const [micStatus, setMicStatus] =
    useState('Disconnected')

  const [securityTerminated, setSecurityTerminated] =
    useState(false)

  const [micLevel, setMicLevel] =
    useState(0)

    const [showInspector, setShowInspector] =
    useState(false)

  // --- Added by Garima (Sprint 1): live mic monitor toggle ---
  const [isLiveMonitoring, setIsLiveMonitoring] =
    useState(false)

  const monitorGainRef = useRef(null)

  const wsRef = useRef(null)

  const uniqueStreamIdRef = useRef(
    `sih_live_${Math.random()
      .toString(36)
      .substring(2, 9)}`
  )

  const audioContextRef = useRef(null)
  const mediaStreamRef = useRef(null)
  const processorRef = useRef(null)
  const sourceRef = useRef(null)
  const fileIntervalRef = useRef(null)
  const fileStreamActiveRef = useRef(false)
  const securityTerminatedRef = useRef(false)

  const selected =
    streams[activeStreamId] ||
    streams.call_001 ||
    {}

  const analytics =
    getAnalyticsData(selected)

  const currentHistory =
    streamHistories[activeStreamId] || []


  /* =========================================================
     WEBSOCKET CONNECTION
     ========================================================= */

  useEffect(() => {
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
      setMicStatus('Connected / Ready')
    }

    ws.onclose = () => {
      console.log('Risk WebSocket closed')

      setIsConnected(false)
      setIsBackendOnline(
        securityTerminatedRef.current
      )

      setMicStatus(
        securityTerminatedRef.current
          ? 'STREAM TERMINATED — SECURITY ALERT'
          : 'Disconnected'
      )
    }

    ws.onerror = (error) => {
      console.error('Risk WebSocket error:', error)

      setIsConnected(false)
      setIsBackendOnline(
        securityTerminatedRef.current
      )
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

        /*
         * STOP FILE STREAM WHEN BACKEND TRIGGERS ALERT
         */
        if (data.alert_triggered === true) {
          console.warn(
            'HIGH-RISK ALERT: HARD STOPPING FILE STREAM'
          )

          securityTerminatedRef.current = true
          setSecurityTerminated(true)

          /*
           * Kill-switch MUST happen before
           * clearing the interval.
           */
          fileStreamActiveRef.current = false

          if (fileIntervalRef.current) {
            clearInterval(
              fileIntervalRef.current
            )

            fileIntervalRef.current = null
          }

          setMicLevel(0)

          setMicStatus(
            'ALERT: Synthetic Voice Clone Detected'
          )
        }

        /*
         * Backend stream ID is authoritative.
         */
        const currentStreamId =
          data.stream_id || streamId

        setStreams((prev) => {
          const existing =
            prev[currentStreamId] || {
              stream_id: currentStreamId,
              name:
                inputMode === 'mic'
                  ? 'Live Mic Stream'
                  : 'Audio File Stream',
              timeSeries: []
            }

          /*
           * IMPORTANT:
           * We are NOT calculating probability.
           *
           * The probability comes directly from:
           *
           * data.ai_probability
           */
          const probability =
            data.ai_probability

          const existingSeries =
            existing.timeSeries || []

          const newTsEntry =
            probability !== null &&
            probability !== undefined
              ? {
                  time:
                    `${existingSeries.length * 3}s`,
                  prob:
                    Math.round(
                      Number(probability) * 100
                    )
                }
              : null

          return {
            ...prev,

            [currentStreamId]: {
              ...existing,

              /*
               * Backend data updates the stream state.
               *
               * ALERT IS LATCHED:
               * Once the backend triggers an alert, later
               * telemetry packets with alert_triggered=false
               * must not immediately hide the UI alert.
               *
               * acknowledgeAlert() explicitly clears it.
               */
              ...data,

              alert_triggered:
                data.alert_triggered === true ||
                existing.alert_triggered === true,

              alert_reason:
                data.alert_reason ||
                existing.alert_reason ||
                null,

              /*
               * Preserve the consecutive-flag count that caused
               * the alert. The live consecutive_flags value may
               * return to 0 after the HIGH state is entered.
               */
              alert_consecutive_flags:
                data.alert_triggered === true
                  ? (data.consecutive_flags ?? 0)
                  : (existing.alert_consecutive_flags ?? null),

              timeSeries:
                newTsEntry
                  ? [
                      ...existingSeries,
                      newTsEntry
                    ].slice(-60)
                  : existingSeries,

              name:
                data.name ||
                existing.name ||
                currentStreamId
            }
          }
        })

        setActiveStreamId(currentStreamId)

        /*
         * HISTORY ALSO COMES FROM BACKEND VALUES.
         */
        setStreamHistories((prev) => {
          const hist =
            prev[currentStreamId] || []

          const newEntry = {
            window_id:
              data.window_id ??
              hist.length + 1,

            timestamp:
              data.timestamp
                ? new Date(
                    Number(data.timestamp) * 1000
                  ).toLocaleTimeString()
                : new Date().toLocaleTimeString(),

            speech_detected:
              data.speech_detected ??
              (
                data.ai_probability !== null &&
                data.ai_probability !== undefined
              ),

            ai_probability:
              data.ai_probability ?? null,

            rolling_score:
              data.rolling_score ?? null,

            risk_level:
              data.risk_level ?? null
          }

          return {
            ...prev,

            [currentStreamId]: [
              newEntry,
              ...hist
            ].slice(0, 30)
          }
        })
      } catch (error) {
        console.error(
          'Failed to parse RiskResult:',
          error
        )
      }
    }

    return () => {
      /*
       * Always close this WebSocket during cleanup.
       *
       * IMPORTANT:
       * readyState may still be CONNECTING. Checking only
       * OPEN allows an abandoned socket to finish connecting,
       * creating duplicate backend connections in React/Vite
       * development mode.
       */
      if (
        ws.readyState === WebSocket.CONNECTING ||
        ws.readyState === WebSocket.OPEN
      ) {
        console.log(
          'Cleaning up Risk WebSocket:',
          wsUrl
        )

        ws.close()
      }

      /*
       * Only clear wsRef if it still points to THIS socket.
       * Never accidentally clear a newer connection.
       */
      if (wsRef.current === ws) {
        wsRef.current = null
      }

      stopMicrophoneStream()
    }

    /*
     * IMPORTANT:
     * No inputMode dependency here.
     *
     * Switching Mic/File should NOT recreate
     * the WebSocket connection.
     */
  }, [])


  /* =========================================================
     AUDIO HELPERS
     ========================================================= */

  const TARGET_SAMPLE_RATE = 16000

  const resampleTo16k = (
    input,
    inputSampleRate
  ) => {
    if (
      inputSampleRate === TARGET_SAMPLE_RATE
    ) {
      return input
    }

    const ratio =
      inputSampleRate / TARGET_SAMPLE_RATE

    const outputLength =
      Math.round(input.length / ratio)

    const output =
      new Float32Array(outputLength)

    for (
      let i = 0;
      i < outputLength;
      i++
    ) {
      const position = i * ratio
      const index = Math.floor(position)
      const fraction = position - index

      const sample1 =
        input[index] || 0

      const sample2 =
        index + 1 < input.length
          ? input[index + 1]
          : sample1

      output[i] =
        sample1 +
        (sample2 - sample1) * fraction
    }

    return output
  }


  const float32ToPCM16 = (
    float32Data
  ) => {
    const pcm16 =
      new Int16Array(float32Data.length)

    for (
      let i = 0;
      i < float32Data.length;
      i++
    ) {
      const sample =
        Math.max(
          -1,
          Math.min(
            1,
            float32Data[i]
          )
        )

      pcm16[i] =
        sample < 0
          ? sample * 0x8000
          : sample * 0x7fff
    }

    return pcm16
  }


  const calculateRMS = (audio) => {
    if (
      !audio ||
      audio.length === 0
    ) {
      return 0
    }

    let sum = 0

    for (
      let i = 0;
      i < audio.length;
      i++
    ) {
      sum += audio[i] * audio[i]
    }

    return Math.sqrt(
      sum / audio.length
    )
  }


  /* =========================================================
     MICROPHONE STREAM
     ========================================================= */

  const startMicrophoneStream =
    async () => {
      try {
        setInputMode('mic')
        setMicStatus('Connecting Mic...')

        const constraints = {
          audio: {
            channelCount: {
              ideal: 1
            },
            echoCancellation: {
              exact: false
            },
            noiseSuppression: {
              exact: false
            },
            autoGainControl: {
              exact: false
            }
          }
        }

        const mediaStream =
          await navigator.mediaDevices
            .getUserMedia(
              constraints
            )

        mediaStreamRef.current =
          mediaStream

        const AudioContextClass =
          window.AudioContext ||
          window.webkitAudioContext

        const audioCtx =
          new AudioContextClass()

        audioContextRef.current =
          audioCtx

        const actualSampleRate =
          audioCtx.sampleRate

        const source =
          audioCtx.createMediaStreamSource(
            mediaStream
          )

        sourceRef.current =
          source

        /*
         * 4096 sample browser buffer.
         *
         * Backend still receives:
         * 16kHz
         * mono
         * PCM16
         */
        const bufferSize = 4096

        const processor =
          audioCtx.createScriptProcessor(
            bufferSize,
            1,
            1
          )

        processorRef.current =
          processor

        const silentGain =
          audioCtx.createGain()

        silentGain.gain.value = 0

        processor.onaudioprocess =
          (event) => {
            const ws =
              wsRef.current

            if (
              !ws ||
              ws.readyState !==
                WebSocket.OPEN
            ) {
              return
            }

            const inputData =
              event.inputBuffer
                .getChannelData(0)

            /*
             * Frontend visualization only.
             *
             * This does NOT affect
             * backend risk.
             */
            const rms =
              calculateRMS(
                inputData
              )

            setMicLevel(
              Math.min(
                Math.round(
                  rms * 200
                ),
                100
              )
            )

            const audio16k =
              resampleTo16k(
                inputData,
                actualSampleRate
              )

            const pcm16 =
              float32ToPCM16(
                audio16k
              )

            if (
              pcm16.length > 0
            ) {
              ws.send(
                pcm16.buffer
              )
            }
          }

        source.connect(processor)

        processor.connect(
          silentGain
        )

        silentGain.connect(
          audioCtx.destination
        )

        // --- Added by Garima (Sprint 1): live mic monitor ---
        // Separate gain node, tapped directly off the mic source (not
        // the processor), so muting/unmuting has zero effect on the
        // PCM16 stream sent to the backend.
        const monitorGain =
          audioCtx.createGain()

        // Starts muted — user opts in via the Playback Bar toggle.
        // NOTE: if listening over speakers (not headphones), this can
        // cause feedback/echo since it's raw, unprocessed mic input.
        monitorGain.gain.value = 0

        source.connect(monitorGain)

        monitorGain.connect(
          audioCtx.destination
        )

        monitorGainRef.current =
          monitorGain

        if (
          audioCtx.state ===
          'suspended'
        ) {
          await audioCtx.resume()
        }

        setMicStatus(
          'Live Mic Streaming...'
        )
      } catch (error) {
        console.error(
          'Microphone access error:',
          error
        )

        setMicStatus(
          'Mic Permission Denied'
        )
      }
    }


  const stopMicrophoneStream =
    () => {
      if (
        processorRef.current
      ) {
        processorRef.current
          .disconnect()

        processorRef.current =
          null
      }

      if (
        sourceRef.current
      ) {
        sourceRef.current
          .disconnect()

        sourceRef.current =
          null
      }

      // --- Added by Garima (Sprint 1): clean up live monitor ---
      if (
        monitorGainRef.current
      ) {
        monitorGainRef.current
          .disconnect()

        monitorGainRef.current =
          null
      }

      setIsLiveMonitoring(false)

      if (
        mediaStreamRef.current
      ) {
        mediaStreamRef.current
          .getTracks()
          .forEach(
            (track) =>
              track.stop()
          )

        mediaStreamRef.current =
          null
      }

      if (
        audioContextRef.current &&
        audioContextRef.current
          .state !== 'closed'
      ) {
        audioContextRef.current.close()

        audioContextRef.current =
          null
      }

      if (
        fileIntervalRef.current
      ) {
        clearInterval(
          fileIntervalRef.current
        )

        fileIntervalRef.current =
          null
      }

      setMicLevel(0)

      if (isConnected) {
        setMicStatus(
          'Connected / Ready'
        )
      }
    }


  // --- Added by Garima (Sprint 1): toggle live mic monitor ---
  const toggleLiveMonitor = () => {
    if (!monitorGainRef.current) return

    const next = !isLiveMonitoring
    monitorGainRef.current.gain.value = next ? 1 : 0
    setIsLiveMonitoring(next)
  }


  /* =========================================================
     AUDIO FILE STREAMING
     ========================================================= */
  const handleFileUpload =
    async (event) => {
      const file =
        event.target.files?.[0]

      if (!file) {
        return
      }

      try {
        stopMicrophoneStream()

        setInputMode('file')

        setMicStatus(
          `Preparing: ${file.name}`
        )

        const arrayBuffer =
          await file.arrayBuffer()

        const AudioContextClass =
          window.AudioContext ||
          window.webkitAudioContext

        const audioCtx =
          new AudioContextClass()

        const decodedAudio =
          await audioCtx.decodeAudioData(
            arrayBuffer
          )

        const channelData =
          decodedAudio.getChannelData(0)

        const sampleRate =
          decodedAudio.sampleRate

        const resampled =
          resampleTo16k(
            channelData,
            sampleRate
          )

        const pcm16 =
          float32ToPCM16(
            resampled
          )

        const ws =
          wsRef.current

        if (
          !ws ||
          ws.readyState !==
            WebSocket.OPEN
        ) {
          alert(
            'WebSocket is not connected to the backend.'
          )

          await audioCtx.close()

          return
        }

        /*
         * Approximately 0.5 second chunks
         * at 16kHz PCM16.
         *
         * 8000 samples = 0.5 sec.
         */
        const chunkSize = 8000

        let offset = 0

        setMicStatus(
          `Streaming File: ${file.name}`
        )

        fileStreamActiveRef.current = true

        fileIntervalRef.current =
          setInterval(() => {

            /*
             * HARD STOP KILL-SWITCH
             * Never send another chunk after alert/acknowledge.
             */
            if (!fileStreamActiveRef.current) {
              clearInterval(
                fileIntervalRef.current
              )

              fileIntervalRef.current = null
              return
            }

            if (
              offset >=
              pcm16.length
            ) {
              fileStreamActiveRef.current = false

              clearInterval(
                fileIntervalRef.current
              )

              fileIntervalRef.current =
                null

              setMicLevel(0)

              setMicStatus(
                'File Stream Complete'
              )

              audioCtx.close()

              return
            }

            const chunk =
              pcm16.subarray(
                offset,
                offset + chunkSize
              )

            console.log(
              'FILE CHUNK SENT:',
              offset,
              '/',
              pcm16.length
            )

            ws.send(
              chunk.buffer
            )

            /*
             * Visualization only.
             */
            const chunkRms =
              calculateRMS(
                resampled.subarray(
                  offset,
                  Math.min(
                    offset +
                      chunkSize,
                    resampled.length
                  )
                )
              )

            setMicLevel(
              Math.min(
                Math.round(
                  chunkRms * 200
                ),
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

        setMicStatus(
          'Audio File Error'
        )

        alert(
          'Failed to decode audio file. Please use a valid WAV/MP3 file.'
        )
      }
    }


  /* =========================================================
     LIVE GRAPH
     ========================================================= */

  const renderLiveGraph = (
    timeSeries = []
  ) => {
    const points =
      timeSeries.length > 0
        ? timeSeries
        : [
            {
              time: 'Waiting',
              prob: 0
            }
          ]

    const width = 600
    const height = 240
    const padding = 30
    const maxProb = 100

    const coords =
      points.map(
        (point, index) => {
          const x =
            padding +
            (index /
              Math.max(
                points.length - 1,
                1
              )) *
              (width -
                padding * 2)

          const probability =
            Number(point.prob) || 0

          const y =
            height -
            padding -
            (probability /
              maxProb) *
              (height -
                padding * 2)

          return {
            x,
            y,
            ...point
          }
        }
      )

    const pathString =
      coords.reduce(
        (acc, curr, index) =>
          index === 0
            ? `M ${curr.x} ${curr.y}`
            : `${acc} L ${curr.x} ${curr.y}`,
        ''
      )

    const areaString =
      coords.length > 0
        ? `${pathString} L ${
            coords[
              coords.length - 1
            ].x
          } ${height - padding} L ${
            coords[0].x
          } ${height - padding} Z`
        : ''

    /*
     * IMPORTANT:
     *
     * This is ONLY a visual reference line.
     *
     * It does NOT calculate risk.
     *
     * Your backend Risk Engine remains
     * responsible for deciding risk.
     */
    const thresholdY =
      height -
      padding -
      (70 / maxProb) *
        (height -
          padding * 2)

    return (
      <div className="relative w-full overflow-hidden rounded-2xl bg-[#090d16] border border-slate-800/80 p-4 shadow-xl">

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2">

          <div>
            <p className="text-sm font-bold text-white">
              Synthetic Voice Probability
            </p>

            <p className="text-[10px] text-slate-500 font-mono mt-1">
              Backend Risk Engine telemetry
            </p>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs">

            <span className="flex items-center gap-1.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 px-2.5 py-1 rounded-full">
              <span className="size-2 rounded-full bg-cyan-400 animate-pulse" />

              {inputMode === 'mic'
                ? 'LIVE MIC'
                : 'AUDIO FILE'}
            </span>

            <span className="text-slate-300">
              {selected.name ||
                activeStreamId}
            </span>

          </div>
        </div>


        <div className="grid grid-cols-1 lg:grid-cols-[1fr_240px] gap-4 items-center">

          <div className="relative h-[220px] w-full">

            <svg
              viewBox={`0 0 ${width} ${height}`}
              className="w-full h-full overflow-visible"
            >

              <defs>
                <linearGradient
                  id="probGradient"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="0%"
                    stopColor="#f43f5e"
                    stopOpacity="0.35"
                  />

                  <stop
                    offset="100%"
                    stopColor="#f43f5e"
                    stopOpacity="0"
                  />
                </linearGradient>
              </defs>


              {[0, 25, 50, 75, 100].map(
                (value) => {
                  const y =
                    height -
                    padding -
                    (value /
                      maxProb) *
                      (height -
                        padding * 2)

                  return (
                    <g key={value}>

                      <line
                        x1={padding}
                        y1={y}
                        x2={
                          width -
                          padding
                        }
                        y2={y}
                        stroke="#1e293b"
                        strokeDasharray="3 3"
                      />

                      <text
                        x={
                          padding -
                          8
                        }
                        y={y + 3}
                        fill="#64748b"
                        fontSize="10"
                        textAnchor="end"
                        className="font-mono"
                      >
                        {value}%
                      </text>

                    </g>
                  )
                }
              )}


              <line
                x1={padding}
                y1={thresholdY}
                x2={
                  width -
                  padding
                }
                y2={thresholdY}
                stroke="#22d3ee"
                strokeDasharray="4 4"
                strokeWidth="1.5"
              />


              {coords.length > 1 && (
                <>
                  <path
                    d={areaString}
                    fill="url(#probGradient)"
                  />

                  <path
                    d={pathString}
                    fill="none"
                    stroke="#f43f5e"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </>
              )}


              {coords.map(
                (point, index) => {
                  const isLast =
                    index ===
                    coords.length - 1

                  return (
                    <g key={index}>

                      <circle
                        cx={point.x}
                        cy={point.y}
                        r={
                          isLast
                            ? 5
                            : 3
                        }
                        className={
                          isLast
                            ? 'fill-rose-500'
                            : 'fill-rose-400'
                        }
                      />

                      <circle
                        cx={point.x}
                        cy={point.y}
                        r={
                          isLast
                            ? 4
                            : 2
                        }
                        className="fill-white"
                      />

                    </g>
                  )
                }
              )}

            </svg>

            <div className="flex justify-between px-7 text-[10px] font-mono text-slate-500">
              <span>Live</span>
              <span>History</span>
              <span>Window stream</span>
            </div>

          </div>


          {/* =================================================
              LIVE SIDE PANEL
             ================================================= */}

          <div className="rounded-xl border border-slate-800 bg-[#0c1017] p-4">

            <div className="space-y-4">

              <div>
                <p className="text-[10px] text-slate-400 font-mono">
                  AI Probability
                </p>

                <p
                  className={`text-3xl font-black font-mono ${
                    selected.ai_probability >
                    0.7
                      ? 'text-rose-500'
                      : 'text-emerald-400'
                  }`}
                >
                  {formatProbability(
                    selected.ai_probability
                  )}
                </p>
              </div>


              <div>
                <p className="text-[10px] text-slate-400 font-mono">
                  Rolling Risk Score
                </p>

                <p className="text-2xl font-bold font-mono text-cyan-300">
                  {formatScore(
                    selected.rolling_score,
                    3
                  )}
                </p>
              </div>


              <div>
                <p className="text-[10px] text-slate-400 font-mono mb-2">
                  Backend Risk State
                </p>

                <StatusPill
                  status={
                    selected.risk_level
                  }
                />
              </div>

            </div>


            <div className="mt-4 pt-3 border-t border-slate-800/80">

              <p className="text-xs text-slate-300 font-mono">

                <span className="font-bold text-cyan-400">
                  {selected.consecutive_flags ??
                    '--'}
                </span>{' '}

                current consecutive flags

              </p>

              {selected.alert_triggered &&
                selected.alert_consecutive_flags != null && (
                  <p className="mt-2 text-xs text-rose-300 font-mono">

                    <span className="font-bold text-rose-400">
                      {selected.alert_consecutive_flags}
                    </span>{' '}

                    consecutive flags at alert

                  </p>
                )}

            </div>

          </div>

        </div>
      </div>
    )
  }


  /* =========================================================
     SUMMARY
     ========================================================= */

  const summary = useMemo(() => {
    const streamList =
      Object.values(streams)

    const backendStreams =
      streamList.filter(
        (stream) =>
          stream.ai_probability !==
            undefined ||
          stream.rolling_score !==
            undefined ||
          stream.risk_level !==
            undefined
      )

    return {
      total:
        streamList.length,

      high:
        backendStreams.filter(
          (stream) =>
            stream.risk_level ===
            'HIGH'
        ).length,

      active:
        backendStreams.filter(
          (stream) =>
            stream.speech_detected ===
            true
        ).length
    }
  }, [streams])


  /* =========================================================
     SIMULATION TELEMETRY RESULT
     ---------------------------------------------------------
     Simulation component can still inject a backend-like
     RiskResult for demo/testing.

     IMPORTANT:
     We do NOT calculate risk here.
     ========================================================= */

  const handleLiveAudioResult =
    (result) => {
      if (!result) {
        return
      }

      const streamId =
        result.stream_id ||
        activeStreamId

      setStreams((prev) => {
        const current =
          prev[streamId] || {
            stream_id: streamId,
            name: 'Live Stream',
            timeSeries: []
          }

        const newProbability =
          result.ai_probability

        const timeSeries =
          current.timeSeries || []

        const newPoint =
          newProbability !==
            null &&
          newProbability !==
            undefined
            ? {
                time:
                  `${timeSeries.length * 3}s`,
                prob:
                  Math.round(
                    Number(
                      newProbability
                    ) * 100
                  )
              }
            : null

        return {
          ...prev,

          [streamId]: {
            ...current,

            /*
             * Everything below is backend data.
             */
            ...result,

            stream_id:
              streamId,

            name:
              result.name ||
              current.name ||
              streamId,

            timeSeries:
              newPoint
                ? [
                    ...timeSeries,
                    newPoint
                  ].slice(-60)
                : timeSeries
          }
        }
      })


      setStreamHistories((prev) => {
        const history =
          prev[streamId] || []

        const entry = {
          window_id:
            result.window_id ??
            history.length + 1,

          timestamp:
            new Date().toLocaleTimeString(),

          speech_detected:
            result.speech_detected ??
            true,

          ai_probability:
            result.ai_probability ??
            null,

          rolling_score:
            result.rolling_score ??
            null,

          risk_level:
            result.risk_level ??
            null
        }

        return {
          ...prev,

          [streamId]: [
            entry,
            ...history
          ].slice(0, 30)
        }
      })


      setActiveStreamId(streamId)
    }


  /* =========================================================
     ACKNOWLEDGE ALERT
     ---------------------------------------------------------
     This only hides the UI alert locally.
     It does NOT modify backend risk state.
     ========================================================= */

  const acknowledgeAlert =
    () => {
      /*
       * Safety backstop:
       * acknowledging an alert must NEVER resume
       * or allow an active file stream to continue.
       */
      if (fileIntervalRef.current) {
        console.warn(
          'ACKNOWLEDGE ALERT: stopping active file stream'
        )

        clearInterval(
          fileIntervalRef.current
        )

        fileIntervalRef.current = null

        setMicLevel(0)

        setMicStatus(
          'Stream frozen after alert'
        )
      }

      /*
       * Acknowledge only dismisses the UI alert.
       * Backend risk state is NOT modified.
       */
      setStreams((prev) => ({
        ...prev,

        [activeStreamId]: {
          ...prev[
            activeStreamId
          ],

          alert_triggered: false
        }
      }))
    }


  /* =========================================================
     RENDER
     ========================================================= */

  return (
    <main className="min-h-screen bg-[#07090e] text-slate-100 font-sans">


      {/* =====================================================
          HEADER
         ===================================================== */}

      <header className="border-b border-slate-800/80 bg-[#0c1017]/90 backdrop-blur">

        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-5 lg:flex-row lg:items-center lg:justify-between">

          <div className="flex items-center gap-3">

            <div className="flex size-10 items-center justify-center rounded-xl bg-cyan-400 text-slate-950">
              <ShieldCheck size={22} />
            </div>

            <div>

              <p className="text-lg font-bold tracking-tight text-white">
                VeriVox{' '}
                <span className="text-xs text-cyan-400 font-mono font-normal">
                  Neural Guard
                </span>
              </p>

              <p className="text-xs text-slate-400 font-mono">
                Real-time deepfake & synthetic voice interceptor
              </p>

            </div>

          </div>


          <nav className="flex flex-wrap gap-1 rounded-xl border border-slate-800 bg-[#07090e] p-1">

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
                icon: History
              },

              {
                id: 'how',
                label: 'Architecture',
                icon: CircleHelp
              }
            ].map(
              ({
                id,
                label,
                icon: Icon
              }) => (
                <button
                  key={id}
                  onClick={() =>
                    setActivePage(id)
                  }
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                    activePage === id
                      ? 'bg-cyan-400 text-slate-950 shadow-md shadow-cyan-400/20'
                      : 'text-slate-400 hover:bg-[#121824] hover:text-white'
                  }`}
                >
                  <Icon size={15} />
                  {label}
                </button>
              )
            )}

          </nav>


          <div className="flex items-center gap-3">

            <button
              onClick={() =>
                setShowInspector(
                  (value) => !value
                )
              }
              className="text-xs bg-[#121824] hover:bg-slate-800 text-cyan-300 px-3 py-1.5 rounded-lg border border-cyan-500/30 transition font-mono"
            >
              {showInspector
                ? 'Hide Contract'
                : '</> JSON Payload'}
            </button>


            <div className="flex items-center gap-2 text-xs font-medium text-slate-300 bg-[#121824] px-3 py-1.5 rounded-lg border border-slate-800">

              <span
                className={`size-2.5 rounded-full ${
                  selected.security_terminated || securityTerminated
                    ? 'bg-amber-400'
                    : isBackendOnline
                    ? 'bg-emerald-400 animate-pulse'
                    : 'bg-rose-500'
                }`}
              />

              <span className="font-mono">
                {securityTerminated
                  ? 'BACKEND ONLINE · STREAM TERMINATED'
                  : isBackendOnline
                  ? isConnected
                    ? 'BACKEND ONLINE · STREAM ACTIVE'
                    : 'BACKEND ONLINE'
                  : 'BACKEND OFFLINE'}
              </span>

            </div>

          </div>

        </div>

      </header>


      <div className="mx-auto max-w-7xl px-5 py-8 lg:py-10">


        {/* ===================================================
            OVERVIEW
           =================================================== */}

        {activePage === 'overview' && (
          <div className="space-y-8">


            <section className="max-w-3xl">

              <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-cyan-400 font-mono">
                Live protection
              </p>

              <h1 className="text-3xl font-black tracking-tight text-white md:text-4xl">
                Keep every conversation trustworthy.
              </h1>

              <p className="mt-3 max-w-2xl leading-7 text-slate-400 text-sm">
                VeriVox receives live audio, processes rolling windows through
                the backend inference pipeline, and displays the resulting
                synthetic-voice risk telemetry in real time.
              </p>

            </section>


            {/* =================================================
                AUDIO INPUT
               ================================================= */}

            <section className="rounded-2xl border border-cyan-500/30 bg-[#0c1017]/90 p-5 shadow-xl relative overflow-hidden">

              <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                <RadioTower
                  size={120}
                  className="text-cyan-400"
                />
              </div>


              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">

                <div className="flex items-center gap-3">

                  <div
                    className={`size-10 rounded-xl flex items-center justify-center border ${
                      micStatus ===
                      'Live Mic Streaming...'
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 animate-pulse'
                        : 'bg-cyan-400/10 text-cyan-300 border-cyan-400/20'
                    }`}
                  >
                    <Mic size={20} />
                  </div>


                  <div>

                    <h2 className="text-sm font-bold text-white flex items-center gap-2">

                      Live Voice Ingestion

                      <span className="text-[10px] px-2 py-0.5 rounded-full font-mono uppercase bg-slate-800 text-slate-400">
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
                    onClick={() => {
                      if (
                        micStatus ===
                        'Live Mic Streaming...'
                      ) {
                        stopMicrophoneStream()
                      } else {
                        startMicrophoneStream()
                      }
                    }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold font-mono transition ${
                      micStatus ===
                      'Live Mic Streaming...'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        : 'bg-cyan-400 text-slate-950 hover:bg-cyan-300'
                    }`}
                  >

                    {micStatus ===
                    'Live Mic Streaming...' ? (
                      <>
                        <Square size={14} />
                        Stop Mic
                      </>
                    ) : (
                      <>
                        <Play size={14} />
                        Start Live Mic
                      </>
                    )}

                  </button>


                  <label className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold font-mono bg-slate-800 text-cyan-300 border border-cyan-500/30 hover:bg-slate-700 cursor-pointer transition">

                    <FileAudio size={14} />

                    Upload Audio

                    <input
                      type="file"
                      accept="audio/*"
                      onChange={
                        handleFileUpload
                      }
                      className="hidden"
                    />

                  </label>

                </div>

              </div>


              {/* RMS / SIGNAL HUD */}

              <div className="grid grid-cols-1 md:grid-cols-[1fr_280px] gap-6 items-center bg-[#090d16] p-4 rounded-xl border border-slate-800">

                <div className="space-y-2">

                  <div className="flex justify-between items-center text-[11px] font-mono text-slate-400">

                    <span>
                      Active Audio Signal
                    </span>

                    <span className="text-cyan-400">
                      {micLevel}% RMS
                    </span>

                  </div>


                  <div className="flex items-center gap-1 h-12 bg-black/40 px-3 py-2 rounded-lg border border-slate-800/80 overflow-hidden">

                    {Array.from({
                      length: 32
                    }).map(
                      (_, index) => {

                        const wave =
                          20 +
                          (
                            (
                              index *
                              17
                            ) %
                            40
                          )

                        const height =
                          micLevel > 0
                            ? Math.min(
                                100,
                                Math.max(
                                  10,
                                  micLevel *
                                    (
                                      0.45 +
                                      wave /
                                        100
                                    )
                                )
                              )
                            : 10

                        return (
                          <div
                            key={index}
                            className={`flex-1 rounded-full transition-all duration-75 ${
                              micLevel >
                              15
                                ? 'bg-rose-500'
                                : 'bg-cyan-400'
                            }`}
                            style={{
                              height:
                                `${height}%`
                            }}
                          />
                        )
                      }
                    )}

                  </div>

                </div>


                <div className="grid grid-cols-2 gap-3 text-xs font-mono border-l border-slate-800/80 pl-4">

                  <div>
                    <span className="text-slate-500 block text-[10px]">
                      INPUT
                    </span>

                    <span className="text-white font-bold">
                      {inputMode ===
                      'mic'
                        ? 'MIC'
                        : 'FILE'}
                    </span>
                  </div>


                  <div>
                    <span className="text-slate-500 block text-[10px]">
                      SAMPLE RATE
                    </span>

                    <span className="text-cyan-300 font-bold">
                      16 kHz
                    </span>
                  </div>


                  <div>
                    <span className="text-slate-500 block text-[10px]">
                      CHANNELS
                    </span>

                    <span className="text-white font-bold">
                      1 Mono
                    </span>
                  </div>


                  <div>
                    <span className="text-slate-500 block text-[10px]">
                      TRANSPORT
                    </span>

                    <span className="text-cyan-300 font-bold">
                      WebSocket
                    </span>
                  </div>

                </div>

              </div>

              {/* --- Added by Garima (Sprint 1): Live Mic Playback Bar --- */}
              {inputMode === 'mic' &&
                micStatus === 'Live Mic Streaming...' && (
                  <div className="mt-4">
                    <AudioPlaybackBar
                      label="Live Mic Monitor"
                      isPlaying={isLiveMonitoring}
                      level={micLevel}
                      onToggle={toggleLiveMonitor}
                    />
                  </div>
                )}

            </section>


            {/* =================================================
                ALERT
               ================================================= */}

            {selected.alert_triggered && (
              <section className="flex flex-col gap-4 rounded-2xl border border-rose-500/50 bg-rose-950/30 p-5 md:flex-row md:items-center md:justify-between shadow-xl">

                <div className="flex items-start gap-3">

                  <div className="mt-0.5 text-rose-400">
                    <AlertTriangle size={23} />
                  </div>

                  <div>

                    <h2 className="font-bold text-rose-200 text-sm">
                      Synthetic Voice Clone Detected
                    </h2>

                    <p className="mt-1 text-xs leading-5 text-rose-300/80 font-mono">
                      {selected.alert_reason === 'persistent_high_ai_probability'
                        ? `High synthetic-voice probability detected across ${selected.alert_consecutive_flags || selected.consecutive_flags || 3} consecutive audio windows.`
                        : selected.alert_reason ||
                          'Backend Risk Engine has triggered an alert for this stream.'}
                    </p>

                  </div>

                </div>


                <button
                  onClick={
                    acknowledgeAlert
                  }
                  className="flex shrink-0 items-center gap-2 text-xs font-bold text-rose-300 hover:text-white bg-rose-500/20 px-3 py-1.5 rounded-lg border border-rose-500/40 transition"
                >
                  <X size={14} />
                  Acknowledge Alert
                </button>

              </section>
            )}


            {/* =================================================
                GRAPH
               ================================================= */}

            {renderLiveGraph(
              selected.timeSeries
            )}


            {/* =================================================
                SUMMARY CARDS
               ================================================= */}

            <section className="grid gap-4 sm:grid-cols-3">

              <div className="rounded-2xl border border-slate-800 bg-[#0c1017]/90 p-5 shadow-xl">

                <div className="flex items-center justify-between">

                  <p className="text-xs font-semibold text-slate-400">
                    Monitored Channels
                  </p>

                  <Radio
                    size={18}
                    className="text-cyan-400"
                  />

                </div>

                <p className="mt-4 text-3xl font-black text-white">
                  {summary.total}
                </p>

                <p className="mt-1 text-xs text-slate-500 font-mono">
                  Backend streams
                </p>

              </div>


              <div className="rounded-2xl border border-slate-800 bg-[#0c1017]/90 p-5 shadow-xl">

                <div className="flex items-center justify-between">

                  <p className="text-xs font-semibold text-slate-400">
                    Need Attention
                  </p>

                  <AlertTriangle
                    size={18}
                    className="text-rose-400"
                  />

                </div>

                <p className="mt-4 text-3xl font-black text-white">
                  {summary.high}
                </p>

                <p className="mt-1 text-xs text-slate-500 font-mono">
                  Backend HIGH risk streams
                </p>

              </div>


              <div className="rounded-2xl border border-slate-800 bg-[#0c1017]/90 p-5 shadow-xl">

                <div className="flex items-center justify-between">

                  <p className="text-xs font-semibold text-slate-400">
                    Speech Active
                  </p>

                  <Volume2
                    size={18}
                    className="text-cyan-400"
                  />

                </div>

                <p className="mt-4 text-3xl font-black text-white">
                  {summary.active}
                </p>

                <p className="mt-1 text-xs text-slate-500 font-mono">
                  Backend VAD state
                </p>

              </div>

            </section>


            {/* =================================================
                CONVERSATIONS + SELECTED STREAM
               ================================================= */}

            <section className="grid gap-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.5fr)]">


              {/* CONVERSATION LIST */}

              <div className="space-y-4 rounded-2xl border border-slate-800 bg-[#0c1017]/90 p-5 shadow-xl">

                <div className="flex items-center justify-between">

                  <div>

                    <h2 className="font-bold text-sm text-white">
                      Your Conversations
                    </h2>

                    <p className="mt-0.5 text-xs text-slate-400">
                      Select a backend stream to inspect
                    </p>

                  </div>

                  <Settings2
                    size={18}
                    className="text-slate-500"
                  />

                </div>


                <div className="space-y-2">

                  {Object.keys(
                    streams
                  ).map((id) => {

                    const stream =
                      streams[id]

                    return (
                      <button
                        key={id}
                        onClick={() =>
                          setActiveStreamId(
                            id
                          )
                        }
                        className={`w-full rounded-xl border p-4 text-left transition ${
                          activeStreamId ===
                          id
                            ? 'border-cyan-400/60 bg-cyan-950/20'
                            : 'border-slate-800/80 bg-[#121824]/60 hover:border-slate-700 hover:bg-[#121824]'
                        }`}
                      >

                        <div className="flex items-start justify-between gap-3">

                          <div>

                            <p className="font-bold text-sm text-white">
                              {stream.name ||
                                id}
                            </p>

                            <p className="mt-1 font-mono text-[11px] text-slate-400">
                              {id}
                            </p>

                          </div>

                          <StatusPill
                            status={
                              stream.risk_level
                            }
                          />

                        </div>


                        <div className="mt-3 flex items-center justify-between text-xs text-slate-400">

                          <span>
                            {stream.speech_detected ===
                            true
                              ? 'Speech active'
                              : stream.speech_detected ===
                                false
                              ? 'Silence'
                              : 'Waiting for backend'}
                          </span>

                          <span className="font-mono text-cyan-300 font-semibold">
                            Score{' '}
                            {formatScore(
                              stream.rolling_score,
                              2
                            )}
                          </span>

                        </div>

                      </button>
                    )
                  })}

                </div>

              </div>


              {/* SELECTED STREAM */}

              <div className="space-y-6 rounded-2xl border border-slate-800 bg-[#0c1017]/90 p-5 shadow-xl md:p-6">

                <div className="flex flex-col gap-3 border-b border-slate-800 pb-5 sm:flex-row sm:items-center sm:justify-between">

                  <div>

                    <div className="flex items-center gap-2.5">

                      <h2 className="font-bold text-base text-white">
                        {selected.name ||
                          activeStreamId}
                      </h2>

                      <StatusPill
                        status={
                          selected.risk_level
                        }
                      />

                    </div>

                    <p className="mt-1 text-xs text-slate-400">
                      Backend-generated RiskResult telemetry
                    </p>

                  </div>


                  <span className="font-mono text-xs text-cyan-400 bg-cyan-950/60 border border-cyan-800/60 px-2.5 py-1 rounded-lg">
                    {activeStreamId}
                  </span>

                </div>


                {/* RISK METRICS */}

                <div className="grid gap-4 sm:grid-cols-2">

                  <div className="rounded-xl border border-slate-800 bg-[#121824]/80 p-5">

                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">

                      <Gauge
                        size={16}
                        className="text-cyan-400"
                      />

                      Rolling Risk Score

                    </div>

                    <p className="mt-3 text-4xl font-black font-mono text-white">
                      {formatScore(
                        selected.rolling_score,
                        3
                      )}
                    </p>

                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-800">

                      <div
                        className="h-full rounded-full transition-all duration-500 bg-cyan-400"
                        style={{
                          width:
                            selected.rolling_score !==
                              undefined &&
                            selected.rolling_score !==
                              null
                              ? `${Math.min(
                                  Math.max(
                                    Number(
                                      selected.rolling_score
                                    ) *
                                      100,
                                    0
                                  ),
                                  100
                                )}%`
                              : '0%'
                        }}
                      />

                    </div>

                    <p className="mt-3 text-[11px] leading-5 text-slate-400">
                      Displayed directly from the backend rolling risk engine.
                    </p>

                  </div>


                  <div className="rounded-xl border border-slate-800 bg-[#121824]/80 p-5">

                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">

                      <Waves
                        size={16}
                        className="text-cyan-400"
                      />

                      Feature Latency

                    </div>

                    <p className="mt-3 text-xl font-bold font-mono text-white">
                      {selected.feature_latency_ms !==
                        undefined
                        ? `${selected.feature_latency_ms} ms`
                        : '--'}
                    </p>

                    <p className="mt-2 text-xs leading-5 text-slate-400">
                      58-dimensional feature vector processed by the backend pipeline.
                    </p>

                    <div className="mt-5 flex items-center gap-2 text-xs font-medium text-emerald-400 font-mono">

                      <CheckCircle2
                        size={15}
                      />

                      Model:{' '}

                      {selected.model_version ||
                        '--'}

                    </div>

                  </div>

                </div>


                {/* SIMULATION */}

                <SimulationTelemetry
                  activeStreamId={
                    activeStreamId
                  }
                  onResultReceived={
                    handleLiveAudioResult
                  }
                />


                {/* JSON CONTRACT */}

                {showInspector && (
                  <div className="bg-black p-4 rounded-xl border border-cyan-500/40 font-mono text-xs text-cyan-300 overflow-x-auto shadow-2xl">

                    <div className="flex justify-between items-center mb-2">

                      <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                        Backend RiskResult Payload
                      </span>

                      <span className="text-[10px] text-cyan-400">
                        JSON
                      </span>

                    </div>

                    <pre>
                      {JSON.stringify(
                        selected,
                        null,
                        2
                      )}
                    </pre>

                  </div>
                )}

              </div>

            </section>

          </div>
        )}


        {/* ===================================================
            ADVERSARIAL
           =================================================== */}

        {activePage === 'adversarial' && (
          <div className="space-y-8 max-w-6xl mx-auto">

            {/*
             * This section is intentionally allowed
             * to contain hardcoded benchmark/demo values.
             */}
            <AdversarialRobustness />

            <SimulationTelemetry
              activeStreamId={
                activeStreamId
              }
              onResultReceived={
                handleLiveAudioResult
              }
            />

          </div>
        )}


        {/* ===================================================
            ANALYTICS
           =================================================== */}

        {activePage === 'analytics' && (
          <div className="space-y-8 max-w-6xl mx-auto">

            <div>

              <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-cyan-400 font-mono">
                Deep Inspection Panel
              </p>

              <h1 className="text-3xl font-black tracking-tight text-white">
                Behavioral & Acoustic Analytics
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-400">
                Detailed telemetry for{' '}
                <span className="text-cyan-400 font-mono">
                  {activeStreamId}
                </span>
                . Values are populated from backend RiskResult fields when available.
              </p>

            </div>


            {/* STREAM SELECTOR */}

            <div className="flex items-center gap-2 overflow-x-auto pb-2">

              {Object.keys(
                streams
              ).map((id) => (
                <button
                  key={id}
                  onClick={() =>
                    setActiveStreamId(
                      id
                    )
                  }
                  className={`px-4 py-2 rounded-xl text-xs font-bold font-mono transition border ${
                    activeStreamId ===
                    id
                      ? 'bg-cyan-400 text-slate-950 border-cyan-400'
                      : 'bg-[#0c1017] text-slate-300 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {streams[id].name ||
                    id}
                </button>
              ))}

            </div>


            <div className="grid gap-6 md:grid-cols-2">


              {/* PROSODY */}

              <div className="rounded-2xl border border-slate-800 bg-[#0c1017]/90 p-6 shadow-xl space-y-4">

                <div className="flex items-center justify-between">

                  <div className="flex items-center gap-3">

                    <div className="flex size-10 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300 border border-cyan-400/20">
                      <Activity size={20} />
                    </div>

                    <div>

                      <h2 className="text-base font-bold text-white">
                        1. Prosody & Behavioral Analysis
                      </h2>

                      <p className="text-xs text-slate-400">
                        Rhythm, pitch and pause behavior
                      </p>

                    </div>

                  </div>


                  <StatusPill
                    status={
                      analytics.prosody
                        ?.status
                    }
                  />

                </div>


                <div className="grid grid-cols-2 gap-4">

                  <div className="bg-[#121824]/80 p-3.5 rounded-xl border border-slate-800">

                    <p className="text-[11px] text-slate-400 font-mono">
                      Rhythm Score
                    </p>

                    <p className="text-lg font-bold font-mono text-white mt-1">
                      {analytics.prosody
                        ?.rhythm_score ??
                        '--'}
                    </p>

                  </div>


                  <div className="bg-[#121824]/80 p-3.5 rounded-xl border border-slate-800">

                    <p className="text-[11px] text-slate-400 font-mono">
                      Pitch Variance
                    </p>

                    <p className="text-sm font-bold text-white mt-1">
                      {analytics.prosody
                        ?.pitch_variance ??
                        '--'}
                    </p>

                  </div>

                </div>


                <div className="bg-[#121824]/80 p-4 rounded-xl border border-slate-800">

                  <p className="text-[11px] text-slate-400 font-mono">
                    Pause Regularity
                  </p>

                  <p className="text-sm font-semibold text-slate-200 mt-1">
                    {analytics.prosody
                      ?.pause_regularity ??
                      '--'}
                  </p>

                </div>

              </div>


              {/* SPEAKER */}

              <div className="rounded-2xl border border-slate-800 bg-[#0c1017]/90 p-6 shadow-xl space-y-4">

                <div className="flex items-center justify-between">

                  <div className="flex items-center gap-3">

                    <div className="flex size-10 items-center justify-center rounded-xl bg-indigo-400/10 text-indigo-300 border border-indigo-400/20">
                      <UserCheck size={20} />
                    </div>

                    <div>

                      <h2 className="text-base font-bold text-white">
                        2. Speaker Verification
                      </h2>

                      <p className="text-xs text-slate-400">
                        Cross-session voice identity
                      </p>

                    </div>

                  </div>


                  <StatusPill
                    status={
                      selected
                        .speaker_verification
                        ?.status
                    }
                  />

                </div>


                <div className="bg-[#121824]/80 p-4 rounded-xl border border-slate-800 space-y-3">

                  <div className="flex justify-between gap-4 text-xs">

                    <span className="text-slate-400">
                      Enrolled Speaker
                    </span>

                    <span className="font-mono font-bold text-white text-right">
                      {selected
                        .speaker_verification
                        ?.enrolled_speaker ??
                        '--'}
                    </span>

                  </div>


                  <div className="flex justify-between text-xs">

                    <span className="text-slate-400">
                      Match Score
                    </span>

                    <span className="font-mono font-bold text-cyan-300">
                      {formatProbability(
                        selected
                          .speaker_verification
                          ?.match_score
                      )}
                    </span>

                  </div>


                  <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">

                    <div
                      className="h-full bg-indigo-400 rounded-full transition-all duration-500"
                      style={{
                        width:
                          selected
                            .speaker_verification
                            ?.match_score !==
                            undefined
                            ? `${Math.min(
                                Math.max(
                                  Number(
                                    selected
                                      .speaker_verification
                                      .match_score
                                  ) *
                                    100,
                                  0
                                ),
                                100
                              )}%`
                            : '0%'
                      }}
                    />

                  </div>

                </div>

              </div>


              {/* VOCODER */}

              <div className="rounded-2xl border border-slate-800 bg-[#0c1017]/90 p-6 shadow-xl space-y-4">

                <div className="flex items-center justify-between">

                  <div className="flex items-center gap-3">

                    <div className="flex size-10 items-center justify-center rounded-xl bg-rose-400/10 text-rose-300 border border-rose-400/20">
                      <Fingerprint size={20} />
                    </div>

                    <div>

                      <h2 className="text-base font-bold text-white">
                        3. Vocoder Fingerprinting
                      </h2>

                      <p className="text-xs text-slate-400">
                        Generative artifact analysis
                      </p>

                    </div>

                  </div>


                  <span className="font-mono text-xs text-rose-400 bg-rose-950/40 border border-rose-500/30 px-2.5 py-1 rounded-lg">

                    {formatProbability(
                      selected
                        .vocoder_fingerprint
                        ?.confidence
                    )}

                  </span>

                </div>


                <div className="bg-[#121824]/80 p-4 rounded-xl border border-slate-800 space-y-3">

                  <div className="text-xs font-mono">

                    <span className="text-slate-400">
                      Detected Tool:{' '}
                    </span>

                    <span className="text-rose-300 font-bold">
                      {selected
                        .vocoder_fingerprint
                        ?.detected_tool ??
                        '--'}
                    </span>

                  </div>


                  <div className="text-[11px] font-mono text-slate-400">

                    Artifact Signature:{' '}

                    <span className="text-slate-200">
                      {selected
                        .vocoder_fingerprint
                        ?.artifact_signature ??
                        '--'}
                    </span>

                  </div>

                </div>

              </div>


              {/* EXPLAINABILITY */}

              <div className="md:col-span-2 rounded-2xl border border-emerald-500/30 bg-[#0c1017]/95 p-6 shadow-xl space-y-6">

                {(() => {
                  const topFeatureOrder = Array.isArray(selected.shap_top_features)
                    ? selected.shap_top_features.map(Number)
                    : []

                  const shapFeatures = (Array.isArray(analytics.shap_features)
                    ? analytics.shap_features
                    : [])
                    .map((feature, index) => {
                      const value = Number(feature?.value)
                      const absValue = Number(feature?.abs_value)

                      return {
                        ...feature,
                        name:
                          feature?.name ||
                          `Feature ${feature?.index ?? index}`,
                        value,
                        absValue: Number.isFinite(absValue)
                          ? Math.abs(absValue)
                          : Math.abs(value),
                        direction:
                          feature?.direction ||
                          (value >= 0 ? 'positive' : 'negative')
                      }
                    })
                    .filter(
                      (feature) =>
                        Number.isFinite(feature.value) &&
                        Number.isFinite(feature.absValue)
                    )
                    .sort((left, right) => {
                      const leftRank = topFeatureOrder.indexOf(Number(left.index))
                      const rightRank = topFeatureOrder.indexOf(Number(right.index))

                      if (leftRank !== -1 || rightRank !== -1) {
                        return (
                          (leftRank === -1 ? Number.MAX_SAFE_INTEGER : leftRank) -
                          (rightRank === -1 ? Number.MAX_SAFE_INTEGER : rightRank)
                        )
                      }

                      return right.absValue - left.absValue
                    })
                    .slice(0, 5)

                  const maxContribution = Math.max(
                    ...shapFeatures.map((feature) => feature.absValue),
                    1
                  )

                  const cues = Array.isArray(selected.diagnostic_cues)
                    ? selected.diagnostic_cues
                    : []

                  const cueLabels = {
                    spectral_artifact: 'Spectral anomaly signal detected',
                    flat_prosody_timing: 'MFCC dynamics signal detected'
                  }

                  const hasActionableEvidence =
                    selected.risk_level === 'HIGH' ||
                    Number(selected.ai_probability) >= 0.7 ||
                    Number(selected.consecutive_flags) >= 3 ||
                    selected.vocoder_flag === true

                  return (
                    <>
                      <div className="flex flex-col gap-4 border-b border-slate-800 pb-5 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex size-11 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-300 border border-emerald-400/20">
                            <GitBranch size={21} />
                          </div>

                          <div>
                            <h2 className="text-base font-bold text-white">
                              4. Explainability & Audit Trail
                            </h2>
                            <p className="mt-1 text-xs text-slate-400">
                              Why the model produced this window assessment
                            </p>
                          </div>
                        </div>

                        <span className="w-fit rounded-lg border border-emerald-500/30 bg-emerald-950/40 px-2.5 py-1 font-mono text-xs text-emerald-400">
                          BACKEND EVIDENCE
                        </span>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="rounded-xl border border-slate-800 bg-[#121824]/80 p-4">
                          <p className="text-[10px] uppercase tracking-wider text-slate-500 font-mono">
                            AI Probability
                          </p>
                          <p className="mt-2 text-4xl font-black font-mono text-white">
                            {formatProbability(selected.ai_probability, 1)}
                          </p>
                        </div>

                        <div className="rounded-xl border border-slate-800 bg-[#121824]/80 p-4">
                          <p className="text-[10px] uppercase tracking-wider text-slate-500 font-mono">
                            Backend Risk
                          </p>
                          <div className="mt-2">
                            <StatusPill status={selected.risk_level} />
                          </div>
                        </div>
                      </div>

                      <div className="rounded-xl border border-slate-800 bg-[#121824]/80 p-5">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                          <div>
                            <p className="text-xs font-bold text-white">
                              Model Evidence · SHAP Contributions
                            </p>
                            <p className="mt-1 text-[11px] text-slate-500 font-mono">
                              Negative values move away from synthetic speech; positive values move toward it.
                            </p>
                          </div>
                          <div className="flex justify-between gap-8 text-[10px] font-mono uppercase tracking-wider">
                            <span className="text-cyan-300">Decreases synthetic</span>
                            <span className="text-rose-300">Increases synthetic</span>
                          </div>
                        </div>

                        {shapFeatures.length === 0 ? (
                          <p className="mt-5 text-xs text-slate-500 font-mono">
                            SHAP explanation not available for this window.
                          </p>
                        ) : (
                          <div className="mt-5 space-y-3">
                            {shapFeatures.map((feature) => {
                              const width = `${Math.max(
                                Math.round((feature.absValue / maxContribution) * 100),
                                4
                              )}%`
                              const isPositive = feature.value >= 0

                              return (
                                <div
                                  key={`${feature.index ?? feature.name}-${feature.value}`}
                                  className="grid grid-cols-[minmax(92px,0.8fr)_minmax(0,1.8fr)_auto] items-center gap-3 text-[11px]"
                                >
                                  <span className="truncate text-slate-200" title={feature.name}>
                                    {feature.name}
                                  </span>

                                  <div className="grid grid-cols-2 items-center gap-1">
                                    <div className="flex h-5 justify-end border-r border-slate-600 pr-1">
                                      {!isPositive && (
                                        <div
                                          className="h-full rounded-l bg-cyan-400/80"
                                          style={{ width }}
                                        />
                                      )}
                                    </div>
                                    <div className="flex h-5 justify-start pl-1">
                                      {isPositive && (
                                        <div
                                          className="h-full rounded-r bg-rose-400/85"
                                          style={{ width }}
                                        />
                                      )}
                                    </div>
                                  </div>

                                  <span
                                    className={`w-14 text-right font-mono font-bold ${
                                      isPositive ? 'text-rose-300' : 'text-cyan-300'
                                    }`}
                                  >
                                    {feature.value > 0 ? '+' : ''}
                                    {formatScore(feature.value, 2)}
                                  </span>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>

                      <div className="grid gap-4 lg:grid-cols-2">
                        <div className="rounded-xl border border-slate-800 bg-[#121824]/80 p-4">
                          <p className="text-[10px] uppercase tracking-wider text-slate-500 font-mono">
                            Signals Detected
                          </p>
                          <div className="mt-3 space-y-2">
                            {cues.map((cue, index) => (
                              <div
                                key={`${cue}-${index}`}
                                className="flex items-start gap-2 text-xs text-slate-300"
                              >
                                <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-emerald-400" />
                                <span>
                                  {cueLabels[cue] ||
                                    String(cue)
                                      .replaceAll('_', ' ')
                                      .replace(/\b\w/g, (letter) => letter.toUpperCase())}
                                </span>
                              </div>
                            ))}

                            {selected.vocoder_flag === true && (
                              <div className="flex items-start gap-2 text-xs text-slate-300">
                                <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-emerald-400" />
                                <span>Acoustic generation signal flagged</span>
                              </div>
                            )}

                            {!cues.length && selected.vocoder_flag !== true && (
                              <p className="text-xs text-slate-500 font-mono">
                                No diagnostic signals reported for this window.
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="rounded-xl border border-slate-800 bg-[#121824]/80 p-4">
                          <p className="text-[10px] uppercase tracking-wider text-slate-500 font-mono">
                            What This Means
                          </p>
                          <p className="mt-3 text-xs leading-5 text-slate-300">
                            The displayed features are the highest-impact contributors for this analysis window. Positive SHAP values push the model toward synthetic speech, while negative values push it away. Individual features do not independently prove that a voice is synthetic.
                          </p>
                        </div>
                      </div>

                      {hasActionableEvidence && (
                        <div className="rounded-xl border border-amber-400/30 bg-amber-950/20 p-4">
                          <p className="text-[10px] uppercase tracking-wider text-amber-300 font-mono">
                            Recommended Security Action
                          </p>
                          <p className="mt-2 text-xs leading-5 text-amber-100/90">
                            Verify caller identity before authorizing payment, credential reset, or other sensitive actions.
                          </p>
                        </div>
                      )}

                      <div className="grid gap-3 rounded-xl border border-slate-800 bg-[#090d16] p-4 sm:grid-cols-3 lg:grid-cols-6">
                        <div>
                          <p className="text-[10px] text-slate-500 font-mono">WINDOW</p>
                          <p className="mt-1 text-xs font-bold text-white font-mono">{selected.window_id ?? '--'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-500 font-mono">MODEL</p>
                          <p className="mt-1 truncate text-xs font-bold text-cyan-300 font-mono" title={selected.model_version || ''}>{selected.model_version || '--'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-500 font-mono">PROBABILITY</p>
                          <p className="mt-1 text-xs font-bold text-white font-mono">{formatProbability(selected.ai_probability, 1)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-500 font-mono">RISK</p>
                          <p className="mt-1 text-xs font-bold text-white font-mono">{selected.risk_level || '--'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-500 font-mono">CONFIRMATIONS</p>
                          <p className="mt-1 text-xs font-bold text-white font-mono">{selected.consecutive_flags ?? '--'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-500 font-mono">LATENCY</p>
                          <p className="mt-1 text-xs font-bold text-white font-mono">{analytics.feature_latency_ms != null ? `${analytics.feature_latency_ms} ms` : '--'}</p>
                        </div>
                      </div>
                    </>
                  )
                })()}
              </div>

            </div>


            {/* MODEL METADATA */}

            <div className="rounded-2xl border border-slate-800 bg-[#0c1017]/90 p-5 shadow-xl">

              <div className="grid gap-4 sm:grid-cols-4">

                <div>
                  <p className="text-[10px] text-slate-500 font-mono">
                    MODEL
                  </p>

                  <p className="mt-1 text-xs font-bold text-cyan-300 font-mono">
                    {selected.model_version ||
                      '--'}
                  </p>
                </div>


                <div>
                  <p className="text-[10px] text-slate-500 font-mono">
                    WINDOW
                  </p>

                  <p className="mt-1 text-xs font-bold text-white font-mono">
                    {selected.window_id ??
                      '--'}
                  </p>
                </div>


                <div>
                  <p className="text-[10px] text-slate-500 font-mono">
                    LATENCY
                  </p>

                  <p className="mt-1 text-xs font-bold text-white font-mono">
                    {analytics.feature_latency_ms !==
                      undefined
                      ? `${analytics.feature_latency_ms} ms`
                      : '--'}
                  </p>
                </div>


                <div>
                  <p className="text-[10px] text-slate-500 font-mono">
                    VAD
                  </p>

                  <p className="mt-1 text-xs font-bold text-white font-mono">
                    {selected.speech_detected ===
                    true
                      ? 'SPEECH'
                      : selected.speech_detected ===
                        false
                      ? 'SILENCE'
                      : '--'}
                  </p>
                </div>

              </div>

            </div>

          </div>
        )}


        {/* ===================================================
            HISTORY
           =================================================== */}

        {activePage === 'history' && (
          <section className="max-w-6xl space-y-6">

            <div>

              <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-cyan-400 font-mono">
                Activity Log
              </p>

              <h1 className="text-3xl font-black tracking-tight text-white">
                Recent Window Telemetry
              </h1>

              <p className="mt-3 text-sm text-slate-400">
                Backend RiskResult windows for{' '}
                <span className="text-cyan-400 font-mono">
                  {activeStreamId}
                </span>
              </p>

            </div>


            {/* STREAM SELECTOR */}

            <div className="flex gap-2 overflow-x-auto pb-2">

              {Object.keys(
                streams
              ).map((id) => (
                <button
                  key={id}
                  onClick={() =>
                    setActiveStreamId(
                      id
                    )
                  }
                  className={`px-4 py-2 rounded-xl text-xs font-bold font-mono border ${
                    activeStreamId ===
                    id
                      ? 'bg-cyan-400 text-slate-950 border-cyan-400'
                      : 'bg-[#0c1017] border-slate-800 text-slate-300'
                  }`}
                >
                  {streams[id].name ||
                    id}
                </button>
              ))}

            </div>


            <div className="overflow-hidden rounded-2xl border border-slate-800 bg-[#0c1017]/90 shadow-xl">

              <div className="hidden grid-cols-[100px_1fr_1fr_100px_100px] gap-4 border-b border-slate-800 px-5 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 md:grid font-mono">

                <span>Window</span>
                <span>Timestamp</span>
                <span>VAD / Probability</span>
                <span>Rolling</span>
                <span>Risk</span>

              </div>


              {currentHistory.length === 0 ? (
                <p className="p-5 text-xs text-slate-500 font-mono">
                  No backend telemetry windows recorded yet.
                </p>
              ) : (
                currentHistory.map(
                  (item, index) => (
                    <div
                      key={`${item.window_id}-${index}`}
                      className="grid gap-3 border-b border-slate-800/80 px-5 py-4 last:border-0 md:grid-cols-[100px_1fr_1fr_100px_100px] md:items-center md:gap-4 hover:bg-[#121824]/40 transition text-xs font-mono"
                    >

                      <span className="text-cyan-400 font-bold">
                        Win #{item.window_id}
                      </span>

                      <span className="text-slate-400">
                        {item.timestamp}
                      </span>

                      <span className="text-slate-300">
                        {item.speech_detected
                          ? `Prob: ${formatProbability(
                              item.ai_probability
                            )}`
                          : 'Silence'}
                      </span>

                      <span className="text-slate-200">
                        {formatScore(
                          item.rolling_score
                        )}
                      </span>

                      <span>
                        <StatusPill
                          status={
                            item.risk_level
                          }
                        />
                      </span>

                    </div>
                  )
                )
              )}

            </div>

          </section>
        )}


        {/* ===================================================
            ARCHITECTURE
           =================================================== */}

        {activePage === 'how' && (
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


            {/* PIPELINE */}

            <div className="bg-[#0c1017] p-5 rounded-2xl border border-cyan-500/30 space-y-3 shadow-xl">

              <h3 className="text-sm font-bold text-cyan-300 flex items-center gap-2">

                <Terminal size={16} />

                End-to-End Real-Time Pipeline

              </h3>

              <p className="text-xs text-slate-300 font-mono leading-relaxed bg-[#07090e] p-4 rounded-lg border border-slate-800">

                Live Mic / Audio File

                {' → '}

                16kHz PCM16

                {' → '}

                WebSocket

                {' → '}

                Backend VAD

                {' → '}

                Window Accumulator

                {' → '}

                58-D Feature Extraction

                {' → '}

                Calibrated XGBoost

                {' → '}

                Risk Engine

                {' → '}

                WebSocket RiskResult

                {' → '}

                VeriVox Dashboard

              </p>

            </div>


            {/* CORE PILLARS */}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">


              <div className="rounded-2xl border border-slate-800 bg-[#0c1017]/90 p-6 space-y-3 shadow-xl">

                <div className="size-10 rounded-xl bg-cyan-400/10 text-cyan-400 flex items-center justify-center border border-cyan-400/20">

                  <Zap size={20} />

                </div>

                <h4 className="font-bold text-white text-sm">
                  1. Real-Time Streaming
                </h4>

                <p className="text-xs text-slate-400 leading-relaxed">
                  Browser microphone or audio files are converted to mono PCM16 at 16kHz and streamed to the backend over WebSockets.
                </p>

              </div>


              <div className="rounded-2xl border border-slate-800 bg-[#0c1017]/90 p-6 space-y-3 shadow-xl">

                <div className="size-10 rounded-xl bg-cyan-400/10 text-cyan-400 flex items-center justify-center border border-cyan-400/20">

                  <Layers size={20} />

                </div>

                <h4 className="font-bold text-white text-sm">
                  2. 58-D Feature Pipeline
                </h4>

                <p className="text-xs text-slate-400 leading-relaxed">
                  Backend feature extraction generates the 58-dimensional acoustic representation used by the trained inference model.
                </p>

              </div>


              <div className="rounded-2xl border border-slate-800 bg-[#0c1017]/90 p-6 space-y-3 shadow-xl">

                <div className="size-10 rounded-xl bg-cyan-400/10 text-cyan-400 flex items-center justify-center border border-cyan-400/20">

                  <ShieldCheck size={20} />

                </div>

                <h4 className="font-bold text-white text-sm">
                  3. Backend Risk Engine
                </h4>

                <p className="text-xs text-slate-400 leading-relaxed">
                  The backend owns AI probability, rolling risk, consecutive flags and final risk state. The frontend only visualizes those results.
                </p>

              </div>

            </div>


            {/* FRONTEND/BACKEND CONTRACT */}

            <div className="rounded-2xl border border-slate-800 bg-[#0c1017]/90 p-6 shadow-xl">

              <div className="flex items-center gap-3 mb-5">

                <div className="size-10 rounded-xl bg-cyan-400/10 text-cyan-400 flex items-center justify-center">

                  <GitBranch size={20} />

                </div>

                <div>

                  <h2 className="font-bold text-white">
                    Frontend / Backend Contract
                  </h2>

                  <p className="text-xs text-slate-400">
                    Source of truth for live telemetry
                  </p>

                </div>

              </div>


              <div className="grid gap-3 md:grid-cols-2">

                {[
                  [
                    'ai_probability',
                    'Backend ML probability'
                  ],
                  [
                    'rolling_score',
                    'Backend rolling risk score'
                  ],
                  [
                    'risk_level',
                    'Backend final risk classification'
                  ],
                  [
                    'consecutive_flags',
                    'Backend consecutive-window state'
                  ],
                  [
                    'speech_detected',
                    'Backend VAD state'
                  ],
                  [
                    'model_version',
                    'Backend model identifier'
                  ],
                  [
                    'feature_latency_ms',
                    'Backend feature/inference telemetry'
                  ],
                  [
                    'window_id',
                    'Backend processing window'
                  ]
                ].map(
                  ([key, description]) => (
                    <div
                      key={key}
                      className="rounded-xl border border-slate-800 bg-[#121824]/70 p-3"
                    >

                      <p className="text-xs font-mono text-cyan-300">
                        {key}
                      </p>

                      <p className="text-[11px] text-slate-400 mt-1">
                        {description}
                      </p>

                    </div>
                  )
                )}

              </div>

            </div>

          </section>
        )}

      </div>
    </main>
  )
}