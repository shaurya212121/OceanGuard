import L from 'leaflet';
import type { InterpolatedParticle } from '@/utils/driftPhysics';

export interface TileLayerConfig {
  id: string;
  label: string;
  url: string;
  attribution: string;
  maxZoom: number;
  maxNativeZoom?: number;
  className?: string;
}

export const tileLayers: TileLayerConfig[] = [
  {
    id: 'bathymetry',
    label: 'Dark Bathymetry (Naval Standard)',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri, GEBCO, NOAA, National Geographic',
    maxZoom: 19,
    maxNativeZoom: 13,
  },
  {
    id: 'dark',
    label: 'Dark Tactical Grid',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap',
    maxZoom: 19,
    maxNativeZoom: 18,
    className: 'map-tiles-dark',
  },
  {
    id: 'satellite',
    label: 'High-Res Optical Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri, Maxar, Earthstar',
    maxZoom: 19,
    maxNativeZoom: 17,
  },
];

export function getTileLayer(id: string): TileLayerConfig {
  return tileLayers.find((l) => l.id === id) || tileLayers[0];
}

// Directional vessel marker icon with heading arrow
export function createDirectionalVesselMarker(
  cog: number,
  isSuspect = false,
  isSilent = false,
  isIntermittent = false
): L.DivIcon {
  const color = isSilent
    ? '#f43f5e'
    : isIntermittent
    ? '#f59e0b'
    : isSuspect
    ? '#eab308'
    : '#00f0ff';

  const glow = isSilent
    ? '0 0 12px rgba(244,63,94,0.9)'
    : isIntermittent
    ? '0 0 10px rgba(245,158,11,0.9)'
    : isSuspect
    ? '0 0 8px rgba(234,179,8,0.8)'
    : '0 0 8px rgba(0,240,255,0.7)';

  const pulseClass = isSilent || isIntermittent ? 'animate-pulse' : '';

  return L.divIcon({
    className: '',
    html: `
      <div class="${pulseClass}" style="transform: rotate(${cog}deg); width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; position: relative;">
        <!-- Vessel Center Ring -->
        <div style="width: 8px; height: 8px; border-radius: 50%; background: ${color}; box-shadow: ${glow}; border: 1.5px solid #0a0f18;"></div>
        <!-- Directional Pointer Arrowhead -->
        <div style="position: absolute; top: -1px; width: 0; height: 0; border-left: 3.5px solid transparent; border-right: 3.5px solid transparent; border-bottom: 8px solid ${color};"></div>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

// Origin point marker — tactical crosshair style with label
export function createOriginMarker(label = 'DISCHARGE RELEASE ORIGIN (-48h)'): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `
      <div style="width: 32px; height: 32px; position: relative; display: flex; align-items: center; justify-content: center;">
        <div style="position: absolute; width: 100%; height: 100%; border: 1.5px dashed #f59e0b; border-radius: 50%; animation: spin 8s linear infinite;"></div>
        <div style="position: absolute; width: 14px; height: 14px; border: 1.5px solid #f43f5e; box-shadow: 0 0 8px #f43f5e;"></div>
        <div style="position: absolute; width: 4px; height: 4px; background: #00f0ff; border-radius: 50%;"></div>
        <div style="position: absolute; top: -8px; left: 15px; width: 2px; height: 8px; background: #f59e0b;"></div>
        <div style="position: absolute; bottom: -8px; left: 15px; width: 2px; height: 8px; background: #f59e0b;"></div>
        <div style="position: absolute; left: -8px; top: 15px; height: 2px; width: 8px; background: #f59e0b;"></div>
        <div style="position: absolute; right: -8px; top: 15px; height: 2px; width: 8px; background: #f59e0b;"></div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

// Particle marker styling for high-density OpenDrift particles
export function createParticleDivIcon(particle: InterpolatedParticle): L.DivIcon {
  let color = '#00f0ff';
  let glow = '0 0 4px #00f0ff';

  if (particle.state === 'BEACHED') {
    color = '#f43f5e';
    glow = '0 0 6px #f43f5e';
  } else if (particle.state === 'EMULSIFIED') {
    color = '#f59e0b';
    glow = '0 0 5px #f59e0b';
  } else if (particle.state === 'DISPERSED') {
    color = '#38bdf8';
    glow = '0 0 3px #38bdf8';
  }

  const size = Math.max(3, Math.min(8, Math.round(particle.density * 7)));
  const opacity = Math.max(0.4, particle.density);

  return L.divIcon({
    className: '',
    html: `
      <div style="
        width: ${size}px;
        height: ${size}px;
        border-radius: 50%;
        background-color: ${color};
        box-shadow: ${glow};
        opacity: ${opacity};
        transition: all 0.15s ease-out;
      "></div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

// Environmental forcing vector streamline icon
export function createStreamlineVectorIcon(
  type: 'CURRENT' | 'WIND',
  angleDeg: number,
  magnitudeKts: number
): L.DivIcon {
  const isWind = type === 'WIND';
  const color = isWind ? '#f59e0b' : '#00f0ff';
  const label = isWind ? `${magnitudeKts} kts W` : `${magnitudeKts} kts C`;

  return L.divIcon({
    className: '',
    html: `
      <div style="
        display: flex;
        align-items: center;
        gap: 4px;
        transform: rotate(${angleDeg}deg);
        opacity: 0.75;
        pointer-events: none;
      ">
        <div style="
          width: 32px;
          height: 1.5px;
          background: linear-gradient(90deg, transparent, ${color});
        "></div>
        <div style="
          width: 0;
          height: 0;
          border-top: 3px solid transparent;
          border-bottom: 3px solid transparent;
          border-left: 6px solid ${color};
        "></div>
        <span style="
          font-family: monospace;
          font-size: 8px;
          color: ${color};
          transform: rotate(-${angleDeg}deg);
          white-space: nowrap;
        ">${label}</span>
      </div>
    `,
    iconSize: [60, 20],
    iconAnchor: [30, 10],
  });
}
