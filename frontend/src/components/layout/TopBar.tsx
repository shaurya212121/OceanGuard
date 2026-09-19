import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Bell, Satellite, AlertTriangle, Info, ChevronDown, Radio, Volume2, VolumeX, ShieldAlert } from 'lucide-react';
import { fetchAlerts, type Alert } from '@/lib/db';
import { formatTimestampUTC } from '@/utils/formatters';

const pageNames: Record<string, string> = {
  '/': 'Operational Overview',
  '/map': 'Live Tactical Map & Drift Simulation',
  '/investigations': 'Suspect Vessel Attribution & Evidence Matrix',
  '/vessels': 'Vessels Registry & AIS Intelligence',
  '/analytics': 'Analytics & Executive Summary',
  '/detect': 'Sentinel-1 Live Detection Demo',
};

export default function TopBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [now, setNow] = useState(new Date());
  const [notifOpen, setNotifOpen] = useState(false);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchAlerts();
        setAlerts(data);
      } catch (err) {
        console.error('Failed to load alerts:', err);
      }
    })();
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const criticalCount = alerts.filter((a) => a.severity === 'CRITICAL' || a.severity === 'HIGH').length;

  const severityBadge = (sev: string) => {
    switch (sev) {
      case 'CRITICAL': return 'text-ocean-red border-ocean-red/50 bg-ocean-red/10';
      case 'HIGH': return 'text-ocean-amber border-ocean-amber/50 bg-ocean-amber/10';
      case 'MODERATE': return 'text-ocean-sky border-ocean-sky/50 bg-ocean-sky/10';
      default: return 'text-ocean-text-muted border-ocean-border bg-ocean-panel';
    }
  };

  const alertIcon = (type: string) => {
    if (type === 'SPILL_DETECTED' || type === 'DARK_VESSEL') return AlertTriangle;
    if (type === 'VESSEL_FLAGGED') return ShieldAlert;
    if (type === 'SAT_LINK') return Satellite;
    return Info;
  };

  const currentTitle = pageNames[location.pathname] || 
    (location.pathname.startsWith('/investigations') ? 'Suspect Vessel Attribution & Evidence Matrix' : 'OceanGuard AI Tactical Command');

  return (
    <header className="h-14 shrink-0 bg-[#0d1524] border-b border-slate-800 flex items-center px-6 gap-6 select-none z-30">
      {/* Tactical Header / Breadcrumb */}
      <div className="flex items-center gap-3">
        <div className="w-1.5 h-5 bg-ocean-cyan rounded-none shadow-[0_0_8px_rgba(0,240,255,0.8)]" />
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[9px] text-ocean-cyan tracking-widest uppercase">TACTICAL COMMAND</span>
            <span className="text-slate-600 font-mono text-[9px]">•</span>
            <span className="font-mono text-[9px] text-slate-400">SECTOR 7A / GULF OF OMAN</span>
          </div>
          <h2 className="font-sans font-semibold text-sm text-slate-100 tracking-wide leading-none mt-0.5">
            {currentTitle}
          </h2>
        </div>
      </div>

      <div className="flex-1" />

      {/* UTC Defense Clock */}
      <div className="flex items-center gap-2.5 px-3 py-1 bg-slate-900/60 border border-slate-800 rounded">
        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 blink" />
        <span className="font-mono text-[10px] text-slate-400 tracking-wider">ZULU / UTC</span>
        <span className="font-mono text-xs text-ocean-cyan font-medium tracking-widest tabular-nums">
          {formatTimestampUTC(now)}
        </span>
      </div>

      {/* SAT-LINK Status Indicator */}
      <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-emerald-950/30 border border-emerald-500/40 rounded text-emerald-400 text-[10px] font-mono tracking-wider">
        <Radio size={12} className="text-emerald-400 animate-pulse" />
        <span>SENTINEL-1A PASS ACTIVE</span>
        <span className="text-emerald-600">|</span>
        <span className="text-slate-400 text-[9px]">GS-CYPRUS 128 kbps</span>
      </div>

      {/* Notifications Drawer Toggle */}
      <div className="relative" ref={notifRef}>
        <button
          onClick={() => setNotifOpen(!notifOpen)}
          className={`relative p-2 border rounded transition-all duration-150 ${
            notifOpen
              ? 'border-ocean-cyan bg-cyan-950/30 text-ocean-cyan'
              : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700 hover:text-slate-100'
          }`}
          title="Tactical Alert Feed"
        >
          <Bell size={16} strokeWidth={1.7} />
          {criticalCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-ocean-red text-[9px] font-mono font-bold flex items-center justify-center text-white rounded-full pulse-red">
              {criticalCount}
            </span>
          )}
        </button>

        {notifOpen && (
          <div className="absolute right-0 top-full mt-2 w-[420px] bg-[#0d1524] border border-slate-700 shadow-2xl z-50 rounded overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle size={14} className="text-ocean-amber" />
                <span className="font-sans text-xs font-semibold text-slate-200 uppercase tracking-wider">Tactical Alert Stream</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setAudioEnabled(!audioEnabled)}
                  className="text-slate-400 hover:text-slate-200 p-1"
                  title={audioEnabled ? 'Mute Alert Chime' : 'Enable Alert Chime'}
                >
                  {audioEnabled ? <Volume2 size={13} /> : <VolumeX size={13} />}
                </button>
                <span className="font-mono text-[9px] px-1.5 py-0.5 bg-slate-800 text-slate-300 rounded">
                  {alerts.length} ALERTS
                </span>
              </div>
            </div>

            <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-800/60">
              {alerts.map((alert) => {
                const Icon = alertIcon(alert.type);
                return (
                  <div
                    key={alert.id}
                    onClick={() => {
                      setNotifOpen(false);
                      if (alert.spill_id) {
                        navigate(`/investigations/${alert.spill_id}`);
                      } else {
                        navigate('/investigations');
                      }
                    }}
                    className="p-3 hover:bg-slate-800/40 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-start gap-2.5">
                      <Icon
                        size={15}
                        className={`mt-0.5 shrink-0 ${
                          alert.severity === 'CRITICAL' ? 'text-ocean-red' :
                          alert.severity === 'HIGH' ? 'text-ocean-amber' :
                          'text-ocean-cyan'
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className={`status-badge text-[9px] ${severityBadge(alert.severity)}`}>
                            {alert.severity}
                          </span>
                          <span className="font-mono text-[9px] text-slate-400">
                            {alert.timestamp.slice(11, 19)} UTC
                          </span>
                        </div>
                        <p className="font-sans text-xs text-slate-200 font-medium group-hover:text-ocean-cyan transition-colors">
                          {alert.title}
                        </p>
                        <p className="font-sans text-[11px] text-slate-400 mt-0.5 leading-snug line-clamp-2">
                          {alert.description}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="px-4 py-2 bg-slate-900/60 border-t border-slate-800 flex items-center justify-between">
              <button
                onClick={() => { setNotifOpen(false); navigate('/investigations'); }}
                className="font-mono text-[10px] text-ocean-cyan hover:underline tracking-wider"
              >
                OPEN INVESTIGATION DESK →
              </button>
              <span className="font-mono text-[9px] text-slate-500">ENFORCEMENT COGNIZANT</span>
            </div>
          </div>
        )}
      </div>

      {/* Operator Clearance Profile */}
      <div className="flex items-center gap-2.5 pl-4 border-l border-slate-800">
        <div className="w-8 h-8 rounded bg-cyan-950/40 border border-cyan-500/30 flex items-center justify-center text-ocean-cyan">
          <span className="font-mono text-[11px] font-bold">VR</span>
        </div>
        <div className="hidden xl:block">
          <div className="flex items-center gap-1.5">
            <p className="font-sans text-xs text-slate-200 font-semibold leading-none">Lt. Cdr. V. Raman</p>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          </div>
          <p className="font-mono text-[9px] text-slate-400 mt-1">WATCH OFFICER • CLEARANCE L4</p>
        </div>
        <ChevronDown size={13} className="text-slate-500 hidden xl:block" />
      </div>
    </header>
  );
}
