import React, { useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Tooltip,
  useMap,
  ZoomControl,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";

const KY_BOUNDS = [
  [36.5, -89.6], // Southwest Kentucky
  [39.2, -81.9], // Northeast Kentucky
];

function InvalidateOnLoad() {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
  }, [map]);
  return null;
}

function isValidCoords(coords) {
  return (
    Array.isArray(coords) &&
    coords.length === 2 &&
    coords.every((v) => typeof v === "number" && isFinite(v))
  );
}

export default function MapView({ nodes }) {
  return (
    <MapContainer
      center={[37.8, -85.8]}
      zoom={8}
      minZoom={7}
      maxZoom={14}
      maxBounds={KY_BOUNDS}
      maxBoundsViscosity={1.0}
      style={{
        height: "min(62vh, 600px)",
        width: "100%",
        borderRadius: "8px",
        overflow: "hidden",
      }}
      zoomControl={false}
      preferCanvas={true}
    >
      <ZoomControl position="topright" />
      <InvalidateOnLoad />

      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="© OpenStreetMap contributors"
      />
      {Object.entries(nodes).map(([id, node]) => {
        if (!isValidCoords(node.coords)) return null;
        return (
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
        );
      })}
    </MapContainer>
  );
}
