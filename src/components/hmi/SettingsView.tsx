import { useEffect, useState } from "react";
import { X } from "lucide-react";
import type { TelemetrySnapshot } from "@/lib/telemetry";
import type { TelemetryStatus } from "./useTelemetry";

interface Props {
  apiBase: string;
  baseOverride: string | null;
  onBaseChange: (base: string | null) => void;
  unit: "kmh" | "mph";
  onUnitChange: (u: "kmh" | "mph") => void;
  demo: boolean;
  onDemoChange: (d: boolean) => void;
  snapshot: TelemetrySnapshot;
  status: TelemetryStatus;
  error: string;
  onClose: () => void;
}

/** Connection, units, demo mode, trip reset, CSV export and raw diagnostics. */
export function SettingsView({
  apiBase, baseOverride, onBaseChange, unit, onUnitChange, demo, onDemoChange,
  snapshot, status, error, onClose,
}: Props) {
  const [draft, setDraft] = useState(baseOverride ?? "");
  const [msg, setMsg] = useState("");
  const [diagOpen, setDiagOpen] = useState(false);
  const [stats, setStats] = useState("");

  useEffect(() => {
    if (!diagOpen) return;
    let disposed = false;
    fetch(`${apiBase}/api/stats?minutes=60`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as unknown;
      })
      .then((d) => { if (!disposed) setStats(JSON.stringify(d, null, 2)); })
      .catch((e: unknown) => { if (!disposed) setStats(`Stats unavailable: ${e instanceof Error ? e.message : "error"}`); });
    return () => { disposed = true; };
  }, [diagOpen, apiBase]);

  const applyBase = () => {
    const v = draft.trim().replace(/\/+$/, "");
    onBaseChange(v || null);
    setMsg(v ? `Backend set to ${v}. Reconnecting…` : "Backend reset to same origin. Reconnecting…");
  };

  const resetTrip = () => {
    if (!window.confirm("Reset trip distance, driving time and average speed on the backend?")) return;
    fetch(`${apiBase}/api/reset_trip`, { method: "POST" })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        setMsg("Trip reset acknowledged by the backend.");
      })
      .catch((e: unknown) => setMsg(`Trip reset failed: ${e instanceof Error ? e.message : "error"}`));
  };

  return (
    <section className="hmi-panel flex h-full flex-col p-8" aria-label="Settings">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-bold tracking-widest">SETTINGS</h2>
        <button onClick={onClose} aria-label="Close settings" className="rounded-xl border border-border p-2 text-muted-foreground transition hover:text-foreground"><X className="size-6" /></button>
      </div>
      {msg && <p role="status" className="mt-3 text-sm text-accent">{msg}</p>}

      <div className="mt-5 flex-1 space-y-6 overflow-y-auto pr-1">
        <div>
          <h3 className="text-xs font-bold tracking-[0.3em] text-muted-foreground">BACKEND CONNECTION</h3>
          <form className="mt-2 flex gap-3" onSubmit={(e) => { e.preventDefault(); applyBase(); }}>
            <input
              aria-label="Backend base URL"
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Same origin (default) or e.g. http://192.168.1.50:5000"
              className="h-11 flex-1 rounded-xl border border-input bg-background px-4 text-foreground"
            />
            <button type="submit" className="rounded-xl bg-primary px-6 font-semibold text-primary-foreground shadow-[var(--glow)]">Apply</button>
          </form>
          <p className="mt-2 text-sm text-muted-foreground">
            Effective base: <span className="font-semibold text-foreground">{apiBase || "(same origin)"}</span> · Status: <span className="font-semibold text-foreground">{status}</span>
            {error ? <span className="text-warning"> · {error}</span> : null}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            When this frontend is hosted separately from the FastAPI backend, enter the backend's address
            (e.g. your laptop's IP, http://192.168.x.x:5000) and make sure the backend's CORS settings allow
            this frontend's origin. You can also set VITE_API_BASE_URL at build time instead of using this form.
          </p>
        </div>

        <div>
          <h3 className="text-xs font-bold tracking-[0.3em] text-muted-foreground">SPEED UNITS</h3>
          <div className="mt-2 flex gap-2">
            {(["kmh", "mph"] as const).map((u) => (
              <button key={u} onClick={() => onUnitChange(u)} aria-pressed={unit === u}
                className={`rounded-xl px-6 py-2 font-semibold transition ${unit === u ? "bg-primary text-primary-foreground shadow-[var(--glow)]" : "bg-secondary text-muted-foreground"}`}>
                {u === "kmh" ? "km/h" : "mph"}
              </button>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-xs font-bold tracking-[0.3em] text-muted-foreground">DEMO MODE</h3>
          <div className="mt-2 flex items-center gap-4">
            <button onClick={() => onDemoChange(!demo)} aria-pressed={demo}
              className={`rounded-xl px-6 py-2 font-semibold transition ${demo ? "bg-warning text-background" : "bg-secondary text-muted-foreground"}`}>
              {demo ? "DEMO ON — NOT REAL DATA" : "DEMO OFF"}
            </button>
            <span className="text-sm text-muted-foreground">Default OFF. Generates clearly-labeled local values for layout testing only.</span>
          </div>
        </div>

        <div>
          <h3 className="text-xs font-bold tracking-[0.3em] text-muted-foreground">ACTIONS</h3>
          <div className="mt-2 flex flex-wrap gap-3">
            <button onClick={resetTrip} className="rounded-xl border border-warning/50 bg-warning/10 px-6 py-2 font-semibold text-warning transition hover:bg-warning/20">
              Reset trip (backend)
            </button>
            <a href={`${apiBase}/api/export.csv?minutes=1440`} download
              className="rounded-xl border border-accent/50 bg-accent/10 px-6 py-2 font-semibold text-accent transition hover:bg-accent/20">
              Export CSV (24 h)
            </a>
          </div>
        </div>

        <div>
          <button onClick={() => setDiagOpen((o) => !o)} aria-expanded={diagOpen}
            className="text-xs font-bold tracking-[0.3em] text-muted-foreground transition hover:text-foreground">
            {diagOpen ? "▾" : "▸"} DETAILED DIAGNOSTICS
          </button>
          {diagOpen && (
            <div className="mt-2 space-y-3">
              <div>
                <div className="text-xs text-muted-foreground">GET /api/stats?minutes=60</div>
                <pre className="mt-1 max-h-48 overflow-auto rounded-xl border border-border bg-background p-3 text-xs text-foreground">{stats || "Loading…"}</pre>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Latest snapshot (as received)</div>
                <pre className="mt-1 max-h-48 overflow-auto rounded-xl border border-border bg-background p-3 text-xs text-foreground">{JSON.stringify(snapshot, null, 2)}</pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
