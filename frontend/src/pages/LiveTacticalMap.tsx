import { useState, useEffect, useRef, useMemo } from 'react';
import {
  MapContainer,
  TileLayer,
  Polygon,
  Polyline,
  CircleMarker,
  Marker,
  Tooltip,
  ImageOverlay,
  ZoomControl,
} from 'react-leaflet';
import L from 'leaflet';
import {
  Layers,
  Filter,
  X,
  Ship,
  AlertTriangle,
  Loader2,
  Sliders,
  Eye,
  ShieldCheck,
  Compass,
  Wind,
  Maximize2,
  Anchor,
  HelpCircle,
} from 'lucide-react';
import {
  fetchSpills,
  fetchVessels,
  fetchOpenDriftParticles,
  fetchVulnerabilityZones,
  type OilSpill,
  type Vessel,
  type OpenDriftParticle,
  type CoastalVulnerabilityZone,
  type VesselType,
  type RiskLevel,
} from '@/lib/db';
import { tileLayers, getTileLayer, createDirectionalVesselMarker, createOriginMarker } from '@/components/map/MapLayers';
import TemporalDriftScrubber from '@/components/map/TemporalDriftScrubber';
import SarInspectorModal from '@/components/map/SarInspectorModal';
import {
  formatCoordinates,
  formatArea,
  formatDistance,
  formatSpeed,
  formatCourse,
  formatVolume,
  formatLat,
  formatLng,
  formatPercent,
} from '@/utils/formatters';

const vesselTypes: VesselType[] = [
  'Crude Oil Tanker',
  'Chemical Tanker',
  'Product Tanker',
  'LNG Tanker',
  'Container Ship',
  'Bulk Carrier',
  'General Cargo',
  'Fishing Vessel',
];

