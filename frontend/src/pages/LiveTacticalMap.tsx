import { useState, useEffect, useRef, useMemo } from 'react';
import { Play, Pause } from 'lucide-react';
import { MapContainer, TileLayer, Polygon, CircleMarker, Polyline, Tooltip, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import { Layers, Filter, X, Ship, AlertTriangle, Loader2 } from 'lucide-react';
import { fetchSpills, fetchVessels, type OilSpill, type Vessel, type VesselType, type RiskLevel } from '@/lib/db';
import { tileLayers, getTileLayer } from '@/components/map/MapLayers';

const vesselTypes: VesselType[] = [
  'Crude Oil Tanker', 'Chemical Tanker', 'Container Ship', 'Bulk Carrier',
  'LNG Tanker', 'Product Tanker', 'General Cargo',
  'Cargo', 'Tanker', 'Fishing', 'Container'
];

const riskLevels: RiskLevel[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

const riskColor = (risk: RiskLevel) => {
  switch (risk) {
    case 'CRITICAL': return '#FF2A5F';
    case 'HIGH': return '#FBBF24';
    case 'MEDIUM': return '#0EA5E9';
    case 'LOW': return '#10F2A0';
  }
};

function AnimatedVessel({ vessel, currentHour, baseTimeMs }: { vessel: Vessel, currentHour: number, baseTimeMs: number }) {
  const color = riskColor(vessel.risk);
  
  const allPoints = useMemo(() => {
    if (!vessel.positions || vessel.positions.length === 0) return [];
    
    // Find the latest timestamp for this vessel to align it to T=0
    const latestTime = Math.max(...vessel.positions.map((p: any) => new Date(p.timestamp).getTime()));
    
    // Convert absolute timestamp to relative hours_offset, shifted so its last known position is at T=0
    const pts = vessel.positions.map((p: any) => ({
      lat: p.lat,
      lon: p.lon,
      hours_offset: (new Date(p.timestamp).getTime() - latestTime) / 3600000
    }));
    // Sort ascending
    pts.sort((a: any, b: any) => a.hours_offset - b.hours_offset);
    return pts;
  }, [vessel.positions]);

  const currentPos = useMemo(() => {
    if (allPoints.length === 0) return [vessel.lat, vessel.lng] as [number, number];
    const minHour = allPoints[0].hours_offset;
    const maxHour = allPoints[allPoints.length - 1].hours_offset;
    
    if (currentHour <= minHour) return [allPoints[0].lat, allPoints[0].lon] as [number, number];
    if (currentHour >= maxHour) return [allPoints[allPoints.length - 1].lat, allPoints[allPoints.length - 1].lon] as [number, number];
    
    for (let i = 0; i < allPoints.length - 1; i++) {
      if (allPoints[i].hours_offset <= currentHour && allPoints[i+1].hours_offset >= currentHour) {
        const p1 = allPoints[i];
        const p2 = allPoints[i+1];
        const ratio = (currentHour - p1.hours_offset) / (p2.hours_offset - p1.hours_offset || 1);
        return [
          p1.lat + (p2.lat - p1.lat) * ratio,
          p1.lon + (p2.lon - p1.lon) * ratio
        ] as [number, number];
      }
    }
    return [allPoints[0].lat, allPoints[0].lon] as [number, number];
  }, [allPoints, currentHour, vessel]);

  return (
    <CircleMarker
      center={currentPos}
      radius={4}
      pathOptions={{ color, fillColor: color, fillOpacity: 1, weight: 1 }}
    >
      <Tooltip sticky>
        <div className="font-mono text-[10px]">
          <div className="text-ocean-cyan font-bold">{vessel.mmsi}</div>
          <div className="text-ocean-text">{vessel.name}</div>
          <div className="text-ocean-text-dim">{vessel.type}</div>
          <div className="text-ocean-text-dim">FLAG: {vessel.flag}</div>
          <div className="text-ocean-text-dim">SOG: {vessel.sog.toFixed(1)} kts / COG: {vessel.cog}&deg;</div>
          <div className="text-ocean-text-dim">RISK: {vessel.risk}</div>
        </div>
      </Tooltip>
    </CircleMarker>
  );
}

function AnimatedSpill({ spill, currentHour }: { spill: OilSpill, currentHour: number }) {
  const color = spill.severity === 'CRITICAL' ? '#FF2A5F' : '#00F0FF';
  
  const driftData = spill.driftPaths?.[0];
  const backwardPath = driftData?.backward_path || [];
  const forwardPath = driftData?.forward_path || [];
  
  const allPoints = useMemo(() => {
    const pts = [...backwardPath, ...forwardPath];
    pts.sort((a, b) => a.hours_offset - b.hours_offset);
    return pts;
  }, [backwardPath, forwardPath]);

  const activeTrail = useMemo(() => {
    return allPoints.filter(p => p.hours_offset <= currentHour).map(p => [p.lat, p.lon] as [number, number]);
  }, [allPoints, currentHour]);

  const currentPos = useMemo(() => {
    if (allPoints.length === 0) return [spill.lat, spill.lng] as [number, number];
    const minHour = allPoints[0].hours_offset;
    const maxHour = allPoints[allPoints.length - 1].hours_offset;
    
    if (currentHour <= minHour) return [allPoints[0].lat, allPoints[0].lon] as [number, number];
    if (currentHour >= maxHour) return [allPoints[allPoints.length - 1].lat, allPoints[allPoints.length - 1].lon] as [number, number];
    for (let i = 0; i < allPoints.length - 1; i++) {
      if (allPoints[i].hours_offset <= currentHour && allPoints[i+1].hours_offset >= currentHour) {
        const p1 = allPoints[i];
        const p2 = allPoints[i+1];
        const ratio = (currentHour - p1.hours_offset) / (p2.hours_offset - p1.hours_offset || 1);
        return [
          p1.lat + (p2.lat - p1.lat) * ratio,
          p1.lon + (p2.lon - p1.lon) * ratio
        ] as [number, number];
      }
    }
    return [allPoints[0].lat, allPoints[0].lon] as [number, number];
  }, [allPoints, currentHour, spill]);

  return (
    <>
      <Polygon
        positions={spill.polygon}
        pathOptions={{ color, fillColor: color, fillOpacity: 0.1, weight: 1, dashArray: '4 4' }}
      />
      
      {activeTrail.length > 0 && (
        <Polyline
          positions={activeTrail}
          pathOptions={{ color, weight: 2, opacity: 0.6 }}
        />
      )}

      <CircleMarker
        center={currentPos}
        radius={5}
        pathOptions={{ color, fillColor: color, fillOpacity: 1, weight: 2 }}
      >
        <Tooltip sticky>
          <div className="font-mono text-[10px]">
            <div className="text-[#00f0ff] font-bold">{spill.spill_id}</div>
            <div className="text-slate-300">{spill.name}</div>
            <div className="text-slate-400">{spill.area_km2} sq km - {spill.severity}</div>
            <div className="text-slate-400">STATUS: {spill.status}</div>
          </div>
        </Tooltip>
      </CircleMarker>
    </>
  );
}

export default function LiveTacticalMap() {
  const [activeLayer, setActiveLayer] = useState('dark');
  const [showLayers, setShowLayers] = useState(false);
  const [showFilters, setShowFilters] = useState(true);
  const [selectedTypes, setSelectedTypes] = useState<Set<VesselType>>(new Set(vesselTypes));
  const [selectedRisks, setSelectedRisks] = useState<Set<RiskLevel>>(new Set(riskLevels));
  const [showSpills, setShowSpills] = useState(true);
  const [showVessels, setShowVessels] = useState(true);
  const [spills, setSpills] = useState<OilSpill[]>([]);
  const [vessels, setVessels] = useState<Vessel[]>([]);
  const [loading, setLoading] = useState(true);
  const mapRef = useRef<L.Map | null>(null);

  const [currentHour, setCurrentHour] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playSpeed, setPlaySpeed] = useState(1);
  const baseTimeMs = spills.length > 0 ? new Date(spills[0].detected_at).getTime() : Date.now();

  // Global time bounds across all spills
  const { minHour, maxHour } = useMemo(() => {
    let min = -48;
    let max = 72;
    if (spills.length > 0) {
      let found = false;
      min = Infinity;
      max = -Infinity;
      spills.forEach(spill => {
        const driftData = spill.driftPaths?.[0];
        if (driftData) {
          const bp = driftData.backward_path || [];
          const fp = driftData.forward_path || [];
          if (bp.length > 0) { min = Math.min(min, bp[0].hours_offset); found = true; }
          if (fp.length > 0) { max = Math.max(max, fp[fp.length - 1].hours_offset); found = true; }
        }
      });
      if (!found) { min = -48; max = 72; }
    }
    return { minHour: min, maxHour: max };
  }, [spills]);

  useEffect(() => {
    if (minHour < 0 && spills.length > 0) {
      // Auto-set the scrubber to the beginning of the timeline when data loads
      setCurrentHour(minHour);
    }
  }, [minHour, spills.length]);

  useEffect(() => {
    if (isPlaying && currentHour >= maxHour) setIsPlaying(false);
  }, [currentHour, maxHour, isPlaying]);

  useEffect(() => {
    let interval: any;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentHour(prev => Math.min(prev + (0.5 * playSpeed), maxHour));
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isPlaying, playSpeed, maxHour]);

  useEffect(() => {
    (async () => {
      try {
        const [spillData, vesselData] = await Promise.all([
          fetchSpills(),
          fetchVessels(),
        ]);
        setSpills(spillData);
        setVessels(vesselData);
      } catch (err) {
        console.error('Failed to load map data:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (mapRef.current) {
      setTimeout(() => mapRef.current?.invalidateSize(), 100);
    }
  }, [loading]);

  const tileLayer = getTileLayer(activeLayer);

  const toggleType = (type: VesselType) => {
    const next = new Set(selectedTypes);
    if (next.has(type)) next.delete(type); else next.add(type);
    setSelectedTypes(next);
  };

  const toggleRisk = (risk: RiskLevel) => {
    const next = new Set(selectedRisks);
    if (next.has(risk)) next.delete(risk); else next.add(risk);
    setSelectedRisks(next);
  };

  const filteredVessels = vessels.filter(
    (v) => selectedTypes.has(v.type) && selectedRisks.has(v.risk)
  );

  const vesselCountByRisk = (risk: RiskLevel) =>
    vessels.filter((v) => v.risk === risk).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 size={24} className="animate-spin text-ocean-cyan" />
        <span className="font-mono text-sm text-ocean-text-dim ml-3">LOADING TACTICAL MAP...</span>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full relative">
      {/* Map */}
      <div className="flex-1 relative">
        <MapContainer
          center={[20.5937, 78.9629]}
          zoom={5}
          className="w-full h-full"
          ref={(m) => { if (m) mapRef.current = m; }}
          zoomControl={false}
        >
          <TileLayer
            key={activeLayer}
            url={tileLayer.url}
            attribution={tileLayer.attribution}
            maxZoom={tileLayer.maxZoom}
            maxNativeZoom={tileLayer.maxNativeZoom}
            className={tileLayer.className}
          />
          <ZoomControl position="bottomright" />

          {/* Spills */}
                    {showSpills && spills.map((spill) => (
            <AnimatedSpill key={spill.id} spill={spill} currentHour={currentHour} />
          ))}

          {/* Vessels */}
          {showVessels && filteredVessels.map((v) => (
            <AnimatedVessel key={v.id} vessel={v} currentHour={currentHour} baseTimeMs={baseTimeMs} />
          ))}
        </MapContainer>

        {/* Global Drift Scrubber Controls */}
        {spills.length > 0 && minHour < Infinity && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[500px] z-[1000] bg-[#0b1320]/90 border border-slate-800 p-4 shadow-2xl backdrop-blur-md rounded-lg">
            
            <div className="flex justify-between items-end mb-2">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="w-10 h-10 rounded-full bg-[#00f0ff]/10 border border-[#00f0ff] text-[#00f0ff] flex items-center justify-center hover:bg-[#00f0ff] hover:text-black transition-colors"
                >
                  {isPlaying ? <Pause size={18} /> : <Play size={18} fill="currentColor" />}
                </button>
                
                <div className="flex gap-1 bg-[#0a0f18] p-1 rounded border border-slate-800">
                  {[1, 2, 5].map(s => (
                    <button 
                      key={s}
                      onClick={() => setPlaySpeed(s)}
                      className={`px-2 py-0.5 text-[10px] font-mono rounded ${playSpeed === s ? 'bg-[#00f0ff] text-black font-bold' : 'text-slate-400 hover:text-white'}`}
                    >
                      {s}x
                    </button>
                  ))}
                </div>
              </div>

              <div className="text-right">
                <div className="text-[10px] font-mono text-[#00f0ff] font-bold uppercase tracking-wider mb-1">
                  GLOBAL SYNCHRONIZED DRIFT
                </div>
                <div className="text-xs font-mono text-slate-400">
                  T{currentHour > 0 ? '+' : ''}{currentHour.toFixed(1)}h
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-4">
              <span className="text-[10px] font-mono text-slate-400 whitespace-nowrap">
                {minHour.toFixed(0)}h
              </span>
              
              <div className="relative flex-1">
                <input
                  type="range"
                  min={minHour}
                  max={maxHour}
                  step={0.5}
                  value={currentHour}
                  onChange={(e) => {
                    setCurrentHour(parseFloat(e.target.value));
                    setIsPlaying(false);
                  }}
                  className="w-full h-1 bg-slate-800 rounded-full appearance-none cursor-pointer accent-[#00f0ff]"
                />
                <div className="absolute top-4 left-1/2 -translate-x-1/2 text-[9px] font-mono text-slate-500">
                  DETECTION (T=0)
                </div>
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-1 h-3 bg-slate-600/30" />
              </div>

              <span className="text-[10px] font-mono text-slate-400 whitespace-nowrap">
                +{maxHour.toFixed(0)}h
              </span>
            </div>
          </div>
        )}

        {/* Layer Control — floating top-left */}
        <div className="absolute top-4 left-4 z-[1000]">
          <div className="tactical-corners bg-ocean-panel p-1">
            <button
              onClick={() => setShowLayers(!showLayers)}
              className="flex items-center gap-2 px-3 py-2 border border-transparent hover:border-ocean-cyan/40 transition-colors"
            >
              <Layers size={14} strokeWidth={1.5} className="text-ocean-cyan" />
              <span className="font-mono text-[10px] text-ocean-text tracking-wider">LAYERS</span>
            </button>
            {showLayers && (
              <div className="absolute top-full mt-1 left-0 w-52 bg-ocean-panel border border-ocean-border p-2 space-y-1">
                {tileLayers.map((layer) => (
                  <button
                    key={layer.id}
                    onClick={() => setActiveLayer(layer.id)}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 border transition-colors ${
                      activeLayer === layer.id
                        ? 'border-ocean-cyan/40 bg-ocean-cyan/5 text-ocean-cyan'
                        : 'border-transparent text-ocean-text-dim hover:border-ocean-border hover:text-ocean-text'
                    }`}
                  >
                    <span className={`w-2 h-2 ${activeLayer === layer.id ? 'bg-ocean-cyan' : 'bg-ocean-text-muted'}`} />
                    <span className="font-sans text-xs">{layer.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Legend — floating bottom-left */}
        <div className="absolute bottom-4 left-4 z-[1000] tactical-corners bg-ocean-panel p-3 space-y-1.5">
          <p className="font-mono text-[9px] text-ocean-text-muted tracking-widest mb-1">LEGEND</p>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 border border-ocean-red" style={{ background: 'rgba(255,42,95,0.2)' }} />
            <span className="font-mono text-[9px] text-ocean-text-dim">CRITICAL SPILL</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 border border-ocean-cyan" style={{ background: 'rgba(0,240,255,0.2)' }} />
            <span className="font-mono text-[9px] text-ocean-text-dim">STANDARD SPILL</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-ocean-red" />
            <span className="font-mono text-[9px] text-ocean-text-dim">CRITICAL VESSEL</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-ocean-amber" />
            <span className="font-mono text-[9px] text-ocean-text-dim">HIGH RISK</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-ocean-sky" />
            <span className="font-mono text-[9px] text-ocean-text-dim">MEDIUM RISK</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-ocean-green" />
            <span className="font-mono text-[9px] text-ocean-text-dim">LOW RISK</span>
          </div>
        </div>
      </div>

      {/* Side Filter Panel */}
      <div className={`absolute right-0 top-0 h-full w-72 bg-ocean-panel border-l border-ocean-border z-[1000] transition-transform duration-300 ${showFilters ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex items-center justify-between px-4 py-4 border-b border-ocean-border">
          <div className="flex items-center gap-2">
            <Filter size={14} strokeWidth={1.5} className="text-ocean-cyan" />
            <span className="font-mono text-[10px] text-ocean-text-muted tracking-widest">FILTER CONTROLS</span>
          </div>
          <button onClick={() => setShowFilters(false)} className="text-ocean-text-muted hover:text-ocean-text">
            <X size={14} strokeWidth={1.5} />
          </button>
        </div>

        <div className="p-4 space-y-5 overflow-y-auto" style={{ maxHeight: 'calc(100% - 60px)' }}>
          {/* Layer Toggles */}
          <div>
            <p className="font-mono text-[9px] text-ocean-text-muted tracking-widest mb-2">DISPLAY LAYERS</p>
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={showSpills}
                  onChange={(e) => setShowSpills(e.target.checked)}
                  className="accent-ocean-cyan w-3 h-3"
                />
                <AlertTriangle size={12} strokeWidth={1.5} className="text-ocean-red" />
                <span className="font-sans text-xs text-ocean-text-dim group-hover:text-ocean-text">Oil Spills</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={showVessels}
                  onChange={(e) => setShowVessels(e.target.checked)}
                  className="accent-ocean-cyan w-3 h-3"
                />
                <Ship size={12} strokeWidth={1.5} className="text-ocean-cyan" />
                <span className="font-sans text-xs text-ocean-text-dim group-hover:text-ocean-text">Vessels</span>
              </label>
            </div>
          </div>

          {/* Risk Level Filter */}
          <div>
            <p className="font-mono text-[9px] text-ocean-text-muted tracking-widest mb-2">RISK LEVEL</p>
            <div className="space-y-1.5">
              {riskLevels.map((risk) => (
                <label key={risk} className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={selectedRisks.has(risk)}
                    onChange={() => toggleRisk(risk)}
                    className="accent-ocean-cyan w-3 h-3"
                  />
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ background: riskColor(risk) }}
                  />
                  <span className="font-sans text-xs text-ocean-text-dim group-hover:text-ocean-text">{risk}</span>
                  <span className="font-mono text-[9px] text-ocean-text-muted ml-auto">{vesselCountByRisk(risk)}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Vessel Type Filter */}
          <div>
            <p className="font-mono text-[9px] text-ocean-text-muted tracking-widest mb-2">VESSEL TYPE</p>
            <div className="space-y-1.5">
              {vesselTypes.map((type) => (
                <label key={type} className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={selectedTypes.has(type)}
                    onChange={() => toggleType(type)}
                    className="accent-ocean-cyan w-3 h-3"
                  />
                  <span className="font-sans text-xs text-ocean-text-dim group-hover:text-ocean-text">{type}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="border-t border-ocean-border pt-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] text-ocean-text-muted">VISIBLE</span>
              <span className="font-mono text-sm text-ocean-cyan">{filteredVessels.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] text-ocean-text-muted">TOTAL TRACKED</span>
              <span className="font-mono text-sm text-ocean-text">{vessels.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] text-ocean-text-muted">ACTIVE SPILLS</span>
              <span className="font-mono text-sm text-ocean-red">{spills.filter((s) => s.status === 'ACTIVE').length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Toggle filter panel button */}
      {!showFilters && (
        <button
          onClick={() => setShowFilters(true)}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-[1000] bg-ocean-panel border border-ocean-border border-r-0 p-2 hover:border-ocean-cyan/40 transition-colors"
        >
          <Filter size={16} strokeWidth={1.5} className="text-ocean-cyan" />
        </button>
      )}
    </div>
  );
}
