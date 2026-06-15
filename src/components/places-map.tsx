"use client";

import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export type MapMarker = {
  id: number;
  slug: string;
  name: string;
  city: string | null;
  lat: number;
  lng: number;
  categorySlug: string | null;
};

const ICONS: Record<string, L.DivIcon> = {
  utulna: L.divIcon({
    className: "noc-marker",
    iconSize: [26, 26],
    html: '<div style="width:26px;height:26px;border-radius:9999px;background:#2f5d3a;border:3px solid #ffffff;box-shadow:0 1px 3px rgba(0,0,0,0.4)"></div>',
  }),
  "nouzove-nocoviste": L.divIcon({
    className: "noc-marker",
    iconSize: [26, 26],
    html: '<div style="width:26px;height:26px;border-radius:9999px;background:#7b5a3a;border:3px solid #ffffff;box-shadow:0 1px 3px rgba(0,0,0,0.4)"></div>',
  }),
  default: L.divIcon({
    className: "noc-marker",
    iconSize: [26, 26],
    html: '<div style="width:26px;height:26px;border-radius:9999px;background:#1a1a1a;border:3px solid #ffffff;box-shadow:0 1px 3px rgba(0,0,0,0.4)"></div>',
  }),
};

function iconFor(slug: string | null): L.DivIcon {
  if (!slug) return ICONS.default;
  return ICONS[slug] ?? ICONS.default;
}

type Props = {
  markers: MapMarker[];
};

export function PlacesMap({ markers }: Props) {
  return (
    <MapContainer
      center={[49.8, 15.5]}
      zoom={7}
      scrollWheelZoom
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> přispěvatelé'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {markers.map((m) => (
        <Marker
          key={m.id}
          position={[m.lat, m.lng]}
          icon={iconFor(m.categorySlug)}
        >
          <Popup>
            <strong>{m.name}</strong>
            {m.city ? <div>{m.city}</div> : null}
            <div style={{ marginTop: 6 }}>
              <a href={`/misto/${m.slug}`}>Detail →</a>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
