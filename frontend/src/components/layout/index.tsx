import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { LayoutDashboard, Map, Search, Ship, FileText, Bell, Anchor, Cpu, BarChart3, ShieldCheck } from 'lucide-react';

const Sidebar = () => {
  const navItems = [
    { to: '/dashboard', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
    { to: '/map', icon: <Map size={20} />, label: 'Live Map' },
    { to: '/simulation', icon: <Cpu size={20} />, label: 'SAR & Hindcast' },
    { to: '/vessels', icon: <Ship size={20} />, label: 'Vessels' },
    { to: '/reports', icon: <FileText size={20} />, label: 'Analytics' },
    { to: '/evaluation', icon: <BarChart3 size={20} />, label: 'Evaluation' },
  ];

  return (
    <div className="w-64 bg-navy-900 border-r border-line h-screen flex flex-col fixed left-0 top-0 z-20">
      <div className="p-6 flex items-center gap-3">
        <Anchor className="text-ocean" size={28} />
        <div>
          <span className="text-xl font-bold tracking-wide uppercase">OceanGuard<span className="text-ocean">AI</span></span>
          <div className="text-[9px] text-text-muted font-mono tracking-widest">SIH 2026 • PS SIH26143</div>
        </div>
      </div>
      <nav className="flex-1 px-4 mt-4 flex flex-col gap-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => 
              `flex items-center gap-3 px-4 py-3 transition-colors uppercase text-sm tracking-wider font-semibold border ${isActive ? 'bg-navy-800 text-ocean border-line' : 'text-text-muted border-transparent hover:border-line hover:text-text'}`
            }
          >
            {item.icon}
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="p-4 border-t border-line text-[10px] text-text-dim font-mono">
        <div className="flex items-center gap-1 text-teal font-semibold mb-1">
          <ShieldCheck size={12} /> SCIENTIFIC PROVENANCE
        </div>
        <div>Multi-factor Evidence & Counterfactual IoU Engine Active</div>
      </div>
    </div>
  );
};

const TopBar = () => {
  const [time, setTime] = useState(new Date());
  const location = useLocation();
  const pathName = location.pathname.split('/')[1] || 'dashboard';

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="h-16 bg-navy-900 border-b border-line flex items-center justify-between px-6 sticky top-0 z-10">
      <div className="flex items-center gap-4">
        <div className="uppercase tracking-widest text-lg font-bold">{pathName.replace('-', ' ')}</div>
      </div>
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 text-xs font-mono font-semibold bg-navy-950 px-3 py-1 rounded border border-line text-warning">
          <div className="w-2 h-2 rounded-full bg-warning animate-pulse" />
          [ PROVENANCE: DEMO / SYNTHETIC DATA ]
        </div>
        <div className="text-text-muted font-mono tracking-wider text-sm">{time.toISOString().substring(11, 19)} UTC</div>
        <button className="relative p-2 text-text-muted hover:text-text transition-colors border border-transparent hover:border-line">
          <Bell size={20} />
          <span className="absolute top-1 right-1 w-2 h-2 bg-danger rounded-full" />
        </button>
      </div>
    </header>
  );
};

export const AppLayout = () => {
  return (
    <div className="flex min-h-screen bg-navy-950">
      <Sidebar />
      <div className="flex-1 ml-64 flex flex-col relative">
        <TopBar />
        <main className="flex-1 overflow-auto bg-navy-950 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
