'use client';

// Shows a 3×3 grid of ESRI World Imagery tiles centred on a coordinate.
// ESRI World Imagery is free and requires no API key.
// Tile URL: https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}
// Note: ESRI tiles are NOT time-indexed — both panels show the same current imagery.
// The "before" / "after" labels indicate the analysis window, not different image dates.
// Actual analysis uses Sentinel-1 SAR radar (shown in the chart below).

interface SatelliteCompareProps {
  lat: number;
  lon: number;
  ntpDate: string;
  detectedDate: string | null;
}

function latLonToTile(lat: number, lon: number, zoom: number) {
  const n = Math.pow(2, zoom);
  const x = Math.floor(((lon + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n
  );
  return { x, y, z: zoom };
}

function TileGrid({ lat, lon, zoom = 15 }: { lat: number; lon: number; zoom?: number }) {
  const center = latLonToTile(lat, lon, zoom);
  // 3×3 grid centred on the project coordinate
  const tiles: { tx: number; ty: number }[] = [];
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      tiles.push({ tx: center.x + dx, ty: center.y + dy });
    }
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        width: '100%',
        aspectRatio: '1',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {tiles.map(({ tx, ty }) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={`${tx}-${ty}`}
          src={`https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${zoom}/${ty}/${tx}`}
          alt=""
          style={{ width: '100%', aspectRatio: '1', display: 'block' }}
          loading="lazy"
        />
      ))}
      {/* Crosshair centred on the exact coordinate */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none',
        }}
      >
        <svg width="28" height="28" viewBox="0 0 28 28">
          <circle cx="14" cy="14" r="7" fill="none" stroke="#fff" strokeWidth="2" />
          <circle cx="14" cy="14" r="2.5" fill="#fff" />
          <line x1="14" y1="0" x2="14" y2="8" stroke="#fff" strokeWidth="1.5" />
          <line x1="14" y1="20" x2="14" y2="28" stroke="#fff" strokeWidth="1.5" />
          <line x1="0" y1="14" x2="8" y2="14" stroke="#fff" strokeWidth="1.5" />
          <line x1="20" y1="14" x2="28" y2="14" stroke="#fff" strokeWidth="1.5" />
        </svg>
      </div>
    </div>
  );
}

function formatDate(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

const FONT = "'IBM Plex Sans', sans-serif";
const FONT_BODY = "'Roboto', sans-serif";

export default function SatelliteCompare({ lat, lon, ntpDate, detectedDate }: SatelliteCompareProps) {
  const beforeDate = new Date(`${ntpDate}T00:00:00`);
  beforeDate.setMonth(beforeDate.getMonth() - 6);
  const beforeLabel = beforeDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  const afterLabel = detectedDate ? formatDate(detectedDate) : 'After NTP';

  return (
    <div
      style={{
        borderRadius: '14px',
        border: '1px solid var(--hairline)',
        overflow: 'hidden',
        background: 'var(--canvas-soft)',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '10px 14px',
          borderBottom: '1px solid var(--hairline)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)', fontFamily: FONT }}>
          Satellite imagery
        </span>
        <span style={{ fontSize: '11px', color: 'var(--mute)', fontFamily: FONT_BODY }}>
          ESRI World Imagery · zoom 15
        </span>
      </div>

      {/* Two panels */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1px', background: 'var(--hairline)' }}>
        {/* Before */}
        <div>
          <div
            style={{
              background: 'rgba(0,0,0,0.6)',
              color: '#fff',
              fontSize: '11px',
              fontWeight: 600,
              fontFamily: FONT,
              padding: '5px 8px',
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <span>Before NTP</span>
            <span style={{ fontWeight: 400, opacity: 0.75 }}>{beforeLabel}</span>
          </div>
          <TileGrid lat={lat} lon={lon} zoom={15} />
        </div>

        {/* After */}
        <div>
          <div
            style={{
              background: 'rgba(0,0,0,0.6)',
              color: '#fff',
              fontSize: '11px',
              fontWeight: 600,
              fontFamily: FONT,
              padding: '5px 8px',
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <span>After / detected</span>
            <span style={{ fontWeight: 400, opacity: 0.75 }}>{afterLabel}</span>
          </div>
          <TileGrid lat={lat} lon={lon} zoom={15} />
        </div>
      </div>

      {/* Disclaimer */}
      <div
        style={{
          padding: '8px 12px',
          fontSize: '11px',
          color: 'var(--mute)',
          fontFamily: FONT_BODY,
          lineHeight: 1.5,
          borderTop: '1px solid var(--hairline)',
        }}
      >
        Optical imagery shown for location reference only — not time-indexed. Change detection uses Sentinel-1 SAR radar (see chart below).
      </div>
    </div>
  );
}
