import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import { CircleMarker, MapContainer, TileLayer, useMap, useMapEvents } from "react-leaflet";

export interface LatLng { lat: number; lng: number }
const DILLA: [number, number] = [6.4089, 38.31];

function ClickHandler({ onPick }: { onPick: (p: LatLng) => void }) {
  useMapEvents({ click: (e) => onPick({ lat: e.latlng.lat, lng: e.latlng.lng }) });
  return null;
}

/** Moves the map when a location is set from outside (for example "Add my current location"). */
function Recenter({ value }: { value: LatLng | null }) {
  const map = useMap();
  useEffect(() => {
    if (value) map.setView([value.lat, value.lng], Math.max(map.getZoom(), 16));
  }, [value, map]);
  return null;
}

export default function LocationPicker({ value, onChange }: { value: LatLng | null; onChange: (p: LatLng | null) => void }) {
  return (
    <div>
      <MapContainer center={DILLA} zoom={13} scrollWheelZoom={false} className="h-72 w-full rounded border border-line lg:h-[28rem]" aria-label="Map for choosing the problem location">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickHandler onPick={onChange} />
        <Recenter value={value} />
        {value && <CircleMarker center={[value.lat, value.lng]} radius={10} pathOptions={{ color: "#b42318", fillOpacity: 0.6 }} />}
      </MapContainer>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        <span className="text-muted" aria-live="polite">
          {value ? `Pin set at ${value.lat.toFixed(5)}, ${value.lng.toFixed(5)}` : "Tap the map to place a pin on the exact spot."}
        </span>
        {value && <button type="button" onClick={() => onChange(null)} className="font-medium text-civic underline">Remove pin</button>}
      </div>
    </div>
  );
}
