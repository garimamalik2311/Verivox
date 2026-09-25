'use client'

import React from 'react'
import { 
  ShieldAlert, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  Lock, 
  UserX, 
  Activity, 
  Server, 
  ShieldCheck, 
  Radio, 
  FileText,
  Zap
} from 'lucide-react'
import { useSecurity } from '../context/SecurityContext'

export default function Admin({ selected, activeStreamId }) {
  const { escalatedIncident, setEscalatedIncident } = useSecurity()

  // Safely check if an AI voice / High Risk state is active from props or context
  const isAiVoiceDetected = 
    escalatedIncident !== null || 
    selected?.risk_level === 'HIGH' || 
    selected?.alert_triggered === true ||
    (selected?.ai_probability && selected.ai_probability > 0.7)

  const handleAction = (actionType) => {
    alert(`Security Action Executed: ${actionType}`)
    if (escalatedIncident) {
      setEscalatedIncident(null) // Clears escalated state after action
    }
  }

  return (
    <div className="relative space-y-8 p-6 lg:p-10 text-white">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-white/10 pb-6">
        <div>
          <h1 className="text-2xl font-black font-mono tracking-tight">Security Incident Command</h1>
          <p className="mt-1 text-sm text-slate-400">
            Real-time oversight, threat mitigation, and deepfake telemetry control center.
          </p>
        </div>
        <div className="mt-4 md:mt-0 flex items-center gap-3">
          <span className="flex items-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-400/10 px-3 py-1 text-xs font-bold font-mono text-cyan-200">
            <span className="size-2 rounded-full bg-cyan-400 animate-ping" />
            SEC-OPS ACTIVE
          </span>
        </div>
      </div>

      {/* CONDITIONAL AI THREAT BOX: Only appears when AI voice is detected */}
      {isAiVoiceDetected && (
        <section className="relative overflow-hidden rounded-2xl border border-red-400/50 bg-gradient-to-br from-red-500/[0.18] via-red-500/[0.08] to-transparent p-6 shadow-[0_0_60px_rgba(239,68,68,0.2)]">
          <div className="absolute inset-y-0 left-0 w-2 bg-gradient-to-b from-red-300 via-red-500 to-orange-400" />
          
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex size-14 shrink-0 items-center justify-center rounded-xl border border-red-300/40 bg-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.3)]">
                <ShieldAlert size={30} className="animate-pulse text-red-200" />
              </div>
              <div>
                <span className="rounded-md border border-red-300/30 bg-red-400/10 px-2.5 py-0.5 text-xs font-black font-mono uppercase tracking-widest text-red-200">
                  Critical Threat Flagged · Stream: {escalatedIncident?.streamId || activeStreamId || selected?.id || 'ACTIVE_STREAM'}
                </span>
                <h2 className="mt-2 text-xl font-bold text-white">Synthetic Voice Impersonation Detected</h2>
                <p className="mt-1 text-sm text-slate-200 font-mono">
                  AI Probability Breached: <span className="text-red-300 font-bold">{Math.round((selected?.ai_probability || escalatedIncident?.ai_probability || 0.89) * 100)}%</span> across recent analysis windows. Immediate action required.
                </p>
              </div>
            </div>

            <button 
              onClick={() => setEscalatedIncident(null)}
              className="text-slate-400 hover:text-white transition"
              title="Dismiss Warning"
            >
              <X size={20} />
            </button>
          </div>

          {/* Small Action Focus Boxes for Admin */}
          <div className="mt-6 border-t border-red-300/15 pt-5">
            <p className="mb-3 text-xs font-bold font-mono uppercase tracking-widest text-slate-300">
              Mandatory Admin Action Protocols
            </p>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div 
                onClick={() => handleAction('FREEZE_TRANSACTION')}
                className="cursor-pointer group rounded-xl border border-red-300/30 bg-[#030712]/60 p-4 transition hover:border-red-300 hover:bg-red-500/10"
              >
                <div className="flex items-center justify-between text-red-200 mb-2">
                  <Lock size={18} />
                  <span className="text-[10px] font-mono uppercase bg-red-500/20 px-2 py-0.5 rounded">High Priority</span>
                </div>
                <h3 className="font-bold text-sm text-white">Freeze Transaction</h3>
                <p className="text-xs text-slate-400 mt-1">Immediately halt any outgoing funds or automated transfers.</p>
              </div>

              <div 
                onClick={() => handleAction('REVOKE_SESSION')}
                className="cursor-pointer group rounded-xl border border-amber-300/30 bg-[#030712]/60 p-4 transition hover:border-amber-300 hover:bg-amber-500/10"
              >
                <div className="flex items-center justify-between text-amber-200 mb-2">
                  <UserX size={18} />
                  <span className="text-[10px] font-mono uppercase bg-amber-500/20 px-2 py-0.5 rounded">Access Control</span>
                </div>
                <h3 className="font-bold text-sm text-white">Revoke Session</h3>
                <p className="text-xs text-slate-400 mt-1">Terminate current WebSocket session and auth tokens.</p>
              </div>

              <div 
                onClick={() => handleAction('QUARANTINE_AUDIO')}
                className="cursor-pointer group rounded-xl border border-violet-300/30 bg-[#030712]/60 p-4 transition hover:border-violet-300 hover:bg-violet-500/10"
              >
                <div className="flex items-center justify-between text-violet-200 mb-2">
                  <Server size={18} />
                  <span className="text-[10px] font-mono uppercase bg-violet-500/20 px-2 py-0.5 rounded">Forensics</span>
                </div>
                <h3 className="font-bold text-sm text-white">Quarantine Audio</h3>
                <p className="text-xs text-slate-400 mt-1">Save sample buffer to secure storage for acoustic forensics.</p>
              </div>

              <div 
                onClick={() => handleAction('BLACKLIST_PROFILE')}
                className="cursor-pointer group rounded-xl border border-cyan-300/30 bg-[#030712]/60 p-4 transition hover:border-cyan-300 hover:bg-cyan-500/10"
              >
                <div className="flex items-center justify-between text-cyan-200 mb-2">
                  <Zap size={18} />
                  <span className="text-[10px] font-mono uppercase bg-cyan-500/20 px-2 py-0.5 rounded">Model Guard</span>
                </div>
                <h3 className="font-bold text-sm text-white">Blacklist Profile</h3>
                <p className="text-xs text-slate-400 mt-1">Add voice embedding vector signature to global blocklist.</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ALWAYS PRESENT ADMIN PAGE COMPONENTS (System Overview & Telemetry) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        
        {/* System Health Status */}
        <div className="rounded-2xl border border-white/10 bg-[#07111f]/75 p-6 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">System Infrastructure</h3>
            <Activity size={18} className="text-cyan-300" />
          </div>
          <div className="space-y-3 font-mono text-xs">
            <div className="flex justify-between items-center py-2 border-b border-white/5">
              <span className="text-slate-400">XGBoost Engine (58-D):</span>
              <span className="text-emerald-300 font-bold">ONLINE</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-white/5">
              <span className="text-slate-400">Dual MMS-300M Model:</span>
              <span className="text-emerald-300 font-bold">ACTIVE</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-slate-400">WebSocket Ingestion:</span>
              <span className="text-emerald-300 font-bold">CONNECTED</span>
            </div>
          </div>
        </div>

        {/* Global Security Posture */}
        <div className="rounded-2xl border border-white/10 bg-[#07111f]/75 p-6 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">Detection Parameters</h3>
            <ShieldCheck size={18} className="text-violet-300" />
          </div>
          <div className="space-y-3 font-mono text-xs">
            <div className="flex justify-between items-center py-2 border-b border-white/5">
              <span className="text-slate-400">Default Probability Threshold:</span>
              <span className="text-white font-bold">70.0%</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-white/5">
              <span className="text-slate-400">Required Consecutive Windows:</span>
              <span className="text-white font-bold">3 Frames</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-slate-400">Modality Gate (Alpha):</span>
              <span className="text-white font-bold">0.520</span>
            </div>
          </div>
        </div>

        {/* Audit Log Summary */}
        <div className="rounded-2xl border border-white/10 bg-[#07111f]/75 p-6 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">Compliance & Audit</h3>
            <FileText size={18} className="text-emerald-300" />
          </div>
          <div className="space-y-3 font-mono text-xs">
            <div className="flex justify-between items-center py-2 border-b border-white/5">
              <span className="text-slate-400">Privacy Mode:</span>
              <span className="text-cyan-200 font-bold">Feature-Only</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-white/5">
              <span className="text-slate-400">Data Retention:</span>
              <span className="text-white font-bold">24 Hours</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-slate-400">Encryption Standard:</span>
              <span className="text-emerald-300 font-bold">TLS 1.3 / AES-256</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}