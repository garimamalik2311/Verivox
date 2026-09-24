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
  Server
} from 'lucide-react'

export default function LandingPage({ onLogin }) {
  return (
    <div className="bg-[#030712] min-h-screen text-slate-200 selection:bg-cyan-500/30 overflow-x-hidden">
      
      {/* --- HERO SECTION --- */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-4">
        {/* Background glowing effects */}
        <div className="absolute top-1/3 left-1/4 h-[500px] w-[500px] rounded-full bg-cyan-500/10 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/3 right-1/4 h-[500px] w-[500px] rounded-full bg-violet-500/10 blur-[120px] pointer-events-none" />

        <main className="relative z-10 flex flex-col items-center text-center max-w-4xl mx-auto space-y-8 mt-20">
          
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-400/10 px-4 py-2 backdrop-blur-md animate-fade-in">
            <Shield size={16} className="text-cyan-300" />
            <span className="text-xs font-bold font-mono uppercase tracking-widest text-cyan-200">
              Enterprise Grade Protection
            </span>
          </div>

          <h1 className="text-5xl md:text-7xl font-black leading-tight tracking-tighter text-white">
            Keep every{' '}
            <span className="bg-gradient-to-r from-cyan-300 via-violet-300 to-fuchsia-300 bg-clip-text text-transparent">
              conversation
            </span>{' '}
            trustworthy.
          </h1>

          <p className="max-w-2xl text-lg md:text-xl text-slate-400 leading-relaxed">
            VeriVox receives live audio, processes rolling windows through the backend inference pipeline, and displays the resulting synthetic-voice risk telemetry in real time.
          </p>

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
        </main>

        {/* Scroll Indicator */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-slate-500 animate-bounce">
          <span className="text-xs font-mono uppercase tracking-widest"></span>
          <ChevronDown size={24} className="text-cyan-400/50" />
        </div>
      </section>

      {/* Divider */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-slate-800 to-transparent" />

      {/* --- EXPLANATION SECTION --- */}
      <section className="relative py-32 px-4 max-w-6xl mx-auto">
        <div className="text-center mb-20 space-y-4">
          <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight">
            How <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-violet-400">VeriVox</span> Works
          </h2>
          <p className="text-slate-400 max-w-2xl mx-auto text-lg">
            A seamless pipeline designed for absolute security with zero perceptible latency.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {/* Connecting Line for Desktop */}
          <div className="hidden md:block absolute top-1/2 left-0 w-full h-0.5 bg-gradient-to-r from-cyan-500/20 via-violet-500/20 to-fuchsia-500/20 -translate-y-1/2 z-0" />

          {/* Step 1 */}
          <div className="relative z-10 flex flex-col items-center text-center p-8 rounded-3xl bg-slate-900/40 border border-slate-800 backdrop-blur-sm transition-transform hover:-translate-y-2">
            <div className="h-16 w-16 rounded-full bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20 mb-6 shadow-[0_0_30px_rgba(34,211,238,0.1)]">
              <Network className="text-cyan-400" size={32} />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">1. Live Audio Ingestion</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              VeriVox securely hooks into your communication stream, capturing live audio packets and standardizing sample rates instantly.
            </p>
          </div>

          {/* Step 2 */}
          <div className="relative z-10 flex flex-col items-center text-center p-8 rounded-3xl bg-slate-900/40 border border-slate-800 backdrop-blur-sm transition-transform hover:-translate-y-2">
            <div className="h-16 w-16 rounded-full bg-violet-500/10 flex items-center justify-center border border-violet-500/20 mb-6 shadow-[0_0_30px_rgba(139,92,246,0.1)]">
              <Cpu className="text-violet-400" size={32} />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">2. Rolling Inference</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              The audio is sliced into overlapping 500ms windows. Our neural engine scans for acoustic artifacts and phase anomalies in milliseconds.
            </p>
          </div>

          {/* Step 3 */}
          <div className="relative z-10 flex flex-col items-center text-center p-8 rounded-3xl bg-slate-900/40 border border-slate-800 backdrop-blur-sm transition-transform hover:-translate-y-2">
            <div className="h-16 w-16 rounded-full bg-fuchsia-500/10 flex items-center justify-center border border-fuchsia-500/20 mb-6 shadow-[0_0_30px_rgba(217,70,239,0.1)]">
              <Activity className="text-fuchsia-400" size={32} />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">3. Risk Telemetry</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Results are streamed back to your dashboard via WebSockets, giving you a live, visual threat score for the active speaker.
            </p>
          </div>
        </div>
      </section>

      {/* --- FEATURES SECTION --- */}
      <section className="relative py-32 px-4 max-w-7xl mx-auto">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[800px] w-[800px] rounded-full bg-cyan-900/5 blur-[150px] pointer-events-none" />
        
        <div className="mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Advanced Capabilities</h2>
          <p className="text-slate-400 max-w-xl">
            Built for modern threat vectors, combining cutting-edge machine learning with enterprise-grade infrastructure.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          <div className="group p-6 rounded-2xl bg-gradient-to-b from-slate-800/50 to-slate-900/50 border border-slate-800 hover:border-cyan-500/50 transition-all duration-300 hover:shadow-[0_0_30px_rgba(34,211,238,0.05)] cursor-default">
            <div className="mb-4 inline-block p-3 rounded-lg bg-cyan-500/10 text-cyan-400 group-hover:scale-110 transition-transform">
              <Zap size={24} />
            </div>
            <h4 className="text-lg font-bold text-slate-200 mb-2 group-hover:text-cyan-300 transition-colors">Sub-Second Latency</h4>
            <p className="text-sm text-slate-400">Optimized C++ backend ensuring detection happens before the sentence is even finished.</p>
          </div>

          <div className="group p-6 rounded-2xl bg-gradient-to-b from-slate-800/50 to-slate-900/50 border border-slate-800 hover:border-violet-500/50 transition-all duration-300 hover:shadow-[0_0_30px_rgba(139,92,246,0.05)] cursor-default">
            <div className="mb-4 inline-block p-3 rounded-lg bg-violet-500/10 text-violet-400 group-hover:scale-110 transition-transform">
              <Fingerprint size={24} />
            </div>
            <h4 className="text-lg font-bold text-slate-200 mb-2 group-hover:text-violet-300 transition-colors">Biometric Signatures</h4>
            <p className="text-sm text-slate-400">Detects cloned voices by analyzing breathing patterns and micro-hesitations native to humans.</p>
          </div>

          <div className="group p-6 rounded-2xl bg-gradient-to-b from-slate-800/50 to-slate-900/50 border border-slate-800 hover:border-fuchsia-500/50 transition-all duration-300 hover:shadow-[0_0_30px_rgba(217,70,239,0.05)] cursor-default">
            <div className="mb-4 inline-block p-3 rounded-lg bg-fuchsia-500/10 text-fuchsia-400 group-hover:scale-110 transition-transform">
              <Shield size={24} />
            </div>
            <h4 className="text-lg font-bold text-slate-200 mb-2 group-hover:text-fuchsia-300 transition-colors">Zero-Knowledge Transit</h4>
            <p className="text-sm text-slate-400">Audio is ephemeral. We process the payload in memory and destroy it instantly. No logs. No recordings.</p>
          </div>

          <div className="group p-6 rounded-2xl bg-gradient-to-b from-slate-800/50 to-slate-900/50 border border-slate-800 hover:border-blue-500/50 transition-all duration-300 hover:shadow-[0_0_30px_rgba(59,130,246,0.05)] cursor-default">
            <div className="mb-4 inline-block p-3 rounded-lg bg-blue-500/10 text-blue-400 group-hover:scale-110 transition-transform">
              <Server size={24} />
            </div>
            <h4 className="text-lg font-bold text-slate-200 mb-2 group-hover:text-blue-300 transition-colors">Drop-in API</h4>
            <p className="text-sm text-slate-400">Integrates with Twilio, Zoom, and raw WebRTC streams with just three lines of code.</p>
          </div>

        </div>
      </section>

      {/* --- CTA / FOOTER --- */}
      <section className="py-24 px-4 text-center relative z-10 border-t border-slate-800/50 bg-slate-900/20">
        <h3 className="text-2xl md:text-4xl font-bold text-white mb-6">Ready to secure your communications?</h3>
        <button 
          onClick={onLogin} 
          className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 text-sm font-bold text-slate-900 transition-all hover:bg-slate-200 hover:scale-105 cursor-pointer"
        >
          Start Free Trial
          <ArrowRight size={18} />
        </button>
      </section>
      
    </div>
  )
}