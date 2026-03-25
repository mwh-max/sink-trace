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
            flagging FSM
                   │                       │
                   ├── appendHistory()  ───┘   (historyStore — per-node localStorage)
                   │
                   ▼
          localStorage.setItem()  (sinktrace-nodes, only on change)
                   │
                   └──────────┬────────────┘
                              ▼
                           App.jsx
                         /        \
                    GridMap      MapView
               (pressure cards)  (Leaflet map)

useAlerts(nodes, onAlert)  ──►  logEntries state  (fires once per flagging event)
```

---

## Module Responsibilities

### Data

| File | Purpose |
|------|---------|
| `src/data/sampleNodes.json` | 11 Martin County nodes — 1 source, 2 junctions (one with `boostPressure`), 8 endpoints. Each has `type`, `label`, `pressure`, `flowDirection`, `coords`. Stored pressures are calibrated to simulation steady-state. |
| `src/data/pipeEdges.json` | 10 directed pipe edges — `from`, `to`, `lengthMeters`, `diameterMm`, `resistanceCoeff` (Hazen-Williams C). Forms a dead-end tree (no loops). |

### Utils

| File | Purpose |
|------|---------|
| `src/utils/constants.js` | Single source of truth: `PRESSURE_MIN=30`, `PRESSURE_MAX=120`, `HISTORY_MAX=10`, `CONSECUTIVE_TICKS_THRESHOLD=3`. Imported by both simulation and validation layers. |
| `src/utils/simulateFlow.js` | BFS pressure propagation from source nodes. Darcy-Weisbach with per-pipe Hazen-Williams friction scaling (`f = 0.02 × REFERENCE_C / C`). Handles `boostPressure` on pump/booster nodes. Cycle guard via iteration cap. Tracks `consecutiveLowTicks`; flags after N consecutive ticks below per-node or global threshold. Detects reversed flow. Re-exports constants. |
| `src/utils/schema.js` | Zod schemas for node validation. `validateNodes(raw)` is the single entry point for all external data. Enforces `acknowledgedAt` is set when `acknowledged` is true via `.refine()`. |
| `src/utils/colors.js` | `COLOR_SAFE`, `COLOR_WARNING`, `COLOR_CRITICAL`, `getPressureColor(psi)`. |
| `src/utils/trend.js` | `getTrend(history)` — classifies last 3 readings as `'falling'` (newest below both priors), `'rising'` (newest above both priors), or `'stable'`. |
| `src/utils/storageKeys.js` | `NODES_KEY = 'sinktrace-nodes'`. |
| `src/utils/historyStore.js` | Long-term pressure history in localStorage. `appendHistory(nodeId, pressure, timestamp)`, `getHistory(nodeId, limit)`, `clearHistory(nodeId)`. Capped at 100 readings per node. Keyed as `sinktrace-history-<nodeId>`. |

### Hooks

| File | Purpose |
|------|---------|
| `src/hooks/useNodes.js` | Loads and validates initial node state from localStorage, falls back to `sampleNodes.json`. Returns memoized `{ nodes }` — never updates after mount. |
| `src/hooks/useNodeData.js` | Orchestrates continuous node state. Returns `{ nodes, error, lastUpdated, tick }`. In simulate mode, writes back to localStorage on change and calls `appendHistory` per node per tick. In live mode, retains last known state on fetch error and calls `appendHistory` on each successful fetch. |
| `src/hooks/useAlerts.js` | Fires `onAlert(nodeId, node)` exactly once per flagging event — not on initial load, not on sustained flags. Uses a ref-wrapped callback to avoid stale closures and a `flaggedIds` set to track transitions. |

### Components

| File | Purpose |
|------|---------|
| `src/App.jsx` | Root. Holds `mode`, `view`, `flagThreshold`, `logEntries`. Derives log entries via `useAlerts`. Renders controls and view. |
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
    ├─ 2. BFS from all source nodes (iteration cap guards against cycles)
    │       └─ Downstream pressure = upstream − ΔP
    │          f = FRICTION_FACTOR × (REFERENCE_C / edge.resistanceCoeff)
    │          ΔP = f × (L/D) × (ρv²/2) × PA_TO_PSI
    │          Pump nodes: effectiveUpstream = pressure + boostPressure
    │          Multiple paths → take highest pressure
    │
    ├─ 3. Detect reversed flow
    │       └─ Mark nodes where computed gradient opposes declared edge direction
    │
    └─ 4. Per-node state machine
            ├─ threshold = node.pressureMin ?? PRESSURE_MIN
            ├─ pressure < threshold → consecutiveLowTicks++, else reset to 0
            ├─ flagged = consecutiveLowTicks >= consecutiveTicks
            ├─ flaggedAt set on first flag tick, cleared on recovery
            ├─ boostPressure added to displayed pressure for pump nodes
            └─ history[] capped at HISTORY_MAX (10 readings)
```

---

## localStorage

