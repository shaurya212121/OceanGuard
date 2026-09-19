import { useState, useEffect, useRef } from 'react';
import { Bell, Satellite, AlertTriangle, Info, ChevronDown } from 'lucide-react';
import { fetchAlerts, type Alert } from '@/lib/db';

const pageNames: Record<string, string> = {
  '/': 'Dashboard',
  '/map': 'Live Tactical Map',
  '/investigations': 'Investigations Desk',
  '/vessels': 'Vessels Registry',
  '/analytics': 'Analytics & Reports',
  '/detect': 'Live Detection Demo',
};

function useCurrentPath() {
  const [path, setPath] = useState(window.location.pathname);
  useEffect(() => {
    const handler = () => setPath(window.location.pathname);
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, []);
  return path;
}

export default function TopBar() {
  const path = useCurrentPath();
  const [now, setNow] = useState(new Date());
  const [notifOpen, setNotifOpen] = useState(false);
  const [alerts, setAlerts] = useState<Alert[]>([]);
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

  const utcTime = now.toISOString().replace('T', ' ').slice(0, 19) + ' UTC';

  const criticalCount = alerts.filter((a) => a.severity === 'CRITICAL' || a.severity === 'HIGH').length;

  const severityColor = (sev: string) => {
    switch (sev) {
      case 'CRITICAL': return 'text-ocean-red border-ocean-red/40';
      case 'HIGH': return 'text-ocean-amber border-ocean-amber/40';
      case 'MODERATE': return 'text-ocean-sky border-ocean-sky/40';
      default: return 'text-ocean-text-muted border-ocean-border';
    }
  };

  const alertIcon = (type: string) => {
    if (type === 'SPILL_DETECTED' || type === 'VESSEL_FLAGGED') return AlertTriangle;
    if (type === 'SAT_LINK') return Satellite;
    return Info;
  };

  return (
    <header className="h-14 shrink-0 bg-ocean-panel border-b border-ocean-border flex items-center px-6 gap-6">
      {/* Page Name */}
      <div className="flex items-center gap-3">
        <div className="w-1 h-5 bg-ocean-cyan" />
        <h2 className="font-sans font-semibold text-base text-ocean-text tracking-wide">
          {pageNames[path] || 'OceanGuard AI'}
        </h2>
      </div>

      <div className="flex-1" />

      {/* UTC Clock */}
      <div className="flex items-center gap-2">
        <span className="font-mono text-[10px] text-ocean-text-muted tracking-wider">UTC</span>
        <span className="font-mono text-sm text-ocean-cyan tracking-wider tabular-nums">{utcTime}</span>
      </div>

      {/* SAT-LINK Status */}
      <div className="status-badge text-ocean-green border-ocean-green/40 bg-ocean-green/5">
        <Satellite size={10} strokeWidth={2} />
        SAT-LINK ACTIVE
      </div>

      {/* Notifications */}
      <div className="relative" ref={notifRef}>
        <button
          onClick={() => setNotifOpen(!notifOpen)}
          className="relative p-2 border border-ocean-border text-ocean-text-dim hover:text-ocean-text hover:border-ocean-cyan/40 transition-all duration-150"
        >
          <Bell size={16} strokeWidth={1.5} />
          {criticalCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-ocean-red text-[9px] font-mono font-bold flex items-center justify-center text-white">
              {criticalCount}
            </span>
          )}
        </button>

        {notifOpen && (
          <div className="absolute right-0 top-full mt-2 w-96 bg-ocean-panel border border-ocean-border z-50">
            <div className="px-4 py-3 border-b border-ocean-border flex items-center justify-between">
              <span className="font-sans text-sm font-semibold text-ocean-text">Alert Feed</span>
              <span className="font-mono text-[10px] text-ocean-text-muted">{alerts.length} TOTAL</span>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {alerts.slice(0, 8).map((alert) => {
                const Icon = alertIcon(alert.type);
                return (
                  <div
                    key={alert.id}
                    className="px-4 py-3 border-b border-ocean-border/50 hover:border-ocean-cyan/30 transition-colors duration-150"
                  >
                    <div className="flex items-start gap-3">
                      <Icon size={14} strokeWidth={1.5} className={`mt-0.5 ${alert.severity === 'CRITICAL' ? 'text-ocean-red' : 'text-ocean-text-dim'}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`status-badge ${severityColor(alert.severity)}`}>
                            {alert.severity}
                          </span>
                          <span className="font-mono text-[9px] text-ocean-text-muted">
                            {alert.timestamp.slice(11, 19)}
                          </span>
                        </div>
                        <p className="font-sans text-xs text-ocean-text font-medium leading-snug">{alert.title}</p>
                        <p className="font-sans text-[11px] text-ocean-text-dim mt-0.5 leading-snug">{alert.description}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="px-4 py-2 border-t border-ocean-border">
              <button className="font-mono text-[10px] text-ocean-cyan hover:text-ocean-text tracking-wider">
                VIEW ALL ALERTS →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* User */}
      <div className="flex items-center gap-2 pl-4 border-l border-ocean-border">
        <div className="w-8 h-8 border border-ocean-border flex items-center justify-center">
          <span className="font-mono text-[10px] text-ocean-cyan font-bold">CMD</span>
        </div>
        <div className="hidden lg:block">
          <p className="font-sans text-xs text-ocean-text font-medium leading-none">Cmd. Officer</p>
          <p className="font-mono text-[9px] text-ocean-text-muted mt-1">CLEARANCE: L4</p>
        </div>
        <ChevronDown size={14} strokeWidth={1.5} className="text-ocean-text-muted" />
      </div>
    </header>
  );
}