const riskLevels: RiskLevel[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

const riskColors: Record<RiskLevel, string> = {
  CRITICAL: '#f43f5e',
  HIGH: '#f59e0b',
  MEDIUM: '#38bdf8',
  LOW: '#10b981',
};

export default function LiveTacticalMap() {
  const [activeBaseLayer, setActiveBaseLayer] = useState('bathymetry');
  const [showLayersMenu, setShowLayersMenu] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState<Set<VesselType>>(new Set(vesselTypes));
  const [selectedRisks, setSelectedRisks] = useState<Set<RiskLevel>>(new Set(riskLevels));

  // Layer Toggles
  const [showSpills, setShowSpills] = useState(true);
  const [showVessels, setShowVessels] = useState(true);
  const [showSarOverlay, setShowSarOverlay] = useState(true);
  const [sarOpacity, setSarOpacity] = useState(0.75);
  const [showOpenDrift, setShowOpenDrift] = useState(true);
  const [showTrajectories, setShowTrajectories] = useState(true);
  const [showVulnerability, setShowVulnerability] = useState(true);

  // 4D Temporal Scrubber state
  const [currentHour, setCurrentHour] = useState(0); // -48 to +72
  const [sarModalOpen, setSarModalOpen] = useState(false);

  // Data
  const [spills, setSpills] = useState<OilSpill[]>([]);
  const [selectedSpill, setSelectedSpill] = useState<OilSpill | null>(null);
  const [vessels, setVessels] = useState<Vessel[]>([]);
  const [particles, setParticles] = useState<OpenDriftParticle[]>([]);
  const [vulnerabilityZones, setVulnerabilityZones] = useState<CoastalVulnerabilityZone[]>([]);
  const [loading, setLoading] = useState(true);

  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [spillData, vesselData, particleData, zoneData] = await Promise.all([
          fetchSpills(),
          fetchVessels(),
          fetchOpenDriftParticles(),
          fetchVulnerabilityZones(),
        ]);
        setSpills(spillData);
        if (spillData.length > 0) setSelectedSpill(spillData[0]);
        setVessels(vesselData);
        setParticles(particleData);
        setVulnerabilityZones(zoneData);
      } catch (err) {
        console.error('Failed to load tactical map data:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (mapRef.current) {
      setTimeout(() => mapRef.current?.invalidateSize(), 150);
    }
  }, [loading]);

  const tileLayer = getTileLayer(activeBaseLayer);

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

  const filteredVessels = useMemo(() => {
    return vessels.filter((v) => selectedTypes.has(v.type) && selectedRisks.has(v.risk));
  }, [vessels, selectedTypes, selectedRisks]);

  // Interpolate vessel positions based on currentHour scrubber (-48 to +72)
  const interpolatedVessels = useMemo(() => {
    return filteredVessels.map((v) => {
      // If vessel has track history, interpolate between history and current
      if (!v.track_history || v.track_history.length < 2) {
        return { ...v, currentLat: v.lat, currentLng: v.lng };
      }
      if (currentHour === 0) {
        return { ...v, currentLat: v.lat, currentLng: v.lng };
      }
      if (currentHour < 0) {
        // Look back into past track
        const ratio = Math.max(0, 1 + currentHour / 48); // 0 at -48h, 1 at 0h
        const ptStart = v.track_history[0];
        const ptEnd = [v.lat, v.lng];
        const lat = ptStart[0] + (ptEnd[0] - ptStart[0]) * ratio;
        const lng = ptStart[1] + (ptEnd[1] - ptStart[1]) * ratio;
        return { ...v, currentLat: lat, currentLng: lng };
      } else {
        // Project forward based on SOG & COG
        const hoursAhead = currentHour;
        const speedKnots = v.sog || 10;
        const headingRad = (v.cog * Math.PI) / 180;
        const distNm = speedKnots * hoursAhead;
        const dLat = (distNm / 60) * Math.cos(headingRad);
        const dLng = (distNm / (60 * Math.cos((v.lat * Math.PI) / 180))) * Math.sin(headingRad);
        return { ...v, currentLat: v.lat + dLat, currentLng: v.lng + dLng };
      }
    });
  }, [filteredVessels, currentHour]);

  // Get current particle positions based on scrubber hour
  const currentParticlePositions = useMemo(() => {
    if (!particles.length) return [];
    // Round to nearest available key in time_offsets (-48, -36, -24, -12, -6, -3, 0, 3, 6, 12, 24, 36, 48, 60, 72)
    const keys = [-48, -36, -24, -12, -6, -3, 0, 3, 6, 12, 24, 36, 48, 60, 72];
    const closestHour = keys.reduce((prev, curr) =>
      Math.abs(curr - currentHour) < Math.abs(prev - currentHour) ? curr : prev
    );

    return particles.map((p) => ({
      id: p.id,
      pos: p.time_offsets[closestHour] || [p.base_lat, p.base_lng],
      state: p.weathering_state,
    }));
  }, [particles, currentHour]);

  // Backward and Forward Drift trajectory paths for primary spill
  const primarySpill = selectedSpill || spills[0];
  const backwardDriftPath: [number, number][] = primarySpill
    ? [
        [primarySpill.origin_lat, primarySpill.origin_lng],
        [primarySpill.lat, primarySpill.lng],
      ]
    : [];

  const forwardDriftPath: [number, number][] = primarySpill
    ? [
        [primarySpill.lat, primarySpill.lng],
        [primarySpill.forward_drift_lat, primarySpill.forward_drift_lng],
      ]
    : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-[#0a0f18]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={32} className="animate-spin text-ocean-cyan" />
          <span className="font-mono text-xs tracking-widest text-slate-400 uppercase">
            INITIALIZING TACTICAL RADAR & BATHYMETRIC GRID...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full relative bg-[#0a0f18] overflow-hidden">
      {/* Primary Leaflet Tactical Map */}
      <div className="flex-1 h-full w-full relative">
        <MapContainer
          center={[15.5, 76.0]}
          zoom={5}
          className="w-full h-full"
          ref={(m) => {
            if (m) mapRef.current = m;
          }}
          zoomControl={false}
        >
          {/* Base Bathymetry / Dark Tile Layer */}
          <TileLayer
            key={activeBaseLayer}
            url={tileLayer.url}
            attribution={tileLayer.attribution}
            maxZoom={tileLayer.maxZoom}
            maxNativeZoom={tileLayer.maxNativeZoom}
            className={tileLayer.className}
          />
          <ZoomControl position="bottomright" />

          {/* 1. Sentinel-1 SAR Overlay */}
          {showSarOverlay && primarySpill?.sar_metadata && (
            <ImageOverlay
              url={primarySpill.sar_metadata.raw_chip_url}
              bounds={primarySpill.sar_metadata.bounds}
              opacity={sarOpacity}
            />
          )}

          {/* 2. Coastal Vulnerability Zones */}
          {showVulnerability &&
            vulnerabilityZones.map((zone) => (
              <Polygon
                key={zone.id}
                positions={zone.polygon}
                pathOptions={{
                  color: zone.esi_index >= 9.5 ? '#f43f5e' : '#f59e0b',
                  fillColor: zone.esi_index >= 9.5 ? '#f43f5e' : '#f59e0b',
                  fillOpacity: 0.18,
                  weight: 1.5,
                  dashArray: '4 4',
                }}
              >
                <Tooltip sticky>
                  <div className="font-mono text-[10px] space-y-0.5">
                    <div className="text-amber-400 font-bold uppercase">{zone.name}</div>
                    <div className="text-slate-300">TYPE: {zone.type.replace('_', ' ')}</div>
                    <div className="text-rose-400 font-bold">ESI SENSITIVITY: {zone.esi_index.toFixed(1)} / 10</div>
                    <div className="text-slate-400">DIST TO SLICK: {formatDistance(zone.distance_to_spill_nm)}</div>
                    <div className="text-amber-300">EST. IMPACT: T + {zone.estimated_impact_hrs.toFixed(1)}h</div>
                  </div>
                </Tooltip>
              </Polygon>
            ))}

          {/* 3. Backward Drift Path (-48h to 0h) */}
          {showTrajectories && primarySpill && (
            <>
              <Polyline
                positions={backwardDriftPath}
                pathOptions={{
                  color: '#00f0ff',
                  weight: 2,
                  dashArray: '6 5',
                  opacity: 0.85,
                }}
              />
              {/* Origin Marker (-48h) */}
              <Marker
                position={[primarySpill.origin_lat, primarySpill.origin_lng]}
                icon={createOriginMarker()}
              >
                <Tooltip>
                  <div className="font-mono text-[10px] space-y-0.5">
                    <div className="text-ocean-cyan font-bold">ESTIMATED RELEASE ORIGIN (T -48h)</div>
                    <div className="text-slate-200">
                      {formatCoordinates(primarySpill.origin_lat, primarySpill.origin_lng)}
                    </div>
                    <div className="text-slate-400">BACKWARD HYDRODYNAMIC INTERSECT</div>
                  </div>
                </Tooltip>
              </Marker>
            </>
          )}

          {/* 4. Forward Drift Path (0h to +72h) */}
          {showTrajectories && primarySpill && (
            <>
              <Polyline
                positions={forwardDriftPath}
                pathOptions={{
                  color: '#f59e0b',
                  weight: 2,
                  dashArray: '6 5',
                  opacity: 0.85,
                }}
              />
              <CircleMarker
                center={[primarySpill.forward_drift_lat, primarySpill.forward_drift_lng]}
                radius={5}
                pathOptions={{
                  color: '#f59e0b',
                  fillColor: '#f59e0b',
                  fillOpacity: 0.5,
                  weight: 1.5,
                }}
              >
                <Tooltip>
                  <div className="font-mono text-[10px]">
                    <div className="text-amber-400 font-bold">FORWARD DRIFT PROJECTION (+72h)</div>
                    <div className="text-slate-200">
                      {formatCoordinates(primarySpill.forward_drift_lat, primarySpill.forward_drift_lng)}
                    </div>
                  </div>
                </Tooltip>
              </CircleMarker>
            </>
          )}

          {/* 5. OpenDrift Particle Cloud */}
          {showOpenDrift &&
            currentParticlePositions.map((p) => {
              const pColor =
                currentHour < 0
                  ? '#00f0ff'
                  : p.state === 'EMULSIFIED'
                  ? '#f59e0b'
                  : p.state === 'BEACHED'
                  ? '#f43f5e'
                  : '#38bdf8';
              return (
                <CircleMarker
                  key={p.id}
                  center={p.pos}
                  radius={currentHour >= 24 ? 3 : 2}
                  pathOptions={{
                    color: pColor,
                    fillColor: pColor,
                    fillOpacity: 0.65,
                    weight: 0,
                  }}
                />
              );
            })}

          {/* 6. Spills Ground Truth Polygons */}
          {showSpills &&
            spills.map((spill) => {
              const isCrit = spill.severity === 'CRITICAL';
              const color = isCrit ? '#f43f5e' : '#00f0ff';
              return (
                <Polygon
                  key={spill.id}
                  positions={spill.polygon}
                  pathOptions={{
                    color,
                    fillColor: color,
                    fillOpacity: 0.25,
                    weight: 2,
                  }}
                >
                  <Tooltip sticky>
                    <div className="font-mono text-[10px] space-y-0.5">
                      <div className="text-ocean-cyan font-bold">{spill.spill_id}</div>
                      <div className="text-slate-100 font-semibold">{spill.name}</div>
                      <div className="text-slate-300">
                        AREA: {formatArea(spill.area_km2)} • SEVERITY: {spill.severity}
                      </div>
                      <div className="text-slate-400">
                        VOLUME: {formatVolume(spill.estimated_volume_liters)}
                      </div>
                      <div className="text-slate-400">
                        POSITION: {formatCoordinates(spill.lat, spill.lng)}
                      </div>
                    </div>
                  </Tooltip>
                </Polygon>
              );
            })}

          {/* 7. AIS Vessel Trajectory & Directional Markers */}
          {showVessels &&
            interpolatedVessels.map((v) => {
              const isSuspect = v.risk === 'CRITICAL' || v.risk === 'HIGH';
              const isSilent = v.ais_status === 'SILENT';

              // Distance to selected spill
              const distToCenterNm = primarySpill
                ? Math.hypot((v.currentLat - primarySpill.lat) * 60, (v.currentLng - primarySpill.lng) * 54.6)
                : 0;

              return (
                <div key={v.id}>
                  {/* Vessel Historical Trail */}
                  {showTrajectories && v.track_history && (
                    <Polyline
                      positions={v.track_history}
                      pathOptions={{
                        color: isSilent ? '#f43f5e' : isSuspect ? '#f59e0b' : '#38bdf8',
                        weight: 1.5,
                        dashArray: '3 3',
                        opacity: 0.5,
                      }}
                    />
                  )}

                  {/* Directional Vessel Marker */}
                  <Marker
                    position={[v.currentLat, v.currentLng]}
                    icon={createDirectionalVesselMarker(v.cog, isSuspect, isSilent)}
                  >
                    <Tooltip sticky>
                      <div className="font-mono text-[10px] space-y-0.5 min-w-[180px]">
                        <div className="flex items-center justify-between border-b border-slate-700 pb-1 mb-1">
                          <span className="text-ocean-cyan font-bold">{v.name}</span>
                          <span
                            className="font-bold"
                            style={{ color: riskColors[v.risk] }}
                          >
                            {v.risk}
                          </span>
                        </div>
                        <div className="text-slate-300">MMSI: {v.mmsi}</div>
                        <div className="text-slate-300">TYPE: {v.type}</div>
                        <div className="text-slate-300">FLAG: {v.flag}</div>
                        <div className="text-slate-200">
                          SOG: {formatSpeed(v.sog)} • COG: {formatCourse(v.cog)}
                        </div>
                        <div className="text-cyan-300">
                          DIST TO SLICK: {formatDistance(distToCenterNm)}
                        </div>
                        <div className="text-slate-400">
                          COORDINATES: {formatCoordinates(v.currentLat, v.currentLng)}
                        </div>
                        <div className="text-slate-400">AIS STATUS: {v.ais_status}</div>
                      </div>
                    </Tooltip>
                  </Marker>
                </div>
              );
            })}
        </MapContainer>

        {/* Floating Top-Left: Tactical Map Controls & Layer Switcher */}
        <div className="absolute top-4 left-4 z-[1000] flex flex-col gap-2">
          <div className="bg-[#0d1524]/90 backdrop-blur-md border border-slate-800 p-1.5 shadow-xl flex items-center gap-2">
            <button
              onClick={() => setShowLayersMenu(!showLayersMenu)}
              className={`flex items-center gap-2 px-3 py-1.5 border transition-all text-xs font-mono ${
                showLayersMenu
                  ? 'border-cyan-500/60 bg-cyan-950/40 text-ocean-cyan'
                  : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700'
              }`}
            >
              <Layers size={14} className="text-ocean-cyan" />
              <span>MAP LAYERS</span>
            </button>

            {/* Quick SAR Inspector Trigger */}
            <button
              onClick={() => setSarModalOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-cyan-950/30 border border-cyan-500/40 text-ocean-cyan hover:bg-cyan-950/60 transition-all text-xs font-mono shadow-[0_0_10px_rgba(0,240,255,0.15)]"
            >
              <Eye size={14} />
              <span>SAR INSPECTOR</span>
            </button>
          </div>

          {/* Layers Popover Menu */}
          {showLayersMenu && (
            <div className="w-80 bg-[#0d1524]/95 backdrop-blur-md border border-slate-700 p-4 shadow-2xl space-y-4 tactical-corners">
              {/* Base Chart Selection */}
              <div>
                <span className="font-mono text-[9px] text-slate-400 tracking-widest uppercase font-semibold block mb-2">
                  BASE CARTOGRAPHY
                </span>
                <div className="space-y-1">
                  {tileLayers.map((l) => (
                    <button
                      key={l.id}
                      onClick={() => setActiveBaseLayer(l.id)}
                      className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-xs font-mono transition-colors ${
                        activeBaseLayer === l.id
                          ? 'bg-cyan-950/50 text-ocean-cyan border border-cyan-500/40'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${activeBaseLayer === l.id ? 'bg-cyan-400' : 'bg-slate-600'}`} />
                      <span>{l.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Data Overlay Toggles */}
              <div className="border-t border-slate-800 pt-3">
                <span className="font-mono text-[9px] text-slate-400 tracking-widest uppercase font-semibold block mb-2">
                  TACTICAL OVERLAYS
                </span>
                <div className="space-y-2 font-mono text-xs text-slate-300">
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 bg-rose-500/30 border border-rose-500" />
                      Oil Spill Slicks
                    </span>
                    <input
                      type="checkbox"
                      checked={showSpills}
                      onChange={(e) => setShowSpills(e.target.checked)}
                      className="accent-cyan-400 cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 bg-cyan-400 rounded-full" />
                      AIS Vessels & Tracks
                    </span>
                    <input
                      type="checkbox"
                      checked={showVessels}
                      onChange={(e) => setShowVessels(e.target.checked)}
                      className="accent-cyan-400 cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 bg-amber-400/40 border border-amber-400" />
                      Coastal Vulnerability Zones
                    </span>
                    <input
                      type="checkbox"
                      checked={showVulnerability}
                      onChange={(e) => setShowVulnerability(e.target.checked)}
                      className="accent-cyan-400 cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 bg-cyan-500 rounded-full animate-ping" />
                      OpenDrift Particle Cloud
                    </span>
                    <input
                      type="checkbox"
                      checked={showOpenDrift}
                      onChange={(e) => setShowOpenDrift(e.target.checked)}
                      className="accent-cyan-400 cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-0.5 bg-cyan-400 border-dashed" />
                      Drift Vectors & Trajectories
                    </span>
                    <input
                      type="checkbox"
                      checked={showTrajectories}
                      onChange={(e) => setShowTrajectories(e.target.checked)}
                      className="accent-cyan-400 cursor-pointer"
                    />
                  </label>
                </div>
              </div>

              {/* SAR Imagery Opacity Slider */}
              <div className="border-t border-slate-800 pt-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-[9px] text-slate-400 uppercase font-semibold">
                    SENTINEL-1 SAR OPACITY
                  </span>
                  <span className="font-mono text-xs text-ocean-cyan">{formatPercent(sarOpacity * 100, 0)}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={sarOpacity}
                  onChange={(e) => {
                    setSarOpacity(Number(e.target.value));
                    setShowSarOverlay(true);
                  }}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>
            </div>
          )}
        </div>

        {/* Floating Top-Right: Quick Incident Details & Wind Telemetry */}
        {primarySpill && (
          <div className="absolute top-4 right-4 z-[1000] hidden md:flex flex-col gap-2">
            <div className="bg-[#0d1524]/90 backdrop-blur-md border border-slate-800 p-3 shadow-xl tactical-corners w-72 space-y-2">
              <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                <span className="font-mono text-[9px] text-ocean-cyan tracking-widest uppercase font-semibold">
                  ACTIVE SPILL TELEMETRY
                </span>
                <span className="status-badge text-[9px] text-rose-400 border-rose-500/40 bg-rose-950/20 pulse-red">
                  {primarySpill.severity}
                </span>
              </div>
              <p className="font-sans font-semibold text-xs text-slate-100">{primarySpill.name}</p>
              <div className="grid grid-cols-2 gap-2 font-mono text-[10px]">
                <div className="bg-slate-950/60 p-1.5 rounded border border-slate-800">
                  <span className="text-slate-400 block">AREA:</span>
                  <span className="text-slate-100 font-bold">{formatArea(primarySpill.area_km2)}</span>
                </div>
                <div className="bg-slate-950/60 p-1.5 rounded border border-slate-800">
                  <span className="text-slate-400 block">EST. VOLUME:</span>
                  <span className="text-slate-100 font-bold">{formatVolume(primarySpill.estimated_volume_liters)}</span>
                </div>
                <div className="bg-slate-950/60 p-1.5 rounded border border-slate-800">
                  <span className="text-slate-400 block">WIND VECTOR:</span>
                  <span className="text-cyan-400">{formatSpeed(primarySpill.wind_speed_kts)} @ {formatCourse(primarySpill.wind_direction_deg)}</span>
                </div>
                <div className="bg-slate-950/60 p-1.5 rounded border border-slate-800">
                  <span className="text-slate-400 block">SURFACE CURRENT:</span>
                  <span className="text-amber-400">{formatSpeed(primarySpill.current_speed_kts)} @ {formatCourse(primarySpill.current_direction_deg)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Floating Bottom: 4D Temporal Drift Scrubber */}
        <div className="absolute bottom-6 left-6 right-6 z-[1000] max-w-4xl mx-auto">
          <TemporalDriftScrubber
            currentHour={currentHour}
            onChange={setCurrentHour}
            detectedAt={primarySpill?.detected_at}
          />
        </div>
      </div>

      {/* SAR Inspector Modal */}
      <SarInspectorModal
        isOpen={sarModalOpen}
        onClose={() => setSarModalOpen(false)}
        metadata={primarySpill?.sar_metadata}
        spillName={primarySpill?.name || 'Sector 7A Incident'}
      />
    </div>
  );
}
