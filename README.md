# SinkTrace

**SinkTrace** is a pressure monitoring simulator for the Martin County, KY municipal water distribution network. It detects low-pressure conditions, reversed flow, and infrastructure anomalies across key junctions in the grid — and flags communities that fall below safe service thresholds.

Built with Vite + React. Runs entirely client-side with no backend required in simulation mode.

---

## Features

- Real-time pressure simulation using Darcy-Weisbach physics with per-pipe Hazen-Williams friction scaling
- Booster station modeling — pump nodes add pressure to downstream communities
- Consecutive-tick flagging — alerts only fire after N sustained below-threshold readings, suppressing transient noise
- Per-node configurable `pressureMin` thresholds to override the global 30 psi default
- Rolling pressure-loss log driven by `useAlerts` — each flagging event recorded once, not on every tick
- Long-term pressure history persisted to localStorage via `historyStore` (up to 100 readings per node)
- In-memory trend detection — rising, falling, or stable over last 3 readings
- Grid view with pressure cards and map view (Leaflet, bounded to Kentucky)
- Live mode: polls `GET /api/nodes` every 5 s with automatic fallback to last known state on error
- Acknowledgment fields on node schema — ready for operator workflow integration

---

## Getting Started

```bash
npm install
npm run dev
```

To run tests:

```bash
npm test
```

To build for production:

```bash
npm run build
```

---

## Simulation Model

The simulation uses a simplified Darcy-Weisbach model with uniform flow velocity (0.5 m/s). Pressure loss across each pipe is:

```
ΔP = f × (L/D) × (ρv²/2) × PA_TO_PSI
```

where `f` is scaled by the pipe's Hazen-Williams `resistanceCoeff` relative to a baseline of C = 100:

```
f = 0.02 × (100 / C)
```

Higher C (newer or smoother pipe) produces proportionally less friction loss.

Pump/booster nodes carry a `boostPressure` field (psi) that is added to outgoing pressure on each simulation tick.

**Note:** The uniform-velocity assumption is a simplification. Velocity in practice varies with pipe diameter and demand. This model is suitable for monitoring and anomaly detection, not for hydraulic design.

---

## Martin County Context

The simulated network reflects the real Martin County water system in eastern Kentucky. Several communities — particularly Lovely and Warfield — are served by long, small-diameter laterals and experience chronic low-pressure conditions. The simulation reflects this: these nodes operate below 30 psi and will flag after 3 consecutive ticks. This is consistent with documented infrastructure challenges in the region.

---

## Modes

| Mode | Description |
|------|-------------|
| `simulate` | Local DW simulation, updates every 3 s. Persists node state to localStorage on change. |
| `live` | Polls `GET /api/nodes` every 5 s. Validates response through Zod schema. Retains last known state on error. |

---

## Project Structure

```
src/
  data/           sampleNodes.json, pipeEdges.json
  utils/          constants, simulateFlow, schema, colors, trend, storageKeys, historyStore
  hooks/          useNodes, useNodeData, useAlerts
  components/     GridMap, MapView, MapErrorBoundary
```
