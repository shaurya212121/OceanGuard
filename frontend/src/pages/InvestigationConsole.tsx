import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MapContainer, TileLayer, Polyline, CircleMarker, Polygon, Popup, LayersControl, LayerGroup } from 'react-leaflet';
import { fetchScenario, fetchDossierReportUrl } from '../api/client';
import type { SpillScenario } from '../types';
import { GlassCard, SeverityBadge, StatusBadge, GuiltScoreBar } from '../components/ui';
import { Crosshair, Wind, Navigation, Satellite, ShieldCheck, Download, CheckCircle2, AlertTriangle, Layers, Cpu } from 'lucide-react';

export default function InvestigationConsole() {
  const { id } = useParams();
  const [scenario, setScenario] = useState<SpillScenario | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState<'DETECT' | 'CHARACTERIZE' | 'TRACE' | 'ATTRIBUTE' | 'VERIFY' | 'REPORT'>('CHARACTERIZE');

  useEffect(() => {
    if (id) {
      setLoading(true);
      fetchScenario(id)
        .then(data => {
          setScenario(data);
          setLoading(false);
        })
        .catch(err => {
          console.error(err);
          setError('Failed to load scenario data.');
          setLoading(false);
        });
    }
  }, [id]);

  if (loading) return <div className="p-6 text-center text-text-muted">Loading investigation console...</div>;
  if (error || !scenario) return <div className="p-6 text-center text-danger">{error || 'Scenario not found'}</div>;

  const { spill, drift, suspects } = scenario;

  const backwardPath = drift.backward_path.map(p => [p.lat, p.lon] as [number, number]);
  const forwardPath = drift.forward_path.map(p => [p.lat, p.lon] as [number, number]);
  const sortedSuspects = [...suspects].sort((a, b) => b.attribution_evidence_score - a.attribution_evidence_score);

  const steps = ['DETECT', 'CHARACTERIZE', 'TRACE', 'ATTRIBUTE', 'VERIFY', 'REPORT'];

  return (
    <div className="h-full flex flex-col gap-6">
      {/* Incident Header & Stepper */}
      <div className="bg-navy-900 border border-line p-4 rounded-xl space-y-4">
        <div className="flex flex-wrap justify-between items-center gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-text-muted font-mono bg-navy-950 px-2 py-0.5 rounded border border-line">
                INCIDENT ID: {spill.id}
              </span>
              <span className="text-xs font-mono text-warning font-bold bg-navy-950 px-2 py-0.5 rounded border border-line">
                PROVENANCE: {spill.provenance?.data_type || 'SYNTHETIC_DEMO_DATA'}
              </span>
            </div>
            <h2 className="text-2xl font-bold mt-1">{spill.name}</h2>
          </div>
          
          <div className="flex items-center gap-3">
            <SeverityBadge severity={spill.severity} />
            <StatusBadge status={spill.status} />
            <a
              href={fetchDossierReportUrl(spill.id, 'html')}
              target="_blank"
              rel="noreferrer"
              className="bg-ocean/20 hover:bg-ocean/30 text-ocean border border-ocean px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Download size={14} /> Export Dossier
            </a>
          </div>
        </div>

        {/* Workflow Stepper Bar */}
        <div className="grid grid-cols-6 gap-2 border-t border-line pt-3 text-center text-xs font-mono">
          {steps.map((step, idx) => (
            <button
              key={step}
              onClick={() => setActiveStep(step as any)}
              className={`py-2 rounded border transition-all ${
                activeStep === step
                  ? 'bg-ocean text-navy-950 font-bold border-ocean shadow-[0_0_10px_rgba(0,240,255,0.3)]'
                  : 'bg-navy-950 text-text-muted border-line hover:border-ocean hover:text-text'
              }`}
            >
              {idx + 1}. {step}
            </button>
          ))}
        </div>
      </div>

      {/* Main Console View */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-5 gap-6 min-h-[600px]">
        {/* Map View */}
        <GlassCard className="lg:col-span-3 flex flex-col relative z-0">
          <div className="p-3 border-b border-line flex justify-between items-center text-xs bg-navy-800 font-mono">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5 text-ocean"><Satellite size={14}/> Observed Slick</span>
              <span className="flex items-center gap-1.5 text-danger"><Crosshair size={14}/> Source Region</span>
              <span className="flex items-center gap-1.5 text-teal"><Wind size={14}/> Particle Drift</span>
            </div>
            <div className="text-text-muted">Multi-Layer Synchronized Map</div>
          </div>
          <div className="flex-1 bg-navy-950">
            <MapContainer center={[spill.center_lat, spill.center_lon]} zoom={9} className="h-full w-full">
              <LayersControl position="topright">
                <LayersControl.BaseLayer checked name="Dark Canvas">
                  <LayerGroup>
                    <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}" />
                    <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}" />
                  </LayerGroup>
                </LayersControl.BaseLayer>
                <LayersControl.BaseLayer name="Satellite Imagery">
                  <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
                </LayersControl.BaseLayer>

                <LayersControl.Overlay checked name="Observed Slick Polygon">
                  <LayerGroup>
                    {spill.polygon_coords && spill.polygon_coords.length > 0 && (
                      <Polygon
                        positions={spill.polygon_coords as [number, number][]}
                        pathOptions={{ color: spill.severity === 'critical' ? '#FF2A5F' : '#00F0FF', fillColor: spill.severity === 'critical' ? '#FF2A5F' : '#00F0FF', fillOpacity: 0.25, weight: 2 }}
                      />
                    )}
                  </LayerGroup>
                </LayersControl.Overlay>

                <LayersControl.Overlay checked name="Probable Source Region (Convex Hull)">
                  <LayerGroup>
                    {drift.source_region && drift.source_region.polygon_coords && (
                      <Polygon
                        positions={drift.source_region.polygon_coords as [number, number][]}
                        pathOptions={{ color: '#FF2A5F', fillColor: '#FF2A5F', fillOpacity: 0.15, dashArray: '4, 4', weight: 1.5 }}
                      />
                    )}
                  </LayerGroup>
                </LayersControl.Overlay>

                <LayersControl.Overlay checked name="Hindcast & Forecast Drift Paths">
                  <LayerGroup>
                    <Polyline positions={backwardPath} pathOptions={{ color: '#00F0FF', dashArray: '5, 5', weight: 2 }} />
                    <Polyline positions={forwardPath} pathOptions={{ color: '#0EA5E9', weight: 2 }} />
                    <CircleMarker center={[drift.origin_estimate.lat, drift.origin_estimate.lon]} radius={6} pathOptions={{ color: '#FF2A5F', fillColor: '#FF2A5F', fillOpacity: 1, weight: 2 }}>
                      <Popup>
                        <div className="p-1 font-bold text-navy-950 text-xs">
                          Estimated Source Region Centroid
                        </div>
                      </Popup>
                    </CircleMarker>
                  </LayerGroup>
                </LayersControl.Overlay>
              </LayersControl>
            </MapContainer>
          </div>
        </GlassCard>

        {/* Sidebar Information / Attribution Panel */}
        <div className="lg:col-span-2 flex flex-col gap-6 overflow-auto">
          {/* Characterization Details */}
          <GlassCard className="p-4 space-y-3">
            <h3 className="font-bold text-lg flex items-center gap-2 text-ocean">
              <Cpu size={18} /> SAR Slick Characterization
            </h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-navy-950 p-2 rounded border border-line">
                <div className="text-text-muted">Surface Area</div>
                <div className="font-mono text-text font-bold text-sm">{spill.area_sq_km} km²</div>
              </div>
              <div className="bg-navy-950 p-2 rounded border border-line">
                <div className="text-text-muted">Est. Volume</div>
                <div className="font-mono text-text font-bold text-sm">{spill.estimated_volume_liters.toLocaleString()} L</div>
              </div>
              <div className="bg-navy-950 p-2 rounded border border-line">
                <div className="text-text-muted">Detection Sensor</div>
                <div className="font-mono text-teal font-bold">{spill.characterization?.sensor || 'Sentinel-1 C-SAR'}</div>
              </div>
              <div className="bg-navy-950 p-2 rounded border border-line">
                <div className="text-text-muted">Classification Conf.</div>
                <div className="font-mono text-safe font-bold">{spill.characterization?.confidence || 94.5}%</div>
              </div>
            </div>

            {/* Look-Alike Breakdown */}
            {spill.characterization?.lookalike_probs && (
              <div className="bg-navy-950 p-3 rounded-lg border border-line text-xs space-y-1.5">
                <div className="font-bold text-text mb-1">Look-Alike Rejection Classifier</div>
                <div className="flex justify-between">
                  <span className="text-safe font-semibold">• Oil Spill:</span>
                  <span className="font-mono text-text">{spill.characterization.lookalike_probs.oil_spill}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">• Low Wind Area:</span>
                  <span className="font-mono text-text">{spill.characterization.lookalike_probs.low_wind_area}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">• Ship Wake:</span>
                  <span className="font-mono text-text">{spill.characterization.lookalike_probs.ship_wake}%</span>
                </div>
              </div>
            )}
          </GlassCard>

          {/* Explainable Attribution Candidates */}
          <GlassCard className="p-4 flex-1 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <ShieldCheck className="text-ocean" /> Candidate Vessel Attribution
              </h3>
              <span className="text-[10px] text-text-muted font-mono uppercase bg-navy-950 px-2 py-0.5 rounded border border-line">
                Multi-Factor Engine
              </span>
            </div>

            {/* Legal Disclaimer */}
            <div className="text-[10px] text-text-muted bg-navy-950 p-2.5 rounded border border-line leading-tight flex items-start gap-2">
              <AlertTriangle className="text-warning shrink-0 mt-0.5" size={14} />
              <div>
                Ranking represents physical and temporal consistency with available evidence and is not legal proof of responsibility.
              </div>
            </div>

            <div className="space-y-4">
              {sortedSuspects.map((suspect, idx) => (
                <div key={suspect.mmsi} className="bg-navy-950 p-3 rounded-lg border border-line space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-bold text-text flex items-center gap-2">
                        <span className="text-xs text-ocean font-mono">#{idx + 1}</span> {suspect.name}
                      </div>
                      <div className="text-xs text-text-muted font-mono">
                        MMSI: {suspect.mmsi} | {suspect.vessel_type} | {suspect.flag_country}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-xl font-bold ${suspect.attribution_evidence_score > 60 ? 'text-danger' : 'text-warning'}`}>
                        {suspect.attribution_evidence_score}%
                      </div>
                      <div className="text-[9px] text-text-muted uppercase">Evidence Score</div>
                    </div>
                  </div>

                  <GuiltScoreBar score={suspect.attribution_evidence_score} />

                  {/* Counterfactual IoU Badge */}
                  {suspect.evidence_breakdown && (
                    <div className="bg-navy-900 p-2 rounded border border-line text-[11px] grid grid-cols-2 gap-2 mt-2 font-mono">
                      <div>
                        <span className="text-text-muted">Proximity: </span>
                        <span className="text-text">{suspect.proximity_km} km</span>
                      </div>
                      <div>
                        <span className="text-text-muted">Counterfactual IoU: </span>
                        <span className="text-safe font-bold">{suspect.evidence_breakdown.counterfactual_iou.toFixed(2)}</span>
                      </div>
                    </div>
                  )}

                  <div className="mt-2 text-xs text-text-dim space-y-1">
                    {suspect.had_relevant_speed_drop && (
                      <div className="text-warning">• Speed drop detected near origin during release window</div>
                    )}
                    {suspect.had_relevant_ais_gap && (
                      <div className="text-danger">• AIS gap &gt; 30 mins within release window</div>
                    )}
                    {suspect.evidence_breakdown?.reasons.map((r, i) => (
                      <div key={i} className="text-text-muted">• {r}</div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
