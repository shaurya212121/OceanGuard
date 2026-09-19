import { useState } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from 'recharts';
import {
  TrendingUp,
  BarChart3,
  Activity,
  Download,
  ShieldCheck,
  AlertTriangle,
  FileSpreadsheet,
  CheckCircle2,
  Calendar,
  Layers,
} from 'lucide-react';
import {
  spillsTrend7D,
  spillsTrend30D,
  suspectVesselDistribution,
  modelDetectionMetrics,
} from '@/data/mockData';
import { formatPercent } from '@/utils/formatters';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0d1524] border border-slate-700 p-2.5 shadow-2xl font-mono text-xs rounded">
      <p className="text-ocean-cyan font-bold mb-1 border-b border-slate-800 pb-0.5">{label}</p>
      {payload.map((entry: any, i: number) => (
        <div key={i} className="flex items-center justify-between gap-3 py-0.5">
          <span className="text-slate-400">{entry.name}:</span>
          <span className="font-bold tabular-nums" style={{ color: entry.color || entry.stroke || '#00f0ff' }}>
            {entry.value}
          </span>
        </div>
      ))}
    </div>
  );
};

export default function AnalyticsReports() {
  const [timeframe, setTimeframe] = useState<'7D' | '30D'>('7D');

  const trendData = timeframe === '7D' ? spillsTrend7D : spillsTrend30D;

  const exportSummaryReport = () => {
    const reportText = `OCEANGUARD MARITIME INTELLIGENCE EXECUTIVE SUMMARY
======================================================
Generated: ${new Date().toISOString()}
Timeframe: ${timeframe === '7D' ? 'Last 7 Days' : 'Last 30 Days'}

1. SPILL INCIDENTS
   Total Detected: 31 Slicks
   Critical Incidents: 10 Slicks (32.2%)
   Avg Response / Origin Intercept: 2.4 Hours

2. VESSEL ATTRIBUTION
   Crude Oil Tankers: 18 Flagged (12 Critical)
   Chemical Carriers: 8 Flagged (4 Critical)
   Product Tankers:   6 Flagged (2 Critical)

3. AI SENSING PERFORMANCE (SENTINEL-1 U-NET)
   Overall Precision: ${(modelDetectionMetrics.overall_precision * 100).toFixed(1)}%
   Overall Recall:    ${(modelDetectionMetrics.overall_recall * 100).toFixed(1)}%
   Look-alike FAR:    ${(modelDetectionMetrics.false_alarm_rate * 100).toFixed(1)}%
   SAR Chips Screened: ${modelDetectionMetrics.total_sar_chips_screened.toLocaleString()}
======================================================
UNCLOS DEFENSE MARITIME COMMAND COGNIZANT`;

    const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `OceanGuard_Executive_Summary_${timeframe}_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-6 bg-[#0a0f18] min-h-full select-none text-slate-100">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="font-sans text-xl font-bold text-slate-100 tracking-wide">
              Analytics & Intelligence Summary
            </h2>
            <span className="font-mono text-[10px] px-2 py-0.5 bg-cyan-950 border border-cyan-500/40 text-ocean-cyan rounded">
              DEFENSE INTELLIGENCE
            </span>
          </div>
          <p className="font-mono text-xs text-slate-400">
            RADAR INCIDENT FREQUENCY • SUSPECT ATTRIBUTION DISTRIBUTIONS • U-NET PRECISION BENCHMARKS
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Timeframe selector */}
          <div className="flex items-center bg-[#0d1524] p-1 border border-slate-800 rounded font-mono text-xs">
            <button
              onClick={() => setTimeframe('7D')}
              className={`px-3 py-1 rounded transition-colors ${
                timeframe === '7D'
                  ? 'bg-cyan-950 text-ocean-cyan border border-cyan-500/40 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              7 Days
            </button>
            <button
              onClick={() => setTimeframe('30D')}
              className={`px-3 py-1 rounded transition-colors ${
                timeframe === '30D'
                  ? 'bg-cyan-950 text-ocean-cyan border border-cyan-500/40 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              30 Days
            </button>
          </div>

          <button
            onClick={exportSummaryReport}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-ocean-cyan text-slate-200 hover:text-ocean-cyan font-mono text-xs flex items-center gap-2 transition-colors rounded shadow-lg"
          >
            <Download size={13} />
            <span>EXPORT SUMMARY</span>
          </button>
        </div>
      </div>

      {/* KPI Top Telemetry Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 font-mono">
        <div className="tactical-corners p-4 bg-[#0d1524]">
          <span className="text-[10px] text-slate-400 tracking-widest uppercase block">
            CONFIRMED SLICKS ({timeframe})
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-slate-100">
              {timeframe === '7D' ? '31' : '74'}
            </span>
            <span className="text-xs text-rose-400">↑ 14.8%</span>
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">10 CRITICAL • 21 MINOR</span>
        </div>

        <div className="tactical-corners p-4 bg-[#0d1524]">
          <span className="text-[10px] text-slate-400 tracking-widest uppercase block">
            SUSPECT VESSELS FLAGGED
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-ocean-cyan">44</span>
            <span className="text-xs text-amber-400">26 TANKERS</span>
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">94.2% HIGHEST GUILT SCORE</span>
        </div>

        <div className="tactical-corners p-4 bg-[#0d1524]">
          <span className="text-[10px] text-slate-400 tracking-widest uppercase block">
            U-NET AI PRECISION
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-emerald-400">
              {formatPercent(modelDetectionMetrics.overall_precision * 100)}
            </span>
            <span className="text-xs text-emerald-400">RECALL {formatPercent(modelDetectionMetrics.overall_recall * 100)}</span>
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">FALSE ALARM RATE: 3.8%</span>
        </div>

        <div className="tactical-corners p-4 bg-[#0d1524]">
          <span className="text-[10px] text-slate-400 tracking-widest uppercase block">
            AVERAGE ORIGIN INTERCEPT
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-slate-100">2.4</span>
            <span className="text-xs text-slate-400">HOURS</span>
          </div>
          <span className="text-[10px] text-emerald-400 mt-1 block">↓ 0.3h FASTER THAN BENCHMARK</span>
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Chart 1: Spline Area Chart of Spill Incidents */}
        <div className="tactical-corners p-5 bg-[#0d1524] space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp size={16} className="text-ocean-cyan" />
              <span className="font-mono text-xs font-semibold text-slate-200 uppercase tracking-wider">
                SPILL INCIDENTS OVER TIME ({timeframe})
              </span>
            </div>
            <span className="font-mono text-[9px] text-slate-400">SPLINE AREA TREND</span>
          </div>

          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="totalSpillsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00f0ff" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#00f0ff" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="criticalSpillsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis
                  dataKey="date"
                  stroke="#64748b"
                  tick={{ fontSize: 10, fontFamily: 'JetBrains Mono' }}
                />
                <YAxis
                  stroke="#64748b"
                  tick={{ fontSize: 10, fontFamily: 'JetBrains Mono' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: '10px', fontFamily: 'JetBrains Mono', paddingTop: '10px' }}
                />
                <Area
                  type="monotone"
                  dataKey="total"
                  name="Total Detected Slicks"
                  stroke="#00f0ff"
                  strokeWidth={2}
                  fill="url(#totalSpillsGrad)"
                />
                <Area
                  type="monotone"
                  dataKey="critical"
                  name="Critical Slicks"
                  stroke="#f43f5e"
                  strokeWidth={2}
                  fill="url(#criticalSpillsGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Suspect Vessel Type Distribution (Horizontal Bar Chart) */}
        <div className="tactical-corners p-5 bg-[#0d1524] space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <BarChart3 size={16} className="text-ocean-cyan" />
              <span className="font-mono text-xs font-semibold text-slate-200 uppercase tracking-wider">
                SUSPECT VESSEL TYPE DISTRIBUTION
              </span>
            </div>
            <span className="font-mono text-[9px] text-slate-400">AIS CORRELATED</span>
          </div>

          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={suspectVesselDistribution}
                margin={{ top: 10, right: 20, left: 40, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis
                  type="number"
                  stroke="#64748b"
                  tick={{ fontSize: 10, fontFamily: 'JetBrains Mono' }}
                />
                <YAxis
                  type="category"
                  dataKey="type"
                  stroke="#64748b"
                  tick={{ fontSize: 9, fontFamily: 'JetBrains Mono' }}
                  width={110}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0, 240, 255, 0.05)' }} />
                <Legend wrapperStyle={{ fontSize: '10px', fontFamily: 'JetBrains Mono', paddingTop: '10px' }} />
                <Bar dataKey="count" name="Total Suspects" fill="#38bdf8" radius={[0, 4, 4, 0]}>
                  {suspectVesselDistribution.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.type === 'Crude Oil Tanker' ? '#f43f5e' : entry.type === 'Chemical Tanker' ? '#f59e0b' : '#38bdf8'}
                    />
                  ))}
                </Bar>
                <Bar dataKey="critical" name="Prime Suspects (≥80%)" fill="#f43f5e" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Model Detection Metrics & Look-alike Separation Benchmarks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Model Metrics Table */}
        <div className="lg:col-span-2 tactical-corners p-5 bg-[#0d1524] space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck size={16} className="text-emerald-400" />
              <span className="font-mono text-xs font-semibold text-slate-200 uppercase tracking-wider">
                AI SAR DETECTION & LOOK-ALIKE REJECTION METRICS
              </span>
            </div>
            <span className="font-mono text-[9px] text-emerald-400">BENCHMARKED ON 14,850 CHIPS</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
            <div className="p-3 bg-slate-950/70 border border-slate-800 rounded">
              <span className="text-slate-400 text-[10px] block">PRECISION</span>
              <span className="text-xl font-bold text-emerald-400 mt-1 block">
                {formatPercent(modelDetectionMetrics.overall_precision * 100)}
              </span>
              <span className="text-[9px] text-slate-500">TP / (TP + FP)</span>
            </div>

            <div className="p-3 bg-slate-950/70 border border-slate-800 rounded">
              <span className="text-slate-400 text-[10px] block">RECALL / SENSITIVITY</span>
              <span className="text-xl font-bold text-cyan-400 mt-1 block">
                {formatPercent(modelDetectionMetrics.overall_recall * 100)}
              </span>
              <span className="text-[9px] text-slate-500">TP / (TP + FN)</span>
            </div>

            <div className="p-3 bg-slate-950/70 border border-slate-800 rounded">
              <span className="text-slate-400 text-[10px] block">F1 BALANCED SCORE</span>
              <span className="text-xl font-bold text-slate-100 mt-1 block">
                {formatPercent(modelDetectionMetrics.f1_score * 100)}
              </span>
              <span className="text-[9px] text-slate-500">Harmonic Mean</span>
            </div>

            <div className="p-3 bg-slate-950/70 border border-slate-800 rounded">
              <span className="text-slate-400 text-[10px] block">LOOK-ALIKE FAR</span>
              <span className="text-xl font-bold text-amber-400 mt-1 block">
                {formatPercent(modelDetectionMetrics.false_alarm_rate * 100)}
              </span>
              <span className="text-[9px] text-slate-500">False Alarm Rate</span>
            </div>
          </div>

          {/* Look-alike Breakdown Table */}
          <div className="mt-4">
            <span className="font-mono text-[10px] text-slate-400 uppercase tracking-widest block mb-2 font-semibold">
              LOOK-ALIKE DISCRIMINATION PERFORMANCE BY PHENOMENON
            </span>
            <div className="border border-slate-800 rounded overflow-hidden">
              <table className="w-full text-left font-mono text-xs">
                <thead className="bg-slate-900 border-b border-slate-800 text-[10px] text-slate-400">
                  <tr>
                    <th className="p-2.5">PHENOMENON / CHALLENGE</th>
                    <th className="p-2.5">SAMPLES TESTED</th>
                    <th className="p-2.5">AI REJECTION RATE</th>
                    <th className="p-2.5">DISCRIMINATING FEATURE</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {modelDetectionMetrics.lookalike_categories.map((cat, i) => (
                    <tr key={i} className="hover:bg-slate-800/30">
                      <td className="p-2.5 font-sans font-medium text-slate-200">{cat.name}</td>
                      <td className="p-2.5">{cat.count} chips</td>
                      <td className="p-2.5 text-emerald-400 font-bold">{cat.rejection_rate}%</td>
                      <td className="p-2.5 text-slate-400 text-[11px]">
                        {i === 0 && 'Perimeter gradient < 0.15 dB/m'}
                        {i === 1 && 'VV/VH depolarized backscatter balance'}
                        {i === 2 && 'Atmospheric attenuation radar mask'}
                        {i === 3 && 'Periodic wave wavelength Fourier peak'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Confusion Matrix Diagnostic Card */}
        <div className="tactical-corners p-5 bg-[#0d1524] space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Activity size={16} className="text-ocean-cyan" />
              <span className="font-mono text-xs font-semibold text-slate-200 uppercase tracking-wider">
                CONFUSION MATRIX
              </span>
            </div>
            <span className="font-mono text-[9px] text-slate-400">VALIDATION SET</span>
          </div>

          <p className="font-mono text-xs text-slate-400 leading-relaxed">
            Binary pixel-level classification outcomes against human radar analyst ground truth.
          </p>

          <div className="grid grid-cols-2 gap-2.5 font-mono text-xs mt-2">
            <div className="p-3 bg-slate-950 border border-emerald-500/40 rounded">
              <span className="text-[10px] text-emerald-400 block font-bold">TRUE POSITIVE (TP)</span>
              <span className="text-xl font-bold text-slate-100 mt-1 block">
                {modelDetectionMetrics.confusion_matrix.true_positive}
              </span>
              <span className="text-[9px] text-slate-500">Correctly Detected Slicks</span>
            </div>

            <div className="p-3 bg-slate-950 border border-slate-800 rounded">
              <span className="text-[10px] text-amber-400 block font-bold">FALSE POSITIVE (FP)</span>
              <span className="text-xl font-bold text-amber-400 mt-1 block">
                {modelDetectionMetrics.confusion_matrix.false_positive}
              </span>
              <span className="text-[9px] text-slate-500">Look-alike Misclassifications</span>
            </div>

            <div className="p-3 bg-slate-950 border border-slate-800 rounded">
              <span className="text-[10px] text-rose-400 block font-bold">FALSE NEGATIVE (FN)</span>
              <span className="text-xl font-bold text-rose-400 mt-1 block">
                {modelDetectionMetrics.confusion_matrix.false_negative}
              </span>
              <span className="text-[9px] text-slate-500">Undetected Thin Slicks</span>
            </div>

            <div className="p-3 bg-slate-950 border border-emerald-500/40 rounded">
              <span className="text-[10px] text-emerald-400 block font-bold">TRUE NEGATIVE (TN)</span>
              <span className="text-xl font-bold text-slate-100 mt-1 block">
                {modelDetectionMetrics.confusion_matrix.true_negative.toLocaleString()}
              </span>
              <span className="text-[9px] text-slate-500">Clean Sea Surface Tiles</span>
            </div>
          </div>

          <div className="p-3 bg-slate-950/80 border border-slate-800 rounded text-xs font-mono text-slate-300">
            <span className="text-ocean-cyan font-bold block mb-1">OPERATIONAL VERDICT:</span>
            System meets NATO STANAG & IMO requirements for autonomous offshore pollution alerting without human pre-screening.
          </div>
        </div>
      </div>
    </div>
  );
}
