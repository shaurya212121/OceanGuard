import React, { useEffect, useState } from 'react';
import { fetchVessels } from '../api/client';
import { VesselSummary } from '../types';
import { GlassCard } from '../components/ui';
import { Search } from 'lucide-react';

export default function Vessels() {
  const [vessels, setVessels] = useState<VesselSummary[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchVessels().then(setVessels);
  }, []);

  const filtered = vessels.filter(
    v =>
      (v.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (v.imo_number || '').includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Vessel Registry</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
          <input 
            type="text" 
            placeholder="Search by Name or IMO..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="bg-navy-900 border border-line rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-ocean w-64"
          />
        </div>
      </div>

      <GlassCard>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-navy-800">
              <tr className="text-text-muted text-sm border-b border-line">
                <th className="p-4 font-medium">IMO</th>
                <th className="p-4 font-medium">Name</th>
                <th className="p-4 font-medium">Type</th>
                <th className="p-4 font-medium">Flag</th>
                <th className="p-4 font-medium">Last Position</th>
                <th className="p-4 font-medium">Last Seen</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(v => (
                <tr key={v.imo_number} className="border-b border-line last:border-0 hover:bg-navy-800/30 transition-colors">
                  <td className="p-4 font-mono text-sm">{v.imo_number}</td>
                  <td className="p-4 font-medium">{v.name}</td>
                  <td className="p-4 text-sm text-text-muted">{v.vessel_type}</td>
                  <td className="p-4 text-sm">{v.flag_country}</td>
                  <td className="p-4 text-sm font-mono">
                    {v.last_known_position?.lat != null && v.last_known_position?.lon != null
                      ? `${v.last_known_position.lat.toFixed(4)}, ${v.last_known_position.lon.toFixed(4)}`
                      : 'N/A'}
                  </td>
                  <td className="p-4 text-sm text-text-muted">
                    {v.last_known_position?.timestamp
                      ? new Date(v.last_known_position.timestamp).toLocaleString()
                      : 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
}
