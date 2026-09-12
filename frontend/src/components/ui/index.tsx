import React from 'react';
import { AlertCircle, CheckCircle, Clock } from 'lucide-react';

export const GlassCard = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <div className={`bg-navy-900/80 backdrop-blur-md border border-line rounded-xl overflow-hidden ${className}`}>
    {children}
  </div>
);

export const StatCard = ({ title, value, icon, trend }: { title: string; value: string | number; icon: React.ReactNode; trend?: string }) => (
  <GlassCard className="p-4 flex items-center gap-4">
    <div className="p-3 bg-navy-800 rounded-lg text-ocean">{icon}</div>
    <div>
      <div className="text-text-muted text-sm">{title}</div>
      <div className="text-2xl font-bold text-text flex items-baseline gap-2">
        {value}
        {trend && <span className="text-xs text-ocean-light">{trend}</span>}
      </div>
    </div>
  </GlassCard>
);

export const SeverityBadge = ({ severity }: { severity: string }) => {
  const colors: Record<string, string> = {
    critical: 'bg-danger/20 text-danger border-danger/30',
    high: 'bg-warning/20 text-warning border-warning/30',
    medium: 'bg-spill/20 text-spill border-spill/30',
    low: 'bg-safe/20 text-safe border-safe/30'
  };
  const cls = colors[severity] || 'bg-navy-800/20 text-text-muted border-line';
  return <span className={`px-2 py-1 text-xs rounded-full border uppercase tracking-wider font-semibold ${cls}`}>{severity}</span>;
};

export const StatusBadge = ({ status }: { status: string }) => {
  const colors: Record<string, string> = {
    detected: 'text-warning',
    investigating: 'text-ocean',
    resolved: 'text-safe',
    clear: 'text-safe',
    review: 'text-warning',
    suspect: 'text-danger'
  };
  const color = colors[status] || 'text-text-muted';
  return <span className={`text-sm font-medium ${color} capitalize flex items-center gap-1`}>
    {status === 'resolved' || status === 'clear' ? <CheckCircle size={14} /> : <Clock size={14} />} {status}
  </span>;
};

export const AlertItem = ({ alert }: { alert: any }) => (
  <div className="flex items-start gap-3 p-3 border-b border-line last:border-0 hover:bg-navy-800/50 transition-colors">
    <AlertCircle className={alert.severity === 'critical' ? 'text-danger' : alert.severity === 'high' ? 'text-warning' : 'text-ocean'} size={18} />
    <div>
      <div className="text-sm text-text">{alert.message}</div>
      <div className="text-xs text-text-muted mt-1">{new Date(alert.timestamp).toLocaleTimeString()}</div>
    </div>
  </div>
);

export const GuiltScoreBar = ({ score }: { score: number }) => {
  const color = score > 70 ? 'bg-danger' : score > 40 ? 'bg-warning' : 'bg-safe';
  return (
    <div className="w-full bg-navy-800 rounded-full h-2 mt-2 overflow-hidden border border-line">
      <div className={`h-full ${color}`} style={{ width: `${score}%` }} />
    </div>
  );
};
