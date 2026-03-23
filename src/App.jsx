import { useState, useEffect, useMemo, useReducer, useCallback } from "react";
import GridMap from "./components/GridMap.jsx";
import MapView from "./components/MapView.jsx";
import MapErrorBoundary from "./components/MapErrorBoundary.jsx";
import "./App.css";
import { reducer, SIMULATE } from "./utils/appReducer.js";
import { COLOR_SAFE, COLOR_CRITICAL } from "./utils/colors.js";
import { SESSION_SEED } from "./utils/prng.js";
import { SEED_KEY } from "./utils/storageKeys.js";
import { useNodes } from "./hooks/useNodes.js";

export default function App() {
  const { nodes: initialNodes } = useNodes();

  const [{ nodes, logEntries }, dispatch] = useReducer(reducer, {
    nodes: initialNodes,
    logEntries: [],
  });
  const [view, setView] = useState("grid");

  const applySimulation = useCallback(() => dispatch({ type: SIMULATE }), []);

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

      <p style={{ marginTop: "2rem", fontSize: "0.75rem", color: "#aaa" }}>
        Simulation seed: {SESSION_SEED} — set{" "}
        <code>localStorage["{SEED_KEY}"]</code> to replay a scenario
      </p>
    </div>
  );
}
