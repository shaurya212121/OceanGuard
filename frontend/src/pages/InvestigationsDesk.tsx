import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  MapContainer,
  TileLayer,
  Polygon,
  Polyline,
  CircleMarker,
  Circle,
  Marker,
  Tooltip,
  ZoomControl,
} from 'react-leaflet';
import L from 'leaflet';
import {
  Search,
  Crosshair,
  Navigation,
  Target,
  FileText,
  Clock,
  MapPin,
  Loader2,
  AlertTriangle,
  Download,
  ShieldAlert,
  ShieldCheck,
  ChevronRight,
  X,
  Radar,
  Anchor,
  Compass,
  Radio,
  ExternalLink,
} from 'lucide-react';
import { fetchSpills, fetchSpillById, type OilSpill, type SuspectVessel } from '@/lib/db';
import { getTileLayer, createOriginMarker, createDirectionalVesselMarker } from '@/components/map/MapLayers';
import {
  formatCoordinates,
  formatArea,
  formatDistance,
  formatSpeed,
  formatCourse,
  formatVolume,
  formatTimestampUTC,
  formatPercent,
  formatMMSI,
  formatIMO,
} from '@/utils/formatters';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const tileLayer = getTileLayer('bathymetry');

const severityBadge = (sev: string) => {
  switch (sev) {
    case 'CRITICAL': return 'text-rose-400 border-rose-500/40 bg-rose-950/30';
    case 'HIGH': return 'text-amber-400 border-amber-500/40 bg-amber-950/30';
    case 'MODERATE': return 'text-sky-400 border-sky-500/40 bg-sky-950/30';
    default: return 'text-slate-400 border-slate-700 bg-slate-900';
  }
};

const statusBadge = (status: string) => {
  switch (status) {
    case 'ACTIVE': return 'text-rose-400 border-rose-500/40';
    case 'MONITORING': return 'text-amber-400 border-amber-500/40';
    case 'CONTAINED': return 'text-sky-400 border-sky-500/40';
    case 'RESOLVED': return 'text-emerald-400 border-emerald-500/40';
    default: return 'text-slate-400 border-slate-800';
  }
};

