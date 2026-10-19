export type DataMode = "SIMULATION" | "HARDWARE";
export type ConnectionStatus = "SIMULATED DATA" | "CONNECTING" | "CONNECTED" | "DISCONNECTED" | "SENSOR ERROR";
export interface SensorReading {
  coolant_temperature_c: number | null;
  oil_pressure: number | null;
  oil_pressure_unit: string;
  coolant_sensor_valid: boolean;
  oil_pressure_sensor_valid: boolean;
  speed_kmh: number | null;
  timestamp?: string | undefined;
  sequence?: number | undefined;
}
export const EMPTY_READING: SensorReading = {
  coolant_temperature_c: null, oil_pressure: null, oil_pressure_unit: "",
  coolant_sensor_valid: false, oil_pressure_sensor_valid: false, speed_kmh: null,
};
export function parseSensorMessage(raw: string): SensorReading {
  const d: unknown = JSON.parse(raw);
  if (!d || typeof d !== "object") throw new Error("Expected a JSON object");
  const p = d as Record<string, unknown>;
  const numeric = (key: string) => typeof p[key] === "number" && Number.isFinite(p[key]);
  if (typeof p["coolant_sensor_valid"] !== "boolean" || typeof p["oil_pressure_sensor_valid"] !== "boolean") throw new Error("Missing sensor validity flags");
  if (typeof p["oil_pressure_unit"] !== "string" || (p["oil_pressure_sensor_valid"] && !p["oil_pressure_unit"].trim())) throw new Error("Oil pressure unit required");
  if (p["coolant_sensor_valid"] && !numeric("coolant_temperature_c")) throw new Error("Invalid coolant reading");
  if (p["oil_pressure_sensor_valid"] && !numeric("oil_pressure")) throw new Error("Invalid oil reading");
  if (p["speed_kmh"] != null && (!numeric("speed_kmh") || Number(p["speed_kmh"]) < 0)) throw new Error("Invalid speed");
  const sequence = numeric("sequence") && Number.isInteger(p["sequence"]) && Number(p["sequence"]) >= 0 ? Number(p["sequence"]) : undefined;
  const timestamp = typeof p["timestamp"] === "string" && Number.isFinite(Date.parse(p["timestamp"])) ? p["timestamp"] : undefined;
  if (sequence === undefined && timestamp === undefined) throw new Error("Timestamp or sequence required");
  return {
    coolant_temperature_c: p["coolant_sensor_valid"] ? Number(p["coolant_temperature_c"]) : null,
    oil_pressure: p["oil_pressure_sensor_valid"] ? Number(p["oil_pressure"]) : null,
    oil_pressure_unit: p["oil_pressure_unit"].trim(), coolant_sensor_valid: p["coolant_sensor_valid"],
    oil_pressure_sensor_valid: p["oil_pressure_sensor_valid"],
    speed_kmh: p["speed_kmh"] == null ? null : Number(p["speed_kmh"]), sequence, timestamp,
  };
}
export function roadRate(speed: number | null) {
  return speed === null || !Number.isFinite(speed) || speed <= 0 ? 0 : speed * 0.9;
}
export function advanceRoad(currentRate: number, offset: number, speed: number | null, seconds: number) {
  const target = roadRate(speed);
  if (!target) return { rate: 0, offset };
  const rate = currentRate + (target - currentRate) * (1 - Math.exp(-seconds * 5));
  return { rate, offset: (offset + rate * seconds) % 40 };
}