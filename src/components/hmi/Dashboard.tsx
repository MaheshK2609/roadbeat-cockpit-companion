import { useEffect, useState } from "react";
import {
  AlertTriangle, ArrowBigLeft, ArrowBigRight, BatteryCharging, Car, ChevronLeft, ChevronRight,
  Cloud, CornerUpRight, Droplet, Fuel, Gauge as GaugeIcon, Heart, Lightbulb, MapPin, Navigation,
  Pause, Play, Repeat, Search, Shuffle, SkipBack, SkipForward, Thermometer, Timer, Volume2,
  Wrench, Zap, Clock, Home, Briefcase, Coffee, ShieldCheck, Settings2, X,
} from "lucide-react";
import { Gauge } from "./Gauge";
import { useVehicle, type DriveMode } from "./useVehicle";
import carRear from "@/assets/car-rear.png";
import album from "@/assets/album.jpg";

const W = 1920, H = 1080;

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

type Alert = { id: string; icon: typeof Droplet; label: string; detail: string; level: "warn" | "crit" | "info" };
const ALERTS: Alert[] = [
  { id: "tpms", icon: AlertTriangle, label: "Tire Pressure", detail: "Rear-left tire at 28 PSI (rec. 33). Check at next stop.", level: "warn" },
  { id: "oil", icon: Droplet, label: "Oil Service", detail: "Oil change due in 450 km.", level: "info" },
  { id: "engine", icon: Wrench, label: "Engine Check", detail: "No faults detected. Last scan 2 min ago.", level: "info" },
  { id: "battery", icon: BatteryCharging, label: "12V Battery", detail: "Voltage 12.1V — slightly low.", level: "warn" },
];

const TRACKS = [
  { title: "Midnight Boulevard", artist: "Neon Drive", dur: 214 },
  { title: "Brooklyn Bridge To Chorus", artist: "The Strokes", dur: 238 },
  { title: "Nightcall", artist: "Kavinsky", dur: 258 },
];

const ADAS = ["ADAS", "LANE ASSIST", "TRIP", "ECO SCORE"];

