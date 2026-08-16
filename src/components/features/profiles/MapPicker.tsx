"use client";

import { useState, useCallback, useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet default marker icons broken by bundlers
const markerIcon = L.divIcon({
  className: "",
  html: `<div style="
    width: 28px; height: 28px;
    background: #0078D4;
    border: 3px solid #fff;
    border-radius: 50%;
    box-shadow: 0 2px 6px rgba(0,0,0,0.3);
  "></div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

// Tunisia center
const TUNISIA_CENTER: [number, number] = [34.0, 9.5];
const TUNISIA_ZOOM = 7;
const PIN_ZOOM = 15;

interface MapPickerProps {
  position: [number, number] | null; // [lng, lat] GeoJSON order
  onPositionChange: (coords: [number, number]) => void; // [lng, lat]
}

function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }): null {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function MapPicker({ position, onPositionChange }: MapPickerProps): JSX.Element {
  // Convert GeoJSON [lng, lat] to Leaflet [lat, lng]
  const leafletPos: [number, number] | null = position
    ? [position[1], position[0]]
    : null;

  const [markerPos, setMarkerPos] = useState<[number, number] | null>(leafletPos);

  useEffect(() => {
    setMarkerPos(leafletPos);
  }, [position]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleMapClick = useCallback(
    (lat: number, lng: number) => {
      setMarkerPos([lat, lng]);
      onPositionChange([lng, lat]); // GeoJSON order
    },
    [onPositionChange],
  );

  const handleDragEnd = useCallback(
    (e: L.DragEndEvent) => {
      const latlng = (e.target as L.Marker).getLatLng();
      setMarkerPos([latlng.lat, latlng.lng]);
      onPositionChange([latlng.lng, latlng.lat]); // GeoJSON order
    },
    [onPositionChange],
  );

  // Remove Leaflet attribution flag (political marker) — JS fallback for CSS
  useEffect(() => {
    const timer = setTimeout(() => {
      document.querySelectorAll(".leaflet-attribution-flag").forEach((el) => {
        (el as HTMLElement).style.display = "none";
      });
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const center = markerPos ?? TUNISIA_CENTER;
  const zoom = markerPos ? PIN_ZOOM : TUNISIA_ZOOM;

  return (
    <div className="relative z-0 isolate w-full rounded-lg overflow-hidden border border-border" style={{ height: 350 }}>
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom
        style={{ height: "100%", width: "100%" }}
        attributionControl
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapClickHandler onMapClick={handleMapClick} />
        {markerPos && (
          <Marker
            position={markerPos}
            icon={markerIcon}
            draggable
            eventHandlers={{ dragend: handleDragEnd }}
          />
        )}
      </MapContainer>
      {!markerPos && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[1000]">
          <div className="bg-white/90 px-4 py-2 rounded-lg shadow text-sm text-on-surface-variant font-medium">
            Cliquez sur la carte pour positionner votre entreprise
          </div>
        </div>
      )}
    </div>
  );
}
