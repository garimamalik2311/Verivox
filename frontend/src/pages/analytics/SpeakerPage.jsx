import { UserCheck } from 'lucide-react'
import StatusPill from '../../components/StatusPill'
import { formatProbability } from '../../utils/helpers'

export default function SpeakerPage({ selected }) {
  const speaker = selected.speaker_verification || {}

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-indigo-400 font-mono">Module 02</p>
        <h1 className="text-3xl font-black text-white mt-1">Speaker Verification & Identity</h1>
        <p className="text-sm text-slate-400 mt-2">
          Performs cross-session biometric matching to ensure the active speaker matches the pre-enrolled profile.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-slate-800 bg-[#0c1017] p-5">
          <p className="text-[10px] uppercase font-mono text-slate-500">Enrolled Speaker Profile</p>
          <p className="text-xl font-bold font-mono text-white mt-2">{speaker.enrolled_speaker ?? 'Default Secure Profile'}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-[#0c1017] p-5">
          <p className="text-[10px] uppercase font-mono text-slate-500">Biometric Match Score</p>
          <p className="text-xl font-bold font-mono text-cyan-300 mt-2">{formatProbability(speaker.match_score)}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-[#0c1017] p-6 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <UserCheck size={16} className="text-indigo-400" /> Identity Guard Mechanics
        </h3>
        <p className="text-xs text-slate-300 leading-relaxed">
          Using deep speaker embedding extractors (e.g., x-vectors/ECAPA-TDNN), VeriVox compares voiceprints against secure enrollment templates. A low match score combined with high AI probability indicates potential identity spoofing or voice cloning attacks.
        </p>
        <div className="border-t border-slate-800 pt-4 flex items-center justify-between text-xs font-mono">
          <span className="text-slate-400">Verification State:</span>
          <StatusPill status={speaker.status || (speaker.match_score > 0.75 ? 'VERIFIED' : 'MISMATCH')} />
        </div>
      </div>
    </div>
  )
}