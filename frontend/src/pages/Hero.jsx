'use client'

import React from 'react'
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
  Eye,
  Clock3,
  CheckCircle2
} from 'lucide-react'

export default function LandingPage({ onLogin }) {
  return (
    <div className="bg-[#030712] min-h-screen text-slate-200 selection:bg-cyan-500/30 overflow-x-hidden">

      {/* =========================================================
          GLOBAL BACKGROUND
      ========================================================= */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,0.07),transparent_30%),radial-gradient(circle_at_80%_30%,rgba(139,92,246,0.07),transparent_30%),radial-gradient(circle_at_50%_80%,rgba(217,70,239,0.05),transparent_35%)]" />

        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(148,163,184,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.3) 1px, transparent 1px)',
            backgroundSize: '50px 50px'
          }}
        />
      </div>


      {/* =========================================================
          HERO SECTION
      ========================================================= */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-4 overflow-hidden">

        {/* Ambient glows */}
        <div className="absolute top-1/4 left-1/4 h-[500px] w-[500px] rounded-full bg-cyan-500/10 blur-[130px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 h-[500px] w-[500px] rounded-full bg-violet-500/10 blur-[130px] pointer-events-none" />

        {/* Scientific decorative lines */}
        <div className="absolute left-[8%] top-[25%] hidden lg:block">
          <div className="flex items-center gap-2 text-[10px] font-mono text-cyan-500/40">
            <CircleDot size={8} />
            SIGNAL_CHANNEL_01
          </div>
          <div className="h-24 w-px bg-gradient-to-b from-cyan-500/30 to-transparent ml-1 mt-2" />
        </div>

        <div className="absolute right-[8%] top-[30%] hidden lg:block text-right">
          <div className="flex items-center justify-end gap-2 text-[10px] font-mono text-violet-500/40">
            INFERENCE_ENGINE
            <CircleDot size={8} />
          </div>
          <div className="h-24 w-px bg-gradient-to-b from-violet-500/30 to-transparent ml-auto mr-1 mt-2" />
        </div>


        <main className="relative z-10 flex flex-col items-center text-center max-w-5xl mx-auto space-y-8 mt-16">

          {/* Status pill */}
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-400/10 px-4 py-2 backdrop-blur-md">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-400" />
            </span>

            <Shield size={15} className="text-cyan-300" />

            <span className="text-xs font-bold font-mono uppercase tracking-widest text-cyan-200">
              Real-Time Synthetic Voice Detection
            </span>
          </div>


          {/* Main heading */}
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-black leading-[0.95] tracking-tighter text-white">

            Detect the voice.
            <br />

            <span className="bg-gradient-to-r from-cyan-300 via-violet-300 to-fuchsia-300 bg-clip-text text-transparent">
              Verify the signal.
            </span>
          </h1>


          <p className="max-w-3xl text-lg md:text-xl text-slate-400 leading-relaxed">
            VeriVox analyzes live audio through rolling inference windows,
            acoustic feature extraction, speaker verification, and synthetic
            voice detection to surface real-time impersonation risk.
          </p>


          {/* Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-4 pt-4 relative z-20">

            <button
              onClick={onLogin}
              className="flex items-center gap-2 rounded-xl border border-transparent bg-gradient-to-r from-cyan-400 to-violet-500 px-8 py-4 text-sm font-bold text-white transition-all hover:scale-105 hover:shadow-[0_0_40px_rgba(34,211,238,0.3)] cursor-pointer"
            >
              Go to Dashboard
              <ArrowRight size={18} />
            </button>

            <button
              onClick={onLogin}
              className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/50 px-8 py-4 text-sm font-bold text-slate-200 transition-all hover:bg-slate-700 hover:text-white backdrop-blur-md cursor-pointer"
            >
              <Lock size={18} />
              Login / Sign Up
            </button>

          </div>


          {/* =====================================================
              HERO SCIENTIFIC SIGNAL VISUALIZATION
          ===================================================== */}
          <div className="w-full max-w-4xl mt-8">

            <div className="rounded-3xl border border-slate-800 bg-slate-950/70 backdrop-blur-xl p-4 shadow-[0_0_80px_rgba(34,211,238,0.05)]">

              {/* Header */}
              <div className="flex items-center justify-between mb-4 px-2">

                <div className="flex items-center gap-3">
                  <AudioWaveform size={17} className="text-cyan-400" />

                  <span className="font-mono text-[10px] uppercase tracking-widest text-slate-500">
                    Live Acoustic Signal
                  </span>
                </div>

                <div className="flex items-center gap-2 text-[10px] font-mono text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  STREAM ACTIVE
                </div>

              </div>


              {/* Waveform */}
              <div className="relative h-36 rounded-2xl border border-slate-800 bg-[#020617] overflow-hidden">

                <div className="absolute inset-0 opacity-20"
                  style={{
                    backgroundImage:
                      'linear-gradient(rgba(34,211,238,.25) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,.25) 1px, transparent 1px)',
                    backgroundSize: '40px 30px'
                  }}
                />

                <div className="absolute inset-x-0 top-1/2 h-px bg-cyan-400/20" />

                {/* Fake waveform */}
                <div className="absolute inset-0 flex items-center justify-center gap-[3px] px-6">

                  {Array.from({ length: 90 }).map((_, i) => {

                    const height =
                      12 +
                      Math.abs(Math.sin(i * 0.55)) * 35 +
                      Math.abs(Math.sin(i * 0.17)) * 30

                    return (
                      <div
                        key={i}
                        className="w-[2px] rounded-full bg-gradient-to-t from-cyan-500/20 via-cyan-400 to-violet-400"
                        style={{
                          height: `${height}%`,
                          opacity: 0.45 + (i % 5) * 0.1
                        }}
                      />
                    )
                  })}

                </div>


                {/* Scanner */}
                <div className="absolute top-0 bottom-0 left-[62%] w-px bg-cyan-300 shadow-[0_0_15px_rgba(34,211,238,1)]" />

                <div className="absolute top-3 left-[62%] -translate-x-1/2 text-[8px] font-mono text-cyan-300 bg-cyan-500/10 px-2 py-1 rounded">
                  ANALYZING
                </div>

              </div>


              {/* Signal metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">

                <SignalMetric
                  label="Sample Rate"
                  value="16 kHz"
                />

                <SignalMetric
                  label="Window"
                  value="500 ms"
                />

                <SignalMetric
                  label="Inference"
                  value="< 1 sec"
                />

                <SignalMetric
                  label="Stream"
                  value="LIVE"
                  live
                />

              </div>

            </div>

          </div>

        </main>


        {/* Scroll */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-slate-500 animate-bounce">
          <span className="text-[9px] font-mono uppercase tracking-widest">
            Explore system
          </span>
          <ChevronDown size={20} className="text-cyan-400/50" />
        </div>

      </section>


      {/* Divider */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-slate-800 to-transparent" />


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
          />

          <StatCard
            icon={<Layers3 size={20} />}
            value="58"
            label="Feature Dimensions"
            description="Model input representation"
            color="violet"
          />

          <StatCard
            icon={<ScanLine size={20} />}
            value="1 sec"
            label="Risk Refresh"
            description="Continuous telemetry"
            color="fuchsia"
          />

          <StatCard
            icon={<ShieldCheck size={20} />}
            value="24/7"
            label="Monitoring"
            description="Continuous stream analysis"
            color="blue"
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

          <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight">
            How{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-violet-400">
              VeriVox
            </span>{' '}
            Works
          </h2>

          <p className="text-slate-400 max-w-2xl mx-auto text-lg">
            A streaming architecture that converts raw acoustic signals into
            interpretable synthetic-voice risk telemetry.
          </p>

        </div>


        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">

          {/* Connecting line */}
          <div className="hidden md:block absolute top-[105px] left-[12%] right-[12%] h-px bg-gradient-to-r from-cyan-500/20 via-violet-500/30 to-fuchsia-500/20" />


          <PipelineCard
            number="01"
            icon={<Network size={30} />}
            title="Signal Ingestion"
            description="Live audio enters the processing pipeline where the stream is normalized and divided into short rolling windows."
            color="cyan"
            tags={['PCM', '16kHz', 'Streaming']}
          />

          <PipelineCard
            number="02"
            icon={<BrainCircuit size={30} />}
            title="Feature Inference"
            description="Acoustic and voice characteristics are transformed into a multi-dimensional feature representation for model inference."
            color="violet"
            tags={['Acoustic', 'Prosody', 'Spectral']}
          />

          <PipelineCard
            number="03"
            icon={<Activity size={30} />}
            title="Risk Telemetry"
            description="Model output is calibrated and streamed to the interface as continuously updated synthetic-voice risk telemetry."
            color="fuchsia"
            tags={['Probability', 'Risk', 'WebSocket']}
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
            <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-6 backdrop-blur-xl">

              <div className="flex items-center justify-between mb-8">

                <div>
                  <div className="flex items-center gap-2 text-cyan-400 mb-2">
                    <BarChart3 size={18} />
                    <span className="font-mono text-[10px] uppercase tracking-widest">
                      Risk Analysis
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-white">
                    Synthetic Voice Probability
                  </h3>
                </div>

                <div className="text-right">
                  <div className="text-2xl font-bold text-cyan-300">
                    0.18
                  </div>
                  <div className="text-[9px] font-mono text-slate-500">
                    CURRENT RISK
                  </div>
                </div>

              </div>


              {/* Graph */}
              <div className="relative h-64 rounded-2xl border border-slate-800 bg-[#020617] overflow-hidden">

                {/* Grid */}
                <div
                  className="absolute inset-0 opacity-20"
                  style={{
                    backgroundImage:
                      'linear-gradient(rgba(148,163,184,.25) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,.25) 1px, transparent 1px)',
                    backgroundSize: '50px 40px'
                  }}
                />

                {/* Y labels */}
                <div className="absolute left-2 top-3 bottom-3 flex flex-col justify-between text-[8px] font-mono text-slate-600">
                  <span>1.0</span>
                  <span>0.75</span>
                  <span>0.50</span>
                  <span>0.25</span>
                  <span>0.0</span>
                </div>


                {/* Graph line */}
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
                       S760 90 800 80
                       L800 260
                       L0 260 Z"
                    fill="url(#riskGradient)"
                    opacity="0.05"
                  />

                </svg>


                {/* Threshold */}
                <div className="absolute left-10 right-0 top-[28%] border-t border-dashed border-red-400/30">
                  <span className="absolute right-2 -top-4 text-[8px] font-mono text-red-400/60">
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

              <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1.5 text-[10px] font-mono uppercase tracking-widest text-violet-300 mb-6">
                <BrainCircuit size={13} />
                Machine Learning Layer
              </div>

              <h2 className="text-3xl md:text-5xl font-bold text-white leading-tight mb-6">
                From acoustic signal
                <br />
                to measurable risk.
              </h2>

              <p className="text-slate-400 leading-relaxed mb-8">
                VeriVox transforms continuous speech into structured acoustic
                information. The detection layer evaluates multiple signal
                characteristics before producing a calibrated probability
                used by the real-time risk engine.
              </p>


              <div className="space-y-4">

                <AnalysisRow
                  icon={<Waves size={18} />}
                  title="Spectral Analysis"
                  text="Frequency-domain characteristics and acoustic structure."
                />

                <AnalysisRow
                  icon={<AudioWaveform size={18} />}
                  title="Prosodic Analysis"
                  text="Temporal patterns, pitch movement and speech dynamics."
                />

                <AnalysisRow
                  icon={<Fingerprint size={18} />}
                  title="Voice Characteristics"
                  text="Speaker-level characteristics and synthetic artifacts."
                />

                <AnalysisRow
                  icon={<ShieldCheck size={18} />}
                  title="Risk Calibration"
                  text="Converts model output into interpretable risk telemetry."
                />

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

          <h2 className="text-3xl md:text-4xl font-bold text-white">
            Built for continuous analysis
          </h2>

          <p className="text-slate-400 mt-4 max-w-xl mx-auto">
            Every stage of the detection pipeline exposes measurable
            information for monitoring, analysis and investigation.
          </p>

        </div>


        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">

          <TelemetryCard
            icon={<Clock3 size={19} />}
            label="WINDOW SIZE"
            value="500 ms"
            footer="Rolling inference"
          />

          <TelemetryCard
            icon={<Cpu size={19} />}
            label="FEATURE VECTOR"
            value="58-D"
            footer="Model representation"
          />

          <TelemetryCard
            icon={<Zap size={19} />}
            label="RISK UPDATE"
            value="1 sec"
            footer="Continuous telemetry"
          />

          <TelemetryCard
            icon={<Database size={19} />}
            label="AUDIO STORAGE"
            value="EPHEMERAL"
            footer="Pipeline processing"
          />

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

          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Advanced Detection Stack
          </h2>

          <p className="text-slate-400 max-w-xl">
            A layered approach combining signal processing, machine learning,
            speaker characteristics and real-time infrastructure.
          </p>

        </div>


        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

          <FeatureCard
            icon={<Zap size={24} />}
            title="Sub-Second Detection"
            text="Rolling inference windows allow the system to surface changing synthetic-voice risk during an active stream."
            color="cyan"
          />

          <FeatureCard
            icon={<Fingerprint size={24} />}
            title="Voice Signatures"
            text="Analyzes acoustic and speaker-level characteristics that can differ between natural and generated speech."
            color="violet"
          />

          <FeatureCard
            icon={<Shield size={24} />}
            title="Ephemeral Processing"
            text="The architecture is designed around transient stream processing rather than persistent raw-audio storage."
            color="fuchsia"
          />

          <FeatureCard
            icon={<Server size={24} />}
            title="Streaming Architecture"
            text="WebSocket telemetry connects inference output directly to the monitoring interface."
            color="blue"
          />

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

            <h2 className="text-3xl md:text-4xl font-bold text-white">
              Signal → Intelligence → Action
            </h2>

          </div>


          <div className="rounded-3xl border border-slate-800 bg-slate-950/70 backdrop-blur-xl p-6 md:p-10">

            <div className="grid grid-cols-1 md:grid-cols-5 items-center gap-4">

              <ArchitectureNode
                icon={<Radio size={22} />}
                title="LIVE AUDIO"
                subtitle="Input stream"
                color="cyan"
              />

              <ArrowConnector />

              <ArchitectureNode
                icon={<Waves size={22} />}
                title="FEATURES"
                subtitle="Signal analysis"
                color="violet"
              />

              <ArrowConnector />

              <ArchitectureNode
                icon={<BrainCircuit size={22} />}
                title="MODEL"
                subtitle="Inference"
                color="fuchsia"
              />

            </div>


            <div className="hidden md:flex justify-center my-8">
              <div className="h-12 w-px bg-gradient-to-b from-fuchsia-500/50 to-cyan-500/20" />
            </div>


            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

              <MiniArchitectureCard
                icon={<BarChart3 size={18} />}
                title="Probability"
                text="Model confidence"
              />

              <MiniArchitectureCard
                icon={<ShieldAlertIcon />}
                title="Risk Engine"
                text="Threat classification"
              />

              <MiniArchitectureCard
                icon={<Activity size={18} />}
                title="Telemetry"
                text="Real-time dashboard"
              />

            </div>

          </div>

        </div>

      </section>


      {/* =========================================================
          CTA
      ========================================================= */}
      <section className="py-28 px-4 text-center relative z-10 border-t border-slate-800/50 bg-slate-900/20 overflow-hidden">

        <div className="absolute left-1/2 -translate-x-1/2 -top-32 h-72 w-72 rounded-full bg-cyan-500/10 blur-[100px]" />

        <div className="relative">

          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-4 py-2 text-[10px] font-mono uppercase tracking-widest text-cyan-300 mb-6">
            <CheckCircle2 size={13} />
            Detection system ready
          </div>

          <h3 className="text-3xl md:text-5xl font-bold text-white mb-6">
            Secure the signal.
            <br />
            <span className="text-slate-500">
              Verify the conversation.
            </span>
          </h3>

          <p className="text-slate-400 max-w-xl mx-auto mb-9">
            Explore the live detection environment and monitor synthetic
            voice risk as it happens.
          </p>

          <button
            onClick={onLogin}
            className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 text-sm font-bold text-slate-900 transition-all hover:bg-slate-200 hover:scale-105 cursor-pointer"
          >
            Start Detection
            <ArrowRight size={18} />
          </button>

        </div>

      </section>


      {/* =========================================================
          FOOTER
      ========================================================= */}
      <footer className="border-t border-slate-800/70 px-6 py-8">

        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">

          <div className="flex items-center gap-3">

            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-cyan-400 to-violet-500 flex items-center justify-center">
              <Shield size={17} className="text-white" />
            </div>

            <div>
              <div className="font-bold text-white text-sm">
                VeriVox
              </div>

              <div className="text-[9px] font-mono uppercase tracking-widest text-slate-600">
                Synthetic Voice Intelligence
              </div>
            </div>

          </div>

          <div className="text-[10px] font-mono text-slate-600">
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

function SignalMetric({ label, value, live }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-3 text-left">

      <div className="text-[8px] uppercase tracking-widest font-mono text-slate-600 mb-1">
        {label}
      </div>

      <div className={`text-xs font-mono ${live ? 'text-emerald-400' : 'text-slate-300'}`}>
        {value}
      </div>

    </div>
  )
}


function StatCard({ icon, value, label, description, color }) {

  const colors = {
    cyan: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/10',
    violet: 'text-violet-400 bg-violet-500/10 border-violet-500/10',
    fuchsia: 'text-fuchsia-400 bg-fuchsia-500/10 border-fuchsia-500/10',
    blue: 'text-blue-400 bg-blue-500/10 border-blue-500/10'
  }

  return (
    <div className="group rounded-2xl border border-slate-800 bg-slate-900/40 p-6 backdrop-blur-sm hover:border-slate-700 transition-all">

      <div className={`h-10 w-10 rounded-xl flex items-center justify-center border mb-5 ${colors[color]}`}>
        {icon}
      </div>

      <div className="text-3xl font-black text-white tracking-tight">
        {value}
      </div>

      <div className="text-sm font-bold text-slate-300 mt-1">
        {label}
      </div>

      <div className="text-xs text-slate-600 mt-2">
        {description}
      </div>

    </div>
  )
}


function PipelineCard({ number, icon, title, description, color, tags }) {

  const styles = {
    cyan: {
      icon: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400',
      number: 'text-cyan-400'
    },
    violet: {
      icon: 'bg-violet-500/10 border-violet-500/20 text-violet-400',
      number: 'text-violet-400'
    },
    fuchsia: {
      icon: 'bg-fuchsia-500/10 border-fuchsia-500/20 text-fuchsia-400',
      number: 'text-fuchsia-400'
    }
  }

  return (
    <div className="relative z-10 rounded-3xl bg-slate-900/50 border border-slate-800 backdrop-blur-sm p-8 hover:-translate-y-2 transition-all duration-300 hover:border-slate-700">

      <div className={`text-[10px] font-mono mb-5 ${styles[color].number}`}>
        STEP_{number}
      </div>

      <div className={`h-16 w-16 rounded-full flex items-center justify-center border mb-6 ${styles[color].icon}`}>
        {icon}
      </div>

      <h3 className="text-xl font-bold text-white mb-3">
        {title}
      </h3>

      <p className="text-slate-400 text-sm leading-relaxed mb-6">
        {description}
      </p>

      <div className="flex flex-wrap gap-2">

        {tags.map(tag => (
          <span
            key={tag}
            className="rounded-md border border-slate-800 bg-slate-950 px-2 py-1 text-[9px] font-mono text-slate-500"
          >
            {tag}
          </span>
        ))}

      </div>

    </div>
  )
}


function AnalysisRow({ icon, title, text }) {

  return (
    <div className="flex gap-4 p-4 rounded-2xl border border-slate-800 bg-slate-900/30 hover:bg-slate-900/60 transition-colors">

      <div className="shrink-0 h-10 w-10 rounded-xl bg-cyan-500/10 border border-cyan-500/10 flex items-center justify-center text-cyan-400">
        {icon}
      </div>

      <div>
        <h4 className="text-sm font-bold text-slate-200 mb-1">
          {title}
        </h4>

        <p className="text-xs text-slate-500 leading-relaxed">
          {text}
        </p>
      </div>

    </div>
  )
}


function TelemetryCard({ icon, label, value, footer }) {

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/50 p-6">

      <div className="absolute top-0 right-0 h-24 w-24 rounded-full bg-cyan-500/5 blur-2xl" />

      <div className="flex items-center justify-between mb-6">

        <div className="text-cyan-400">
          {icon}
        </div>

        <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />

      </div>

      <div className="text-[9px] font-mono tracking-widest text-slate-600 mb-2">
        {label}
      </div>

      <div className="text-xl font-black text-white">
        {value}
      </div>

      <div className="text-xs text-slate-600 mt-2">
        {footer}
      </div>

    </div>
  )
}


function FeatureCard({ icon, title, text, color }) {

  const colors = {
    cyan: 'bg-cyan-500/10 text-cyan-400 group-hover:text-cyan-300',
    violet: 'bg-violet-500/10 text-violet-400 group-hover:text-violet-300',
    fuchsia: 'bg-fuchsia-500/10 text-fuchsia-400 group-hover:text-fuchsia-300',
    blue: 'bg-blue-500/10 text-blue-400 group-hover:text-blue-300'
  }

  return (
    <div className="group p-6 rounded-2xl bg-gradient-to-b from-slate-800/50 to-slate-900/50 border border-slate-800 hover:border-slate-700 transition-all duration-300">

      <div className={`mb-5 inline-flex p-3 rounded-lg transition-transform group-hover:scale-110 ${colors[color]}`}>
        {icon}
      </div>

      <h4 className="text-lg font-bold text-slate-200 mb-3">
        {title}
      </h4>

      <p className="text-sm text-slate-400 leading-relaxed">
        {text}
      </p>

    </div>
  )
}


function ArchitectureNode({ icon, title, subtitle, color }) {

  const colors = {
    cyan: 'text-cyan-400 border-cyan-500/20 bg-cyan-500/10',
    violet: 'text-violet-400 border-violet-500/20 bg-violet-500/10',
    fuchsia: 'text-fuchsia-400 border-fuchsia-500/20 bg-fuchsia-500/10'
  }

  return (
    <div className={`rounded-2xl border p-5 text-center ${colors[color]}`}>

      <div className="flex justify-center mb-3">
        {icon}
      </div>

      <div className="text-xs font-bold font-mono text-slate-200">
        {title}
      </div>

      <div className="text-[9px] font-mono text-slate-600 mt-1">
        {subtitle}
      </div>

    </div>
  )
}


function ArrowConnector() {

  return (
    <div className="hidden md:flex items-center justify-center text-slate-700">
      <ArrowRight size={20} />
    </div>
  )
}


function MiniArchitectureCard({ icon, title, text }) {

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 flex items-center gap-3">

      <div className="h-9 w-9 rounded-lg bg-slate-800 flex items-center justify-center text-cyan-400">
        {icon}
      </div>

      <div>
        <div className="text-xs font-bold text-slate-300">
          {title}
        </div>

        <div className="text-[9px] font-mono text-slate-600">
          {text}
        </div>
      </div>

    </div>
  )
}


/* Small inline icon so no extra import is required */
function ShieldAlertIcon() {
  return (
    <ShieldCheck size={18} />
  )
}