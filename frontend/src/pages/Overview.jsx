
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
  CheckCircle2,
  Cpu
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
  // Generate dynamic security notification items based on current stream states
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

  return (
    <div className="relative space-y-8">

      {/* =====================================================
          SECURITY NOTIFICATION BANNER / FEED
      ===================================================== */}

      <section className="group relative overflow-hidden rounded-2xl border border-cyan-300/30 bg-[#07111f]/80 p-4 shadow-[0_0_45px_rgba(34,211,238,0.08)] backdrop-blur-xl">

        <div className="pointer-events-none absolute -right-24 -top-28 h-64 w-64 rounded-full bg-violet-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 left-1/3 h-48 w-48 rounded-full bg-cyan-400/12 blur-3xl" />

        <div className="relative mb-4 flex items-center justify-between border-b border-cyan-300/15 pb-3">

          <div className="flex items-center gap-2.5 text-[13px] font-bold font-mono uppercase tracking-wider">

            <div className="flex size-7 items-center justify-center rounded-lg border border-cyan-300/30 bg-cyan-300/10 shadow-[0_0_18px_rgba(34,211,238,0.15)]">
              <Bell
                size={15}
                className="animate-pulse text-cyan-200"
              />
            </div>

            <span className="bg-gradient-to-r from-cyan-200 via-violet-200 to-fuchsia-200 bg-clip-text text-transparent">
              Live Security Notifications & Telemetry Feed
            </span>

          </div>

          <span className="rounded-md border border-cyan-300/40 bg-cyan-300/10 px-2.5 py-1 text-[10px] font-bold font-mono tracking-wider text-cyan-200 shadow-[0_0_18px_rgba(34,211,238,0.08)]">
            ● SEC-OPS ACTIVE
          </span>

        </div>

        <div className="relative grid grid-cols-1 gap-3 md:grid-cols-2">

          {securityNotifications.map((notif) => (

            <div
              key={notif.id}
              className={`group/notif relative flex items-start gap-3 overflow-hidden rounded-xl border p-4 backdrop-blur-sm transition-all duration-300 ${
                notif.type === 'danger'
                  ? 'border-red-400/45 bg-gradient-to-r from-red-500/[0.14] via-red-500/[0.06] to-transparent text-red-200 shadow-[0_0_30px_rgba(239,68,68,0.10)] hover:border-red-300/60'
                  : notif.type === 'success'
                  ? 'border-emerald-400/40 bg-gradient-to-r from-emerald-400/[0.12] via-emerald-400/[0.04] to-transparent text-emerald-200 shadow-[0_0_25px_rgba(16,185,129,0.08)] hover:border-emerald-300/55'
                  : 'border-cyan-400/30 bg-gradient-to-r from-cyan-400/[0.10] via-violet-400/[0.04] to-transparent text-slate-200 shadow-[0_0_25px_rgba(34,211,238,0.06)] hover:border-cyan-300/50'
              }`}
            >

              <div className="pointer-events-none absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-red-300 via-red-500 to-orange-400 shadow-[0_0_15px_rgba(239,68,68,0.6)]" />


              <div className="mt-0.5 shrink-0">

                {notif.type === 'danger' ? (
                  <div className="flex size-8 items-center justify-center rounded-lg border border-red-300/30 bg-red-400/10 shadow-[0_0_18px_rgba(239,68,68,0.12)]">
                    <ShieldAlert
                      size={17}
                      className="animate-pulse text-red-200"
                    />
                  </div>
                ) : notif.type === 'success' ? (
                  <div className="flex size-8 items-center justify-center rounded-lg border border-emerald-300/30 bg-emerald-400/10">
                    <CheckCircle2
                      size={17}
                      className="text-emerald-200"
                    />
                  </div>
                ) : (
                  <div className="flex size-8 items-center justify-center rounded-lg border border-cyan-300/30 bg-cyan-400/10">
                    <Radio
                      size={17}
                      className="animate-pulse text-cyan-200"
                    />
                  </div>
                )}

              </div>

              <div className="min-w-0 flex-1">

                <div className="flex items-center justify-between gap-3">

                  <p className="text-[13px] font-bold tracking-tight text-white">
                    {notif.title}
                  </p>

                  <span className="shrink-0 text-[10px] font-bold font-mono uppercase tracking-wide text-slate-400">
                    {notif.time}
                  </span>

                </div>

                <p className="mt-1.5 truncate text-xs font-mono leading-5 text-slate-300">
                  {notif.message}
                </p>

              </div>

            </div>
          ))}

        </div>
      </section>


      {/* =====================================================
          HERO
      ===================================================== */}

      <section className="relative max-w-3xl">

        <div className="mb-3 flex items-center gap-2">

          <span className="h-px w-8 bg-gradient-to-r from-cyan-300 to-violet-400" />

          <p className="text-[11px] font-bold font-mono uppercase tracking-[0.2em] text-cyan-200">
            Live Protection
          </p>

        </div>

        <h1 className="text-3xl font-black leading-tight tracking-tight text-white md:text-4xl">

          Keep every{' '}

          <span className="bg-gradient-to-r from-cyan-200 via-violet-200 to-fuchsia-200 bg-clip-text text-transparent">
            conversation
          </span>{' '}

          trustworthy.

        </h1>

        <p className="mt-3 max-w-2xl text-[15px] leading-7 text-slate-300">
          VeriVox receives live audio, processes rolling windows through the
          backend inference pipeline, and displays the resulting synthetic-voice
          risk telemetry in real time.
        </p>

      </section>


      {/* =====================================================
          VOICE INGESTION
      ===================================================== */}

      <section className="relative overflow-hidden rounded-2xl border border-cyan-300/25 bg-[#07111f]/75 p-5 shadow-[0_0_45px_rgba(34,211,238,0.07)] backdrop-blur-xl">

        <div className="pointer-events-none absolute -right-6 -top-6 opacity-[0.09]">

          <RadioTower
            size={150}
            className="text-cyan-300"
          />

        </div>

        <div className="relative mb-5 flex flex-col justify-between gap-4 md:flex-row md:items-center">

          <div className="flex items-center gap-3">

            <div
              className={`flex size-11 items-center justify-center rounded-xl border ${
                micStatus === 'Live Mic Streaming...'
                  ? 'animate-pulse border-cyan-300/60 bg-cyan-400/15 text-cyan-200 shadow-[0_0_28px_rgba(34,211,238,0.25)]'
                  : 'border-cyan-300/30 bg-cyan-400/[0.08] text-cyan-200'
              }`}
            >
              <Mic size={20} />
            </div>

            <div>

              <h2 className="flex flex-wrap items-center gap-2 text-[15px] font-bold text-white">

                Live Voice Ingestion

                <span className="rounded-full border border-cyan-300/20 bg-cyan-400/[0.07] px-2 py-0.5 text-[10px] font-bold font-mono uppercase tracking-wide text-cyan-200">
                  {micStatus}
                </span>

              </h2>

              <p className="mt-1 text-xs font-mono text-slate-400">
                16kHz Mono PCM • Backend VAD • 58-D Feature Extractor
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
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold font-mono transition-all duration-200 ${
                micStatus === 'Live Mic Streaming...'
                  ? 'border border-red-400/40 bg-red-500/10 text-red-200 shadow-[0_0_20px_rgba(239,68,68,0.08)] hover:border-red-300/60 hover:bg-red-500/20 hover:shadow-[0_0_25px_rgba(239,68,68,0.15)]'
                  : 'border border-green-200/50 bg-gradient-to-r from-green-300 to-cyan-400 text-[#030712] shadow-[0_0_28px_rgba(34,211,238,0.20)] hover:scale-[1.02] hover:shadow-[0_0_35px_rgba(34,211,238,0.30)]'
              }`}
            >

              {micStatus === 'Live Mic Streaming...' ? (
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

            <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-cyan-300/25 bg-white-400/[0.05] px-4 py-2.5 text-xs font-bold font-mono text-white-200 transition-all hover:border-cyan-300/50 hover:bg-cyan-400/10 hover:shadow-[0_0_20px_rgba(34,211,238,0.08)]">

              <FileAudio size={14} />
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

        <div className="relative grid grid-cols-1 items-center gap-6 rounded-xl border border-cyan-300/10 bg-[#030712]/65 p-4 backdrop-blur-sm md:grid-cols-[1fr_280px]">

          <div className="space-y-2">

            <div className="flex items-center justify-between text-xs font-mono">

              <span className="font-semibold uppercase tracking-wider text-slate-400">
                Active Audio Signal
              </span>

              <span className="font-black text-cyan-200">
                {micLevel}% RMS
              </span>

            </div>

            <div className="flex h-12 items-center gap-1 overflow-hidden rounded-lg border border-cyan-300/10 bg-black/40 px-3 py-2">

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

          <div className="grid grid-cols-2 gap-3 border-l border-cyan-300/10 pl-4 text-xs font-mono">

            <div>
              <span className="block text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Input
              </span>
              <span className="font-bold text-white">
                {inputMode === 'mic' ? 'MIC' : 'FILE'}
              </span>
            </div>

            <div>
              <span className="block text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Sample Rate
              </span>
              <span className="font-bold text-cyan-200">
                16 kHz
              </span>
            </div>

            <div>
              <span className="block text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Channels
              </span>
              <span className="font-bold text-white">
                1 Mono
              </span>
            </div>

            <div>
              <span className="block text-[10px] font-bold uppercase tracking-widest text-slate-500">
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


      {/* =====================================================
          SYNTHETIC VOICE ALERT
      ===================================================== */}

      {selected.alert_triggered && (
        <section className="relative flex flex-col gap-4 overflow-hidden rounded-2xl border border-red-400/55 bg-gradient-to-r from-red-500/[0.16] via-red-500/[0.07] to-transparent p-5 shadow-[0_0_55px_rgba(239,68,68,0.14)] md:flex-row md:items-center md:justify-between">

          <div className="pointer-events-none absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-red-300 via-red-500 to-orange-400 shadow-[0_0_15px_rgba(239,68,68,0.6)]" />

          <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-red-500/15 blur-3xl" />

          <div className="relative flex items-start gap-3">

            <div className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl border border-red-300/35 bg-red-400/10 shadow-[0_0_25px_rgba(239,68,68,0.15)]">

              <AlertTriangle
                size={22}
                className="animate-pulse text-red-200"
              />

            </div>

            <div>

              <div className="flex items-center gap-2">

                <span className="rounded-md border border-red-300/30 bg-red-400/10 px-2 py-0.5 text-[10px] font-black font-mono uppercase tracking-widest text-red-200">
                  Critical Detection
                </span>

              </div>

              <h2 className="mt-2 text-[15px] font-bold text-white">
                Synthetic Voice Clone Detected
              </h2>

              <p className="mt-1 text-xs leading-5 font-mono text-slate-200">

                {selected.alert_reason ===
                'persistent_high_ai_probability'
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
            className="relative flex shrink-0 items-center gap-2 rounded-lg border border-red-300/40 bg-red-500/15 px-3.5 py-2 text-xs font-bold font-mono text-red-200 transition hover:border-red-200/60 hover:bg-red-500/25 hover:text-white hover:shadow-[0_0_20px_rgba(239,68,68,0.15)]"
          >
            <X size={14} />
            Acknowledge Alert
          </button>

        </section>
      )}


      {/* =====================================================
          SECURITY CONTEXT
      ===================================================== */}

      <section className="relative overflow-hidden rounded-2xl border border-cyan-300/20 bg-[#07111f]/75 p-5 shadow-[0_0_40px_rgba(34,211,238,0.05)] backdrop-blur-xl">

        <div className="pointer-events-none absolute right-0 top-0 h-44 w-44 rounded-full bg-violet-500/12 blur-3xl" />

        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">

          <div>

            <div className="flex items-center gap-2">

              <p className="text-[11px] font-bold font-mono uppercase tracking-widest text-cyan-200">
                Security Context
              </p>

              <span className="rounded-full border border-violet-300/25 bg-violet-400/10 px-2 py-0.5 text-[10px] font-bold font-mono uppercase tracking-wider text-violet-200">
                Demo · Simulated
              </span>

            </div>

            <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-400">
              Select the security scenario before voice analysis. Audio remains
              the live detector input; this context simulates the transaction or
              access workflow used by the risk engine.
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
            className="rounded-xl border border-cyan-300/35 bg-cyan-400/[0.08] px-4 py-2.5 text-[11px] font-bold font-mono uppercase tracking-widest text-cyan-200 transition-all hover:border-cyan-200/60 hover:bg-cyan-400/15 hover:shadow-[0_0_25px_rgba(34,211,238,0.10)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {contextConfigured
              ? 'Context Applied'
              : 'Apply Security Context'}
          </button>

        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">

          <div>

            <label className="mb-2 block text-[11px] font-bold font-mono uppercase tracking-widest text-slate-500">
              Security Scenario
            </label>

            <select
              value={selectedScenario}
              onChange={(event) =>
                setSelectedScenario(event.target.value)
              }
              disabled={
                contextConfigured ||
                isLiveMonitoring ||
                securityTerminated
              }
              className="w-full rounded-xl border border-cyan-300/15 bg-[#030712]/70 px-3 py-2.5 text-[13px] font-mono text-white outline-none transition focus:border-cyan-300/50 focus:ring-1 focus:ring-cyan-300/20 disabled:cursor-not-allowed disabled:opacity-50"
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

            <label className="mb-2 block text-[11px] font-bold font-mono uppercase tracking-widest text-slate-500">
              Transaction Amount · INR
            </label>

            <div className="flex items-center rounded-xl border border-cyan-300/15 bg-[#030712]/70 px-3 focus-within:border-cyan-300/50 focus-within:shadow-[0_0_20px_rgba(34,211,238,0.06)]">

              <span className="mr-2 text-[15px] font-black font-mono text-cyan-200">
                ₹
              </span>

              <input
                type="number"
                min="0"
                step="1000"
                value={transactionAmountInr}
                onChange={(event) =>
                  setTransactionAmountInr(event.target.value)
                }
                disabled={
                  selectedScenario !==
                    'high_value_transaction' ||
                  contextConfigured ||
                  isLiveMonitoring ||
                  securityTerminated
                }
                placeholder="e.g. 525000"
                className="w-full bg-transparent py-2.5 text-[13px] font-mono text-white outline-none placeholder:text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
              />

            </div>
          </div>

        </div>

        <div className="mt-4 grid gap-2 md:grid-cols-4">

          {[
            {
              label: 'Amount',
              value:
                selected.transaction_amount_inr !== null &&
                selected.transaction_amount_inr !== undefined
                  ? `₹${Number(
                      selected.transaction_amount_inr
                    ).toLocaleString('en-IN')}`
                  : selectedScenario ===
                      'high_value_transaction' &&
                    transactionAmountInr
                  ? `₹${Number(
                      transactionAmountInr
                    ).toLocaleString('en-IN')}`
                  : 'Not applicable'
            },
            {
              label: 'Resolved Scenario',
              value:
                (
                  selected.notification_scenario ||
                  'Not configured'
                ).replaceAll('_', ' ')
            },
            {
              label: 'Resolution',
              value:
                selected.scenario_source ===
                'transaction_amount'
                  ? 'AUTO · AMOUNT'
                  : selected.scenario_source === 'explicit'
                  ? 'EXPLICIT'
                  : selected.notification_scenario
                  ? 'DEFAULT'
                  : 'PENDING',
              accent: true
            },
            {
              label: 'Workflow',
              value:
                selected.response_workflow_status ||
                'CONTEXT PENDING',
              workflow: true
            }
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-xl border border-white/10 bg-[#030712]/60 px-3 py-3 backdrop-blur-sm transition hover:border-cyan-300/20"
            >

              <p className="text-[10px] font-bold font-mono uppercase tracking-widest text-slate-500">
                {item.label}
              </p>

              <p
                className={`mt-1 text-[13px] font-bold ${
                  item.workflow &&
                  selected.response_workflow_status ===
                    'TRIGGERED'
                    ? 'text-red-200'
                    : item.accent
                    ? 'text-cyan-200'
                    : 'text-white'
                }`}
              >
                {item.value}
              </p>

            </div>
          ))}

        </div>
      </section>


      {/* =====================================================
          SECURITY RESPONSE
      ===================================================== */}

      {selected.notification_triggered && (
        <section className="relative overflow-hidden rounded-2xl border border-red-400/50 bg-gradient-to-br from-red-500/[0.15] via-red-500/[0.06] to-transparent p-5 shadow-[0_0_55px_rgba(239,68,68,0.12)]">

          <div className="pointer-events-none absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-red-300 via-red-500 to-orange-400 shadow-[0_0_18px_rgba(239,68,68,0.45)]" />

          <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-red-500/15 blur-3xl" />

          <div className="relative flex flex-col gap-4 md:flex-row md:items-start md:justify-between">

            <div className="flex items-start gap-3">

              <div className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl border border-red-300/35 bg-red-400/10 shadow-[0_0_25px_rgba(239,68,68,0.12)]">

                <ShieldAlert
                  size={22}
                  className="animate-pulse text-red-200"
                />

              </div>

              <div className="min-w-0">

                <div className="flex flex-wrap items-center gap-2">

                  <p className="text-[11px] font-black font-mono uppercase tracking-[0.16em] text-red-200">
                    SIH SECURITY RESPONSE
                  </p>

                  <span className="rounded-md border border-red-300/35 bg-red-400/10 px-2 py-0.5 text-[11px] font-black font-mono text-red-200">
                    {selected.notification_severity ||
                      'HIGH'}
                  </span>

                </div>

                <h2 className="mt-2 text-base font-bold text-white">
                  {selected.notification_title ||
                    'Voice Impersonation Alert'}
                </h2>

                {selected.notification_message && (
                  <p className="mt-2 max-w-3xl text-[13px] leading-5 text-slate-200">
                    {selected.notification_message}
                  </p>
                )}

              </div>
            </div>

            <div className="shrink-0 rounded-lg border border-red-300/15 bg-black/30 px-3 py-2 text-[11px] font-mono text-slate-400">

              <div>
                Scenario:{' '}
                <span className="font-bold text-white">
                  {selected.notification_scenario ||
                    'routine_support'}
                </span>
              </div>

              <div className="mt-1">
                Privacy:{' '}
                <span className="font-bold text-cyan-200">
                  {selected.privacy_mode ||
                    'feature_only'}
                </span>
              </div>

            </div>

          </div>

          <div className="relative mt-5 border-t border-red-300/15 pt-4">

            <p className="mb-3 text-[11px] font-bold font-mono uppercase tracking-widest text-slate-400">
              Detection Policy
            </p>

            <div className="grid gap-2 md:grid-cols-3">

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
                    typeof selected.rolling_score ===
                    'number'
                      ? `${(
                          selected.rolling_score * 100
                        ).toFixed(1)}%`
                      : '—'
                }
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-xl border border-red-300/10 bg-[#030712]/55 px-3 py-3"
                >

                  <p className="text-[10px] font-bold font-mono uppercase tracking-widest text-slate-500">
                    {item.label}
                  </p>

                  <p className="mt-1 text-[13px] font-black text-white">
                    {item.value}
                  </p>

                </div>
              ))}

            </div>
          </div>

          {Array.isArray(
            selected.recommended_actions
          ) &&
            selected.recommended_actions.length > 0 && (
              <div className="relative mt-5 border-t border-red-300/15 pt-4">

                <p className="mb-3 text-[11px] font-bold font-mono uppercase tracking-widest text-slate-400">
                  Recommended Response Actions
                </p>

                <div className="grid gap-2 md:grid-cols-2">

                  {selected.recommended_actions.map(
                    (action, index) => (
                      <div
                        key={`${action}-${index}`}
                        className="flex items-start gap-3 rounded-xl border border-white/10 bg-[#030712]/55 px-3 py-3 transition hover:border-red-300/20"
                      >

                        <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-red-300/25 bg-red-400/10 text-[11px] font-black font-mono text-red-200">
                          {index + 1}
                        </span>

                        <span className="text-[13px] leading-5 text-slate-200">
                          {action}
                        </span>

                      </div>
                    )
                  )}

                </div>
              </div>
            )}

          {Array.isArray(selected.dispatch_channels) &&
            selected.dispatch_channels.length > 0 && (
              <div className="relative mt-4 flex flex-wrap items-center gap-2 border-t border-red-300/15 pt-4">

                <span className="text-[11px] font-bold font-mono uppercase tracking-widest text-slate-500">
                  Dispatch Channels
                </span>

                {selected.dispatch_channels.map(
                  (channel) => (
                    <span
                      key={channel}
                      className="rounded-md border border-cyan-300/25 bg-cyan-400/[0.08] px-2 py-1 text-[11px] font-bold font-mono text-cyan-200"
                    >
                      {channel}
                    </span>
                  )
                )}

              </div>
            )}

          {Array.isArray(selected.dispatch_results) &&
            selected.dispatch_results.length > 0 && (
              <div className="relative mt-4 border-t border-red-300/15 pt-4">

                <span className="text-[11px] font-bold font-mono uppercase tracking-widest text-slate-500">
                  Dispatch Status
                </span>

                <div className="mt-3 grid gap-2 sm:grid-cols-2">

                  {selected.dispatch_results.map(
                    (item) => {

                      const providerStatus =
                        String(
                          item.provider_status || ''
                        ).toLowerCase()

                      const status = item.delivered
                        ? 'DELIVERED'
                        : providerStatus
                        ? providerStatus.toUpperCase()
                        : item.attempted
                        ? 'SENT'
                        : 'NOT SENT'

                      const failed =
                        providerStatus === 'failed' ||
                        providerStatus ===
                          'undelivered'

                      const statusClass =
                        item.delivered
                          ? 'text-emerald-200 border-emerald-400/30 bg-emerald-400/[0.08]'
                          : failed
                          ? 'text-red-200 border-red-400/30 bg-red-400/[0.08]'
                          : providerStatus
                          ? 'text-cyan-200 border-cyan-400/25 bg-cyan-400/[0.07]'
                          : 'text-slate-400 border-white/10 bg-white/[0.03]'

                      return (
                        <div
                          key={item.channel}
                          className="rounded-lg border border-white/10 bg-[#030712]/55 px-3 py-2"
                        >

                          <div className="flex items-center justify-between gap-3">

                            <span className="text-xs font-bold font-mono uppercase text-slate-300">
                              {item.channel}
                            </span>

                            <span
                              className={`rounded-md border px-2 py-1 text-[10px] font-black font-mono ${statusClass}`}
                            >
                              {status}
                            </span>

                          </div>

                          {item.detail && (
                            <p className="mt-1 text-[11px] font-mono text-slate-500">
                              {item.detail}
                            </p>
                          )}

                        </div>
                      )
                    }
                  )}

                </div>
              </div>
            )}

        </section>
      )}


      {/* =====================================================
          LIVE GRAPH
      ===================================================== */}

      <LiveGraph
        timeSeries={selected.timeSeries}
        inputMode={inputMode}
        selected={selected}
        activeStreamId={activeStreamId}
      />


      {/* =====================================================
          SUMMARY CARDS
      ===================================================== */}

      <section className="grid gap-4 sm:grid-cols-3">

        {[
          {
            label: 'Monitored Channels',
            value: summary.total,
            description: 'Backend streams',
            icon: Radio,
            iconClass: 'text-cyan-200',
            glow: 'hover:border-cyan-300/40 hover:shadow-[0_0_30px_rgba(34,211,238,0.10)]'
          },
          {
            label: 'Need Attention',
            value: summary.high,
            description: 'Backend HIGH risk streams',
            icon: AlertTriangle,
            iconClass: 'text-red-200',
            glow: 'hover:border-red-300/40 hover:shadow-[0_0_30px_rgba(239,68,68,0.10)]'
          },
          {
            label: 'Speech Active',
            value: summary.active,
            description: 'Backend VAD state',
            icon: Volume2,
            iconClass: 'text-emerald-200',
            glow: 'hover:border-emerald-300/40 hover:shadow-[0_0_30px_rgba(16,185,129,0.10)]'
          }
        ].map((item) => {

          const Icon = item.icon

          return (
            <div
              key={item.label}
              className={`group rounded-2xl border border-white/10 bg-[#07111f]/75 p-5 shadow-[0_0_30px_rgba(0,0,0,0.15)] backdrop-blur-xl transition-all duration-300 ${item.glow}`}
            >

              <div className="flex items-center justify-between">

                <p className="text-[13px] font-bold text-slate-300">
                  {item.label}
                </p>

                <div className="rounded-lg border border-white/10 bg-white/[0.04] p-2">
                  <Icon
                    size={18}
                    className={item.iconClass}
                  />
                </div>

              </div>

              <p className="mt-4 text-3xl font-black text-white">
                {item.value}
              </p>

              <p className="mt-1 text-xs font-mono text-slate-500">
                {item.description}
              </p>

            </div>
          )
        })}

      </section>


      {/* =====================================================
          STREAMS + TELEMETRY
      ===================================================== */}

      <section className="grid gap-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.5fr)]">

        {/* STREAM LIST */}

        <div className="relative space-y-4 overflow-hidden rounded-2xl border border-white/10 bg-[#07111f]/75 p-5 shadow-[0_0_35px_rgba(0,0,0,0.15)] backdrop-blur-xl">

          <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-cyan-400/8 blur-3xl" />

          <div className="relative flex items-center justify-between">

            <div>

              <h2 className="text-[15px] font-bold text-white">
                Your Conversations
              </h2>

              <p className="mt-0.5 text-xs text-slate-400">
                Select a backend stream to inspect
              </p>

            </div>

            <div className="rounded-lg border border-white/10 bg-white/[0.04] p-2">
              <Settings2
                size={17}
                className="text-slate-400"
              />
            </div>

          </div>

          <div className="relative space-y-2">

            {Object.keys(streams).map((id) => {

              const stream = streams[id]

              return (
                <button
                  key={id}
                  onClick={() =>
                    setActiveStreamId(id)
                  }
                  className={`group/stream relative w-full overflow-hidden rounded-xl border p-4 text-left transition-all duration-300 ${
                    activeStreamId === id
                      ? 'border-cyan-300/50 bg-gradient-to-r from-cyan-400/[0.12] via-violet-500/[0.08] to-transparent shadow-[0_0_28px_rgba(34,211,238,0.09)]'
                      : 'border-white/10 bg-white/[0.02] hover:border-cyan-300/25 hover:bg-white/[0.04]'
                  }`}
                >

                  {activeStreamId === id && (
                    <div className="absolute inset-y-0 left-0 w-0.5 bg-gradient-to-b from-cyan-300 via-violet-400 to-fuchsia-400" />
                  )}

                  <div className="flex items-start justify-between gap-3">

                    <div className="min-w-0">

                      <p className="text-[14px] font-bold text-white">
                        {stream.name || id}
                      </p>

                      <p className="mt-1 font-mono text-xs text-slate-500">
                        {id}
                      </p>

                    </div>

                    <StatusPill
                      status={stream.risk_level}
                    />

                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">

                    <span className="rounded-full border border-cyan-300/25 bg-cyan-400/[0.07] px-2.5 py-1 text-[10px] font-bold font-mono uppercase tracking-wider text-cyan-200">
                      {stream.notification_scenario
                        ? stream.notification_scenario.replaceAll(
                            '_',
                            ' '
                          )
                        : 'Context pending'}
                    </span>

                    {stream.scenario_source && (
                      <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider text-slate-400">
                        {stream.scenario_source ===
                        'transaction_amount'
                          ? 'Auto · Amount'
                          : stream.scenario_source ===
                            'explicit'
                          ? 'Explicit'
                          : 'Default'}
                      </span>
                    )}

                  </div>

                  <div className="mt-3 flex items-center justify-between text-xs">

                    <span className="font-medium text-slate-400">
                      {stream.speech_detected === true
                        ? 'Speech active'
                        : stream.speech_detected ===
                          false
                        ? 'Silence'
                        : 'Waiting for backend'}
                    </span>

                    <span className="font-black font-mono text-cyan-200">
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


        {/* TELEMETRY PANEL */}

        <div className="relative space-y-6 overflow-hidden rounded-2xl border border-white/10 bg-[#07111f]/75 p-5 shadow-[0_0_35px_rgba(0,0,0,0.15)] backdrop-blur-xl md:p-6">

          <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-violet-500/8 blur-3xl" />

          <div className="relative flex flex-col gap-3 border-b border-white/10 pb-5 sm:flex-row sm:items-center sm:justify-between">

            <div>

              <div className="flex items-center gap-2.5">

                <h2 className="text-base font-bold text-white">
                  {selected.name ||
                    activeStreamId}
                </h2>

                <StatusPill
                  status={selected.risk_level}
                />

              </div>

              <p className="mt-1 text-xs text-slate-400">
                Backend-generated RiskResult telemetry
              </p>

            </div>

            <span className="rounded-lg border border-cyan-300/25 bg-cyan-400/[0.07] px-2.5 py-1 font-mono text-xs font-bold text-cyan-200">
              {activeStreamId}
            </span>

          </div>

          <div className="relative grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

            {/* 1. ROLLING RISK SCORE (Driven by Ensemble) */}
            <div className="rounded-xl border border-cyan-300/15 bg-[#030712]/60 p-5 transition hover:border-cyan-300/30">
              <div className="flex items-center gap-2 text-[13px] font-bold text-slate-300">
                <Gauge size={17} className="text-cyan-200" />
                Rolling Risk Score (Ensemble)
              </div>
              <p className="mt-3 text-4xl font-black font-mono text-white">
                {formatScore(selected.rolling_score, 3)}
              </p>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-violet-400 to-fuchsia-400 shadow-[0_0_14px_rgba(34,211,238,0.5)] transition-all duration-500"
                  style={{
                    width:
                      selected.rolling_score !== undefined && selected.rolling_score !== null
                        ? `${Math.min(Math.max(Number(selected.rolling_score) * 100, 0), 100)}%`
                        : '0%'
                  }}
                />
              </div>
              <p className="mt-3 text-xs leading-5 text-slate-400">
                Unified ensemble: Calibrated XGBoost & Dual-Stream MMS-300M.
              </p>
            </div>

            {/* 2. DUAL-MODEL ENSEMBLE BREAKDOWN */}
            <div className="rounded-xl border border-violet-300/15 bg-[#030712]/60 p-5 transition hover:border-violet-300/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[13px] font-bold text-slate-300">
                  <Cpu size={17} className="text-violet-200" />
                  Model Agreement
                </div>
                {selected.xgb_probability !== undefined && selected.dual_stream_probability !== undefined && (
                  <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                    Math.abs(selected.xgb_probability - selected.dual_stream_probability) < 0.25
                      ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300'
                      : 'border-amber-400/30 bg-amber-400/10 text-amber-300'
                  }`}>
                    {Math.abs(selected.xgb_probability - selected.dual_stream_probability) < 0.25
                      ? 'HIGH AGREEMENT'
                      : 'DIVERGENT'}
                  </span>
                )}
              </div>

              <div className="mt-3 space-y-2.5 font-mono text-xs">
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-[11px] text-slate-400">XGBoost (58-D DSP):</span>
                  <span className="font-bold text-cyan-200">
                    {selected.xgb_probability !== undefined && selected.xgb_probability !== null
                      ? `${(selected.xgb_probability * 100).toFixed(1)}%`
                      : typeof selected.ai_probability === 'number'
                        ? `${(selected.ai_probability * 100).toFixed(1)}%`
                        : '--'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-[11px] text-slate-400">Dual Neural (MMS-300M):</span>
                  <span className="font-bold text-violet-200">
                    {selected.dual_stream_probability !== undefined && selected.dual_stream_probability !== null
                      ? `${(selected.dual_stream_probability * 100).toFixed(1)}%`
                      : '--'}
                  </span>
                </div>
                {selected.modality_gate_alpha !== undefined && selected.modality_gate_alpha !== null && (
                  <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-white/5">
                    <span>Modality Gate (α):</span>
                    <span>{Number(selected.modality_gate_alpha).toFixed(3)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* 3. FEATURE & PIPELINE LATENCY */}
            <div className="rounded-xl border border-violet-300/15 bg-[#030712]/60 p-5 transition hover:border-violet-300/30">
              <div className="flex items-center gap-2 text-[13px] font-bold text-slate-300">
                <Waves size={17} className="text-violet-200" />
                Pipeline Latency
              </div>
              <p className="mt-3 text-xl font-black font-mono text-white">
                {selected.latency_ms !== undefined && selected.latency_ms !== null
                  ? `${selected.latency_ms} ms`
                  : selected.feature_latency_ms !== undefined
                    ? `${selected.feature_latency_ms} ms`
                    : '--'}
              </p>
              <p className="mt-2 text-xs leading-5 text-slate-400">
                Real-time synchronized dual-model inference latency.
              </p>
            </div>

          </div>


          {/* JSON INSPECTOR */}

          {showInspector && (
            <div className="relative overflow-x-auto rounded-xl border border-cyan-300/30 bg-black/50 p-4 font-mono text-xs text-cyan-200 shadow-[0_0_30px_rgba(34,211,238,0.08)]">

              <div className="mb-2 flex items-center justify-between">

                <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                  Backend RiskResult Payload
                </span>

                <span className="rounded-md border border-cyan-300/20 bg-cyan-400/10 px-2 py-0.5 text-[10px] font-bold text-cyan-200">
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
  )
}
