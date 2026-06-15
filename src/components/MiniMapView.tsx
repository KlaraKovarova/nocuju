"use client";

import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";

const ICON_BASE = "https://unpkg.com/leaflet@1.9.4/dist/images";

const defaultIcon = L.icon({
  iconUrl: `${ICON_BASE}/marker-icon.png`,
  iconRetinaUrl: `${ICON_BASE}/marker-icon-2x.png`,
  shadowUrl: `${ICON_BASE}/marker-shadow.png`,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

export type MiniMapMarker = {
  id: string | number;
  lat: number;
  lng: number;
  label?: string;
  popup?: React.ReactNode;
};

export type MiniMapViewProps = {
  center: [number, number];
  zoom: number;
  markers: MiniMapMarker[];
  className?: string;
  scrollWheelZoom?: boolean;
};

export default function MiniMapView({
  center,
  zoom,
  markers,
  className,
  scrollWheelZoom = false,
}: MiniMapViewProps) {
  return (
    <MapContainer
      center={center}
      zoom={zoom}
      scrollWheelZoom={scrollWheelZoom}
      className={className ?? "h-full w-full"}
      style={{ minHeight: "100%" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {markers.map((m) => (
        <Marker key={m.id} position={[m.lat, m.lng]} icon={defaultIcon}>
          {(m.popup || m.label) && (
            <Popup>{m.popup ?? m.label}</Popup>
          )}
        </Marker>
      ))}
    </MapContainer>
  );
}
