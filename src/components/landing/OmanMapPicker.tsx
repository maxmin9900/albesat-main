"use client";

import dynamic from "next/dynamic";
import type { OmanLatLng } from "./OmanMapLeaflet";

// Leaflet touches `window`, so it must load client-side only.
const OmanMapLeaflet = dynamic(() => import("./OmanMapLeaflet"), {
  ssr: false,
  loading: () => (
    <div className="flex h-72 items-center justify-center rounded-lg border border-gold/20 bg-void/60 text-xs text-muted">
      Loading the map of Oman…
    </div>
  ),
});

export type { OmanLatLng };

export default function OmanMapPicker({
  onSelect,
  initial,
  initialAddress,
}: {
  onSelect: (address: string, coords?: OmanLatLng) => void;
  initial?: OmanLatLng | null;
  initialAddress?: string;
}) {
  return (
    <OmanMapLeaflet
      onSelect={onSelect}
      initial={initial}
      initialAddress={initialAddress}
    />
  );
}
