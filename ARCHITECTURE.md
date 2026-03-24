# SinkTrace Architecture

## Overview

SinkTrace is a client-side React app that simulates pressure monitoring across a Martin County, KY municipal water grid. It runs in two modes: **simulate** (local Darcy-Weisbach physics, 3 s interval) and **live** (polls `GET /api/nodes` every 5 s).

---

## Data Flow

```
sampleNodes.json ──► useNodes()         (load + validate from localStorage or fallback)
pipeEdges.json   ──┐      │
                   │      ▼
                   └──► useNodeData(mode, { flagThreshold })
                              │
                   ┌──────────┴────────────┐
              simulate mode            live mode
                   │                       │
                   ▼                       ▼
            simulateFlow()          fetch('/api/nodes')
            BFS + DW drop           validateNodes()
            flagging FSM            [no localStorage write]
                   │
                   ▼
          localStorage.setItem()  (only on change)
                   │
                   └──────────┬────────────┘
                              ▼
                           App.jsx
                         /        \
                    GridMap      MapView
               (pressure cards)  (Leaflet map)
```

---

## Module Responsibilities

### Data

| File | Purpose |
|------|---------|
| `src/data/sampleNodes.json` | 11 Martin County nodes — 1 source, 2 junctions, 8 endpoints. Each has `type`, `label`, `pressure`, `flowDirection`, `coords`. |
| `src/data/pipeEdges.json` | 10 directed pipe edges — `from`, `to`, `lengthMeters`, `diameterMm`, `resistanceCoeff`. Forms a dead-end tree (no loops). |

### Utils

| File | Purpose |
|------|---------|
| `src/utils/constants.js` | Single source of truth: `PRESSURE_MIN=30`, `PRESSURE_MAX=120`, `HISTORY_MAX=10`, `CONSECUTIVE_TICKS_THRESHOLD=3`. Imported by both simulation and validation layers. |
| `src/utils/simulateFlow.js` | BFS pressure propagation from source nodes using Darcy-Weisbach (f=0.02, v=0.5 m/s, ρ=998 kg/m³). Tracks `consecutiveLowTicks` per node; flags after N consecutive below-threshold ticks. Detects reversed flow. Re-exports constants for consumers. |
| `src/utils/schema.js` | Zod schemas for node validation. `validateNodes(raw)` is the single entry point for all external data (localStorage, API). Imports `PRESSURE_MAX` from `constants.js`. |
| `src/utils/colors.js` | `COLOR_SAFE`, `COLOR_WARNING`, `COLOR_CRITICAL`, `getPressureColor(psi)`. |
| `src/utils/trend.js` | `getTrend(history)` — classifies last 3 readings as `'falling'`, `'rising'`, or `'stable'`. |
| `src/utils/storageKeys.js` | `NODES_KEY = 'sinktrace-nodes'`. |

### Hooks

| File | Purpose |
|------|---------|
| `src/hooks/useNodes.js` | Loads and validates initial node state from localStorage, falls back to `sampleNodes.json`. Returns memoized `{ nodes }` — never updates after mount. |
| `src/hooks/useNodeData.js` | Orchestrates continuous node state. Returns `{ nodes, error, lastUpdated, tick }`. In simulate mode, writes back to localStorage on change. In live mode, retains last known state on fetch error. |

### Components

| File | Purpose |
|------|---------|
| `src/App.jsx` | Root. Holds `mode`, `view`, `flagThreshold`, `logEntries`. Derives log entries from node transitions via `useEffect`. Renders controls and view. |
| `src/components/GridMap.jsx` | `React.memo` grid of pressure cards. Shows label, type badge, trend arrow, flow direction, flagged alert. WCAG-compliant (ARIA, keyboard focus). |
| `src/components/MapView.jsx` | Leaflet map bounded to Kentucky. Markers sized and colored by node type: source=blue/large, junction=gray/medium, endpoint=pressure-based/small. |
| `src/components/MapErrorBoundary.jsx` | Error boundary wrapping `MapView`. |

---

## Simulation Pipeline

