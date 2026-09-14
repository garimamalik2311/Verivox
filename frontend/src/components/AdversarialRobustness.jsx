import React, { useState } from 'react'
import { AlertCircle, ArrowDownRight, ArrowUpRight, ShieldAlert, Sparkles, Volume2 } from 'lucide-react'
import { adversarialStats, chartSeries, flippedPredictions } from '../data/adversarialData'

export default function AdversarialRobustness() {
  const [activeTooltip, setActiveTooltip] = useState(null)
  const [filterType, setFilterType] = useState('all')

  const width = 640
  const height = 250
  const padding = { top: 25, right: 30, bottom: 40, left: 45 }

  // Y axis scale: 0.0 to 1.0
  const getY = (val) => height - padding.bottom - (val / 1.0) * (height - padding.top - padding.bottom)
  // X axis scale: 0, 1, 2, 3, 4
  const getX = (idx) => padding.left + (idx / 4) * (width - padding.left - padding.right)

  const filteredFlipped = flippedPredictions.filter((item) => {
    if (filterType === 'all') return true
    if (filterType === 'evasion') return item.type === 'evasion'
    if (filterType === 'false_alarm') return item.type === 'false_alarm'
    return true
  })

  return (
    <div className="space-y-6 max-w-5xl mx-auto text-slate-100">
      {/* Header matching user picture */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Adversarial robustness</h1>
          <p className="text-xs text-slate-400 mt-1">How detection holds up under noise, compression, and pitch attacks</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-950/60 text-rose-400 border border-rose-500/30">
            <span className="size-1.5 rounded-full bg-rose-500 animate-pulse" />
            2 evasion paths found
          </span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <p className="text-xs text-slate-400">Tests run</p>
          <p className="text-3xl font-extrabold text-white mt-1 font-mono">{adversarialStats.totalTests}</p>
        </div>
        <div>
          <p className="text-xs text-slate-400">Predictions flipped</p>
          <p className="text-3xl font-extrabold text-white mt-1 font-mono">{adversarialStats.predictionsFlipped}</p>
        </div>
        <div>
          <p className="text-xs text-slate-400">Weakest attack</p>
          <p className="text-3xl font-extrabold text-white mt-1 font-mono">{adversarialStats.weakestAttack}</p>
        </div>
      </div>

      {/* Line Chart Section */}
      <div className="rounded-2xl border border-slate-800 bg-[#0d1117] p-5">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-sm font-semibold text-white">AI probability vs attack intensity</h2>
          <span className="text-[11px] text-slate-400 font-mono">XGBoost 58-D Response Curves</span>
        </div>

        <div className="relative w-full">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible select-none">
            {/* Grid lines & Y axis ticks */}
            {[1.0, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1, 0].map((val) => {
              const y = getY(val)
              return (
                <g key={val}>
                  <line
                    x1={padding.left}
                    y1={y}
                    x2={width - padding.right}
                    y2={y}
                    stroke="#1e293b"
                    strokeWidth={val === 0.5 ? 1.5 : 0.7}
                    strokeDasharray={val === 0.5 ? '4 4' : undefined}
                  />
                  <text x={padding.left - 8} y={y + 3.5} fill="#64748b" fontSize="10" textAnchor="end" className="font-mono">
                    {val.toFixed(1)}
                  </text>
                </g>
              )
            })}

            {/* Decision Threshold Line */}
            <text x={width - padding.right} y={getY(0.5) - 4} fill="#f43f5e" fontSize="9" textAnchor="end" className="font-mono opacity-60">
              Threshold 0.50
            </text>

            {/* X axis ticks */}
            {chartSeries.xLabels.map((lbl, idx) => {
              const x = getX(idx)
              return (
                <g key={idx}>
                  <line x1={x} y1={height - padding.bottom} x2={x} y2={height - padding.bottom + 4} stroke="#475569" strokeWidth="1" />
                  <text x={x} y={height - padding.bottom + 18} fill="#94a3b8" fontSize="11" textAnchor="middle" className="font-mono">
                    {lbl}
                  </text>
                </g>
              )
            })}

            {/* Plot Lines */}
            {chartSeries.attacks.map((series) => {
              const validPoints = series.points
                .map((pt, idx) => (pt !== null ? { x: getX(idx), y: getY(pt), val: pt, stepIdx: idx } : null))
                .filter(Boolean)

              const pathData = validPoints.reduce((acc, curr, idx) => {
                return idx === 0 ? `M ${curr.x} ${curr.y}` : `${acc} L ${curr.x} ${curr.y}`
              }, '')

              return (
                <g key={series.id}>
                  <path
                    d={pathData}
                    fill="none"
                    stroke={series.color}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="transition-opacity duration-200"
                    opacity={activeTooltip && activeTooltip.id !== series.id ? 0.35 : 1}
                  />
                  {validPoints.map((pt, idx) => (
                    <circle
                      key={idx}
                      cx={pt.x}
                      cy={pt.y}
                      r="4"
                      fill={series.color}
                      stroke="#0d1117"
                      strokeWidth="1.5"
                      className="cursor-pointer transition-transform hover:scale-150"
                      onMouseEnter={() =>
                        setActiveTooltip({
                          id: series.id,
                          name: series.name,
                          color: series.color,
                          val: pt.val,
                          param: series.stepLabels[pt.stepIdx],
                          sample: series.sample,
                          x: pt.x,
                          y: pt.y,
                        })
                      }
                      onMouseLeave={() => setActiveTooltip(null)}
                    />
                  ))}
                </g>
              )
            })}
          </svg>

          {/* Interactive Tooltip */}
          {activeTooltip && (
            <div
              className="absolute z-20 pointer-events-none -translate-x-1/2 -translate-y-full bg-slate-900/95 border border-slate-700 px-3 py-1.5 rounded-lg shadow-xl text-xs font-mono"
              style={{
                left: `${(activeTooltip.x / width) * 100}%`,
                top: `${(activeTooltip.y / height) * 100 - 8}%`,
              }}
            >
              <div className="flex items-center gap-1.5 font-bold" style={{ color: activeTooltip.color }}>
                <span>{activeTooltip.name}</span> &bull; <span>{activeTooltip.param}</span>
              </div>
              <div className="text-white text-[11px] mt-0.5">Prob: {activeTooltip.val.toFixed(3)}</div>
              <div className="text-slate-400 text-[9px]">{activeTooltip.sample}</div>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-6 mt-4 pt-4 border-t border-slate-800/80 text-xs">
          {chartSeries.attacks.map((series) => (
            <div key={series.id} className="flex items-center gap-2">
              <span className="size-2.5 rounded-full" style={{ backgroundColor: series.color }} />
              <span className="text-slate-300 font-medium">{series.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Flipped Predictions Table */}
      <div className="rounded-2xl border border-slate-800 bg-[#0d1117] p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
          <div>
            <h2 className="text-sm font-semibold text-white">Flipped predictions</h2>
            <p className="text-xs text-slate-400">Instances where the classifier verdict crossed the 0.50 boundary</p>
          </div>
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 text-[11px] font-mono">
            <button
              onClick={() => setFilterType('all')}
              className={`px-2.5 py-1 rounded ${filterType === 'all' ? 'bg-slate-700 text-white font-bold' : 'text-slate-400'}`}
            >
              All ({flippedPredictions.length})
            </button>
            <button
              onClick={() => setFilterType('evasion')}
              className={`px-2.5 py-1 rounded ${filterType === 'evasion' ? 'bg-rose-950/80 text-rose-300 font-bold' : 'text-slate-400'}`}
            >
              AI Evasions (7)
            </button>
            <button
              onClick={() => setFilterType('false_alarm')}
              className={`px-2.5 py-1 rounded ${filterType === 'false_alarm' ? 'bg-amber-950/80 text-amber-300 font-bold' : 'text-slate-400'}`}
            >
              False Alarms (6)
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-[11px]">
                <th className="pb-3 font-semibold">File</th>
                <th className="pb-3 font-semibold">Attack</th>
                <th className="pb-3 font-semibold text-right pr-4">Before</th>
                <th className="pb-3 font-semibold text-right">After</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredFlipped.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-800/30 transition">
                  <td className="py-3 text-slate-300 font-bold">
                    {row.file} <span className="text-[10px] text-slate-500 font-normal">({row.label})</span>
                  </td>
                  <td className="py-3 text-slate-300">{row.attack}</td>
                  <td className="py-3 text-right pr-4 text-slate-400">{row.before.toFixed(2)}</td>
                  <td className="py-3 text-right">
                    <span className={row.type === 'evasion' ? 'text-rose-400 font-bold' : row.type === 'false_alarm' ? 'text-amber-400 font-bold' : 'text-emerald-400'}>
                      {row.after.toFixed(2)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Headline Callout Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-rose-900/40 bg-rose-950/10 p-4">
          <div className="flex items-center gap-2 text-rose-400 font-bold text-xs">
            <ShieldAlert size={16} /> 1. Opus Codec Vulnerability (Phone / VoIP)
          </div>
          <p className="mt-2 text-xs text-slate-300 leading-relaxed">
            Opus compression completely shatters detection. A confident AI voice (<strong className="text-white">0.850 HIGH</strong>) drops to <strong className="text-rose-300">LOW risk</strong> across all tested bitrates (64kbps down to 8kbps). No custom attack is needed—standard cellular or WhatsApp audio compression evades the detector.
          </p>
        </div>

        <div className="rounded-xl border border-amber-900/40 bg-amber-950/10 p-4">
          <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
            <AlertCircle size={16} /> 2. Pitch Shifting Evasion (-2 Semitones)
          </div>
          <p className="mt-2 text-xs text-slate-300 leading-relaxed">
            Shifting a cloned voice by just -2 semitones (barely discernible to the human ear) shifts spectral centroids and fundamental pitch harmonic distributions, dropping probability from <strong className="text-white">0.850 to 0.243</strong>.
          </p>
        </div>

        <div className="rounded-xl border border-indigo-900/40 bg-indigo-950/10 p-4">
          <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs">
            <Volume2 size={16} /> 3. Pink Noise vs White Noise Disruption
          </div>
          <p className="mt-2 text-xs text-slate-300 leading-relaxed">
            Pink noise is disproportionately disruptive compared to white noise. Because pink noise energy falls off at 1/f (matching human speech power spectral density), it directly corrupts MFCC and chroma bands, triggering false positives at moderate noise levels.
          </p>
        </div>

        <div className="rounded-xl border border-emerald-900/40 bg-emerald-950/10 p-4">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
            <Sparkles size={16} /> 4. Human Voice Resilience
          </div>
          <p className="mt-2 text-xs text-slate-300 leading-relaxed">
            Real human voices remained consistently under the 0.50 threshold across MP3 compression, pitch shifting, and time stretching. The system is robust against false accusations; its fragility is focused on false negatives under codec compression.
          </p>
        </div>
      </div>
    </div>
  )
}