import React from "react";
import "./grid.css";

export default function GridMap({ nodes }) {
  if (!nodes || Object.keys(nodes).length === 0) {
    return <div style={{ padding: "2rem" }}>No junction data found.</div>;
  }

  const getPressureColor = (psi) => {
    if (psi >= 30) return "#27ae60";
    if (psi >= 25) return "#f39c12";
    return "#c0392b";
  };

  return (
    <div className="grid-container">
      {Object.entries(nodes).map(([id, node]) => (
        <div
          key={id}
          className={`grid-node ${node.flagged ? "low-pressure" : ""}`}
          title={
            node.flagged
              ? `⚠️ Junction ${id} — Pressure: ${node.pressure} psi — Possible leak`
              : `Junction ${id} — Pressure: ${node.pressure} psi`
          }
          style={{
            border: `2px solid ${getPressureColor(node.pressure)}`
          }}
        >
          <h3>{`Junction ${id}`}</h3>
          <p>{`Pressure: ${node.pressure} psi`}</p>
          <p>
            {node.flowDirection === "reversed"
              ? "Flow: 🔄 Reversed"
              : "Flow: ➡️ Normal"}
          </p>
          {node.flagged && (
            <p style={{ color: "#c0392b", fontWeight: "bold" }}>
              ⚠️ Pressure below safe minimum
            </p>
          )}
        </div>
      ))}
    </div>
  );
}