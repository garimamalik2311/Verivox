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
  Fingerprint,
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
          className="pointer-events-none absolute top-0 bottom-0 z-20 w-[2px] bg-cyan-300 shadow-[0_0_14px_rgba(34,211,238,0.9)]"
          style={{
            left: `${4 + ((spectrogramFrame * 0.35) % 92)}%`
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
                        : 'bg-cyan-400 shadow-[0_0_7px_rgba(34,211,238,0.5)]'
                } else if (intensity > 25) {
                  cellClass =
                    bandIdx < 5
                      ? 'bg-fuchsia-500/70'
                      : bandIdx < 10
                        ? 'bg-violet-500/70'
                        : 'bg-cyan-500/60'
                } else {
                  cellClass =
                    bandIdx < 5
                      ? 'bg-fuchsia-500/35'
                      : bandIdx < 10
                        ? 'bg-violet-500/35'
                        : 'bg-cyan-500/30'
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
  isFilePlaying,
  toggleFilePlayback,
  fileName,
  transcript,
  transcriptLanguage
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

  // --- Biometric Speaker Verification status derivation ---
  const hasSpeakerData = selected.speaker_similarity !== undefined && selected.speaker_similarity !== null
  const speakerMatch = selected.speaker_match
  const speakerSimilarityPct = hasSpeakerData ? Math.round(Number(selected.speaker_similarity) * 100) : null
  const radius = 50
  const circumference = 2 * Math.PI * radius
  const currentScore = selected.rolling_score || 0
  const strokeDashoffset = circumference - currentScore * circumference

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

      {/* 2. VOICE INGESTION & ROLLING RISK PIE CHART */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.3fr_1fr]">
        <section className="relative overflow-hidden flex flex-col justify-center rounded-2xl border border-cyan-300/25 bg-[#07111f]/75 p-5 shadow-[0_0_45px_rgba(34,211,238,0.07)] backdrop-blur-xl">
          <div className="pointer-events-none absolute -right-6 -top-6 opacity-[0.09]">
            <RadioTower size={150} className="text-cyan-300" />
          </div>

          <div className="relative mb-5 flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div className="flex items-center gap-3">
              <div
                className={`flex size-12 items-center justify-center rounded-xl border ${
                  micStatus === 'Live Mic Streaming...'
                    ? 'animate-pulse border-cyan-300/60 bg-cyan-400/15 text-cyan-200 shadow-[0_0_28px_rgba(34,211,238,0.25)]'
                    : 'border-cyan-300/30 bg-cyan-400/[0.08] text-cyan-200'
                }`}
              >
                <Mic size={24} />
              </div>

              <div>
                <h2 className="flex flex-wrap items-center gap-2 text-lg font-bold text-white">
                  Live Voice Ingestion
                  <span className="rounded-full border border-cyan-300/20 bg-cyan-400/[0.07] px-2.5 py-0.5 text-xs font-bold font-mono uppercase tracking-wide text-cyan-200">
                    {micStatus}
                  </span>
                </h2>

                <p className="mt-1 text-sm font-mono text-slate-400">
                  16kHz Mono PCM • Backend VAD
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  micStatus === 'Live Mic Streaming...'
                    ? stopMicrophoneStream()
                    : startMicrophoneStream()
                }
                className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold font-mono transition-all duration-200 ${
                  micStatus === 'Live Mic Streaming...'
                    ? 'border border-red-400/40 bg-red-500/10 text-red-200 hover:border-red-300/60 hover:bg-red-500/20'
                    : 'border border-green-200/50 bg-gradient-to-r from-green-300 to-cyan-400 text-[#030712] hover:scale-[1.02]'
                }`}
              >
                {micStatus === 'Live Mic Streaming...' ? (
                  <>
                    <Square size={16} />
                    Stop Mic
                  </>
                ) : (
                  <>
                    <Play size={16} />
                    Start Live Mic
                  </>
                )}
              </button>

              <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-cyan-300/25 bg-white-400/[0.05] px-4 py-2.5 text-sm font-bold font-mono text-white-200 transition-all hover:bg-cyan-400/10">
                <FileAudio size={16} />
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

          <div className="relative grid grid-cols-1 items-center gap-6 rounded-xl border border-cyan-300/10 bg-[#030712]/65 p-5 backdrop-blur-sm xl:grid-cols-[1fr_240px]">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm font-mono">
                <span className="font-semibold uppercase tracking-wider text-slate-400">
                  Active Audio Signal
                </span>
                <span className="font-black text-cyan-200">
                  {micLevel}% RMS
                </span>
              </div>

              <div className="flex h-14 items-center gap-1 overflow-hidden rounded-lg border border-cyan-300/10 bg-black/40 px-3 py-2">
                {Array.from({ length: 32 }).map((_, index) => {
                  const wave = 20 + ((index * 17) % 40)
                  const height =
                    micLevel > 0
                      ? Math.min(
                          100,
                          Math.max(
                            10,
                            micLevel * (0.45 + wave / 100)
                          )
                        )
                      : 10

                  return (
                    <div
                      key={index}
                      className={`flex-1 rounded-full transition-all duration-75 ${
                        micLevel > 15
                          ? 'bg-gradient-to-t from-cyan-400 via-violet-400 to-fuchsia-400 shadow-[0_0_9px_rgba(34,211,238,0.45)]'
                          : 'bg-gradient-to-t from-cyan-500 to-cyan-200'
                      }`}
                      style={{ height: `${height}%` }}
                    />
                  )
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 xl:border-l border-cyan-300/10 xl:pl-5 text-sm font-mono">
              <div>
                <span className="block text-xs font-bold uppercase tracking-widest text-slate-500">
                  Input
                </span>
                <span className="font-bold text-white">
                  {inputMode === 'mic' ? 'MIC' : 'FILE'}
                </span>
              </div>

              <div>
                <span className="block text-xs font-bold uppercase tracking-widest text-slate-500">
                  Sample Rate
                </span>
                <span className="font-bold text-cyan-200">
                  16 kHz
                </span>
              </div>

              <div>
                <span className="block text-xs font-bold uppercase tracking-widest text-slate-500">
                  Channels
                </span>
                <span className="font-bold text-white">
                  1 Mono
                </span>
              </div>

              <div>
                <span className="block text-xs font-bold uppercase tracking-widest text-slate-500">
                  Transport
                </span>
                <span className="font-bold text-emerald-200">
                  WebSocket
                </span>
              </div>
            </div>
          </div>

          {inputMode === 'mic' &&
            micStatus === 'Live Mic Streaming...' && (
              <div className="mt-5">
                <AudioPlaybackBar
                  label="Live Mic Monitor"
                  isPlaying={isLiveMonitoring}
                  level={micLevel}
                  onToggle={toggleLiveMonitor}
                />
              </div>
            )}
        </section>

        <section className="relative overflow-hidden flex flex-col items-center justify-center rounded-2xl border border-cyan-300/25 bg-[#07111f]/75 p-5 shadow-[0_0_45px_rgba(34,211,238,0.07)] backdrop-blur-xl h-full min-h-[260px]">
          <div className="absolute top-5 left-5 flex items-center gap-3">
            <div
              className={`flex size-12 items-center justify-center rounded-xl border ${
                selected.risk_level === 'HIGH'
                  ? 'border-red-300/60 bg-red-400/15 text-red-200 shadow-[0_0_20px_rgba(239,68,68,0.25)] animate-pulse'
                  : 'border-cyan-300/30 bg-cyan-400/[0.08] text-cyan-200'
              }`}
            >
              <Gauge size={22} />
            </div>

            <div>
              <h2 className="text-base font-bold text-white leading-tight">
                Rolling Risk Score
              </h2>

              <p className="mt-0.5 text-xs font-mono text-slate-400">
                Live Prediction Window
              </p>
            </div>
          </div>

          <div className="relative mt-10 flex h-40 w-40 items-center justify-center">
            <svg
              className="h-full w-full -rotate-90 transform drop-shadow-[0_0_15px_rgba(34,211,238,0.2)]"
              viewBox="0 0 120 120"
            >
              <circle
                cx="60"
                cy="60"
                r={radius}
                fill="none"
                stroke="rgba(255, 255, 255, 0.05)"
                strokeWidth="10"
              />

              <circle
                cx="60"
                cy="60"
                r={radius}
                fill="none"
                stroke={
                  selected.risk_level === 'HIGH'
                    ? '#ef4444'
                    : currentScore > 0.4
                      ? '#fb923c'
                      : '#22d3ee'
                }
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-700 ease-out"
              />
            </svg>

            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-4xl font-black font-mono text-white tracking-tighter">
                {Math.round(currentScore * 100)}
                <span className="text-lg text-slate-400 ml-1">
                  %
                </span>
              </span>

              <span
                className={`mt-2 rounded-md border px-2 py-0.5 text-xs font-black font-mono uppercase tracking-widest ${
                  selected.risk_level === 'HIGH'
                    ? 'border-red-500/40 bg-red-500/20 text-red-200'
                    : currentScore > 0.4
                      ? 'border-orange-500/40 bg-orange-500/20 text-orange-200'
                      : 'border-cyan-500/40 bg-cyan-500/20 text-cyan-200'
                }`}
              >
                {selected.risk_level || 'LOW'} RISK
              </span>
            </div>
          </div>
        </section>
      </div>

      {/* LIVE TRANSCRIPT + AUDIO PLAYBACK */}
      <section className="relative overflow-hidden rounded-2xl border border-cyan-300/15 bg-[#07111f]/80 shadow-[0_0_40px_rgba(34,211,238,0.06)] backdrop-blur-xl">
        <div className="grid lg:grid-cols-[1.35fr_0.85fr]">

          {/* TRANSCRIPT PANEL */}
          <div className="relative border-b border-cyan-300/10 p-5 lg:border-b-0 lg:border-r">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-50" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-cyan-300 shadow-[0_0_10px_rgba(103,232,249,0.9)]" />
                  </span>

                  <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-white">
                    <Waves size={17} className="text-cyan-300" />
                    Live Transcript
                  </h2>
                </div>

                <p className="mt-2 text-[10px] font-mono uppercase tracking-[0.16em] text-slate-500">
                  Streaming speech-to-text • Rolling context
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <span className="rounded-md border border-emerald-400/20 bg-emerald-400/[0.06] px-2 py-1 text-[9px] font-bold font-mono uppercase tracking-wider text-emerald-300">
                  LIVE
                </span>

                {transcriptLanguage && (
                  <span className="rounded-md border border-cyan-300/20 bg-cyan-400/[0.07] px-2 py-1 text-[9px] font-bold font-mono uppercase tracking-wider text-cyan-200">
                    {transcriptLanguage}
                  </span>
                )}
              </div>
            </div>

            <div className="relative mt-5 min-h-[142px] overflow-hidden rounded-xl border border-cyan-300/10 bg-black/35">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/40 to-transparent" />

              <div className="absolute left-3 top-3 flex items-center gap-2 text-[9px] font-mono uppercase tracking-widest text-slate-600">
                <span className="h-1 w-1 rounded-full bg-cyan-300" />
                Voice stream
              </div>

              <div className="relative max-h-[142px] overflow-y-auto px-4 pb-4 pt-9 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-cyan-300/10">
                {transcript ? (
                  <p className="whitespace-pre-wrap text-[13px] leading-7 font-mono text-slate-200">
                    {transcript}
                  </p>
                ) : (
                  <div className="flex min-h-[82px] items-center">
                    <p className="text-xs font-mono text-slate-600">
                      Waiting for speech...
                    </p>
                  </div>
                )}
              </div>

              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-black/50 to-transparent" />
            </div>
          </div>

          {/* AUDIO PLAYBACK PANEL */}
          <div className="relative p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[9px] font-bold font-mono uppercase tracking-[0.18em] text-cyan-300/70">
                  Audio Playback
                </p>
                <h3 className="mt-1 truncate text-sm font-semibold text-white">
                  {fileName || 'No audio loaded'}
                </h3>
              </div>

              <span
                className={`rounded-md border px-2 py-1 text-[9px] font-bold font-mono uppercase tracking-wider ${
                  isFilePlaying
                    ? 'border-cyan-300/30 bg-cyan-400/[0.08] text-cyan-200'
                    : 'border-slate-500/20 bg-slate-500/[0.05] text-slate-500'
                }`}
              >
                {isFilePlaying ? 'PLAYING' : 'READY'}
              </span>
            </div>

            {/* WAVEFORM */}
            <div className="relative mt-5 h-[92px] overflow-hidden rounded-xl border border-cyan-300/10 bg-black/40 px-3">
              <div className="absolute inset-x-0 top-1/2 h-px bg-cyan-300/10" />

              <div className="relative flex h-full items-center justify-between gap-[3px]">
                {Array.from({ length: 48 }).map((_, index) => {
                  const activeLevel = isFilePlaying ? Math.max(Number(micLevel) || 0, 8) : 5
                  const waveShape =
                    0.22 +
                    Math.abs(Math.sin(index * 0.63)) * 0.48 +
                    Math.abs(Math.cos(index * 0.19)) * 0.22
                  const height = Math.max(
                    4,
                    Math.min(78, activeLevel * waveShape * (isFilePlaying ? 0.72 : 0.22))
                  )

                  return (
                    <span
                      key={index}
                      className={`w-full max-w-[4px] rounded-full transition-all duration-150 ${
                        isFilePlaying
                          ? 'bg-cyan-300 shadow-[0_0_8px_rgba(103,232,249,0.45)]'
                          : 'bg-slate-700'
                      }`}
                      style={{
                        height: `${height}px`,
                        opacity: isFilePlaying ? 0.45 + (index % 5) * 0.1 : 0.45
                      }}
                    />
                  )
                })}
              </div>

              {isFilePlaying && (
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-cyan-400/[0.03] via-transparent to-cyan-400/[0.03]" />
              )}
            </div>

            <div className="mt-3 flex items-center justify-between text-[9px] font-mono uppercase tracking-wider text-slate-600">
              <span>{isFilePlaying ? 'Live playback signal' : 'Playback idle'}</span>
              <span>{isFilePlaying ? `${Math.round(Number(micLevel) || 0)}% level` : '—'}</span>
            </div>

            <div className="mt-4">
              <AudioPlaybackBar
                label={fileName ? `Playback: ${fileName}` : 'Upload audio to enable playback'}
                isPlaying={isFilePlaying}
                level={micLevel}
                onToggle={toggleFilePlayback}
                disabled={!fileName}
              />
            </div>
          </div>
        </div>
      </section>

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
            iconClass: 'text-cyan-200',
            glow: 'hover:border-cyan-300/40'
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

      <section className="relative overflow-hidden flex flex-col justify-between rounded-2xl border border-violet-400/25 bg-[#07111f]/75 p-6 shadow-[0_0_45px_rgba(139,92,246,0.07)] backdrop-blur-xl h-full min-h-[240px]">
        <div className="pointer-events-none absolute -left-10 -bottom-10 h-40 w-40 rounded-full bg-fuchsia-500/10 blur-3xl" />

        <div className="flex items-center justify-between mb-5 relative z-10">
          <div className="flex items-center gap-3">
            <div
              className={`flex size-12 items-center justify-center rounded-xl border ${
                micLevel > 5
                  ? 'border-violet-300/60 bg-violet-400/15 text-violet-200 shadow-[0_0_20px_rgba(139,92,246,0.25)] animate-pulse'
                  : 'border-violet-300/30 bg-violet-400/[0.08] text-violet-200'
              }`}
            >
              <Waves size={22} />
            </div>

            <div>
              <h2 className="text-base font-bold text-white leading-tight">
                Live Spectrogram
              </h2>

              <p className="mt-0.5 text-xs font-mono text-slate-400">
                Time / Freq Analysis
              </p>
            </div>
          </div>

          <span
            className={`rounded-md border px-3 py-1.5 text-xs font-bold font-mono uppercase tracking-wider ${
              micLevel > 0
                ? 'border-violet-300/30 bg-violet-400/[0.10] text-violet-200 shadow-[0_0_12px_rgba(139,92,246,0.12)]'
                : 'border-slate-500/20 bg-slate-500/[0.05] text-slate-500'
            }`}
          >
            {micLevel > 0 ? 'Analyzing' : 'Standby'}
          </span>
        </div>

        <SpectrogramVisualizer micLevel={micLevel} />

        <div className="mt-4 relative z-10 flex items-center justify-between text-xs font-mono font-bold uppercase tracking-widest text-slate-500">
          <span>0 kHz</span>
          <span className="text-violet-300/70">
            {micLevel > 0
              ? `${Math.round(micLevel)}% SIGNAL`
              : 'NO SIGNAL'}
          </span>
          <span>8 kHz</span>
        </div>

        {/* --- Audio Playback Bar: live mic monitor --- */}
        {inputMode === 'mic' && micStatus === 'Live Mic Streaming...' && (
          <div className="mt-4">
            <AudioPlaybackBar label="Live Mic Monitor" isPlaying={isLiveMonitoring} level={micLevel} onToggle={toggleLiveMonitor} />
          </div>
        )}

        {/* --- Audio Playback Bar: uploaded file playback --- */}
        {inputMode === 'file' && fileName && (
          <div className="mt-4">
            <AudioPlaybackBar
              label={`Playing: ${fileName}`}
              isPlaying={isFilePlaying}
              level={micLevel}
              onToggle={toggleFilePlayback}
            />
          </div>
        )}
      </section>

      <section className="relative overflow-hidden rounded-2xl border border-cyan-300/20 bg-[#07111f]/75 p-6 shadow-[0_0_40px_rgba(34,211,238,0.05)] backdrop-blur-xl">
        <div className="pointer-events-none absolute right-0 top-0 h-52 w-52 rounded-full bg-violet-500/12 blur-3xl" />

        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <p className="text-xs font-bold font-mono uppercase tracking-widest text-cyan-200">
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
            className="rounded-xl border border-cyan-300/35 bg-cyan-400/[0.08] px-5 py-3 text-sm font-bold font-mono uppercase tracking-widest text-cyan-200 transition-all hover:bg-cyan-400/15 disabled:opacity-40"
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
              className="w-full rounded-xl border border-cyan-300/15 bg-[#030712]/70 px-4 py-3 text-sm font-mono text-white outline-none disabled:opacity-50"
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

            <div className="flex items-center rounded-xl border border-cyan-300/15 bg-[#030712]/70 px-4 focus-within:border-cyan-300/50">
              <span className="mr-3 text-base font-black font-mono text-cyan-200">
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
                <span className="font-bold text-cyan-200">
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
                      ? 'border-cyan-300/50 bg-gradient-to-r from-cyan-400/[0.12] via-violet-500/[0.08] to-transparent shadow-[0_0_28px_rgba(34,211,238,0.09)]'
                      : 'border-white/10 bg-white/[0.02] hover:border-cyan-300/25 hover:bg-white/[0.04]'
                  }`}
                >
                  {activeStreamId === id && (
                    <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-cyan-300 via-violet-400 to-fuchsia-400" />
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

            <span className="rounded-lg border border-cyan-300/25 bg-cyan-400/[0.07] px-3 py-1.5 font-mono text-sm font-bold text-cyan-200">
              {activeStreamId}
            </span>
          </div>

          <div className="relative grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl border border-cyan-300/15 bg-[#030712]/60 p-5 transition hover:border-cyan-300/30">
              <div className="flex items-center gap-2 text-[13px] font-bold text-slate-300">
                <Gauge size={17} className="text-cyan-200" />
                Rolling Risk Score (Ensemble)
              </div>

              <p className="mt-3 text-3xl font-black font-mono text-white">
                {formatScore(selected.rolling_score, 3)}
              </p>

              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-violet-400 to-fuchsia-400 shadow-[0_0_14px_rgba(34,211,238,0.5)] transition-all duration-500"
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
                  <span className="font-bold text-cyan-200">
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

          {/* --- Biometric Voiceprint Verification card --- */}
          <div className={`rounded-xl border p-5 ${
            !hasSpeakerData
              ? 'border-verivox-border bg-verivox-cardHover'
              : speakerMatch
                ? 'border-emerald-400/30 bg-emerald-400/5'
                : 'border-verivox-pink/40 bg-verivox-pink/5'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                <Fingerprint size={16} className="text-verivox-cyan" />
                Biometric Voiceprint Verification
              </div>
              {!hasSpeakerData ? (
                <span className="text-[10px] font-mono px-2 py-1 rounded-full bg-verivox-cardHover border border-verivox-border text-slate-400 uppercase">
                  Awaiting Speech
                </span>
              ) : speakerMatch ? (
                <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-1 rounded-full bg-emerald-400/10 border border-emerald-400/30 text-emerald-400 uppercase">
                  <CheckCircle2 size={11} /> Verified Authorized Speaker
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-1 rounded-full bg-verivox-pink/10 border border-verivox-pink/40 text-verivox-pink uppercase">
                  <ShieldAlert size={11} /> Voice Mismatch / Impostor
                </span>
              )}
            </div>

            <div className="flex justify-between gap-4 text-xs mb-2">
              <span className="text-slate-400">Enrolled Reference</span>
              <span className="font-mono font-bold text-white text-right">
                {selected.speaker_id || 'authorized_user'} (demo/real_voice.wav)
              </span>
            </div>

            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-slate-400">Similarity Score</span>
              <span className="font-mono font-bold text-verivox-cyan">
                {hasSpeakerData ? `${speakerSimilarityPct}%` : '--'}
              </span>
            </div>

            <div className="h-1.5 w-full bg-verivox-border rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${speakerMatch ? 'bg-emerald-400' : 'bg-verivox-pink'}`}
                style={{ width: hasSpeakerData ? `${Math.min(Math.max(speakerSimilarityPct, 0), 100)}%` : '0%' }}
              />
            </div>
          </div>

          {showInspector && (
            <div className="relative overflow-x-auto rounded-xl border border-cyan-300/30 bg-black/50 p-5 font-mono text-sm text-cyan-200 shadow-[0_0_30px_rgba(34,211,238,0.08)]">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
                  Backend RiskResult Payload
                </span>
                <span className="rounded-md border border-cyan-300/20 bg-cyan-400/10 px-2.5 py-1 text-xs font-bold text-cyan-200">
                  JSON
                </span>
              </div>
              <pre>{JSON.stringify(selected, null, 2)}</pre>
            </div>
          )}
        </div>
      </section>

      <section className="group relative overflow-hidden rounded-2xl border border-cyan-300/30 bg-[#07111f]/80 p-5 shadow-[0_0_45px_rgba(34,211,238,0.08)] backdrop-blur-xl mt-8">
        <div className="pointer-events-none absolute -right-24 -top-28 h-72 w-72 rounded-full bg-violet-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 left-1/3 h-56 w-56 rounded-full bg-cyan-400/12 blur-3xl" />

        <div className="relative mb-5 flex items-center justify-between border-b border-cyan-300/15 pb-4">
          <div className="flex items-center gap-3 text-sm font-bold font-mono uppercase tracking-wider">
            <div className="flex size-8 items-center justify-center rounded-lg border border-cyan-300/30 bg-cyan-300/10 shadow-[0_0_18px_rgba(34,211,238,0.15)]">
              <Bell
                size={18}
                className="animate-pulse text-cyan-200"
              />
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
            <div
              key={notif.id}
              className={`group/notif relative flex items-start gap-4 overflow-hidden rounded-xl border p-5 backdrop-blur-sm transition-all duration-300 ${
                notif.type === 'danger'
                  ? 'border-red-400/45 bg-gradient-to-r from-red-500/[0.14] via-red-500/[0.06] to-transparent text-red-200'
                  : notif.type === 'success'
                    ? 'border-emerald-400/40 bg-gradient-to-r from-emerald-400/[0.12] via-emerald-400/[0.04] to-transparent text-emerald-200'
                    : 'border-cyan-400/30 bg-gradient-to-r from-cyan-400/[0.10] via-violet-400/[0.04] to-transparent text-slate-200'
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
                  <div className="flex size-10 items-center justify-center rounded-lg border border-cyan-300/30 bg-cyan-400/10">
                    <Radio
                      size={20}
                      className="animate-pulse text-cyan-200"
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
