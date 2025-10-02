import React, { useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Tooltip,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";

const KY_BOUNDS = [
  [36.5, -89.6], // Southwest Kentucky
  [39.2, -81.9], // Northeast Kentucky
];

// Ensures the map reflows correctly when rendered in React
function InvalidateOnLoad() {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
  }, [map]);
  return null;
}

export default function MapView({ nodes }) {
  return (
    <MapContainer
      center={[37.8, -85.8]}
      zoom={8}
      minZoom={7}
      maxZoom={14}
      style={{
        height: "500px",
        width: "100%",
        borderRadius: "8px",
        overflow: "hidden",
      }}
      zoomControl={false}
      preferCanvas={true}
    >
      <InvalidateOnLoad />

      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="© OpenStreetMap contributors"
      />
      {Object.entries(nodes).map(([id, node]) => (
        <CircleMarker
          key={id}
          center={node.coords}
          radius={8}
          pathOptions={{
            color: node.flagged ? "#c0392b" : "#27ae60",
          }}
        >
          <Tooltip>
            <b>Junction {id}</b>
            <br />
            Pressure: {node.pressure} psi
            <br />
            Flow: {node.flowDirection}
          </Tooltip>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
