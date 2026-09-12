import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import { ShieldAlert, Ship, Waves, BellRing } from 'lucide-react';
import { fetchDashboardStats, fetchRecentSpills, fetchAlerts, fetchScenarios } from '../api/client';
import { StatCard, GlassCard, SeverityBadge, AlertItem } from '../components/ui';
import { DashboardStats, Spill, Alert, ScenarioListItem } from '../types';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [spills, setSpills] = useState<Spill[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [scenarios, setScenarios] = useState<ScenarioListItem[]>([]);

  useEffect(() => {
    fetchDashboardStats().then(setStats);
    fetchRecentSpills().then(setSpills);
    fetchAlerts().then(setAlerts);
    fetchScenarios().then(setScenarios);
  }, []);

  const scenarioMap = new Map(scenarios.map((s) => [s.name, s.id]));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Spills" value={stats?.total_spills || 0} icon={<Waves />} trend="+1 this week" />
        <StatCard title="Active Investigations" value={stats?.active_investigations || 0} icon={<ShieldAlert />} />
        <StatCard title="Vessels Tracked" value={stats?.vessels_tracked || 0} icon={<Ship />} />
        <StatCard title="Alerts Today" value={stats?.alerts_today || 0} icon={<BellRing />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[500px]">
        <GlassCard className="lg:col-span-2 relative z-0 flex flex-col">
          <div className="p-4 border-b border-line flex justify-between items-center">
            <h3 className="font-bold text-lg">Live Tactical Map</h3>
            <Link to="/map" className="text-sm text-ocean hover:underline">View Full Map</Link>
          </div>
          <div className="flex-1 bg-navy-950">
            <MapContainer center={[14.5, 75.1]} zoom={6} className="h-full w-full" zoomControl={false}>
              <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
              {spills.map(spill => (
                <CircleMarker 
                  key={spill.id} 
                  center={[spill.center_lat, spill.center_lon]} 
                  radius={12}
                  pathOptions={{ color: '#f97316', fillColor: '#f59e0b', fillOpacity: 0.5, weight: 2 }}
                >
                  <Popup className="custom-popup">
                    <div className="text-navy-950 font-bold">{spill.name}</div>
                    <div className="text-xs text-navy-800">Area: {spill.area_sq_km} km²</div>
                  </Popup>
                </CircleMarker>
              ))}
            </MapContainer>
          </div>
        </GlassCard>

        <GlassCard className="flex flex-col">
          <div className="p-4 border-b border-line">
            <h3 className="font-bold text-lg">Recent Alerts</h3>
          </div>
          <div className="flex-1 overflow-auto p-2">
            {alerts.map(alert => <AlertItem key={alert.id} alert={alert} />)}
          </div>
        </GlassCard>
      </div>

      <GlassCard className="p-4">
        <h3 className="font-bold text-lg mb-4">Active Investigations</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-line text-text-muted text-sm">
                <th className="pb-3 pr-4">ID</th>
                <th className="pb-3 pr-4">Name</th>
                <th className="pb-3 pr-4">Severity</th>
                <th className="pb-3 pr-4">Detected</th>
                <th className="pb-3 pr-4">Action</th>
              </tr>
            </thead>
            <tbody>
              {spills.map(spill => {
                const scenarioId = scenarioMap.get(spill.name) || spill.id;
                return (
                  <tr key={spill.id} className="border-b border-line last:border-0">
                    <td className="py-3 font-mono text-sm">{spill.id}</td>
                    <td className="py-3 font-medium">{spill.name}</td>
                    <td className="py-3"><SeverityBadge severity={spill.severity} /></td>
                    <td className="py-3 text-sm text-text-muted">{new Date(spill.detected_at).toLocaleDateString()}</td>
                    <td className="py-3">
                      <Link to={`/investigation/${scenarioId}`} className="text-ocean hover:text-ocean-light text-sm font-medium">Investigate →</Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
}
