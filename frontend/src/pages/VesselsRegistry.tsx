import { useState, useMemo, useEffect } from 'react';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Ship,
  ArrowUpDown,
  Loader2,
  Download,
  Eye,
  Filter,
  Radio,
  ShieldAlert,
  Compass,
  Anchor,
  X,
  Copy,
  Check,
} from 'lucide-react';
import { fetchVessels, type Vessel, type RiskLevel, type AISStatus } from '@/lib/db';
import {
  formatCoordinates,
  formatSpeed,
  formatCourse,
  formatMMSI,
  formatIMO,
  formatTimestampUTC,
} from '@/utils/formatters';

type FilterTab = 'ALL' | 'HIGH_RISK' | 'AIS_DISABLED' | 'TANKERS' | 'AOI';
type SortField = 'name' | 'mmsi' | 'type' | 'flag' | 'risk_score' | 'sog';

const riskBadges = (risk: RiskLevel) => {
  switch (risk) {
    case 'CRITICAL': return 'text-rose-400 border-rose-500/40 bg-rose-950/30';
    case 'HIGH': return 'text-amber-400 border-amber-500/40 bg-amber-950/30';
    case 'MEDIUM': return 'text-sky-400 border-sky-500/40 bg-sky-950/30';
    case 'LOW': return 'text-emerald-400 border-emerald-500/40 bg-emerald-950/30';
  }
};

const aisBadges = (status: AISStatus) => {
  switch (status) {
    case 'ACTIVE': return 'text-emerald-400 border-emerald-500/40 bg-emerald-950/20';
    case 'INTERMITTENT': return 'text-amber-400 border-amber-500/40 bg-amber-950/20';
    case 'SILENT': return 'text-rose-400 border-rose-500/40 bg-rose-950/30 pulse-red';
  }
};

