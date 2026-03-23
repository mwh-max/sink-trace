import { useState, useEffect, useMemo, useReducer, useCallback } from "react";
import GridMap from "./components/GridMap.jsx";
import MapView from "./components/MapView.jsx";
import MapErrorBoundary from "./components/MapErrorBoundary.jsx";
import sampleNodes from "./data/sampleNodes.json";
import "./App.css";
import simulateFlow from "./utils/simulateFlow.js";
import { COLOR_SAFE, COLOR_CRITICAL } from "./utils/colors.js";

const MAX_LOG_ENTRIES = 20;

function runSimulationStep(prevNodes) {
  const updated = simulateFlow(prevNodes);
  const newEntries = Object.entries(updated)
    .filter(([key, node]) => node.flagged && !prevNodes[key].flagged)
    .map(([key, node]) => ({
      id: key,
      pressure: node.pressure,
      flaggedAt: node.flaggedAt,
    }));
  return { updated, newEntries };
}

function reducer(state, action) {
  if (action.type === "simulate") {
    const { updated, newEntries } = runSimulationStep(state.nodes);
    return {
      nodes: updated,
      logEntries:
        newEntries.length > 0
          ? [...newEntries, ...state.logEntries].slice(0, MAX_LOG_ENTRIES)
          : state.logEntries,
    };
  }
  return state;
}

export default function App() {
  const [{ nodes, logEntries }, dispatch] = useReducer(reducer, {
    nodes: sampleNodes,
    logEntries: [],
  });
  const [view, setView] = useState("grid");

  const applySimulation = useCallback(() => dispatch({ type: "simulate" }), []);

  useEffect(() => {
    const interval = setInterval(applySimulation, 3000);
    return () => clearInterval(interval);
  }, [applySimulation]);

  const hasFlagged = useMemo(
    () => Object.values(nodes).some((n) => n.flagged),
    [nodes]
  );

  return (
    <div style={{ padding: "2rem" }}>
      <div
        style={{
          marginBottom: "1rem",
          padding: "1rem",
          background: "#eef9f7",
          borderRadius: "6px",
        }}
      >
        <h2>Detecting Water Loss Across the Grid</h2>
        <p>
          SinkTrace simulates pressure behavior across key junctions in a
          municipal water system. Flagged pressure drops may signal possible
          leaks, infrastructure damage, or surge events.
        </p>
      </div>

      <h1>SinkTrace: Municipal Flow Map</h1>
      <p style={{ fontStyle: "italic" }}>
        A live simulation revealing hidden pressure loss across critical grid
        junctions.
      </p>

      <button onClick={applySimulation}>Run Pressure Diagnostic</button>

      <button
        style={{ marginLeft: "1rem" }}
        onClick={() => setView(view === "grid" ? "map" : "grid")}
      >
        {view === "grid" ? "Show Map View" : "Show Grid View"}
      </button>

      <p style={{ marginTop: "1rem", color: hasFlagged ? COLOR_CRITICAL : COLOR_SAFE }}>
        {hasFlagged
          ? "⚠️ Pressure anomalies detected — check flagged junctions"
          : "✅ All junctions operating within normal pressure ranges"}
      </p>

      <div style={{ marginTop: "1rem" }}>
        {view === "grid" ? (
          <GridMap nodes={nodes} />
        ) : (
          <MapErrorBoundary>
            <MapView nodes={nodes} />
          </MapErrorBoundary>
        )}
      </div>

      <div style={{ marginTop: "2rem" }}>
        <h3>📝 Pressure Loss Log</h3>
        <ul>
          {logEntries.map((entry) => (
            <li key={`${entry.id}-${entry.flaggedAt}`}>
              {new Date(entry.flaggedAt).toLocaleTimeString()} — Junction{" "}
              {entry.id} dropped to {entry.pressure} psi
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
