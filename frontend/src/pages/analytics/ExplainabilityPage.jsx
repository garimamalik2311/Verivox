import { GitBranch, CheckCircle2 } from 'lucide-react'
import StatusPill from '../../components/StatusPill'
import { formatProbability, formatScore } from '../../utils/helpers'

export default function ExplainabilityPage({ analytics, selected }) {
  const topFeatureOrder = Array.isArray(selected.shap_top_features) ? selected.shap_top_features.map(Number) : []
  const shapFeatures = (Array.isArray(analytics.shap_features) ? analytics.shap_features : [])
    .map((feature, index) => {
      const value = Number(feature?.value)
      const absValue = Number(feature?.abs_value)
      return {
        ...feature,
        name: feature?.name || `Feature ${feature?.index ?? index}`,
        value,
        absValue: Number.isFinite(absValue) ? Math.abs(absValue) : Math.abs(value),
      }
    })
    .filter((f) => Number.isFinite(f.value))
    .sort((a, b) => b.absValue - a.absValue)
    .slice(0, 5)

  const maxContribution = Math.max(...shapFeatures.map((f) => f.absValue), 1)
  const cues = Array.isArray(selected.diagnostic_cues) ? selected.diagnostic_cues : []

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-emerald-400 font-mono">Module 04</p>
        <h1 className="text-3xl font-black text-white mt-1">Explainability & Audit Trail</h1>
        <p className="text-sm text-slate-400 mt-2">
          Transparent SHAP (Shapley Additive exPlanations) breakdown showing why the model produced this window assessment.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-xl border border-slate-800 bg-[#0c1017] p-4">
          <p className="text-[10px] uppercase font-mono text-slate-500">AI Probability</p>
          <p className="text-3xl font-black font-mono text-white mt-2">{formatProbability(selected.ai_probability, 1)}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-[#0c1017] p-4">
          <p className="text-[10px] uppercase font-mono text-slate-500">Backend Risk Level</p>
          <div className="mt-2"><StatusPill status={selected.risk_level || 'CLEAR'} /></div>
        </div>
      </div>

      {/* SHAP Contributions */}
      <div className="rounded-2xl border border-slate-800 bg-[#0c1017] p-6 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <GitBranch size={16} className="text-emerald-400" /> Model Evidence · SHAP Contributions
        </h3>
        <p className="text-xs text-slate-400 font-mono">Negative values move away from synthetic speech; positive values move toward it.</p>

        {shapFeatures.length === 0 ? (
          <p className="text-xs text-slate-500 font-mono py-4">SHAP explanation not available for this window.</p>
        ) : (
          <div className="space-y-3 pt-2">
            {shapFeatures.map((feature, i) => {
              const width = `${Math.max(Math.round((feature.absValue / maxContribution) * 100), 4)}%`
              const isPositive = feature.value >= 0
              return (
                <div key={i} className="grid grid-cols-[120px_1fr_60px] items-center gap-3 text-xs font-mono">
                  <span className="text-slate-300 truncate">{feature.name}</span>
                  <div className="grid grid-cols-2 items-center gap-1">
                    <div className="flex justify-end border-r border-slate-700 pr-1">
                      {!isPositive && <div className="h-4 rounded-l bg-cyan-400" style={{ width }} />}
                    </div>
                    <div className="flex justify-start pl-1">
                      {isPositive && <div className="h-4 rounded-r bg-rose-400" style={{ width }} />}
                    </div>
                  </div>
                  <span className={`text-right ${isPositive ? 'text-rose-300' : 'text-cyan-300'}`}>
                    {feature.value > 0 ? '+' : ''}{formatScore(feature.value, 2)}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Signals Detected */}
      <div className="rounded-2xl border border-slate-800 bg-[#0c1017] p-6 space-y-3">
        <p className="text-xs font-bold uppercase font-mono text-slate-400">Signals Detected</p>
        {cues.length > 0 ? (
          cues.map((cue, idx) => (
            <div key={idx} className="flex items-center gap-2 text-xs text-slate-300">
              <CheckCircle2 size={14} className="text-emerald-400" />
              <span>{String(cue).replaceAll('_', ' ')}</span>
            </div>
          ))
        ) : (
          <p className="text-xs text-slate-500 font-mono">No diagnostic signals reported for this window.</p>
        )}
      </div>

      {/* Stats footer */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-xl border border-slate-800 bg-[#0c1017] p-4 font-mono text-xs">
        <div><span className="text-slate-500 block text-[10px]">WINDOW</span><span className="text-white font-bold">{selected.window_id ?? '--'}</span></div>
        <div><span className="text-slate-500 block text-[10px]">MODEL</span><span className="text-cyan-300 font-bold">{selected.model_version || '--'}</span></div>
        <div><span className="text-slate-500 block text-[10px]">CONFIRMATIONS</span><span className="text-white font-bold">{selected.consecutive_flags ?? '--'}</span></div>
        <div><span className="text-slate-500 block text-[10px]">LATENCY</span><span className="text-emerald-300 font-bold">{analytics.feature_latency_ms != null ? `${analytics.feature_latency_ms} ms` : '--'}</span></div>
      </div>
    </div>
  )
}