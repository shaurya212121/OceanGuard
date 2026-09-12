import React from 'react';
import { AlertCircle, CheckCircle, Clock } from 'lucide-react';

export const GlassCard = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <div className={`bg-navy-900 border border-line relative ${className}`}>
    {/* Corner Ticks */}
    <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-ocean -translate-x-[1px] -translate-y-[1px]" />
    <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-ocean translate-x-[1px] -translate-y-[1px]" />
    <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-ocean -translate-x-[1px] translate-y-[1px]" />
    <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-ocean translate-x-[1px] translate-y-[1px]" />
    {children}
  </div>
);

export const StatCard = ({ title, value, icon, trend }: { title: string; value: string | number; icon: React.ReactNode; trend?: string }) => (
  <GlassCard className="p-4 flex items-center gap-4">
    <div className="p-3 bg-navy-800 border border-line text-ocean">{icon}</div>
    <div>
      <div className="text-text-muted text-sm uppercase tracking-wider">{title}</div>
      <div className="text-2xl font-mono text-text flex items-baseline gap-2">
        {value}
        {trend && <span className="text-xs text-ocean font-sans">{trend}</span>}
      </div>
    </div>
  </GlassCard>
);

export const SeverityBadge = ({ severity }: { severity: string }) => {
  const isCritical = severity === 'critical';
  const color = isCritical ? 'text-danger' : severity === 'low' ? 'text-safe' : 'text-ocean';
  return (
    <span className={`text-sm font-mono uppercase font-semibold ${color}`}>
      [ {severity} ]
    </span>
  );
};

export const StatusBadge = ({ status }: { status: string }) => {
  const isResolved = status === 'resolved' || status === 'clear';
  const isSuspect = status === 'suspect';
  const color = isResolved ? 'text-safe' : isSuspect ? 'text-danger' : 'text-ocean';
  return (
    <span className={`text-sm font-mono uppercase font-semibold flex items-center gap-1 ${color}`}>
      [ {status} ]
    </span>
  );
};

export const AlertItem = ({ alert }: { alert: any }) => (
  <div className="flex items-start gap-3 p-3 border-b border-line last:border-0 hover:bg-navy-800 transition-colors">
    <AlertCircle className={alert.severity === 'critical' ? 'text-danger' : alert.severity === 'high' ? 'text-warning' : 'text-ocean'} size={18} />
    <div>
      <div className="text-sm text-text font-medium">{alert.message}</div>
      <div className="text-xs text-text-muted mt-1 font-mono">{new Date(alert.timestamp).toLocaleTimeString()}</div>
    </div>
  </div>
);

export const GuiltScoreBar = ({ score }: { score: number }) => {
  const color = score > 70 ? 'bg-danger' : score > 40 ? 'bg-warning' : 'bg-safe';
  return (
    <div className="w-full bg-navy-950 h-1 mt-2 border-y border-line">
      <div className={`h-full ${color}`} style={{ width: `${score}%` }} />
    </div>
  );
};