| Point | Key | Operation | Guard |
|-------|-----|-----------|-------|
| `useNodes()` init | `sinktrace-nodes` | Read | Falls back to `sampleNodes.json` on missing/corrupt |
| `useNodes()` error | `sinktrace-nodes` | Remove | Clears corrupt entry |
| `useNodeData()` simulate tick | `sinktrace-nodes` | Write | Skip if serialized JSON unchanged (`lastSerializedRef`) |
| `useNodeData()` live mode | `sinktrace-nodes` | No write | Live data is not persisted |
| `historyStore` write | `sinktrace-history-<nodeId>` | Append | Capped at 100 entries; quota errors caught silently |
| `historyStore` read | `sinktrace-history-<nodeId>` | Read | Returns `[]` on missing or corrupt |

---

## Zod Validation Boundary

`validateNodes(raw)` in `schema.js` is called at every external data entry point:

- `useNodes()` — localStorage or `sampleNodes.json` on init
- `useNodeData()` — API response in live mode

**Required fields:** `pressure` [0–120], `flowDirection` ('normal'|'reversed'), `coords` [lat, lng]

**Optional fields (defaulted by Zod):** `consecutiveLowTicks=0`, `flagged=false`, `flaggedAt=null`, `acknowledged=false`, `acknowledgedAt=null`, `history`, `type`, `label`

**Constrained optional fields:** `pressureMin` positive, max 120; `boostPressure` positive

**Invariant enforced by `.refine()`:** `acknowledged: true` requires `acknowledgedAt` to be non-null

---

## Alert Flow

```
useNodeData → nodes state update
                    │
              useAlerts(nodes, onAlert)
                    │
              first render: seed flaggedIds, return silently
              subsequent:   diff against flaggedIds
                    │
              node.flagged && !flaggedIds.has(id)  →  onAlert(id, node)
                                                       flaggedIds.add(id)
              !node.flagged && flaggedIds.has(id)  →  flaggedIds.delete(id)
                    │
              App.jsx: setLogEntries(prev => [entry, ...prev].slice(0, MAX_LOG_ENTRIES))
```

---

## Module Dependency Graph

```
constants.js
   ├── simulateFlow.js   (PRESSURE_MIN/MAX, HISTORY_MAX, CONSECUTIVE_TICKS_THRESHOLD)
   └── schema.js         (PRESSURE_MAX)

storageKeys.js
   ├── useNodes.js
   └── useNodeData.js

historyStore.js
   └── useNodeData.js

sampleNodes.json ──► useNodes.js ──► useNodeData.js ──► App.jsx
pipeEdges.json   ──► useNodeData.js

simulateFlow.js  ──► useNodeData.js
schema.js        ──► useNodes.js, useNodeData.js
useAlerts.js     ──► App.jsx

colors.js        ──► GridMap.jsx, MapView.jsx, MapErrorBoundary.jsx, trend.js
trend.js         ──► GridMap.jsx
```

No circular dependencies.

---

## Test Coverage

| File | Tests | What is tested |
|------|-------|---------------|
| `simulateFlow.test.js` | 22 | BFS propagation, DW drop accuracy, flagging, consecutive-ticks FSM, per-node `pressureMin`, history, flow reversal, field preservation |
| `historyStore.test.js` | 13 | `appendHistory`, `getHistory` (all/limited/ordered), `clearHistory`, 100-entry cap, cross-node isolation |
| `useAlerts.test.js` | 11 | Initial-load silence, flagging transitions, duplicate suppression, recovery and re-flagging, dynamically added nodes, callback identity stability |
| `trend.test.js` | 7 | All trend outcomes, partial drops/rises (plateau then step), non-monotonic patterns, edge cases (< 3 readings) |
| `GridMap.test.jsx` | 6 | Card rendering, flagged alert, trend badges, empty state, keyboard focus |

**Total: 59 tests passing.**

---

## Key Design Decisions

- **Hazen-Williams friction scaling** — Each pipe's `resistanceCoeff` (C value) scales the DW friction factor proportionally. Newer pipe (higher C) loses less pressure. Absent C defaults to baseline, preserving backward compatibility.
- **Booster station as data, not code** — Pump behavior is driven by a `boostPressure` field on the node, not a special node type. The simulation applies it uniformly during BFS propagation and displayed-pressure computation.
- **Calibrated seed data** — Stored pressures in `sampleNodes.json` match simulation steady-state, so the initial render and post-tick render are consistent. Warfield and Lovely show below-threshold pressures on load, reflecting real Martin County conditions.
- **Consecutive-tick flagging** — Guards against transient noise. A node must sustain low pressure for N consecutive ticks before flagging. The counter resets on any recovery tick.
- **`useAlerts` decouples detection from destination** — The hook fires a callback once per flagging event; where the alert goes (log, email, SMS, push) is the caller's concern.
- **`historyStore` is separate from in-memory history** — The `history[]` array on each node (capped at 10) drives trend detection in the UI. `historyStore` provides long-term persistence (up to 100 readings) for future analysis features.
- **`nodesRef` pattern** — Interval callbacks read from a ref, not closure state, so the interval is never rebuilt on each render.
- **`cancelled` flag in live mode** — Prevents state updates after effect teardown; handles React StrictMode double-invocation cleanly.
- **`constants.js` as neutral layer** — Avoids the validation layer depending on the simulation layer (or vice versa).
- **Dead-end tree topology** — Martin County's rural network has no redundant loops, unlike urban systems. Endpoints at the end of long hollows (Lovely, Warfield) naturally fall below 30 psi under the current model.
