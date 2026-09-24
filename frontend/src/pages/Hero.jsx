'use client'

import React, { useState, useEffect, useRef } from 'react'
import {
  Shield,
  ArrowRight,
  Lock,
  ChevronDown,
  Activity,
  Fingerprint,
  Zap,
  Cpu,
  Network,
  Server,
  Waves,
  BrainCircuit,
  AudioWaveform,
  Database,
  ScanLine,
  Radio,
  ShieldCheck,
  CircleDot,
  BarChart3,
  Microscope,
  Layers3,
  GitBranch,
  Gauge,
  Clock3,
  CheckCircle2,
  AlertTriangle,
  LogIn,
  LayoutDashboard,
  Sun,
  Moon
} from 'lucide-react'

export default function LandingPage({ onLogin, onDashboard }) {
  const [activeBadgeIndex, setActiveBadgeIndex] = useState(0)
  const [isDarkMode, setIsDarkMode] = useState(true)
  const canvasRef = useRef(null)

  // Sequence flash badges continuously
  useEffect(() => {
    const badgeInterval = setInterval(() => {
      setActiveBadgeIndex((prev) => (prev + 1) % 4)
    }, 2800)

    return () => clearInterval(badgeInterval)
  }, [])

  // Clean scrolling wave graph canvas simulation
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    let animationFrameId
    let time = 0

    const handleResize = () => {
      if (canvas.parentElement) {
        canvas.width = canvas.parentElement.clientWidth
        canvas.height = canvas.parentElement.clientHeight
      }
    }

    handleResize()
    window.addEventListener('resize', handleResize)

    const render = () => {
      const w = canvas.width
      const h = canvas.height

      // Theme-aware canvas background
      ctx.fillStyle = isDarkMode
        ? 'rgba(2, 6, 23, 0.3)'
        : 'rgba(248, 250, 252, 0.45)'

      ctx.fillRect(0, 0, w, h)

      time += 0.035

      // Theme-aware grid
      ctx.strokeStyle = isDarkMode
        ? 'rgba(30, 41, 59, 0.3)'
        : 'rgba(148, 163, 184, 0.28)'

      ctx.lineWidth = 1

      const gridSize = 40

      for (let x = 0; x < w; x += gridSize) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, h)
        ctx.stroke()
      }

      for (let y = 0; y < h; y += gridSize) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(w, y)
        ctx.stroke()
      }

      // Draw smooth scrolling wave lines
      ctx.lineWidth = 3
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'

      // Background ambient wave
      ctx.beginPath()
      ctx.strokeStyle = isDarkMode
        ? 'rgba(124, 58, 237, 0.35)'
        : 'rgba(124, 58, 237, 0.28)'

      for (let x = 0; x < w; x += 2) {
        const y =
          h * 0.5 +
          Math.sin(x * 0.012 + time * 1.2) * 35 +
          Math.cos(x * 0.008 - time) * 20

        if (x === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }

      ctx.stroke()

      // Primary glowing foreground cyan wave
      ctx.beginPath()
      ctx.strokeStyle = '#22d3ee'
      ctx.shadowColor = '#22d3ee'
      ctx.shadowBlur = isDarkMode ? 12 : 8

      for (let x = 0; x < w; x += 2) {
        const y =
          h * 0.5 +
          Math.sin(x * 0.015 - time * 1.5) * 45 +
          Math.sin(x * 0.005 + time * 0.5) * 25

        if (x === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }

      ctx.stroke()
      ctx.shadowBlur = 0

      animationFrameId = requestAnimationFrame(render)
    }

    render()

    return () => {
      window.removeEventListener('resize', handleResize)
      cancelAnimationFrame(animationFrameId)
    }
  }, [isDarkMode])

  return (
    <div
      className={`${
        isDarkMode
          ? 'bg-[#030712] text-slate-200'
          : 'bg-slate-50 text-slate-800'
      } min-h-screen selection:bg-cyan-500/30 overflow-x-hidden transition-colors duration-300`}
    >

      {/* =========================================================
          THEME TOGGLE BUTTON
      ========================================================= */}
      <div className="absolute top-6 right-6 z-50">
        <button
          onClick={() => setIsDarkMode(!isDarkMode)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl border backdrop-blur-md transition-all cursor-pointer shadow-md ${
            isDarkMode
              ? 'bg-slate-900/90 border-slate-700 text-cyan-400 hover:bg-slate-800'
              : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100 shadow-sm'
          }`}
          aria-label="Toggle Theme"
        >
          {isDarkMode ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-violet-600" />
          )}

          <span className="text-xs font-mono font-bold uppercase">
            {isDarkMode ? 'Light Mode' : 'Dark Mode'}
          </span>
        </button>
      </div>

      {/* =========================================================
          GLOBAL BACKGROUND
      ========================================================= */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div
          className={`absolute inset-0 ${
            isDarkMode
              ? 'bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,0.07),transparent_30%),radial-gradient(circle_at_80%_30%,rgba(139,92,246,0.07),transparent_30%),radial-gradient(circle_at_50%_80%,rgba(217,70,239,0.05),transparent_35%)]'
              : 'bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,0.10),transparent_30%),radial-gradient(circle_at_80%_30%,rgba(139,92,246,0.08),transparent_30%),radial-gradient(circle_at_50%_80%,rgba(217,70,239,0.06),transparent_35%)]'
          }`}
        />

        <div
          className={`absolute inset-0 ${
            isDarkMode ? 'opacity-[0.035]' : 'opacity-[0.025]'
          }`}
          style={{
            backgroundImage: isDarkMode
              ? 'linear-gradient(rgba(148,163,184,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.3) 1px, transparent 1px)'
              : 'linear-gradient(rgba(100,116,139,0.18) 1px, transparent 1px), linear-gradient(90deg, rgba(100,116,139,0.18) 1px, transparent 1px)',
            backgroundSize: '50px 50px'
          }}
        />
      </div>

      {/* =========================================================
          HERO SECTION
      ========================================================= */}
      <section className="relative min-h-screen pt-28 pb-20 px-4 md:px-8 flex flex-col justify-center overflow-hidden">

        {/* Ambient background glows */}
        <div className="absolute top-1/4 left-12 w-96 h-96 bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="absolute bottom-12 right-12 w-[500px] h-[500px] bg-violet-600/10 rounded-full blur-[150px] pointer-events-none" />

        <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10">

          {/* LEFT COLUMN */}
          <div className="lg:col-span-6 flex flex-col justify-center space-y-6 text-left">

            {/* Status Badge */}
            <div
              className={`inline-flex items-center gap-2.5 self-start px-3.5 py-1.5 rounded-full border backdrop-blur-md transition-colors ${
                isDarkMode
                  ? 'border-cyan-400/30 bg-cyan-500/10 shadow-[0_0_20px_rgba(34,211,238,0.15)]'
                  : 'border-cyan-500/30 bg-cyan-50/80 shadow-[0_0_20px_rgba(34,211,238,0.10)]'
              }`}
            >
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-400" />
              </span>

              <Radio
                className={`w-3.5 h-3.5 ${
                  isDarkMode ? 'text-cyan-300' : 'text-cyan-600'
                }`}
              />

              <span
                className={`text-xs font-mono font-bold uppercase tracking-wider ${
                  isDarkMode ? 'text-cyan-200' : 'text-cyan-700'
                }`}
              >
                Real-Time Voice Ingestion Active
              </span>
            </div>

            {/* Heading */}
            <h1
              className={`text-4xl sm:text-5xl md:text-6xl font-black leading-[1.1] tracking-tight ${
                isDarkMode ? 'text-white' : 'text-slate-900'
              }`}
            >
              Detect the voice.
              <br />

              <span className="bg-gradient-to-r from-cyan-500 via-violet-500 to-fuchsia-500 bg-clip-text text-transparent">
                Verify the signal.
              </span>
            </h1>

            {/* Subtitle */}
            <p
              className={`${
                isDarkMode ? 'text-slate-300' : 'text-slate-600'
              } text-base sm:text-lg leading-relaxed max-w-xl`}
            >
              VeriVox analyzes live audio through rolling inference windows,
              acoustic feature extraction, speaker verification, and synthetic
              voice detection to surface real-time impersonation risk.
            </p>

            {/* Buttons */}
            <div className="flex flex-wrap items-center gap-4 pt-4">

              <button
                onClick={() => onLogin && onLogin()}
                className="px-8 py-4 rounded-xl bg-gradient-to-r from-cyan-400 via-cyan-500 to-violet-600 text-slate-950 font-extrabold text-sm hover:shadow-[0_0_35px_rgba(34,211,238,0.4)] hover:scale-[1.02] transition-all flex items-center gap-3 cursor-pointer"
              >
                <LogIn className="w-4 h-4 stroke-[2.5]" />
                <span>LOGIN</span>
              </button>

              <button
                onClick={() =>
                  onDashboard
                    ? onDashboard()
                    : onLogin && onLogin()
                }
                className={`px-6 py-4 rounded-xl border font-bold text-sm backdrop-blur-md transition-all flex items-center gap-2.5 cursor-pointer shadow-lg ${
                  isDarkMode
                    ? 'bg-slate-800/90 hover:bg-slate-700/90 border-slate-700 text-slate-200'
                    : 'bg-white/95 hover:bg-slate-100 border-slate-300 text-slate-800 shadow-md'
                }`}
              >
                <LayoutDashboard className="w-4 h-4 text-cyan-500" />
                <span>Go to Dashboard</span>
              </button>
            </div>

          </div>

          {/* RIGHT COLUMN */}
          <div className="lg:col-span-6 relative">

            <div
              className={`relative rounded-3xl border backdrop-blur-2xl p-4 sm:p-6 transition-colors ${
                isDarkMode
                  ? 'border-cyan-500/20 bg-[#07111f]/90 shadow-[0_0_60px_rgba(34,211,238,0.12)]'
                  : 'border-cyan-500/25 bg-white/90 shadow-[0_10px_50px_rgba(15,23,42,0.10)]'
              }`}
            >

              {/* Deck Top Bar */}
              <div
                className={`flex items-center justify-between pb-4 border-b mb-4 px-2 ${
                  isDarkMode
                    ? 'border-slate-800/80'
                    : 'border-slate-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`ml-2 font-mono text-xs flex items-center gap-1.5 ${
                      isDarkMode
                        ? 'text-slate-400'
                        : 'text-slate-500'
                    }`}
                  >
                    <Cpu className="w-3.5 h-3.5 text-cyan-500" />
                    ACOUSTIC_PIPE_GPU_01
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`font-mono text-[11px] px-2.5 py-0.5 rounded border ${
                      isDarkMode
                        ? 'text-cyan-300 bg-cyan-950/60 border-cyan-500/30'
                        : 'text-cyan-700 bg-cyan-50 border-cyan-500/30'
                    }`}
                  >
                    LIVE STREAM
                  </span>
                </div>
              </div>

              {/* Canvas Visualizer */}
              <div
                className={`relative h-80 sm:h-96 w-full rounded-2xl border overflow-hidden flex items-center justify-center ${
                  isDarkMode
                    ? 'bg-[#020617] border-slate-800/90'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <canvas
                  ref={canvasRef}
                  className="w-full h-full block"
                />

                {/* SIGNAL ACQUIRED */}
                <div
                  className={`absolute top-16 left-1/4 transform -translate-x-1/2 transition-all duration-500 ${
                    activeBadgeIndex === 0
                      ? 'opacity-100 scale-100 translate-y-0'
                      : 'opacity-0 scale-75 translate-y-3 pointer-events-none'
                  }`}
                >
                  <div
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border backdrop-blur-md ${
                      isDarkMode
                        ? 'bg-cyan-950/90 border-cyan-400/50 shadow-[0_0_20px_rgba(34,211,238,0.3)]'
                        : 'bg-cyan-50/95 border-cyan-400/60 shadow-[0_0_20px_rgba(34,211,238,0.15)]'
                    }`}
                  >
                    <Waves className="w-3.5 h-3.5 text-cyan-500 animate-pulse" />

                    <span
                      className={`text-[11px] font-mono font-bold uppercase tracking-wide ${
                        isDarkMode
                          ? 'text-cyan-200'
                          : 'text-cyan-700'
                      }`}
                    >
                      SIGNAL ACQUIRED
                    </span>
                  </div>
                </div>

                {/* ANALYSIS RUNNING */}
                <div
                  className={`absolute top-24 right-1/4 transform translate-x-1/2 transition-all duration-500 ${
                    activeBadgeIndex === 1
                      ? 'opacity-100 scale-100 translate-y-0'
                      : 'opacity-0 scale-75 translate-y-3 pointer-events-none'
                  }`}
                >
                  <div
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border backdrop-blur-md ${
                      isDarkMode
                        ? 'bg-violet-950/90 border-violet-400/50 shadow-[0_0_20px_rgba(139,92,246,0.3)]'
                        : 'bg-violet-50/95 border-violet-400/60 shadow-[0_0_20px_rgba(139,92,246,0.15)]'
                    }`}
                  >
                    <Activity className="w-3.5 h-3.5 text-violet-500 animate-spin" />

                    <span
                      className={`text-[11px] font-mono font-bold uppercase tracking-wide ${
                        isDarkMode
                          ? 'text-violet-200'
                          : 'text-violet-700'
                      }`}
                    >
                      ANALYSIS RUNNING
                    </span>
                  </div>
                </div>

                {/* VOICE MATCHING */}
                <div
                  className={`absolute bottom-24 left-1/3 transform -translate-x-1/2 transition-all duration-500 ${
                    activeBadgeIndex === 2
                      ? 'opacity-100 scale-100 translate-y-0'
                      : 'opacity-0 scale-75 translate-y-3 pointer-events-none'
                  }`}
                >
                  <div
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border backdrop-blur-md ${
                      isDarkMode
                        ? 'bg-emerald-950/90 border-emerald-400/50 shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                        : 'bg-emerald-50/95 border-emerald-400/60 shadow-[0_0_20px_rgba(16,185,129,0.15)]'
                    }`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />

                    <span
                      className={`text-[11px] font-mono font-bold uppercase tracking-wide ${
                        isDarkMode
                          ? 'text-emerald-200'
                          : 'text-emerald-700'
                      }`}
                    >
                      VOICE MATCHING
                    </span>
                  </div>
                </div>

                {/* HIGH PITCH */}
                <div
                  className={`absolute top-20 right-12 transition-all duration-500 ${
                    activeBadgeIndex === 3
                      ? 'opacity-100 scale-100 translate-y-0'
                      : 'opacity-0 scale-75 translate-y-3 pointer-events-none'
                  }`}
                >
                  <div
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border backdrop-blur-md ${
                      isDarkMode
                        ? 'bg-rose-950/90 border-rose-500/50 shadow-[0_0_20px_rgba(244,63,94,0.3)]'
                        : 'bg-rose-50/95 border-rose-400/60 shadow-[0_0_20px_rgba(244,63,94,0.15)]'
                    }`}
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-500 animate-bounce" />

                    <span
                      className={`text-[11px] font-mono font-bold uppercase tracking-wide ${
                        isDarkMode
                          ? 'text-rose-200'
                          : 'text-rose-700'
                      }`}
                    >
                      HIGH PITCH
                    </span>
                  </div>
                </div>

              </div>

              {/* Bottom Telemetry Strip */}
              <div className="grid grid-cols-3 gap-3 mt-4">

                <div
                  className={`border rounded-xl p-3 text-left transition-colors ${
                    isDarkMode
                      ? 'bg-slate-950/60 border-slate-800/80 text-slate-400'
                      : 'bg-slate-100/80 border-slate-200 text-slate-600'
                  }`}
                >
                  <p className="text-[10px] font-mono uppercase">
                    Sample Rate
                  </p>

                  <p
                    className={`text-xs font-mono font-bold mt-0.5 ${
                      isDarkMode
                        ? 'text-cyan-300'
                        : 'text-cyan-700'
                    }`}
                  >
                    16.0 kHz Mono
                  </p>
                </div>

                <div
                  className={`border rounded-xl p-3 text-left transition-colors ${
                    isDarkMode
                      ? 'bg-slate-950/60 border-slate-800/80 text-slate-400'
                      : 'bg-slate-100/80 border-slate-200 text-slate-600'
                  }`}
                >
                  <p className="text-[10px] font-mono uppercase">
                    Window Size
                  </p>

                  <p
                    className={`text-xs font-mono font-bold mt-0.5 ${
                      isDarkMode
                        ? 'text-violet-300'
                        : 'text-violet-700'
                    }`}
                  >
                    500 ms Rolling
                  </p>
                </div>

                <div
                  className={`border rounded-xl p-3 text-left transition-colors ${
                    isDarkMode
                      ? 'bg-slate-950/60 border-slate-800/80 text-slate-400'
                      : 'bg-slate-100/80 border-slate-200 text-slate-600'
                  }`}
                >
                  <p className="text-[10px] font-mono uppercase">
                    Inference
                  </p>

                  <p
                    className={`text-xs font-mono font-bold mt-0.5 ${
                      isDarkMode
                        ? 'text-fuchsia-300'
                        : 'text-fuchsia-700'
                    }`}
                  >
                    &lt; 0.85 sec
                  </p>
                </div>

              </div>

            </div>
          </div>

        </div>
      </section>

      {/* Divider */}
      <div
        className={`h-px w-full bg-gradient-to-r from-transparent ${
          isDarkMode ? 'via-slate-800' : 'via-slate-200'
        } to-transparent`}
      />

      {/* =========================================================
          SCIENTIFIC STATISTICS
      ========================================================= */}
      <section className="relative py-24 px-4 max-w-7xl mx-auto">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={<Gauge size={20} />}
            value="< 1s"
            label="Detection Window"
            description="Rolling acoustic analysis"
            color="cyan"
            isDarkMode={isDarkMode}
          />
          <StatCard
            icon={<Layers3 size={20} />}
            value="58"
            label="Feature Dimensions"
            description="Model input representation"
            color="violet"
            isDarkMode={isDarkMode}
          />
          <StatCard
            icon={<ScanLine size={20} />}
            value="1 sec"
            label="Risk Refresh"
            description="Continuous telemetry"
            color="fuchsia"
            isDarkMode={isDarkMode}
          />
          <StatCard
            icon={<ShieldCheck size={20} />}
            value="24/7"
            label="Monitoring"
            description="Continuous stream analysis"
            color="blue"
            isDarkMode={isDarkMode}
          />
        </div>
      </section>

      {/* =========================================================
          HOW VERIVOX WORKS
      ========================================================= */}
      <section className="relative py-28 px-4 max-w-6xl mx-auto">
        <div className="text-center mb-20 space-y-4">
          <div className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-cyan-400">
            <Microscope size={14} />
            Detection Pipeline
          </div>
          <h2 className={`text-3xl md:text-5xl font-bold tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            How{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-violet-400">
              VeriVox
            </span>{' '}
            Works
          </h2>
          <p className={`${isDarkMode ? 'text-slate-400' : 'text-slate-600'} max-w-2xl mx-auto text-lg`}>
            A streaming architecture that converts raw acoustic signals into
            interpretable synthetic-voice risk telemetry.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          <div className="hidden md:block absolute top-[105px] left-[12%] right-[12%] h-px bg-gradient-to-r from-cyan-500/20 via-violet-500/30 to-fuchsia-500/20" />

          <PipelineCard
            number="01"
            icon={<Network size={30} />}
            title="Signal Ingestion"
            description="Live audio enters the processing pipeline where the stream is normalized and divided into short rolling windows."
            color="cyan"
            tags={['PCM', '16kHz', 'Streaming']}
            isDarkMode={isDarkMode}
          />
          <PipelineCard
            number="02"
            icon={<BrainCircuit size={30} />}
            title="Feature Inference"
            description="Acoustic and voice characteristics are transformed into a multi-dimensional feature representation for model inference."
            color="violet"
            tags={['Acoustic', 'Prosody', 'Spectral']}
            isDarkMode={isDarkMode}
          />
          <PipelineCard
            number="03"
            icon={<Activity size={30} />}
            title="Risk Telemetry"
            description="Model output is calibrated and streamed to the interface as continuously updated synthetic-voice risk telemetry."
            color="fuchsia"
            tags={['Probability', 'Risk', 'WebSocket']}
            isDarkMode={isDarkMode}
          />
        </div>
      </section>

      {/* =========================================================
          SCIENTIFIC ANALYSIS SECTION
      ========================================================= */}
      <section className="relative py-28 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-10 items-center">

            {/* LEFT: Graph */}
            <div className={`rounded-3xl border p-6 backdrop-blur-xl ${isDarkMode ? 'border-slate-800 bg-slate-950/70' : 'border-slate-200 bg-white/90 shadow-lg'}`}>
              <div className="flex items-center justify-between mb-8">
                <div>
                  <div className="flex items-center gap-2 text-cyan-400 mb-2">
                    <BarChart3 size={18} />
                    <span className="font-mono text-[10px] uppercase tracking-widest">
                      Risk Analysis
                    </span>
                  </div>
                  <h3 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    Synthetic Voice Probability
                  </h3>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-cyan-500">
                    0.18
                  </div>
                  <div className="text-[9px] font-mono text-slate-500">
                    CURRENT RISK
                  </div>
                </div>
              </div>

              {/* Graph */}
              <div className={`relative h-64 rounded-2xl border overflow-hidden ${isDarkMode ? 'border-slate-800 bg-[#020617]' : 'border-slate-200 bg-slate-50'}`}>
                <div
                  className="absolute inset-0 opacity-20"
                  style={{
                    backgroundImage:
                      'linear-gradient(rgba(148,163,184,.25) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,.25) 1px, transparent 1px)',
                    backgroundSize: '50px 40px'
                  }}
                />

                <div className="absolute left-2 top-3 bottom-3 flex flex-col justify-between text-[8px] font-mono text-slate-500">
                  <span>1.0</span>
                  <span>0.75</span>
                  <span>0.50</span>
                  <span>0.25</span>
                  <span>0.0</span>
                </div>

                <svg
                  viewBox="0 0 800 260"
                  preserveAspectRatio="none"
                  className="absolute inset-0 w-full h-full"
                >
                  <defs>
                    <linearGradient id="riskGradient" x1="0" x2="1">
                      <stop offset="0%" stopColor="#22d3ee" />
                      <stop offset="50%" stopColor="#8b5cf6" />
                      <stop offset="100%" stopColor="#d946ef" />
                    </linearGradient>
                  </defs>

                  <path
                    d="M0 190
                        C40 170 55 185 90 150
                        S140 175 180 120
                        S230 145 270 155
                        S320 95 355 115
                        S410 170 450 135
                        S500 105 540 125
                        S590 85 630 115
                        S680 160 720 105
                        S760 90 800 80"
                    fill="none"
                    stroke="url(#riskGradient)"
                    strokeWidth="4"
                  />
                </svg>

                <div className="absolute left-10 right-0 top-[28%] border-t border-dashed border-red-400/30">
                  <span className="absolute right-2 -top-4 text-[8px] font-mono text-red-400">
                    HIGH RISK THRESHOLD
                  </span>
                </div>
              </div>

              {/* Legend */}
              <div className="flex flex-wrap gap-5 mt-5 text-[10px] font-mono text-slate-500">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-px bg-cyan-400" />
                  AI Probability
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-px border-t border-dashed border-red-400" />
                  Risk Threshold
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  Normal
                </div>
              </div>
            </div>

            {/* RIGHT: Scientific explanation */}
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1.5 text-[10px] font-mono uppercase tracking-widest text-violet-400 mb-6">
                <BrainCircuit size={13} />
                Machine Learning Layer
              </div>

              <h2 className={`text-3xl md:text-5xl font-bold leading-tight mb-6 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                From acoustic signal
                <br />
                to measurable risk.
              </h2>

              <p className={`${isDarkMode ? 'text-slate-400' : 'text-slate-600'} leading-relaxed mb-8`}>
                VeriVox transforms continuous speech into structured acoustic
                information. The detection layer evaluates multiple signal
                characteristics before producing a calibrated probability
                used by the real-time risk engine.
              </p>

              <div className="space-y-4">
                <AnalysisRow icon={<Waves size={18} />} title="Spectral Analysis" text="Frequency-domain characteristics and acoustic structure." isDarkMode={isDarkMode} />
                <AnalysisRow icon={<AudioWaveform size={18} />} title="Prosodic Analysis" text="Temporal patterns, pitch movement and speech dynamics." isDarkMode={isDarkMode} />
                <AnalysisRow icon={<Fingerprint size={18} />} title="Voice Characteristics" text="Speaker-level characteristics and synthetic artifacts." isDarkMode={isDarkMode} />
                <AnalysisRow icon={<ShieldCheck size={18} />} title="Risk Calibration" text="Converts model output into interpretable risk telemetry." isDarkMode={isDarkMode} />
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* =========================================================
          TELEMETRY / METRICS
      ========================================================= */}
      <section className="relative py-28 px-4 max-w-7xl mx-auto">
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-fuchsia-400 mb-4">
            <Radio size={14} />
            System Telemetry
          </div>
          <h2 className={`text-3xl md:text-4xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            Built for continuous analysis
          </h2>
          <p className={`${isDarkMode ? 'text-slate-400' : 'text-slate-600'} mt-4 max-w-xl mx-auto`}>
            Every stage of the detection pipeline exposes measurable
            information for monitoring, analysis and investigation.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          <TelemetryCard icon={<Clock3 size={19} />} label="WINDOW SIZE" value="500 ms" footer="Rolling inference" isDarkMode={isDarkMode} />
          <TelemetryCard icon={<Cpu size={19} />} label="FEATURE VECTOR" value="58-D" footer="Model representation" isDarkMode={isDarkMode} />
          <TelemetryCard icon={<Zap size={19} />} label="RISK UPDATE" value="1 sec" footer="Continuous telemetry" isDarkMode={isDarkMode} />
          <TelemetryCard icon={<Database size={19} />} label="AUDIO STORAGE" value="EPHEMERAL" footer="Pipeline processing" isDarkMode={isDarkMode} />
        </div>
      </section>

      {/* =========================================================
          ADVANCED CAPABILITIES
      ========================================================= */}
      <section className="relative py-28 px-4 max-w-7xl mx-auto">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[800px] w-[800px] rounded-full bg-cyan-900/5 blur-[150px] pointer-events-none" />

        <div className="mb-16">
          <div className="flex items-center gap-2 text-cyan-400 text-xs font-mono uppercase tracking-widest mb-4">
            <Layers3 size={14} />
            System Capabilities
          </div>
          <h2 className={`text-3xl md:text-4xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            Advanced Detection Stack
          </h2>
          <p className={`${isDarkMode ? 'text-slate-400' : 'text-slate-600'} max-w-xl`}>
            A layered approach combining signal processing, machine learning,
            speaker characteristics and real-time infrastructure.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <FeatureCard icon={<Zap size={24} />} title="Sub-Second Detection" text="Rolling inference windows allow the system to surface changing synthetic-voice risk during an active stream." color="cyan" isDarkMode={isDarkMode} />
          <FeatureCard icon={<Fingerprint size={24} />} title="Voice Signatures" text="Analyzes acoustic and speaker-level characteristics that can differ between natural and generated speech." color="violet" isDarkMode={isDarkMode} />
          <FeatureCard icon={<Shield size={24} />} title="Ephemeral Processing" text="The architecture is designed around transient stream processing rather than persistent raw-audio storage." color="fuchsia" isDarkMode={isDarkMode} />
          <FeatureCard icon={<Server size={24} />} title="Streaming Architecture" text="WebSocket telemetry connects inference output directly to the monitoring interface." color="blue" isDarkMode={isDarkMode} />
        </div>
      </section>

      {/* =========================================================
          ARCHITECTURE
      ========================================================= */}
      <section className="relative py-28 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-violet-400 mb-4">
              <GitBranch size={14} />
              Processing Architecture
            </div>
            <h2 className={`text-3xl md:text-4xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              Signal → Intelligence → Action
            </h2>
          </div>

          <div className={`rounded-3xl border backdrop-blur-xl p-6 md:p-10 ${isDarkMode ? 'border-slate-800 bg-slate-950/70' : 'border-slate-200 bg-white/90 shadow-lg'}`}>
            <div className="grid grid-cols-1 md:grid-cols-5 items-center gap-4">
              <ArchitectureNode icon={<Radio size={22} />} title="LIVE AUDIO" subtitle="Input stream" color="cyan" isDarkMode={isDarkMode} />
              <ArrowConnector />
              <ArchitectureNode icon={<Waves size={22} />} title="FEATURES" subtitle="Signal analysis" color="violet" isDarkMode={isDarkMode} />
              <ArrowConnector />
              <ArchitectureNode icon={<BrainCircuit size={22} />} title="MODEL" subtitle="Inference" color="fuchsia" isDarkMode={isDarkMode} />
            </div>

            <div className="hidden md:flex justify-center my-8">
              <div className="h-12 w-px bg-gradient-to-b from-fuchsia-500/50 to-cyan-500/20" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <MiniArchitectureCard icon={<BarChart3 size={18} />} title="Probability" text="Model confidence" isDarkMode={isDarkMode} />
              <MiniArchitectureCard icon={<ShieldAlertIcon />} title="Risk Engine" text="Threat classification" isDarkMode={isDarkMode} />
              <MiniArchitectureCard icon={<Activity size={18} />} title="Telemetry" text="Real-time dashboard" isDarkMode={isDarkMode} />
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          CTA
      ========================================================= */}
      <section className={`py-28 px-4 text-center relative z-10 border-t overflow-hidden ${isDarkMode ? 'border-slate-800/50 bg-slate-900/20' : 'border-slate-200 bg-slate-100/50'}`}>
        <div className="absolute left-1/2 -translate-x-1/2 -top-32 h-72 w-72 rounded-full bg-cyan-500/10 blur-[100px]" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-4 py-2 text-[10px] font-mono uppercase tracking-widest text-cyan-400 mb-6">
            <CheckCircle2 size={13} />
            Detection system ready
          </div>

          <h3 className={`text-3xl md:text-5xl font-bold mb-6 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            Secure the signal.
            <br />
            <span className="text-slate-400">
              Verify the conversation.
            </span>
          </h3>

          <p className={`${isDarkMode ? 'text-slate-400' : 'text-slate-600'} max-w-xl mx-auto mb-9`}>
            Explore the live detection environment and monitor synthetic
            voice risk as it happens.
          </p>

          <button
            onClick={onLogin}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 text-white px-8 py-4 text-sm font-bold transition-all hover:bg-slate-800 hover:scale-105 cursor-pointer shadow-[0_0_30px_rgba(0,0,0,0.2)]"
          >
            Start Detection
            <ArrowRight size={18} />
          </button>
        </div>
      </section>

      {/* =========================================================
          FOOTER
      ========================================================= */}
      <footer className={`border-t px-6 py-8 ${isDarkMode ? 'border-slate-800/70' : 'border-slate-200 bg-white'}`}>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-cyan-400 to-violet-500 flex items-center justify-center">
              <Shield size={17} className="text-white" />
            </div>
            <div>
              <div className={`font-bold text-sm ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                VeriVox
              </div>
              <div className="text-[9px] font-mono uppercase tracking-widest text-slate-500">
                Synthetic Voice Intelligence
              </div>
            </div>
          </div>
          <div className="text-[10px] font-mono text-slate-500">
            REAL-TIME AUDIO SECURITY // VERIVOX
          </div>
        </div>
      </footer>
    </div>
  )
}

/* ===============================================================
    SMALL COMPONENTS
================================================================ */

function StatCard({ icon, value, label, description, color, isDarkMode }) {
  const colors = {
    cyan: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/10',
    violet: 'text-violet-400 bg-violet-500/10 border-violet-500/10',
    fuchsia: 'text-fuchsia-400 bg-fuchsia-500/10 border-fuchsia-500/10',
    blue: 'text-blue-400 bg-blue-500/10 border-blue-500/10'
  }

  return (
    <div className={`group rounded-2xl border p-6 backdrop-blur-sm transition-all ${
      isDarkMode 
        ? 'border-slate-800 bg-slate-900/40 hover:border-slate-700' 
        : 'border-slate-200 bg-white/80 shadow-sm hover:border-slate-300'
    }`}>
      <div className={`h-10 w-10 rounded-xl flex items-center justify-center border mb-5 ${colors[color]}`}>
        {icon}
      </div>
      <div className={`text-3xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
        {value}
      </div>
      <div className={`text-sm font-bold mt-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
        {label}
      </div>
      <div className="text-xs text-slate-500 mt-2">
        {description}
      </div>
    </div>
  )
}

function PipelineCard({ number, icon, title, description, color, tags, isDarkMode }) {
  const styles = {
    cyan: { icon: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400', number: 'text-cyan-400' },
    violet: { icon: 'bg-violet-500/10 border-violet-500/20 text-violet-400', number: 'text-violet-400' },
    fuchsia: { icon: 'bg-fuchsia-500/10 border-fuchsia-500/20 text-fuchsia-400', number: 'text-fuchsia-400' }
  }

  return (
    <div className={`relative z-10 rounded-3xl border backdrop-blur-sm p-8 hover:-translate-y-2 transition-all duration-300 ${
      isDarkMode 
        ? 'bg-slate-900/50 border-slate-800 hover:border-slate-700' 
        : 'bg-white/90 border-slate-200 shadow-md hover:border-slate-300'
    }`}>
      <div className={`text-[10px] font-mono mb-5 ${styles[color].number}`}>
        STEP_{number}
      </div>
      <div className={`h-16 w-16 rounded-full flex items-center justify-center border mb-6 ${styles[color].icon}`}>
        {icon}
      </div>
      <h3 className={`text-xl font-bold mb-3 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
        {title}
      </h3>
      <p className={`${isDarkMode ? 'text-slate-400' : 'text-slate-600'} text-sm leading-relaxed mb-6`}>
        {description}
      </p>
      <div className="flex flex-wrap gap-2">
        {tags.map(tag => (
          <span
            key={tag}
            className={`rounded-md border px-2 py-1 text-[9px] font-mono ${
              isDarkMode 
                ? 'border-slate-800 bg-slate-950 text-slate-400' 
                : 'border-slate-200 bg-slate-100 text-slate-600'
            }`}
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  )
}

function AnalysisRow({ icon, title, text, isDarkMode }) {
  return (
    <div className={`flex gap-4 p-4 rounded-2xl border transition-colors ${
      isDarkMode 
        ? 'border-slate-800 bg-slate-900/30 hover:bg-slate-900/60' 
        : 'border-slate-200 bg-white/60 hover:bg-white shadow-xs'
    }`}>
      <div className="shrink-0 h-10 w-10 rounded-xl bg-cyan-500/10 border border-cyan-500/10 flex items-center justify-center text-cyan-500">
        {icon}
      </div>
      <div>
        <h4 className={`text-sm font-bold mb-1 ${isDarkMode ? 'text-slate-200' : 'text-slate-900'}`}>
          {title}
        </h4>
        <p className="text-xs text-slate-500 leading-relaxed">
          {text}
        </p>
      </div>
    </div>
  )
}

function TelemetryCard({ icon, label, value, footer, isDarkMode }) {
  return (
    <div className={`relative overflow-hidden rounded-2xl border p-6 ${
      isDarkMode 
        ? 'border-slate-800 bg-slate-900/50' 
        : 'border-slate-200 bg-white shadow-xs'
    }`}>
      <div className="absolute top-0 right-0 h-24 w-24 rounded-full bg-cyan-500/5 blur-2xl" />
      <div className="flex items-center justify-between mb-6">
        <div className="text-cyan-500">
          {icon}
        </div>
        <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
      </div>
      <div className="text-[9px] font-mono tracking-widest text-slate-500 mb-2">
        {label}
      </div>
      <div className={`text-xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
        {value}
      </div>
      <div className="text-xs text-slate-500 mt-2">
        {footer}
      </div>
    </div>
  )
}

function FeatureCard({ icon, title, text, color, isDarkMode }) {
  const colors = {
    cyan: 'bg-cyan-500/10 text-cyan-400 group-hover:text-cyan-500',
    violet: 'bg-violet-500/10 text-violet-400 group-hover:text-violet-500',
    fuchsia: 'bg-fuchsia-500/10 text-fuchsia-400 group-hover:text-fuchsia-500',
    blue: 'bg-blue-500/10 text-blue-400 group-hover:text-blue-500'
  }

  return (
    <div className={`group p-6 rounded-2xl border transition-all duration-300 ${
      isDarkMode 
        ? 'bg-gradient-to-b from-slate-800/50 to-slate-900/50 border-slate-800 hover:border-slate-700' 
        : 'bg-white border-slate-200 shadow-sm hover:border-slate-300'
    }`}>
      <div className={`mb-5 inline-flex p-3 rounded-lg transition-transform group-hover:scale-110 ${colors[color]}`}>
        {icon}
      </div>
      <h4 className={`text-lg font-bold mb-3 ${isDarkMode ? 'text-slate-200' : 'text-slate-900'}`}>
        {title}
      </h4>
      <p className={`text-sm leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
        {text}
      </p>
    </div>
  )
}

function ArchitectureNode({ icon, title, subtitle, color, isDarkMode }) {
  const colors = {
    cyan: 'text-cyan-400 border-cyan-500/25 bg-cyan-500/10',
    violet: 'text-violet-400 border-violet-500/25 bg-violet-500/10',
    fuchsia: 'text-fuchsia-400 border-fuchsia-500/25 bg-fuchsia-500/10'
  }

  return (
    <div className={`rounded-2xl border p-5 text-center ${colors[color]}`}>
      <div className="flex justify-center mb-3">
        {icon}
      </div>
      <div className={`text-xs font-bold font-mono ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
        {title}
      </div>
      <div className="text-[9px] font-mono text-slate-500 mt-1">
        {subtitle}
      </div>
    </div>
  )
}

function ArrowConnector() {
  return (
    <div className="hidden md:flex items-center justify-center text-slate-400">
      <ArrowRight size={20} />
    </div>
  )
}

function MiniArchitectureCard({ icon, title, text, isDarkMode }) {
  return (
    <div className={`rounded-xl border p-4 flex items-center gap-3 ${
      isDarkMode ? 'border-slate-800 bg-slate-900/40' : 'border-slate-200 bg-slate-50'
    }`}>
      <div className={`h-9 w-9 rounded-lg flex items-center justify-center text-cyan-500 ${isDarkMode ? 'bg-slate-800' : 'bg-white shadow-xs'}`}>
        {icon}
      </div>
      <div>
        <div className={`text-xs font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-800'}`}>
          {title}
        </div>
        <div className="text-[9px] font-mono text-slate-500">
          {text}
        </div>
      </div>
    </div>
  )
}

function ShieldAlertIcon() {
  return (
    <ShieldCheck size={18} />
  )
}