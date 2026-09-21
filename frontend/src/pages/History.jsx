import { formatProbability, formatScore } from '../utils/helpers'
import StatusPill from '../components/StatusPill'

export default function History({ streams, activeStreamId, setActiveStreamId, currentHistory }) {
  return (
    <section className="max-w-6xl space-y-6">
      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-cyan-400 font-mono">
          Activity Log
        </p>
        <h1 className="text-3xl font-black tracking-tight text-white">
          Recent Window Telemetry
        </h1>
        <p className="mt-3 text-sm text-slate-400">
          Backend RiskResult windows for{' '}
          <span className="text-cyan-400 font-mono">{activeStreamId}</span>
        </p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {Object.keys(streams).map((id) => (
          <button
            key={id}
            onClick={() => setActiveStreamId(id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold font-mono border ${
              activeStreamId === id
                ? 'bg-cyan-400 text-slate-950 border-cyan-400'
                : 'bg-[#0c1017] border-slate-800 text-slate-300'
            }`}
          >
            {streams[id].name || id}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-[#0c1017]/90 shadow-xl">
        <div className="hidden grid-cols-[100px_1fr_1fr_100px_100px] gap-4 border-b border-slate-800 px-5 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 md:grid font-mono">
          <span>Window</span>
          <span>Timestamp</span>
          <span>VAD / Probability</span>
          <span>Rolling</span>
          <span>Risk</span>
        </div>

        {currentHistory.length === 0 ? (
          <p className="p-5 text-xs text-slate-500 font-mono">
            No backend telemetry windows recorded yet.
          </p>
        ) : (
          currentHistory.map((item, index) => (
            <div
              key={`${item.window_id}-${index}`}
              className="grid gap-3 border-b border-slate-800/80 px-5 py-4 last:border-0 md:grid-cols-[100px_1fr_1fr_100px_100px] md:items-center md:gap-4 hover:bg-[#121824]/40 transition text-xs font-mono"
            >
              <span className="text-cyan-400 font-bold">
                Win #{item.window_id}
              </span>
              <span className="text-slate-400">{item.timestamp}</span>
              <span className="text-slate-300">
                {item.speech_detected
                  ? `Prob: ${formatProbability(item.ai_probability)}`
                  : 'Silence'}
              </span>
              <span className="text-slate-200">
                {formatScore(item.rolling_score)}
              </span>
              <span>
                <StatusPill status={item.risk_level} />
              </span>
            </div>
          ))
        )}
      </div>
    </section>
  )
}