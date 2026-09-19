import metrics from '@/data/metrics.json';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Radar, Search, Ship, BarChart3, Settings, ShieldCheck, ChevronRight, Upload } from 'lucide-react';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, code: 'DASH' },
  { to: '/map', label: 'Live Tactical Map', icon: Radar, code: 'MAP' },
  { to: '/investigations', label: 'Investigations Desk', icon: Search, code: 'INV' },
  { to: '/vessels', label: 'Vessels Registry', icon: Ship, code: 'VES' },
  { to: '/analytics', label: 'Analytics & Reports', icon: BarChart3, code: 'ANL' },
  { to: '/detect', label: 'Live Detection Demo', icon: Upload, code: 'DET' },
];

export default function Sidebar() {
  return (
    <aside className="w-60 shrink-0 bg-ocean-panel border-r border-ocean-border flex flex-col h-full">
      {/* Branding */}
      <div className="px-5 py-5 border-b border-ocean-border">
        <div className="flex items-center gap-3">
          <div className="relative">
            <ShieldCheck size={28} className="text-ocean-cyan" strokeWidth={1.5} />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-ocean-green rounded-full blink" />
          </div>
          <div>
            <h1 className="font-sans font-bold text-sm tracking-wide text-ocean-text leading-none">OceanGuard</h1>
            <p className="font-mono text-[10px] text-ocean-cyan tracking-widest mt-1">AI v3.2.1</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        <p className="font-mono text-[9px] text-ocean-text-muted tracking-widest px-2 mb-2">NAVIGATION</p>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `group flex items-center gap-3 px-3 py-2.5 border transition-all duration-150 ${
                isActive
                  ? 'border-ocean-cyan/40 bg-ocean-cyan/5 text-ocean-cyan'
                  : 'border-transparent text-ocean-text-dim hover:border-ocean-border hover:text-ocean-text'
              }`
            }
          >
            <item.icon size={16} strokeWidth={1.5} />
            <span className="font-sans text-sm font-medium flex-1">{item.label}</span>
            <span className="font-mono text-[9px] text-ocean-text-muted tracking-wider group-hover:text-ocean-cyan">
              {item.code}
            </span>
          </NavLink>
        ))}
      </nav>

      {/* Bottom — System Status */}
      <div className="px-3 py-4 border-t border-ocean-border space-y-3">
        <div className="px-2">
          <p className="font-mono text-[9px] text-ocean-text-muted tracking-widest mb-2">SYSTEM STATUS</p>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] text-ocean-text-dim">SAT FEED</span>
              <span className="font-mono text-[10px] text-ocean-green">[ OK ]</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] text-ocean-text-dim">AIS STREAM</span>
              <span className="font-mono text-[10px] text-ocean-green">[ OK ]</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] text-ocean-text-dim">ML MODEL</span>
              <span className="font-mono text-[10px] text-ocean-amber">[ {(metrics.accuracy * 100).toFixed(1)}% ]</span>
            </div>
          </div>
        </div>
        <button className="w-full flex items-center gap-3 px-3 py-2.5 border border-transparent text-ocean-text-dim hover:border-ocean-border hover:text-ocean-text transition-all duration-150">
          <Settings size={16} strokeWidth={1.5} />
          <span className="font-sans text-sm font-medium flex-1 text-left">Settings</span>
          <ChevronRight size={14} strokeWidth={1.5} />
        </button>
      </div>
    </aside>
  );
}
