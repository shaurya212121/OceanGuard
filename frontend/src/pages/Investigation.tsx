import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { MapContainer, TileLayer, Polyline, CircleMarker, Polygon } from 'react-leaflet';
import { fetchScenario } from '../api/client';
import type { SpillScenario } from '../types';
import { GlassCard, SeverityBadge, StatusBadge, GuiltScoreBar } from '../components/ui';
import { Crosshair, Wind, Navigation } from 'lucide-react';

export default function Investigation() {
  const { id } = useParams();
  const [scenario, setScenario] = useState<SpillScenario | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      setLoading(true);
      fetchScenario(id)
        .then(data => {
          setScenario(data);
          setLoading(false);
        })
        .catch(err => {
          console.error(err);
          setError('Failed to load scenario data.');
          setLoading(false);
        });
    }
  }, [id]);

  if (loading) return <div className="p-6 text-center text-text-muted">Loading investigation data...</div>;
  if (error || !scenario) return <div className="p-6 text-center text-danger">{error || 'Scenario not found'}</div>;

  const { spill, drift, suspects } = scenario;

  const backwardPath = drift.backward_path.map(p => [p.lat, p.lon] as [number, number]);
  const forwardPath = drift.forward_path.map(p => [p.lat, p.lon] as [number, number]);
  const sortedSuspects = [...suspects].sort((a, b) => b.guilt_score - a.guilt_score);

  return (
    <div className="h-full flex flex-col gap-6">
      <div className="flex justify-between items-center bg-navy-900 border border-line p-4 rounded-xl">
        <div>
          <div className="text-sm text-text-muted mb-1 font-mono">INCIDENT: {spill.id}</div>
          <h2 className="text-2xl font-bold">{spill.name}</h2>
        </div>
        <div className="flex items-center gap-4">
          <SeverityBadge severity={spill.severity} />
          <StatusBadge status={spill.status} />
          <div className="text-sm text-text-muted bg-navy-950 px-3 py-1.5 rounded border border-line">
            Detected: {new Date(spill.detected_at).toLocaleString()}
          </div>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-5 gap-6 min-h-[600px]">
        <GlassCard className="lg:col-span-3 flex flex-col relative z-0">
          <div className="p-3 border-b border-line flex gap-4 text-sm bg-navy-800">
            <span className="flex items-center gap-2"><Crosshair size={14} className="text-ocean"/> Origin Point</span>
            <span className="flex items-center gap-2"><Wind size={14} className="text-teal"/> Drift Path</span>
          </div>
          <div className="flex-1 bg-navy-950">
            <MapContainer center={[spill.center_lat, spill.center_lon]} zoom={9} className="h-full w-full">
              <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}" />
              <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}" />
              {spill.polygon_coords && spill.polygon_coords.length > 0 && (
                <Polygon positions={spill.polygon_coords as [number, number][]} pathOptions={{ color: spill.severity === 'critical' ? '#FF2A5F' : '#00F0FF', fillColor: spill.severity === 'critical' ? '#FF2A5F' : '#00F0FF', fillOpacity: 0.15, weight: 1 }} />
              )}
              <Polyline positions={backwardPath} pathOptions={{ color: '#00F0FF', dashArray: '5, 5', weight: 1 }} />
              <Polyline positions={forwardPath} pathOptions={{ color: '#0EA5E9', weight: 1 }} />
              <CircleMarker center={[drift.origin_estimate.lat, drift.origin_estimate.lon]} radius={4} pathOptions={{ color: '#00F0FF', fillColor: '#00F0FF', fillOpacity: 1, weight: 1 }} />
              <CircleMarker center={[spill.center_lat, spill.center_lon]} radius={4} pathOptions={{ color: spill.severity === 'critical' ? '#FF2A5F' : '#00F0FF', fillColor: spill.severity === 'critical' ? '#FF2A5F' : '#00F0FF', fillOpacity: 1, weight: 1 }} />
            </MapContainer>
          </div>
        </GlassCard>

        <div className="lg:col-span-2 flex flex-col gap-6 overflow-auto">
          <GlassCard className="p-4">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Navigation className="text-ocean"/> Drift Analysis</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between border-b border-line pb-2">
                <span className="text-text-muted">Est. Spill Time Offset</span>
                <span className="font-mono text-text">{drift.origin_estimate.hours_offset < 0 ? 'T-Minus ' + Math.abs(drift.origin_estimate.hours_offset) : 'T+' + drift.origin_estimate.hours_offset}h</span>
              </div>
              <div className="flex justify-between border-b border-line pb-2">
                <span className="text-text-muted">Origin Timestamp</span>
                <span className="text-ocean font-bold">{new Date(drift.origin_estimate.timestamp).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Origin Coordinates</span>
                <span className="text-text">{drift.origin_estimate.lat.toFixed(4)}, {drift.origin_estimate.lon.toFixed(4)}</span>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-4 flex-1">
            <h3 className="font-bold text-lg mb-4">Suspect Vessels</h3>
            <div className="space-y-4">
              {sortedSuspects.map(suspect => (
                <div key={suspect.imo_number} className="bg-navy-950 p-3 rounded-lg border border-line">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-bold text-text">{suspect.name}</div>
                      <div className="text-xs text-text-muted font-mono">{suspect.imo_number} | {suspect.vessel_type} | {suspect.flag_country}</div>
                    </div>
                    <div className="text-right">
                      <div className={`text-xl font-bold ${suspect.guilt_score > 70 ? 'text-danger' : 'text-warning'}`}>{Math.round(suspect.guilt_score)}%</div>
                      <div className="text-[10px] text-text-muted uppercase">Guilt Score</div>
                    </div>
                  </div>
                  <GuiltScoreBar score={suspect.guilt_score} />
                  <div className="mt-3 text-xs text-text-dim space-y-1">
                    {suspect.had_ais_gap && (
                      <div className="flex items-center gap-1 text-danger">• AIS Gap detected near origin time</div>
                    )}
                    {suspect.had_speed_drop && (
                      <div className="flex items-center gap-1 text-warning">• Sudden speed drop detected</div>
                    )}
                    {suspect.reasons.map((reason, idx) => (
                      <div key={idx} className="flex items-center gap-1 text-text-muted">• {reason}</div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
