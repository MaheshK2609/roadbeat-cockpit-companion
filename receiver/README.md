# STM32 / W5500 receiver — Windows setup

This is a separate PC service, not a hosted app server. Actual Ethernet and sensor communication is **not verified**. No calibration or pressure/safety thresholds are assumed.

## 1. Run the frontend locally

Install Node.js LTS and Bun on Windows, download the project's source from Lovable (or clone your connected repository), open PowerShell in its folder:

```powershell
bun install
bun run dev -- --host 127.0.0.1 --port 8080
```

Open `http://localhost:8080`. Simulation is the default; speed uses the existing vehicle simulator. Coolant and oil pressure remain explicitly marked placeholders with no invented readings. Sensor settings include the 0/20/50/80/120 km/h speed presets.

## 2. Run the receiver

Install Python 3.11 or newer. In another PowerShell window at the project root:

```powershell
py -m venv receiver\.venv
receiver\.venv\Scripts\python.exe -m pip install -r receiver\requirements.txt
Copy-Item receiver\config.example.json receiver\config.local.json
receiver\.venv\Scripts\python.exe receiver\receiver.py --config receiver\config.local.json
```

Edit `config.local.json` before starting with your verified network settings:

- `pc_tcp_bind`: PC interface on which STM32 messages arrive. `0.0.0.0` is an example listening on all interfaces; bind a specific PC Ethernet address if possible.
- `tcp_port`: example 9000; configure STM32 to connect to this port on the **PC's actual Ethernet IP**.
- `stm32_ip`: verified STM32 gateway IP allowlist. Empty accepts any LAN sender and is development-only.
- `websocket_bind` / `websocket_port`: example localhost browser endpoint `ws://localhost:8765`.
- `allowed_origins`: exact browser origins allowed to connect. Match your local frontend URL.
- `gateway_timeout_seconds`: no-data timeout; example 5 seconds. Gateway should send more frequently.
- `max_message_bytes`: frame size limit, not a sensor range.

Configure STM32 IP, subnet, PC destination IP and TCP port in firmware/network configuration, not in frontend code. Keep both devices on a reachable subnet; allow only the chosen TCP port on the private Ethernet network in Windows Firewall. Do not expose this unauthenticated development service to the Internet. Only one gateway stream is accepted at a time.

## 3. Message contract

STM32 is a TCP client; send one UTF-8 JSON object terminated by `\n` per update. The receiver validates each line and forwards it as one WebSocket text message. It never replays buffered data to new browsers.

```json
{"coolant_temperature_c":null,"oil_pressure":null,"oil_pressure_unit":"","coolant_sensor_valid":false,"oil_pressure_sensor_valid":false,"speed_kmh":null,"sequence":1}
```

The example represents **unavailable sensors**, not measurements. Fields:

| Field | Contract |
|---|---|
| coolant_temperature_c | Finite °C number when coolant_sensor_valid is true; otherwise null |
| oil_pressure | Finite calibrated number when oil_pressure_sensor_valid is true; otherwise null |
| oil_pressure_unit | Verified unit string from firmware; must be nonempty with valid pressure |
| coolant_sensor_valid | Boolean DS18B20 reading validity |
| oil_pressure_sensor_valid | Boolean verified sensor validity |
| speed_kmh | Optional finite nonnegative number or null; no speed sensor is assumed |
| sequence | Nonnegative integer increasing per gateway connection |
| timestamp | Alternatively, an ISO 8601 UTC string; synchronize MCU and PC clocks |

Provide sequence or timestamp (or both). Browser rejects duplicate/out-of-order messages and expired timestamps. Restart sequence only with a new connection. Connection status is CONNECTING until the first accepted packet; invalid flags or malformed messages show SENSOR ERROR. Missing speed leaves the speedometer unavailable and road stationary, even if coolant and oil pressure are valid. RPM, gear, fuel, odometer and other demo vehicle telemetry are unavailable in hardware mode, not derived from live speed.

## 4. Connect the dashboard

Open **Sensor connection settings**, apply the matching WebSocket URL, reconnect interval and data timeout, then choose HARDWARE. These settings are session-only; reset on reload. The dashboard shows the last successful update, raw readings and recent autoscaled history. History is not a calibrated safety gauge. Disconnected/expired/malformed data clears readings and charts; the road stops. Reconnection is automatic, with all timers/sockets cleaned up on mode switch or unmount.

Use the local HTTP frontend for initial testing. Hosted HTTPS pages may block `ws://` mixed content and private-network access. A remotely hosted dashboard requires a properly secured reachable `wss://` endpoint and matching origin configuration, not merely changing the URL to wss. TLS/authentication for remote deployments is outside this receiver structure.

## 5. Verify physical Ethernet separately

Check link LEDs, PC and STM32 addresses and subnet, then confirm actual TCP messages reach the receiver. Confirm calibrated sensor values against independent instruments, verify validity flags, unplug Ethernet and verify unavailable readings, then reconnect. Confirm speed against a verified speed source before using it as real telemetry. Software loopback tests are not proof the STM32, W5500 or sensors work. This dashboard is not a certified vehicle safety system.
