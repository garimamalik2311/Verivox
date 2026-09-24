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
  LayoutDashboard
} from 'lucide-react'

export default function LandingPage({ onLogin, onDashboard }) {
  const [activeBadgeIndex, setActiveBadgeIndex] = useState(0);
  const canvasRef = useRef(null);

  // Sequence flash badges continuously
  useEffect(() => {
    const badgeInterval = setInterval(() => {
      setActiveBadgeIndex((prev) => (prev + 1) % 4);
    }, 2800);
    return () => clearInterval(badgeInterval);
  }, []);

  // Clean scrolling wave graph canvas simulation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let time = 0;

    const handleResize = () => {
      if (canvas.parentElement) {
        canvas.width = canvas.parentElement.clientWidth;
        canvas.height = canvas.parentElement.clientHeight;
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    const render = () => {
      const w = canvas.width;
      const h = canvas.height;

      // Clear background with soft fade
      ctx.fillStyle = 'rgba(2, 6, 23, 0.3)';
      ctx.fillRect(0, 0, w, h);

      time += 0.035;

      // Draw subtle grid lines
      ctx.strokeStyle = 'rgba(30, 41, 59, 0.3)';
      ctx.lineWidth = 1;
      const gridSize = 40;
      for (let x = 0; x < w; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Draw smooth scrolling wave lines
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Background ambient wave
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(124, 58, 237, 0.35)';
      for (let x = 0; x < w; x += 2) {
        const y = h * 0.5 + Math.sin(x * 0.012 + time * 1.2) * 35 + Math.cos(x * 0.008 - time) * 20;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Primary glowing foreground cyan wave
      ctx.beginPath();
      ctx.strokeStyle = '#22d3ee';
      ctx.shadowColor = '#22d3ee';
      ctx.shadowBlur = 12;
      for (let x = 0; x < w; x += 2) {
        const y = h * 0.5 + Math.sin(x * 0.015 - time * 1.5) * 45 + Math.sin(x * 0.005 + time * 0.5) * 25;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0; // Reset shadow

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

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
          HERO SECTION (REDESIGNED WITH CANVAS & DYNAMIC BADGES)
      ========================================================= */}
      <section className="relative min-h-screen pt-28 pb-20 px-4 md:px-8 flex flex-col justify-center overflow-hidden">
        
        {/* Ambient background glows */}
        <div className="absolute top-1/4 left-12 w-96 h-96 bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-12 right-12 w-[500px] h-[500px] bg-violet-600/10 rounded-full blur-[150px] pointer-events-none"></div>

        <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10">

          {/* LEFT COLUMN: Headings & CTA Buttons */}
          <div className="lg:col-span-6 flex flex-col justify-center space-y-6 text-left">
            
            {/* Status Badge */}
            <div className="inline-flex items-center gap-2.5 self-start px-3.5 py-1.5 rounded-full border border-cyan-400/30 bg-cyan-500/10 backdrop-blur-md shadow-[0_0_20px_rgba(34,211,238,0.15)]">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-400"></span>
              </span>
              <Radio className="w-3.5 h-3.5 text-cyan-300" />
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-200">
                Real-Time Voice Ingestion Active
              </span>
            </div>

            {/* Heading */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black leading-[1.1] tracking-tight text-white">
              Detect the voice.<br />
              <span className="bg-gradient-to-r from-cyan-300 via-violet-300 to-fuchsia-300 bg-clip-text text-transparent">
                Verify the signal.
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-slate-300 text-base sm:text-lg leading-relaxed max-w-xl">
              VeriVox analyzes live audio through rolling inference windows, acoustic feature extraction, speaker verification, and synthetic voice detection to surface real-time impersonation risk.
            </p>

            {/* Buttons: LOGIN and Go to Dashboard */}
            <div className="flex flex-wrap items-center gap-4 pt-4">
              <button 
                onClick={() => onLogin && onLogin()} 
                className="px-8 py-4 rounded-xl bg-gradient-to-r from-cyan-400 via-cyan-500 to-violet-600 text-slate-950 font-extrabold text-sm hover:shadow-[0_0_35px_rgba(34,211,238,0.4)] hover:scale-[1.02] transition-all flex items-center gap-3 cursor-pointer"
              >
                <LogIn className="w-4 h-4 stroke-[2.5]" />
                <span>LOGIN</span>
              </button>

              <button 
                onClick={() => onDashboard ? onDashboard() : (onLogin && onLogin())} 
                className="px-6 py-4 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700 text-slate-200 font-bold text-sm backdrop-blur-md transition-all flex items-center gap-2.5 cursor-pointer shadow-lg"
              >
                <LayoutDashboard className="w-4 h-4 text-cyan-400" />
                <span>Go to Dashboard</span>
              </button>
            </div>

          </div>

          {/* RIGHT COLUMN: Graph Deck with Continuous Flashing Messages */}
          <div className="lg:col-span-6 relative">
            <div className="relative rounded-3xl border border-cyan-500/20 bg-[#07111f]/90 p-4 sm:p-6 backdrop-blur-2xl shadow-[0_0_60px_rgba(34,211,238,0.12)]">
              
              {/* Deck Top Bar */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-800/80 mb-4 px-2">
                <div className="flex items-center gap-2">

                  <span className="ml-2 font-mono text-xs text-slate-400 flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-cyan-400" /> ACOUSTIC_PIPE_GPU_01
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[11px] text-cyan-400 bg-cyan-950/60 px-2.5 py-0.5 rounded border border-cyan-500/30">LIVE STREAM</span>
                </div>
              </div>

              {/* Canvas Visualizer Container with Flashing Sequential Messages */}
              <div className="relative h-80 sm:h-96 w-full rounded-2xl bg-[#020617] border border-slate-800/90 overflow-hidden flex items-center justify-center">
                <canvas ref={canvasRef} className="w-full h-full block"></canvas>

                {/* Flash Message 1: SIGNAL ACQUIRED */}
                <div className={`absolute top-16 left-1/4 transform -translate-x-1/2 transition-all duration-500 ${activeBadgeIndex === 0 ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-75 translate-y-3 pointer-events-none'}`}>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-cyan-950/90 border border-cyan-400/50 shadow-[0_0_20px_rgba(34,211,238,0.3)] backdrop-blur-md">
                    <Waves className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                    <span className="text-[11px] font-mono font-bold text-cyan-200 uppercase tracking-wide">SIGNAL ACQUIRED</span>
                  </div>
                </div>

                {/* Flash Message 2: ANALYSIS RUNNING */}
                <div className={`absolute top-24 right-1/4 transform translate-x-1/2 transition-all duration-500 ${activeBadgeIndex === 1 ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-75 translate-y-3 pointer-events-none'}`}>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-violet-950/90 border border-violet-400/50 shadow-[0_0_20px_rgba(139,92,246,0.3)] backdrop-blur-md">
                    <Activity className="w-3.5 h-3.5 text-violet-400 animate-spin" />
                    <span className="text-[11px] font-mono font-bold text-violet-200 uppercase tracking-wide">ANALYSIS RUNNING</span>
                  </div>
                </div>

                {/* Flash Message 3: VOICE MATCHING */}
                <div className={`absolute bottom-24 left-1/3 transform -translate-x-1/2 transition-all duration-500 ${activeBadgeIndex === 2 ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-75 translate-y-3 pointer-events-none'}`}>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-950/90 border border-emerald-400/50 shadow-[0_0_20px_rgba(16,185,129,0.3)] backdrop-blur-md">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-[11px] font-mono font-bold text-emerald-200 uppercase tracking-wide">VOICE MATCHING</span>
                  </div>
                </div>

                {/* Flash Message 4: HIGH PITCH / SPIKE */}
                <div className={`absolute top-20 right-12 transition-all duration-500 ${activeBadgeIndex === 3 ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-75 translate-y-3 pointer-events-none'}`}>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-rose-950/90 border border-rose-500/50 shadow-[0_0_20px_rgba(244,63,94,0.3)] backdrop-blur-md">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-400 animate-bounce" />
                    <span className="text-[11px] font-mono font-bold text-rose-200 uppercase tracking-wide">HIGH PITCH</span>
                  </div>
                </div>

              </div>

              {/* Bottom Telemetry Strip */}
              <div className="grid grid-cols-3 gap-3 mt-4">
                <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 text-left">
                  <p className="text-[10px] font-mono text-slate-400 uppercase">Sample Rate</p>
                  <p className="text-xs font-mono font-bold text-cyan-300 mt-0.5">16.0 kHz Mono</p>
                </div>
                <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 text-left">
                  <p className="text-[10px] font-mono text-slate-400 uppercase">Window Size</p>
                  <p className="text-xs font-mono font-bold text-violet-300 mt-0.5">500 ms Rolling</p>
                </div>
                <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 text-left">
                  <p className="text-[10px] font-mono text-slate-400 uppercase">Inference</p>
                  <p className="text-xs font-mono font-bold text-fuchsia-300 mt-0.5">&lt; 0.85 sec</p>
                </div>
              </div>

            </div>
          </div>

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
            className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 text-sm font-bold text-slate-900 transition-all hover:bg-slate-200 hover:scale-105 cursor-pointer shadow-[0_0_30px_rgba(255,255,255,0.2)]"
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


function ShieldAlertIcon() {
  return (
    <ShieldCheck size={18} />
  )
}