```
simulateFlow({ nodes, edges, consecutiveTicks })
    │
    ├─ 1. Build outgoing-edge adjacency map
    │
    ├─ 2. BFS from all source nodes
    │       └─ Downstream pressure = upstream − ΔP
    │          ΔP = f × (L/D) × (ρv²/2) × PA_TO_PSI
    │          Multiple paths → take highest pressure
    │
    ├─ 3. Detect reversed flow
    │       └─ Mark nodes where computed gradient opposes declared edge direction
    │
    └─ 4. Per-node state machine
            ├─ pressure < PRESSURE_MIN → consecutiveLowTicks++, else reset to 0
            ├─ flagged = consecutiveLowTicks >= consecutiveTicks
            ├─ flaggedAt set on first flag tick, cleared on recovery
            └─ history[] capped at HISTORY_MAX (10 readings)
```

---

## localStorage

| Point | Operation | Guard |
|-------|-----------|-------|
| `useNodes()` init | Read `sinktrace-nodes` | Falls back to `sampleNodes.json` on missing/corrupt |
| `useNodes()` error | Remove `sinktrace-nodes` | Clears corrupt entry |
| `useNodeData()` simulate tick | Write `sinktrace-nodes` | Skip if serialized JSON unchanged (`lastSerializedRef`) |
| `useNodeData()` live mode | No write | Live data is not persisted |

---

## Zod Validation Boundary

`validateNodes(raw)` in `schema.js` is called at every external data entry point:

- `useNodes()` — localStorage or `sampleNodes.json` on init
- `useNodeData()` — API response in live mode

**Required fields:** `pressure` [0–120], `flowDirection` ('normal'|'reversed'), `coords` [lat, lng]
**Optional fields (defaulted by Zod):** `consecutiveLowTicks=0`, `flagged=false`, `flaggedAt=null`, `history`, `type`, `label`

---

## Module Dependency Graph

```
constants.js
   ├── simulateFlow.js   (imports PRESSURE_MIN/MAX, HISTORY_MAX, CONSECUTIVE_TICKS_THRESHOLD)
   └── schema.js         (imports PRESSURE_MAX)

storageKeys.js
   ├── useNodes.js
   └── useNodeData.js

sampleNodes.json ──► useNodes.js ──► useNodeData.js ──► App.jsx
pipeEdges.json   ──► useNodeData.js

simulateFlow.js  ──► useNodeData.js
schema.js        ──► useNodes.js, useNodeData.js

colors.js        ──► GridMap.jsx, MapView.jsx, MapErrorBoundary.jsx, trend.js
trend.js         ──► GridMap.jsx
```

No circular dependencies.

---

## Test Coverage

| File | Suites | What is tested |
|------|--------|---------------|
| `simulateFlow.test.js` | 6 | BFS propagation, DW drop accuracy, flagging, consecutive-ticks FSM, history, flow reversal, field preservation |
| `trend.test.js` | 1 | All trend outcomes, edge cases (< 3 readings, non-monotonic) |
| `GridMap.test.jsx` | 1 | Card rendering, flagged alert, trend badges, empty state, keyboard focus |

**Total: 33 tests passing.**

---

## Key Design Decisions

- **Deterministic simulation** — No random jitter. Pressure is fully determined by topology and Darcy-Weisbach physics. `consecutiveLowTicks` guards against phantom flags when variability is reintroduced.
- **Dead-end tree topology** — Martin County's rural network has no redundant loops, unlike urban systems. Endpoints at the end of long hollows (Lovely, Beauty) naturally fall below 30 psi.
- **`nodesRef` pattern** — Interval callbacks read from a ref, not closure state, so the interval is never rebuilt on each render.
- **`cancelled` flag in live mode** — Prevents state updates after effect teardown; handles React StrictMode double-invocation.
- **`constants.js` as neutral layer** — Avoids the validation layer depending on the simulation layer (or vice versa).
- **`appReducer` deleted** — Became dead code when `useNodeData` replaced `useReducer` in App.jsx. Simulation logic moved into the hook; log entry accumulation moved into App.jsx via `useEffect`.
