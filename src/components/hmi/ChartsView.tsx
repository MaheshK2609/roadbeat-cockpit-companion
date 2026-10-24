import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { parseHistory, type HistorySample } from "@/lib/telemetry";

const SIGNALS = [
  { key: "temp", label: "ENGINE TEMP", unit: "°C", color: "var(--color-chart-1)", digits: 1 },
  { key: "press", label: "PRESSURE", unit: "unit unverified", color: "var(--color-chart-2)", digits: 1 },
  { key: "ds", label: "DS SENSOR", unit: "unit unverified", color: "var(--color-chart-3)", digits: 1 },
  { key: "speed", label: "SPEED", unit: "km/h", color: "var(--color-chart-4)", digits: 0 },
  { key: "rpm", label: "RPM", unit: "rpm", color: "var(--color-chart-5)", digits: 0 },
] as const;

function Trace({ samples, k, color }: { samples: HistorySample[]; k: (typeof SIGNALS)[number]["key"]; color: string }) {
  const pts = samples.map((s) => s[k]).filter((v): v is number => v !== null);
  if (pts.length < 2) {
    return <div className="flex h-28 items-center justify-center text-sm text-muted-foreground">NO HISTORICAL DATA</div>;
  }
  const low = Math.min(...pts);
  const high = Math.max(...pts);
  const span = Math.max(1e-9, high - low);
  const points = samples
    .map((s, i) => (s[k] === null ? null : `${(i / Math.max(1, samples.length - 1)) * 400},${52 - ((s[k] as number) - low) / span * 44}`))
    .filter((p): p is string => p !== null)
    .join(" ");
  return (
    <svg viewBox="0 0 400 60" className="h-28 w-full" role="img" aria-label={`${k} history`}>
      {[0, 1, 2].map((i) => (
        <line key={i} x1={0} y1={8 + i * 22} x2={400} y2={8 + i * 22} stroke="var(--color-border)" strokeWidth={0.5} />
      ))}
      <polyline points={points} fill="none" stroke={color} strokeWidth={2} />
    </svg>
  );
}

/** Real-time telemetry graphs from GET /api/history?minutes=5 (real measurements only). */
export function ChartsView({ apiBase, onClose }: { apiBase: string; onClose: () => void }) {
  const [samples, setSamples] = useState<HistorySample[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let disposed = false;
    const load = () =>
      fetch(`${apiBase}/api/history?minutes=5`)
        .then((r) => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return r.json() as unknown;
        })
        .then((d) => { if (!disposed) { setSamples(parseHistory(d)); setError(""); } })
        .catch((e: unknown) => { if (!disposed) setError(e instanceof Error ? e.message : "Failed to load history"); });
    load();
    const id = setInterval(load, 5000);
    return () => { disposed = true; clearInterval(id); };
  }, [apiBase]);

  return (
    <section className="hmi-panel flex h-full flex-col p-8" aria-label="Telemetry charts">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-bold tracking-widest">TELEMETRY HISTORY · LAST 5 MIN</h2>
        <button onClick={onClose} aria-label="Close charts" className="rounded-xl border border-border p-2 text-muted-foreground transition hover:text-foreground"><X className="size-6" /></button>
      </div>
      {error && <p role="alert" className="mt-3 text-warning">History unavailable: {error}</p>}
      {!error && samples.length === 0 && (
        <p className="mt-8 text-center text-muted-foreground">No historical measurements available yet. Charts appear once the backend has recorded samples.</p>
      )}
      <div className="mt-4 grid flex-1 grid-cols-1 gap-4 overflow-y-auto md:grid-cols-2 xl:grid-cols-3">
        {SIGNALS.map((sig) => {
          const vals = samples.map((s) => s[sig.key]).filter((v): v is number => v !== null);
          const latest = vals.length ? vals[vals.length - 1]! : null;
          return (
            <div key={sig.key} className="rounded-2xl border border-border bg-background/60 p-4">
              <div className="flex items-baseline justify-between">
                <span className="text-xs font-bold tracking-[0.25em] text-muted-foreground">{sig.label}</span>
                <span className="font-display text-xl font-bold tabular-nums" style={{ color: sig.color }}>
                  {latest === null ? "--" : latest.toFixed(sig.digits)}
                </span>
              </div>
              <Trace samples={samples} k={sig.key} color={sig.color} />
              <div className="flex justify-between text-[11px] tabular-nums text-muted-foreground">
                <span>{vals.length ? `min ${Math.min(...vals).toFixed(sig.digits)}` : "--"}</span>
                <span>{sig.unit}</span>
                <span>{vals.length ? `max ${Math.max(...vals).toFixed(sig.digits)}` : "--"}</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
