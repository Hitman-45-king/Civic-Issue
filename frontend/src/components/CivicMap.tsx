"use client";
import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import Link from "next/link";
import { Complaint, upvoteComplaint } from "@/lib/demoData";

// Custom Leaflet DivIcon with category emoji and priority aura
function createCustomIcon(cat: string, priority: string, status: string) {
  const getEmoji = (c: string) => {
    if (c.includes("pothole") || c.includes("road")) return "🛣️";
    if (c.includes("garbage") || c.includes("waste") || c.includes("sani")) return "🗑️";
    if (c.includes("light") || c.includes("elec")) return "💡";
    if (c.includes("water") || c.includes("leak")) return "💧";
    if (c.includes("drain") || c.includes("sew")) return "🌊";
    return "⚠️";
  };

  const isResolved = status === "resolved" || status === "closed";
  const isCritical = priority === "critical" && !isResolved;

  const bgClass = isResolved
    ? "bg-emerald-500 ring-emerald-300"
    : isCritical
    ? "bg-rose-600 ring-rose-300 animate-pulse"
    : "bg-amber-500 ring-amber-300";

  return L.divIcon({
    className: "custom-leaflet-marker",
    html: `
      <div class="relative flex items-center justify-center">
        <div class="flex h-10 w-10 items-center justify-center rounded-2xl ${bgClass} text-white shadow-lg ring-4 text-base transition-transform hover:scale-110">
          ${getEmoji(cat)}
        </div>
        <div class="absolute -bottom-1 h-2 w-2 rotate-45 ${bgClass}"></div>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 42],
    popupAnchor: [0, -42],
  });
}

function MapRecenter({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
}

export default function CivicMap({
  complaints,
  selectedId,
  onSelectComplaint,
}: {
  complaints: Complaint[];
  selectedId?: string;
  onSelectComplaint?: (c: Complaint) => void;
}) {
  const defaultCenter: [number, number] = [28.6139, 77.2090];
  const [activeCenter, setActiveCenter] = useState<[number, number]>(defaultCenter);
  const [upvotesState, setUpvotesState] = useState<Record<string, number>>({});

  useEffect(() => {
    if (selectedId) {
      const found = complaints.find((c) => c.id === selectedId);
      if (found && found.latitude && found.longitude) {
        setActiveCenter([found.latitude, found.longitude]);
      }
    } else if (complaints.length > 0 && complaints[0].latitude) {
      setActiveCenter([complaints[0].latitude, complaints[0].longitude]);
    }
  }, [selectedId, complaints]);

  const handleSupport = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const newVotes = upvoteComplaint(id);
    setUpvotesState((prev) => ({ ...prev, [id]: newVotes }));
  };

  return (
    <div className="relative h-[620px] w-full overflow-hidden rounded-3xl border border-slate-200/80 shadow-md">
      <MapContainer
        center={activeCenter}
        zoom={13}
        scrollWheelZoom={true}
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapRecenter center={activeCenter} />

        {complaints.map((c) => {
          if (!c.latitude || !c.longitude) return null;
          const votes = upvotesState[c.id] ?? c.upvotes;

          return (
            <Marker
              key={c.id}
              position={[c.latitude, c.longitude]}
              icon={createCustomIcon(c.category_id, c.priority, c.status)}
              eventHandlers={{
                click: () => onSelectComplaint && onSelectComplaint(c),
              }}
            >
              <Popup>
                <div className="p-1 space-y-2 max-w-[260px]">
                  <div className="flex items-center justify-between gap-2 border-b pb-1.5">
                    <span className="font-bold text-xs text-emerald-800">{c.complaint_code}</span>
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                        c.status === "resolved" || c.status === "closed"
                          ? "bg-emerald-100 text-emerald-800"
                          : c.priority === "critical"
                          ? "bg-rose-100 text-rose-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {c.status.replace("_", " ")}
                    </span>
                  </div>

                  <h4 className="font-bold text-slate-800 text-xs leading-snug">{c.title}</h4>
                  <p className="text-[11px] text-slate-500 line-clamp-2">{c.address || c.description}</p>

                  <div className="flex items-center justify-between pt-1 text-[11px]">
                    <button
                      onClick={(e) => handleSupport(e, c.id)}
                      className="flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700 hover:bg-emerald-100 transition border border-emerald-200"
                    >
                      <span>⬆</span>
                      <span>{votes}</span>
                    </button>
                    <Link
                      href={`/track/${c.id}`}
                      className="font-bold text-emerald-700 hover:underline"
                    >
                      Full Details →
                    </Link>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Map Legend Overlay */}
      <div className="absolute bottom-4 left-4 z-[500] rounded-2xl bg-white/90 p-3 backdrop-blur-md shadow-lg border border-slate-200/80 text-[11px] space-y-1.5 hidden sm:block">
        <b className="block text-slate-800 font-bold mb-1">Map Legend</b>
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-rose-600 ring-2 ring-rose-200"></span>
          <span>Critical / SLA Urgency</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-amber-500 ring-2 ring-amber-200"></span>
          <span>In Progress / Assigned</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-emerald-200"></span>
          <span>Verified Resolved</span>
        </div>
      </div>
    </div>
  );
}
