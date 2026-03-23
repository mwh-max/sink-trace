import React from "react";
import "./grid.css";
import { getPressureColor } from "../utils/colors.js";
import { getTrend, TREND_LABEL, TREND_COLOR } from "../utils/trend.js";

function GridMap({ nodes }) {
  if (!nodes || Object.keys(nodes).length === 0) {
    return <div style={{ padding: "2rem" }}>No junction data found.</div>;
  }

  return (
    <div className="grid-container">
      {Object.entries(nodes).map(([id, node]) => {
        const trend = getTrend(node.history);
        // getTrend returns 'stable' for < 3 readings; only show badge once
        // we have enough data for a meaningful direction.
        const showTrend = trend !== 'stable' || (node.history?.length ?? 0) >= 3;

        return (
          <div
            key={id}
            role="article"
            aria-label={`Junction ${id}, ${node.pressure} psi, ${node.flagged ? "pressure below safe minimum" : "normal"}`}
            tabIndex={0}
            className={`grid-node ${node.flagged ? "low-pressure" : ""}`}
            title={
              node.flagged
                ? `⚠️ Junction ${id} — Pressure: ${node.pressure} psi — Possible leak`
                : `Junction ${id} — Pressure: ${node.pressure} psi`
            }
            style={{ border: `2px solid ${getPressureColor(node.pressure)}` }}
          >
            <h3>{`Junction ${id}`}</h3>
            <p>{`Pressure: ${node.pressure} psi`}</p>
            {showTrend && (
              <p style={{ color: TREND_COLOR[trend], fontSize: "0.85rem", margin: "0.2rem 0" }}>
                {TREND_LABEL[trend]}
              </p>
            )}
            <p>
              {node.flowDirection === "reversed"
                ? "Flow: 🔄 Reversed"
                : "Flow: ➡️ Normal"}
            </p>
            {node.flagged && (
              <p role="alert" style={{ color: getPressureColor(node.pressure), fontWeight: "bold" }}>
                ⚠️ Pressure below safe minimum
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default React.memo(GridMap);
