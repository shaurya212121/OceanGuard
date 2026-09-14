import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Marker, Popup, LayersControl, LayerGroup, Polygon } from 'react-leaflet';
import L from 'leaflet';
import { fetchRecentSpills, fetchVessels } from '../api/client';
import type { Spill, VesselSummary } from '../types';

// Custom vessel icon
const vesselIcon = new L.DivIcon({
  html: `<div style="width: 10px; height: 10px; background-color: #00F0FF; border-radius: 50%; border: 1px solid #030C14;"></div>`,
  className: 'bg-transparent',
  iconSize: [10, 10],
  iconAnchor: [5, 5]
});

export default function LiveMap() {
  const [spills, setSpills] = useState<Spill[]>([]);
  const [vessels, setVessels] = useState<VesselSummary[]>([]);
  const [filterType, setFilterType] = useState<string>('ALL');

  useEffect(() => {
    fetchRecentSpills().then(setSpills);
    fetchVessels().then(setVessels);
  }, []);

  const validVessels = vessels.filter(
    v => v.last_known_position?.lat != null && v.last_known_position?.lon != null &&
      (filterType === 'ALL' || v.vessel_type.toUpperCase() === filterType)
  );

  return (
    <div className="h-[calc(100vh-8rem)] border border-line relative z-0 instrument-panel">
      {/* Quick Filter Control Overlay */}
      <div className="absolute top-4 left-14 z-[400] bg-navy-900/90 backdrop-blur-md border border-line p-2 rounded-lg flex items-center gap-2 text-xs font-mono">
        <span className="text-text-muted uppercase px-1">Vessel Filter:</span>
        {['ALL', 'TANKER', 'CARGO', 'FISHING'].map(type => (
          <button
            key={type}
            onClick={() => setFilterType(type)}
            className={`px-2.5 py-1 rounded transition-colors ${filterType === type ? 'bg-ocean text-navy-950 font-bold' : 'text-text hover:bg-navy-800'}`}
          >
            {type}
          </button>
        ))}
      </div>

      <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-amber -translate-x-[1px] -translate-y-[1px] z-50" />
      <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-amber translate-x-[1px] -translate-y-[1px] z-50" />
      <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-amber -translate-x-[1px] translate-y-[1px] z-50" />
      <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-amber translate-x-[1px] translate-y-[1px] z-50" />
      <MapContainer center={[14.5, 75.1]} zoom={6} className="h-full w-full">
        <LayersControl position="topright">
          <LayersControl.BaseLayer checked name="Dark Canvas (Cities)">
            <LayerGroup>
              <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}" />
              <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}" />
            </LayerGroup>
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Ocean Bathymetry">
            <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}" />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Satellite">
            <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
          </LayersControl.BaseLayer>

          <LayersControl.Overlay checked name="Oil Spills">
            <LayerGroup>
              {spills.map(spill => (
                <React.Fragment key={spill.id}>
                  {spill.polygon_coords && spill.polygon_coords.length > 0 && (
                    <Polygon
                      positions={spill.polygon_coords as [number, number][]}
                      pathOptions={{ color: spill.severity === 'critical' ? '#FF2A5F' : '#00F0FF', fillColor: spill.severity === 'critical' ? '#FF2A5F' : '#00F0FF', fillOpacity: 0.25, weight: 1.5 }}
                    />
                  )}
                  <CircleMarker 
                    center={[spill.center_lat, spill.center_lon]} 
                    radius={5}
                    pathOptions={{ color: spill.severity === 'critical' ? '#FF2A5F' : '#00F0FF', fillColor: spill.severity === 'critical' ? '#FF2A5F' : '#00F0FF', fillOpacity: 1, weight: 1 }}
                  >
                    <Popup className="custom-popup">
                      <div className="p-1">
                        <div className="font-bold text-navy-950 text-sm mb-1">{spill.name}</div>
                        <div className="text-xs text-navy-800 mb-1">Area: {spill.area_sq_km} km²</div>
                        <div className="text-xs text-navy-800">Type: {spill.spill_type}</div>
                      </div>
                    </Popup>
                  </CircleMarker>
                </React.Fragment>
              ))}
            </LayerGroup>
          </LayersControl.Overlay>

          <LayersControl.Overlay checked name="Vessels (AIS)">
            <LayerGroup>
              {validVessels.map(vessel => (
                <Marker
                  key={vessel.mmsi}
                  position={[vessel.last_known_position.lat!, vessel.last_known_position.lon!]}
                  icon={vesselIcon}
                >
                  <Popup>
                    <div className="p-1">
                      <div className="font-bold text-navy-950 text-sm">{vessel.name}</div>
                      <div className="text-xs text-navy-800 font-mono">MMSI: {vessel.mmsi} {vessel.imo_number ? `| ${vessel.imo_number}` : ''}</div>
                      <div className="text-xs text-navy-800 mt-1">{vessel.vessel_type} | {vessel.flag_country}</div>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </LayerGroup>
          </LayersControl.Overlay>
        </LayersControl>
      </MapContainer>
    </div>
  );
}
