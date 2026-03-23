import { useState, useEffect, useCallback } from "react";
import GridMap from "./components/GridMap.jsx";
import MapView from "./components/MapView.jsx";
import MapErrorBoundary from "./components/MapErrorBoundary.jsx";
import sampleNodes from "./data/sampleNodes.json";
import "./App.css";
import simulateFlow from "./utils/simulateFlow.js";

function runSimulationStep(prevNodes) {
  const updated = simulateFlow(prevNodes);
  const newEntries = Object.entries(updated)
    .filter(([key, node]) => node.flagged && !prevNodes[key].flagged)
    .map(([key, node]) => ({
      key: `${key}-${node.flaggedAt}`,
      id: key,
      pressure: node.pressure,
      time: new Date(node.flaggedAt).toLocaleTimeString(),
    }));
  return { updated, newEntries };
}

export default function App() {
  const [nodes, setNodes] = useState(sampleNodes);
  const [logEntries, setLogEntries] = useState([]);
  const [view, setView] = useState("grid");

  const applySimulation = useCallback(() => {
    setNodes((prevNodes) => {
      const { updated, newEntries } = runSimulationStep(prevNodes);
      if (newEntries.length > 0) {
        setLogEntries((prev) => [...newEntries, ...prev.slice(0, 19)]);
      }
      return updated;
    });
  }, []);

  useEffect(() => {
    const interval = setInterval(applySimulation, 3000);
    return () => clearInterval(interval);
  }, [applySimulation]);

  const hasFlagged = Object.values(nodes).some((n) => n.flagged);

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

      <p
        style={{
          marginTop: "1rem",
          color: hasFlagged ? "#c0392b" : "#27ae60",
        }}
      >
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
            <li key={entry.key}>
              {entry.time} — Junction {entry.id} dropped to {entry.pressure} psi
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
