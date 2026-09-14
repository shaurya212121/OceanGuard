import React, { useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Polyline, Polygon, Popup, LayersControl, LayerGroup } from 'react-leaflet';
import { detectSarSpill, runHindcast, runVesselScoring } from '../api/client';
import type { DriftPath, SuspectVessel } from '../types';
import { GlassCard, GuiltScoreBar } from '../components/ui';
import { Satellite, Wind, ShieldAlert, Play, RefreshCw, UploadCloud, CheckCircle2 } from 'lucide-react';

export default function Simulation() {
  const [lat, setLat] = useState<number>(18.5);
  const [lon, setLon] = useState<number>(70.2);
  const [hoursBack, setHoursBack] = useState<number>(12);
  const [currentSpeed, setCurrentSpeed] = useState<number>(0.5);
  const [currentDir, setCurrentDir] = useState<number>(45);

  const [sarLoading, setSarLoading] = useState<boolean>(false);
  const [sarResult, setSarResult] = useState<any>(null);

  const [driftLoading, setDriftLoading] = useState<boolean>(false);
  const [driftPath, setDriftPath] = useState<DriftPath | null>(null);
  const [suspects, setSuspects] = useState<SuspectVessel[]>([]);

  const handleRunSarDetection = async () => {
    setSarLoading(true);
    try {
      const res = await detectSarSpill({ center_lat: lat, center_lon: lon });
      setSarResult(res);
    } catch (err) {
      console.error(err);
    } finally {
      setSarLoading(false);
    }
  };

  const handleRunHindcast = async () => {
    setDriftLoading(true);
    try {
      const drift = await runHindcast({
        lat,
        lon,
        hours_back: hoursBack,
        current_speed: currentSpeed,
        current_direction: currentDir,
      });
      setDriftPath(drift);

      if (drift.origin_estimate) {
        const suspectList = await runVesselScoring({
          origin_lat: drift.origin_estimate.lat,
          origin_lon: drift.origin_estimate.lon,
          origin_time: drift.origin_estimate.timestamp,
        });
        setSuspects(suspectList);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDriftLoading(false);
    }
  };

  const backwardCoords = driftPath?.backward_path.map(p => [p.lat, p.lon] as [number, number]) || [];
  const forwardCoords = driftPath?.forward_path.map(p => [p.lat, p.lon] as [number, number]) || [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-navy-900 border border-line p-4 rounded-xl">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Satellite className="text-ocean" /> SAR Satellite & Drift Simulation Sandbox
          </h2>
          <p className="text-text-muted text-sm mt-1">
            Analyze SAR Radar imagery, simulate backward drift trajectories, and attribute marine oil spills live.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Controls Sidebar */}
        <div className="space-y-6">
          <GlassCard className="p-4 space-y-4">
            <h3 className="font-bold text-lg text-ocean flex items-center gap-2">
              <UploadCloud size={20} /> 1. SAR Satellite Detection
            </h3>

            <div className="border-2 border-dashed border-line p-4 rounded-lg text-center bg-navy-950/50 hover:border-ocean transition-colors cursor-pointer">
              <Satellite className="mx-auto text-text-muted mb-2" size={32} />
              <div className="text-xs text-text font-medium">Click or Drag Sentinel-1 SAR imagery</div>
              <div className="text-[10px] text-text-muted mt-1">Supports VV/VH Dual-Pol GeoTIFF / PNG</div>
            </div>

            <button
              onClick={handleRunSarDetection}
              disabled={sarLoading}
              className="w-full bg-ocean/20 hover:bg-ocean/30 text-ocean border border-ocean font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-all text-sm cursor-pointer"
            >
              {sarLoading ? <RefreshCw className="animate-spin" size={16} /> : <Play size={16} />}
              Run AI SAR Image Segmentation
            </button>

            {sarResult && (
              <div className="bg-navy-950 p-3 rounded-lg border border-line text-xs space-y-1.5">
                <div className="flex justify-between text-safe font-bold">
                  <span className="flex items-center gap-1"><CheckCircle2 size={14} /> Oil Slick Confirmed</span>
                  <span>{sarResult.confidence}% Conf.</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Affected Area:</span>
                  <span className="font-mono text-text">{sarResult.area_sq_km} km²</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Est. Volume:</span>
                  <span className="font-mono text-text">{sarResult.estimated_volume_liters.toLocaleString()} L</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Sensor:</span>
                  <span className="text-teal font-mono">{sarResult.sensor}</span>
                </div>
              </div>
            )}
          </GlassCard>

          <GlassCard className="p-4 space-y-4">
            <h3 className="font-bold text-lg text-ocean flex items-center gap-2">
              <Wind size={20} /> 2. Drift Hindcast Parameters
            </h3>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-text-muted mb-1 block">Center Lat</label>
                <input
                  type="number"
                  step="0.01"
                  value={lat}
                  onChange={e => setLat(parseFloat(e.target.value))}
                  className="w-full bg-navy-950 border border-line rounded p-2 text-text font-mono"
                />
              </div>
              <div>
                <label className="text-text-muted mb-1 block">Center Lon</label>
                <input
                  type="number"
                  step="0.01"
                  value={lon}
                  onChange={e => setLon(parseFloat(e.target.value))}
                  className="w-full bg-navy-950 border border-line rounded p-2 text-text font-mono"
                />
              </div>
              <div>
                <label className="text-text-muted mb-1 block">Hours Back (Hindcast)</label>
                <input
                  type="number"
                  value={hoursBack}
                  onChange={e => setHoursBack(parseInt(e.target.value))}
                  className="w-full bg-navy-950 border border-line rounded p-2 text-text font-mono"
                />
              </div>
              <div>
                <label className="text-text-muted mb-1 block">Current Speed (knots)</label>
                <input
                  type="number"
                  step="0.1"
                  value={currentSpeed}
                  onChange={e => setCurrentSpeed(parseFloat(e.target.value))}
                  className="w-full bg-navy-950 border border-line rounded p-2 text-text font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-text-muted text-xs mb-1 block">Current Direction ({currentDir}°)</label>
              <input
                type="range"
                min="0"
                max="360"
                value={currentDir}
                onChange={e => setCurrentDir(parseInt(e.target.value))}
                className="w-full accent-ocean"
              />
            </div>

            <button
              onClick={handleRunHindcast}
              disabled={driftLoading}
              className="w-full bg-ocean text-navy-950 hover:bg-ocean-light font-bold py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              {driftLoading ? <RefreshCw className="animate-spin" size={18} /> : <Play size={18} />}
              Execute Drift Hindcast & AIS Scoring
            </button>
          </GlassCard>
        </div>

        {/* Map & Results Display */}
        <div className="lg:col-span-2 space-y-6">
          <GlassCard className="h-[450px] relative z-0 flex flex-col">
            <div className="p-3 border-b border-line flex justify-between items-center bg-navy-800 text-sm">
              <span className="font-bold text-text">Simulation Tactical Canvas</span>
              <span className="text-xs text-text-muted font-mono">Live Leaflet Map Layer</span>
            </div>
            <div className="flex-1 bg-navy-950">
              <MapContainer center={[lat, lon]} zoom={8} className="h-full w-full">
                <LayersControl position="topright">
                  <LayersControl.BaseLayer checked name="Dark Canvas">
                    <LayerGroup>
                      <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}" />
                      <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}" />
                    </LayerGroup>
                  </LayersControl.BaseLayer>
                  <LayersControl.BaseLayer name="Satellite Imagery">
                    <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
                  </LayersControl.BaseLayer>
                </LayersControl>

                {sarResult && sarResult.polygon_coords && (
                  <Polygon
                    positions={sarResult.polygon_coords as [number, number][]}
                    pathOptions={{ color: '#00F0FF', fillColor: '#00F0FF', fillOpacity: 0.3, weight: 2 }}
                  />
                )}

                {backwardCoords.length > 0 && (
                  <Polyline positions={backwardCoords} pathOptions={{ color: '#00F0FF', dashArray: '6, 6', weight: 2 }} />
                )}

                {forwardCoords.length > 0 && (
                  <Polyline positions={forwardCoords} pathOptions={{ color: '#0EA5E9', weight: 2 }} />
                )}

                {driftPath?.origin_estimate && (
                  <CircleMarker
                    center={[driftPath.origin_estimate.lat, driftPath.origin_estimate.lon]}
                    radius={7}
                    pathOptions={{ color: '#FF2A5F', fillColor: '#FF2A5F', fillOpacity: 1, weight: 2 }}
                  >
                    <Popup>
                      <div className="p-1 font-bold text-navy-950 text-xs">
                        Estimated Origin ({driftPath.origin_estimate.hours_offset}h)
                      </div>
                    </Popup>
                  </CircleMarker>
                )}

                <CircleMarker
                  center={[lat, lon]}
                  radius={6}
                  pathOptions={{ color: '#00FFAA', fillColor: '#00FFAA', fillOpacity: 0.9, weight: 2 }}
                >
                  <Popup>
                    <div className="p-1 text-navy-950 font-bold text-xs">
                      Simulation Target: {lat.toFixed(3)}, {lon.toFixed(3)}
                    </div>
                  </Popup>
                </CircleMarker>
              </MapContainer>
            </div>
          </GlassCard>

          {/* Suspect Vessels Output */}
          <GlassCard className="p-4">
            <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
              <ShieldAlert className="text-danger" /> Attributed Suspect Vessels ({suspects.length})
            </h3>
            {suspects.length === 0 ? (
              <div className="text-text-muted text-sm py-4 text-center">
                Run hindcast simulation to score surrounding AIS vessels against origin coordinates.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {suspects.slice(0, 4).map(suspect => (
                  <div key={suspect.mmsi} className="bg-navy-950 p-3 rounded-lg border border-line text-xs space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-bold text-text text-sm">{suspect.name}</div>
                        <div className="text-text-muted font-mono">MMSI: {suspect.mmsi} | {suspect.vessel_type}</div>
                      </div>
                      <div className="text-right">
                        <div className={`text-base font-bold ${suspect.attribution_evidence_score > 60 ? 'text-danger' : 'text-warning'}`}>
                          {Math.round(suspect.attribution_evidence_score)}%
                        </div>
                        <div className="text-[9px] text-text-muted uppercase">Evidence Score</div>
                      </div>
                    </div>
                    <GuiltScoreBar score={suspect.attribution_evidence_score} />
                    <div className="text-text-dim space-y-1 mt-1">
                      {suspect.evidence_breakdown?.reasons?.map((r: string, i: number) => (
                        <div key={i}>• {r}</div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
