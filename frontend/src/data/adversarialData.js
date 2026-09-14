// 92-Test Adversarial Robustness Dataset for VeriVox
export const adversarialStats = {
  totalTests: 92,
  predictionsFlipped: 19,
  weakestAttack: 'Opus',
  evasionPaths: 2,
};

// Points matching the "AI probability vs attack intensity" curves from benchmark
export const chartSeries = {
  xLabels: ['0 (clean)', '1', '2', '3', '4'],
  attacks: [
    {
      id: 'opus',
      name: 'Opus',
      color: '#f97316', // Orange
      sample: 'fake_1 (AI Voice)',
      points: [0.850, 0.360, 0.388, 0.362, 0.338],
      stepLabels: ['Clean', '64 kbps', '32 kbps', '16 kbps', '8 kbps'],
      description: 'Precipitous drop from 0.85 to <0.37 across all phone bitrates.',
    },
    {
      id: 'pink_noise',
      name: 'Pink noise',
      color: '#ec4899', // Pink
      sample: 'real_1 (Human Voice)',
      points: [0.209, 0.300, 0.861, 0.865, 0.850],
      stepLabels: ['Clean', '20 dB', '10 dB', '5 dB', '0 dB'],
      description: 'Corrupts spectral bands, causing false-positive flip at moderate noise.',
    },
    {
      id: 'white_noise',
      name: 'White noise',
      color: '#38bdf8', // Blue
      sample: 'real_1 (Human Voice)',
      points: [0.209, 0.338, 0.238, 0.294, 0.155],
      stepLabels: ['Clean', '20 dB', '10 dB', '5 dB', '0 dB'],
      description: 'Uniform spectral distribution causes minimal directional disruption.',
    },
    {
      id: 'mp3',
      name: 'MP3',
      color: '#84cc16', // Green
      sample: 'real_1 (Human Voice)',
      points: [0.209, 0.159, 0.152, 0.155, null],
      stepLabels: ['Clean', '128 kbps', '64 kbps', '32 kbps', 'N/A'],
      description: 'Retains key acoustic feature geometry without false alarm.',
    },
  ],
};

// All 19 verified prediction flip rows where the detector was deceived
export const flippedPredictions = [
  { file: 'fake_1', label: 'AI Voice', attack: 'Opus 16kbps', before: 0.85, after: 0.36, type: 'evasion', severity: 'HIGH' },
  { file: 'fake_1', label: 'AI Voice', attack: 'Pitch -2 semitones', before: 0.85, after: 0.25, type: 'evasion', severity: 'HIGH' },
  { file: 'fake_1', label: 'AI Voice', attack: 'Opus 8kbps', before: 0.85, after: 0.34, type: 'evasion', severity: 'HIGH' },
  { file: 'fake_1', label: 'AI Voice', attack: 'Opus 64kbps', before: 0.85, after: 0.36, type: 'evasion', severity: 'HIGH' },
  { file: 'fake_1', label: 'AI Voice', attack: 'Opus 32kbps', before: 0.85, after: 0.39, type: 'evasion', severity: 'HIGH' },
  { file: 'fake_1', label: 'AI Voice', attack: 'Pitch -1 semitone', before: 0.85, after: 0.35, type: 'evasion', severity: 'HIGH' },
  { file: 'fake_1', label: 'AI Voice', attack: 'White noise 0dB', before: 0.85, after: 0.49, type: 'evasion', severity: 'MEDIUM' },
  { file: 'real_2', label: 'Human Voice', attack: 'Pink noise 10dB', before: 0.13, after: 0.72, type: 'false_alarm', severity: 'HIGH' },
  { file: 'real_2', label: 'Human Voice', attack: 'Pink noise 5dB', before: 0.13, after: 0.83, type: 'false_alarm', severity: 'HIGH' },
  { file: 'real_2', label: 'Human Voice', attack: 'Pink noise 0dB', before: 0.13, after: 0.80, type: 'false_alarm', severity: 'HIGH' },
  { file: 'real_1', label: 'Human Voice', attack: 'Pink noise 10dB', before: 0.21, after: 0.86, type: 'false_alarm', severity: 'HIGH' },
  { file: 'real_1', label: 'Human Voice', attack: 'Pink noise 5dB', before: 0.21, after: 0.86, type: 'false_alarm', severity: 'HIGH' },
  { file: 'real_1', label: 'Human Voice', attack: 'Pink noise 0dB', before: 0.21, after: 0.85, type: 'false_alarm', severity: 'HIGH' },
  { file: 'fake_2', label: 'AI Voice', attack: 'Pink noise 10dB', before: 0.38, after: 0.87, type: 'detection_boost', severity: 'LOW' },
  { file: 'fake_2', label: 'AI Voice', attack: 'Pink noise 5dB', before: 0.38, after: 0.88, type: 'detection_boost', severity: 'LOW' },
  { file: 'fake_2', label: 'AI Voice', attack: 'Pink noise 0dB', before: 0.38, after: 0.85, type: 'detection_boost', severity: 'LOW' },
  { file: 'fake_2', label: 'AI Voice', attack: 'White noise 5dB', before: 0.38, after: 0.63, type: 'detection_boost', severity: 'LOW' },
  { file: 'fake_2', label: 'AI Voice', attack: 'White noise 0dB', before: 0.38, after: 0.61, type: 'detection_boost', severity: 'LOW' },
  { file: 'fake_2', label: 'AI Voice', attack: 'White noise 20dB', before: 0.38, after: 0.57, type: 'detection_boost', severity: 'LOW' },
];

// Fixed demo samples for the live telemetry panel
export const demoSamples = [
  {
    id: 'clean',
    name: 'Clean — expected 0.85 (high)',
    file: '/demo_audio/clean.wav',
    expectedProb: 0.85,
    expectedRisk: 'HIGH',
    description: 'Baseline AI-cloned voice detected with high confidence.',
  },
  {
    id: 'opus_16k',
    name: 'Opus compressed 16kbps — expected 0.36 (low)',
    file: '/demo_audio/opus_compressed_16kbps.wav',
    expectedProb: 0.362,
    expectedRisk: 'LOW',
    description: 'Standard VoIP/WhatsApp compression masks vocoder artifacts, evading detection.',
  },
  {
    id: 'pink_10db',
    name: 'Pink noise 10dB — expected 0.88 (high)',
    file: '/demo_audio/pink_noise_10db.wav',
    expectedProb: 0.882,
    expectedRisk: 'HIGH',
    description: '10dB SNR pink noise preserves high-probability synthetic classification.',
  },
  {
    id: 'pitch_minus2',
    name: 'Pitch shifted -2 semitones — expected 0.24 (low)',
    file: '/demo_audio/pitch_shifted_minus2.wav',
    expectedProb: 0.243,
    expectedRisk: 'LOW',
    description: 'Barely-audible pitch shift shifts fundamental harmonics, dropping score to safe.',
  },
];