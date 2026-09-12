import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { LayoutDashboard, Map, Search, Ship, FileText, Bell, Anchor, Menu } from 'lucide-react';

const Sidebar = () => {
  const navItems = [
    { to: '/dashboard', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
    { to: '/map', icon: <Map size={20} />, label: 'Live Map' },
    { to: '/dashboard', icon: <Search size={20} />, label: 'Investigations' },
    { to: '/vessels', icon: <Ship size={20} />, label: 'Vessels' },
    { to: '/reports', icon: <FileText size={20} />, label: 'Reports' },
  ];

  return (
    <div className="w-64 bg-navy-900 border-r border-line h-screen flex flex-col fixed left-0 top-0">
      <div className="p-6 flex items-center gap-3">
        <Anchor className="text-ocean" size={28} />
        <span className="text-xl font-bold text-text tracking-wide">OceanGuard<span className="text-ocean">AI</span></span>
      </div>
      <nav className="flex-1 px-4 mt-6 flex flex-col gap-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => 
              `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive ? 'bg-navy-800 text-ocean' : 'text-text-muted hover:bg-navy-800/50 hover:text-text'}`
            }
          >
            {item.icon}
            <span className="font-medium">{item.label}</span>
          </NavLink>
        ))}
      </nav>
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
        <div className="capitalize text-lg font-semibold text-text">{pathName.replace('-', ' ')}</div>
      </div>
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 text-sm text-text-muted font-mono bg-navy-800 px-3 py-1.5 rounded-md border border-line">
          <div className="w-2 h-2 rounded-full bg-safe animate-pulse" /> SAT-LINK ACTIVE
        </div>
        <div className="text-text-muted font-mono">{time.toLocaleTimeString()} UTC</div>
        <button className="relative p-2 text-text-muted hover:text-text hover:bg-navy-800 rounded-full transition-colors">
          <Bell size={20} />
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-danger rounded-full border border-navy-900" />
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
