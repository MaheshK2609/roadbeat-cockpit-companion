"""Standalone Windows/Linux TCP NDJSON to WebSocket bridge; never deployed with HMI."""
import argparse
import asyncio
import json
import logging
import math
from pathlib import Path
from websockets.asyncio.server import serve
from websockets.exceptions import ConnectionClosed


def validate_message(raw):
    data = json.loads(raw)
    if not isinstance(data, dict):
        raise ValueError("Expected object")
    for flag in ("coolant_sensor_valid", "oil_pressure_sensor_valid"):
        if type(data.get(flag)) is not bool:
            raise ValueError("Missing validity flags")
    def finite(key):
        value = data.get(key)
        return type(value) in (int, float) and math.isfinite(value)
    for field, flag in (("coolant_temperature_c", "coolant_sensor_valid"), ("oil_pressure", "oil_pressure_sensor_valid")):
        if data[flag] and not finite(field):
            raise ValueError("Invalid sensor number")
        if not data[flag]:
            data[field] = None
    unit = data.get("oil_pressure_unit")
    if not isinstance(unit, str) or (data["oil_pressure_sensor_valid"] and not unit.strip()):
        raise ValueError("Missing pressure unit")
    speed = data.get("speed_kmh")
    if speed is not None and (not finite("speed_kmh") or speed < 0):
        raise ValueError("Invalid speed")
    seq = data.get("sequence")
    if not (type(seq) is int and seq >= 0) and not isinstance(data.get("timestamp"), str):
        raise ValueError("Sequence or timestamp required")
    return json.dumps(data, allow_nan=False, separators=(",", ":"))


async def run(config):
    clients = set()
    gateway_active = False
    async def close_browsers(reason):
        await asyncio.gather(*(ws.close(code=1012, reason=reason) for ws in list(clients)), return_exceptions=True)
    async def browser(ws):
        clients.add(ws)
        try:
            await ws.wait_closed()
        finally:
            clients.discard(ws)
    async def gateway(reader, writer):
        nonlocal gateway_active
        peer = writer.get_extra_info("peername")
        permitted = not config["stm32_ip"] or (peer and peer[0] == config["stm32_ip"])
        if not permitted or gateway_active:
            writer.close()
            await writer.wait_closed()
            return
        gateway_active = True
        logging.info("Gateway TCP client accepted (not proof of physical sensor operation)")
        try:
            while True:
                raw = await asyncio.wait_for(reader.readline(), config["gateway_timeout_seconds"])
                if not raw:
                    break
                if len(raw) > config["max_message_bytes"] or not raw.endswith(b"\n"):
                    raise ValueError("Oversize or unterminated NDJSON")
                try:
                    message = validate_message(raw.decode("utf-8"))
                except (ValueError, UnicodeError):
                    # Forward a malformed event, never last-known good data.
                    message = '{"receiver_error":"Invalid gateway message"}'
                    logging.warning("Invalid gateway message rejected")
                await asyncio.gather(*(ws.send(message) for ws in list(clients)), return_exceptions=True)
        except (TimeoutError, ValueError, ConnectionError, ConnectionClosed):
            logging.warning("Gateway disconnected, timed out, or framing failed")
        finally:
            gateway_active = False
            await close_browsers("Gateway unavailable")
            writer.close()
            await writer.wait_closed()
    async with serve(browser, config["websocket_bind"], config["websocket_port"], origins=config["allowed_origins"], max_size=config["max_message_bytes"]):
        server = await asyncio.start_server(gateway, config["pc_tcp_bind"], config["tcp_port"], limit=config["max_message_bytes"])
        logging.info("Receiver ready; awaiting gateway messages")
        async with server:
            await server.serve_forever()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", type=Path, default=Path(__file__).with_name("config.example.json"))
    args = parser.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s")
    try:
        asyncio.run(run(json.loads(args.config.read_text(encoding="utf-8"))))
    except KeyboardInterrupt:
        pass
