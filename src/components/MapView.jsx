import { MapContainer, TileLayer, CircleMarker, Tooltip } from "react-leaflet";

export default function MapView({ nodes }) {
  return (
    <MapContainer
      center={[38.04, -84.5]}
      zoom={11}
      style={{ height: "500px", width: "100%" }}
    >
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
