export const initialStreams = {
  call_001: { stream_id: 'call_001', name: 'Support call' },
  call_002: { stream_id: 'call_002', name: 'Sales call' },
  call_003: { stream_id: 'call_003', name: 'Team meeting' }
}

export const initialHistories = {}

export function formatProbability(value, digits = 0) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '--'
  return `${(Number(value) * 100).toFixed(digits)}%`
}

export function formatScore(value, digits = 3) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '--'
  return Number(value).toFixed(digits)
}

export function getAnalyticsData(selected = {}) {
  return {
    prosody: {
      pitch_variance: selected.prosody_pitch_variance ?? null,
      timing_variance: selected.prosody_timing_variance ?? null,
    },
    speaker_verification: {
      match_score: selected.speaker_similarity ?? null,
      match: selected.speaker_match ?? null,
    },
    vocoder_fingerprint: {
      flagged: selected.vocoder_flag ?? false,
      diagnostic_cues: Array.isArray(selected.diagnostic_cues) ? selected.diagnostic_cues : [],
    },
    feature_latency_ms: selected.latency_ms ?? null,
    shap_features: Array.isArray(selected.shap_features) ? selected.shap_features : [],
    shap_top_features: Array.isArray(selected.shap_top_features) ? selected.shap_top_features : [],
  }
}