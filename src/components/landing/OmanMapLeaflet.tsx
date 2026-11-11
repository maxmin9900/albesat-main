"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Oman bounding box (with a little breathing room)
const OMAN_BOUNDS = L.latLngBounds([15.8, 51.0], [27.2, 61.5]);

/**
 * Real interactive map of Oman (OpenStreetMap). The visitor clicks their
 * location; we reverse-geocode it to a human address (Nominatim) and hand it
 * to the registration form.
 */
export type OmanLatLng = { lat: number; lng: number };

export default function OmanMapLeaflet({
  onSelect,
  initial,
  initialAddress,
}: {
  onSelect: (address: string, coords?: OmanLatLng) => void;
  /** optional starting pin (e.g. carried over from the ERP booking form) */
  initial?: OmanLatLng | null;
  initialAddress?: string;
}) {
  const holderRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.CircleMarker | null>(null);
  const [picked, setPicked] = useState<string>(initialAddress ?? "");
  const [looking, setLooking] = useState(false);

  useEffect(() => {
    if (!holderRef.current || mapRef.current) return;

    const hasInitial =
      initial && Number.isFinite(initial.lat) && Number.isFinite(initial.lng);

    const map = L.map(holderRef.current, {
      center: hasInitial ? [initial!.lat, initial!.lng] : [21.5, 56.5],
      zoom: hasInitial ? 13 : 6,
      minZoom: 5,
      maxZoom: 18,
      maxBounds: OMAN_BOUNDS,
      maxBoundsViscosity: 0.9,
      attributionControl: true,
    });
    mapRef.current = map;

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
    }).addTo(map);

    const dropPin = (lat: number, lng: number) => {
      if (markerRef.current) markerRef.current.remove();
      markerRef.current = L.circleMarker([lat, lng], {
        radius: 9,
        color: "#e6c67a",
        weight: 3,
        fillColor: "#c9a24b",
        fillOpacity: 0.9,
      }).addTo(map);
    };

    // show the pin carried over from the ERP form straight away
    if (hasInitial) dropPin(initial!.lat, initial!.lng);

    map.on("click", async (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      dropPin(lat, lng);

      // reverse-geocode to a real address (falls back to coordinates)
      setLooking(true);
      let address = `${lat.toFixed(5)}, ${lng.toFixed(5)} — Oman`;
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=jsonv2&accept-language=en`,
          { headers: { Accept: "application/json" } }
        );
        if (res.ok) {
          const data = await res.json();
          if (data?.display_name) address = data.display_name as string;
        }
      } catch {
        /* offline / rate-limited → keep the coordinate address */
      }
      setLooking(false);
      setPicked(address);
      onSelect(address, { lat, lng });
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="overflow-hidden rounded-lg border border-gold/20">
      <div ref={holderRef} className="h-72 w-full" />
      <div className="bg-void/80 px-3 py-2 text-center text-xs">
        {looking ? (
          <span className="text-muted">Locating…</span>
        ) : picked ? (
          <span className="text-gold-light">📍 {picked}</span>
        ) : (
          <span className="text-muted">
            Tap your location on the map of Oman
          </span>
        )}
      </div>
    </div>
  );
}
