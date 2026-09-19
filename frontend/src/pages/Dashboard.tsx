import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Polygon, CircleMarker, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import { Droplets, Search, Ship, AlertTriangle, TrendingUp, Clock, ArrowRight, Loader2 } from 'lucide-react';
import { fetchSpills, fetchVessels, fetchAlerts, type OilSpill, type Vessel, type Alert } from '@/lib/db';
import { getTileLayer } from '@/components/map/MapLayers';

const criticalSpillColor = '#FF2A5F';
const standardSpillColor = '#00F0FF';

function KpiCard({
  icon: Icon, label, value, sub, accent, code,
}: {
  icon: React.ElementType; label: string; value: string | number; sub: string; accent: string; code: string;
}) {
  return (
    <div className="tactical-corners p-4 flex flex-col gap-3 hover:border-ocean-cyan/40 transition-colors duration-200">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <Icon size={16} strokeWidth={1.5} style={{ color: accent }} />
          <span className="font-mono text-[10px] text-ocean-text-muted tracking-widest">{label}</span>
        </div>
        <span className="font-mono text-[9px] text-ocean-text-muted">{code}</span>
      </div>
      <div>
        <p className="font-mono text-3xl font-medium text-ocean-text tabular-nums">{value}</p>
        <p className="font-mono text-[10px] text-ocean-text-dim mt-1">{sub}</p>
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
      setTimeout(() => mapRef.current?.invalidateSize(), 100);
    }
  }, [loading]);

  const tileLayer = getTileLayer('dark');

  const activeSpills = spills.filter((s) => s.status === 'ACTIVE' || s.status === 'MONITORING').length;
  const criticalAlerts = alerts.filter((a) => a.severity === 'CRITICAL').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 size={24} className="animate-spin text-ocean-cyan" />
        <span className="font-mono text-sm text-ocean-text-dim ml-3">LOADING SURVEILLANCE DATA...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="tactical-corners p-6 max-w-md">
          <p className="font-mono text-sm text-ocean-red mb-2">[ DATA LINK ERROR ]</p>
          <p className="font-sans text-sm text-ocean-text-dim">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header Row */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-sans text-xl font-semibold text-ocean-text tracking-wide">Operational Overview</h2>
          <p className="font-mono text-[11px] text-ocean-text-muted mt-1">
            [ REAL-TIME MARITIME SURVEILLANCE GRID ] — GULF REGION — SECTOR 1-9
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="status-badge text-ocean-green border-ocean-green/40 bg-ocean-green/5">
            <span className="w-1.5 h-1.5 bg-ocean-green rounded-full blink" />
            LIVE FEED
          </div>
          <div className="status-badge text-ocean-cyan border-ocean-cyan/40 bg-ocean-cyan/5">
            {vessels.length.toLocaleString()} VESSELS
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={Droplets} label="TOTAL SPILLS" value={spills.length} sub={`${activeSpills} ACTIVE / ${spills.length - activeSpills} MONITORED`} accent={criticalSpillColor} code="SP-01" />
        <KpiCard icon={Search} label="ACTIVE INVESTIGATIONS" value={activeSpills} sub={`${alerts.filter(a => a.type === 'VESSEL_FLAGGED').length} SUSPECTS FLAGGED`} accent="#0EA5E9" code="INV-02" />
        <KpiCard icon={Ship} label="VESSELS TRACKED" value={vessels.length.toLocaleString()} sub={`${vessels.length} AIS POSITIONS`} accent="#00F0FF" code="VES-03" />
        <KpiCard icon={AlertTriangle} label="CRITICAL ALERTS" value={criticalAlerts} sub="REQUIRES IMMEDIATE ACTION" accent={criticalSpillColor} code="ALT-04" />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Mini Tactical Map */}
        <div className="lg:col-span-2 tactical-corners p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] text-ocean-text-muted tracking-widest">TACTICAL MAP</span>
              <span className="font-mono text-[10px] text-ocean-cyan">[ GULF REGION ]</span>
            </div>
            <button
              onClick={() => navigate('/map')}
              className="flex items-center gap-1 font-mono text-[10px] text-ocean-cyan hover:text-ocean-text tracking-wider"
            >
              EXPAND <ArrowRight size={10} strokeWidth={2} />
            </button>
          </div>
          <div className="h-80 border border-ocean-border relative">
            <MapContainer
              center={[20.5937, 78.9629]}
              zoom={5}
              className="w-full h-full"
              ref={(m) => { if (m) mapRef.current = m; }}
              zoomControl={false}
            >
              <TileLayer url={tileLayer.url} attribution={tileLayer.attribution} maxZoom={tileLayer.maxZoom} maxNativeZoom={tileLayer.maxNativeZoom} className={tileLayer.className} />

              {/* Plot spills */}
              {spills.map((spill) => {
                const color = spill.severity === 'CRITICAL' ? criticalSpillColor : standardSpillColor;
                return (
                  <Polygon
                    key={spill.id}
                    positions={spill.polygon}
                    pathOptions={{ color, fillColor: color, fillOpacity: 0.15, weight: 1 }}
                  >
                    <Tooltip>
                      <div className="font-mono text-[10px]">
                        <div className="text-ocean-cyan font-bold">{spill.spill_id}</div>
                        <div>{spill.name}</div>
                        <div>{spill.area_km2} km² — {spill.severity}</div>
                      </div>
                    </Tooltip>
                  </Polygon>
                );
              })}

              {/* Plot some vessels */}
              {vessels.slice(0, 15).map((v) => (
                <CircleMarker
                  key={v.id}
                  center={[v.lat, v.lng]}
                  radius={3}
                  pathOptions={{
                    color: v.risk === 'CRITICAL' ? criticalSpillColor : '#00F0FF',
                    fillColor: v.risk === 'CRITICAL' ? criticalSpillColor : '#00F0FF',
                    fillOpacity: 1,
                    weight: 1,
                  }}
                >
                  <Tooltip>
                    <div className="font-mono text-[10px]">
                      <div className="text-ocean-cyan font-bold">{v.mmsi}</div>
                      <div>{v.name}</div>
                      <div>{v.type}</div>
                    </div>
                  </Tooltip>
                </CircleMarker>
              ))}
            </MapContainer>
          </div>
          {/* Legend */}
          <div className="flex items-center gap-4 mt-3">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 bg-ocean-red rounded-full" />
              <span className="font-mono text-[9px] text-ocean-text-dim">CRITICAL SPILL</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 bg-ocean-cyan rounded-full" />
              <span className="font-mono text-[9px] text-ocean-text-dim">STANDARD SPILL</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-ocean-cyan rounded-full" />
              <span className="font-mono text-[9px] text-ocean-text-dim">VESSEL</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-ocean-red rounded-full" />
              <span className="font-mono text-[9px] text-ocean-text-dim">SUSPECT VESSEL</span>
            </div>
          </div>
        </div>

        {/* Alert Feed */}
        <div className="tactical-corners p-4 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <span className="font-mono text-[10px] text-ocean-text-muted tracking-widest">LIVE ALERT FEED</span>
            <span className="font-mono text-[10px] text-ocean-red pulse-red">[ {alerts.length} NEW ]</span>
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto max-h-80">
            {alerts.slice(0, 7).map((alert) => {
              const sevColor =
                alert.severity === 'CRITICAL' ? 'text-ocean-red border-ocean-red/40' :
                alert.severity === 'HIGH' ? 'text-ocean-amber border-ocean-amber/40' :
                alert.severity === 'MODERATE' ? 'text-ocean-sky border-ocean-sky/40' :
                'text-ocean-text-muted border-ocean-border';
              return (
                <div
                  key={alert.id}
                  className="border border-ocean-border p-3 hover:border-ocean-cyan/30 transition-colors duration-150 cursor-pointer"
                  onClick={() => alert.spill_id && navigate('/investigations')}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className={`status-badge ${sevColor}`}>{alert.severity}</span>
                    <span className="font-mono text-[9px] text-ocean-text-muted">
                      {alert.timestamp.slice(11, 19)}Z
                    </span>
                  </div>
                  <p className="font-sans text-xs text-ocean-text font-medium leading-snug">{alert.title}</p>
                  <p className="font-sans text-[11px] text-ocean-text-dim mt-0.5 leading-snug line-clamp-2">{alert.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="tactical-corners p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={14} strokeWidth={1.5} className="text-ocean-cyan" />
            <span className="font-mono text-[10px] text-ocean-text-muted tracking-widest">RESOLUTION RATE</span>
          </div>
          <p className="font-mono text-2xl text-ocean-text">87.3<span className="text-ocean-text-dim text-base">%</span></p>
          <p className="font-mono text-[10px] text-ocean-green mt-1">↑ 2.1% FROM LAST WEEK</p>
        </div>
        <div className="tactical-corners p-4">
          <div className="flex items-center gap-2 mb-3">
            <Clock size={14} strokeWidth={1.5} className="text-ocean-cyan" />
            <span className="font-mono text-[10px] text-ocean-text-muted tracking-widest">AVG RESPONSE TIME</span>
          </div>
          <p className="font-mono text-2xl text-ocean-text">4h 12m</p>
          <p className="font-mono text-[10px] text-ocean-amber mt-1">↓ 18m FROM LAST WEEK</p>
        </div>
        <div className="tactical-corners p-4">
          <div className="flex items-center gap-2 mb-3">
            <Droplets size={14} strokeWidth={1.5} className="text-ocean-cyan" />
            <span className="font-mono text-[10px] text-ocean-text-muted tracking-widest">TOTAL AREA MONITORED</span>
          </div>
          <p className="font-mono text-2xl text-ocean-text">2.4M<span className="text-ocean-text-dim text-base"> km²</span></p>
          <p className="font-mono text-[10px] text-ocean-text-dim mt-1">9 SECTORS / 4 REGIONS</p>
        </div>
      </div>
    </div>
  );
}
