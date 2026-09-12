import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Marker, Popup, LayersControl, LayerGroup, Polygon } from 'react-leaflet';
import L from 'leaflet';
import { fetchRecentSpills, fetchVessels } from '../api/client';
import type { Spill, VesselSummary } from '../types';

// Custom vessel icon
const vesselIcon = new L.DivIcon({
  html: `<div class="w-3 h-3 bg-ocean rounded-full border border-ocean-light shadow-[0_0_10px_#06b6d4]"></div>`,
  className: 'bg-transparent',
  iconSize: [12, 12],
  iconAnchor: [6, 6]
});

export default function LiveMap() {
  const [spills, setSpills] = useState<Spill[]>([]);
  const [vessels, setVessels] = useState<VesselSummary[]>([]);

  useEffect(() => {
    fetchRecentSpills().then(setSpills);
    fetchVessels().then(setVessels);
  }, []);

  const validVessels = vessels.filter(
    v => v.last_known_position?.lat != null && v.last_known_position?.lon != null
  );

  return (
    <div className="h-[calc(100vh-8rem)] rounded-xl overflow-hidden border border-line shadow-lg relative z-0">
      <MapContainer center={[14.5, 75.1]} zoom={6} className="h-full w-full">
        <LayersControl position="topright">
          <LayersControl.BaseLayer checked name="Dark Matter">
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
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
                      pathOptions={{ color: '#f59e0b', fillColor: '#f97316', fillOpacity: 0.4, weight: 2 }}
                    />
                  )}
                  <CircleMarker 
                    center={[spill.center_lat, spill.center_lon]} 
                    radius={8}
                    pathOptions={{ color: '#f97316', fillColor: '#f59e0b', fillOpacity: 0.8, weight: 2 }}
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
                  key={vessel.imo_number}
                  position={[vessel.last_known_position.lat!, vessel.last_known_position.lon!]}
                  icon={vesselIcon}
                >
                  <Popup>
                    <div className="p-1">
                      <div className="font-bold text-navy-950 text-sm">{vessel.name}</div>
                      <div className="text-xs text-navy-800 font-mono">IMO: {vessel.imo_number}</div>
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
