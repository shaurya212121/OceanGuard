import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Polygon, Polyline, CircleMarker, Marker, Tooltip, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import { Search, Crosshair, Navigation, Target, FileText, Clock, MapPin, Loader2 } from 'lucide-react';
import { fetchSpills, fetchSpillById, type OilSpill, type SpillWithSuspects } from '@/lib/db';
import { getTileLayer, createOriginMarker } from '@/components/map/MapLayers';

const tileLayer = getTileLayer('dark');

const severityBadge = (sev: string) => {
  switch (sev) {
    case 'CRITICAL': return 'text-ocean-red border-ocean-red/40 bg-ocean-red/5';
    case 'HIGH': return 'text-ocean-amber border-ocean-amber/40 bg-ocean-amber/5';
    case 'MODERATE': return 'text-ocean-sky border-ocean-sky/40 bg-ocean-sky/5';
    default: return 'text-ocean-text-muted border-ocean-border';
  }
};

const statusBadge = (status: string) => {
  switch (status) {
    case 'ACTIVE': return 'text-ocean-red border-ocean-red/40';
    case 'MONITORING': return 'text-ocean-amber border-ocean-amber/40';
    case 'CONTAINED': return 'text-ocean-sky border-ocean-sky/40';
    case 'RESOLVED': return 'text-ocean-green border-ocean-green/40';
    default: return 'text-ocean-text-muted border-ocean-border';
  }
};

function GuiltBar({ score }: { score: number }) {
  const color = score >= 80 ? '#FF2A5F' : score >= 60 ? '#FBBF24' : score >= 40 ? '#0EA5E9' : '#475569';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-ocean-bg border border-ocean-border/50 relative overflow-hidden">
        <div
          className="h-full transition-all duration-500"
          style={{ width: `${score}%`, background: color }}
        />
      </div>
      <span className="font-mono text-xs font-medium tabular-nums" style={{ color }}>
        {score}%
      </span>
    </div>
  );
}

