import metrics from '@/data/metrics.json';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Radar, Search, Ship, BarChart3, ShieldCheck, Upload, Activity, ShieldAlert } from 'lucide-react';

const navItems = [
  { to: '/', label: 'Operational Overview', icon: LayoutDashboard, code: 'OPS' },
  { to: '/map', label: 'Tactical Map & Drift', icon: Radar, code: 'MAP' },
  { to: '/investigations', label: 'Attribution Desk', icon: Search, code: 'INV' },
  { to: '/vessels', label: 'Vessels Registry', icon: Ship, code: 'AIS' },
  { to: '/analytics', label: 'Analytics & Trends', icon: BarChart3, code: 'ANL' },
  { to: '/detect', label: 'SAR AI Detection', icon: Upload, code: 'DET' },
];

export default function Sidebar() {
  return (
    <aside className="w-64 shrink-0 bg-[#0d1524] border-r border-slate-800 flex flex-col h-full select-none">
      {/* Tactical Branding */}
      <div className="px-5 py-4 border-b border-slate-800 bg-slate-900/40">
        <div className="flex items-center gap-3">
          <div className="relative p-2 rounded bg-cyan-950/40 border border-cyan-500/30">
            <ShieldCheck size={22} className="text-ocean-cyan" strokeWidth={1.8} />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-400 rounded-full blink" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="font-sans font-bold text-sm tracking-wider text-slate-100 uppercase">OceanGuard</h1>
              <span className="font-mono text-[9px] px-1 py-0.2 bg-cyan-950 text-ocean-cyan border border-cyan-500/40 rounded">
                PRO
              </span>
            </div>
            <p className="font-mono text-[9px] text-slate-400 tracking-widest mt-0.5">MARITIME DEFENSE AI</p>
          </div>
        </div>
      </div>

      {/* Primary Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <p className="font-mono text-[9px] text-slate-400 font-semibold tracking-widest px-3 mb-2 uppercase">
          COMMAND MODULES
        </p>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `group flex items-center gap-3 px-3 py-2.5 rounded transition-all duration-150 border ${
                isActive
                  ? 'border-cyan-500/40 bg-cyan-950/30 text-ocean-cyan shadow-[0_0_12px_rgba(0,240,255,0.15)] font-medium'
                  : 'border-transparent text-slate-400 hover:border-slate-800 hover:bg-slate-900/40 hover:text-slate-200'
              }`
            }
          >
            <item.icon size={16} strokeWidth={1.8} className="shrink-0" />
            <span className="font-sans text-xs tracking-wide flex-1">{item.label}</span>
            <span className="font-mono text-[9px] text-slate-400 group-hover:text-ocean-cyan">
              {item.code}
            </span>
          </NavLink>
        ))}
      </nav>

      {/* System Telemetry & Readiness */}
      <div className="px-4 py-4 border-t border-slate-800 bg-slate-900/30 space-y-3">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono text-[9px] text-slate-400 tracking-widest uppercase flex items-center gap-1.5">
              <Activity size={11} className="text-emerald-400" />
              SYSTEM READINESS
            </span>
            <span className="font-mono text-[9px] text-emerald-400">NOMINAL</span>
          </div>

          <div className="space-y-1.5 bg-slate-950/60 p-2.5 rounded border border-slate-800/80">
            <div className="flex items-center justify-between font-mono text-[10px]">
              <span className="text-slate-400">SAR SATELLITE:</span>
              <span className="text-emerald-400 font-medium">PASS ACTIVE</span>
            </div>
            <div className="flex items-center justify-between font-mono text-[10px]">
              <span className="text-slate-400">AIS TELEMETRY:</span>
              <span className="text-cyan-400 font-medium">1,847/s</span>
            </div>
            <div className="flex items-center justify-between font-mono text-[10px]">
              <span className="text-slate-400">DRIFT ENGINE:</span>
              <span className="text-emerald-400 font-medium">OPENDRIFT 4D</span>
            </div>
            <div className="flex items-center justify-between font-mono text-[10px]">
              <span className="text-slate-400">U-NET PRECISION:</span>
              <span className="text-ocean-amber font-medium">
                {((metrics?.accuracy ?? 0.962) * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        {/* Watch Alert Status Tag */}
        <div className="flex items-center gap-2 p-2 bg-rose-950/20 border border-rose-500/30 rounded text-rose-400 font-mono text-[10px]">
          <ShieldAlert size={14} className="shrink-0 animate-pulse" />
          <div className="leading-tight">
            <span className="font-bold">DEFCON 3</span>: CRITICAL SLICK ACTIVE
          </div>
        </div>
      </div>
    </aside>
  );
}
