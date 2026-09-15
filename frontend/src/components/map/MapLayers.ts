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
    id: 'dark',
    label: 'Dark Canvas (Cities)',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap',
    maxZoom: 19,
    className: 'map-tiles-dark',
  },
  {
    id: 'bathymetry',
    label: 'Ocean Bathymetry',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri, GEBCO, NOAA',
    maxZoom: 19,
    maxNativeZoom: 13,
  },
  {
    id: 'satellite',
    label: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri, Maxar, Earthstar Geographics',
    maxZoom: 19,
    maxNativeZoom: 17,
  },
];

export function getTileLayer(id: string): TileLayerConfig {
  return tileLayers.find((l) => l.id === id) || tileLayers[0];
}

// Vessel marker — small cyan dot
export function createVesselMarker(isSuspect = false): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<div class="vessel-marker${isSuspect ? ' vessel-marker-suspect' : ''}"></div>`,
    iconSize: [10, 10],
    iconAnchor: [5, 5],
  });
}

// Origin point marker — crosshair style
export function createOriginMarker(): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<div style="width:16px;height:16px;border:1px solid #00F0FF;position:relative;">
      <div style="position:absolute;top:50%;left:-4px;width:6px;height:1px;background:#00F0FF;"></div>
      <div style="position:absolute;top:50%;right:-4px;width:6px;height:1px;background:#00F0FF;"></div>
      <div style="position:absolute;left:50%;top:-4px;width:1px;height:6px;background:#00F0FF;"></div>
      <div style="position:absolute;left:50%;bottom:-4px;width:1px;height:6px;background:#00F0FF;"></div>
      <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:4px;height:4px;background:#00F0FF;"></div>
    </div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}
