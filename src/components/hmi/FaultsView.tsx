import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, X } from "lucide-react";
import { parseFaultResponse, type FaultRecord } from "@/lib/telemetry";

function fmtTs(iso: string | null): string {
  if (!iso) return "--";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
}

function FaultRow({ f }: { f: FaultRecord }) {
  return (
    <li className="flex items-center gap-4 rounded-xl border border-border bg-background/60 px-4 py-3">
      {f.active
        ? <AlertTriangle className="size-6 shrink-0 text-warning drop-shadow-[0_0_8px_currentColor]" />
        : <CheckCircle2 className="size-6 shrink-0 text-muted-foreground" />}
      <div className="min-w-0 flex-1">
        <div className="truncate font-semibold">{f.label}</div>
        <div className="text-xs tabular-nums text-muted-foreground">
          Raised {fmtTs(f.raisedAt)}{f.clearedAt ? ` · Cleared ${fmtTs(f.clearedAt)}` : ""}
        </div>
      </div>
      <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold tracking-widest ${f.active ? "bg-warning/15 text-warning" : "bg-secondary text-muted-foreground"}`}>
        {f.active ? "ACTIVE" : "CLEARED"}
      </span>
    </li>
  );
}

/** Active and historical faults from GET /api/faults (real records only). */
export function FaultsView({ apiBase, onClose }: { apiBase: string; onClose: () => void }) {
  const [data, setData] = useState<{ active: FaultRecord[]; history: FaultRecord[] }>({ active: [], history: [] });
  const [error, setError] = useState("");

  useEffect(() => {
    let disposed = false;
    const load = () =>
      fetch(`${apiBase}/api/faults`)
        .then((r) => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return r.json() as unknown;
        })
        .then((d) => { if (!disposed) { setData(parseFaultResponse(d)); setError(""); } })
        .catch((e: unknown) => { if (!disposed) setError(e instanceof Error ? e.message : "Failed to load faults"); });
    load();
    const id = setInterval(load, 5000);
    return () => { disposed = true; clearInterval(id); };
  }, [apiBase]);

  return (
    <section className="hmi-panel flex h-full flex-col p-8" aria-label="Faults">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-bold tracking-widest">FAULTS</h2>
        <button onClick={onClose} aria-label="Close faults" className="rounded-xl border border-border p-2 text-muted-foreground transition hover:text-foreground"><X className="size-6" /></button>
      </div>
      {error && <p role="alert" className="mt-3 text-warning">Fault data unavailable: {error}</p>}
      <div className="mt-4 flex-1 space-y-6 overflow-y-auto">
        <div>
          <h3 className="text-xs font-bold tracking-[0.3em] text-warning">ACTIVE ({data.active.length})</h3>
          <ul className="mt-2 space-y-2">
            {data.active.length === 0
              ? <li className="rounded-xl border border-border bg-background/60 px-4 py-3 text-sm text-muted-foreground">No active faults reported by the backend.</li>
              : data.active.map((f) => <FaultRow key={f.key} f={f} />)}
          </ul>
        </div>
        <div>
          <h3 className="text-xs font-bold tracking-[0.3em] text-muted-foreground">HISTORY ({data.history.length})</h3>
          <ul className="mt-2 space-y-2">
            {data.history.length === 0
              ? <li className="rounded-xl border border-border bg-background/60 px-4 py-3 text-sm text-muted-foreground">No historical fault records.</li>
              : data.history.map((f) => <FaultRow key={f.key} f={f} />)}
          </ul>
        </div>
      </div>
    </section>
  );
}
