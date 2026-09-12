import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { GlassCard } from '../components/ui';

const trendData = [
  { month: 'Jan', spills: 2 }, { month: 'Feb', spills: 3 }, { month: 'Mar', spills: 1 },
  { month: 'Apr', spills: 4 }, { month: 'May', spills: 2 }, { month: 'Jun', spills: 5 }
];

const typeData = [
  { name: 'Oil Tanker', count: 12 }, { name: 'Cargo', count: 8 }, { name: 'Fishing', count: 3 }, { name: 'Other', count: 2 }
];

const severityData = [
  { name: 'Critical', value: 4, color: '#ef4444' }, { name: 'High', value: 8, color: '#f97316' }, 
  { name: 'Medium', value: 15, color: '#f59e0b' }, { name: 'Low', value: 5, color: '#10b981' }
];

export default function Reports() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Analytics & Reports</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlassCard className="p-4 h-[350px] flex flex-col">
          <h3 className="font-bold text-lg mb-4 text-text-muted">Spill Detections (Last 6 Months)</h3>
          <div className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" vertical={false} />
                <XAxis dataKey="month" stroke="#64748b" tick={{fill: '#94a3b8'}} />
                <YAxis stroke="#64748b" tick={{fill: '#94a3b8'}} />
                <Tooltip contentStyle={{backgroundColor: '#111d32', borderColor: '#1e3a5f', color: '#f1f5f9'}} />
                <Line type="monotone" dataKey="spills" stroke="#06b6d4" strokeWidth={3} dot={{r: 4, fill: '#06b6d4'}} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        <GlassCard className="p-4 h-[350px] flex flex-col">
          <h3 className="font-bold text-lg mb-4 text-text-muted">Suspect Vessel Types</h3>
          <div className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={typeData} layout="vertical" margin={{left: 20}}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" horizontal={false} />
                <XAxis type="number" stroke="#64748b" />
                <YAxis dataKey="name" type="category" stroke="#64748b" width={80} />
                <Tooltip contentStyle={{backgroundColor: '#111d32', borderColor: '#1e3a5f', color: '#f1f5f9'}} />
                <Bar dataKey="count" fill="#0891b2" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        <GlassCard className="p-4 h-[350px] flex flex-col">
          <h3 className="font-bold text-lg mb-4 text-text-muted">Incident Severity Breakdown</h3>
          <div className="flex-1 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={severityData} cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={5} dataKey="value">
                  {severityData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={{backgroundColor: '#111d32', borderColor: '#1e3a5f', color: '#f1f5f9'}} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
