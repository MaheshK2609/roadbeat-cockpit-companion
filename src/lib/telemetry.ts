/**
 * Adapter for the external FastAPI telemetry backend (CAN -> W5500 -> FastAPI).
 * The backend contract is preserved exactly: field names, units and endpoints
 * are NOT changed here. Missing/unavailable signals are represented as null
 * and rendered as "--" by the UI. Nothing in this file invents readings.
 */

export interface FaultRecord {
  key: string;
  label: string;
  active: boolean;
  raisedAt: string | null;
  clearedAt: string | null;
}

export interface TelemetrySnapshot {
  /** Engine temperature, degrees C (backend field: temp). */
  temp: number | null;
  /** Pressure sensor reading; unit unverified (backend field: press). */
  press: number | null;
  /** DS sensor reading; unit unverified (backend field: ds). */
  ds: number | null;
  /** Vehicle speed, km/h (backend field: speed). */
  speed: number | null;
  /** RPM as provided by the backend (backend field: rpm). */
  rpm: number | null;
  ts: number | string | null;
  /** Packet count (backend field: count). */
  count: number | null;
  /** STM32/backend IP (backend field: ip). */
  ip: string | null;
  firstTs: number | string | null;
  /** Update interval in seconds (backend field: interval). */
  interval: number | null;
  tripKm: number | null;
  driveS: number | null;
  avgKmh: number | null;
  online: boolean | null;
  uptime: number | null;
  /** Seconds since the backend last received data (backend field: age). */
  age: number | null;
  faults: FaultRecord[];
}

export const EMPTY_SNAPSHOT: TelemetrySnapshot = {
  temp: null, press: null, ds: null, speed: null, rpm: null,
  ts: null, count: null, ip: null, firstTs: null, interval: null,
  tripKm: null, driveS: null, avgKmh: null, online: null, uptime: null,
  age: null, faults: [],
};

const num = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) ? v : null;

const ts = (v: unknown): string | null => {
  if (typeof v === "number" && Number.isFinite(v)) {
    return new Date(v * (v > 1e12 ? 1 : 1000)).toISOString();
  }
  return typeof v === "string" ? v : null;
};

export function parseFaults(raw: unknown): FaultRecord[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((f, i) => {
    if (typeof f === "string") {
      return { key: `${f}-${i}`, label: f, active: true, raisedAt: null, clearedAt: null };
    }
    const o = (f && typeof f === "object" ? f : {}) as Record<string, unknown>;
    const label =
      (typeof o["label"] === "string" && o["label"]) ||
      (typeof o["name"] === "string" && o["name"]) ||
      (typeof o["message"] === "string" && o["message"]) ||
      (typeof o["code"] === "string" && o["code"]) ||
      `Fault ${i + 1}`;
    const clearedAt = ts(o["cleared_at"]) ?? ts(o["clearedAt"]);
    const active = typeof o["active"] === "boolean" ? o["active"] : clearedAt === null;
    const raisedAt = ts(o["raised_at"]) ?? ts(o["raisedAt"]) ?? ts(o["ts"]);
    return { key: `${label}-${raisedAt ?? i}`, label, active, raisedAt, clearedAt };
  });
}

export function parseSnapshot(raw: unknown): TelemetrySnapshot {
  const p = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    temp: num(p["temp"]),
    press: num(p["press"]),
    ds: num(p["ds"]),
    speed: num(p["speed"]),
    rpm: num(p["rpm"]),
    ts: typeof p["ts"] === "number" || typeof p["ts"] === "string" ? p["ts"] : null,
    count: num(p["count"]),
    ip: typeof p["ip"] === "string" ? p["ip"] : null,
    firstTs: typeof p["first_ts"] === "number" || typeof p["first_ts"] === "string" ? p["first_ts"] : null,
    interval: num(p["interval"]),
    tripKm: num(p["trip_km"]),
    driveS: num(p["drive_s"]),
    avgKmh: num(p["avg_kmh"]),
    online: typeof p["online"] === "boolean" ? p["online"] : null,
    uptime: num(p["uptime"]),
    age: num(p["age"]),
    faults: parseFaults(p["faults"]),
  };
}

export interface HistorySample {
  ts: number | string | null;
  temp: number | null;
  press: number | null;
  ds: number | null;
  speed: number | null;
  rpm: number | null;
}

export function parseHistory(raw: unknown): HistorySample[] {
  let arr: unknown[] = [];
  if (Array.isArray(raw)) arr = raw;
  else if (raw && typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    for (const k of ["samples", "history", "data", "rows"]) {
      if (Array.isArray(o[k])) { arr = o[k] as unknown[]; break; }
    }
  }
  return arr
    .map((item) => {
      const p = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
      return {
        ts: typeof p["ts"] === "number" || typeof p["ts"] === "string" ? p["ts"] : null,
        temp: num(p["temp"]), press: num(p["press"]), ds: num(p["ds"]),
        speed: num(p["speed"]), rpm: num(p["rpm"]),
      };
    })
    .filter((smp) => smp.temp !== null || smp.press !== null || smp.ds !== null || smp.speed !== null || smp.rpm !== null);
}

export function parseFaultResponse(raw: unknown): { active: FaultRecord[]; history: FaultRecord[] } {
  if (Array.isArray(raw)) {
    const all = parseFaults(raw);
    return { active: all.filter((f) => f.active), history: all.filter((f) => !f.active) };
  }
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    active: parseFaults(o["active"]),
    history: parseFaults(o["history"] ?? o["records"] ?? o["log"]),
  };
}

/** API base URL: explicit override, then VITE_API_BASE_URL, then same origin (""). */
export function resolveApiBase(override?: string | null): string {
  const raw = (override ?? (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "").trim();
  return raw.replace(/\/+$/, "");
}

/** Pure: ws/wss URL for a non-empty http(s) base. */
export function wsUrlFromBase(base: string): string {
  return `${base.replace(/\/+$/, "").replace(/^http/i, "ws")}/ws`;
}

/** WebSocket URL for the /ws stream; derives ws/wss from the API base or page origin. */
export function wsUrl(base: string): string {
  if (base) return wsUrlFromBase(base);
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${window.location.host}/ws`;
}

export const KMH_TO_MPH = 0.621371;

export function convertSpeed(kmh: number, unit: "kmh" | "mph"): number {
  return unit === "mph" ? kmh * KMH_TO_MPH : kmh;
}

export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

/** Data is stale when older than 3 update intervals (min 10 s). */
export function staleThresholdMs(intervalSeconds: number | null): number {
  return Math.max(10, (intervalSeconds ?? 2) * 3) * 1000;
}

export function isStale(snap: TelemetrySnapshot): boolean {
  if (snap.online === false) return true;
  if (snap.age !== null && snap.age * 1000 > staleThresholdMs(snap.interval)) return true;
  return false;
}
