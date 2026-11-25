"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { LatLngExpression } from "leaflet";

const MapContainer = dynamic(() => import("react-leaflet").then(m => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then(m => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import("react-leaflet").then(m => m.Marker), { ssr: false });
const Popup = dynamic(() => import("react-leaflet").then(m => m.Popup), { ssr: false });

type Lot = { id: string; name: string; lat: number; lng: number; available: number; hourly_rate: number };

export default function ParkingMap({ lots, onSelect }: { lots: Lot[]; onSelect: (id: string) => void }) {
  const [ready, setReady] = useState(false);
  useEffect(() => { import("leaflet/dist/leaflet.css"); setReady(true); }, []);
  const center: LatLngExpression = [12.9716, 77.7500];
  if (!ready) return <div className="grid h-full min-h-[360px] place-items-center text-sm text-slate-500">Loading map…</div>;
  return (
    <MapContainer center={center} zoom={12} scrollWheelZoom className="h-full min-h-[360px]">
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {lots.map(lot => <Marker key={lot.id} position={[lot.lat, lot.lng]}>
        <Popup><div className="space-y-1"><b>{lot.name}</b><div>{lot.available} demo spaces · ₹{lot.hourly_rate}/hr</div><button className="text-blue-700 underline" onClick={() => onSelect(lot.id)}>View details</button></div></Popup>
      </Marker>)}
    </MapContainer>
  );
}
