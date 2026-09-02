'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { type MapCase } from '../types/mapCase';
import { type VerdictType } from '@/lib/mockData';

const VERDICT_COLOR: Record<VerdictType, string> = {
  PRE_EXISTING_STRUCTURE: '#ee0000',
  EARLY_START: '#ee0000',
  NO_CHANGE_DETECTED: '#f5a623',
  LOCATION_MISMATCH: '#f5a623',
  DELAYED_START: '#f5a623',
  INSUFFICIENT_DATA: '#888888',
  CONSISTENT: '#0070f3',
};

const VERDICT_LABEL: Record<VerdictType, string> = {
  PRE_EXISTING_STRUCTURE: 'Pre-existing structure',
  EARLY_START: 'Early start',
  NO_CHANGE_DETECTED: 'No change detected',
  LOCATION_MISMATCH: 'Location mismatch',
  DELAYED_START: 'Delayed start',
  INSUFFICIENT_DATA: 'Insufficient data',
  CONSISTENT: 'Consistent',
};

// Build a Leaflet divIcon from a colored Lucide MapPin SVG.
// We inline the SVG so no image request is needed, and the color
// is set per-verdict without any CSS class juggling.
function makePinIcon(color: string, isSelected: boolean): L.DivIcon {
  const size = isSelected ? 46 : 36;
  const shadow = isSelected
    ? `drop-shadow(0 4px 10px ${color}99)`
    : `drop-shadow(0 2px 5px rgba(0,0,0,0.40))`;

  // Lucide MapPin paths (viewBox 0 0 24 24)
  const svg = `
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="${size}" height="${size}"
      style="filter:${shadow};display:block;overflow:visible;"
    >
      <path
        d="M20 10c0 6-8 13-8 13S4 16 4 10a8 8 0 0 1 16 0Z"
        fill="${color}"
        stroke="${isSelected ? '#fff' : 'rgba(255,255,255,0.7)'}"
        stroke-width="${isSelected ? 1.8 : 1.2}"
      />
      <circle cx="12" cy="10" r="3"
        fill="${isSelected ? '#fff' : 'rgba(255,255,255,0.85)'}"
      />
    </svg>
  `;

  return L.divIcon({
    html: svg,
    className: '',            // no leaflet default styling
    iconSize: [size, size],
    iconAnchor: [size / 2, size],   // bottom-center of pin
    tooltipAnchor: [0, -size],
  });
}

// Resizes the map after first render (fixes blank-tile issue in Next.js).
function MapResizer() {
  const map = useMap();
  useEffect(() => {
    setTimeout(() => map.invalidateSize(), 50);
  }, [map]);
  return null;
}

interface MapViewProps {
  cases: MapCase[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export default function MapView({ cases, selectedId, onSelect }: MapViewProps) {
  return (
    <MapContainer
      center={[12.8797, 121.7740]}
      zoom={7}
      style={{ width: '100%', height: '100%' }}
      zoomControl={true}
    >
      <MapResizer />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {cases.map(c => {
        const { lat, lon } = c.analysisResult.coordinates;
        const color = VERDICT_COLOR[c.analysisResult.verdict];
        const isSelected = c.id === selectedId;
        return (
          <Marker
            key={c.id}
            position={[lat, lon]}
            icon={makePinIcon(color, isSelected)}
            zIndexOffset={isSelected ? 1000 : 0}
            eventHandlers={{ click: () => onSelect(c.id) }}
          >
            <Tooltip direction="top" offset={[0, -4]} opacity={1}>
              <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: '12px', lineHeight: 1.5, minWidth: '140px' }}>
                <div style={{ fontWeight: 600, color: '#171717', marginBottom: '2px' }}>
                  {c.analysisResult.project_name}
                </div>
                <div style={{ color, fontWeight: 500 }}>
                  {VERDICT_LABEL[c.analysisResult.verdict]}
                </div>
                <div style={{ color: '#888', marginTop: '2px' }}>{c.owner}</div>
              </div>
            </Tooltip>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
