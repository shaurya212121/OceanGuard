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
  Flame,
  Droplets,
  Activity,
  Waves,
  ShieldAlert,
} from 'lucide-react';
import {
  fetchSpills,
  fetchVessels,
  fetchVulnerabilityZones,
  type OilSpill,
  type Vessel,
  type CoastalVulnerabilityZone,
  type VesselType,
  type RiskLevel,
} from '@/lib/db';
import {
  tileLayers,
  getTileLayer,
  createDirectionalVesselMarker,
  createOriginMarker,
  createParticleDivIcon,
  createStreamlineVectorIcon,
} from '@/components/map/MapLayers';
import TemporalDriftScrubber from '@/components/map/TemporalDriftScrubber';
import SarInspectorModal from '@/components/map/SarInspectorModal';
import {
  calculateWeatheringTelemetry,
  interpolateParticleCloud,
  generateConcentrationContours,
  generateEnvironmentalVectors,
  interpolateVesselPositionAtHour,
} from '@/utils/driftPhysics';
import {
  formatCoordinates,
  formatArea,
  formatDistance,
  formatSpeed,
  formatCourse,
  formatVolume,
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
  const [sarModalOpen, setSarModalOpen] = useState(false);

  // Layer Toggles
  const [showSpills, setShowSpills] = useState(true);
  const [showVessels, setShowVessels] = useState(true);
  const [showOpenDrift, setShowOpenDrift] = useState(true);
  const [showContours, setShowContours] = useState(true);
  const [showStreamlines, setShowStreamlines] = useState(true);
  const [showVulnerability, setShowVulnerability] = useState(true);
  const [showTrajectories, setShowTrajectories] = useState(true);
  const [showSarOverlay, setShowSarOverlay] = useState(true);
  const [sarOpacity, setSarOpacity] = useState(0.65);

  // Vessel Filters
  const [selectedTypes, setSelectedTypes] = useState<Set<VesselType>>(new Set(vesselTypes));
  const [selectedRisks, setSelectedRisks] = useState<Set<RiskLevel>>(new Set(riskLevels));

  // Simulation Temporal Scrubber: -48.0 to +72.0 hours
  const [currentHour, setCurrentHour] = useState<number>(0.0);

  // Data State
  const [spills, setSpills] = useState<OilSpill[]>([]);
  const [selectedSpill, setSelectedSpill] = useState<OilSpill | null>(null);
  const [vessels, setVessels] = useState<Vessel[]>([]);
  const [vulnerabilityZones, setVulnerabilityZones] = useState<CoastalVulnerabilityZone[]>([]);
  const [loading, setLoading] = useState(true);

  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [spillData, vesselData, zoneData] = await Promise.all([
          fetchSpills(),
          fetchVessels(),
          fetchVulnerabilityZones(),
        ]);
        setSpills(spillData);
        if (spillData.length > 0) setSelectedSpill(spillData[0]);
        setVessels(vesselData);
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
  const primarySpill = selectedSpill || spills[0];

  // Live Weathering & Hydrodynamic Telemetry
  const weatheringTelemetry = useMemo(() => {
    return calculateWeatheringTelemetry(
      currentHour,
      primarySpill?.estimated_volume_liters || 4820000,
      primarySpill?.area_km2 || 4.82
    );
  }, [currentHour, primarySpill]);

  // Continuous Dynamic Particle Cloud (OpenDrift / OpenOil Model)
  const dynamicParticles = useMemo(() => {
    if (!primarySpill) return [];
    return interpolateParticleCloud(
      currentHour,
      primarySpill.origin_lat,
      primarySpill.origin_lng,
      primarySpill.lat,
      primarySpill.lng,
      primarySpill.forward_drift_lat,
      primarySpill.forward_drift_lng,
      110
    );
  }, [currentHour, primarySpill]);

  // Graduated Iso-Concentration Dispersion Hulls (Core -> Sheen -> Dispersion)
  const concentrationContours = useMemo(() => {
    return generateConcentrationContours(dynamicParticles, currentHour);
  }, [dynamicParticles, currentHour]);

  // Environmental Streamline Vectors (Current & Wind Forcing)
  const environmentalVectors = useMemo(() => {
    if (!primarySpill) return [];
    return generateEnvironmentalVectors(primarySpill.lat, primarySpill.lng);
  }, [primarySpill]);

  // Filtered vessels based on active checkboxes
  const filteredVessels = useMemo(() => {
    return vessels.filter((v) => selectedTypes.has(v.type) && selectedRisks.has(v.risk));
  }, [vessels, selectedTypes, selectedRisks]);

  // Synchronize vessel positions along their tracks based on simulation hour
  const interpolatedVessels = useMemo(() => {
    return filteredVessels.map((v) => {
      const isSuspect = v.risk === 'CRITICAL' || v.risk === 'HIGH';

      if (!v.track_history || v.track_history.length < 2) {
        return {
          ...v,
          currentLat: v.lat,
          currentLng: v.lng,
          isIntermittent: false,
          inDischargeWindow: false,
        };
      }

      // If vessel has track history, interpolate between history and current
      if (Math.abs(currentHour) < 0.1) {
        return {
          ...v,
          currentLat: v.lat,
          currentLng: v.lng,
          isIntermittent: false,
          inDischargeWindow: false,
        };
      }

      if (currentHour < 0) {
        // Backtrack along recorded track
        const ratio = Math.max(0, 1 + currentHour / 48); // 0 at -48h, 1 at 0h
        const ptStart = v.track_history[0];
        const ptEnd = [v.lat, v.lng];
        const lat = ptStart[0] + (ptEnd[0] - ptStart[0]) * ratio;
        const lng = ptStart[1] + (ptEnd[1] - ptStart[1]) * ratio;

        // Check if vessel is in discharge release window (-48h to -36h) near origin
        const distToOriginNm = primarySpill
          ? Math.hypot((lat - primarySpill.origin_lat) * 60, (lng - primarySpill.origin_lng) * 56)
          : 999;
        const inDischargeWindow = isSuspect && currentHour <= -24 && distToOriginNm < 8.0;
        const isIntermittent = inDischargeWindow || (isSuspect && currentHour <= -30 && currentHour >= -45);

        return {
          ...v,
          currentLat: lat,
          currentLng: lng,
          isIntermittent,
          inDischargeWindow,
        };
      } else {
        // Project forward based on SOG & COG
        const hoursAhead = currentHour;
        const speedKnots = v.sog || 11.5;
        const headingRad = (v.cog * Math.PI) / 180;
        const distNm = speedKnots * hoursAhead;
        const dLat = (distNm / 60) * Math.cos(headingRad);
        const dLng = (distNm / (60 * Math.cos((v.lat * Math.PI) / 180))) * Math.sin(headingRad);

        return {
          ...v,
          currentLat: v.lat + dLat,
          currentLng: v.lng + dLng,
          isIntermittent: false,
          inDischargeWindow: false,
        };
      }
    });
  }, [filteredVessels, currentHour, primarySpill]);

  // Backward and Forward Drift trajectory streamlines for primary spill
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
          <Loader2 size={32} className="animate-spin text-[#00f0ff]" />
          <span className="font-mono text-xs tracking-widest text-slate-400 uppercase">
            INITIALIZING 4D HYDRODYNAMIC RADAR & BATHYMETRIC GRID...
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
          center={[17.0, 74.0]}
          zoom={6}
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
                    <div className="text-rose-400 font-bold">
                      ESI SENSITIVITY: {zone.esi_index.toFixed(1)} / 10
                    </div>
                    <div className="text-slate-400">
                      DIST TO SLICK: {formatDistance(zone.distance_to_spill_nm)}
                    </div>
                    <div className="text-amber-300">
                      EST. IMPACT: T + {zone.estimated_impact_hrs.toFixed(1)}h
                    </div>
                  </div>
                </Tooltip>
              </Polygon>
            ))}

          {/* 3. Backward Hydrodynamic Drift Path (-48h to 0h) */}
          {showTrajectories && primarySpill && (
            <>
              <Polyline
                positions={backwardDriftPath}
                pathOptions={{
                  color: '#f59e0b',
                  weight: 2.5,
                  dashArray: '6 6',
                  opacity: 0.85,
                }}
              />
              {/* Origin Marker (-48h) */}
              <Marker
                position={[primarySpill.origin_lat, primarySpill.origin_lng]}
                icon={createOriginMarker('BILGE DISCHARGE ORIGIN (-48h)')}
              >
                <Tooltip>
                  <div className="font-mono text-[10px] space-y-0.5">
                    <div className="text-amber-400 font-bold">ESTIMATED RELEASE ORIGIN (T -48h)</div>
                    <div className="text-slate-200">
                      {formatCoordinates(primarySpill.origin_lat, primarySpill.origin_lng)}
                    </div>
                    <div className="text-slate-400">OPENDRIFT BACKWARD CONVERGENCE POINT</div>
                  </div>
                </Tooltip>
              </Marker>
            </>
          )}

          {/* 4. Forward Hydrodynamic Drift Path (0h to +72h) */}
          {showTrajectories && primarySpill && (
            <>
              <Polyline
                positions={forwardDriftPath}
                pathOptions={{
                  color: '#38bdf8',
                  weight: 2,
                  dashArray: '5 5',
                  opacity: 0.8,
                }}
              />
              <CircleMarker
                center={[primarySpill.forward_drift_lat, primarySpill.forward_drift_lng]}
                radius={6}
                pathOptions={{
                  color: '#f43f5e',
                  fillColor: '#f43f5e',
                  fillOpacity: 0.5,
                  weight: 2,
                }}
              >
                <Tooltip>
                  <div className="font-mono text-[10px]">
                    <div className="text-rose-400 font-bold">FORWARD IMPACT FORECAST (+72h)</div>
                    <div className="text-slate-200">
                      {formatCoordinates(primarySpill.forward_drift_lat, primarySpill.forward_drift_lng)}
                    </div>
                    <div className="text-amber-300">SHORELINE REACH PROBABILITY: 78.4%</div>
                  </div>
                </Tooltip>
              </CircleMarker>
            </>
          )}

          {/* 5. Environmental Streamline Vectors (Current & Wind) */}
          {showStreamlines &&
            environmentalVectors.map((vec, idx) => (
              <Marker
                key={`vec-${idx}`}
                position={[vec.startLat, vec.startLng]}
                icon={createStreamlineVectorIcon(
                  vec.type,
                  vec.type === 'WIND' ? 315 : 125,
                  vec.magnitudeKts
                )}
              />
            ))}

          {/* 6. Dynamic Iso-Concentration Dispersion Contours (Core -> Sheen -> Rainbow) */}
          {showContours && concentrationContours.dispersionHull.length > 2 && (
            <Polygon
              positions={concentrationContours.dispersionHull}
              pathOptions={{
                color: '#00f0ff',
                fillColor: '#00f0ff',
                fillOpacity: 0.08,
                weight: 1,
                dashArray: '3 3',
              }}
            />
          )}

          {showContours && concentrationContours.sheenHull.length > 2 && (
            <Polygon
              positions={concentrationContours.sheenHull}
              pathOptions={{
                color: '#38bdf8',
                fillColor: '#38bdf8',
                fillOpacity: 0.2,
                weight: 1.5,
              }}
            />
          )}

          {showContours && concentrationContours.coreHull.length > 2 && (
            <Polygon
              positions={concentrationContours.coreHull}
              pathOptions={{
                color: currentHour < 0 ? '#f59e0b' : '#f43f5e',
                fillColor: currentHour < 0 ? '#f59e0b' : '#f43f5e',
                fillOpacity: 0.45,
                weight: 2,
              }}
            />
          )}

          {/* 7. OpenDrift 110-Particle Cloud with Directional Streamlines */}
          {showOpenDrift &&
            dynamicParticles.map((p) => (
              <Marker
                key={`p-${p.id}`}
                position={[p.lat, p.lng]}
                icon={createParticleDivIcon(p)}
              >
                <Tooltip>
                  <div className="font-mono text-[9px] space-y-0.5">
                    <div className="text-[#00f0ff] font-bold">OPENDRIFT PARTICLE #{p.id}</div>
                    <div className="text-slate-300">STATE: {p.state}</div>
                    <div className="text-slate-300">DENSITY: {formatPercent(p.density * 100, 0)}</div>
                    <div className="text-slate-400">DRIFT SPEED: {p.speedKts} kts</div>
                    <div className="text-slate-400">DROPLET SIZE: {p.dropletSizeUm} µm</div>
                  </div>
                </Tooltip>
              </Marker>
            ))}

          {/* 8. Spills Ground Truth Polygon (Distinct Sentinel-1 SAR Footprint at T=0) */}
          {showSpills &&
            spills.map((spill) => {
              const isCrit = spill.severity === 'CRITICAL';
              const isDetectionFocus = Math.abs(currentHour) < 1.0;
              const color = isDetectionFocus ? '#00f0ff' : isCrit ? '#f43f5e' : '#38bdf8';

              return (
                <Polygon
                  key={spill.id}
                  positions={spill.polygon}
                  pathOptions={{
                    color,
                    fillColor: color,
                    fillOpacity: isDetectionFocus ? 0.35 : 0.2,
                    weight: isDetectionFocus ? 2.5 : 1.5,
                    dashArray: isDetectionFocus ? undefined : '4 4',
                  }}
                >
                  <Tooltip sticky>
                    <div className="font-mono text-[10px] space-y-0.5">
                      <div className="text-[#00f0ff] font-bold">{spill.spill_id}</div>
                      <div className="text-slate-100 font-semibold">{spill.name}</div>
                      <div className="text-slate-300">
                        SURFACE AREA: {formatArea(weatheringTelemetry.activeAreaKm2)} (DYNAMIC)
                      </div>
                      <div className="text-slate-300">
                        VOL REMAINING: {formatVolume(weatheringTelemetry.volumeRemainingLiters)}
                      </div>
                      <div className="text-amber-300">
                        EVAPORATED: {weatheringTelemetry.evaporatedPercent}%
                      </div>
                      <div className="text-slate-400">
                        POSITION: {formatCoordinates(spill.lat, spill.lng)}
                      </div>
                    </div>
                  </Tooltip>
                </Polygon>
              );
            })}

          {/* 9. AIS Vessel Trajectory & Directional Markers */}
          {showVessels &&
            interpolatedVessels.map((v) => {
              const isSuspect = v.risk === 'CRITICAL' || v.risk === 'HIGH';
              const isSilent = v.ais_status === 'SILENT';
              const isIntermittent = (v as any).isIntermittent;
              const inDischargeWindow = (v as any).inDischargeWindow;

              return (
                <div key={v.id}>
                  {/* Vessel Historical Trail */}
                  {showTrajectories && v.track_history && (
                    <Polyline
                      positions={v.track_history}
                      pathOptions={{
                        color: inDischargeWindow
                          ? '#f43f5e'
                          : isSilent
                          ? '#f43f5e'
                          : isSuspect
                          ? '#f59e0b'
                          : '#38bdf8',
                        weight: inDischargeWindow ? 3 : 1.5,
                        dashArray: inDischargeWindow ? undefined : '3 3',
                        opacity: inDischargeWindow ? 0.95 : 0.45,
                      }}
                    />
                  )}

                  {/* Directional Vessel Marker */}
                  <Marker
                    position={[v.currentLat, v.currentLng]}
                    icon={createDirectionalVesselMarker(
                      v.cog,
                      isSuspect,
                      isSilent,
                      isIntermittent
                    )}
                  >
                    <Tooltip sticky>
                      <div className="font-mono text-[10px] space-y-0.5 min-w-[200px]">
                        <div className="flex items-center justify-between border-b border-slate-700 pb-1 mb-1">
                          <span className="text-[#00f0ff] font-bold">{v.name}</span>
                          <span
                            className="font-bold"
                            style={{ color: riskColors[v.risk] }}
                          >
                            {v.risk}
                          </span>
                        </div>
                        {inDischargeWindow && (
                          <div className="text-rose-400 font-bold bg-rose-950/60 px-1 py-0.5 rounded border border-rose-500/50 animate-pulse">
                            ⚠️ RELEASE CORRIDOR COINCIDENCE
                          </div>
                        )}
                        <div className="text-slate-300">MMSI: {v.mmsi}</div>
                        <div className="text-slate-300">TYPE: {v.type}</div>
                        <div className="text-slate-300">FLAG: {v.flag}</div>
                        <div className="text-slate-200">
                          SOG: {formatSpeed(v.sog)} • COG: {formatCourse(v.cog)}
                        </div>
                        <div className="text-slate-400">
                          POSITION: {formatCoordinates(v.currentLat, v.currentLng)}
                        </div>
                        <div className="text-amber-400">
                          AIS STATUS: {isIntermittent ? 'TRANSPONDER GAP' : v.ais_status}
                        </div>
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
                  ? 'border-cyan-500/60 bg-cyan-950/40 text-[#00f0ff]'
                  : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700'
              }`}
            >
              <Layers size={14} className="text-[#00f0ff]" />
              <span>MAP LAYERS</span>
            </button>

            {/* Quick SAR Inspector Trigger */}
            <button
              onClick={() => setSarModalOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-cyan-950/30 border border-cyan-500/40 text-[#00f0ff] hover:bg-cyan-950/60 transition-all text-xs font-mono shadow-[0_0_10px_rgba(0,240,255,0.15)]"
            >
              <Eye size={14} />
              <span>SAR INSPECTOR</span>
            </button>
          </div>

          {/* Layers Popover Menu */}
          {showLayersMenu && (
            <div className="w-80 bg-[#0d1524]/95 backdrop-blur-md border border-slate-700 p-4 shadow-2xl space-y-4 tactical-corners max-h-[80vh] overflow-y-auto">
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
                          ? 'bg-cyan-950/50 text-[#00f0ff] border border-cyan-500/40'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${
                          activeBaseLayer === l.id ? 'bg-[#00f0ff]' : 'bg-slate-600'
                        }`}
                      />
                      <span>{l.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Data Overlay Toggles */}
              <div className="border-t border-slate-800 pt-3">
                <span className="font-mono text-[9px] text-slate-400 tracking-widest uppercase font-semibold block mb-2">
                  TACTICAL HYDRODYNAMIC OVERLAYS
                </span>
                <div className="space-y-2 font-mono text-xs text-slate-300">
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 bg-[#00f0ff] rounded-full animate-pulse" />
                      OpenDrift Particle Cloud (110)
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
                      <span className="w-3 h-2 bg-gradient-to-r from-amber-500 to-rose-500 rounded-sm opacity-80" />
                      Iso-Concentration Contours
                    </span>
                    <input
                      type="checkbox"
                      checked={showContours}
                      onChange={(e) => setShowContours(e.target.checked)}
                      className="accent-cyan-400 cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="flex items-center gap-2">
                      <span className="w-3 h-0.5 bg-[#00f0ff]" />
                      Current & Wind Streamlines
                    </span>
                    <input
                      type="checkbox"
                      checked={showStreamlines}
                      onChange={(e) => setShowStreamlines(e.target.checked)}
                      className="accent-cyan-400 cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 bg-rose-500/30 border border-rose-500" />
                      Oil Spill Footprint (SAR)
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
                      <span className="w-2.5 h-2.5 bg-[#00f0ff] rounded-full" />
                      AIS Vessels & Trajectories
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
                </div>
              </div>

              {/* SAR Imagery Opacity Slider */}
              <div className="border-t border-slate-800 pt-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-[9px] text-slate-400 uppercase font-semibold">
                    SENTINEL-1 SAR OPACITY
                  </span>
                  <span className="font-mono text-xs text-[#00f0ff]">
                    {formatPercent(sarOpacity * 100, 0)}
                  </span>
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
                  className="w-full accent-[#00f0ff] cursor-pointer"
                />
              </div>
            </div>
          )}
        </div>

        {/* Floating Top-Right: Dynamic Physics Telemetry HUD Sync */}
        {primarySpill && (
          <div className="absolute top-4 right-4 z-[1000] hidden md:flex flex-col gap-2">
            <div className="bg-[#0b1320]/95 backdrop-blur-md border border-slate-800 p-3 shadow-xl tactical-corners w-80 space-y-2.5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                <div className="flex items-center gap-1.5">
                  <Activity size={13} className="text-[#00f0ff] animate-pulse" />
                  <span className="font-mono text-[9px] text-[#00f0ff] tracking-widest uppercase font-semibold">
                    HYDRODYNAMIC TELEMETRY HUD
                  </span>
                </div>
                <span
                  className="font-mono text-[9px] px-1.5 py-0.5 rounded border"
                  style={{
                    color: weatheringTelemetry.severityColor,
                    borderColor: `${weatheringTelemetry.severityColor}60`,
                    backgroundColor: `${weatheringTelemetry.severityColor}15`,
                  }}
                >
                  {weatheringTelemetry.phase}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <p className="font-sans font-semibold text-slate-100 truncate">
                  {primarySpill.name}
                </p>
                <span className="font-mono text-[10px] text-slate-400">
                  {currentHour >= 0 ? `+${currentHour.toFixed(1)}h` : `${currentHour.toFixed(1)}h`}
                </span>
              </div>

              {/* Dynamic Metrics Grid synchronized with simulation time */}
              <div className="grid grid-cols-2 gap-2 font-mono text-[10px]">
                <div className="bg-slate-950/70 p-2 rounded border border-slate-800/80">
                  <span className="text-slate-400 block text-[9px]">DYNAMIC SLICK AREA:</span>
                  <span className="text-[#00f0ff] font-bold text-xs">
                    {formatArea(weatheringTelemetry.activeAreaKm2)}
                  </span>
                </div>
                <div className="bg-slate-950/70 p-2 rounded border border-slate-800/80">
                  <span className="text-slate-400 block text-[9px]">VOLUME REMAINING:</span>
                  <span className="text-slate-100 font-bold text-xs">
                    {formatVolume(weatheringTelemetry.volumeRemainingLiters)}
                  </span>
                </div>
                <div className="bg-slate-950/70 p-2 rounded border border-slate-800/80">
                  <span className="text-slate-400 block text-[9px]">EVAPORATED FRACTION:</span>
                  <span className="text-amber-400 font-bold">
                    {weatheringTelemetry.evaporatedPercent}%
                  </span>
                </div>
                <div className="bg-slate-950/70 p-2 rounded border border-slate-800/80">
                  <span className="text-slate-400 block text-[9px]">WATER EMULSIFICATION:</span>
                  <span className="text-cyan-300 font-bold">
                    {weatheringTelemetry.emulsifiedPercent}%
                  </span>
                </div>
              </div>

              {/* Coastal proximity alert */}
              <div className="bg-slate-950/60 p-2 rounded border border-slate-800 flex items-center justify-between text-[10px] font-mono">
                <div className="flex items-center gap-1.5 text-slate-300">
                  <Compass size={13} className="text-[#00f0ff]" />
                  <span>DIST TO SHORELINE:</span>
                </div>
                <span className="text-slate-100 font-bold">
                  {weatheringTelemetry.distanceToShoreNm} NM
                </span>
              </div>

              {weatheringTelemetry.beachedPercent > 0 && (
                <div className="bg-rose-950/80 border border-rose-500/60 p-1.5 rounded flex items-center gap-2 text-rose-300 text-[10px] font-mono animate-pulse">
                  <ShieldAlert size={14} className="text-rose-400 shrink-0" />
                  <span>
                    SHORELINE IMPACT CONFIRMED: {weatheringTelemetry.beachedPercent}% BEACHED
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Floating Bottom: 4D Temporal Drift Scrubber */}
        <div className="absolute bottom-6 left-6 right-6 z-[1000] max-w-4xl mx-auto">
          <TemporalDriftScrubber
            currentHour={currentHour}
            onChange={setCurrentHour}
            detectedAt={primarySpill?.detected_at}
            weatheringTelemetry={weatheringTelemetry}
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
