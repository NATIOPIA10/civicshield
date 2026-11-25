import "leaflet/dist/leaflet.css";
import { CircleMarker, MapContainer, Popup, TileLayer } from "react-leaflet";
import { Link } from "react-router-dom";
import { isOpen } from "../analytics";
import { CATEGORIES, Report, STATUS_LABEL } from "../types";

const DILLA: [number, number] = [6.4089, 38.31];

export default function ReportMap({ reports }: { reports: Report[] }) {
  const located = reports.filter((r) => r.lat !== undefined && r.lng !== undefined);
  return (
    <div>
      <MapContainer center={DILLA} zoom={13} scrollWheelZoom={false} className="h-96 w-full rounded-lg border border-line">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {located.map((r) => (
          <CircleMarker
            key={r.id}
            center={[r.lat!, r.lng!]}
            radius={8}
            pathOptions={{ color: isOpen(r.status) ? "#9a6412" : "#0f6b57", fillOpacity: 0.7 }}
          >
            <Popup>
              <p className="font-mono">{r.id}</p>
              <p>{CATEGORIES.find((c) => c.id === r.category)?.label}</p>
              <p>{STATUS_LABEL[r.status]}</p>
              <Link to={`/staff/report/${r.id}`}>Open report</Link>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
      <p className="mt-2 text-sm text-muted">
        {located.length} of {reports.length} reports have a location. Amber is open, green is closed.
      </p>
    </div>
  );
}
