import { useEffect, useRef, useState } from "react";

export type DriveMode = "ECO" | "COMFORT" | "SPORT";

const RATIOS = [0, 3.6, 2.1, 1.4, 1.0, 0.8, 0.65];
const SHIFT_UP = [0, 20, 40, 60, 85, 115, 999];

export function gearFor(speed: number) {
  let g = 1;
  while (g < 6 && speed > (SHIFT_UP[g] ?? Infinity)) g++;
  return g;
}
export function rpmFor(speed: number, gear: number) {
  return Math.min(8, 0.8 + (speed * (RATIOS[gear] ?? 0)) / 28);
}

export function useVehicle(enabled = true) {
  const [speed, setSpeed] = useState(82);
  const [throttle, setThrottle] = useState<"accel" | "brake" | "cruise" | null>(null);
  const [mode, setMode] = useState<DriveMode>("ECO");
  const [fuel, setFuel] = useState(0.62);
  const [temp] = useState(0.48);
  const [odo, setOdo] = useState(4215.0);
  const [trip, setTrip] = useState(4.1);
  const target = useRef(82);

  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => {
      setSpeed((s) => {
        const max = mode === "SPORT" ? 220 : mode === "COMFORT" ? 180 : 140;
        const acc = mode === "SPORT" ? 1.6 : mode === "COMFORT" ? 1.0 : 0.6;
        let n = s;
        if (throttle === "accel") n = s + acc;
        else if (throttle === "brake") n = s - 2.5;
        else n = s + (target.current - s) * 0.04;
        n = Math.max(0, Math.min(max, n));
        if (throttle) target.current = n;
        const km = n / 3600 / 10;
        setOdo((o) => o + km);
        setTrip((t) => Math.max(0, t - km));
        setFuel((f) => Math.max(0.05, f - km * 0.0015));
        return n;
      });
    }, 100);
    return () => clearInterval(id);
  }, [throttle, mode, enabled]);

  const gear = speed < 0.5 ? 0 : gearFor(speed);
  const rpm = gear === 0 ? 0.8 : rpmFor(speed, gear);
  const setSimulationSpeed = (value: number) => { target.current = value; setSpeed(value); setThrottle(null); };
  return { speed, rpm, gear, mode, setMode, fuel, temp, odo, trip, throttle, setThrottle, setSimulationSpeed, cruise: Math.round(target.current) };
}
