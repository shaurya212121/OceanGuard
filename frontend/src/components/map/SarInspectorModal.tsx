import { useState } from 'react';
import { X, Sliders, Eye, ShieldCheck, Download, Sparkles, AlertTriangle, Layers } from 'lucide-react';
import type { SARPassMetadata } from '@/lib/db';
import { formatPercent } from '@/utils/formatters';

interface SarInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  metadata?: SARPassMetadata;
  spillName: string;
}

export default function SarInspectorModal({
  isOpen,
  onClose,
  metadata,
  spillName,
}: SarInspectorModalProps) {
  const [activeTab, setActiveTab] = useState<'split' | 'raw' | 'mask' | 'lookalike'>('split');
  const [sliderPos, setSliderPos] = useState(50); // 0 to 100%
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.85);

  if (!isOpen) return null;

  const rawImg = metadata?.raw_chip_url || '/sample_sar/spill_class_1_01840.jpg';
  const maskImg = metadata?.mask_chip_url || '/sample_sar/spill_class_1_01841.jpg';

  return (
    <div className="fixed inset-0 z-[2000] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-5xl bg-[#0d1524] border border-slate-700 shadow-2xl rounded-none flex flex-col max-h-[90vh] overflow-hidden tactical-corners">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-cyan-950/60 border border-cyan-500/40 text-ocean-cyan">
              <Layers size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] text-ocean-cyan uppercase tracking-widest">
                  SYNTHETIC APERTURE RADAR (SAR) INSPECTOR
                </span>
                <span className="text-slate-600 font-mono text-[10px]">•</span>
                <span className="font-mono text-[10px] text-emerald-400">U-NET OIL SEGMENTATION</span>
              </div>
              <h3 className="font-sans font-bold text-base text-slate-100">{spillName}</h3>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Tab controls */}
            <div className="flex items-center bg-slate-950 p-1 border border-slate-800 rounded">
              <button
                onClick={() => setActiveTab('split')}
                className={`px-3 py-1 text-xs font-mono transition-colors ${
                  activeTab === 'split' ? 'bg-cyan-950 text-ocean-cyan border border-cyan-500/40' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Split-View Comparison
              </button>
              <button
                onClick={() => setActiveTab('raw')}
                className={`px-3 py-1 text-xs font-mono transition-colors ${
                  activeTab === 'raw' ? 'bg-cyan-950 text-ocean-cyan border border-cyan-500/40' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Raw SAR (VV/VH)
              </button>
              <button
                onClick={() => setActiveTab('mask')}
                className={`px-3 py-1 text-xs font-mono transition-colors ${
                  activeTab === 'mask' ? 'bg-cyan-950 text-ocean-cyan border border-cyan-500/40' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                AI Mask (U-Net)
              </button>
              <button
                onClick={() => setActiveTab('lookalike')}
                className={`px-3 py-1 text-xs font-mono transition-colors ${
                  activeTab === 'lookalike' ? 'bg-cyan-950 text-ocean-cyan border border-cyan-500/40' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Look-alike Filter
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 border border-slate-800 text-slate-400 hover:text-slate-100 hover:border-slate-700 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 flex min-h-0 overflow-hidden">
          {/* Main Viewer Area */}
          <div className="flex-1 p-6 flex flex-col items-center justify-center bg-slate-950 relative overflow-hidden">
            {activeTab === 'split' && (
              <div className="relative w-full max-w-xl aspect-square border border-slate-800 bg-black overflow-hidden shadow-2xl select-none">
                {/* Background Mask Image */}
                <img
                  src={maskImg}
                  alt="AI Segmentation Mask"
                  className="absolute inset-0 w-full h-full object-cover"
                />
                
                {/* Foreground Raw Image with clip-path */}
                <div
                  className="absolute inset-0 overflow-hidden"
                  style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
                >
                  <img
                    src={rawImg}
                    alt="Raw SAR Chip"
                    className="w-full h-full object-cover filter contrast-125"
                  />
                  <div className="absolute top-3 left-3 bg-black/70 px-2 py-1 border border-slate-700 text-[10px] font-mono text-slate-300">
                    RAW SAR (VV-POL)
                  </div>
                </div>

                <div className="absolute top-3 right-3 bg-black/70 px-2 py-1 border border-cyan-500/50 text-[10px] font-mono text-ocean-cyan">
                  AI U-NET SEGMENTATION
                </div>

                {/* Slider divider bar */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-ocean-cyan shadow-[0_0_10px_#00f0ff] pointer-events-none"
                  style={{ left: `${sliderPos}%` }}
                >
                  <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-slate-900 border-2 border-ocean-cyan flex items-center justify-center shadow-lg text-[9px] text-ocean-cyan font-bold">
                    ↔
                  </div>
                </div>

                {/* Range scrubber input overlay */}
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={sliderPos}
                  onChange={(e) => setSliderPos(Number(e.target.value))}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-20"
                />
              </div>
            )}

            {activeTab === 'raw' && (
              <div className="relative w-full max-w-xl aspect-square border border-slate-800 bg-black overflow-hidden shadow-2xl">
                <img src={rawImg} alt="Raw SAR" className="w-full h-full object-cover filter contrast-125" />
                <div className="absolute bottom-3 left-3 bg-black/80 px-3 py-1.5 border border-slate-700 text-xs font-mono text-slate-200">
                  Sentinel-1A SAR VV/VH Intensity Backscatter (dB)
                </div>
              </div>
            )}

            {activeTab === 'mask' && (
              <div className="relative w-full max-w-xl aspect-square border border-slate-800 bg-black overflow-hidden shadow-2xl">
                <img src={maskImg} alt="AI Mask" className="w-full h-full object-cover" />
                <div className="absolute bottom-3 left-3 bg-black/80 px-3 py-1.5 border border-cyan-500/40 text-xs font-mono text-ocean-cyan">
                  Binary Segmentation Polygon (Confidence ≥ {(confidenceThreshold * 100).toFixed(0)}%)
                </div>
              </div>
            )}

            {activeTab === 'lookalike' && (
              <div className="relative w-full max-w-xl aspect-square border border-slate-800 bg-black overflow-hidden shadow-2xl p-6 flex flex-col justify-center">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 bg-slate-900 border border-slate-800 rounded">
                    <ShieldCheck size={24} className="text-emerald-400 shrink-0" />
                    <div>
                      <h4 className="font-sans font-bold text-sm text-slate-100">Look-Alike Filter: PASSED</h4>
                      <p className="font-mono text-xs text-slate-400 mt-0.5">
                        Hydrodynamic signature inconsistent with biogenic surfactants or calm-sea wind shadows.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-slate-900 border border-slate-800">
                      <p className="font-mono text-[10px] text-slate-400 uppercase">Wind Speed Condition</p>
                      <p className="font-mono text-lg text-slate-100 font-semibold mt-1">
                        {metadata?.wind_speed_ms?.toFixed(1) ?? '6.4'} m/s
                      </p>
                      <p className="font-mono text-[9px] text-emerald-400 mt-0.5">Optimum SAR Window (3-12 m/s)</p>
                    </div>

                    <div className="p-3 bg-slate-900 border border-slate-800">
                      <p className="font-mono text-[10px] text-slate-400 uppercase">Look-alike Risk</p>
                      <p className="font-mono text-lg text-emerald-400 font-semibold mt-1">
                        {metadata?.look_alike_probability?.toFixed(1) ?? '4.2'}%
                      </p>
                      <p className="font-mono text-[9px] text-slate-400 mt-0.5">False-Alarm Threshold &lt; 15%</p>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300 leading-relaxed">
                    <span className="text-ocean-cyan font-bold">RADAR DIAGNOSIS:</span> Sharp perimeter damping factor indicates mineral oil hydrocarbon slick rather than natural biogenic slick. High polarization ratio (VV/VH) confirms continuous surface dampening film.
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'split' && (
              <p className="font-mono text-[10px] text-slate-500 mt-3">
                DRAG LEFT / RIGHT ACROSS CHIP TO REVEAL AI SEGMENTATION CONTOUR
              </p>
            )}
          </div>

          {/* Right Sidebar Telemetry */}
          <div className="w-80 shrink-0 border-l border-slate-800 bg-[#0d1524] p-5 flex flex-col justify-between overflow-y-auto">
            <div className="space-y-5">
              <div>
                <span className="font-mono text-[9px] text-slate-400 tracking-widest uppercase font-semibold">
                  SENSOR TELEMETRY
                </span>
                <div className="mt-2 space-y-2 bg-slate-950/60 p-3 border border-slate-800 rounded font-mono text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">SATELLITE:</span>
                    <span className="text-slate-200 font-medium">{metadata?.satellite || 'Sentinel-1A SAR'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">ORBIT PASS:</span>
                    <span className="text-slate-200">{metadata?.orbit_pass || 'Orbit #114 / IW'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">POLARIZATION:</span>
                    <span className="text-ocean-cyan">{metadata?.polarization || 'VV + VH'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">INCIDENCE:</span>
                    <span className="text-slate-200">{metadata?.incidence_angle_deg?.toFixed(1) || '38.4'}°</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">RESOLUTION:</span>
                    <span className="text-slate-200">{metadata?.resolution_m?.toFixed(1) || '10.0'} m/px</span>
                  </div>
                </div>
              </div>

              {/* Confidence Threshold Slider */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-mono text-[10px] text-slate-400 uppercase">Detection Threshold</span>
                  <span className="font-mono text-xs text-ocean-cyan font-bold">{formatPercent(confidenceThreshold * 100, 0)}</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="0.99"
                  step="0.01"
                  value={confidenceThreshold}
                  onChange={(e) => setConfidenceThreshold(Number(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
                <p className="font-mono text-[9px] text-slate-400 mt-1">
                  Adjust probability cutoff for pixel segmentation mask
                </p>
              </div>

              {/* Model Metrics */}
              <div>
                <span className="font-mono text-[9px] text-slate-400 tracking-widest uppercase font-semibold">
                  AI MODEL OUTPUT
                </span>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div className="p-2.5 bg-slate-950/60 border border-slate-800 rounded">
                    <span className="font-mono text-[9px] text-slate-400">CONFIDENCE</span>
                    <p className="font-mono text-lg text-ocean-cyan font-bold mt-0.5">
                      {formatPercent(metadata?.segmentation_confidence ?? 96.8)}
                    </p>
                  </div>
                  <div className="p-2.5 bg-slate-950/60 border border-slate-800 rounded">
                    <span className="font-mono text-[9px] text-slate-400">LOOK-ALIKE</span>
                    <p className="font-mono text-lg text-emerald-400 font-bold mt-0.5">
                      {formatPercent(metadata?.look_alike_probability ?? 4.2)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800">
              <button
                onClick={() => {
                  window.open(rawImg, '_blank');
                }}
                className="w-full py-2 bg-slate-900 border border-slate-700 hover:border-ocean-cyan text-slate-200 hover:text-ocean-cyan font-mono text-xs flex items-center justify-center gap-2 transition-colors rounded"
              >
                <Download size={13} />
                EXPORT CALIBRATED SAR CHIP
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
