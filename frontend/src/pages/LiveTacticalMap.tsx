import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Polygon, CircleMarker, Tooltip, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import { Layers, Filter, X, Ship, AlertTriangle, Loader2 } from 'lucide-react';
import { fetchSpills, fetchVessels, type OilSpill, type Vessel, type VesselType, type RiskLevel } from '@/lib/db';
import { tileLayers, getTileLayer } from '@/components/map/MapLayers';

const vesselTypes: VesselType[] = [
  'Crude Oil Tanker', 'Chemical Tanker', 'Container Ship', 'Bulk Carrier',
  'LNG Tanker', 'Product Tanker', 'General Cargo',
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
          center={[25.2, 55.5]}
          zoom={7}
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
          />
          <ZoomControl position="bottomright" />

          {/* Spills */}
          {showSpills && spills.map((spill) => {
            const color = spill.severity === 'CRITICAL' ? '#FF2A5F' : '#00F0FF';
            return (
              <Polygon
                key={spill.id}
                positions={spill.polygon}
                pathOptions={{ color, fillColor: color, fillOpacity: 0.2, weight: 1.5 }}
              >
                <Tooltip sticky>
                  <div className="font-mono text-[10px]">
                    <div className="text-ocean-cyan font-bold">{spill.spill_id}</div>
                    <div className="text-ocean-text">{spill.name}</div>
                    <div className="text-ocean-text-dim">{spill.area_km2} km² — {spill.severity}</div>
                    <div className="text-ocean-text-dim">STATUS: {spill.status}</div>
                  </div>
                </Tooltip>
              </Polygon>
            );
          })}

          {/* Vessels */}
          {showVessels && filteredVessels.map((v) => (
            <CircleMarker
              key={v.id}
              center={[v.lat, v.lng]}
              radius={4}
              pathOptions={{
                color: riskColor(v.risk),
                fillColor: riskColor(v.risk),
                fillOpacity: 1,
                weight: 1,
              }}
            >
              <Tooltip sticky>
                <div className="font-mono text-[10px]">
                  <div className="text-ocean-cyan font-bold">{v.mmsi}</div>
                  <div className="text-ocean-text">{v.name}</div>
                  <div className="text-ocean-text-dim">{v.type}</div>
                  <div className="text-ocean-text-dim">FLAG: {v.flag}</div>
                  <div className="text-ocean-text-dim">SOG: {v.sog.toFixed(1)} kts / COG: {v.cog}°</div>
                  <div className="text-ocean-text-dim">RISK: {v.risk}</div>
                </div>
              </Tooltip>
            </CircleMarker>
          ))}
        </MapContainer>

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
