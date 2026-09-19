import L from 'leaflet';

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
export function createDirectionalVesselMarker(cog: number, isSuspect = false, isSilent = false): L.DivIcon {
  const color = isSilent ? '#f43f5e' : isSuspect ? '#f59e0b' : '#00f0ff';
  const glow = isSilent
    ? '0 0 10px rgba(244,63,94,0.9)'
    : isSuspect
    ? '0 0 8px rgba(245,158,11,0.8)'
    : '0 0 8px rgba(0,240,255,0.7)';

  return L.divIcon({
    className: '',
    html: `
      <div style="transform: rotate(${cog}deg); width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; position: relative;">
        <!-- Vessel Center -->
        <div style="width: 8px; height: 8px; border-radius: 50%; background: ${color}; box-shadow: ${glow}; border: 1.5px solid #0a0f18;"></div>
        <!-- Directional Pointer -->
        <div style="position: absolute; top: 0px; width: 0; height: 0; border-left: 3px solid transparent; border-right: 3px solid transparent; border-bottom: 7px solid ${color};"></div>
      </div>
    `,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
}

// Origin point marker — tactical crosshair style
export function createOriginMarker(): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `
      <div style="width: 24px; height: 24px; position: relative; display: flex; align-items: center; justify-content: center;">
        <div style="position: absolute; width: 100%; height: 100%; border: 1px solid #00f0ff; border-radius: 50%; animation: pulse-red 2s infinite;"></div>
        <div style="position: absolute; width: 10px; height: 10px; border: 1.5px solid #f43f5e;"></div>
        <div style="position: absolute; width: 2px; height: 2px; background: #00f0ff;"></div>
        <div style="position: absolute; top: -6px; left: 11px; width: 2px; height: 6px; background: #00f0ff;"></div>
        <div style="position: absolute; bottom: -6px; left: 11px; width: 2px; height: 6px; background: #00f0ff;"></div>
        <div style="position: absolute; left: -6px; top: 11px; height: 2px; width: 6px; background: #00f0ff;"></div>
        <div style="position: absolute; right: -6px; top: 11px; height: 2px; width: 6px; background: #00f0ff;"></div>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}
