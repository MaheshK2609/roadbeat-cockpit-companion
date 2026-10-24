/**
 * Decorative red sports-car silhouette with a gentle particle effect.
 * Purely aesthetic — it is NOT telemetry and is labeled as decorative.
 */
export function SportsCar() {
  return (
    <div className="relative" aria-hidden>
      {Array.from({ length: 10 }).map((_, i) => (
        <span
          key={i}
          className="particle absolute bottom-8 size-1.5 rounded-full bg-primary"
          style={{ left: `${6 + i * 9.5}%`, animationDelay: `${(i * 0.47) % 3.2}s`, opacity: 0 }}
        />
      ))}
      <svg viewBox="0 0 480 170" className="w-full drop-shadow-[0_0_28px_var(--color-primary)]">
        <defs>
          <linearGradient id="car-body" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="oklch(0.66 0.22 20)" />
            <stop offset="55%" stopColor="oklch(0.48 0.2 22)" />
            <stop offset="100%" stopColor="oklch(0.3 0.12 24)" />
          </linearGradient>
        </defs>
        <ellipse cx="240" cy="152" rx="205" ry="12" fill="var(--color-primary)" opacity={0.16} />
        <path
          d="M28 132 C40 128 52 108 86 100 C118 74 168 58 232 58 C296 58 336 74 372 96 C412 102 442 112 452 128 C456 134 452 140 444 140 L36 140 C28 140 24 136 28 132 Z"
          fill="url(#car-body)"
        />
        <path d="M150 96 C176 74 214 66 250 66 C286 66 312 76 332 94 L300 97 L250 92 L196 96 Z" fill="oklch(0.14 0.01 270)" opacity={0.92} />
        <path d="M96 102 C130 78 176 64 232 62" fill="none" stroke="oklch(0.85 0.12 20)" strokeOpacity={0.7} strokeWidth={2} strokeLinecap="round" />
        <circle cx="122" cy="138" r="26" fill="oklch(0.1 0.005 270)" stroke="var(--color-accent)" strokeOpacity={0.55} strokeWidth={3} />
        <circle cx="122" cy="138" r="10" fill="none" stroke="var(--color-accent)" strokeOpacity={0.8} strokeWidth={2} />
        <circle cx="366" cy="138" r="26" fill="oklch(0.1 0.005 270)" stroke="var(--color-accent)" strokeOpacity={0.55} strokeWidth={3} />
        <circle cx="366" cy="138" r="10" fill="none" stroke="var(--color-accent)" strokeOpacity={0.8} strokeWidth={2} />
        <path d="M428 112 L452 121" stroke="oklch(0.95 0.05 95)" strokeWidth={4} strokeLinecap="round" opacity={0.9} />
        <path d="M32 118 L48 113" stroke="var(--color-primary)" strokeWidth={5} strokeLinecap="round" />
      </svg>
      <div className="mt-1 text-center text-[10px] font-semibold tracking-[0.35em] text-muted-foreground">
        DECORATIVE ILLUSTRATION
      </div>
    </div>
  );
}
