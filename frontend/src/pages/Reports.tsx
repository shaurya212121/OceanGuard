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
  { name: 'Critical', value: 4, color: '#FF2A5F' }, { name: 'High', value: 8, color: '#FFB100' }, 
  { name: 'Medium', value: 15, color: '#00F0FF' }, { name: 'Low', value: 5, color: '#00FFAA' }
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
                <CartesianGrid strokeDasharray="3 3" stroke="#2A332F" vertical={false} />
                <XAxis dataKey="month" stroke="#E8E4D8" tick={{fill: '#E8E4D8', fontFamily: 'IBM Plex Mono', fontSize: 12}} />
                <YAxis stroke="#E8E4D8" tick={{fill: '#E8E4D8', fontFamily: 'IBM Plex Mono', fontSize: 12}} />
                <Tooltip contentStyle={{backgroundColor: '#141C19', borderColor: '#2A332F', color: '#E8E4D8', fontFamily: 'IBM Plex Mono'}} />
                <Line type="monotone" dataKey="spills" stroke="#00F0FF" strokeWidth={2} dot={{r: 4, fill: '#00F0FF'}} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        <GlassCard className="p-4 h-[350px] flex flex-col">
          <h3 className="font-bold text-lg mb-4 text-text-muted">Suspect Vessel Types</h3>
          <div className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={typeData} layout="vertical" margin={{left: 20}}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A332F" horizontal={false} />
                <XAxis type="number" stroke="#E8E4D8" />
                <YAxis dataKey="name" type="category" stroke="#E8E4D8" width={80} />
                <Tooltip contentStyle={{backgroundColor: '#141C19', borderColor: '#2A332F', color: '#E8E4D8'}} />
                <Bar dataKey="count" fill="#0EA5E9" />
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
