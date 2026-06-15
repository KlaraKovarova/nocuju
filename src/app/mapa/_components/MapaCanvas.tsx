"use client";

import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";

export type MapaCategory = "utulna" | "nouzove-nocoviste";

export type MapaMarker = {
  id: number;
  slug: string;
  name: string;
  city: string | null;
  lat: number;
  lng: number;
  category: MapaCategory | null;
};

export type MapaCanvasProps = {
  center: [number, number];
  zoom: number;
  markers: MapaMarker[];
};

function makeIcon(color: string): L.DivIcon {
  const html = `
    <span style="
      display:block;
      width:24px;
      height:24px;
      border-radius:50% 50% 50% 0;
      transform:rotate(-45deg);
      background:${color};
      border:2px solid #ffffff;
      box-shadow:0 1px 3px rgba(0,0,0,0.35);
    "></span>
  `;
  return L.divIcon({
    html,
    className: "noc-marker",
    iconSize: [24, 24],
    iconAnchor: [12, 24],
    popupAnchor: [0, -22],
  });
}

const ICONS: Record<MapaCategory | "default", L.DivIcon> = {
  utulna: makeIcon("#059669"),
  "nouzove-nocoviste": makeIcon("#d97706"),
  default: makeIcon("#52525b"),
};

export default function MapaCanvas({ center, zoom, markers }: MapaCanvasProps) {
  return (
    <MapContainer
      center={center}
      zoom={zoom}
      scrollWheelZoom
      className="h-full w-full"
      style={{ minHeight: "100%" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {markers.map((m) => {
        const icon = m.category ? ICONS[m.category] : ICONS.default;
        return (
          <Marker key={m.id} position={[m.lat, m.lng]} icon={icon}>
            <Popup>
              <div className="text-sm leading-snug">
                <a
                  href={`/misto/${m.slug}`}
                  className="font-semibold text-emerald-700 hover:underline"
                >
                  {m.name}
                </a>
                {m.city && (
                  <div className="mt-0.5 text-zinc-600">{m.city}</div>
                )}
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
