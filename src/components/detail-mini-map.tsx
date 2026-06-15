"use client";

import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const defaultIcon = L.divIcon({
  className: "noc-marker",
  iconSize: [22, 22],
  html: '<div style="width:22px;height:22px;border-radius:9999px;background:#2f5d3a;border:3px solid #ffffff;box-shadow:0 1px 3px rgba(0,0,0,0.4)"></div>',
});

type Props = {
  lat: number;
  lng: number;
  name: string;
};

export function DetailMiniMap({ lat, lng, name }: Props) {
  return (
    <MapContainer
      center={[lat, lng]}
      zoom={13}
      scrollWheelZoom={false}
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> přispěvatelé'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={[lat, lng]} icon={defaultIcon}>
        <Popup>{name}</Popup>
      </Marker>
    </MapContainer>
  );
}
