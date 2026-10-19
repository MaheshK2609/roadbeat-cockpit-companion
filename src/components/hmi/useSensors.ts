import { useEffect, useState } from "react";
import { EMPTY_READING, parseSensorMessage, type ConnectionStatus, type DataMode, type SensorReading } from "./sensorProtocol";

export function useSensors() {
  const [dataMode, setDataMode] = useState<DataMode>("SIMULATION");
  const [config, setConfig] = useState({ url: "ws://localhost:8765", reconnectMs: 2000, staleMs: 5000 });
  const [status, setStatus] = useState<ConnectionStatus>("SIMULATED DATA");
  const [reading, setReading] = useState<SensorReading>(EMPTY_READING);
  const [lastUpdate, setLastUpdate] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [history, setHistory] = useState<SensorReading[]>([]);
  useEffect(() => {
    setReading(EMPTY_READING); setLastUpdate(null); setHistory([]); setError("");
    if (dataMode === "SIMULATION") { setStatus("SIMULATED DATA"); return; }
    let disposed = false;
    let socket: WebSocket | null = null;
    let retry: ReturnType<typeof setTimeout> | undefined;
    let stale: ReturnType<typeof setTimeout> | undefined;
    let sequence: number | undefined;
    let timestamp: number | undefined;
    const clearData = () => { setReading(EMPTY_READING); setHistory([]); };
    const connect = () => {
      if (disposed) return;
      setStatus("CONNECTING");
      try {
        const url = new URL(config.url);
        if (!["ws:", "wss:"].includes(url.protocol)) throw new Error("Use a ws:// or wss:// address");
        socket = new WebSocket(url);
      } catch (e) { setStatus("SENSOR ERROR"); setError(e instanceof Error ? e.message : "Invalid connection address"); return; }
      const active = socket;
      const armStale = () => {
        clearTimeout(stale);
        stale = setTimeout(() => { if (!disposed) { clearData(); setStatus("DISCONNECTED"); setError("No fresh data received"); active.close(); } }, config.staleMs);
      };
      active.onopen = () => { if (!disposed) { sequence = undefined; timestamp = undefined; armStale(); } };
      active.onmessage = (event) => {
        if (disposed) return;
        try {
          const next = parseSensorMessage(String(event.data));
          const time = next.timestamp ? Date.parse(next.timestamp) : undefined;
          if ((next.sequence !== undefined && sequence !== undefined && next.sequence <= sequence) || (time !== undefined && timestamp !== undefined && time <= timestamp)) throw new Error("Out-of-order sensor message");
          if (time !== undefined && Date.now() - time > config.staleMs) throw new Error("Stale sensor timestamp");
          sequence = next.sequence; timestamp = time;
          setReading(next); setLastUpdate(Date.now()); setHistory((h) => [...h.slice(-59), next]);
          setStatus(next.coolant_sensor_valid && next.oil_pressure_sensor_valid ? "CONNECTED" : "SENSOR ERROR");
          setError(next.coolant_sensor_valid && next.oil_pressure_sensor_valid ? "" : "Sensor reports invalid data"); armStale();
        } catch (e) { clearData(); setStatus("SENSOR ERROR"); setError(e instanceof Error ? e.message : "Invalid sensor message"); }
      };
      active.onerror = () => { if (!disposed) { clearData(); setStatus("DISCONNECTED"); setError("Receiver unavailable or connection blocked"); active.close(); } };
      active.onclose = () => {
        clearTimeout(stale);
        if (!disposed) { clearData(); setStatus("DISCONNECTED"); retry = setTimeout(connect, config.reconnectMs); }
      };
      armStale();
    };
    connect();
    return () => { disposed = true; clearTimeout(retry); clearTimeout(stale); socket?.close(); };
  }, [dataMode, config]);
  return { dataMode, setDataMode, config, setConfig, status: dataMode === "SIMULATION" ? "SIMULATED DATA" as const : status, reading: dataMode === "SIMULATION" ? EMPTY_READING : reading, lastUpdate, history, error };
}