export default function InvestigationsDesk() {
  const [spills, setSpills] = useState<OilSpill[]>([]);
  const [selectedSpillId, setSelectedSpillId] = useState<string | null>(null);
  const [selectedSpill, setSelectedSpill] = useState<SpillWithSuspects | null>(null);
  const [loading, setLoading] = useState(true);
  const [spillLoading, setSpillLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchSpills();
        setSpills(data);
        if (data.length > 0) {
          setSelectedSpillId(data[0].id);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load spills');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!selectedSpillId) return;
    (async () => {
      setSpillLoading(true);
      try {
        const detail = await fetchSpillById(selectedSpillId);
        setSelectedSpill(detail);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load spill details');
      } finally {
        setSpillLoading(false);
      }
    })();
  }, [selectedSpillId]);

  useEffect(() => {
    if (mapRef.current && selectedSpill) {
      setTimeout(() => {
        mapRef.current?.invalidateSize();
        mapRef.current?.flyTo([selectedSpill.lat, selectedSpill.lng], 8, { duration: 1.2 });
      }, 100);
    }
  }, [selectedSpill]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 size={24} className="animate-spin text-ocean-cyan" />
        <span className="font-mono text-sm text-ocean-text-dim ml-3">LOADING INVESTIGATION FILES...</span>
      </div>
    );
  }

  if (error && spills.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="tactical-corners p-6 max-w-md">
          <p className="font-mono text-sm text-ocean-red mb-2">[ DATA LINK ERROR ]</p>
          <p className="font-sans text-sm text-ocean-text-dim">{error}</p>
        </div>
      </div>
    );
  }

  if (!selectedSpill) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 size={24} className="animate-spin text-ocean-cyan" />
        <span className="font-mono text-sm text-ocean-text-dim ml-3">LOADING SPILL DATA...</span>
      </div>
    );
  }

  const backwardDrift: [number, number][] = [
    [selectedSpill.lat, selectedSpill.lng],
    [selectedSpill.origin_lat, selectedSpill.origin_lng],
  ];

  const forwardDrift: [number, number][] = [
    [selectedSpill.lat, selectedSpill.lng],
    [selectedSpill.forward_drift_lat, selectedSpill.forward_drift_lng],
  ];

  const spillColor = selectedSpill.severity === 'CRITICAL' ? '#FF2A5F' : '#00F0FF';

  return (
    <div className="flex h-full w-full">
      {/* Left — Spill List */}
      <div className="w-72 shrink-0 bg-ocean-panel border-r border-ocean-border flex flex-col">
        <div className="px-4 py-4 border-b border-ocean-border">
          <div className="flex items-center gap-2 mb-3">
            <Search size={14} strokeWidth={1.5} className="text-ocean-cyan" />
            <span className="font-mono text-[10px] text-ocean-text-muted tracking-widest">INVESTIGATION FILES</span>
          </div>
          <div className="relative">
            <input
              type="text"
              placeholder="Search spill ID..."
              className="w-full bg-ocean-bg border border-ocean-border px-3 py-2 pl-8 font-mono text-xs text-ocean-text placeholder:text-ocean-text-muted focus:border-ocean-cyan/40 focus:outline-none transition-colors"
            />
            <Search size={12} strokeWidth={1.5} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ocean-text-muted" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {spills.map((spill) => (
            <button
              key={spill.id}
              onClick={() => setSelectedSpillId(spill.id)}
              className={`w-full text-left p-3 border transition-all duration-150 ${
                selectedSpillId === spill.id
                  ? 'border-ocean-cyan/40 bg-ocean-cyan/5'
                  : 'border-transparent hover:border-ocean-border'
              }`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span className={`status-badge ${severityBadge(spill.severity)}`}>{spill.severity}</span>
                <span className={`status-badge ${statusBadge(spill.status)}`}>{spill.status}</span>
              </div>
              <p className="font-sans text-xs font-medium text-ocean-text leading-snug">{spill.name}</p>
              <p className="font-mono text-[10px] text-ocean-text-muted mt-1">{spill.spill_id}</p>
              <div className="flex items-center gap-3 mt-2">
                <span className="font-mono text-[10px] text-ocean-text-dim">{spill.area_km2} km²</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Center — Map + Details */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Spill Header */}
        <div className="px-6 py-4 border-b border-ocean-border bg-ocean-panel">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h2 className="font-sans text-lg font-semibold text-ocean-text">{selectedSpill.name}</h2>
                <span className={`status-badge ${severityBadge(selectedSpill.severity)}`}>{selectedSpill.severity}</span>
                <span className={`status-badge ${statusBadge(selectedSpill.status)}`}>{selectedSpill.status}</span>
              </div>
              <p className="font-mono text-[11px] text-ocean-text-muted">
                {selectedSpill.spill_id} — DETECTED {selectedSpill.detected_at.replace('T', ' ').slice(0, 19)}Z
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="font-mono text-[10px] text-ocean-text-muted">AREA</p>
                <p className="font-mono text-lg text-ocean-text">{selectedSpill.area_km2}<span className="text-ocean-text-dim text-sm"> km²</span></p>
              </div>
              <div className="text-right">
                <p className="font-mono text-[10px] text-ocean-text-muted">SUSPECTS</p>
                <p className="font-mono text-lg text-ocean-cyan">{selectedSpill.suspects.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Map + Suspect Panel */}
        <div className="flex-1 flex min-h-0">
          {/* Map */}
          <div className="flex-1 relative">
            <div className="absolute top-3 left-3 z-[1000] flex flex-col gap-1">
              <div className="tactical-corners bg-ocean-panel/90 px-3 py-2 space-y-1.5">
                <p className="font-mono text-[9px] text-ocean-text-muted tracking-widest">TRAJECTORY</p>
                <div className="flex items-center gap-2">
                  <span className="w-4 h-0.5 bg-ocean-cyan" style={{ borderTop: '1px dashed #00F0FF' }} />
                  <span className="font-mono text-[9px] text-ocean-text-dim">BACKWARD DRIFT</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-4 h-0.5 bg-ocean-amber" style={{ borderTop: '1px dashed #FBBF24' }} />
                  <span className="font-mono text-[9px] text-ocean-text-dim">FORWARD DRIFT</span>
                </div>
                <div className="flex items-center gap-2">
                  <Crosshair size={10} strokeWidth={1.5} className="text-ocean-cyan" />
                  <span className="font-mono text-[9px] text-ocean-text-dim">ORIGIN POINT</span>
                </div>
              </div>
            </div>

            <MapContainer
              center={[selectedSpill.lat, selectedSpill.lng]}
              zoom={8}
              className="w-full h-full"
              ref={(m) => { if (m) mapRef.current = m; }}
              zoomControl={false}
            >
              <TileLayer url={tileLayer.url} attribution={tileLayer.attribution} maxZoom={tileLayer.maxZoom} maxNativeZoom={tileLayer.maxNativeZoom} className={tileLayer.className} />
              <ZoomControl position="bottomright" />

              {/* Spill polygon */}
              <Polygon
                positions={selectedSpill.polygon}
                pathOptions={{ color: spillColor, fillColor: spillColor, fillOpacity: 0.2, weight: 1.5 }}
              >
                <Tooltip sticky>
                  <div className="font-mono text-[10px]">
                    <div className="text-ocean-cyan font-bold">{selectedSpill.spill_id}</div>
                    <div className="text-ocean-text">{selectedSpill.area_km2} km²</div>
                  </div>
                </Tooltip>
              </Polygon>

              {/* Backward drift — dashed cyan */}
              <Polyline
                positions={backwardDrift}
                pathOptions={{ color: '#00F0FF', weight: 2, dashArray: '6 4' }}
              />

              {/* Forward drift — dashed amber */}
              <Polyline
                positions={forwardDrift}
                pathOptions={{ color: '#FBBF24', weight: 2, dashArray: '6 4' }}
              />

              {/* Spill center */}
              <CircleMarker
                center={[selectedSpill.lat, selectedSpill.lng]}
                radius={6}
                pathOptions={{ color: spillColor, fillColor: spillColor, fillOpacity: 0.4, weight: 2 }}
              />

              {/* Origin point */}
              <Marker
                position={[selectedSpill.origin_lat, selectedSpill.origin_lng]}
                icon={createOriginMarker()}
              >
                <Tooltip>
                  <div className="font-mono text-[10px]">
                    <div className="text-ocean-cyan font-bold">ORIGIN POINT</div>
                    <div className="text-ocean-text-dim">
                      {selectedSpill.origin_lat.toFixed(4)}°N, {selectedSpill.origin_lng.toFixed(4)}°E
                    </div>
                  </div>
                </Tooltip>
              </Marker>

              {/* Forward drift endpoint */}
              <CircleMarker
                center={[selectedSpill.forward_drift_lat, selectedSpill.forward_drift_lng]}
                radius={4}
                pathOptions={{ color: '#FBBF24', fillColor: '#FBBF24', fillOpacity: 0.3, weight: 1 }}
              >
                <Tooltip>
                  <div className="font-mono text-[10px]">
                    <div className="text-ocean-amber font-bold">FORWARD PROJECTION</div>
                    <div className="text-ocean-text-dim">ETA: 18h 00m</div>
                  </div>
                </Tooltip>
              </CircleMarker>

              {/* Suspect vessel positions */}
              {selectedSpill.suspects.map((suspect) => (
                <CircleMarker
                  key={suspect.id}
                  center={[suspect.last_lat, suspect.last_lng]}
                  radius={5}
                  pathOptions={{
                    color: suspect.guilt_score >= 80 ? '#FF2A5F' : suspect.guilt_score >= 60 ? '#FBBF24' : '#0EA5E9',
                    fillColor: suspect.guilt_score >= 80 ? '#FF2A5F' : suspect.guilt_score >= 60 ? '#FBBF24' : '#0EA5E9',
                    fillOpacity: 1,
                    weight: 1,
                  }}
                >
                  <Tooltip sticky>
                    <div className="font-mono text-[10px]">
                      <div className="text-ocean-cyan font-bold">{suspect.mmsi}</div>
                      <div className="text-ocean-text">{suspect.name}</div>
                      <div className="text-ocean-text-dim">GUILT: {suspect.guilt_score}%</div>
                      <div className="text-ocean-text-dim">DIST: {suspect.distance_nm} NM</div>
                    </div>
                  </Tooltip>
                </CircleMarker>
              ))}
            </MapContainer>
          </div>

          {/* Suspect Attribution Panel */}
          <div className="w-80 shrink-0 bg-ocean-panel border-l border-ocean-border flex flex-col">
            <div className="px-4 py-4 border-b border-ocean-border">
              <div className="flex items-center gap-2">
                <Target size={14} strokeWidth={1.5} className="text-ocean-cyan" />
                <span className="font-mono text-[10px] text-ocean-text-muted tracking-widest">SUSPECT ATTRIBUTION</span>
              </div>
              <p className="font-sans text-sm text-ocean-text mt-2">Ranked by Guilt Score</p>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {spillLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 size={20} className="animate-spin text-ocean-cyan" />
                </div>
              ) : (
                selectedSpill.suspects.map((suspect, idx) => {
                  const guiltColor =
                    suspect.guilt_score >= 80 ? 'text-ocean-red' :
                    suspect.guilt_score >= 60 ? 'text-ocean-amber' :
                    'text-ocean-sky';
                  return (
                    <div
                      key={suspect.id}
                      className="border border-ocean-border p-3 hover:border-ocean-cyan/30 transition-colors duration-150"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`font-mono text-lg font-bold ${guiltColor}`}>#{idx + 1}</span>
                          <div>
                            <p className="font-sans text-sm text-ocean-text font-medium leading-snug">{suspect.name}</p>
                            <p className="font-mono text-[10px] text-ocean-text-muted">{suspect.mmsi}</p>
                          </div>
                        </div>
                        {suspect.guilt_score >= 80 && (
                          <span className="status-badge text-ocean-red border-ocean-red/40 pulse-red">
                            FLAGGED
                          </span>
                        )}
                      </div>

                      <div className="space-y-2 mt-3">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-mono text-[9px] text-ocean-text-muted">GUILT SCORE</span>
                          </div>
                          <GuiltBar score={suspect.guilt_score} />
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-ocean-border/50">
                          <div>
                            <p className="font-mono text-[9px] text-ocean-text-muted">DISTANCE</p>
                            <p className="font-mono text-xs text-ocean-text">{suspect.distance_nm} NM</p>
                          </div>
                          <div>
                            <p className="font-mono text-[9px] text-ocean-text-muted">AOI MATCH</p>
                            <p className="font-mono text-xs text-ocean-text">{suspect.aoi_match}%</p>
                          </div>
                          <div>
                            <p className="font-mono text-[9px] text-ocean-text-muted">TYPE</p>
                            <p className="font-sans text-[11px] text-ocean-text-dim">{suspect.type}</p>
                          </div>
                          <div>
                            <p className="font-mono text-[9px] text-ocean-text-muted">FLAG</p>
                            <p className="font-sans text-[11px] text-ocean-text-dim">{suspect.flag}</p>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-ocean-border/50">
                          <p className="font-mono text-[9px] text-ocean-text-muted">LAST POSITION</p>
                          <p className="font-mono text-[10px] text-ocean-text-dim">
                            {suspect.last_lat.toFixed(4)}°N, {suspect.last_lng.toFixed(4)}°E
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Action Bar */}
            <div className="px-3 py-3 border-t border-ocean-border space-y-2">
              <button className="w-full flex items-center justify-center gap-2 py-2 border border-ocean-cyan/40 bg-ocean-cyan/5 text-ocean-cyan hover:bg-ocean-cyan/10 transition-colors">
                <FileText size={14} strokeWidth={1.5} />
                <span className="font-sans text-xs font-medium">Generate Report</span>
              </button>
              <button className="w-full flex items-center justify-center gap-2 py-2 border border-ocean-border text-ocean-text-dim hover:border-ocean-cyan/40 hover:text-ocean-text transition-colors">
                <Navigation size={14} strokeWidth={1.5} />
                <span className="font-sans text-xs font-medium">Dispatch Patrol</span>
              </button>
            </div>
          </div>
        </div>

        {/* Bottom — Drift Analysis Bar */}
        <div className="shrink-0 bg-ocean-panel border-t border-ocean-border px-6 py-3">
          <div className="grid grid-cols-4 gap-4">
            <div className="flex items-center gap-3">
              <Crosshair size={16} strokeWidth={1.5} className="text-ocean-cyan" />
              <div>
                <p className="font-mono text-[9px] text-ocean-text-muted">ORIGIN POINT</p>
                <p className="font-mono text-xs text-ocean-text">
                  {selectedSpill.origin_lat.toFixed(4)}°N, {selectedSpill.origin_lng.toFixed(4)}°E
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <MapPin size={16} strokeWidth={1.5} className="text-ocean-red" />
              <div>
                <p className="font-mono text-[9px] text-ocean-text-muted">SPILL CENTER</p>
                <p className="font-mono text-xs text-ocean-text">
                  {selectedSpill.lat.toFixed(4)}°N, {selectedSpill.lng.toFixed(4)}°E
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Navigation size={16} strokeWidth={1.5} className="text-ocean-amber" />
              <div>
                <p className="font-mono text-[9px] text-ocean-text-muted">FORWARD PROJECTION</p>
                <p className="font-mono text-xs text-ocean-text">
                  {selectedSpill.forward_drift_lat.toFixed(4)}°N, {selectedSpill.forward_drift_lng.toFixed(4)}°E
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Clock size={16} strokeWidth={1.5} className="text-ocean-cyan" />
              <div>
                <p className="font-mono text-[9px] text-ocean-text-muted">EST. COASTAL ETA</p>
                <p className="font-mono text-xs text-ocean-amber">18h 00m</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
