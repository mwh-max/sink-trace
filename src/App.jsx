import { useState, useEffect } from "react";
import GridMap from "./components/GridMap.jsx";
import sampleNodes from "./data/sampleNodes.json";
import "./App.css";
import simulateFlow from "./utils/simulateFlow.js";

export default function App() {
  const [nodes, setNodes] = useState(sampleNodes);
  const [logEntries, setLogEntries] = useState([]);

  useEffect(() => {
    const interval = setInterval(() => {
      setNodes((prevNodes) => {
        const updated = simulateFlow(prevNodes);

        const newEntries = Object.entries(updated)
          .filter(([key, node]) => node.flagged && !prevNodes[key].flagged)
          .map(([key, node]) => ({
            id: key,
            pressure: node.pressure,
            time: new Date(node.flaggedAt).toLocaleTimeString()
          }));

        if (newEntries.length > 0) {
          setLogEntries((prev) => [...newEntries, ...prev.slice(0, 19)]);
        }

        return updated;
      });
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const handleSimulate = () => {
    setNodes((prevNodes) => {
      const updated = simulateFlow(prevNodes);

      const newEntries = Object.entries(updated)
        .filter(([key, node]) => node.flagged && !prevNodes[key].flagged)
        .map(([key, node]) => ({
          id: key,
          pressure: node.pressure,
          time: new Date(node.flaggedAt).toLocaleTimeString()
        }));

      if (newEntries.length > 0) {
        setLogEntries((prev) => [...newEntries, ...prev.slice(0, 19)]);
      }

      return updated;
    });
  };

  const hasFlagged = Object.values(nodes).some((n) => n.flagged);

  return (
    <div style={{ border: "3px solid magenta", padding: "2rem" }}>
      <div
        style={{
          marginBottom: "1rem",
          padding: "1rem",
          background: "#eef9f7",
          borderRadius: "6px"
        }}
      >
        <h2>Detecting Water Loss Across the Grid</h2>
        <p>
          SinkTrace simulates pressure behavior across key junctions in a municipal water system.
          Flagged pressure drops may signal possible leaks, infrastructure damage, or surge events.
        </p>
      </div>

      <h1>SinkTrace: Municipal Flow Map</h1>
      <p style={{ fontStyle: "italic" }}>
        A live simulation revealing hidden pressure loss across critical grid junctions.
      </p>

      <button onClick={handleSimulate}>Run Pressure Diagnostic</button>

      <p
        style={{
          marginTop: "1rem",
          color: hasFlagged ? "#c0392b" : "#27ae60"
        }}
      >
        {hasFlagged
          ? "⚠️ Pressure anomalies detected — check flagged junctions"
          : "✅ All junctions operating within normal pressure ranges"}
      </p>

      <div style={{ border: "3px dashed cyan", marginTop: "1rem" }}>
        <GridMap nodes={nodes} />
      </div>

      <div style={{ marginTop: "2rem" }}>
        <h3>📝 Pressure Loss Log</h3>
        <ul>
          {logEntries.map((entry, index) => (
            <li key={index}>
              {entry.time} — Junction {entry.id} dropped to {entry.pressure} psi
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}