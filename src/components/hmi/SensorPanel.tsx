import { useState } from "react";
import { Settings2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { useSensors } from "./useSensors";
export function sensorValue(value: number | null, unit: string) { return value === null ? "—" : `${value.toFixed(1)} ${unit}`; }
function Trace({ values, label }: { values: (number | null)[]; label: string }) {
  const finite = values.filter((x): x is number => x !== null);
  const low = Math.min(...finite), high = Math.max(...finite);
  const segments: string[][] = [[]];
  values.forEach((v, i) => { if (v === null) segments.push([]); else segments[segments.length - 1]?.push(`${10 + i * 380 / Math.max(1, values.length - 1)},${65 - (v - low) / Math.max(1, high - low) * 50}`); });
  return <svg role="img" aria-label={label} viewBox="0 0 400 80" className="h-20 w-full border-b border-border">{segments.map((p, i) => <polyline key={i} points={p.join(" ")} fill="none" stroke="var(--color-primary)" strokeWidth="2" />)}{!finite.length && <text x="200" y="45" textAnchor="middle" fill="var(--color-muted-foreground)" fontSize="14">NO DATA</text>}</svg>;
}
export function SensorPanel({ sensors, simulationSpeed, setSimulationSpeed }: { sensors: ReturnType<typeof useSensors>; simulationSpeed: number; setSimulationSpeed: (n: number) => void }) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState(sensors.config.url);
  const [reconnect, setReconnect] = useState(sensors.config.reconnectMs);
  const [stale, setStale] = useState(sensors.config.staleMs);
  const simulated = sensors.dataMode === "SIMULATION";
  return <>
    <Button variant="ghost" onClick={() => setOpen(true)} aria-label="Sensor connection settings" className="absolute bottom-[100px] right-12 h-9 gap-2 text-xs tracking-wider"><span className={`size-2 rounded-full ${sensors.status === "CONNECTED" ? "bg-success" : simulated ? "bg-primary" : "bg-warning"}`} />{sensors.status}<Settings2 /></Button>
    {open && <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"><section role="dialog" aria-modal="true" aria-label="Sensor connection" className="hmi-panel w-[900px] p-8">
      <div className="flex items-center justify-between"><h2 className="font-display text-2xl">SENSOR CONNECTION</h2><Button variant="ghost" size="icon" aria-label="Close sensor settings" onClick={() => setOpen(false)}><X /></Button></div>
      <div className="mt-5 flex items-center justify-between"><div className="flex gap-2">{(["SIMULATION", "HARDWARE"] as const).map((m) => <Button key={m} variant={sensors.dataMode === m ? "default" : "secondary"} aria-pressed={sensors.dataMode === m} onClick={() => sensors.setDataMode(m)}>{m}</Button>)}</div><span role="status" className={sensors.status === "CONNECTED" ? "text-success" : "text-warning"}>{sensors.status}</span></div>
      <div className="mt-4 flex justify-between text-sm text-muted-foreground"><span>Last successful update</span><time>{sensors.lastUpdate ? new Date(sensors.lastUpdate).toLocaleTimeString() : "—"}</time></div>
      {sensors.error && <p role="alert" className="mt-2 text-warning">{sensors.error}</p>}
      <form className="mt-5 grid grid-cols-[2fr_1fr_1fr_auto] items-end gap-3" onSubmit={(e) => { e.preventDefault(); sensors.setConfig({ url: url.trim(), reconnectMs: reconnect, staleMs: stale }); }}>
        <label className="text-sm text-muted-foreground">WebSocket URL<input aria-label="WebSocket URL" required type="url" value={url} onChange={(e) => setUrl(e.target.value)} className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-foreground" /></label>
        <label className="text-sm text-muted-foreground">Reconnect (ms)<input aria-label="Reconnect milliseconds" type="number" min="100" required value={reconnect} onChange={(e) => setReconnect(Number(e.target.value))} className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-foreground" /></label>
        <label className="text-sm text-muted-foreground">Data timeout (ms)<input aria-label="Data timeout milliseconds" type="number" min="100" required value={stale} onChange={(e) => setStale(Number(e.target.value))} className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-foreground" /></label><Button type="submit" className="h-10">Apply</Button>
      </form>
      <div className="mt-6 grid grid-cols-2 gap-6"><div><div className="text-muted-foreground">Coolant · DS18B20</div><div className="mt-1 text-3xl tabular-nums">{sensorValue(sensors.reading.coolant_temperature_c, "°C")}</div><Trace label="Coolant history" values={sensors.history.map((r) => r.coolant_temperature_c)} /><div className="mt-2 text-xs text-muted-foreground">{simulated ? "SIMULATION · PLACEHOLDER" : sensors.reading.coolant_sensor_valid ? "VALID SENSOR" : "UNAVAILABLE / INVALID SENSOR"}</div></div><div><div className="text-muted-foreground">Oil pressure</div><div className="mt-1 text-3xl tabular-nums">{sensorValue(sensors.reading.oil_pressure, sensors.reading.oil_pressure_unit)}</div><Trace label="Oil pressure history" values={sensors.history.map((r) => r.oil_pressure)} /><div className="mt-2 text-xs text-muted-foreground">{simulated ? "SIMULATION · PLACEHOLDER" : sensors.reading.oil_pressure_sensor_valid ? "VALID SENSOR" : "UNAVAILABLE / INVALID SENSOR"}</div></div></div>
      <p className="mt-4 text-sm text-muted-foreground">Calibration and safety thresholds: unverified</p>
      {simulated && <div className="mt-5 border-t border-border pt-4"><div className="mb-3 flex justify-between text-sm"><span>SIMULATED SPEED</span><span>{Math.round(simulationSpeed)} km/h</span></div><div className="flex gap-3">{[0, 20, 50, 80, 120].map((n) => <Button variant="secondary" key={n} onClick={() => setSimulationSpeed(n)}>{n} km/h</Button>)}</div></div>}
    </section></div>}
  </>;
}
