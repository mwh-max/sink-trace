import { useState, useEffect, useMemo, useRef } from "react";
import GridMap from "./components/GridMap.jsx";
import MapView from "./components/MapView.jsx";
import MapErrorBoundary from "./components/MapErrorBoundary.jsx";
import "./App.css";
import { MAX_LOG_ENTRIES } from "./utils/appReducer.js";
import { COLOR_SAFE, COLOR_CRITICAL } from "./utils/colors.js";
import { CONSECUTIVE_TICKS_THRESHOLD } from "./utils/simulateFlow.js";
import { useNodeData } from "./hooks/useNodeData.js";

export default function App() {
  const [mode, setMode]               = useState("simulate");
  const [flagThreshold, setFlagThreshold] = useState(CONSECUTIVE_TICKS_THRESHOLD);
  const [view, setView]               = useState("grid");

  const { nodes, error, lastUpdated, tick } = useNodeData(mode, { flagThreshold });

  // Accumulate a log of nodes that become newly flagged, across both modes.
  const [logEntries, setLogEntries] = useState([]);
  const prevNodesRef = useRef(nodes);
  useEffect(() => {
    const newEntries = Object.entries(nodes)
      .filter(([id, node]) => node.flagged && !prevNodesRef.current[id]?.flagged)
      .map(([id, node]) => ({ id, pressure: node.pressure, flaggedAt: node.flaggedAt }));
    if (newEntries.length > 0) {
      setLogEntries((prev) => [...newEntries, ...prev].slice(0, MAX_LOG_ENTRIES));
    }
    prevNodesRef.current = nodes;
  }, [nodes]);

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

      <button onClick={tick}>
        {mode === "simulate" ? "Run Pressure Diagnostic" : "Refresh Now"}
      </button>

      <button
        style={{ marginLeft: "1rem" }}
        onClick={() => setView(view === "grid" ? "map" : "grid")}
      >
        {view === "grid" ? "Show Map View" : "Show Grid View"}
      </button>

      <button
        style={{ marginLeft: "1rem" }}
        onClick={() => setMode(mode === "simulate" ? "live" : "simulate")}
      >
        {mode === "simulate" ? "Switch to Live Mode" : "Switch to Simulate Mode"}
      </button>

      {mode === "simulate" && (
        <label style={{ marginLeft: "1.5rem", fontSize: "0.9rem" }}>
          Flag after{" "}
          <input
            type="number"
            min={1}
            max={20}
            value={flagThreshold}
            onChange={(e) => setFlagThreshold(Math.max(1, Number(e.target.value)))}
            style={{ width: "3rem", textAlign: "center" }}
          />{" "}
          consecutive low-pressure ticks
        </label>
      )}

      {error && (
        <p style={{ marginTop: "0.5rem", color: COLOR_CRITICAL, fontSize: "0.9rem" }}>
          ⚠️ {error} — showing last known data
        </p>
      )}

      <p style={{ marginTop: "1rem", color: hasFlagged ? COLOR_CRITICAL : COLOR_SAFE }}>
        {hasFlagged
          ? "⚠️ Pressure anomalies detected — check flagged junctions"
          : "✅ All junctions operating within normal pressure ranges"}
      </p>

      {lastUpdated && (
        <p style={{ fontSize: "0.8rem", color: "#888", margin: "0.25rem 0 0" }}>
          Last updated: {lastUpdated.toLocaleTimeString()}
        </p>
      )}

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
        Mode: {mode}
        {mode === "live" && " · polling /api/nodes every 5 s"}
      </p>
    </div>
  );
}
