import { useEffect, useState } from "react";
import {
  AlertTriangle, Car, LineChart, Music, Navigation, Settings, Smartphone, Thermometer, Trophy, Wrench,
} from "lucide-react";
import { ClusterGauge } from "./ClusterGauge";
import { SportsCar } from "./SportsCar";
import { ChartsView } from "./ChartsView";
import { FaultsView } from "./FaultsView";
import { SettingsView } from "./SettingsView";
import { useTelemetry, type TelemetryStatus } from "./useTelemetry";
import { convertSpeed, formatDuration, resolveApiBase } from "@/lib/telemetry";

const W = 1920, H = 1080;
type View = "cluster" | "charts" | "faults" | "settings";
type Unit = "kmh" | "mph";

function useScale() {
  const [s, setS] = useState(1);
  useEffect(() => {
    const f = () => setS(Math.min(window.innerWidth / W, window.innerHeight / H));
    f(); window.addEventListener("resize", f);
    return () => window.removeEventListener("resize", f);
  }, []);
  return s;
}
function useClock() {
  const [d, setD] = useState<Date | null>(null);
  useEffect(() => { setD(new Date()); const i = setInterval(() => setD(new Date()), 1000); return () => clearInterval(i); }, []);
  return d;
}

const STATUS_META: Record<TelemetryStatus, { label: string; className: string }> = {
  LIVE: { label: "LIVE TELEMETRY", className: "text-success" },
  STALE: { label: "STALE DATA", className: "text-warning" },
  CONNECTING: { label: "CONNECTING", className: "text-warning" },
  OFFLINE: { label: "OFFLINE — NO BACKEND", className: "text-destructive" },
  DEMO: { label: "DEMO MODE — NOT REAL DATA", className: "text-warning" },
};

const RAIL = [
  ["cluster", Car, "Cockpit"],
  ["charts", LineChart, "Telemetry charts"],
  ["faults", Wrench, "Faults"],
  ["settings", Settings, "Settings"],
] as const;

function Readout({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-xl border border-border bg-secondary/60 px-4 py-2">
      <div className="text-[11px] font-bold tracking-[0.25em] text-muted-foreground">{label}</div>
      <div className="font-display text-xl font-bold tabular-nums">{value}</div>
      {note && <div className="text-[10px] text-muted-foreground">{note}</div>}
    </div>
  );
}

function MiniDial({ value, max, label, unit }: { value: number | null; max: number; label: string; unit: string }) {
  const frac = value === null ? 0 : Math.max(0, Math.min(1, value / max));
  const R = 44, CIRC = Math.PI * R;
  return (
    <div className="flex flex-col items-center" role="img" aria-label={`${label}: ${value === null ? "unavailable" : `${value.toFixed(1)} ${unit}`}`}>
      <svg viewBox="0 0 120 78" className="w-32">
        <path d={`M 14 70 A ${R} ${R} 0 0 1 106 70`} fill="none" stroke="var(--color-accent)" strokeOpacity={0.3} strokeWidth={8} strokeLinecap="round" />
        {value !== null && (
          <path d={`M 14 70 A ${R} ${R} 0 0 1 106 70`} fill="none" stroke="var(--color-primary)" strokeWidth={8}
            strokeLinecap="round" strokeDasharray={`${frac * CIRC} ${CIRC}`} style={{ transition: "stroke-dasharray 200ms linear", filter: "drop-shadow(0 0 6px var(--color-primary))" }} />
        )}
        <text x={60} y={62} textAnchor="middle" fontSize={24} fontWeight={800} fontFamily="var(--font-display)" fill="var(--color-foreground)">
          {value === null ? "--" : value.toFixed(1)}
        </text>
        <text x={60} y={76} textAnchor="middle" fontSize={10} fill="var(--color-muted-foreground)">{unit}</text>
      </svg>
      <span className="text-[10px] font-bold tracking-[0.25em] text-muted-foreground">{label}</span>
    </div>
  );
}