export function Dashboard() {
  const scale = useScale();
  const now = useClock();
  const v = useVehicle();
  const [signal, setSignal] = useState<"L" | "R" | null>("R");
  const [adas, setAdas] = useState(0);
  const [alertOpen, setAlertOpen] = useState<Alert | null>(null);
  const [acked, setAcked] = useState<string[]>([]);
  const [navTab, setNavTab] = useState<"map" | "route" | "places">("map");
  const [playing, setPlaying] = useState(true);
  const [track, setTrack] = useState(0);
  const [pos, setPos] = useState(72);
  const [vol, setVol] = useState(0.6);
  const [liked, setLiked] = useState(false);
  const [lights, setLights] = useState(true);
  const [gaugeView, setGaugeView] = useState<"rpm" | "power">("rpm");

  useEffect(() => {
    if (!playing) return;
    const i = setInterval(() => setPos((p) => {
      if (p + 1 >= TRACKS[track].dur) { setTrack((t) => (t + 1) % TRACKS.length); return 0; }
      return p + 1;
    }), 1000);
    return () => clearInterval(i);
  }, [playing, track]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp") v.setThrottle("accel");
      if (e.key === "ArrowDown") v.setThrottle("brake");
      if (e.key === "ArrowLeft") setSignal((s) => (s === "L" ? null : "L"));
      if (e.key === "ArrowRight") setSignal((s) => (s === "R" ? null : "R"));
    };
    const up = (e: KeyboardEvent) => { if (e.key === "ArrowUp" || e.key === "ArrowDown") v.setThrottle(null); };
    window.addEventListener("keydown", down); window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, [v.setThrottle]);

  const active = ALERTS.filter((a) => !acked.includes(a.id));
  const t = TRACKS[track];
  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
  const time = now ? now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "--:--";
  const eta = Math.max(1, Math.round((v.trip / Math.max(v.speed, 20)) * 60));
  const power = Math.round((v.rpm / 8) * 180);
  const alertColor = (l: Alert["level"]) => (l === "crit" ? "text-destructive" : l === "warn" ? "text-warning" : "text-muted-foreground");

  return (
    <div className="hmi-bg fixed inset-0 overflow-hidden font-sans text-foreground select-none">
      <div className="absolute left-1/2 top-1/2" style={{ width: W, height: H, transform: `translate(-50%,-50%) scale(${scale})` }}>
        {/* ================= CLUSTER ================= */}
        <section className="hmi-panel absolute left-6 right-6 top-6 h-[620px] overflow-hidden rounded-[56px]">
          {/* top capsule */}
          <div className="absolute left-1/2 top-0 flex h-[84px] w-[620px] -translate-x-1/2 items-center justify-between rounded-b-[40px] border-x border-b border-border bg-background/70 px-10 shadow-[var(--glow)]">
            <div className="flex items-center gap-3 text-2xl font-semibold"><Cloud className="size-8" /> 29°C</div>
            <div className="font-display text-2xl font-black tracking-[0.3em] text-primary glow-text">AURA</div>
            <div className="text-2xl font-semibold tabular-nums">{time}</div>
          </div>
          <button onClick={() => setSignal((s) => (s === "L" ? null : "L"))} className="absolute left-[560px] top-6" aria-label="Left signal">
            <ArrowBigLeft className={`size-11 ${signal === "L" ? "blink fill-success text-success" : "fill-muted text-muted"}`} />
          </button>
          <button onClick={() => setSignal((s) => (s === "R" ? null : "R"))} className="absolute right-[560px] top-6" aria-label="Right signal">
            <ArrowBigRight className={`size-11 ${signal === "R" ? "blink fill-success text-success" : "fill-muted text-muted"}`} />
          </button>

          {/* warning icon arcs */}
          {[
            { I: AlertTriangle, x: 90, y: 150, a: ALERTS[0] }, { I: Droplet, x: 150, y: 95, a: ALERTS[1] },
            { I: Wrench, x: 225, y: 55, a: ALERTS[2] }, { I: BatteryCharging, x: 310, y: 30, a: ALERTS[3] },
          ].map(({ I, x, y, a }) => (
            <button key={a.id} onClick={() => setAlertOpen(a)} style={{ left: x, top: y }} className="absolute" aria-label={a.label}>
              <I className={`size-9 transition ${acked.includes(a.id) ? "text-muted" : a.level === "warn" ? "text-warning drop-shadow-[0_0_8px_currentColor]" : "text-muted-foreground"}`} />
            </button>
          ))}
          {[
            { I: ShieldCheck, x: 310, y: 30, on: true }, { I: Lightbulb, x: 225, y: 55, on: lights, click: () => setLights((l) => !l) },
            { I: Zap, x: 150, y: 95, on: v.mode === "ECO" }, { I: Thermometer, x: 90, y: 150, on: false },
          ].map(({ I, x, y, on, click }, i) => (
            <button key={i} onClick={click} style={{ right: x, top: y }} className="absolute" aria-label="indicator">
              <I className={`size-9 ${on ? "text-primary drop-shadow-[0_0_8px_currentColor]" : "text-muted"}`} />
            </button>
          ))}

          {/* temp bar */}
          <SideBar side="left" value={v.temp} icon={<Thermometer className="size-8" />} />
          <SideBar side="right" value={v.fuel} icon={<Fuel className="size-8" />} />

          {/* gauges */}
          <div className="absolute left-[130px] top-[90px]">
            <Gauge id="rpm" value={gaugeView === "rpm" ? v.rpm : power / 22.5} max={8} redFrom={6.5} labels={[0, 1, 2, 3, 4, 5, 6, 7, 8]} onClick={() => setGaugeView((g) => (g === "rpm" ? "power" : "rpm"))}
              footer={<div className="text-lg font-bold leading-tight tracking-widest text-muted-foreground">{gaugeView === "rpm" ? <>RPM<br />×1000</> : <>POWER<br />kW</>}</div>}>
              <div className="text-sm font-semibold tracking-[0.3em] text-muted-foreground">GEAR</div>
              <div className="flex items-start font-display text-[96px] font-black leading-none glow-text">
                {v.gear === 0 ? "N" : v.gear}
                {v.rpm > 3.2 && v.gear < 6 && <span className="ml-1 text-4xl text-success">▲</span>}
              </div>
              <div className="mt-1 font-display text-lg tabular-nums text-accent">{gaugeView === "rpm" ? `${Math.round(v.rpm * 1000)} rpm` : `${power} kW`}</div>
            </Gauge>
          </div>
          <div className="absolute right-[130px] top-[90px]">
            <Gauge id="spd" value={v.speed} max={240} redFrom={180} labels={[0, 20, 40, 60, 80, 100, 120, 140, 160, 180, 200, 220, 240]}
              footer={<div className="text-lg font-bold tracking-widest text-muted-foreground">{v.mode}</div>}>
              <div className="font-display text-[110px] font-black leading-none tabular-nums glow-text">{Math.round(v.speed)}</div>
              <div className="text-xl font-bold tracking-[0.3em] text-muted-foreground">KM/H</div>
            </Gauge>
          </div>

          {/* road */}
          <div className="absolute left-1/2 top-[110px] h-[420px] w-[620px] -translate-x-1/2">
            <div className="absolute left-0 top-0 flex items-center gap-3 rounded-xl border-4 border-foreground bg-background px-3 py-1 text-center">
              <div className="leading-none"><div className="text-[11px] font-bold">SPEED<br />LIMIT</div><div className="font-display text-3xl font-black">90</div></div>
            </div>
            <div className="absolute left-1/2 -top-2 flex -translate-x-1/2 items-center gap-3">
              <CornerUpRight className="size-14" />
              <div><div className="text-2xl font-bold">372 m</div><div className="text-sm text-accent">Enter St. Street, take first right</div></div>
            </div>
            <div className="absolute right-4 top-2 rounded-full border-2 border-primary/50 p-2"><Settings2 className="size-8 text-primary" /></div>
            <svg viewBox="0 0 620 340" className="absolute bottom-10 left-0 h-[340px] w-full">
              <defs>
                <linearGradient id="lane" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0" /><stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0.9" /></linearGradient>
                <linearGradient id="road" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0" /><stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0.25" /></linearGradient>
              </defs>
              <polygon points="270,0 350,0 600,340 20,340" fill="url(#road)" />
              <polygon points="295,0 325,0 420,340 200,340" fill="url(#lane)" opacity={0.6} />
              <line x1="270" y1="0" x2="20" y2="340" stroke="var(--color-primary)" strokeWidth="3" />
              <line x1="350" y1="0" x2="600" y2="340" stroke="var(--color-primary)" strokeWidth="3" />
              <line x1="290" y1="0" x2="180" y2="340" stroke="var(--color-foreground)" strokeOpacity=".5" strokeWidth="2" strokeDasharray="22 18" style={{ strokeDashoffset: -v.odo * 4000, transition: "none" }} />
              <line x1="330" y1="0" x2="440" y2="340" stroke="var(--color-foreground)" strokeOpacity=".5" strokeWidth="2" strokeDasharray="22 18" style={{ strokeDashoffset: -v.odo * 4000 }} />
            </svg>
            <img src={carRear} alt="Lead vehicle" width={60} height={60} className="absolute left-[262px] top-[150px] w-[60px] opacity-80" />
            <img src={carRear} alt="Your vehicle" width={210} height={210} className="absolute bottom-6 left-1/2 w-[210px] -translate-x-1/2 drop-shadow-[0_10px_30px_var(--color-primary)]" />
            <div className="absolute bottom-0 left-6 flex items-center gap-2 text-xl font-bold"><MapPin className="size-6" />{v.trip.toFixed(1)} km</div>
            <div className="absolute bottom-0 right-6 flex items-center gap-2 text-xl font-bold"><Clock className="size-6" />{eta} min</div>
          </div>

          {/* bottom strip */}
          <div className="absolute bottom-0 left-1/2 flex h-[80px] w-[760px] -translate-x-1/2 items-center justify-between rounded-t-[32px] border-x border-t border-border bg-background/70 px-8">
            <div><div className="flex items-center gap-1 text-sm font-semibold text-muted-foreground">ODO <GaugeIcon className="size-4" /></div><div className="text-2xl font-bold tabular-nums">{Math.floor(v.odo)} km</div></div>
            <div className="flex items-center gap-5">
              <button onClick={() => setAdas((a) => (a + ADAS.length - 1) % ADAS.length)} aria-label="Previous"><ChevronLeft className="size-7" /></button>
              <span className="w-44 text-center font-display text-xl font-bold tracking-wider">{ADAS[adas]}</span>
              <button onClick={() => setAdas((a) => (a + 1) % ADAS.length)} aria-label="Next"><ChevronRight className="size-7" /></button>
            </div>
            <div className="text-right">
              <div className={`text-sm font-bold ${v.mode === "ECO" ? "text-success" : v.mode === "SPORT" ? "text-destructive" : "text-accent"}`}>{v.mode}</div>
              <div className="text-xl font-bold">CRUISE <span className="tabular-nums">{v.cruise}</span><span className="text-sm"> km/h</span></div>
            </div>
          </div>
        </section>

        {/* ================= BOTTOM ROW ================= */}
        <div className="absolute bottom-6 left-6 right-6 top-[670px] grid grid-cols-[1.25fr_1fr_1fr] gap-6">
          {/* NAV */}
          <section className="hmi-panel relative overflow-hidden p-6">
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                {(["map", "route", "places"] as const).map((k) => (
                  <button key={k} onClick={() => setNavTab(k)} className={`rounded-full px-5 py-2 text-sm font-semibold uppercase tracking-widest transition ${navTab === k ? "bg-primary text-primary-foreground shadow-[var(--glow)]" : "bg-secondary text-muted-foreground"}`}>{k}</button>
                ))}
              </div>
              <div className="flex items-center gap-2 rounded-full bg-secondary px-4 py-2 text-sm text-muted-foreground"><Search className="size-4" />Search destination</div>
            </div>
            {navTab === "map" && (
              <div className="relative mt-4 h-[270px] overflow-hidden rounded-2xl border border-border bg-background">
                <svg viewBox="0 0 700 270" className="absolute inset-0 h-full w-full">
                  {Array.from({ length: 14 }).map((_, i) => <line key={`v${i}`} x1={i * 55} y1={0} x2={i * 55 - 60} y2={270} stroke="var(--color-border)" />)}
                  {Array.from({ length: 6 }).map((_, i) => <line key={`h${i}`} x1={0} y1={i * 50} x2={700} y2={i * 50 + 20} stroke="var(--color-border)" />)}
                  <path d="M0 200 C 150 180, 250 240, 380 150 S 600 60, 700 90" stroke="var(--color-secondary)" strokeWidth="18" fill="none" />
                  <path d="M120 270 L 230 160 L 380 150 L 470 60" stroke="var(--color-primary)" strokeWidth="7" fill="none" strokeLinecap="round" style={{ filter: "drop-shadow(0 0 8px var(--color-primary))" }} />
                  <circle cx="470" cy="60" r="10" fill="var(--color-destructive)" />
                </svg>
                <div className="absolute bottom-[28px] left-[150px] flex size-10 items-center justify-center rounded-full bg-primary shadow-[var(--glow)]"><Navigation className="size-5 fill-primary-foreground text-primary-foreground" /></div>
                <div className="absolute right-4 top-4 rounded-xl bg-card/90 px-4 py-2 text-sm"><div className="font-bold">Tech Park, Gate 2</div><div className="text-muted-foreground">{v.trip.toFixed(1)} km · {eta} min</div></div>
              </div>
            )}
            {navTab === "route" && (
              <ul className="mt-4 space-y-3">
                {[["Turn right onto St. Street", "372 m"], ["Continue on Ring Rd", "2.1 km"], ["Keep left at fork", "1.2 km"], ["Arrive at Tech Park, Gate 2", "0.4 km"]].map(([a, b], i) => (
                  <li key={a} className={`flex items-center justify-between rounded-xl px-4 py-3 ${i === 0 ? "bg-primary/20 text-foreground" : "bg-secondary/60 text-muted-foreground"}`}><span className="flex items-center gap-3"><CornerUpRight className="size-5" />{a}</span><span className="font-semibold">{b}</span></li>
                ))}
              </ul>
            )}
            {navTab === "places" && (
              <div className="mt-4 grid grid-cols-2 gap-3">
                {[[Home, "Home", "12 min"], [Briefcase, "Work", "22 min"], [Coffee, "Blue Tokai Café", "6 min"], [Zap, "EV Charger", "4 min"]].map(([I, n, d]) => {
                  const Icon = I as typeof Home;
                  return <button key={n as string} onClick={() => setNavTab("map")} className="flex items-center gap-3 rounded-2xl bg-secondary/60 p-4 text-left transition hover:bg-primary/20"><Icon className="size-7 text-primary" /><div><div className="font-semibold">{n as string}</div><div className="text-sm text-muted-foreground">{d as string}</div></div></button>;
                })}
              </div>
            )}
          </section>

          {/* MEDIA */}
          <section className="hmi-panel flex flex-col p-6">
            <div className="flex gap-5">
              <img src={album} alt="Album art" width={150} height={150} className={`size-[150px] rounded-2xl object-cover shadow-[var(--glow)] ${playing ? "" : "opacity-60"}`} />
              <div className="flex min-w-0 flex-1 flex-col justify-center">
                <div className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">Now playing · Bluetooth</div>
                <div className="mt-2 truncate text-2xl font-bold">{t.title}</div>
                <div className="text-lg text-muted-foreground">{t.artist}</div>
                <div className="mt-3 flex items-end gap-1 h-6">
                  {Array.from({ length: 18 }).map((_, i) => <span key={i} className="w-1.5 rounded-full bg-primary transition-all" style={{ height: playing ? `${20 + ((Math.sin(pos * 3 + i) + 1) * 40)}%` : "15%" }} />)}
                </div>
              </div>
              <button onClick={() => setLiked((l) => !l)} aria-label="Like" className="self-start"><Heart className={`size-6 ${liked ? "fill-destructive text-destructive" : "text-muted-foreground"}`} /></button>
            </div>
            <div className="mt-5">
              <input type="range" min={0} max={t.dur} value={pos} onChange={(e) => setPos(+e.target.value)} className="w-full accent-[var(--color-primary)]" aria-label="Seek" />
              <div className="flex justify-between text-sm tabular-nums text-muted-foreground"><span>{fmt(pos)}</span><span>{fmt(t.dur)}</span></div>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <Shuffle className="size-6 text-muted-foreground" />
              <button onClick={() => { setTrack((x) => (x + TRACKS.length - 1) % TRACKS.length); setPos(0); }} aria-label="Previous track"><SkipBack className="size-8 fill-foreground" /></button>
              <button onClick={() => setPlaying((p) => !p)} aria-label="Play/Pause" className="flex size-[72px] items-center justify-center rounded-full border-2 border-foreground shadow-[var(--glow)] transition active:scale-95">
                {playing ? <Pause className="size-8 fill-foreground" /> : <Play className="ml-1 size-8 fill-foreground" />}
              </button>
              <button onClick={() => { setTrack((x) => (x + 1) % TRACKS.length); setPos(0); }} aria-label="Next track"><SkipForward className="size-8 fill-foreground" /></button>
              <Repeat className="size-6 text-muted-foreground" />
            </div>
            <div className="mt-auto flex items-center gap-3"><Volume2 className="size-5 text-muted-foreground" /><input type="range" min={0} max={1} step={0.01} value={vol} onChange={(e) => setVol(+e.target.value)} className="flex-1 accent-[var(--color-primary)]" aria-label="Volume" /><span className="w-10 text-right text-sm tabular-nums">{Math.round(vol * 100)}</span></div>
          </section>

          {/* VEHICLE STATUS */}
          <section className="hmi-panel flex flex-col p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold tracking-widest">VEHICLE</h2>
              <div className="flex gap-1 rounded-full bg-secondary p-1">
                {(["ECO", "COMFORT", "SPORT"] as DriveMode[]).map((m) => (
                  <button key={m} onClick={() => v.setMode(m)} className={`rounded-full px-3 py-1 text-xs font-bold tracking-wider transition ${v.mode === m ? "bg-primary text-primary-foreground shadow-[var(--glow)]" : "text-muted-foreground"}`}>{m}</button>
                ))}
              </div>
            </div>
            <div className="mt-3 flex gap-4">
              <div className="relative h-[96px] w-[110px] shrink-0">
                <Car className="absolute inset-0 m-auto size-14 text-primary" strokeWidth={1} />
                {[["left-0 top-2", 33], ["right-0 top-2", 33], ["left-0 bottom-2", 28], ["right-0 bottom-2", 33]].map(([p, psi], i) => (
                  <div key={i} className={`absolute ${p} rounded-md px-1.5 text-sm font-bold tabular-nums ${psi === 28 && !acked.includes("tpms") ? "bg-warning/20 text-warning" : "bg-secondary text-foreground"}`}>{psi}</div>
                ))}
              </div>
              <div className="grid flex-1 grid-cols-2 gap-2 text-sm">
                <Stat icon={<Fuel className="size-4" />} k="Range" val={`${Math.round(v.fuel * 640)} km`} />
                <Stat icon={<Thermometer className="size-4" />} k="Coolant" val="88°C" />
                <Stat icon={<BatteryCharging className="size-4" />} k="Battery" val="12.1 V" />
                <Stat icon={<Timer className="size-4" />} k="Avg" val="16.4 km/l" />
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs font-semibold uppercase tracking-widest text-muted-foreground"><span>Diagnostics</span><span>{active.length} active</span></div>
            <ul className="mt-2 flex-1 space-y-1.5 overflow-hidden">
              {ALERTS.map((a) => {
                const done = acked.includes(a.id);
                return (
                  <li key={a.id}>
                    <button onClick={() => setAlertOpen(a)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-1 text-left transition ${done ? "bg-secondary/30 opacity-50" : "bg-secondary/70 hover:bg-primary/15"}`}>
                      <a.icon className={`size-5 ${done ? "text-muted-foreground" : alertColor(a.level)}`} />
                      <span className="flex-1 font-medium">{a.label}</span>
                      <span className="text-xs text-muted-foreground">{done ? "Ack" : a.level.toUpperCase()}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <HoldBtn label="Accelerate ▲" onDown={() => v.setThrottle("accel")} onUp={() => v.setThrottle(null)} />
              <HoldBtn label="Brake ▼" onDown={() => v.setThrottle("brake")} onUp={() => v.setThrottle(null)} />
            </div>
          </section>
        </div>

        {alertOpen && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm" onClick={() => setAlertOpen(null)}>
            <div className="hmi-panel w-[520px] p-8" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4"><alertOpen.icon className={`size-12 ${alertColor(alertOpen.level)}`} /><div><div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">{alertOpen.level}</div><div className="text-2xl font-bold">{alertOpen.label}</div></div></div>
                <button onClick={() => setAlertOpen(null)} aria-label="Close"><X className="size-6" /></button>
              </div>
              <p className="mt-4 text-lg text-muted-foreground">{alertOpen.detail}</p>
              <div className="mt-6 flex justify-end gap-3">
                <button onClick={() => setAlertOpen(null)} className="rounded-full bg-secondary px-6 py-2 font-semibold">Later</button>
                <button onClick={() => { setAcked((a) => [...new Set([...a, alertOpen.id])]); setAlertOpen(null); }} className="rounded-full bg-primary px-6 py-2 font-semibold text-primary-foreground shadow-[var(--glow)]">Acknowledge</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ icon, k, val }: { icon: React.ReactNode; k: string; val: string }) {
  return <div className="rounded-xl bg-secondary/60 px-3 py-1"><div className="flex items-center gap-1 text-muted-foreground">{icon}{k}</div><div className="font-bold tabular-nums">{val}</div></div>;
}
function HoldBtn({ label, onDown, onUp }: { label: string; onDown: () => void; onUp: () => void }) {
  return <button onPointerDown={onDown} onPointerUp={onUp} onPointerLeave={onUp} className="rounded-xl border border-primary/40 bg-primary/10 py-2 text-sm font-bold tracking-wider text-primary active:bg-primary active:text-primary-foreground">{label}</button>;
}
function SideBar({ side, value, icon }: { side: "left" | "right"; value: number; icon: React.ReactNode }) {
  const left = side === "left";
  return (
    <div className={`absolute top-[230px] flex flex-col items-center gap-3 ${left ? "left-[52px]" : "right-[52px]"}`}>
      {icon}
      <div className="relative h-[300px] w-5 overflow-hidden rounded-full bg-secondary">
        <div className="absolute bottom-0 w-full rounded-full transition-all" style={{ height: `${value * 100}%`, background: left ? "linear-gradient(to top, var(--color-primary), var(--color-warning), var(--color-destructive))" : "linear-gradient(to top, var(--color-destructive), var(--color-primary), var(--color-accent))", boxShadow: "var(--glow)" }} />
      </div>
      <span className="text-sm font-bold tabular-nums text-muted-foreground">{Math.round(value * 100)}%</span>
    </div>
  );
}
