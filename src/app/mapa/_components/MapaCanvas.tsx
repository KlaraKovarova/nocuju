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
  region: string | null;
  isFree: boolean;
  lat: number;
  lng: number;
  category: MapaCategory | null;
};

export type MapaCanvasProps = {
  center: [number, number];
  zoom: number;
  markers: MapaMarker[];
};

function makeIcon(color: string, svgPath: string): L.DivIcon {
  const html = `
    <span style="
      display:flex;
      align-items:center;
      justify-content:center;
      width:36px;
      height:36px;
      border-radius:50% 50% 50% 0;
      transform:rotate(-45deg);
      background:${color};
      border:2px solid #ffffff;
      box-shadow:0 1px 4px rgba(0,0,0,0.4);
    ">
      <span style="transform:rotate(45deg);display:flex;align-items:center;justify-content:center;">
        <svg width="20" height="20" viewBox="0 0 48 48" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          ${svgPath}
        </svg>
      </span>
    </span>
  `;
  return L.divIcon({
    html,
    className: "noc-marker",
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -34],
  });
}

const ICONS: Record<MapaCategory | "default", L.DivIcon> = {
  utulna: makeIcon(
    "#059669",
    '<path d="M4 26 24 6 44 26Z" fill="rgba(255,255,255,0.25)"/><rect x="8" y="24" width="32" height="18" fill="rgba(255,255,255,0.15)" rx="1"/><rect x="10" y="27" width="8" height="7" fill="rgba(255,255,255,0.4)" rx="1"/><rect x="30" y="27" width="8" height="7" fill="rgba(255,255,255,0.4)" rx="1"/><path d="M19 42 L19 33 L29 33 L29 42" fill="rgba(255,255,255,0.3)"/>',
  ),
  "nouzove-nocoviste": makeIcon(
    "#d97706",
    '<path d="M4 40 L4 10 L44 24 L44 40Z" fill="rgba(255,255,255,0.2)"/><path d="M4 10 L44 24" stroke-width="2.5"/><line x1="4" y1="10" x2="4" y2="43" stroke-width="2.5"/><line x1="44" y1="24" x2="44" y2="43" stroke-width="2.5"/><path d="M24 43 C21 39 20 36 22 33 C24 29 26 33 28 36 C27 39 24 43 24 43Z" fill="rgba(255,255,255,0.5)" stroke="none"/>',
  ),
  default: makeIcon(
    "#52525b",
    '<path d="M4 26 24 6 44 26Z" fill="rgba(255,255,255,0.25)"/><rect x="8" y="24" width="32" height="18" fill="rgba(255,255,255,0.15)" rx="1"/>',
  ),
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
        const locationLine = [m.city, m.region].filter(Boolean).join(", ");
        return (
          <Marker key={m.id} position={[m.lat, m.lng]} icon={icon}>
            <Popup>
              <div className="min-w-[180px] text-sm leading-snug">
                <div className="font-semibold text-zinc-900">{m.name}</div>
                {locationLine && (
                  <div className="mt-0.5 text-zinc-600">{locationLine}</div>
                )}
                <div className="mt-1.5 flex items-center gap-1.5">
                  <span
                    className={
                      m.isFree
                        ? "inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700"
                        : "inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700"
                    }
                  >
                    {m.isFree ? "Zdarma" : "Placené"}
                  </span>
                </div>
                <a
                  href={`/misto/${m.slug}`}
                  className="mt-2 inline-block font-medium text-emerald-700 hover:underline"
                >
                  Otevřít detail →
                </a>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
