import React, { useState, useEffect, useRef } from 'react';

export default function App() {
  const [streams, setStreams] = useState({});
  const [activeStreamId, setActiveStreamId] = useState('call_001');
  const [isConnected, setIsConnected] = useState(false);
  const [windowId, setWindowId] = useState(1);
  const [probability, setProbability] = useState(0.85);
  const [speechDetected, setSpeechDetected] = useState(true);
  const wsRef = useRef(null);

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:8000/ws');
    wsRef.current = ws;

    ws.onopen = () => setIsConnected(true);
    ws.onclose = () => setIsConnected(false);
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.stream_id) {
        setStreams((prev) => ({
          ...prev,
          [data.stream_id]: data,
        }));
      }
    };

    return () => {
      ws.close();
    };
  }, []);

  const sendPrediction = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const payload = {
        schema_version: '1.0',
        stream_id: activeStreamId,
        window_id: windowId,
        timestamp: Date.now() / 1000,
        speech_detected: speechDetected,
        ai_probability: speechDetected ? Number(probability) : null,
        model_version: 'xgb_v1'
      };
      wsRef.current.send(JSON.stringify(payload));
      setWindowId((prev) => prev + 1);
    }
  };

  const currentResult = streams[activeStreamId] || {
    stream_id: activeStreamId,
    rolling_score: 0.0,
    consecutive_flags: 0,
    risk_level: 'LOW',
    alert_triggered: false,
    alert_reason: null,
    speech_detected: true,
    ai_probability: 0.0,
    model_version: 'xgb_v1'
  };

  const getRiskBadgeColor = (level) => {
    if (level === 'HIGH') return 'bg-rose-600 text-white animate-pulse';
    if (level === 'MEDIUM') return 'bg-amber-500 text-slate-950';
    return 'bg-emerald-600 text-white';
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 font-sans">
      <header className="flex justify-between items-center mb-8 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-indigo-400">Verivox Live Telemetry Dashboard</h1>
          <p className="text-sm text-slate-400">Sprint 3A & 3B Real-Time Multilingual Voice Cloning Detection</p>
        </div>
        <div className="flex items-center gap-3 bg-slate-900 px-4 py-2 rounded-full border border-slate-800">
          <span className={`w-3 h-3 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
          <span className="text-sm font-medium">{isConnected ? 'WebSocket Connected' : 'Disconnected'}</span>
        </div>
      </header>

      {currentResult.alert_triggered && (
        <div className="mb-6 p-4 bg-rose-950/80 border border-rose-700 rounded-xl flex items-center justify-between shadow-2xl backdrop-blur">
          <div>
            <h2 className="font-bold text-rose-200 text-lg flex items-center gap-2">
              🚨 SECURITY ALERT ESCALATED
            </h2>
            <p className="text-sm text-rose-300 mt-1">Trigger Reason: {currentResult.alert_reason}</p>
          </div>
          <span className="text-xs uppercase bg-rose-700 px-3 py-1.5 rounded-lg text-white font-bold tracking-wider">
            High Risk Active
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl flex flex-col justify-between">
          <div>
            <h3 className="text-slate-300 text-sm font-semibold uppercase tracking-wider mb-3">Stream Isolation Selector</h3>
            <div className="flex gap-2 mb-6">
              {['call_001', 'call_002', 'call_003'].map((id) => (
                <button
                  key={id}
                  onClick={() => setActiveStreamId(id)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition ${
                    activeStreamId === id 
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' 
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                  }`}
                >
                  {id}
                </button>
              ))}
            </div>

            <h3 className="text-slate-300 text-sm font-semibold uppercase tracking-wider mb-3">Simulation Controls</h3>
            <div className="space-y-4 bg-slate-950 p-4 rounded-xl border border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-300">Speech Activity (VAD)</span>
                <input
                  type="checkbox"
                  checked={speechDetected}
                  onChange={(e) => setSpeechDetected(e.target.checked)}
                  className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>Window AI Probability</span>
                  <span className="font-mono font-bold text-indigo-400">{speechDetected ? probability : 'N/A (Silence)'}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  disabled={!speechDetected}
                  value={probability}
                  onChange={(e) => setProbability(e.target.value)}
                  className="w-full accent-indigo-500 disabled:opacity-30 cursor-pointer"
                />
              </div>
            </div>
          </div>

          <div className="mt-6">
            <button
              onClick={sendPrediction}
              className="w-full bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white font-bold py-3 rounded-xl shadow-lg shadow-emerald-600/20 transition"
            >
              Simulate 1-Sec Audio Window
            </button>
          </div>
        </div>

        <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl lg:col-span-2 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-200">Live Telemetry Feed</h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">Target Stream: {activeStreamId}</p>
              </div>
              <span className={`px-4 py-1.5 rounded-full text-xs font-black tracking-widest ${getRiskBadgeColor(currentResult.risk_level)}`}>
                {currentResult.risk_level || 'LOW'} RISK
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                <span className="text-xs text-slate-400 block mb-1">Rolling Risk Score</span>
                <span className="text-2xl font-black font-mono text-indigo-400">
                  {Number(currentResult.rolling_score || 0).toFixed(3)}
                </span>
              </div>
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                <span className="text-xs text-slate-400 block mb-1">Consecutive Flags</span>
                <span className="text-2xl font-black font-mono text-amber-400">
                  {currentResult.consecutive_flags || 0}
                </span>
              </div>
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                <span className="text-xs text-slate-400 block mb-1">VAD Status</span>
                <span className={`text-sm font-bold font-mono px-2 py-1 rounded inline-block ${currentResult.speech_detected !== false ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-slate-900 text-slate-500'}`}>
                  {currentResult.speech_detected !== false ? 'SPEECH ACTIVE' : 'SILENCE'}
                </span>
              </div>
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                <span className="text-xs text-slate-400 block mb-1">Window Prob (v1)</span>
                <span className="text-2xl font-black font-mono text-slate-200">
                  {currentResult.ai_probability !== null && currentResult.ai_probability !== undefined 
                    ? Number(currentResult.ai_probability).toFixed(2) 
                    : '---'}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex justify-between items-center text-xs text-slate-400 font-mono">
            <span>Last Window ID: {currentResult.window_id ?? 'None'}</span>
            <span>Classifier Model: {currentResult.model_version || 'xgb_v1'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}