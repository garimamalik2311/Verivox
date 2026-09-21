import React from 'react'
import { Play, Pause, Volume2 } from 'lucide-react'

/**
 * AudioPlaybackBar
 *
 * Sprint 1 (Garima) — reusable, "dumb" playback control: a play/pause
 * button + a live level meter. It holds no audio logic itself — the
 * parent component owns the actual AudioContext/gain nodes and just
 * passes state down. This keeps it reusable for both:
 *   - SimulationTelemetry.jsx (playing back a demo WAV while streaming it)
 *   - App.jsx (live mic monitor toggle)
 *
 * Props:
 *   label      - text shown next to the icon, e.g. "Live Mic Monitor"
 *   isPlaying  - bool, whether audio is currently audible
 *   level      - 0-100, drives the meter bar width
 *   onToggle   - () => void, called when the play/pause button is clicked
 *   disabled   - bool, disables the toggle button
 */
export default function AudioPlaybackBar({
  label = 'Playback',
  isPlaying = false,
  level = 0,
  onToggle,
  disabled = false,
}) {
  const clampedLevel = Math.max(0, Math.min(100, Number(level) || 0))

  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-[#121824]/80 px-4 py-3">
      <button
        onClick={onToggle}
        disabled={disabled}
        className={`flex size-8 shrink-0 items-center justify-center rounded-full transition disabled:opacity-40 disabled:cursor-not-allowed ${
          isPlaying
            ? 'bg-cyan-400 text-slate-950'
            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
        }`}
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-400">
          <Volume2 size={12} className={isPlaying ? 'text-cyan-400' : 'text-slate-500'} />
          {label}
        </div>

        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
          <div
            className={`h-full rounded-full transition-all duration-100 ${
              isPlaying ? 'bg-cyan-400' : 'bg-slate-700'
            }`}
            style={{ width: `${clampedLevel}%` }}
          />
        </div>
      </div>
    </div>
  )
}
