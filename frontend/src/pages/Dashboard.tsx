import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Polygon, CircleMarker, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import { Droplets, Search, Ship, AlertTriangle, TrendingUp, Clock, ArrowRight, Loader2, ShieldCheck, Radio } from 'lucide-react';
import { fetchSpills, fetchVessels, fetchAlerts, type OilSpill, type Vessel, type Alert } from '@/lib/db';
import { getTileLayer } from '@/components/map/MapLayers';
import {
  formatCoordinates,
  formatArea,
  formatDistance,
  formatSpeed,
  formatCourse,
  formatVolume,
} from '@/utils/formatters';

const criticalSpillColor = '#f43f5e';
const standardSpillColor = '#00f0ff';

function KpiCard({
  icon: Icon, label, value, sub, accent, code,
}: {
  icon: React.ElementType; label: string; value: string | number; sub: string; accent: string; code: string;
}) {
  return (
    <div className="tactical-corners p-4 flex flex-col gap-3 hover:border-cyan-500/40 transition-colors duration-200 bg-[#0d1524]">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <Icon size={16} strokeWidth={1.8} style={{ color: accent }} />
          <span className="font-mono text-[10px] text-slate-400 font-semibold tracking-widest uppercase">{label}</span>
        </div>
        <span className="font-mono text-[9px] text-slate-500">{code}</span>
      </div>
      <div>
        <p className="font-mono text-3xl font-bold text-slate-100 tabular-nums tracking-tight">{value}</p>
        <p className="font-mono text-[10px] text-slate-400 mt-1">{sub}</p>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const mapRef = useRef<L.Map | null>(null);
  const [spills, setSpills] = useState<OilSpill[]>([]);
  const [vessels, setVessels] = useState<Vessel[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [spillData, vesselData, alertData] = await Promise.all([
          fetchSpills(),
          fetchVessels(),
          fetchAlerts(),
        ]);
        setSpills(spillData);
        setVessels(vesselData);
        setAlerts(alertData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
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

  const tileLayer = getTileLayer('bathymetry');

  const activeSpills = spills.filter((s) => s.status === 'ACTIVE' || s.status === 'MONITORING').length;
  const criticalAlerts = alerts.filter((a) => a.severity === 'CRITICAL').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-[#0a0f18]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={32} className="animate-spin text-ocean-cyan" />
          <span className="font-mono text-xs tracking-widest text-slate-400 uppercase">
            CONNECTING TO TACTICAL SURVEILLANCE GRID...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-[#0a0f18] min-h-full select-none text-slate-100">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="font-sans text-xl font-bold text-slate-100 tracking-wide">
              Maritime Defense Operations Overview
            </h2>
            <span className="font-mono text-[10px] px-2 py-0.5 bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 rounded">
              DEFCON 3 NOMINAL
            </span>
          </div>
          <p className="font-mono text-xs text-slate-400">
            [ REAL-TIME MARITIME SURVEILLANCE GRID ] • GULF REGION • SECTORS 1-9
          </p>
        </div>

        <div className="flex items-center gap-3 font-mono text-xs">
          <div className="status-badge text-emerald-400 border-emerald-500/40 bg-emerald-950/20">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full blink" />
            RADAR TELEMETRY LIVE
          </div>
          <div className="status-badge text-ocean-cyan border-cyan-500/40 bg-cyan-950/20">
            {vessels.length.toLocaleString()} AIS TARGETS
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={Droplets}
          label="CONFIRMED SLICKS"
          value={spills.length}
          sub={`${activeSpills} ACTIVE / ${spills.length - activeSpills} MONITORED`}
          accent={criticalSpillColor}
          code="SP-01"
        />
        <KpiCard
          icon={Search}
          label="ACTIVE ATTRIBUTIONS"
          value={activeSpills}
          sub={`${alerts.filter((a) => a.type === 'VESSEL_FLAGGED').length} SUSPECTS FLAGGED`}
          accent="#00f0ff"
          code="INV-02"
        />
        <KpiCard
          icon={Ship}
          label="TRACKED AIS TARGETS"
          value={vessels.length.toLocaleString()}
          sub={`${vessels.filter((v) => v.in_spill_aoi).length} WITHIN SPILL AOI`}
          accent="#38bdf8"
          code="VES-03"
        />
        <KpiCard
          icon={AlertTriangle}
          label="CRITICAL ALERTS"
          value={criticalAlerts}
          sub="REQUIRES IMMEDIATE ENFORCEMENT"
          accent={criticalSpillColor}
          code="ALT-04"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Tactical Overview Mini Map */}
        <div className="lg:col-span-2 tactical-corners p-4 bg-[#0d1524] space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-semibold text-slate-200 uppercase tracking-wider">
                TACTICAL SITUATION GRID
              </span>
              <span className="font-mono text-[10px] text-ocean-cyan">[ SECTOR 7A / GULF OF OMAN ]</span>
            </div>
            <button
              onClick={() => navigate('/map')}
              className="flex items-center gap-1.5 font-mono text-xs text-ocean-cyan hover:underline tracking-wider"
            >
              <span>EXPAND FULL TACTICAL MAP</span>
              <ArrowRight size={13} strokeWidth={2} />
            </button>
          </div>

          <div className="h-80 border border-slate-800 relative rounded overflow-hidden">
            <MapContainer
              center={[15.5, 76.0]}
              zoom={5}
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

              {/* Spills Polygons */}
              {spills.map((spill) => {
                const color = spill.severity === 'CRITICAL' ? criticalSpillColor : standardSpillColor;
                return (
                  <Polygon
                    key={spill.id}
                    positions={spill.polygon}
                    pathOptions={{ color, fillColor: color, fillOpacity: 0.25, weight: 1.5 }}
                  >
                    <Tooltip>
                      <div className="font-mono text-[10px]">
                        <div className="text-ocean-cyan font-bold">{spill.spill_id}</div>
                        <div className="text-slate-100">{spill.name}</div>
                        <div className="text-slate-300">
                          {formatArea(spill.area_km2)} • {spill.severity}
                        </div>
                      </div>
                    </Tooltip>
                  </Polygon>
                );
              })}

              {/* Vessels Markers */}
              {vessels.slice(0, 20).map((v) => (
                <CircleMarker
                  key={v.id}
                  center={[v.lat, v.lng]}
                  radius={v.risk === 'CRITICAL' ? 5 : 3.5}
                  pathOptions={{
                    color: v.risk === 'CRITICAL' ? criticalSpillColor : '#00f0ff',
                    fillColor: v.risk === 'CRITICAL' ? criticalSpillColor : '#00f0ff',
                    fillOpacity: 1,
                    weight: 1,
                  }}
                >
                  <Tooltip>
                    <div className="font-mono text-[10px]">
                      <div className="text-ocean-cyan font-bold">{v.name}</div>
                      <div className="text-slate-300">MMSI: {v.mmsi}</div>
                      <div className="text-slate-300">
                        {formatSpeed(v.sog)} • {formatCourse(v.cog)}
                      </div>
                      <div className="text-slate-400">RISK: {v.risk}</div>
                    </div>
                  </Tooltip>
                </CircleMarker>
              ))}
            </MapContainer>
          </div>

          {/* Map Legend */}
          <div className="flex items-center gap-5 pt-1 font-mono text-[10px] text-slate-400">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-rose-500 rounded-sm" />
              <span>CRITICAL OIL SLICK</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-cyan-400 rounded-sm" />
              <span>MONITORED SLICK</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 bg-rose-500 rounded-full" />
              <span>HIGH-RISK SUSPECT</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 bg-cyan-400 rounded-full" />
              <span>AIS VESSEL TARGET</span>
            </div>
          </div>
        </div>

        {/* Live Alert Feed Stream */}
        <div className="tactical-corners p-4 bg-[#0d1524] flex flex-col space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <span className="font-mono text-xs font-semibold text-slate-200 uppercase tracking-wider">
              REAL-TIME ALERT STREAM
            </span>
            <span className="font-mono text-[10px] text-rose-400 pulse-red font-bold">
              [ {alerts.length} NOTIFICATIONS ]
            </span>
          </div>

          <div className="flex-1 space-y-2 overflow-y-auto max-h-80 divide-y divide-slate-800/40">
            {alerts.slice(0, 6).map((alert) => {
              const sevColor =
                alert.severity === 'CRITICAL' ? 'text-rose-400 border-rose-500/40 bg-rose-950/20' :
                alert.severity === 'HIGH' ? 'text-amber-400 border-amber-500/40 bg-amber-950/20' :
                alert.severity === 'MODERATE' ? 'text-sky-400 border-sky-500/40 bg-sky-950/20' :
                'text-slate-400 border-slate-800 bg-slate-900';

              return (
                <div
                  key={alert.id}
                  onClick={() => {
                    if (alert.spill_id) navigate(`/investigations/${alert.spill_id}`);
                    else navigate('/investigations');
                  }}
                  className="pt-2 hover:bg-slate-800/30 p-2 rounded transition-colors cursor-pointer group"
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className={`status-badge text-[9px] ${sevColor}`}>
                      {alert.severity}
                    </span>
                    <span className="font-mono text-[9px] text-slate-500">
                      {alert.timestamp.slice(11, 19)} UTC
                    </span>
                  </div>
                  <p className="font-sans text-xs font-semibold text-slate-200 group-hover:text-ocean-cyan transition-colors">
                    {alert.title}
                  </p>
                  <p className="font-sans text-[11px] text-slate-400 mt-0.5 leading-snug line-clamp-2">
                    {alert.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Operations Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono">
        <div className="tactical-corners p-4 bg-[#0d1524]">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={14} className="text-ocean-cyan" />
            <span className="text-[10px] text-slate-400 tracking-widest uppercase">
              ATTRIBUTION ACCURACY
            </span>
          </div>
          <p className="text-2xl font-bold text-slate-100">
            96.8<span className="text-sm font-normal text-slate-400">%</span>
          </p>
          <p className="text-[10px] text-emerald-400 mt-1">↑ 2.1% MODEL RETRAINING CONVERGENCE</p>
        </div>

        <div className="tactical-corners p-4 bg-[#0d1524]">
          <div className="flex items-center gap-2 mb-2">
            <Clock size={14} className="text-ocean-cyan" />
            <span className="text-[10px] text-slate-400 tracking-widest uppercase">
              AVG RESPONSE LATENCY
            </span>
          </div>
          <p className="text-2xl font-bold text-slate-100">2.4h</p>
          <p className="text-[10px] text-amber-400 mt-1">HINDCAST ORIGIN INTERPOLATED IN 18m</p>
        </div>

        <div className="tactical-corners p-4 bg-[#0d1524]">
          <div className="flex items-center gap-2 mb-2">
            <Droplets size={14} className="text-ocean-cyan" />
            <span className="text-[10px] text-slate-400 tracking-widest uppercase">
              TOTAL AREA MONITORED
            </span>
          </div>
          <p className="text-2xl font-bold text-slate-100">
            2.4M<span className="text-sm font-normal text-slate-400"> km²</span>
          </p>
          <p className="text-[10px] text-cyan-400 mt-1">9 SECTORS • UNCLOS EXCLUSIVE ECONOMIC ZONE</p>
        </div>
      </div>
    </div>
  );
}
