import { 
  ShieldCheck, 
  Users, 
  Settings, 
  Activity, 
  AlertTriangle, 
  ShieldBan, 
  FileAudio, 
  CheckCircle 
} from 'lucide-react'

export default function Admin() {
  return (
    <div className="mx-auto max-w-6xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* HEADER */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
          <ShieldCheck className="text-cyan-400" size={32} />
          Admin Control Center
        </h1>
        <p className="text-sm font-mono text-slate-400 tracking-wide">
          SYSTEM CONFIGURATION & INCIDENT MANAGEMENT
        </p>
      </div>

      {/* ACTIVE ESCALATIONS SECTION - TARGET FOR "ACKNOWLEDGE & ESCALATE" */}
      <div className="rounded-2xl border border-rose-500/30 bg-rose-500/5 p-6 backdrop-blur-md relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10 text-rose-500 pointer-events-none">
          <AlertTriangle size={160} />
        </div>
        
        <h3 className="text-sm font-bold text-rose-400 mb-4 uppercase tracking-widest flex items-center gap-2">
          <AlertTriangle size={18} />
          Requires Immediate Action: Escalated Incidents
        </h3>

        {/* Escalated Incident Card */}
        <div className="rounded-xl border border-white/10 bg-black/40 p-5 relative z-10 shadow-lg">
          <div className="flex flex-col md:flex-row justify-between md:items-start gap-4 mb-5">
            <div>
              <h4 className="text-lg font-bold text-white flex items-center gap-3">
                Synthetic Voice Clone Detected
                <span className="text-[10px] font-bold bg-rose-500 text-white px-2 py-1 rounded uppercase tracking-wider">
                  Critical Detection
                </span>
              </h4>
              <p className="text-sm text-slate-300 mt-2">
                High synthetic-voice probability detected across 2 consecutive audio windows.
              </p>
              <div className="flex items-center gap-4 mt-3 text-xs text-slate-400 font-mono">
                <span className="bg-white/5 px-2 py-1 rounded">Source: sih_live_f3vxzpa</span>
                <span className="bg-white/5 px-2 py-1 rounded text-rose-400">AI Probability: 89%</span>
              </div>
            </div>
            
            <div className="text-right border-l border-white/10 pl-5">
              <div className="text-3xl font-bold text-rose-500">70%</div>
              <div className="text-xs text-slate-400 uppercase tracking-wider mt-1">Rolling Risk Score</div>
            </div>
          </div>

          {/* Action Protocols */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 border-t border-white/10 pt-5">
            <button className="flex items-center justify-center gap-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 transition-colors px-4 py-3 rounded-lg text-sm font-semibold border border-rose-500/20">
              <ShieldBan size={16} />
              Block IP & Terminate Session
            </button>
            <button className="flex items-center justify-center gap-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 transition-colors px-4 py-3 rounded-lg text-sm font-semibold border border-amber-500/20">
              <FileAudio size={16} />
              Force Live Video Auth
            </button>
            <button className="flex items-center justify-center gap-2 bg-slate-500/20 hover:bg-slate-500/30 text-slate-300 transition-colors px-4 py-3 rounded-lg text-sm font-semibold border border-slate-500/20">
              <CheckCircle size={16} />
              Mark as False Positive
            </button>
          </div>
        </div>
      </div>

      {/* DASHBOARD CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* Card 1 */}
        <div className="relative overflow-hidden rounded-2xl border border-white/[0.1] bg-white/[0.02] p-6 backdrop-blur-xl">
          <div className="absolute top-0 right-0 p-4 opacity-20">
            <Users size={64} />
          </div>
          <h3 className="text-lg font-bold text-white mb-1">User Management</h3>
          <p className="text-xs text-slate-400 mb-6 font-mono">Manage active analysts</p>
          <button className="text-xs font-semibold bg-white/10 hover:bg-white/20 transition-colors px-4 py-2 rounded-lg text-white">
            View Users
          </button>
        </div>

        {/* Card 2 */}
        <div className="relative overflow-hidden rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-6 backdrop-blur-xl">
          <div className="absolute top-0 right-0 p-4 opacity-20 text-cyan-400">
            <Settings size={64} />
          </div>
          <h3 className="text-lg font-bold text-white mb-1">System Rules</h3>
          <p className="text-xs text-slate-400 mb-6 font-mono">Configure risk thresholds</p>
          <button className="text-xs font-semibold bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 transition-colors px-4 py-2 rounded-lg">
            Edit Rules
          </button>
        </div>

        {/* Card 3 */}
        <div className="relative overflow-hidden rounded-2xl border border-white/[0.1] bg-white/[0.02] p-6 backdrop-blur-xl">
          <div className="absolute top-0 right-0 p-4 opacity-20">
            <Activity size={64} />
          </div>
          <h3 className="text-lg font-bold text-white mb-1">Audit Logs</h3>
          <p className="text-xs text-slate-400 mb-6 font-mono">View system activity</p>
          <button className="text-xs font-semibold bg-white/10 hover:bg-white/20 transition-colors px-4 py-2 rounded-lg text-white">
            Export Logs
          </button>
        </div>

      </div>

      {/* SYSTEM STATUS SECTION */}
      <div className="rounded-2xl border border-white/[0.1] bg-[#060711]/50 p-6 backdrop-blur-md">
        <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-widest border-b border-white/10 pb-4">
          Global Risk Threshold Settings
        </h3>
        <div className="space-y-4 max-w-xl">
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-300 font-mono">High Risk Probability Match</span>
            <span className="text-sm text-cyan-400 font-bold bg-cyan-400/10 px-3 py-1 rounded-md">&ge; 85%</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-300 font-mono">Medium Risk Probability Match</span>
            <span className="text-sm text-amber-400 font-bold bg-amber-400/10 px-3 py-1 rounded-md">&ge; 60%</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-300 font-mono">Consecutive Flags for Auto-Kill</span>
            <span className="text-sm text-fuchsia-400 font-bold bg-fuchsia-400/10 px-3 py-1 rounded-md">3 Windows</span>
          </div>
        </div>
      </div>

    </div>
  )
}