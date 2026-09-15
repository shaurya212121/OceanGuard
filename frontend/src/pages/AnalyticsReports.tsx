import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { TrendingUp, BarChart3, PieChart as PieIcon, Activity, Download } from 'lucide-react';
import { spillsOverTime, suspectVesselTypes, alertSeverityBreakdown } from '@/data/mockData';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-ocean-panel border border-ocean-border p-2">
      <p className="font-mono text-[10px] text-ocean-cyan mb-1">{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} className="font-mono text-[10px]" style={{ color: entry.color || entry.fill }}>
          {entry.name}: {entry.value}
        </p>
      ))}
    </div>
  );
};

function ChartPanel({
  title, icon: Icon, code, children,
}: {
  title: string; icon: React.ElementType; code: string; children: React.ReactNode;
}) {
  return (
    <div className="tactical-corners p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Icon size={14} strokeWidth={1.5} className="text-ocean-cyan" />
          <span className="font-mono text-[10px] text-ocean-text-muted tracking-widest">{title}</span>
        </div>
        <span className="font-mono text-[9px] text-ocean-text-muted">{code}</span>
      </div>
      {children}
    </div>
  );
}

export default function AnalyticsReports() {
  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-sans text-xl font-semibold text-ocean-text tracking-wide">Analytics & Reports</h2>
          <p className="font-mono text-[11px] text-ocean-text-muted mt-1">
            [ DETECTION TRENDS — VESSEL ATTRIBUTION — ALERT DISTRIBUTION ] — 7-DAY WINDOW
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 border border-ocean-cyan/40 bg-ocean-cyan/5 text-ocean-cyan hover:bg-ocean-cyan/10 transition-colors">
          <Download size={14} strokeWidth={1.5} />
          <span className="font-sans text-xs font-medium">Export Report</span>
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="tactical-corners p-3">
          <p className="font-mono text-[9px] text-ocean-text-muted tracking-widest">TOTAL SPILLS (7D)</p>
          <p className="font-mono text-2xl text-ocean-text mt-1">31</p>
          <p className="font-mono text-[10px] text-ocean-red mt-1">↑ 14.8% vs prev</p>
        </div>
        <div className="tactical-corners p-3">
          <p className="font-mono text-[9px] text-ocean-text-muted tracking-widest">CRITICAL (7D)</p>
          <p className="font-mono text-2xl text-ocean-red mt-1">10</p>
          <p className="font-mono text-[10px] text-ocean-amber mt-1">↑ 25.0% vs prev</p>
        </div>
        <div className="tactical-corners p-3">
          <p className="font-mono text-[9px] text-ocean-text-muted tracking-widest">SUSPECTS FLAGGED</p>
          <p className="font-mono text-2xl text-ocean-cyan mt-1">14</p>
          <p className="font-mono text-[10px] text-ocean-text-dim mt-1">8 tankers / 6 other</p>
        </div>
        <div className="tactical-corners p-3">
          <p className="font-mono text-[9px] text-ocean-text-muted tracking-widest">AVG DETECTION TIME</p>
          <p className="font-mono text-2xl text-ocean-text mt-1">2.4<span className="text-ocean-text-dim text-sm">h</span></p>
          <p className="font-mono text-[10px] text-ocean-green mt-1">↓ 0.3h vs prev</p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Spills Over Time */}
        <ChartPanel title="SPILLS DETECTED OVER TIME" icon={TrendingUp} code="CHT-01">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={spillsOverTime} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E3A8A" opacity={0.3} />
              <XAxis
                dataKey="date"
                stroke="#475569"
                tick={{ fontSize: 10, fontFamily: 'IBM Plex Mono' }}
                tickFormatter={(v) => v.slice(5)}
              />
              <YAxis stroke="#475569" tick={{ fontSize: 10, fontFamily: 'IBM Plex Mono' }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: '10px', fontFamily: 'IBM Plex Mono' }}
                iconType="plainline"
              />
              <Line
                type="monotone"
                dataKey="spills"
                name="Total Spills"
                stroke="#00F0FF"
                strokeWidth={2}
                dot={{ fill: '#00F0FF', r: 3 }}
                activeDot={{ r: 5 }}
              />
              <Line
                type="monotone"
                dataKey="critical"
                name="Critical"
                stroke="#FF2A5F"
                strokeWidth={2}
                dot={{ fill: '#FF2A5F', r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartPanel>

        {/* Suspect Vessel Types */}
        <ChartPanel title="SUSPECT VESSEL TYPES" icon={BarChart3} code="CHT-02">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={suspectVesselTypes} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E3A8A" opacity={0.3} />
              <XAxis
                dataKey="type"
                stroke="#475569"
                tick={{ fontSize: 8, fontFamily: 'IBM Plex Mono' }}
                angle={-35}
                textAnchor="end"
                height={70}
                interval={0}
              />
              <YAxis stroke="#475569" tick={{ fontSize: 10, fontFamily: 'IBM Plex Mono' }} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,240,255,0.05)' }} />
              <Bar dataKey="count" name="Suspect Count" fill="#0EA5E9" stroke="#0EA5E9" strokeWidth={1}>
                {suspectVesselTypes.map((entry, i) => (
                  <Cell key={i} fill={entry.type === 'Crude Oil Tanker' ? '#FF2A5F' : '#0EA5E9'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>

        {/* Alert Severity Breakdown */}
        <ChartPanel title="ALERT SEVERITY BREAKDOWN" icon={PieIcon} code="CHT-03">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={alertSeverityBreakdown}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={90}
                paddingAngle={2}
                stroke="#030C14"
                strokeWidth={2}
              >
                {alertSeverityBreakdown.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: '10px', fontFamily: 'IBM Plex Mono' }}
                iconType="square"
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartPanel>

        {/* Detection Performance */}
        <ChartPanel title="DETECTION PERFORMANCE INDEX" icon={Activity} code="CHT-04">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart
              data={[
                { date: '09-07', accuracy: 94.1, latency: 3.2 },
                { date: '09-08', accuracy: 94.8, latency: 2.9 },
                { date: '09-09', accuracy: 95.2, latency: 2.7 },
                { date: '09-10', accuracy: 95.5, latency: 2.5 },
                { date: '09-11', accuracy: 95.9, latency: 2.6 },
                { date: '09-12', accuracy: 95.9, latency: 2.4 },
                { date: '09-13', accuracy: 96.2, latency: 2.4 },
              ]}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1E3A8A" opacity={0.3} />
              <XAxis
                dataKey="date"
                stroke="#475569"
                tick={{ fontSize: 10, fontFamily: 'IBM Plex Mono' }}
              />
              <YAxis
                yAxisId="left"
                stroke="#475569"
                tick={{ fontSize: 10, fontFamily: 'IBM Plex Mono' }}
                domain={[90, 100]}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#475569"
                tick={{ fontSize: 10, fontFamily: 'IBM Plex Mono' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '10px', fontFamily: 'IBM Plex Mono' }} iconType="plainline" />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="accuracy"
                name="Accuracy %"
                stroke="#10F2A0"
                strokeWidth={2}
                dot={{ fill: '#10F2A0', r: 3 }}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="latency"
                name="Latency (h)"
                stroke="#FBBF24"
                strokeWidth={2}
                dot={{ fill: '#FBBF24', r: 3 }}
                strokeDasharray="5 3"
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartPanel>
      </div>

      {/* Recent Reports Table */}
      <div className="tactical-corners p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Activity size={14} strokeWidth={1.5} className="text-ocean-cyan" />
            <span className="font-mono text-[10px] text-ocean-text-muted tracking-widest">RECENT GENERATED REPORTS</span>
          </div>
          <span className="font-mono text-[9px] text-ocean-text-muted">RPT-LOG</span>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-ocean-border">
              <th className="px-3 py-2 text-left font-mono text-[10px] text-ocean-text-muted tracking-widest">REPORT ID</th>
              <th className="px-3 py-2 text-left font-mono text-[10px] text-ocean-text-muted tracking-widest">SPILL</th>
              <th className="px-3 py-2 text-left font-mono text-[10px] text-ocean-text-muted tracking-widest">SUSPECT</th>
              <th className="px-3 py-2 text-left font-mono text-[10px] text-ocean-text-muted tracking-widest">GUILT</th>
              <th className="px-3 py-2 text-left font-mono text-[10px] text-ocean-text-muted tracking-widest">STATUS</th>
              <th className="px-3 py-2 text-left font-mono text-[10px] text-ocean-text-muted tracking-widest">GENERATED</th>
            </tr>
          </thead>
          <tbody>
            {[
              { id: 'RPT-2026-0913-0042', spill: 'OG-2026-0913-001', suspect: 'OCEANIC STAR', guilt: 94, status: 'FORWARDED', time: '09:12:00Z' },
              { id: 'RPT-2026-0913-0041', spill: 'OG-2026-0913-002', suspect: 'NEW LEGACY', guilt: 89, status: 'PENDING', time: '08:45:00Z' },
              { id: 'RPT-2026-0913-0040', spill: 'OG-2026-0913-001', suspect: 'AL SAADIYA', guilt: 87, status: 'FORWARDED', time: '08:30:00Z' },
              { id: 'RPT-2026-0913-0039', spill: 'OG-2026-0913-003', suspect: 'NORDIC SPIRIT', guilt: 76, status: 'REVIEW', time: '07:55:00Z' },
              { id: 'RPT-2026-0912-0038', spill: 'OG-2026-0912-018', suspect: 'MAERSK SELETAR', guilt: 34, status: 'ARCHIVED', time: '14:30:00Z' },
            ].map((r, i) => (
              <tr key={r.id} className={`border-b border-ocean-border/40 hover:border-ocean-cyan/30 transition-colors ${i % 2 === 0 ? 'bg-ocean-panel/30' : ''}`}>
                <td className="px-3 py-2.5">
                  <span className="font-mono text-xs text-ocean-cyan">{r.id}</span>
                </td>
                <td className="px-3 py-2.5">
                  <span className="font-mono text-xs text-ocean-text-dim">{r.spill}</span>
                </td>
                <td className="px-3 py-2.5">
                  <span className="font-sans text-sm text-ocean-text">{r.suspect}</span>
                </td>
                <td className="px-3 py-2.5">
                  <span className={`font-mono text-sm ${r.guilt >= 80 ? 'text-ocean-red' : r.guilt >= 60 ? 'text-ocean-amber' : 'text-ocean-sky'}`}>
                    {r.guilt}%
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  <span className={`status-badge ${
                    r.status === 'FORWARDED' ? 'text-ocean-red border-ocean-red/40' :
                    r.status === 'PENDING' ? 'text-ocean-amber border-ocean-amber/40' :
                    r.status === 'REVIEW' ? 'text-ocean-sky border-ocean-sky/40' :
                    'text-ocean-text-muted border-ocean-border'
                  }`}>
                    {r.status}
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  <span className="font-mono text-[10px] text-ocean-text-muted">{r.time}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
