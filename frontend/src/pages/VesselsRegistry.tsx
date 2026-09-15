import { useState, useMemo, useEffect } from 'react';
import { Search, ChevronLeft, ChevronRight, Ship, ArrowUpDown, Loader2 } from 'lucide-react';
import { fetchVessels, type Vessel, type RiskLevel } from '@/lib/db';

const PAGE_SIZE = 12;

const riskBadge = (risk: RiskLevel) => {
  switch (risk) {
    case 'CRITICAL': return 'text-ocean-red border-ocean-red/40 bg-ocean-red/5';
    case 'HIGH': return 'text-ocean-amber border-ocean-amber/40 bg-ocean-amber/5';
    case 'MEDIUM': return 'text-ocean-sky border-ocean-sky/40 bg-ocean-sky/5';
    case 'LOW': return 'text-ocean-green border-ocean-green/40 bg-ocean-green/5';
  }
};

type SortField = 'name' | 'mmsi' | 'type' | 'flag' | 'risk';

export default function VesselsRegistry() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortAsc, setSortAsc] = useState(true);
  const [vessels, setVessels] = useState<Vessel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const filtered = useMemo(() => {
    let result = vessels;

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (v) =>
          v.mmsi.includes(q) ||
          v.name.toLowerCase().includes(q) ||
          v.type.toLowerCase().includes(q) ||
          v.flag.toLowerCase().includes(q) ||
          (v.imo ?? '').includes(q)
      );
    }

    const sorted = [...result].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'name': cmp = a.name.localeCompare(b.name); break;
        case 'mmsi': cmp = a.mmsi.localeCompare(b.mmsi); break;
        case 'type': cmp = a.type.localeCompare(b.type); break;
        case 'flag': cmp = a.flag.localeCompare(b.flag); break;
        case 'risk':
          const riskOrder: Record<RiskLevel, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
          cmp = riskOrder[a.risk] - riskOrder[b.risk];
          break;
      }
      return sortAsc ? cmp : -cmp;
    });

    return sorted;
  }, [vessels, search, sortField, sortAsc]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageData = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const SortHeader = ({ field, label, className = '' }: { field: SortField; label: string; className?: string }) => (
    <th className={`px-3 py-2 text-left cursor-pointer hover:text-ocean-cyan transition-colors ${className}`}>
      <button onClick={() => handleSort(field)} className="flex items-center gap-1">
        <span>{label}</span>
        <ArrowUpDown size={10} strokeWidth={1.5} className={sortField === field ? 'text-ocean-cyan' : 'text-ocean-text-muted'} />
      </button>
    </th>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 size={24} className="animate-spin text-ocean-cyan" />
        <span className="font-mono text-sm text-ocean-text-dim ml-3">LOADING VESSEL REGISTRY...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="tactical-corners p-6 max-w-md">
          <p className="font-mono text-sm text-ocean-red mb-2">[ DATA LINK ERROR ]</p>
          <p className="font-sans text-sm text-ocean-text-dim">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-sans text-xl font-semibold text-ocean-text tracking-wide">Vessel Registry</h2>
          <p className="font-mono text-[11px] text-ocean-text-muted mt-1">
            [ {vessels.length} VESSELS TRACKED ] — AIS DATA FEED — LIVE
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="status-badge text-ocean-cyan border-ocean-cyan/40 bg-ocean-cyan/5">
            <span className="w-1.5 h-1.5 bg-ocean-cyan rounded-full blink" />
            AIS LIVE
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            placeholder="Search by MMSI, name, IMO, type, or flag..."
            className="w-full bg-ocean-panel border border-ocean-border px-3 py-2.5 pl-9 font-mono text-sm text-ocean-text placeholder:text-ocean-text-muted focus:border-ocean-cyan/40 focus:outline-none transition-colors"
          />
          <Search size={14} strokeWidth={1.5} className="absolute left-3 top-1/2 -translate-y-1/2 text-ocean-text-muted" />
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] text-ocean-text-muted">RESULTS:</span>
          <span className="font-mono text-sm text-ocean-cyan">{filtered.length}</span>
        </div>
      </div>

      {/* Table */}
      <div className="tactical-corners overflow-visible">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-ocean-border bg-ocean-panel-light">
                <SortHeader field="mmsi" label="MMSI" />
                <SortHeader field="name" label="VESSEL NAME" />
                <SortHeader field="type" label="TYPE" />
                <SortHeader field="flag" label="FLAG" />
                <th className="px-3 py-2 text-left font-mono text-[10px] text-ocean-text-muted tracking-widest">COORDINATES</th>
                <th className="px-3 py-2 text-left font-mono text-[10px] text-ocean-text-muted tracking-widest">SOG / COG</th>
                <SortHeader field="risk" label="RISK" />
                <th className="px-3 py-2 text-left font-mono text-[10px] text-ocean-text-muted tracking-widest">LAST SEEN</th>
              </tr>
            </thead>
            <tbody>
              {pageData.map((v: Vessel, i) => (
                <tr
                  key={v.id}
                  className={`border-b border-ocean-border/40 hover:border-ocean-cyan/30 transition-colors duration-150 ${
                    i % 2 === 0 ? 'bg-ocean-panel/30' : ''
                  }`}
                >
                  <td className="px-3 py-2.5">
                    <span className="font-mono text-xs text-ocean-cyan">{v.mmsi}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <Ship size={12} strokeWidth={1.5} className="text-ocean-text-muted" />
                      <span className="font-sans text-sm text-ocean-text">{v.name}</span>
                    </div>
                    <span className="font-mono text-[9px] text-ocean-text-muted">IMO {v.imo ?? '—'}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="font-sans text-xs text-ocean-text-dim">{v.type}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="font-sans text-xs text-ocean-text-dim">{v.flag}</span>
                    <span className="font-mono text-[9px] text-ocean-text-muted block">{v.flag_code}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="font-mono text-[11px] text-ocean-text-dim">
                      {v.lat.toFixed(4)}°N
                    </span>
                    <span className="font-mono text-[11px] text-ocean-text-dim block">
                      {v.lng.toFixed(4)}°E
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="font-mono text-[11px] text-ocean-text">{v.sog.toFixed(1)} kts</span>
                    <span className="font-mono text-[11px] text-ocean-text-muted block">{v.cog}°</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`status-badge ${riskBadge(v.risk)}`}>{v.risk}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="font-mono text-[10px] text-ocean-text-muted">
                      {v.last_seen.slice(11, 19)}Z
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-ocean-border">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] text-ocean-text-muted">
              PAGE {page + 1} OF {totalPages || 1} — SHOWING {pageData.length} OF {filtered.length}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              className="p-1.5 border border-ocean-border text-ocean-text-dim hover:border-ocean-cyan/40 hover:text-ocean-text transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={14} strokeWidth={1.5} />
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
              const pageNum = i;
              return (
                <button
                  key={i}
                  onClick={() => setPage(pageNum)}
                  className={`w-7 h-7 font-mono text-[10px] border transition-colors ${
                    page === pageNum
                      ? 'border-ocean-cyan/40 bg-ocean-cyan/5 text-ocean-cyan'
                      : 'border-ocean-border text-ocean-text-dim hover:border-ocean-cyan/30'
                  }`}
                >
                  {pageNum + 1}
                </button>
              );
            })}
            <button
              onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
              disabled={page >= totalPages - 1}
              className="p-1.5 border border-ocean-border text-ocean-text-dim hover:border-ocean-cyan/40 hover:text-ocean-text transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight size={14} strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
