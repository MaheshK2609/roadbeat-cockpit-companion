import { useEffect, useState } from "react";
import {
  EMPTY_SNAPSHOT, isStale, parseSnapshot, staleThresholdMs, wsUrl,
  type TelemetrySnapshot,
} from "@/lib/telemetry";

export type TelemetryStatus = "CONNECTING" | "LIVE" | "STALE" | "OFFLINE" | "DEMO";

/**
 * Live telemetry from the FastAPI backend: one GET /api/latest on load, then
 * the /ws snapshot stream with exponential-backoff reconnect. Stale/offline
 * detection uses the backend's own `online` and `age` fields plus a local
 * freshness timer. Demo mode (default OFF) generates clearly-labeled local
 * values and never mixes with real telemetry.
 */
export function useTelemetry(apiBase: string, demo: boolean) {
  const [snapshot, setSnapshot] = useState<TelemetrySnapshot>(EMPTY_SNAPSHOT);
  const [wsOpen, setWsOpen] = useState(false);
  const [lastRx, setLastRx] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState<TelemetryStatus>("CONNECTING");

  // Demo mode: local, clearly labeled, never sent anywhere.
  useEffect(() => {
    if (!demo) return;
    setStatus("DEMO");
    setError("");
    const t0 = Date.now();
    const tick = () => {
      const el = (Date.now() - t0) / 1000;
      setSnapshot({
        ...EMPTY_SNAPSHOT,
        temp: 88 + Math.sin(el / 7) * 4,
        press: 960 + Math.sin(el / 3) * 45,
        ds: 30 + Math.sin(el / 5) * 2,
        speed: Math.max(0, 62 + Math.sin(el / 9) * 55),
        rpm: Math.max(700, 1900 + Math.sin(el / 4) * 1300),
        ts: Date.now() / 1000,
        count: Math.floor(el * 2),
        online: true,
        age: 0,
        tripKm: 12.3 + el * 0.005,
        driveS: el,
        avgKmh: 54,
      });
      setLastRx(Date.now());
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [demo]);

  // Real backend connection.
  useEffect(() => {
    if (demo) return;
    let disposed = false;
    let socket: WebSocket | null = null;
    let retry: ReturnType<typeof setTimeout> | undefined;
    let attempt = 0;
    setSnapshot(EMPTY_SNAPSHOT);
    setLastRx(null);
    setError("");
    setStatus("CONNECTING");

    fetch(`${apiBase}/api/latest`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as unknown;
      })
      .then((d) => {
        if (!disposed) { setSnapshot(parseSnapshot(d)); setLastRx(Date.now()); }
      })
      .catch((e: unknown) => {
        if (!disposed) setError(`REST API unreachable (${e instanceof Error ? e.message : "unknown error"})`);
      });

    const schedule = () => {
      attempt += 1;
      retry = setTimeout(connect, Math.min(15000, 1000 * 2 ** Math.min(attempt, 4)));
    };
    function connect() {
      if (disposed) return;
      try {
        socket = new WebSocket(wsUrl(apiBase));
      } catch {
        schedule();
        return;
      }
      const active = socket;
      active.onopen = () => { if (!disposed) { attempt = 0; setWsOpen(true); } };
      active.onmessage = (ev) => {
        if (disposed) return;
        try {
          setSnapshot(parseSnapshot(JSON.parse(String(ev.data))));
          setLastRx(Date.now());
          setError("");
        } catch {
          /* ignore malformed frame; keep last good snapshot */
        }
      };
      active.onerror = () => { active.close(); };
      active.onclose = () => {
        if (!disposed) { setWsOpen(false); schedule(); }
      };
    }
    connect();

    return () => {
      disposed = true;
      clearTimeout(retry);
      socket?.close();
    };
  }, [apiBase, demo]);

  // Connection status from freshness signals.
  useEffect(() => {
    if (demo) { setStatus("DEMO"); return; }
    const compute = () => {
      if (lastRx === null) {
        setStatus(wsOpen ? "CONNECTING" : "OFFLINE");
        return;
      }
      const localAgeMs = Date.now() - lastRx;
      setStatus(isStale(snapshot) || localAgeMs > staleThresholdMs(snapshot.interval) ? "STALE" : "LIVE");
    };
    compute();
    const id = setInterval(compute, 1000);
    return () => clearInterval(id);
  }, [demo, snapshot, wsOpen, lastRx]);

  return { snapshot, status, error, lastRx };
}
