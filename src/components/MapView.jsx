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
import { COLOR_SAFE, COLOR_CRITICAL } from "../utils/colors.js";

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
      {Object.entries(nodes)
        .filter(([, node]) => isValidCoords(node.coords))
        .map(([id, node]) => (
          <CircleMarker
            key={id}
            center={node.coords}
            radius={8}
            pathOptions={{
              color: node.flagged ? COLOR_CRITICAL : COLOR_SAFE,
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
