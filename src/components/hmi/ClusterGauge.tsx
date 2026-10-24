const START = 135;
const SWEEP = 270;
const MAX_RPM = 8; // display scale (x1000 rpm); not a safety threshold
const REDLINE = 6.5; // display scale marker only

function polar(cx: number, cy: number, r: number, deg: number) {
  const a = (deg * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)] as const;
}
function arc(cx: number, cy: number, r: number, from: number, to: number) {
  const [x1, y1] = polar(cx, cy, r, from);
  const [x2, y2] = polar(cx, cy, r, to);
  return `M ${x1} ${y1} A ${r} ${r} 0 ${to - from > 180 ? 1 : 0} 1 ${x2} ${y2}`;
}

interface Props {
  /** RPM as provided by the backend; null = unavailable. */
  rpm: number | null;
  /** Pre-formatted speed display value ("--" when unavailable). */
  speed: string;
  unit: string;
  /** Gear is not supplied by the backend; always "--" until it is. */
  gearLabel: string;
  size?: number;
}

/** Dominant central motorsport cluster: RPM arc, live speed, gear. */
export function ClusterGauge({ rpm, speed, unit, gearLabel, size = 640 }: Props) {
  const c = size / 2;
  const v = rpm === null ? null : Math.max(0, Math.min(MAX_RPM, rpm / 1000));
  const ang = v === null ? START : START + (v / MAX_RPM) * SWEEP;
  const labels = [0, 1, 2, 3, 4, 5, 6, 7, 8];
  return (
    <div
      className="relative"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Instrument cluster. Speed ${speed} ${unit}. ${rpm === null ? "RPM unavailable" : `RPM ${Math.round(rpm)}`}. Gear ${gearLabel}.`}
    >
      <svg viewBox={`0 0 ${size} ${size}`} className="absolute inset-0">
        <defs>
          <radialGradient id="cluster-face" cx="50%" cy="42%" r="65%">
            <stop offset="0%" stopColor="var(--color-secondary)" />
            <stop offset="70%" stopColor="var(--color-card)" />
            <stop offset="100%" stopColor="var(--color-background)" />
          </radialGradient>
          <linearGradient id="cluster-prog" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--color-destructive)" />
            <stop offset="60%" stopColor="var(--color-primary)" />
            <stop offset="100%" stopColor="oklch(0.72 0.2 20)" />
          </linearGradient>
          <filter id="cluster-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="7" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <circle cx={c} cy={c} r={308} fill="url(#cluster-face)" stroke="var(--color-border)" />
        <circle cx={c} cy={c} r={308} fill="none" stroke="var(--color-accent)" strokeOpacity={0.25} strokeWidth={1.5} />
        {/* silver track */}
        <path d={arc(c, c, 284, START, START + SWEEP)} stroke="var(--color-accent)" strokeOpacity={0.3} strokeWidth={10} fill="none" strokeLinecap="round" />
        {/* redline zone marker */}
        <path d={arc(c, c, 284, START + (REDLINE / MAX_RPM) * SWEEP, START + SWEEP)} stroke="var(--color-primary)" strokeOpacity={0.55} strokeWidth={10} fill="none" />
        {/* live red arc */}
        {v !== null && (
          <path
            d={arc(c, c, 284, START, Math.max(START + 0.1, ang))}
            stroke="url(#cluster-prog)" strokeWidth={17} fill="none" strokeLinecap="round"
            filter="url(#cluster-glow)" style={{ transition: "all 150ms linear" }}
          />
        )}
        {/* ticks */}
        {Array.from({ length: 49 }).map((_, i) => {
          const d = START + (i / 48) * SWEEP;
          const major = i % 6 === 0;
          const [x1, y1] = polar(c, c, 268, d);
          const [x2, y2] = polar(c, c, major ? 248 : 258, d);
          const hot = d >= START + (REDLINE / MAX_RPM) * SWEEP;
          return (
            <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
              stroke={hot ? "var(--color-primary)" : "var(--color-foreground)"}
              strokeOpacity={major ? 0.95 : 0.35} strokeWidth={major ? 3 : 1.4} />
          );
        })}
        {labels.map((l, i) => {
          const d = START + (i / (labels.length - 1)) * SWEEP;
          const [x, y] = polar(c, c, 222, d);
          const lit = v !== null && l <= v;
          return (
            <text key={l} x={x} y={y} textAnchor="middle" dominantBaseline="middle"
              fontSize={26} fontWeight={700} fontFamily="var(--font-display)"
              fill={l >= REDLINE ? "var(--color-primary)" : "var(--color-foreground)"}
              fillOpacity={lit ? 1 : 0.5}>
              {l}
            </text>
          );
        })}
        <text x={c} y={c - 128} textAnchor="middle" fontSize={15} letterSpacing={4}
          fill="var(--color-muted-foreground)" fontFamily="var(--font-sans)">RPM ×1000</text>
        <circle cx={c} cy={c} r={186} fill="var(--color-background)" stroke="var(--color-border)" strokeWidth={2} />
        <circle cx={c} cy={c} r={178} fill="none" stroke="var(--color-primary)" strokeOpacity={0.22} strokeWidth={7} filter="url(#cluster-glow)" />
        {/* needle */}
        <g opacity={v === null ? 0 : 1} style={{ transform: `rotate(${ang}deg)`, transformOrigin: `${c}px ${c}px`, transition: "transform 150ms linear" }}>
          <line x1={c + 150} y1={c} x2={c + 266} y2={c} stroke="var(--color-foreground)" strokeWidth={5} strokeLinecap="round" filter="url(#cluster-glow)" />
          <circle cx={c} cy={c} r={10} fill="var(--color-foreground)" />
        </g>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {/* abstract neutral emblem (no trademarks) */}
        <svg viewBox="0 0 64 40" className="h-9 w-14 drop-shadow-[0_0_10px_var(--color-primary)]" aria-hidden>
          <path d="M32 2 L60 20 L32 38 L4 20 Z" fill="none" stroke="var(--color-primary)" strokeWidth={3} />
          <path d="M32 12 L46 20 L32 28 L18 20 Z" fill="var(--color-primary)" />
        </svg>
        <div className="mt-1 font-display text-[112px] font-black leading-none tabular-nums glow-text">{speed}</div>
        <div className="text-lg font-bold tracking-[0.45em] text-muted-foreground">{unit}</div>
        <div className="mt-3 flex items-center gap-3 rounded-xl border border-border bg-secondary/70 px-5 py-1.5">
          <span className="text-xs font-semibold tracking-[0.3em] text-muted-foreground">GEAR</span>
          <span className="font-display text-3xl font-black text-accent">{gearLabel}</span>
        </div>
        <div className="mt-2 text-sm font-semibold tabular-nums text-muted-foreground">
          {rpm === null ? "RPM --" : `${Math.round(rpm)} rpm`}
        </div>
      </div>
    </div>
  );
}