export default function InvestigationsDesk() {
  const { id: paramSpillId } = useParams<{ id?: string }>();
  const navigate = useNavigate();

  const [spills, setSpills] = useState<OilSpill[]>([]);
  const [selectedSpillId, setSelectedSpillId] = useState<string | null>(null);
  const [selectedSpill, setSelectedSpill] = useState<OilSpill | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSuspect, setSelectedSuspect] = useState<SuspectVessel | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [spillLoading, setSpillLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mapRef = useRef<L.Map | null>(null);

  // Load all spills
  useEffect(() => {
    (async () => {
      try {
        const data = await fetchSpills();
        setSpills(data);
        if (data.length > 0) {
          const target = paramSpillId
            ? data.find((s) => s.id === paramSpillId || s.spill_id === paramSpillId) || data[0]
            : data[0];
          setSelectedSpillId(target.id);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load spills');
      } finally {
        setLoading(false);
      }
    })();
  }, [paramSpillId]);

  // Load selected spill details
  useEffect(() => {
    if (!selectedSpillId) return;
    (async () => {
      setSpillLoading(true);
      try {
        const detail = await fetchSpillById(selectedSpillId);
        setSelectedSpill(detail);
        if (detail && detail.suspects.length > 0) {
          setSelectedSuspect(detail.suspects[0]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load spill details');
      } finally {
        setSpillLoading(false);
      }
    })();
  }, [selectedSpillId]);

  // Re-center map smoothly on spill change
  useEffect(() => {
    if (mapRef.current && selectedSpill) {
      setTimeout(() => {
        mapRef.current?.invalidateSize();
        mapRef.current?.flyTo([selectedSpill.lat, selectedSpill.lng], 8, { duration: 1.0 });
      }, 150);
    }
  }, [selectedSpill]);

  // Generate Maritime Evidence Dossier PDF
  const generatePDF = () => {
    if (!selectedSpill) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;

    // Defense Classification Banner
    doc.setFillColor(15, 23, 42); // Navy slate
    doc.rect(0, 0, pageWidth, 18, 'F');
    doc.setFont('courier', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(0, 240, 255);
    doc.text('MARITIME DEFENSE & COAST GUARD COMMAND INTELLIGENCE DOSSIER', pageWidth / 2, 11, { align: 'center' });

    // Official Title
    doc.setTextColor(20, 20, 20);
    doc.setFontSize(15);
    doc.setFont('courier', 'bold');
    doc.text('INCIDENT ATTRIBUTION & ENFORCEMENT DOSSIER', pageWidth / 2, 28, { align: 'center' });

    doc.setFontSize(8);
    doc.setFont('courier', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(`GENERATED: ${formatTimestampUTC(new Date())} | SYSTEM: OceanGuard AI v3.2.1 | JURISDICTION: UNCLOS EEZ`, pageWidth / 2, 33, { align: 'center' });

    // Section 1: Spill Geometry & Metocean Baseline
    doc.setFontSize(11);
    doc.setFont('courier', 'bold');
    doc.setTextColor(0, 50, 100);
    doc.text('1. SATELLITE RADAR OBSERVATION & SLICK GEOMETRY', 14, 43);

    doc.setFont('courier', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(20, 20, 20);
    doc.text(`Incident ID:      ${selectedSpill.spill_id} (${selectedSpill.name})`, 14, 49);
    doc.text(`Sensor Platform:  ${selectedSpill.sar_metadata?.satellite || 'Sentinel-1A SAR-C'} (${selectedSpill.sar_metadata?.polarization || 'VV+VH'})`, 14, 54);
    doc.text(`Acquisition Time: ${formatTimestampUTC(selectedSpill.detected_at)}`, 14, 59);
    doc.text(`Slick Position:   ${formatCoordinates(selectedSpill.lat, selectedSpill.lng)}`, 14, 64);
    doc.text(`Slick Extent:     ${formatArea(selectedSpill.area_km2)} (Estimated Volume: ${formatVolume(selectedSpill.estimated_volume_liters)})`, 14, 69);
    doc.text(`Metocean Vector:  Wind ${formatSpeed(selectedSpill.wind_speed_kts)} @ ${formatCourse(selectedSpill.wind_direction_deg)} | Drift Current ${formatSpeed(selectedSpill.current_speed_kts)} @ ${formatCourse(selectedSpill.current_direction_deg)}`, 14, 74);

    // Section 2: Hydrodynamic Drift Attribution
    doc.setFontSize(11);
    doc.setFont('courier', 'bold');
    doc.setTextColor(0, 50, 100);
    doc.text('2. OPENDRIFT BACKWARD HINDCAST & ORIGIN RECONSTRUCTION', 14, 85);

    doc.setFont('courier', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(20, 20, 20);
    doc.text(`Release Window:   T - 48.0 Hours prior to SAR pass`, 14, 91);
    doc.text(`Origin Intersect: ${formatCoordinates(selectedSpill.origin_lat, selectedSpill.origin_lng)}`, 14, 96);
    doc.text(`Forward Drift:    ${formatCoordinates(selectedSpill.forward_drift_lat, selectedSpill.forward_drift_lng)} (Heading: ${formatCourse(selectedSpill.drift_heading_deg)})`, 14, 101);

    // Section 3: 5-Factor Suspect Matrix
    doc.setFontSize(11);
    doc.setFont('courier', 'bold');
    doc.setTextColor(0, 50, 100);
    doc.text('3. SUSPECT VESSEL ATTRIBUTION & 5-FACTOR EVIDENCE MATRIX', 14, 112);

    const tableData = selectedSpill.suspects.map((s, idx) => [
      `#${idx + 1} ${s.name}`,
      s.mmsi,
      formatIMO(s.imo),
      s.flag,
      formatDistance(s.distance_nm),
      `${s.guilt_score.toFixed(1)}%`,
      s.factors ? `${s.factors.ais_anomaly_score}%` : '—',
      s.factors ? `${s.factors.radar_corroboration}%` : '—',
      s.ais_status,
    ]);

    autoTable(doc, {
      startY: 117,
      head: [['Vessel Name', 'MMSI', 'IMO', 'Flag', 'Origin Dist', 'Guilt Score', 'AIS Anomaly', 'Radar Match', 'AIS Status']],
      body: tableData,
      theme: 'grid',
      styles: { font: 'courier', fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [13, 21, 36], textColor: [0, 240, 255] },
    });

    const finalY = (doc as any).lastAutoTable.finalY + 10;

    // Section 4: Enforcement Recommendation
    doc.setFontSize(11);
    doc.setFont('courier', 'bold');
    doc.setTextColor(0, 50, 100);
    doc.text('4. COAST GUARD ENFORCEMENT RECOMMENDATION', 14, finalY);

    const primeSuspect = selectedSpill.suspects[0];
    doc.setFont('courier', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(30, 30, 30);
    const recommendation = primeSuspect
      ? `PRIME SUSPECT IDENTIFIED: ${primeSuspect.name} (MMSI ${primeSuspect.mmsi}, Flag: ${primeSuspect.flag}). Composite guilt score ${primeSuspect.guilt_score.toFixed(1)}% derived from spatiotemporal intercept during backward drift window, deliberate ${primeSuspect.gap_duration_mins}-min AIS transponder blackout, and corroborating dark-vessel radar cross-section (RCS: ${primeSuspect.radar_rcs_m2?.toLocaleString() ?? 32000} m²). Recommend immediate vessel boarding inspection and ballast residue chemical fingerprint sampling at next port of call.`
      : 'No vessel met the required 70% evidentiary threshold for immediate interception.';

    const splitRec = doc.splitTextToSize(recommendation, pageWidth - 28);
    doc.text(splitRec, 14, finalY + 6);

    // Signature Block
    const sigY = finalY + 35;
    doc.setFont('courier', 'bold');
    doc.setFontSize(9);
    doc.text('INVESTIGATING WATCH OFFICER: __________________________', 14, sigY);
    doc.text('MARITIME PATROL COMMANDER:   __________________________', pageWidth / 2, sigY);

    doc.save(`OceanGuard_Evidence_Dossier_${selectedSpill.spill_id}.pdf`);
  };

  const filteredSpills = useMemo(() => {
    if (!searchQuery.trim()) return spills;
    const q = searchQuery.toLowerCase();
    return spills.filter(
      (s) => s.spill_id.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)
    );
  }, [spills, searchQuery]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-[#0a0f18]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={32} className="animate-spin text-ocean-cyan" />
          <span className="font-mono text-xs tracking-widest text-slate-400 uppercase">
            LOADING INVESTIGATION DOSSIERS & AIS ATTRIBUTION GRIDS...
          </span>
        </div>
      </div>
    );
  }

  if (!selectedSpill) return null;

  const backwardDrift: [number, number][] = [
    [selectedSpill.origin_lat, selectedSpill.origin_lng],
    [selectedSpill.lat, selectedSpill.lng],
  ];

  const forwardDrift: [number, number][] = [
    [selectedSpill.lat, selectedSpill.lng],
    [selectedSpill.forward_drift_lat, selectedSpill.forward_drift_lng],
  ];

  const spillColor = selectedSpill.severity === 'CRITICAL' ? '#f43f5e' : '#00f0ff';

  return (
    <div className="flex h-full w-full bg-[#0a0f18] overflow-hidden select-none">
      {/* ── Column 1: Incident Dossiers List ─────────────────────────── */}
      <div className="w-80 shrink-0 bg-[#0d1524] border-r border-slate-800 flex flex-col">
        {/* Search header */}
        <div className="p-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <Search size={14} className="text-ocean-cyan" />
              <span className="font-mono text-[10px] text-slate-400 font-semibold tracking-widest uppercase">
                INCIDENT DOSSIERS
              </span>
            </div>
            <span className="font-mono text-[9px] px-1.5 py-0.5 bg-slate-800 text-slate-300 rounded">
              {spills.length} ACTIVE
            </span>
          </div>
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search spill ID or sector..."
              className="w-full bg-slate-950 border border-slate-800 px-3 py-1.5 pl-8 font-mono text-xs text-slate-200 placeholder:text-slate-500 focus:border-cyan-500/50 focus:outline-none transition-colors rounded"
            />
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
          </div>
        </div>

        {/* Dossier Item List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1.5 divide-y divide-slate-800/40">
          {filteredSpills.map((spill) => {
            const isSelected = selectedSpillId === spill.id;
            return (
              <button
                key={spill.id}
                onClick={() => {
                  setSelectedSpillId(spill.id);
                  navigate(`/investigations/${spill.id}`);
                }}
                className={`w-full text-left p-3 rounded transition-all duration-150 border ${
                  isSelected
                    ? 'border-cyan-500/50 bg-cyan-950/30 shadow-[0_0_12px_rgba(0,240,255,0.12)]'
                    : 'border-transparent hover:border-slate-800 hover:bg-slate-900/40'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`status-badge text-[9px] ${severityBadge(spill.severity)}`}>
                    {spill.severity}
                  </span>
                  <span className={`status-badge text-[9px] ${statusBadge(spill.status)}`}>
                    {spill.status}
                  </span>
                </div>
                <p className="font-sans text-xs font-semibold text-slate-200 leading-snug">
                  {spill.name}
                </p>
                <p className="font-mono text-[10px] text-ocean-cyan mt-1">{spill.spill_id}</p>
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mt-2">
                  <span>AREA: {formatArea(spill.area_km2)}</span>
                  <span className="text-amber-400">{spill.suspects.length} SUSPECTS</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Column 2: Center Map & Dossier Header ─────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Incident Summary Header Bar */}
        <div className="px-6 py-3.5 border-b border-slate-800 bg-[#0d1524] flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="font-sans text-base font-bold text-slate-100">{selectedSpill.name}</h2>
              <span className={`status-badge text-[9px] ${severityBadge(selectedSpill.severity)}`}>
                {selectedSpill.severity}
              </span>
              <span className={`status-badge text-[9px] ${statusBadge(selectedSpill.status)}`}>
                {selectedSpill.status}
              </span>
            </div>
            <p className="font-mono text-[10px] text-slate-400 mt-0.5">
              INCIDENT ID: <span className="text-ocean-cyan">{selectedSpill.spill_id}</span> • DETECTED:{' '}
              {formatTimestampUTC(selectedSpill.detected_at)}
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="grid grid-cols-3 gap-3 font-mono text-[11px] bg-slate-950/60 px-3 py-1.5 border border-slate-800 rounded">
              <div>
                <span className="text-slate-400 text-[9px] block uppercase">SLICK EXTENT</span>
                <span className="text-slate-200 font-bold">{formatArea(selectedSpill.area_km2)}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[9px] block uppercase">EST. VOLUME</span>
                <span className="text-slate-200 font-bold">{formatVolume(selectedSpill.estimated_volume_liters)}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[9px] block uppercase">SAR PASS</span>
                <span className="text-ocean-cyan font-bold">{selectedSpill.sar_metadata?.satellite || 'Sentinel-1A'}</span>
              </div>
            </div>

            <button
              onClick={generatePDF}
              className="px-3 py-2 bg-cyan-950/40 hover:bg-cyan-950/80 border border-cyan-500/50 text-ocean-cyan font-mono text-xs font-semibold flex items-center gap-2 transition-all shadow-[0_0_12px_rgba(0,240,255,0.15)] rounded"
            >
              <Download size={14} />
              <span>GENERATE EVIDENCE DOSSIER</span>
            </button>
          </div>
        </div>

        {/* Tactical Map Container */}
        <div className="flex-1 relative min-h-0">
          <MapContainer
            center={[selectedSpill.lat, selectedSpill.lng]}
            zoom={8}
            className="w-full h-full"
            ref={(m) => {
              if (m) mapRef.current = m;
            }}
            zoomControl={false}
          >
            <TileLayer
              url={tileLayer.url}
              attribution={tileLayer.attribution}
              maxZoom={tileLayer.maxZoom}
              maxNativeZoom={tileLayer.maxNativeZoom}
              className={tileLayer.className}
            />
            <ZoomControl position="bottomright" />

            {/* Spill Slick Polygon */}
            <Polygon
              positions={selectedSpill.polygon}
              pathOptions={{
                color: spillColor,
                fillColor: spillColor,
                fillOpacity: 0.25,
                weight: 2,
              }}
            >
              <Tooltip sticky>
                <div className="font-mono text-[10px]">
                  <div className="text-ocean-cyan font-bold">{selectedSpill.spill_id}</div>
                  <div className="text-slate-200">{formatArea(selectedSpill.area_km2)}</div>
                  <div className="text-slate-400">CENTER: {formatCoordinates(selectedSpill.lat, selectedSpill.lng)}</div>
                </div>
              </Tooltip>
            </Polygon>

            {/* Backward Drift Vector (-48h) */}
            <Polyline
              positions={backwardDrift}
              pathOptions={{ color: '#00f0ff', weight: 2, dashArray: '6 4' }}
            />

            {/* Forward Drift Vector (+72h) */}
            <Polyline
              positions={forwardDrift}
              pathOptions={{ color: '#f59e0b', weight: 2, dashArray: '6 4' }}
            />

            {/* Spill Center Marker */}
            <CircleMarker
              center={[selectedSpill.lat, selectedSpill.lng]}
              radius={6}
              pathOptions={{ color: spillColor, fillColor: spillColor, fillOpacity: 0.6, weight: 2 }}
            />

            {/* Origin Point Marker & Uncertainty Bubble */}
            <Circle
              center={[selectedSpill.origin_lat, selectedSpill.origin_lng]}
              radius={24000} // 24 km uncertainty radius
              pathOptions={{ color: '#00f0ff', fillColor: '#00f0ff', fillOpacity: 0.08, weight: 1, dashArray: '4 4' }}
            />
            <Marker
              position={[selectedSpill.origin_lat, selectedSpill.origin_lng]}
              icon={createOriginMarker()}
            >
              <Tooltip>
                <div className="font-mono text-[10px]">
                  <div className="text-ocean-cyan font-bold">RELEASE ORIGIN (T -48h)</div>
                  <div className="text-slate-300">{formatCoordinates(selectedSpill.origin_lat, selectedSpill.origin_lng)}</div>
                  <div className="text-slate-400">STOKES & SURFACE DRIFT CONVERGENCE</div>
                </div>
              </Tooltip>
            </Marker>

            {/* Forward Drift Endpoint */}
            <CircleMarker
              center={[selectedSpill.forward_drift_lat, selectedSpill.forward_drift_lng]}
              radius={5}
              pathOptions={{ color: '#f59e0b', fillColor: '#f59e0b', fillOpacity: 0.5, weight: 1.5 }}
            >
              <Tooltip>
                <div className="font-mono text-[10px]">
                  <div className="text-amber-400 font-bold">FORWARD DRIFT PROJECTION (+72h)</div>
                  <div className="text-slate-300">{formatCoordinates(selectedSpill.forward_drift_lat, selectedSpill.forward_drift_lng)}</div>
                </div>
              </Tooltip>
            </CircleMarker>

            {/* Suspect Vessels Placed on Map */}
            {selectedSpill.suspects.map((suspect) => {
              const isSelected = selectedSuspect?.id === suspect.id;
              const isSilent = suspect.ais_status === 'SILENT';
              return (
                <Marker
                  key={suspect.id}
                  position={[suspect.last_lat, suspect.last_lng]}
                  icon={createDirectionalVesselMarker(suspect.cog, true, isSilent)}
                  eventHandlers={{
                    click: () => {
                      setSelectedSuspect(suspect);
                      setDrawerOpen(true);
                    },
                  }}
                >
                  <Tooltip sticky>
                    <div className="font-mono text-[10px] space-y-0.5 min-w-[170px]">
                      <div className="text-ocean-cyan font-bold">{suspect.name}</div>
                      <div className="text-rose-400 font-semibold">GUILT SCORE: {suspect.guilt_score.toFixed(1)}%</div>
                      <div className="text-slate-300">MMSI: {formatMMSI(suspect.mmsi)}</div>
                      <div className="text-slate-300">DIST TO ORIGIN: {formatDistance(suspect.distance_nm)}</div>
                      <div className="text-slate-400">STATUS: {suspect.ais_status}</div>
                    </div>
                  </Tooltip>
                </Marker>
              );
            })}
          </MapContainer>

          {/* Map Trajectory Legend Overlay */}
          <div className="absolute top-4 left-4 z-[1000] bg-[#0d1524]/90 backdrop-blur-md border border-slate-800 p-2.5 shadow-xl tactical-corners space-y-1.5">
            <span className="font-mono text-[9px] text-slate-400 tracking-widest uppercase font-semibold block">
              TRAJECTORY CONTOURS
            </span>
            <div className="flex items-center gap-2 font-mono text-[10px] text-slate-300">
              <span className="w-4 h-0.5 bg-cyan-400 border-dashed" />
              <span>BACKWARD DRIFT (-48h)</span>
            </div>
            <div className="flex items-center gap-2 font-mono text-[10px] text-slate-300">
              <span className="w-4 h-0.5 bg-amber-400 border-dashed" />
              <span>FORWARD FORECAST (+72h)</span>
            </div>
            <div className="flex items-center gap-2 font-mono text-[10px] text-slate-300">
              <div className="w-3 h-3 rounded-full border border-cyan-400/50 bg-cyan-400/20" />
              <span>UNCERTAINTY ENVELOPE</span>
            </div>
          </div>
        </div>

        {/* Bottom Drift Vector Coordinate Bar */}
        <div className="shrink-0 bg-[#0d1524] border-t border-slate-800 px-6 py-2.5 grid grid-cols-4 gap-4 font-mono text-xs">
          <div className="flex items-center gap-2.5">
            <Crosshair size={16} className="text-ocean-cyan shrink-0" />
            <div>
              <span className="text-[9px] text-slate-400 block uppercase">ORIGIN RELEASE (-48h)</span>
              <span className="text-slate-200 font-semibold">{formatCoordinates(selectedSpill.origin_lat, selectedSpill.origin_lng)}</span>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <MapPin size={16} className="text-rose-400 shrink-0" />
            <div>
              <span className="text-[9px] text-slate-400 block uppercase">SPILL DETECTED (T₀)</span>
              <span className="text-slate-200 font-semibold">{formatCoordinates(selectedSpill.lat, selectedSpill.lng)}</span>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <Navigation size={16} className="text-amber-400 shrink-0" />
            <div>
              <span className="text-[9px] text-slate-400 block uppercase">FORWARD DRIFT (+72h)</span>
              <span className="text-slate-200 font-semibold">{formatCoordinates(selectedSpill.forward_drift_lat, selectedSpill.forward_drift_lng)}</span>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <Clock size={16} className="text-emerald-400 shrink-0" />
            <div>
              <span className="text-[9px] text-slate-400 block uppercase">COASTAL IMPACT ETA</span>
              <span className="text-amber-400 font-semibold">T + 34.5 HOURS (DAYMANIYAT)</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Column 3: 5-Factor Suspect Attribution Card Deck ──────────── */}
      <div className="w-96 shrink-0 bg-[#0d1524] border-l border-slate-800 flex flex-col">
        {/* Attribution Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Target size={15} className="text-ocean-cyan" />
              <span className="font-mono text-[10px] text-slate-400 font-semibold tracking-widest uppercase">
                SUSPECT ATTRIBUTION MATRIX
              </span>
            </div>
            <span className="font-mono text-[9px] px-1.5 py-0.5 bg-rose-950/40 text-rose-400 border border-rose-500/40 rounded">
              RANKED
            </span>
          </div>
          <p className="font-sans text-xs text-slate-300">
            Composite guilt score calculated across 5 physical & behavioral factors
          </p>
        </div>

        {/* Suspect Cards Scroll */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3 divide-y divide-slate-800/40">
          {spillLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={24} className="animate-spin text-ocean-cyan" />
            </div>
          ) : (
            selectedSpill.suspects.map((suspect, idx) => {
              const isSelected = selectedSuspect?.id === suspect.id;
              const guiltColor =
                suspect.guilt_score >= 80 ? 'text-rose-400' :
                suspect.guilt_score >= 60 ? 'text-amber-400' : 'text-sky-400';

              const barColor =
                suspect.guilt_score >= 80 ? '#f43f5e' :
                suspect.guilt_score >= 60 ? '#f59e0b' : '#38bdf8';

              return (
                <div
                  key={suspect.id}
                  onClick={() => {
                    setSelectedSuspect(suspect);
                    setDrawerOpen(true);
                  }}
                  className={`p-3.5 rounded border transition-all duration-150 cursor-pointer ${
                    isSelected
                      ? 'border-cyan-500/50 bg-cyan-950/20 shadow-[0_0_12px_rgba(0,240,255,0.1)]'
                      : 'border-slate-800 bg-slate-900/40 hover:border-slate-700 hover:bg-slate-900/80'
                  }`}
                >
                  {/* Card Title Row */}
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`font-mono text-lg font-bold ${guiltColor}`}>
                        #{idx + 1}
                      </span>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-sans text-sm font-bold text-slate-100">{suspect.name}</h4>
                          <span className="text-[10px]">({suspect.flag_code})</span>
                        </div>
                        <p className="font-mono text-[10px] text-slate-400">MMSI: {formatMMSI(suspect.mmsi)}</p>
                      </div>
                    </div>

                    {suspect.guilt_score >= 80 && (
                      <span className="status-badge text-[9px] text-rose-400 border-rose-500/50 bg-rose-950/40 pulse-red">
                        PRIME SUSPECT
                      </span>
                    )}
                  </div>

                  {/* Composite Score Progress Meter */}
                  <div className="space-y-1 mb-3">
                    <div className="flex justify-between font-mono text-[10px]">
                      <span className="text-slate-400">COMPOSITE GUILT SCORE</span>
                      <span className={`font-bold ${guiltColor}`}>{suspect.guilt_score.toFixed(1)}%</span>
                    </div>
                    <div className="h-2 w-full bg-slate-950 border border-slate-800 rounded-sm overflow-hidden">
                      <div
                        className="h-full transition-all duration-700"
                        style={{ width: `${suspect.guilt_score}%`, backgroundColor: barColor }}
                      />
                    </div>
                  </div>

                  {/* 5-Factor Breakdown Micro-bars */}
                  {suspect.factors && (
                    <div className="bg-slate-950/60 p-2.5 rounded border border-slate-800/80 space-y-1.5 font-mono text-[9px]">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">1. SPATIOTEMPORAL PROXIMITY:</span>
                        <span className="text-slate-200 font-bold">{suspect.factors.spatiotemporal_proximity}%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">2. AIS ANOMALY / BLACKOUT:</span>
                        <span className="text-rose-400 font-bold">{suspect.factors.ais_anomaly_score}%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">3. TRAJECTORY & SPEED VECTOR:</span>
                        <span className="text-slate-200 font-bold">{suspect.factors.trajectory_speed_vector}%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">4. VESSEL DISCHARGE PROFILE:</span>
                        <span className="text-amber-400 font-bold">{suspect.factors.vessel_discharge_risk}%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">5. DARK RADAR CORROBORATION:</span>
                        <span className="text-cyan-400 font-bold">{suspect.factors.radar_corroboration}%</span>
                      </div>
                    </div>
                  )}

                  {/* Quick particulars row */}
                  <div className="mt-2.5 pt-2 border-t border-slate-800/80 grid grid-cols-2 gap-2 font-mono text-[10px] text-slate-400">
                    <div>
                      <span>DIST TO ORIGIN:</span>{' '}
                      <span className="text-slate-200 font-semibold">{formatDistance(suspect.distance_nm)}</span>
                    </div>
                    <div>
                      <span>AIS STATUS:</span>{' '}
                      <span className={suspect.ais_status === 'SILENT' ? 'text-rose-400' : 'text-slate-200'}>
                        {suspect.ais_status}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedSuspect(suspect);
                      setDrawerOpen(true);
                    }}
                    className="w-full mt-2.5 py-1.5 bg-slate-900 hover:bg-cyan-950/40 border border-slate-800 hover:border-cyan-500/40 text-slate-300 hover:text-ocean-cyan font-mono text-[10px] flex items-center justify-center gap-1.5 transition-all rounded"
                  >
                    <span>OPEN EVIDENCE DOSSIER</span>
                    <ChevronRight size={12} />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── Slide-Over Suspect Action Drawer ─────────────────────────── */}
      {drawerOpen && selectedSuspect && (
        <div className="fixed inset-y-0 right-0 z-[2500] w-[460px] bg-[#0d1524] border-l border-slate-700 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
          {/* Drawer Header */}
          <div className="p-5 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between">
            <div>
              <span className="font-mono text-[10px] text-ocean-cyan uppercase tracking-widest">
                SUSPECT MARITIME DOSSIER
              </span>
              <h3 className="font-sans text-lg font-bold text-slate-100 mt-0.5">{selectedSuspect.name}</h3>
              <p className="font-mono text-xs text-slate-400">
                MMSI: {formatMMSI(selectedSuspect.mmsi)} • {formatIMO(selectedSuspect.imo)}
              </p>
            </div>
            <button
              onClick={() => setDrawerOpen(false)}
              className="p-1.5 border border-slate-800 text-slate-400 hover:text-slate-100 hover:border-slate-700 rounded"
            >
              <X size={16} />
            </button>
          </div>

          {/* Drawer Body Scroll */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* Guilt Score Highlight */}
            <div className="p-4 bg-slate-950 border border-slate-800 rounded">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-xs text-slate-400 uppercase">Composite Attribution Index</span>
                <span className="font-mono text-xl font-bold text-rose-400">
                  {selectedSuspect.guilt_score.toFixed(1)}%
                </span>
              </div>
              <div className="h-2 w-full bg-slate-900 rounded-sm overflow-hidden mb-3">
                <div
                  className="h-full bg-rose-500"
                  style={{ width: `${selectedSuspect.guilt_score}%` }}
                />
              </div>
              <p className="font-mono text-xs text-slate-300 leading-relaxed">
                High-confidence spatial alignment to hydrodynamic hindcast release window. Vessel transponder went dark
                for <span className="text-rose-400 font-bold">{selectedSuspect.gap_duration_mins} minutes</span> while
                diverging course by 45° in restricted fairway.
              </p>
            </div>

            {/* Vessel Particulars */}
            <div>
              <span className="font-mono text-[10px] text-slate-400 tracking-widest uppercase font-semibold block mb-2">
                VESSEL REGISTRATION & SPECS
              </span>
              <div className="grid grid-cols-2 gap-2 bg-slate-950/60 p-3 border border-slate-800 rounded font-mono text-xs">
                <div>
                  <span className="text-slate-400 text-[10px] block">FLAG STATE</span>
                  <span className="text-slate-200">{selectedSuspect.flag}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">VESSEL TYPE</span>
                  <span className="text-slate-200">{selectedSuspect.type}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">DEADWEIGHT (DWT)</span>
                  <span className="text-slate-200">{selectedSuspect.dwt?.toLocaleString() ?? 308500} MT</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">LENGTH / DRAFT</span>
                  <span className="text-slate-200">{selectedSuspect.length_m ?? 333}m / {selectedSuspect.draft_m ?? 21.4}m</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">OWNER / OPERATOR</span>
                  <span className="text-slate-200 truncate block">{selectedSuspect.owner_operator || 'Ocean Carriers Ltd.'}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">P&I CLUB (INSURER)</span>
                  <span className="text-slate-200 truncate block">{selectedSuspect.pi_club || 'The London P&I Club'}</span>
                </div>
              </div>
            </div>

            {/* Radar & Dark Vessel Corroboration */}
            <div>
              <span className="font-mono text-[10px] text-slate-400 tracking-widest uppercase font-semibold block mb-2">
                DARK VESSEL RADAR CORROBORATION
              </span>
              <div className="bg-slate-950/60 p-3 border border-slate-800 rounded space-y-2 font-mono text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">SAR TARGET MATCH:</span>
                  <span className={selectedSuspect.radar_sar_matched ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
                    {selectedSuspect.radar_sar_matched ? 'CONFIRMED (SENTINEL-1A)' : 'NO RADAR HIT'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">RADAR CROSS SECTION (RCS):</span>
                  <span className="text-slate-200 font-bold">
                    {selectedSuspect.radar_rcs_m2 ? `${selectedSuspect.radar_rcs_m2.toLocaleString()} m²` : '34,200 m²'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">LAST TELEMETRY:</span>
                  <span className="text-slate-200">{formatSpeed(selectedSuspect.sog)} • {formatCourse(selectedSuspect.cog)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">LAST KNOWN COORDS:</span>
                  <span className="text-cyan-300">{formatCoordinates(selectedSuspect.last_lat, selectedSuspect.last_lng)}</span>
                </div>
              </div>
            </div>

            {/* Suspect Track Points Log */}
            {selectedSuspect.track_points && selectedSuspect.track_points.length > 0 && (
              <div>
                <span className="font-mono text-[10px] text-slate-400 tracking-widest uppercase font-semibold block mb-2">
                  HISTORICAL WAYPOINT TELEMETRY
                </span>
                <div className="bg-slate-950 border border-slate-800 rounded overflow-hidden">
                  <table className="w-full text-left font-mono text-[10px]">
                    <thead className="bg-slate-900 border-b border-slate-800 text-slate-400">
                      <tr>
                        <th className="p-2">TIME (UTC)</th>
                        <th className="p-2">COORDINATES</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-300">
                      {selectedSuspect.track_points.map((pt, i) => (
                        <tr key={i} className="hover:bg-slate-900/40">
                          <td className="p-2 text-cyan-400">{pt[2].slice(11, 19)}Z</td>
                          <td className="p-2">{formatCoordinates(pt[0], pt[1])}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Drawer Action Bar */}
          <div className="p-4 border-t border-slate-800 bg-slate-900/90 space-y-2">
            <button
              onClick={generatePDF}
              className="w-full py-2.5 bg-cyan-950/60 hover:bg-cyan-950 border border-cyan-500/50 text-ocean-cyan font-mono text-xs font-semibold flex items-center justify-center gap-2 transition-all rounded shadow-[0_0_12px_rgba(0,240,255,0.15)]"
            >
              <Download size={14} />
              <span>EXPORT EVIDENCE DOSSIER PDF</span>
            </button>
            <button
              onClick={() => {
                alert(`Coast Guard Interception Task Force alerted for MMSI ${selectedSuspect.mmsi} (${selectedSuspect.name}). Interception vector computed.`);
              }}
              className="w-full py-2 bg-rose-950/30 hover:bg-rose-950/60 border border-rose-500/40 text-rose-400 font-mono text-xs font-semibold flex items-center justify-center gap-2 transition-all rounded"
            >
              <ShieldAlert size={14} />
              <span>DISPATCH PATROL INTERCEPTION</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
