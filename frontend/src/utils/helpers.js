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
  const prosody = selected.prosody || {}

  return {
    prosody: {
      pitch_mean_hz: prosody.pitch_mean_hz ?? null,
      pitch_std_hz: prosody.pitch_std_hz ?? null,
      pitch_variance_percent: prosody.pitch_variance_percent ?? null,
      timing_variance: prosody.timing_variance ?? null,
      flat_prosody: prosody.flat_prosody ?? null,
      spoof_probability: prosody.spoof_probability ?? null,
      signal: prosody.signal ?? "UNAVAILABLE",
      model_version: prosody.model_version ?? null,
    },
    speaker_verification: {
      match_score: selected.speaker_similarity ?? null,
      match: selected.speaker_match ?? null,
    },
    vocoder_fingerprint: {
      flagged: selected.vocoder_flag ?? false,
      diagnostic_cues: Array.isArray(selected.diagnostic_cues)
        ? selected.diagnostic_cues
        : [],
    },
    feature_latency_ms: selected.latency_ms ?? null,

    shap_features: Array.isArray(selected.shap_features) ? selected.shap_features : [],
    shap_top_features: Array.isArray(selected.shap_top_features) ? selected.shap_top_features : [],

    shap_features: Array.isArray(selected.shap_features)
      ? selected.shap_features
      : [],
    shap_top_features: Array.isArray(selected.shap_top_features)
      ? selected.shap_top_features
      : [],


    // --- Added for Dual-Stream Trilingual Acoustic Fusion ---
    dual_stream: {
      probability: selected.dual_stream_probability ?? null,
      risk: selected.dual_stream_risk ?? null,
      alpha: selected.modality_gate_alpha ?? 0.64,
      latency_ms: selected.dual_stream_latency_ms ?? null,
      languages: selected.target_languages ?? ['en', 'hi', 'ta']
    }
  }
}