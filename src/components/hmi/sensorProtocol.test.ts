import { describe, expect, it } from "vitest";
import { advanceRoad, parseSensorMessage, roadRate } from "./sensorProtocol";
const packet = { coolant_temperature_c: null, oil_pressure: null, oil_pressure_unit: "", coolant_sensor_valid: false, oil_pressure_sensor_valid: false, sequence: 1 };
describe("hardware protocol", () => {
  it("keeps missing speed unavailable rather than simulated", () => { expect(parseSensorMessage(JSON.stringify(packet)).speed_kmh).toBeNull(); });
  it("does not expose invalid sensor values", () => { expect(parseSensorMessage(JSON.stringify({ ...packet, coolant_temperature_c: 999, oil_pressure: 999 }))).toMatchObject({ coolant_temperature_c: null, oil_pressure: null }); });
  it("requires verified units for valid oil data", () => { expect(() => parseSensorMessage(JSON.stringify({ ...packet, oil_pressure_sensor_valid: true, oil_pressure: 1 }))).toThrow(); });
  it("requires sequence or timestamp", () => { expect(() => parseSensorMessage(JSON.stringify({ ...packet, sequence: undefined }))).toThrow(); });
  it("accepts numeric sensor and shared speed fields as software test fixtures", () => { expect(parseSensorMessage(JSON.stringify({ ...packet, coolant_sensor_valid: true, coolant_temperature_c: 37.25, oil_pressure_sensor_valid: true, oil_pressure: 2.5, oil_pressure_unit: "test-unit", speed_kmh: 80 }))).toMatchObject({ coolant_temperature_c: 37.25, oil_pressure: 2.5, speed_kmh: 80 }); });
});
describe("speed-linked road", () => {
  it.each([0, 20, 50, 80, 120])("moves proportionally at %s km/h", (speed) => { expect(roadRate(speed)).toBe(speed * 0.9); });
  it("stops at zero without moving the road", () => { expect(advanceRoad(72, 12, 0, 0.05)).toEqual({ rate: 0, offset: 12 }); });
  it("stops when hardware speed is missing", () => { expect(advanceRoad(72, 12, null, 0.05)).toEqual({ rate: 0, offset: 12 }); });
  it("interpolates speed changes rather than jumping", () => { const n = advanceRoad(18, 0, 120, 0.016); expect(n.rate).toBeGreaterThan(18); expect(n.rate).toBeLessThan(108); });
});