export default function VesselsRegistry() {
  const [vessels, setVessels] = useState<Vessel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTab>('ALL');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(12);
  const [sortField, setSortField] = useState<SortField>('risk_score');
  const [sortAsc, setSortAsc] = useState(false);

  // Inspect track modal state
  const [inspectedVessel, setInspectedVessel] = useState<Vessel | null>(null);
  const [copiedMmsi, setCopiedMmsi] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchVessels();
        setVessels(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load vessels');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Filter & Sort Pipeline
  const filtered = useMemo(() => {
    let result = vessels;

    // Quick Filter Tabs
    switch (activeTab) {
      case 'HIGH_RISK':
        result = result.filter((v) => v.risk === 'CRITICAL' || v.risk === 'HIGH');
        break;
      case 'AIS_DISABLED':
        result = result.filter((v) => v.ais_status === 'SILENT' || v.ais_status === 'INTERMITTENT');
        break;
      case 'TANKERS':
        result = result.filter((v) => v.type.toLowerCase().includes('tanker'));
        break;
      case 'AOI':
        result = result.filter((v) => v.in_spill_aoi);
        break;
      default:
        break;
    }

    // Search query
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (v) =>
          v.mmsi.toLowerCase().includes(q) ||
          v.name.toLowerCase().includes(q) ||
          v.type.toLowerCase().includes(q) ||
          v.flag.toLowerCase().includes(q) ||
          (v.imo ?? '').toLowerCase().includes(q) ||
          (v.callsign ?? '').toLowerCase().includes(q)
      );
    }

    // Sort
    return [...result].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'name': cmp = a.name.localeCompare(b.name); break;
        case 'mmsi': cmp = a.mmsi.localeCompare(b.mmsi); break;
        case 'type': cmp = a.type.localeCompare(b.type); break;
        case 'flag': cmp = a.flag.localeCompare(b.flag); break;
        case 'risk_score': cmp = (a.risk_score ?? 0) - (b.risk_score ?? 0); break;
        case 'sog': cmp = (a.sog ?? 0) - (b.sog ?? 0); break;
      }
      return sortAsc ? cmp : -cmp;
    });
  }, [vessels, search, activeTab, sortField, sortAsc]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const pageData = filtered.slice(page * pageSize, (page + 1) * pageSize);

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false); // default descending for risk/speeds
    }
  };

  const copyMmsi = (mmsi: string) => {
    navigator.clipboard.writeText(mmsi);
    setCopiedMmsi(mmsi);
    setTimeout(() => setCopiedMmsi(null), 1500);
  };

  // Export CSV
  const exportCSV = () => {
    const headers = ['MMSI', 'Name', 'IMO', 'Type', 'Flag', 'Latitude', 'Longitude', 'SOG_knots', 'COG_deg', 'AIS_Status', 'Risk_Score', 'In_AOI', 'Last_Seen_UTC'];
    const rows = filtered.map((v) => [
      v.mmsi,
      `"${v.name}"`,
      v.imo || '',
      `"${v.type}"`,
      `"${v.flag}"`,
      v.lat.toFixed(5),
      v.lng.toFixed(5),
      v.sog.toFixed(1),
      v.cog.toFixed(0),
      v.ais_status,
      v.risk_score ?? 0,
      v.in_spill_aoi ? 'YES' : 'NO',
      v.last_seen,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `OceanGuard_Vessels_Registry_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const SortHeader = ({ field, label, className = '' }: { field: SortField; label: string; className?: string }) => (
    <th className={`px-3 py-2 text-left cursor-pointer hover:text-ocean-cyan transition-colors select-none ${className}`}>
      <button onClick={() => handleSort(field)} className="flex items-center gap-1 font-mono text-[10px] text-slate-400 tracking-wider uppercase">
        <span>{label}</span>
        <ArrowUpDown size={10} className={sortField === field ? 'text-ocean-cyan' : 'text-slate-600'} />
      </button>
    </th>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-[#0a0f18]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={32} className="animate-spin text-ocean-cyan" />
          <span className="font-mono text-xs tracking-widest text-slate-400 uppercase">
            CONNECTING TO GLOBAL AIS VESSEL REGISTRY...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5 bg-[#0a0f18] min-h-full select-none text-slate-100">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="font-sans text-xl font-bold text-slate-100 tracking-wide">Maritime Vessels Registry</h2>
            <span className="font-mono text-[10px] px-2 py-0.5 bg-cyan-950 border border-cyan-500/40 text-ocean-cyan rounded">
              LIVE AIS FEED
            </span>
          </div>
          <p className="font-mono text-xs text-slate-400">
            [ {vessels.length} TARGETS TRACKED ] • UNCLOS EEZ SURVEILLANCE & ATTRIBUTION CORRELATION
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={exportCSV}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-ocean-cyan text-slate-200 hover:text-ocean-cyan font-mono text-xs flex items-center gap-2 transition-colors rounded shadow-lg"
          >
            <Download size={13} />
            <span>EXPORT REGISTRY CSV</span>
          </button>
        </div>
      </div>

      {/* Quick Filter Tabs */}
      <div className="flex items-center gap-1.5 border-b border-slate-800 pb-3 overflow-x-auto">
        <button
          onClick={() => { setActiveTab('ALL'); setPage(0); }}
          className={`px-3 py-1.5 rounded font-mono text-xs transition-colors ${
            activeTab === 'ALL'
              ? 'bg-cyan-950 text-ocean-cyan border border-cyan-500/40 font-semibold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
          }`}
        >
          All Vessels ({vessels.length})
        </button>
        <button
          onClick={() => { setActiveTab('HIGH_RISK'); setPage(0); }}
          className={`px-3 py-1.5 rounded font-mono text-xs flex items-center gap-1.5 transition-colors ${
            activeTab === 'HIGH_RISK'
              ? 'bg-rose-950/60 text-rose-400 border border-rose-500/50 font-semibold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
          High Risk ({vessels.filter((v) => v.risk === 'CRITICAL' || v.risk === 'HIGH').length})
        </button>
        <button
          onClick={() => { setActiveTab('AIS_DISABLED'); setPage(0); }}
          className={`px-3 py-1.5 rounded font-mono text-xs flex items-center gap-1.5 transition-colors ${
            activeTab === 'AIS_DISABLED'
              ? 'bg-amber-950/60 text-amber-400 border border-amber-500/50 font-semibold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
          }`}
        >
          <Radio size={12} className="text-amber-400" />
          AIS Disabled / Dark ({vessels.filter((v) => v.ais_status === 'SILENT' || v.ais_status === 'INTERMITTENT').length})
        </button>
        <button
          onClick={() => { setActiveTab('TANKERS'); setPage(0); }}
          className={`px-3 py-1.5 rounded font-mono text-xs transition-colors ${
            activeTab === 'TANKERS'
              ? 'bg-cyan-950 text-ocean-cyan border border-cyan-500/40 font-semibold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
          }`}
        >
          Tankers Only ({vessels.filter((v) => v.type.toLowerCase().includes('tanker')).length})
        </button>
        <button
          onClick={() => { setActiveTab('AOI'); setPage(0); }}
          className={`px-3 py-1.5 rounded font-mono text-xs transition-colors ${
            activeTab === 'AOI'
              ? 'bg-cyan-950 text-ocean-cyan border border-cyan-500/40 font-semibold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
          }`}
        >
          Within Spill AOI ({vessels.filter((v) => v.in_spill_aoi).length})
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:max-w-md">
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            placeholder="Search by MMSI, vessel name, IMO, type, or flag..."
            className="w-full bg-[#0d1524] border border-slate-800 px-3 py-2 pl-9 font-mono text-xs text-slate-100 placeholder:text-slate-500 focus:border-cyan-500/50 focus:outline-none transition-colors rounded"
          />
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        </div>

        <div className="flex items-center gap-3 self-end sm:self-auto text-xs font-mono text-slate-400">
          <span>MATCHING TARGETS: <span className="text-ocean-cyan font-bold">{filtered.length}</span></span>
          <span>•</span>
          <div className="flex items-center gap-1.5">
            <span>SHOW:</span>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(0); }}
              className="bg-[#0d1524] border border-slate-800 text-slate-200 px-1.5 py-1 rounded text-xs"
            >
              <option value={10}>10</option>
              <option value={12}>12</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-[#0d1524] border border-slate-800 rounded shadow-xl overflow-hidden tactical-corners">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/60">
                <SortHeader field="mmsi" label="MMSI" />
                <SortHeader field="name" label="VESSEL NAME & IMO" />
                <SortHeader field="flag" label="FLAG STATE" />
                <SortHeader field="type" label="VESSEL TYPE" />
                <th className="px-3 py-2.5 font-mono text-[10px] text-slate-400 uppercase tracking-wider">COORDINATES</th>
                <SortHeader field="sog" label="SOG / COG" />
                <th className="px-3 py-2.5 font-mono text-[10px] text-slate-400 uppercase tracking-wider">AIS STATUS</th>
                <SortHeader field="risk_score" label="RISK SCORE" />
                <th className="px-3 py-2.5 font-mono text-[10px] text-slate-400 uppercase tracking-wider text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50 font-mono text-xs">
              {pageData.map((v) => {
                const isHighRisk = v.risk === 'CRITICAL' || v.risk === 'HIGH';
                return (
                  <tr
                    key={v.id}
                    className="hover:bg-slate-800/30 transition-colors group"
                  >
                    {/* MMSI */}
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-ocean-cyan font-medium">{formatMMSI(v.mmsi)}</span>
                        <button
                          onClick={() => copyMmsi(v.mmsi)}
                          className="text-slate-600 hover:text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Copy MMSI"
                        >
                          {copiedMmsi === v.mmsi ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                        </button>
                      </div>
                    </td>

                    {/* Name & IMO */}
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <Ship size={13} className={isHighRisk ? 'text-rose-400' : 'text-slate-400'} />
                        <span className="font-sans text-xs font-semibold text-slate-200 group-hover:text-ocean-cyan transition-colors">
                          {v.name}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500 block">{formatIMO(v.imo)}</span>
                    </td>

                    {/* Flag */}
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <span className="px-1 py-0.2 bg-slate-900 border border-slate-700 text-[10px] font-bold text-slate-300 rounded">
                          {v.flag_code}
                        </span>
                        <span className="text-slate-300 font-sans text-xs">{v.flag}</span>
                      </div>
                    </td>

                    {/* Type */}
                    <td className="px-3 py-2.5">
                      <span className="text-slate-300 font-sans text-xs">{v.type}</span>
                      {v.dwt && <span className="text-[10px] text-slate-500 block">{v.dwt.toLocaleString()} DWT</span>}
                    </td>

                    {/* Coordinates */}
                    <td className="px-3 py-2.5 text-[11px] text-slate-300">
                      {formatCoordinates(v.lat, v.lng)}
                    </td>

                    {/* SOG / COG */}
                    <td className="px-3 py-2.5 text-[11px]">
                      <span className="text-slate-100 font-medium">{formatSpeed(v.sog)}</span>
                      <span className="text-slate-500 block">{formatCourse(v.cog)}</span>
                    </td>

                    {/* AIS Status */}
                    <td className="px-3 py-2.5">
                      <span className={`status-badge text-[9px] ${aisBadges(v.ais_status)}`}>
                        {v.ais_status}
                      </span>
                    </td>

                    {/* Risk Score */}
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-12 h-1.5 bg-slate-900 rounded overflow-hidden">
                          <div
                            className="h-full"
                            style={{
                              width: `${v.risk_score ?? 20}%`,
                              backgroundColor:
                                (v.risk_score ?? 0) >= 80 ? '#f43f5e' :
                                (v.risk_score ?? 0) >= 50 ? '#f59e0b' : '#10b981',
                            }}
                          />
                        </div>
                        <span className={`status-badge text-[9px] ${riskBadges(v.risk)}`}>
                          {v.risk} ({v.risk_score ?? 0})
                        </span>
                      </div>
                    </td>

                    {/* Quick Action: Inspect Track */}
                    <td className="px-3 py-2.5 text-right">
                      <button
                        onClick={() => setInspectedVessel(v)}
                        className="px-2.5 py-1 bg-slate-900 hover:bg-cyan-950/60 border border-slate-700 hover:border-cyan-500/50 text-slate-300 hover:text-ocean-cyan text-[11px] font-mono flex items-center gap-1 ml-auto transition-colors rounded"
                      >
                        <Eye size={12} />
                        <span>Inspect Track</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="px-4 py-3 border-t border-slate-800 bg-slate-900/40 flex items-center justify-between font-mono text-xs">
          <span className="text-slate-400">
            SHOWING {pageData.length > 0 ? page * pageSize + 1 : 0} TO {Math.min((page + 1) * pageSize, filtered.length)} OF {filtered.length} TARGETS
          </span>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="p-1 border border-slate-800 rounded text-slate-300 hover:border-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={15} />
            </button>
            <span className="px-2 text-slate-300">
              PAGE {page + 1} OF {totalPages || 1}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="p-1 border border-slate-800 rounded text-slate-300 hover:border-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Vessel Track Inspection Modal ───────────────────────────────── */}
      {inspectedVessel && (
        <div className="fixed inset-0 z-[3000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-[#0d1524] border border-slate-700 shadow-2xl rounded p-6 tactical-corners space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <Ship size={22} className="text-ocean-cyan" />
                <div>
                  <h3 className="font-sans text-base font-bold text-slate-100">{inspectedVessel.name}</h3>
                  <p className="font-mono text-xs text-slate-400">
                    MMSI: {formatMMSI(inspectedVessel.mmsi)} • {formatIMO(inspectedVessel.imo)} • FLAG: {inspectedVessel.flag}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setInspectedVessel(null)}
                className="p-1.5 border border-slate-800 text-slate-400 hover:text-slate-100 rounded"
              >
                <X size={16} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 font-mono text-xs">
              <div className="bg-slate-950/70 p-3 border border-slate-800 rounded">
                <span className="text-slate-400 text-[10px] block">CURRENT POSITION</span>
                <span className="text-slate-100 font-semibold">{formatCoordinates(inspectedVessel.lat, inspectedVessel.lng)}</span>
              </div>
              <div className="bg-slate-950/70 p-3 border border-slate-800 rounded">
                <span className="text-slate-400 text-[10px] block">SPEED & HEADING</span>
                <span className="text-slate-100 font-semibold">{formatSpeed(inspectedVessel.sog)} @ {formatCourse(inspectedVessel.cog)}</span>
              </div>
              <div className="bg-slate-950/70 p-3 border border-slate-800 rounded">
                <span className="text-slate-400 text-[10px] block">DESTINATION / ETA</span>
                <span className="text-cyan-400 font-semibold">{inspectedVessel.destination || 'UNSPECIFIED'} ({inspectedVessel.eta || 'N/A'})</span>
              </div>
              <div className="bg-slate-950/70 p-3 border border-slate-800 rounded">
                <span className="text-slate-400 text-[10px] block">RISK EVALUATION</span>
                <span className="text-amber-400 font-semibold">{inspectedVessel.risk} ({inspectedVessel.risk_score ?? 0} pts)</span>
              </div>
            </div>

            {/* Historical track points */}
            <div>
              <span className="font-mono text-[10px] text-slate-400 uppercase tracking-widest block mb-1.5 font-semibold">
                HISTORICAL AIS BREADCRUMBS
              </span>
              <div className="bg-slate-950 border border-slate-800 rounded max-h-48 overflow-y-auto font-mono text-xs">
                {inspectedVessel.track_history && inspectedVessel.track_history.length > 0 ? (
                  <table className="w-full text-left">
                    <thead className="bg-slate-900 border-b border-slate-800 text-[10px] text-slate-400">
                      <tr>
                        <th className="p-2">WAYPOINT</th>
                        <th className="p-2">COORDINATES</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {inspectedVessel.track_history.map((pt, i) => (
                        <tr key={i}>
                          <td className="p-2 text-cyan-400">FIX #{i + 1}</td>
                          <td className="p-2 text-slate-300">{formatCoordinates(pt[0], pt[1])}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="p-3 text-slate-500 text-center">No additional historical track points recorded.</p>
                )}
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setInspectedVessel(null)}
                className="px-4 py-1.5 bg-slate-900 border border-slate-700 hover:border-cyan-500/50 text-slate-200 font-mono text-xs rounded"
              >
                CLOSE INSPECTOR
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
