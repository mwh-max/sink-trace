import React from "react";
import "./grid.css";
import { getPressureColor } from "../utils/colors.js";

export default function GridMap({ nodes }) {
  if (!nodes || Object.keys(nodes).length === 0) {
    return <div style={{ padding: "2rem" }}>No junction data found.</div>;
  }

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
            border: `2px solid ${getPressureColor(node.pressure)}`,
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
            <p style={{ color: getPressureColor(node.pressure), fontWeight: "bold" }}>
              ⚠️ Pressure below safe minimum
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
