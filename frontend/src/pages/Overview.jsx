'use client'

import { useEffect, useState } from 'react'

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
  CheckCircle2,
  Cpu
} from 'lucide-react'

import AudioPlaybackBar from '../components/AudioPlaybackBar'
import StatusPill from '../components/StatusPill'
import LiveGraph from '../components/LiveGraph'
import { formatScore } from '../utils/helpers'

const SpectrogramVisualizer = ({ micLevel }) => {
  const [spectrogramFrame, setSpectrogramFrame] = useState(0)

  useEffect(() => {
    let animationFrame
    let lastUpdate = performance.now()

    const animateSpectrogram = (time) => {
      if (time - lastUpdate > 41) {
        setSpectrogramFrame((prev) => prev + 1)
        lastUpdate = time
      }
      animationFrame = requestAnimationFrame(animateSpectrogram)
    }

    animationFrame = requestAnimationFrame(animateSpectrogram)

    return () => cancelAnimationFrame(animationFrame)
  }, [])

  const currentMicLevel = Number(micLevel) || 0

  return (
    <div className="flex-1 w-full relative z-10 flex flex-col rounded-xl border border-violet-300/15 bg-black/60 p-2 overflow-hidden">
      {currentMicLevel > 0 && (
        <div
          className="pointer-events-none absolute top-0 bottom-0 z-20 w-[2px] bg-blue-500 shadow-[0_0_14px_rgba(36,84,216,0.9)]"
          style={{
            left: '72%'
          }}
        />
      )}

      <div className="flex-1 w-full flex flex-col gap-[2px]">
        {Array.from({ length: 14 }).map((_, bandIdx) => (
          <div
            key={bandIdx}
            className="w-full flex-1 flex gap-[2px]"
          >
            {Array.from({ length: 96 }).map((_, timeIdx) => {
              const movingWave = Math.sin(
                timeIdx * 0.32 +
                  spectrogramFrame * 0.055 +
                  bandIdx * 0.85
              )

              const secondaryWave = Math.sin(
                timeIdx * 0.11 -
                  spectrogramFrame * 0.035 +
                  bandIdx * 1.7
              )

              const frequencyWeight =
                bandIdx < 4
                  ? 1.15
                  : bandIdx < 9
                    ? 0.9
                    : 0.65

              const audioEnergy =
                currentMicLevel > 0
                  ? Math.min(
                      100,
                      currentMicLevel *
                        frequencyWeight *
                        (0.72 + movingWave * 0.28)
                    )
                  : 0

              const texture =
                ((timeIdx * 17 +
                  bandIdx * 31 +
                  spectrogramFrame * 0.8) %
                  37) /
                37

              const intensity =
                currentMicLevel > 0
                  ? Math.max(
                      0,
                      Math.min(
                        100,
                        audioEnergy +
                          secondaryWave * 12 +
                          texture * 14
                      )
                    )
                  : 0

              const isActive = intensity > 8

              let cellClass = 'bg-violet-500/[0.06]'

              if (isActive) {
                if (intensity > 75) {
                  cellClass =
                    bandIdx < 5
                      ? 'bg-fuchsia-300 shadow-[0_0_9px_rgba(232,121,249,0.7)]'
                      : 'bg-violet-300 shadow-[0_0_9px_rgba(167,139,250,0.65)]'
                } else if (intensity > 50) {
                  cellClass =
                    bandIdx < 5
                      ? 'bg-fuchsia-400 shadow-[0_0_7px_rgba(232,121,249,0.5)]'
                      : bandIdx < 10
                        ? 'bg-violet-400 shadow-[0_0_7px_rgba(167,139,250,0.5)]'
                        : 'bg-blue-600 shadow-[0_0_7px_rgba(36,84,216,0.5)]'
                } else if (intensity > 25) {
                  cellClass =
                    bandIdx < 5
                      ? 'bg-fuchsia-500/70'
                      : bandIdx < 10
                        ? 'bg-violet-500/70'
                        : 'bg-blue-500/60'
                } else {
                  cellClass =
                    bandIdx < 5
                      ? 'bg-fuchsia-500/35'
                      : bandIdx < 10
                        ? 'bg-violet-500/35'
                        : 'bg-blue-500/30'
                }
              }

              return (
                <div
                  key={timeIdx}
                  className={`h-full flex-1 rounded-[1px] ${cellClass}`}
                  style={{
                    opacity: isActive
                      ? Math.min(1, 0.25 + intensity / 100)
                      : 0.12,
                    transform:
                      currentMicLevel > 0 && intensity > 45
                        ? `scaleY(${
                            1 +
                            Math.sin(
                              spectrogramFrame * 0.08 +
                                timeIdx * 0.2 +
                                bandIdx
                            ) *
                              0.08
                          })`
                        : 'scaleY(1)',
                    transition: 'opacity 80ms linear'
                  }}
                />
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Overview({
  micStatus,
  inputMode,
  micLevel,
  liveWaveform,
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
  configureSecurityContext,
  transcript,
  isFilePlaying,
  uploadedAudioUrl,
  toggleFilePlayback,
  filePlaybackTime,
  fileDuration,
  fileWaveform
}) {
  const securityNotifications = [
    {
      id: 'notif_1',
      type: selected.risk_level === 'HIGH' ? 'danger' : 'info',
      title:
        selected.risk_level === 'HIGH'
          ? 'Synthetic Clone Flagged'
          : 'Neural Guard Active',
      message:
        selected.risk_level === 'HIGH'
          ? `Stream ${activeStreamId} breached probability threshold (${Math.round(
              (selected.ai_probability || 0) * 100
            )}%).`
          : `Monitoring stream ${activeStreamId} via WebSocket 16kHz PCM pipeline.`,
      time: 'Just now'
    },
    {
      id: 'notif_2',
      type: securityTerminated ? 'danger' : 'success',
      title: securityTerminated
        ? 'Kill-Switch Engaged'
        : 'System Integrity Normal',
      message: securityTerminated
        ? 'Active file stream frozen due to security policy enforcement.'
        : 'All 58-dimensional feature extractors operating within normal parameters.',
      time: 'Real-time'
    }
  ]


  const radius = 50
  const circumference = 2 * Math.PI * radius
  const currentScore = selected.rolling_score || 0
  const strokeDashoffset = circumference - currentScore * circumference

  const buildSmoothWavePath = (waveform, phase = 0, scale = 1) => {
    if (!waveform?.length) return ''

    const width = 720
    const center = 22
    const samples = 120

    const points = Array.from({ length: samples }, (_, index) => {
      const position =
        (index / Math.max(1, samples - 1)) * (waveform.length - 1)

      const left = Math.floor(position)
      const right = Math.min(waveform.length - 1, Math.ceil(position))
      const blend = position - left

      const leftValue = Number(waveform[left] || 0)
      const rightValue = Number(waveform[right] || leftValue)
      const peak = leftValue + (rightValue - leftValue) * blend

      const amplitude = (2.5 + peak * 11) * scale

      const y =
        center +
        Math.sin(index * 0.28 + phase) * amplitude +
        Math.sin(index * 0.11 + phase * 0.7) * amplitude * 0.3

      return {
        x: (index / Math.max(1, samples - 1)) * width,
        y
      }
    })

    if (!points.length) return ''

    let path = `M ${points[0].x} ${points[0].y}`

    for (let i = 1; i < points.length; i += 1) {
      const previous = points[i - 1]
      const current = points[i]
      const midX = (previous.x + current.x) / 2
      const midY = (previous.y + current.y) / 2

      path += ` Q ${previous.x} ${previous.y}, ${midX} ${midY}`
    }

    const last = points[points.length - 1]
    path += ` Q ${last.x} ${last.y}, ${last.x} ${last.y}`

    return path
  }

  const uploadedWavePaths = [
    buildSmoothWavePath(fileWaveform, 0, 1),
    buildSmoothWavePath(fileWaveform, 1.8, 0.68),
    buildSmoothWavePath(fileWaveform, -1.2, 0.42)
  ]

  return (
    <div className="verivox-reference relative space-y-8">
      <style>{`
        .verivox-reference {
          --vx-bg: #00050f;

          @keyframes liveWaveDrift {
            from {
              transform: translateX(0);
            }
            to {
              transform: translateX(-720px);
            }
          }

          .live-wave-drift {
            animation: liveWaveDrift 4s linear infinite;
          }

          .live-wave-drift-slow {
            animation: liveWaveDrift 6s linear infinite;
          }

          .live-wave-drift-fast {
            animation: liveWaveDrift 3s linear infinite;
          }
          --vx-panel: #030f20;
          --vx-panel-2: #061326;
          --vx-panel-3: #020914;
          --vx-cyan: #2454D8;
          --vx-blue: #0066ff;
          --vx-violet: #8b5cf6;
          --vx-pink: #ff2da3;
          --vx-text: #f4fbff;
          --vx-muted: #7890a8;
          --vx-border: rgba(0,255,255,.18);
          --vx-border-soft: rgba(71,130,180,.16);
        }

        .verivox-reference {
          color: var(--vx-text);
        }

        /* GLOBAL PANEL LANGUAGE */
        .verivox-reference section {
          box-shadow:
            0 0 0 1px rgba(0,255,255,.025) inset,
            0 18px 55px rgba(0,0,0,.24);
        }

        /* REMOVE THE GENERIC GREY DASHBOARD LOOK */
        .verivox-reference [class*="bg-[#07111f]"] {
          background: linear-gradient(
            145deg,
            rgba(4,18,37,.94),
            rgba(1,8,19,.97)
          ) !important;
        }

        .verivox-reference [class*="bg-[#030712]"] {
          background: rgba(1,7,17,.94) !important;
        }

        /* TOP ANALYSIS SHELL */
        .verivox-reference > div:nth-of-type(2) {
          border-color: rgba(0,255,255,.22) !important;
          background:
            radial-gradient(
              circle at 15% 0%,
              rgba(0,255,255,.065),
              transparent 28%
            ),
            radial-gradient(
              circle at 90% 15%,
              rgba(0,102,255,.075),
              transparent 30%
            ),
            linear-gradient(
              145deg,
              #031022 0%,
              #010812 52%,
              #020711 100%
            ) !important;
          box-shadow:
            0 0 55px rgba(0,170,255,.045),
            0 25px 100px rgba(0,0,0,.42) !important;
        }

        /* TOP PANELS */
        .verivox-reference > div:nth-of-type(2) section {
          background:
            linear-gradient(
              145deg,
              rgba(4,20,40,.88),
              rgba(1,9,20,.92)
            ) !important;
          border-color: rgba(0,255,255,.13) !important;
        }

        /* HEADINGS */
        .verivox-reference h2 {
          color: #f7fdff !important;
          letter-spacing: -.02em;
        }

        .verivox-reference p {
          text-shadow: 0 0 18px rgba(0,255,255,.025);
        }

        /* BUTTONS */
        .verivox-reference button,
        .verivox-reference label {
          border-color: rgba(0,255,255,.28) !important;
        }

        .verivox-reference button:hover,
        .verivox-reference label:hover {
          border-color: rgba(0,255,255,.65) !important;
          box-shadow:
            0 0 18px rgba(0,255,255,.12),
            inset 0 0 18px rgba(0,255,255,.035);
        }

        /* CYAN TEXT */
        .verivox-reference .text-blue-200,
        .verivox-reference .text-blue-500,
        .verivox-reference .text-blue-100 {
          color: #2454D8 !important;
        }

        /* VIOLET */
        .verivox-reference .text-violet-200,
        .verivox-reference .text-violet-300 {
          color: #a78bfa !important;
        }

        /* GREEN */
        .verivox-reference .text-emerald-200,
        .verivox-reference .text-emerald-300 {
          color: #00ffb3 !important;
        }

        /* RISK TRAJECTORY */
        .verivox-reference svg polyline {
          filter: drop-shadow(0 0 5px rgba(0,255,255,.38));
        }

        /* SYNTHETIC VOICE PROBABILITY */
        .verivox-reference > div:nth-of-type(3) {
          border-color: rgba(0,255,255,.18) !important;
          background:
            linear-gradient(
              145deg,
              rgba(3,14,29,.96),
              rgba(1,7,16,.98)
            ) !important;
          box-shadow:
            0 0 45px rgba(0,102,255,.035);
        }

        /* STAT CARDS */
        .verivox-reference section.grid {
          gap: 14px !important;
        }

        .verivox-reference section.grid > div {
          background:
            linear-gradient(
              145deg,
              rgba(5,20,39,.96),
              rgba(2,10,21,.98)
            ) !important;
          border-color: rgba(0,155,255,.20) !important;
          box-shadow:
            0 12px 35px rgba(0,0,0,.28),
            inset 0 1px 0 rgba(255,255,255,.018);
        }

        .verivox-reference section.grid > div:hover {
          border-color: rgba(0,255,255,.45) !important;
        }

        /* SPECTROGRAM */
        .verivox-reference section[class*="border-violet"] {
          border-color: rgba(139,92,246,.35) !important;
          background:
            linear-gradient(
              145deg,
              rgba(5,13,32,.97),
              rgba(2,7,19,.98)
            ) !important;
        }

        /* SECURITY CONTEXT */
        .verivox-reference section[class*="border-blue-500"] {
          border-color: rgba(0,255,255,.30) !important;
          background:
            linear-gradient(
              145deg,
              rgba(3,18,35,.97),
              rgba(1,9,20,.98)
            ) !important;
        }

        /* CONVERSATIONS / TELEMETRY */
        .verivox-reference section[class*="grid-cols"] > div {
          background:
            linear-gradient(
              145deg,
              rgba(4,17,34,.96),
              rgba(1,8,18,.98)
            ) !important;
          border-color: rgba(0,150,255,.18) !important;
        }

        /* TELEMETRY INNER CARDS */
        .verivox-reference section div[class*="bg-[#030712]"] {
          border-color: rgba(0,180,255,.16) !important;
        }

        /* NOTIFICATION FEED */
        .verivox-reference section[class*="shadow-[0_0_40px"] {
          border-color: rgba(0,255,255,.22) !important;
          background:
            linear-gradient(
              145deg,
              rgba(3,18,35,.97),
              rgba(1,8,18,.98)
            ) !important;
        }

        /* ALERT */
        .verivox-reference section[class*="border-red-400"] {
          background:
            linear-gradient(
              100deg,
              rgba(52,3,22,.95),
              rgba(20,3,15,.90),
              rgba(2,7,17,.96)
            ) !important;
          border-color: rgba(255,45,120,.62) !important;
          box-shadow:
            0 0 35px rgba(255,45,120,.10),
            inset 3px 0 0 #ff2d78 !important;
        }

        /* FORM FIELDS */
        .verivox-reference select,
        .verivox-reference input {
          background: #010914 !important;
          border-color: rgba(0,180,255,.20) !important;
        }

        .verivox-reference select:focus,
        .verivox-reference input:focus {
          border-color: rgba(0,255,255,.55) !important;
          box-shadow: 0 0 16px rgba(0,255,255,.08);
        }

        /* MORE REFERENCE-LIKE SPACING */
        @media (min-width: 1024px) {
          .verivox-reference {
            gap: 16px !important;
          }

          .verivox-reference > div:nth-of-type(2) section {
            padding: 24px !important;
          }

          .verivox-reference > div:nth-of-type(2) > section:last-child {
            padding: 22px 24px !important;
          }
        }

        /* MOBILE */
        @media (max-width: 640px) {
          .verivox-reference {
            gap: 12px !important;
          }
        }
      `}</style>

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

              <h2 className="mt-2 text-lg font-bold text-white">
                Synthetic Voice Clone Detected
              </h2>

              <p className="mt-1 text-sm leading-relaxed font-mono text-slate-200">
                {selected.alert_reason === 'persistent_high_ai_probability'
                  ? `High synthetic-voice probability detected across ${
                      selected.alert_consecutive_flags ||
                      selected.consecutive_flags ||
                      3
                    } consecutive audio windows.`
                  : selected.alert_reason ||
                    'Backend Risk Engine has triggered an alert for this stream.'}
              </p>
            </div>
          </div>

          <button
            onClick={acknowledgeAlert}
            className="relative flex shrink-0 items-center gap-2 rounded-lg border border-red-300/40 bg-red-500/15 px-4 py-2.5 text-sm font-bold font-mono text-red-200 transition hover:border-red-200/60 hover:bg-red-500/25 hover:text-white hover:shadow-[0_0_20px_rgba(239,68,68,0.15)]"
          >
            <X size={16} />
            Acknowledge & Escalate
          </button>
        </section>
      )}

      {/* 2. REFERENCE-STYLE LIVE ANALYSIS SHELL */}
      <div className="relative overflow-hidden rounded-[28px] border border-blue-500/15 bg-[#030914]/90 shadow-[0_0_70px_rgba(36,84,216,0.05)]">

        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_15%,rgba(36,84,216,0.08),transparent_28%),radial-gradient(circle_at_92%_8%,rgba(59,130,246,0.07),transparent_26%),radial-gradient(circle_at_55%_100%,rgba(139,92,246,0.05),transparent_32%)]" />

        {/* LIVE INGESTION + TRANSCRIPTION */}
        <div className="relative grid grid-cols-1 xl:grid-cols-[1.35fr_0.92fr]">

          {/* INGESTION */}
          <section className="relative overflow-hidden border-b border-white/[0.07] p-5 xl:border-b-0 xl:border-r">

            <div className="pointer-events-none absolute -right-10 -top-12 opacity-[0.08]">
              <RadioTower size={180} className="text-blue-500" />
            </div>

            <div className="relative flex flex-col gap-4">

              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">

                <div className="flex items-start gap-3">
                  <div className={`flex size-12 shrink-0 items-center justify-center rounded-xl border ${
                    micStatus === 'Live Mic Streaming...'
                      ? 'animate-pulse border-blue-500/60 bg-blue-600/10 text-blue-200 shadow-[0_0_30px_rgba(36,84,216,0.2)]'
                      : 'border-blue-500/20 bg-blue-600/[0.05] text-blue-200'
                  }`}>
                    <Mic size={23} />
                  </div>

                  <div>
                    <h2 className="text-base font-black tracking-tight text-white">
                      Live Voice Ingestion
                    </h2>

                    <p className="mt-1 text-[10px] font-mono text-slate-500">
                      16kHz Mono PCM • Backend VAD • WebSocket
                    </p>

                    {selected.alert_triggered && (
                      <span className="mt-2 inline-flex rounded-md border border-red-400/35 bg-red-500/10 px-2 py-1 text-[8px] font-black font-mono uppercase tracking-wider text-red-300">
                        Alert: Synthetic Voice Clone Detected
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      micStatus === 'Live Mic Streaming...'
                        ? stopMicrophoneStream()
                        : startMicrophoneStream()
                    }
                    className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-[10px] font-black font-mono transition ${
                      micStatus === 'Live Mic Streaming...'
                        ? 'border-red-400/40 bg-red-500/10 text-red-200 hover:bg-red-500/20'
                        : 'border-blue-500/30 bg-blue-600/[0.07] text-blue-100 hover:border-blue-500/60 hover:bg-blue-600/[0.12]'
                    }`}
                  >
                    {micStatus === 'Live Mic Streaming...' ? (
                      <>
                        <Square size={13} />
                        Stop Mic
                      </>
                    ) : (
                      <>
                        <Play size={13} />
                        Start Live Mic
                      </>
                    )}
                  </button>

                  <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-blue-500/20 bg-white/[0.025] px-4 py-2.5 text-[10px] font-black font-mono text-slate-200 transition hover:border-blue-500/45 hover:bg-blue-600/[0.07]">
                    <FileAudio size={13} />
                    Upload Audio
                    <input
                      type="file"
                      accept="audio/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <div className="grid items-center gap-5 border-y border-white/[0.055] py-4 xl:grid-cols-[1fr_190px]">

                <div className="min-w-0">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[9px] font-black font-mono uppercase tracking-[0.18em] text-slate-500">
                      Active Audio Signal
                    </span>
                    <span className="text-[10px] font-black font-mono text-blue-500">
                      {micLevel}% RMS
                    </span>
                  </div>

                  <div className="relative h-24 overflow-hidden rounded-lg border border-blue-500/10 bg-[#02070d]">
                    <svg
                      viewBox="0 0 720 96"
                      preserveAspectRatio="none"
                      className="absolute inset-0 h-full w-full"
                    >
                      <defs>
                        <linearGradient id="live-wave-main" x1="0" x2="1">
                          <stop offset="0%" stopColor="#173EA5" />
                          <stop offset="35%" stopColor="#2454D8" />
                          <stop offset="70%" stopColor="#4F7BE8" />
                          <stop offset="100%" stopColor="#8B7CF6" />
                        </linearGradient>

                        <filter id="live-wave-glow">
                          <feGaussianBlur stdDeviation="2.2" result="blur" />
                          <feMerge>
                            <feMergeNode in="blur" />
                            <feMergeNode in="SourceGraphic" />
                          </feMerge>
                        </filter>
                      </defs>

                      <line
                        x1="0"
                        y1="48"
                        x2="720"
                        y2="48"
                        stroke="rgba(71,85,105,0.16)"
                        strokeWidth="1"
                      />

                      {(() => {
                        const source =
                          inputMode === 'file'
                            ? (fileWaveform?.length ? fileWaveform : [])
                            : (liveWaveform?.length ? liveWaveform : [])

                        const samples = 72

                        const raw = Array.from({ length: samples }, (_, i) => {
                          if (!source.length) return 0

                          const position =
                            (i / Math.max(1, samples - 1)) *
                            Math.max(0, source.length - 1)

                          const left = Math.floor(position)
                          const right = Math.min(
                            source.length - 1,
                            Math.ceil(position)
                          )
                          const blend = position - left

                          return Math.max(
                            0,
                            Number(source[left] || 0) +
                              (Number(source[right] || 0) -
                                Number(source[left] || 0)) *
                                blend
                          )
                        })

                        const smoothed = raw.map((value, i) => {
                          const from = Math.max(0, i - 2)
                          const to = Math.min(raw.length - 1, i + 2)
                          const window = raw.slice(from, to + 1)

                          return (
                            window.reduce((sum, item) => sum + item, 0) /
                            window.length
                          )
                        })

                        const peak = Math.max(...smoothed, 0.0001)

                        const values = smoothed.map((value) =>
                          Math.min(1, value / peak)
                        )

                        const centerY = 48
                        const maxBarHeight = 38
                        const barWidth = 5.2
                        const barGap = 1.8

                        return (
                          <>
                            <line
                              x1="0"
                              y1={centerY}
                              x2="720"
                              y2={centerY}
                              stroke="rgba(148,163,184,0.18)"
                              strokeWidth="1"
                            />

                            {values.map((value, i) => {
                              const x =
                                (i / Math.max(1, samples - 1)) *
                                (720 - barWidth)

                              const height =
                                value > 0.015
                                  ? Math.max(1.2, value * maxBarHeight)
                                  : 0.35

                              return (
                                <rect
                                  key={i}
                                  x={x}
                                  y={centerY - height}
                                  width={barWidth - barGap}
                                  height={height * 2}
                                  rx="1.5"
                                  fill="url(#live-wave-main)"
                                  opacity={value > 0.015 ? 0.88 : 0.28}
                                />
                              )
                            })}
                          </>
                        )
                      })()}
                    </svg>

                        {fileDuration > 0 && (
                          <div
                            className="absolute bottom-1 top-1 w-px bg-white shadow-[0_0_10px_rgba(255,255,255,0.9)]"
                            style={{
                              left: `${Math.min(
                                100,
                                Math.max(0, (filePlaybackTime / fileDuration) * 100)
                              )}%`
                            }}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
          </section>

          {/* TRANSCRIPTION */}
          <section className="relative overflow-hidden border-b border-white/[0.07] p-5">

            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-black tracking-tight text-white">
                  Live Transcription
                </h2>
                <p className="mt-1 text-[10px] font-mono text-slate-500">
                  Real-time speech-to-text
                </p>
              </div>

              <div className="flex items-center gap-1.5">
                {transcript?.language && (
                  <span className="rounded-md border border-blue-500/20 bg-blue-600/[0.07] px-2 py-1 text-[8px] font-black font-mono text-blue-500">
                    {transcript.language.toUpperCase()}
                  </span>
                )}

                <span className={`rounded-md border px-2 py-1 text-[8px] font-black font-mono ${
                  transcript?.complete || transcript?.is_final
                    ? 'border-emerald-300/20 bg-emerald-400/[0.07] text-emerald-300'
                    : transcript?.text
                      ? 'border-blue-500/20 bg-blue-600/[0.07] text-blue-500'
                      : 'border-slate-500/20 bg-slate-500/[0.05] text-slate-600'
                }`}>
                  {transcript?.complete || transcript?.is_final
                    ? 'FINAL'
                    : transcript?.text
                      ? 'LIVE'
                      : 'STANDBY'}
                </span>
              </div>
            </div>

            <div className="mt-4 min-h-[180px] rounded-xl border border-white/[0.055] bg-[#02070d]/70 p-4 shadow-inner">
              {transcript?.text ? (
                <p className="max-h-[190px] overflow-y-auto whitespace-pre-wrap text-sm leading-6 text-slate-100">
                  {transcript.text}
                </p>
              ) : (
                <div className="flex min-h-[145px] items-center justify-center text-[10px] font-mono text-slate-600">
                  Waiting for speech...
                </div>
              )}
            </div>

            {transcript?.text && (
              <div className="mt-3 flex items-center justify-between text-[8px] font-black font-mono uppercase tracking-widest text-slate-600">
                <span>
                  {Number(transcript.audio_start || 0).toFixed(1)}s — {Number(transcript.audio_end || 0).toFixed(1)}s
                </span>
                <span>
                  {Array.isArray(transcript.segments)
                    ? `${transcript.segments.length} SEGMENTS`
                    : '0 SEGMENTS'}
                </span>
              </div>
            )}
          </section>
        </div>

        {/* ROLLING RISK — CURRENT DECISION */}
        <section className="relative overflow-hidden border-t border-white/[0.055] px-3 py-3">
          <div className="relative overflow-hidden rounded-[17px] border border-blue-600/20 bg-[#06101f] shadow-[0_0_35px_rgba(0,100,255,0.06)]">

            <div
  className="pointer-events-none absolute inset-0"
  style={{
    background:
      selected.risk_level === 'HIGH'
        ? 'radial-gradient(circle at 10% 50%, rgba(255,45,120,0.11), transparent 32%), radial-gradient(circle at 55% 50%, rgba(255,45,120,0.045), transparent 48%)'
        : selected.risk_level === 'MEDIUM'
          ? 'radial-gradient(circle at 10% 50%, rgba(245,158,11,0.09), transparent 32%), radial-gradient(circle at 55% 50%, rgba(245,158,11,0.035), transparent 48%)'
          : 'radial-gradient(circle at 10% 50%, rgba(36,84,216,0.08), transparent 32%), radial-gradient(circle at 55% 50%, rgba(34,211,238,0.035), transparent 48%)'
  }}
/>

            <div className="relative grid min-h-[150px] min-w-0 grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)_minmax(0,1.55fr)]">

              {/* CURRENT RISK */}
              <div className="relative flex items-center gap-4 border-b border-white/[0.07] px-4 py-4 xl:border-b-0 xl:border-r">
                <div className="relative flex size-[94px] shrink-0 items-center justify-center">
                  <svg
                    viewBox="0 0 120 120"
                    className="absolute inset-0 size-full -rotate-90 drop-shadow-[0_0_14px_rgba(255,45,120,.25)]"
                  >
                    <circle
                      cx="60"
                      cy="60"
                      r="50"
                      fill="none"
                      stroke="rgba(255,255,255,.055)"
                      strokeWidth="8"
                    />

                    <circle
                      cx="60"
                      cy="60"
                      r="50"
                      fill="none"
                      stroke={
                        selected.risk_level === 'HIGH'
                          ? '#ff3f78'
                          : selected.risk_level === 'MEDIUM'
                            ? '#ffb347'
                            : '#2454D8'
                      }
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeDashoffset}
                      className="transition-all duration-700"
                    />
                  </svg>

                  <div className="relative flex flex-col items-center">
                    <span className="font-mono text-[24px] font-black leading-none text-white">
                      {Math.round(currentScore * 100)}%
                    </span>
                    <span
                      className={`mt-1 rounded-full px-2 py-0.5 text-[6px] font-black font-mono uppercase tracking-wider ${
                        selected.risk_level === 'HIGH'
                          ? 'border border-red-400/35 bg-red-500/15 text-red-300'
                          : selected.risk_level === 'MEDIUM'
                            ? 'border border-amber-400/35 bg-amber-500/15 text-amber-300'
                            : 'border border-blue-500/25 bg-blue-600/10 text-blue-300'
                      }`}
                    >
                      {selected.risk_level || 'LOW'}
                    </span>
                  </div>
                </div>

                <div className="min-w-0">
                  <p className="text-[8px] font-black font-mono uppercase tracking-[0.18em] text-slate-400">
                    Current Risk
                  </p>

                  <h2 className="mt-1 text-sm font-black tracking-tight text-white">
                    Rolling Risk Score
                  </h2>

                  <p className="mt-1 text-[8px] font-mono text-slate-500">
                    Live ensemble decision
                  </p>

                  <p
                    className={`mt-2 text-[8px] font-black font-mono uppercase tracking-widest ${
                      selected.risk_level === 'HIGH'
                        ? 'text-red-300'
                        : selected.risk_level === 'MEDIUM'
                          ? 'text-amber-300'
                          : 'text-blue-300'
                    }`}
                  >
                    {selected.risk_level || 'LOW'} · LIVE
                  </p>
                </div>
              </div>

              {/* RISK CONTINUUM */}
              <div className="relative flex flex-col justify-center border-b border-white/[0.07] px-5 py-4 xl:border-b-0 xl:border-r">
                <div className="flex items-center justify-between">
                  <p className="text-[8px] font-black font-mono uppercase tracking-[0.16em] text-slate-400">
                    Risk Continuum
                  </p>

                  <p className="font-mono text-[9px] font-bold text-slate-300">
                    {Math.round(currentScore * 100)} / 100
                  </p>
                </div>

                <div className="relative mt-5 h-2.5 overflow-hidden rounded-full bg-white/[0.07]">
                  <div className="absolute inset-y-0 left-0 w-[40%] bg-blue-600/60" />
                  <div className="absolute inset-y-0 left-[40%] w-[30%] bg-amber-400/70" />
                  <div className="absolute inset-y-0 right-0 w-[30%] bg-red-500/75" />

                  <div
                    className="absolute top-1/2 z-10 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-[#020914] shadow-[0_0_12px_rgba(255,255,255,.35)] transition-all duration-500"
                    style={{
                      left: `${Math.min(100, Math.max(0, currentScore * 100))}%`
                    }}
                  />
                </div>

                <div className="mt-2 flex justify-between text-[7px] font-black font-mono uppercase tracking-widest">
                  <span className="text-blue-300">LOW</span>
                  <span className="text-amber-300">MEDIUM</span>
                  <span className="text-red-300">HIGH</span>
                </div>

                <div className="mt-4 flex items-center justify-between rounded-lg border border-red-400/10 bg-red-500/[0.035] px-3 py-2">
                  <span className="text-[7px] font-black font-mono uppercase tracking-widest text-slate-500">
                    Consecutive High-Risk Windows
                  </span>
                  <span className="font-mono text-sm font-black text-red-300">
                    {selected.alert_consecutive_flags ??
                      selected.consecutive_flags ??
                      0}
                  </span>
                </div>
              </div>

              {/* SUPPORTING TELEMETRY */}
              <div className="grid grid-cols-2 sm:grid-cols-4">

                <div className="flex flex-col justify-center border-b border-r border-white/[0.07] px-4 py-3 sm:border-b-0">
                  <Gauge size={14} className="text-fuchsia-400" />
                  <p className="mt-2 text-[7px] font-black font-mono uppercase tracking-widest text-slate-500">
                    AI Probability
                  </p>
                  <p className="mt-1 font-mono text-lg font-black text-white">
                    {typeof selected.ai_probability === 'number'
                      ? `${Math.round(selected.ai_probability * 100)}%`
                      : '—'}
                  </p>
                </div>

                <div className="flex flex-col justify-center border-b border-white/[0.07] px-4 py-3 sm:border-b-0 sm:border-r">
                  <Waves size={14} className="text-blue-400" />
                  <p className="mt-2 text-[7px] font-black font-mono uppercase tracking-widest text-slate-500">
                    Confidence
                  </p>
                  <p className="mt-1 font-mono text-lg font-black text-white">
                    {typeof selected.rolling_score === 'number'
                      ? selected.rolling_score.toFixed(2)
                      : '—'}
                  </p>
                </div>

                <div className="flex flex-col justify-center border-r border-white/[0.07] px-4 py-3">
                  <Radio size={14} className="text-blue-400" />
                  <p className="mt-2 text-[7px] font-black font-mono uppercase tracking-widest text-slate-500">
                    Latency
                  </p>
                  <p className="mt-1 font-mono text-lg font-black text-white">
                    {selected.feature_latency_ms !== undefined &&
                    selected.feature_latency_ms !== null
                      ? selected.feature_latency_ms
                      : '—'}
                    {selected.feature_latency_ms !== undefined &&
                    selected.feature_latency_ms !== null && (
                      <span className="ml-1 text-[7px] text-slate-500">
                        ms
                      </span>
                    )}
                  </p>
                </div>

                <div className="flex flex-col justify-center px-4 py-3">
                  <Cpu size={14} className="text-emerald-300" />
                  <p className="mt-2 text-[7px] font-black font-mono uppercase tracking-widest text-slate-500">
                    Features
                  </p>
                  <p className="mt-1 font-mono text-lg font-black text-white">
                    58
                  </p>
                  <p className="mt-0.5 flex items-center gap-1 text-[6px] font-mono text-emerald-300">
                    <span className="size-1 rounded-full bg-emerald-300 shadow-[0_0_5px_rgba(52,211,153,.9)]" />
                    Live
                  </p>
                </div>

              </div>
            </div>
          </div>
        </section>
      </div>

      <LiveGraph
        timeSeries={selected.timeSeries}
        inputMode={inputMode}
        selected={selected}
        activeStreamId={activeStreamId}
      />

      <section className="grid gap-4 sm:grid-cols-3">
        {[
          {
            label: 'Monitored Channels',
            value: summary.total,
            description: 'Backend streams',
            icon: Radio,
            iconClass: 'text-blue-200',
            glow: 'hover:border-blue-500/40'
          },
          {
            label: 'Need Attention',
            value: summary.high,
            description: 'Backend HIGH risk streams',
            icon: AlertTriangle,
            iconClass: 'text-red-200',
            glow: 'hover:border-red-300/40'
          },
          {
            label: 'Speech Active',
            value: summary.active,
            description: 'Backend VAD state',
            icon: Volume2,
            iconClass: 'text-emerald-200',
            glow: 'hover:border-emerald-300/40'
          }
        ].map((item) => {
          const Icon = item.icon

          return (
            <div
              key={item.label}
              className={`group rounded-2xl border border-white/10 bg-[#07111f]/75 p-6 shadow-[0_0_30px_rgba(0,0,0,0.15)] backdrop-blur-xl transition-all duration-300 ${item.glow}`}
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-slate-300">
                  {item.label}
                </p>

                <div className="rounded-lg border border-white/10 bg-white/[0.04] p-2.5">
                  <Icon size={20} className={item.iconClass} />
                </div>
              </div>

              <p className="mt-4 text-4xl font-black text-white">
                {item.value}
              </p>

              <p className="mt-2 text-sm font-mono text-slate-500">
                {item.description}
              </p>
            </div>
          )
        })}
      </section>

      <section className="relative overflow-hidden flex flex-col justify-between rounded-2xl border border-violet-400/30 bg-[#030b1d]/95 p-5 shadow-[0_0_45px_rgba(139,92,246,0.08)] backdrop-blur-xl">

        <div className="pointer-events-none absolute -left-16 bottom-0 h-40 w-64 rounded-full bg-fuchsia-500/10 blur-3xl" />

        <div className="relative z-10 mb-4 flex items-center justify-between">

          <div className="flex items-center gap-3">
            <div className={`flex size-10 items-center justify-center rounded-xl border ${
              micLevel > 0
                ? 'border-violet-300/50 bg-violet-400/10 text-violet-200'
                : 'border-violet-300/25 bg-violet-400/[0.06] text-violet-300'
            }`}>
              <Waves size={19} />
            </div>

            <div>
              <h2 className="text-base font-black leading-tight text-white">
                Live Spectrogram
              </h2>

              <p className="mt-0.5 text-[9px] font-mono text-slate-500">
                Time / Freq Analysis
              </p>
            </div>
          </div>

          <span className={`rounded-md border px-2.5 py-1 text-[8px] font-black font-mono uppercase tracking-wider ${
            micLevel > 0
              ? 'border-violet-300/30 bg-violet-400/[0.08] text-violet-200'
              : 'border-slate-500/20 bg-slate-500/[0.05] text-slate-500'
          }`}>
            {micLevel > 0 ? 'Analyzing' : 'Standby'}
          </span>
        </div>

        {/* REFERENCE SPECTROGRAM FRAME */}
        <div className="relative z-10 h-[118px] overflow-hidden rounded-xl border border-violet-300/20 bg-[#02040d]">

          <div className="absolute inset-0 flex items-end gap-[2px] px-2 py-2">

            {Array.from({ length: 110 }).map((_, column) => {

              const base =
                0.20 +
                0.16 * Math.sin(column * 0.21) +
                0.12 * Math.sin(column * 0.53) +
                0.08 * Math.sin(column * 1.17)

              return (
                <div
                  key={column}
                  className="flex h-full flex-1 flex-col justify-end gap-[1px]"
                >
                  {Array.from({ length: 18 }).map((_, row) => {

                    const vertical =
                      Math.sin(row * 0.48 + column * 0.11) * 0.18

                    const band =
                      row < 5
                        ? 1.0
                        : row < 10
                          ? 0.78
                          : row < 14
                            ? 0.52
                            : 0.28

                    const intensity = Math.max(
                      0,
                      Math.min(
                        1,
                        base +
                        vertical +
                        band * 0.18 +
                        (micLevel > 0 ? micLevel / 180 : 0.08)
                      )
                    )

                    let cell =
                      'bg-violet-500/[0.08]'

                    if (intensity > 0.68) {
                      cell =
                        row < 7
                          ? 'bg-fuchsia-300 shadow-[0_0_8px_rgba(232,121,249,.55)]'
                          : 'bg-violet-300 shadow-[0_0_7px_rgba(167,139,250,.45)]'
                    } else if (intensity > 0.48) {
                      cell =
                        row < 7
                          ? 'bg-fuchsia-400/80'
                          : 'bg-violet-400/75'
                    } else if (intensity > 0.30) {
                      cell =
                        row < 8
                          ? 'bg-fuchsia-500/45'
                          : row < 13
                            ? 'bg-violet-500/45'
                            : 'bg-blue-500/25'
                    }

                    return (
                      <div
                        key={row}
                        className={`w-full flex-1 rounded-[1px] ${cell}`}
                        style={{
                          opacity: Math.max(0.18, intensity)
                        }}
                      />
                    )
                  })}
                </div>
              )
            })}
          </div>

          {/* scanning line */}
          {micLevel > 0 && (
            <div
              className="pointer-events-none absolute top-0 bottom-0 z-20 w-px bg-blue-500 shadow-[0_0_12px_rgba(36,84,216,.9)]"
              style={{
                left: '72%'
              }}
            />
          )}

          {/* subtle bottom glow */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-5 bg-gradient-to-t from-fuchsia-500/20 to-transparent" />
        </div>

        <div className="relative z-10 mt-3 flex items-center justify-between text-[8px] font-black font-mono uppercase tracking-widest text-slate-600">
          <span>0 kHz</span>

          <span className="text-violet-300/80">
            {micLevel > 0
              ? `${Math.round(micLevel)}% SIGNAL`
              : 'NO SIGNAL'}
          </span>

          <span>8 kHz</span>
        </div>
      </section>

      <section className="relative overflow-hidden rounded-2xl border border-blue-500/20 bg-[#07111f]/75 p-6 shadow-[0_0_40px_rgba(36,84,216,0.05)] backdrop-blur-xl">
        <div className="pointer-events-none absolute right-0 top-0 h-52 w-52 rounded-full bg-violet-500/12 blur-3xl" />

        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <p className="text-xs font-bold font-mono uppercase tracking-widest text-blue-200">
                Security Context
              </p>

              <span className="rounded-full border border-violet-300/25 bg-violet-400/10 px-2.5 py-0.5 text-xs font-bold font-mono uppercase tracking-wider text-violet-200">
                Demo · Simulated
              </span>
            </div>

            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
              Select the security scenario before voice analysis. Audio remains the live detector input; this context simulates the transaction or access workflow used by the risk engine.
            </p>
          </div>

          <button
            type="button"
            onClick={configureSecurityContext}
            disabled={
              contextConfigured ||
              isLiveMonitoring ||
              securityTerminated
            }
            className="rounded-xl border border-blue-500/35 bg-blue-600/[0.08] px-5 py-3 text-sm font-bold font-mono uppercase tracking-widest text-blue-200 transition-all hover:bg-blue-600/15 disabled:opacity-40"
          >
            {contextConfigured
              ? 'Context Applied'
              : 'Apply Security Context'}
          </button>
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-xs font-bold font-mono uppercase tracking-widest text-slate-500">
              Security Scenario
            </label>

            <select
              value={selectedScenario}
              onChange={(e) =>
                setSelectedScenario(e.target.value)
              }
              disabled={
                contextConfigured ||
                isLiveMonitoring ||
                securityTerminated
              }
              className="w-full rounded-xl border border-blue-500/15 bg-[#030712]/70 px-4 py-3 text-sm font-mono text-white outline-none disabled:opacity-50"
            >
              <option value="high_value_transaction">
                High-Value Transaction
              </option>
              <option value="privileged_access">
                Privileged Access
              </option>
              <option value="routine_support">
                Routine Support
              </option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-xs font-bold font-mono uppercase tracking-widest text-slate-500">
              Transaction Amount · INR
            </label>

            <div className="flex items-center rounded-xl border border-blue-500/15 bg-[#030712]/70 px-4 focus-within:border-blue-500/50">
              <span className="mr-3 text-base font-black font-mono text-blue-200">
                ₹
              </span>

              <input
                type="number"
                min="0"
                step="1000"
                value={transactionAmountInr}
                onChange={(e) =>
                  setTransactionAmountInr(e.target.value)
                }
                disabled={
                  selectedScenario !== 'high_value_transaction' ||
                  contextConfigured ||
                  isLiveMonitoring ||
                  securityTerminated
                }
                placeholder="e.g. 525000"
                className="w-full bg-transparent py-3 text-sm font-mono text-white outline-none placeholder:text-slate-600 disabled:opacity-50"
              />
            </div>
          </div>
        </div>
      </section>

      {selected.notification_triggered && (
        <section className="relative overflow-hidden rounded-2xl border border-red-400/50 bg-gradient-to-br from-red-500/[0.15] via-red-500/[0.06] to-transparent p-6 shadow-[0_0_55px_rgba(239,68,68,0.12)]">
          <div className="pointer-events-none absolute inset-y-0 left-0 w-2 bg-gradient-to-b from-red-300 via-red-500 to-orange-400" />
          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-red-500/15 blur-3xl" />

          <div className="relative flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div className="flex items-start gap-4">
              <div className="mt-1 flex size-12 shrink-0 items-center justify-center rounded-xl border border-red-300/35 bg-red-400/10">
                <ShieldAlert
                  size={26}
                  className="animate-pulse text-red-200"
                />
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <p className="text-xs font-black font-mono uppercase tracking-[0.16em] text-red-200">
                    SIH SECURITY RESPONSE
                  </p>

                  <span className="rounded-md border border-red-300/35 bg-red-400/10 px-2.5 py-0.5 text-xs font-black font-mono text-red-200">
                    {selected.notification_severity || 'HIGH'}
                  </span>
                </div>

                <h2 className="mt-2 text-xl font-bold text-white">
                  {selected.notification_title ||
                    'Voice Impersonation Alert'}
                </h2>

                {selected.notification_message && (
                  <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-200">
                    {selected.notification_message}
                  </p>
                )}
              </div>
            </div>

            <div className="shrink-0 rounded-lg border border-red-300/15 bg-black/30 px-4 py-3 text-xs font-mono text-slate-400">
              <div>
                Scenario:{' '}
                <span className="font-bold text-white">
                  {selected.notification_scenario ||
                    'routine_support'}
                </span>
              </div>

              <div className="mt-1.5">
                Privacy:{' '}
                <span className="font-bold text-blue-200">
                  {selected.privacy_mode || 'feature_only'}
                </span>
              </div>
            </div>
          </div>

          <div className="relative mt-6 border-t border-red-300/15 pt-5">
            <p className="mb-4 text-xs font-bold font-mono uppercase tracking-widest text-slate-400">
              Detection Policy
            </p>

            <div className="grid gap-3 md:grid-cols-3">
              {[
                {
                  label: 'AI Threshold',
                  value:
                    typeof selected.notification_threshold ===
                    'number'
                      ? `${(
                          selected.notification_threshold * 100
                        ).toFixed(0)}%`
                      : '—'
                },
                {
                  label: 'Required Persistence',
                  value: `${
                    selected.notification_required_consecutive_flags ||
                    '—'
                  } windows`
                },
                {
                  label: 'Current Risk',
                  value:
                    typeof selected.rolling_score === 'number'
                      ? `${(
                          selected.rolling_score * 100
                        ).toFixed(1)}%`
                      : '—'
                }
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-xl border border-red-300/10 bg-[#030712]/55 px-4 py-4"
                >
                  <p className="text-xs font-bold font-mono uppercase tracking-widest text-slate-500">
                    {item.label}
                  </p>

                  <p className="mt-1.5 text-base font-black text-white">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
            )}

      <section className="grid gap-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.5fr)]">
        <div className="relative space-y-4 overflow-hidden rounded-2xl border border-white/10 bg-[#07111f]/75 p-6 shadow-[0_0_35px_rgba(0,0,0,0.15)] backdrop-blur-xl">
          <div className="relative flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">
                Your Conversations
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                Select a backend stream to inspect
              </p>
            </div>

            <div className="rounded-lg border border-white/10 bg-white/[0.04] p-2.5">
              <Settings2 size={20} className="text-slate-400" />
            </div>
          </div>

          <div className="relative space-y-3">
            {Object.keys(streams).map((id) => {
              const stream = streams[id]

              return (
                <button
                  key={id}
                  onClick={() => setActiveStreamId(id)}
                  className={`group/stream relative w-full overflow-hidden rounded-xl border p-5 text-left transition-all duration-300 ${
                    activeStreamId === id
                      ? 'border-blue-500/50 bg-gradient-to-r from-blue-600/[0.12] via-violet-500/[0.08] to-transparent shadow-[0_0_28px_rgba(36,84,216,0.09)]'
                      : 'border-white/10 bg-white/[0.02] hover:border-blue-500/25 hover:bg-white/[0.04]'
                  }`}
                >
                  {activeStreamId === id && (
                    <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-blue-500 via-violet-400 to-fuchsia-400" />
                  )}

                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-base font-bold text-white">
                        {stream.name || id}
                      </p>

                      <p className="mt-1.5 font-mono text-sm text-slate-500">
                        {id}
                      </p>
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
                <h2 className="text-lg font-bold text-white">
                  {selected.name || activeStreamId}
                </h2>
                <StatusPill status={selected.risk_level} />
              </div>

              <p className="mt-1.5 text-sm text-slate-400">
                Backend-generated RiskResult telemetry
              </p>
            </div>

            <span className="rounded-lg border border-blue-500/25 bg-blue-600/[0.07] px-3 py-1.5 font-mono text-sm font-bold text-blue-200">
              {activeStreamId}
            </span>
          </div>

          <div className="relative grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl border border-blue-500/15 bg-[#030712]/60 p-5 transition hover:border-blue-500/30">
              <div className="flex items-center gap-2 text-[13px] font-bold text-slate-300">
                <Gauge size={17} className="text-blue-200" />
                Rolling Risk Score (Ensemble)
              </div>

              <p className="mt-3 text-3xl font-black font-mono text-white">
                {formatScore(selected.rolling_score, 3)}
              </p>

              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-500 via-violet-400 to-fuchsia-400 shadow-[0_0_14px_rgba(36,84,216,0.5)] transition-all duration-500"
                  style={{
                    width:
                      selected.rolling_score !== undefined &&
                      selected.rolling_score !== null
                        ? `${Math.min(
                            Math.max(
                              Number(selected.rolling_score) * 100,
                              0
                            ),
                            100
                          )}%`
                        : '0%'
                  }}
                />
              </div>

              <p className="mt-2.5 text-[11px] leading-4 text-slate-400">
                Unified ensemble: Calibrated XGBoost & Dual MMS-300M.
              </p>
            </div>

            <div className="rounded-xl border border-violet-300/15 bg-[#030712]/60 p-5 transition hover:border-violet-300/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[13px] font-bold text-slate-300">
                  <Cpu size={17} className="text-violet-200" />
                  Model Agreement
                </div>

                {selected.xgb_probability !== undefined &&
                  selected.dual_stream_probability !== undefined && (
                    <span
                      className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                        Math.abs(
                          selected.xgb_probability -
                            selected.dual_stream_probability
                        ) < 0.25
                          ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300'
                          : 'border-amber-400/30 bg-amber-400/10 text-amber-300'
                      }`}
                    >
                      {Math.abs(
                        selected.xgb_probability -
                          selected.dual_stream_probability
                      ) < 0.25
                        ? 'HIGH AGREEMENT'
                        : 'DIVERGENT'}
                    </span>
                  )}
              </div>

              <div className="mt-3 space-y-2 font-mono text-xs">
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-[11px] text-slate-400">
                    XGBoost (58-D DSP):
                  </span>
                  <span className="font-bold text-blue-200">
                    {selected.xgb_probability !== undefined &&
                    selected.xgb_probability !== null
                      ? `${(
                          selected.xgb_probability * 100
                        ).toFixed(1)}%`
                      : typeof selected.ai_probability ===
                          'number'
                        ? `${(
                            selected.ai_probability * 100
                          ).toFixed(1)}%`
                        : '--'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-[11px] text-slate-400">
                    Dual Neural (MMS-300M):
                  </span>
                  <span className="font-bold text-violet-200">
                    {selected.dual_stream_probability !==
                      undefined &&
                    selected.dual_stream_probability !== null
                      ? `${(
                          selected.dual_stream_probability * 100
                        ).toFixed(1)}%`
                      : '--'}
                  </span>
                </div>

                {selected.modality_gate_alpha !== undefined &&
                  selected.modality_gate_alpha !== null && (
                    <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-white/5">
                      <span>Modality Gate (α):</span>
                      <span>
                        {Number(
                          selected.modality_gate_alpha
                        ).toFixed(3)}
                      </span>
                    </div>
                  )}
              </div>
            </div>

            <div className="rounded-xl border border-violet-300/15 bg-[#030712]/60 p-5 transition hover:border-violet-300/30">
              <div className="flex items-center gap-2 text-[13px] font-bold text-slate-300">
                <Waves size={17} className="text-violet-200" />
                Pipeline Latency
              </div>

              <p className="mt-3 text-3xl font-black font-mono text-white">
                {selected.latency_ms !== undefined &&
                selected.latency_ms !== null
                  ? `${
                      selected.latency_ms.toFixed
                        ? selected.latency_ms.toFixed(1)
                        : selected.latency_ms
                    } ms`
                  : selected.feature_latency_ms !==
                      undefined
                    ? `${selected.feature_latency_ms} ms`
                    : '--'}
              </p>

              <p className="mt-3 text-[11px] leading-4 text-slate-400">
                Real-time synchronized dual-model inference latency.
              </p>
            </div>
          </div>

          {showInspector && (
            <div className="relative overflow-x-auto rounded-xl border border-blue-500/30 bg-black/50 p-5 font-mono text-sm text-blue-200 shadow-[0_0_30px_rgba(36,84,216,0.08)]">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
                  Backend RiskResult Payload
                </span>
                <span className="rounded-md border border-blue-500/20 bg-blue-600/10 px-2.5 py-1 text-xs font-bold text-blue-200">
                  JSON
                </span>
              </div>
              <pre>{JSON.stringify(selected, null, 2)}</pre>
            </div>
          )}
        </div>
      </section>

      <section className="group relative overflow-hidden rounded-2xl border border-blue-500/30 bg-[#07111f]/80 p-5 shadow-[0_0_45px_rgba(36,84,216,0.08)] backdrop-blur-xl mt-8">
        <div className="pointer-events-none absolute -right-24 -top-28 h-72 w-72 rounded-full bg-violet-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 left-1/3 h-56 w-56 rounded-full bg-blue-600/12 blur-3xl" />

        <div className="relative mb-5 flex items-center justify-between border-b border-blue-500/15 pb-4">
          <div className="flex items-center gap-3 text-sm font-bold font-mono uppercase tracking-wider">
            <div className="flex size-8 items-center justify-center rounded-lg border border-blue-500/30 bg-blue-500/10 shadow-[0_0_18px_rgba(36,84,216,0.15)]">
              <Bell
                size={18}
                className="animate-pulse text-blue-200"
              />
            </div>

            <span className="bg-gradient-to-r from-blue-200 via-violet-200 to-fuchsia-200 bg-clip-text text-transparent">
              Live Security Notifications & Telemetry Feed
            </span>
          </div>

          <span className="rounded-md border border-blue-500/40 bg-blue-500/10 px-3 py-1.5 text-xs font-bold font-mono tracking-wider text-blue-200 shadow-[0_0_18px_rgba(36,84,216,0.08)]">
            ● SEC-OPS ACTIVE
          </span>
        </div>

        <div className="relative grid grid-cols-1 gap-4 md:grid-cols-2">
          {securityNotifications.map((notif) => (
            <div
              key={notif.id}
              className={`group/notif relative flex items-start gap-4 overflow-hidden rounded-xl border p-5 backdrop-blur-sm transition-all duration-300 ${
                notif.type === 'danger'
                  ? 'border-red-400/45 bg-gradient-to-r from-red-500/[0.14] via-red-500/[0.06] to-transparent text-red-200'
                  : notif.type === 'success'
                    ? 'border-emerald-400/40 bg-gradient-to-r from-emerald-400/[0.12] via-emerald-400/[0.04] to-transparent text-emerald-200'
                    : 'border-blue-600/30 bg-gradient-to-r from-blue-600/[0.10] via-violet-400/[0.04] to-transparent text-slate-200'
              }`}
            >
              <div className="mt-0.5 shrink-0">
                {notif.type === 'danger' ? (
                  <div className="flex size-10 items-center justify-center rounded-lg border border-red-300/30 bg-red-400/10">
                    <ShieldAlert
                      size={20}
                      className="animate-pulse text-red-200"
                    />
                  </div>
                ) : notif.type === 'success' ? (
                  <div className="flex size-10 items-center justify-center rounded-lg border border-emerald-300/30 bg-emerald-400/10">
                    <CheckCircle2
                      size={20}
                      className="text-emerald-200"
                    />
                  </div>
                ) : (
                  <div className="flex size-10 items-center justify-center rounded-lg border border-blue-500/30 bg-blue-600/10">
                    <Radio
                      size={20}
                      className="animate-pulse text-blue-200"
                    />
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-base font-bold tracking-tight text-white">
                    {notif.title}
                  </p>

                  <span className="shrink-0 text-xs font-bold font-mono uppercase tracking-wide text-slate-400">
                    {notif.time}
                  </span>
                </div>

                <p className="mt-2 truncate text-sm font-mono leading-relaxed text-slate-300">
                  {notif.message}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
