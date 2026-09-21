import { formatProbability, formatScore } from '../utils/helpers'
import StatusPill from './StatusPill'

export default function LiveGraph({ timeSeries = [], inputMode, selected, activeStreamId }) {
  const points = timeSeries.length > 0 ? timeSeries : [{ time: 'Waiting', prob: 0 }]
  const width = 600
  const height = 240
  const padding = 30
  const maxProb = 100

  const coords = points.map((point, index) => {
    const x = padding + (index / Math.max(points.length - 1, 1)) * (width - padding * 2)
    const probability = Number(point.prob) || 0
    const y = height - padding - (probability / maxProb) * (height - padding * 2)
    return { x, y, ...point }
  })

  const pathString = coords.reduce((acc, curr, index) => index === 0 ? `M ${curr.x} ${curr.y}` : `${acc} L ${curr.x} ${curr.y}`, '')
  const areaString = coords.length > 0
    ? `${pathString} L ${coords[coords.length - 1].x} ${height - padding} L ${coords[0].x} ${height - padding} Z`
    : ''
  const thresholdY = height - padding - (70 / maxProb) * (height - padding * 2)

  return (
    <div className="relative w-full overflow-hidden rounded-2xl bg-[var(--color-verivox-darkest)] border border-[var(--color-verivox-border)] p-4 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2">
        <div>
          <p className="text-sm font-bold text-white">Synthetic Voice Probability</p>
          <p className="text-[10px] text-slate-500 font-mono mt-1">Backend Risk Engine telemetry</p>
        </div>
        <div className="flex items-center gap-3 font-mono text-xs">
          <span className="flex items-center gap-1.5 bg-[var(--color-verivox-cyan)]/10 text-[var(--color-verivox-cyan)] border border-[var(--color-verivox-cyan)]/30 px-2.5 py-1 rounded-full">
            <span className="size-2 rounded-full bg-[var(--color-verivox-cyan)] animate-pulse" />
            {inputMode === 'mic' ? 'LIVE MIC' : 'AUDIO FILE'}
          </span>
          <span className="text-slate-300">{selected.name || activeStreamId}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_240px] gap-4 items-center">
        <div className="relative h-[220px] w-full">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
            <defs>
              <linearGradient id="probGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-verivox-pink)" stopOpacity="0.35" />
                <stop offset="100%" stopColor="var(--color-verivox-pink)" stopOpacity="0" />
              </linearGradient>
            </defs>

            {[0, 25, 50, 75, 100].map((value) => {
              const y = height - padding - (value / maxProb) * (height - padding * 2)
              return (
                <g key={value}>
                  <line x1={padding} y1={y} x2={width - padding} y2={y} stroke="var(--color-verivox-border)" strokeDasharray="3 3" />
                  <text x={padding - 8} y={y + 3} fill="#64748b" fontSize="10" textAnchor="end" className="font-mono">
                    {value}%
                  </text>
                </g>
              )
            })}

            <line x1={padding} y1={thresholdY} x2={width - padding} y2={thresholdY} stroke="var(--color-verivox-cyan)" strokeDasharray="4 4" strokeWidth="1.5" />

            {coords.length > 1 && (
              <>
                <path d={areaString} fill="url(#probGradient)" />
                <path d={pathString} fill="none" stroke="var(--color-verivox-pink)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </>
            )}

            {coords.map((point, index) => {
              const isLast = index === coords.length - 1
              return (
                <g key={index}>
                  <circle cx={point.x} cy={point.y} r={isLast ? 5 : 3} className={isLast ? 'fill-[var(--color-verivox-pink)]' : 'fill-[var(--color-verivox-pink)]/80'} />
                  <circle cx={point.x} cy={point.y} r={isLast ? 4 : 2} className="fill-white" />
                </g>
              )
            })}
          </svg>
          <div className="flex justify-between px-7 text-[10px] font-mono text-slate-500">
            <span>Live</span>
            <span>History</span>
            <span>Window stream</span>
          </div>
        </div>

        <div className="rounded-xl border border-[var(--color-verivox-border)] bg-[var(--color-verivox-dark)] p-4">
          <div className="space-y-4">
            <div>
              <p className="text-[10px] text-slate-400 font-mono">AI Probability</p>
              <p className={`text-3xl font-black font-mono ${selected.ai_probability > 0.7 ? 'text-[var(--color-verivox-pink)]' : 'text-[var(--color-verivox-cyan)]'}`}>
                {formatProbability(selected.ai_probability)}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-mono">Rolling Risk Score</p>
              <p className="text-2xl font-bold font-mono text-[var(--color-verivox-cyan)]">
                {formatScore(selected.rolling_score, 3)}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-mono mb-2">Backend Risk State</p>
              <StatusPill status={selected.risk_level} />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-[var(--color-verivox-border)]">
            <p className="text-xs text-slate-300 font-mono">
              <span className="font-bold text-[var(--color-verivox-cyan)]">{selected.consecutive_flags ?? '--'}</span> current consecutive flags
            </p>
            {selected.alert_triggered && selected.alert_consecutive_flags != null && (
              <p className="mt-2 text-xs text-[var(--color-verivox-pink)]/90 font-mono">
                <span className="font-bold text-[var(--color-verivox-pink)]">{selected.alert_consecutive_flags}</span> consecutive flags at alert
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}