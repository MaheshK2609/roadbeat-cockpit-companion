import { useEffect, useRef } from "react";
import { advanceRoad } from "./sensorProtocol";

export function RoadLines({ speed }: { speed: number | null }) {
  const left = useRef<SVGLineElement>(null);
  const right = useRef<SVGLineElement>(null);
  const source = useRef(speed);
  useEffect(() => { source.current = speed; }, [speed]);
  useEffect(() => {
    let frame = 0, previous = 0, rate = 0, offset = 0;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const tick = (time: number) => {
      const dt = previous ? Math.min((time - previous) / 1000, 0.05) : 0;
      previous = time;
      const next = advanceRoad(rate, offset, reduced.matches ? null : source.current, dt);
      rate = next.rate; offset = next.offset;
      left.current?.setAttribute("stroke-dashoffset", String(-offset));
      right.current?.setAttribute("stroke-dashoffset", String(-offset));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);
  return <g data-testid="road-motion" data-speed={speed ?? "unavailable"}>
    <line ref={left} x1="290" y1="0" x2="180" y2="340" stroke="var(--color-foreground)" strokeOpacity=".5" strokeWidth="2" strokeDasharray="22 18" />
    <line ref={right} x1="330" y1="0" x2="440" y2="340" stroke="var(--color-foreground)" strokeOpacity=".5" strokeWidth="2" strokeDasharray="22 18" />
  </g>;
}