export function Dashboard() {
  const scale = useScale();
  const now = useClock();
  const [view, setView] = useState<View>("cluster");
  const [unit, setUnitState] = useState<Unit>("kmh");
  const [demo, setDemoState] = useState(false);
  const [baseOverride, setBaseOverride] = useState<string | null>(null);

  useEffect(() => {
    try {
      const b = localStorage.getItem("roadbeat.apiBase");
      const u = localStorage.getItem("roadbeat.unit");
      const d = localStorage.getItem("roadbeat.demo");
      if (b) setBaseOverride(b);
      if (u === "mph") setUnitState("mph");
      if (d === "1") setDemoState(true);
    } catch { /* storage unavailable */ }
  }, []);

  const setUnit = (u: Unit) => { setUnitState(u); try { localStorage.setItem("roadbeat.unit", u); } catch { /* ignore */ } };
  const setDemo = (d: boolean) => { setDemoState(d); try { localStorage.setItem("roadbeat.demo", d ? "1" : "0"); } catch { /* ignore */ } };
  const setBase = (b: string | null) => {
    setBaseOverride(b);
    try { if (b) localStorage.setItem("roadbeat.apiBase", b); else localStorage.removeItem("roadbeat.apiBase"); } catch { /* ignore */ }
  };

  const apiBase = resolveApiBase(baseOverride);
  const t = useTelemetry(apiBase, demo);
  const s = t.snapshot;
  const statusMeta = STATUS_META[t.status];
  const speedVal = s.speed === null ? null : convertSpeed(s.speed, unit);
  const avgVal = s.avgKmh === null ? null : convertSpeed(s.avgKmh, unit);
  const unitLabel = unit === "kmh" ? "km/h" : "mph";
  const activeFaults = s.faults.filter((f) => f.active);
  const time = now ? now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "--:--";
  const date = now ? now.toLocaleDateString([], { weekday: "short", day: "2-digit", month: "short" }) : "--";
  const sysParts: string[] = [];
  if (s.count !== null) sysParts.push(`PKT ${s.count}`);
  if (s.interval !== null) sysParts.push(`${s.interval}s RATE`);
  if (s.ip) sysParts.push(s.ip);
  if (s.uptime !== null) sysParts.push(`UP ${formatDuration(s.uptime)}`);
  const sysText = sysParts.join(" · ");

  const rail = (
    <nav aria-label="Views" className="flex gap-3 lg:absolute lg:left-8 lg:top-1/2 lg:-translate-y-1/2 lg:flex-col lg:gap-6">
      {RAIL.map(([v, I, label]) => (
        <button key={v} onClick={() => setView(v)} aria-label={label} aria-pressed={view === v}
          className={`rounded-2xl border p-3 transition ${view === v ? "border-primary bg-primary/20 text-primary shadow-[var(--glow)]" : "border-border text-muted-foreground hover:text-foreground"}`}>
          <I className="size-6 lg:size-7" />
        </button>
      ))}
    </nav>
  );

  const banner = (
    <header className="flex w-full items-center justify-between gap-4 lg:absolute lg:left-1/2 lg:top-10 lg:w-[860px] lg:-translate-x-1/2">
      <div className="flex items-center gap-2 text-lg font-semibold tabular-nums lg:text-xl">
        <Thermometer className="size-5 text-primary lg:size-6" />ENG {s.temp === null ? "--" : s.temp.toFixed(1)}°C
      </div>
      <div className="rounded-full border border-primary/60 bg-primary/15 px-4 py-2 text-center font-display text-sm font-bold tracking-[0.2em] shadow-[var(--glow)] lg:px-10 lg:py-3 lg:text-xl lg:tracking-[0.25em]">
        <span className={statusMeta.className}>{statusMeta.label}</span>
      </div>
      <div className="text-lg font-semibold tabular-nums lg:text-xl">{time}</div>
    </header>
  );

  const viewPanel = view !== "cluster" && (
    <div className="z-40 lg:absolute lg:inset-x-24 lg:bottom-32 lg:top-36">
      {view === "charts" && <ChartsView apiBase={apiBase} onClose={() => setView("cluster")} />}
      {view === "faults" && <FaultsView apiBase={apiBase} onClose={() => setView("cluster")} />}
      {view === "settings" && (
        <SettingsView apiBase={apiBase} baseOverride={baseOverride} onBaseChange={setBase}
          unit={unit} onUnitChange={setUnit} demo={demo} onDemoChange={setDemo}
          snapshot={s} status={t.status} error={t.error} onClose={() => setView("cluster")} />
      )}
    </div>
  );

  return (
    <div className="hmi-bg min-h-screen font-sans text-foreground select-none">
      {/* ============ WIDESCREEN STAGE (scales to 1366x768 / 1920x1080) ============ */}
      <div className="fixed inset-0 hidden overflow-hidden lg:block">
        <div className="absolute left-1/2 top-1/2" style={{ width: W, height: H, transform: `translate(-50%,-50%) scale(${scale})` }}>
          {/* arched cluster silhouette */}
          <svg viewBox="0 0 1920 260" className="absolute inset-x-0 top-0 h-[260px] w-full" preserveAspectRatio="none" aria-hidden>
            <path d="M -40 260 Q 960 -140 1960 260" fill="none" stroke="var(--color-accent)" strokeOpacity={0.25} strokeWidth={2} />
            <path d="M -40 260 Q 960 -100 1960 260" fill="none" stroke="var(--color-border)" strokeWidth={1} />
          </svg>
          <svg viewBox="0 0 1920 320" className="absolute inset-x-0 bottom-0 h-[320px] w-full" preserveAspectRatio="none" aria-hidden>
            <defs>
              <radialGradient id="crimson-floor" cx="50%" cy="100%" r="80%">
                <stop offset="0%" stopColor="var(--color-destructive)" stopOpacity={0.5} />
                <stop offset="100%" stopColor="var(--color-destructive)" stopOpacity={0} />
              </radialGradient>
            </defs>
            <rect x="0" y="0" width="1920" height="320" fill="url(#crimson-floor)" />
          </svg>

          {banner}
          {rail}

          {/* right decorative icon rail */}
          <div aria-hidden className="absolute right-8 top-1/2 flex -translate-y-1/2 flex-col gap-6 text-muted-foreground/40">
            <Navigation className="size-6" /><Trophy className="size-6" /><Music className="size-6" /><Smartphone className="size-6" />
          </div>

          {/* central cluster */}
          <main className="absolute left-1/2 top-[520px] -translate-x-1/2 -translate-y-1/2">
            <ClusterGauge rpm={s.rpm} speed={speedVal === null ? "--" : String(Math.round(speedVal))} unit={unitLabel} gearLabel="--" />
          </main>

          {/* left: vehicle health */}
          <section aria-label="Vehicle health" className="absolute left-[120px] top-[180px] w-[400px]">
            <h2 className="font-display text-sm font-bold tracking-[0.3em] text-muted-foreground">VEHICLE HEALTH</h2>
            <div className="mt-4 flex items-center gap-6">
              <MiniDial value={s.temp} max={120} label="ENG TEMP" unit="°C" />
              <div className="flex-1 space-y-3">
                <Readout label="PRESSURE" value={s.press === null ? "--" : s.press.toFixed(1)} note="unit unverified" />
                <Readout label="DS SENSOR" value={s.ds === null ? "--" : s.ds.toFixed(1)} note="unit unverified" />
              </div>
            </div>
            <div className="mt-6 flex min-h-16 gap-4" aria-label="Active fault indicators">
              {activeFaults.length === 0
                ? <span className="self-center text-sm text-muted-foreground">No active faults reported</span>
                : activeFaults.slice(0, 4).map((f) => (
                  <button key={f.key} onClick={() => setView("faults")} className="flex flex-col items-center gap-1 text-warning" aria-label={`Fault: ${f.label}`}>
                    <AlertTriangle className="size-8 drop-shadow-[0_0_8px_currentColor]" />
                    <span className="max-w-20 truncate text-[10px]">{f.label}</span>
                  </button>
                ))}
            </div>
          </section>
          <div className="absolute bottom-[150px] left-[110px] w-[430px]"><SportsCar /></div>

          {/* right: drive session */}
          <section aria-label="Drive session" className="absolute right-[120px] top-[180px] w-[400px]">
            <h2 className="text-right font-display text-sm font-bold tracking-[0.3em] text-muted-foreground">DRIVE SESSION</h2>
            <div className="mt-4 grid grid-cols-3 gap-3 text-center">
              <Readout label="MODE" value="--" />
              <Readout label="SESSION" value={s.driveS === null ? "--" : formatDuration(s.driveS)} />
              <Readout label={`AVG ${unitLabel}`} value={avgVal === null ? "--" : String(Math.round(avgVal))} />
            </div>
            <div className="mt-6">
              <svg viewBox="0 0 400 170" className="w-full" aria-hidden>
                <path d="M40 130 C40 70 110 40 170 55 C230 70 250 30 310 35 C360 39 370 90 330 115 C290 140 200 120 150 135 C100 150 40 160 40 130 Z"
                  fill="none" stroke="var(--color-accent)" strokeOpacity={0.5} strokeWidth={3} strokeLinejoin="round" />
                <circle cx="40" cy="130" r="6" fill="var(--color-primary)" style={{ filter: "drop-shadow(0 0 6px var(--color-primary))" }} />
              </svg>
              <div className="text-center text-[10px] font-semibold tracking-[0.35em] text-muted-foreground">TRACK MAP · DECORATIVE</div>
            </div>
          </section>

          {/* bottom ribbon */}
          <footer className="absolute inset-x-28 bottom-8 flex h-[72px] items-center justify-between gap-6 rounded-full border border-border bg-card/70 px-10 backdrop-blur">
            <div className="flex min-w-0 items-center gap-3 text-sm font-semibold">
              <AlertTriangle className={`size-5 shrink-0 ${activeFaults.length ? "text-warning" : "text-muted"}`} />
              <span className="truncate">
                {activeFaults.length
                  ? `${activeFaults.length} ACTIVE FAULT${activeFaults.length > 1 ? "S" : ""}: ${activeFaults[0]?.label ?? ""}`
                  : "NO ACTIVE FAULTS"}
              </span>
            </div>
            <div className="shrink-0 text-center text-sm text-muted-foreground">{date} · {time}</div>
            <div className="flex shrink-0 items-center gap-6 text-sm font-semibold tabular-nums">
              <span>ODO -- km</span>
              <span>TRIP {s.tripKm === null ? "--" : s.tripKm.toFixed(2)} km</span>
            </div>
            <div className="min-w-0 truncate text-xs text-muted-foreground">{sysText || "No system info from backend"}</div>
          </footer>

          {viewPanel}
        </div>
      </div>

      {/* ============ NARROW / MOBILE: intentionally stacked ============ */}
      <div className="mx-auto flex min-h-screen w-full max-w-xl flex-col gap-5 p-4 lg:hidden">
        {banner}
        {rail}
        {view === "cluster" ? (
          <>
            <div className="mx-auto w-full max-w-[420px]">
              <div style={{ transform: `scale(${Math.min(1, 0.66)})`, transformOrigin: "top center" }}>
                <ClusterGauge rpm={s.rpm} speed={speedVal === null ? "--" : String(Math.round(speedVal))} unit={unitLabel} gearLabel="--" size={640} />
              </div>
            </div>
            <div className="-mt-40 grid grid-cols-3 gap-3">
              <Readout label="ENG TEMP" value={s.temp === null ? "--" : `${s.temp.toFixed(1)} °C`} />
              <Readout label="PRESSURE" value={s.press === null ? "--" : s.press.toFixed(1)} />
              <Readout label="DS SENSOR" value={s.ds === null ? "--" : s.ds.toFixed(1)} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Readout label="SESSION" value={s.driveS === null ? "--" : formatDuration(s.driveS)} />
              <Readout label={`AVG ${unitLabel}`} value={avgVal === null ? "--" : String(Math.round(avgVal))} />
              <Readout label="TRIP km" value={s.tripKm === null ? "--" : s.tripKm.toFixed(2)} />
            </div>
            <SportsCar />
            <div className="rounded-2xl border border-border bg-card/70 p-4 text-sm">
              <div className="flex items-center gap-2 font-semibold">
                <AlertTriangle className={`size-4 ${activeFaults.length ? "text-warning" : "text-muted"}`} />
                {activeFaults.length ? `${activeFaults.length} active fault(s)` : "No active faults"}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">{date} · {time} · {sysText || "No system info"}</div>
            </div>
          </>
        ) : (
          <div className="min-h-[70vh]">{viewPanel}</div>
        )}
      </div>
    </div>
  );
}
