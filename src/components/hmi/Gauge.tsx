import type { ReactNode } from "react";

const START = 135;
const SWEEP = 270;

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
  value: number | null;
  max: number;
  labels: number[];
  redFrom: number;
  id: string;
  children: ReactNode;
  footer?: ReactNode;
  onClick?: () => void;
}

export function Gauge({ value, max, labels, redFrom, id, children, footer, onClick }: Props) {
  const size = 500;
  const c = size / 2;
  const v = Math.max(0, Math.min(max, value ?? 0));
  const ang = START + (v / max) * SWEEP;
  const minor = 40;
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative shrink-0 cursor-pointer rounded-full outline-none transition-transform active:scale-[0.99]"
      style={{ width: size, height: size }}
      aria-label={id}
    >
      <svg viewBox={`0 0 ${size} ${size}`} className="absolute inset-0">
        <defs>
          <radialGradient id={`${id}-face`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--color-background)" />
            <stop offset="70%" stopColor="var(--color-card)" />
            <stop offset="100%" stopColor="var(--color-secondary)" />
          </radialGradient>
          <linearGradient id={`${id}-prog`} x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--color-primary)" />
            <stop offset="70%" stopColor="var(--color-accent)" />
            <stop offset="100%" stopColor="var(--color-destructive)" />
          </linearGradient>
          <filter id={`${id}-glow`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <circle cx={c} cy={c} r={238} fill={`url(#${id}-face)`} stroke="var(--color-border)" />
        {/* outer rim glow: blue base, red zone */}
        <path d={arc(c, c, 232, START, START + SWEEP)} stroke="var(--color-primary)" strokeOpacity={0.35} strokeWidth={4} fill="none" filter={`url(#${id}-glow)`} />
        <path d={arc(c, c, 232, START + (redFrom / max) * SWEEP, START + SWEEP)} stroke="var(--color-destructive)" strokeWidth={4} fill="none" filter={`url(#${id}-glow)`} />
        {/* progress */}
        <path d={arc(c, c, 205, START, Math.max(START + 0.1, ang))} stroke={`url(#${id}-prog)`} strokeWidth={14} strokeOpacity={0.35} fill="none" strokeLinecap="round" style={{ transition: "all 120ms linear" }} />
        {Array.from({ length: minor + 1 }).map((_, i) => {
          const d = START + (i / minor) * SWEEP;
          const major = i % (minor / (labels.length - 1)) === 0;
          const [x1, y1] = polar(c, c, 222, d);
          const [x2, y2] = polar(c, c, major ? 206 : 214, d);
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--color-foreground)" strokeOpacity={major ? 0.9 : 0.35} strokeWidth={major ? 2.5 : 1.2} />;
        })}
        {labels.map((l, i) => {
          const d = START + (i / (labels.length - 1)) * SWEEP;
          const [x, y] = polar(c, c, 178, d);
          const lit = l <= v;
          return (
            <text key={l} x={x} y={y} textAnchor="middle" dominantBaseline="middle" fontSize={22} fontWeight={600} fontFamily="var(--font-sans)" fill="var(--color-foreground)" fillOpacity={lit ? 1 : 0.55}>
              {l}
            </text>
          );
        })}
        <circle cx={c} cy={c} r={135} fill="var(--color-background)" stroke="var(--color-border)" strokeWidth={2} />
        <circle cx={c} cy={c} r={128} fill="none" stroke="var(--color-primary)" strokeOpacity={0.25} strokeWidth={8} filter={`url(#${id}-glow)`} />
        {/* needle */}
        <g opacity={value === null ? 0 : 1} style={{ transform: `rotate(${ang}deg)`, transformOrigin: `${c}px ${c}px`, transition: "transform 120ms linear" }}>
          <line x1={c + 140} y1={c} x2={c + 222} y2={c} stroke="var(--color-foreground)" strokeWidth={4} strokeLinecap="round" filter={`url(#${id}-glow)`} />
        </g>
        <ellipse cx={c} cy={c + 95} rx={70} ry={18} fill="var(--color-primary)" opacity={0.35} filter={`url(#${id}-glow)`} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
      {footer && <div className="absolute inset-x-0 bottom-6 text-center">{footer}</div>}
    </button>
  );
}
