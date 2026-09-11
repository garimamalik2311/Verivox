import { useState, useEffect, useCallback, useRef } from 'react';

export function useRiskWebSocket(url) {
  const [streams, setStreams] = useState({});
  const [activeStreamId, setActiveStreamId] = useState('call_001');
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef(null);

  useEffect(() => {
    const ws = new WebSocket(url);
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
  }, [url]);

  const sendPrediction = useCallback((prediction) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(prediction));
    }
  }, []);

  return { streams, activeStreamId, setActiveStreamId, isConnected, sendPrediction };
}