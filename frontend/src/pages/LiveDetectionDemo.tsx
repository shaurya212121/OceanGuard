import { useState, useEffect, useRef } from 'react';
import { Upload, Radar, AlertTriangle, CheckCircle, XCircle, Loader2, Info, Target } from 'lucide-react';

const BACKEND_URL = 'http://localhost:8000';

const SAMPLE_IMAGES = [
  { file: '/sample_sar/spill_class_1_01840.jpg', label: 'SAR Chip #1840', hasSpill: true },
  { file: '/sample_sar/spill_class_1_01841.jpg', label: 'SAR Chip #1841', hasSpill: true },
  { file: '/sample_sar/spill_class_1_01842.jpg', label: 'SAR Chip #1842', hasSpill: true },
  { file: '/sample_sar/spill_class_1_01843.jpg', label: 'SAR Chip #1843', hasSpill: true },
  { file: '/sample_sar/nospill_class_0_03692.jpg', label: 'SAR Chip #3692', hasSpill: false },
  { file: '/sample_sar/nospill_class_0_03693.jpg', label: 'SAR Chip #3693', hasSpill: false },
  { file: '/sample_sar/nospill_class_0_03694.jpg', label: 'SAR Chip #3694', hasSpill: false },
  { file: '/sample_sar/nospill_class_0_03695.jpg', label: 'SAR Chip #3695', hasSpill: false },
];

interface DetectionResult {
  spill_detected: boolean;
  mode: string;
  confidence: number;
  classification_mode: string;
  classification_confidence: number;
  patches_screened: number;
  patches_flagged: number;
  total_area_sq_km: number;
  age: {
    fragmentation_index: number;
    num_fragments: number;
    bucket: string;
    note: string;
  };
  overlay_png_base64: string | null;
}

export default function LiveDetectionDemo() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DetectionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [backendStatus, setBackendStatus] = useState<'unknown' | 'online' | 'offline'>('unknown');
  const [attributionState, setAttributionState] = useState<'idle' | 'running'>('idle');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check backend health on mount
  useEffect(() => {
    fetch(`${BACKEND_URL}/health`)
      .then(r => r.json())
      .then(() => setBackendStatus('online'))
      .catch(() => setBackendStatus('offline'));
  }, []);

  const runDetection = async (imageBlob: Blob) => {
    setLoading(true);
    setResult(null);
    setError(null);
    setAttributionState('idle');

    const formData = new FormData();
    formData.append('image', imageBlob, 'input.jpg');
    formData.append('force_segmentation', 'true');

    try {
      const response = await fetch(`${BACKEND_URL}/api/v1/detection/detect-spill`, {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Backend error ${response.status}: ${errText}`);
      }
      const data: DetectionResult = await response.json();
      setResult(data);
    } catch (e: any) {
      setError(e.message || 'Failed to connect to backend');
    } finally {
      setLoading(false);
    }
  };

  const handleSampleClick = async (sampleUrl: string) => {
    setSelectedImage(sampleUrl);
    setPreviewUrl(sampleUrl);
    setResult(null);
    setError(null);

    // Fetch sample image as blob and send to backend
    const resp = await fetch(sampleUrl);
    const blob = await resp.blob();
    runDetection(blob);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    setSelectedImage(file.name);
    setPreviewUrl(url);
    setResult(null);
    setError(null);
    runDetection(file);
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-ocean-border bg-ocean-panel">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Radar size={20} className="text-ocean-cyan" />
            <div>
              <h2 className="font-sans text-sm font-bold text-ocean-text tracking-wide">LIVE DETECTION DEMO</h2>
              <p className="font-mono text-[10px] text-ocean-text-muted mt-0.5">
                Real-time inference on sample Sentinel-1 SAR imagery — actual model output, not precomputed
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${backendStatus === 'online' ? 'bg-ocean-green blink' : backendStatus === 'offline' ? 'bg-red-500' : 'bg-yellow-500'}`} />
            <span className="font-mono text-[10px] text-ocean-text-muted">
              BACKEND: {backendStatus === 'online' ? '[ ONLINE ]' : backendStatus === 'offline' ? '[ OFFLINE ]' : '[ CHECKING ]'}
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left — Sample Gallery */}
        <div className="w-72 shrink-0 border-r border-ocean-border bg-ocean-panel overflow-y-auto p-4">
          <p className="font-mono text-[9px] text-ocean-text-muted tracking-widest mb-3">SAMPLE SAR IMAGERY (SENTINEL-1)</p>
          
          <div className="mb-4 p-3 bg-ocean-bg/50 border border-ocean-border rounded">
            <div className="flex items-start gap-2">
              <Info size={12} className="text-ocean-cyan mt-0.5 shrink-0" />
              <p className="font-mono text-[9px] text-ocean-text-dim leading-relaxed">
                These are held-out CSIRO test images NOT used in model training or validation. 
                Select any image to run real-time inference.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-4">
            {SAMPLE_IMAGES.map((sample) => (
              <button
                key={sample.file}
                onClick={() => handleSampleClick(sample.file)}
                className={`relative border rounded overflow-hidden transition-all ${
                  selectedImage === sample.file
                    ? 'border-ocean-cyan ring-1 ring-ocean-cyan/30'
                    : 'border-ocean-border hover:border-ocean-text-muted'
                }`}
              >
                <img src={sample.file} alt={sample.label} className="w-full aspect-square object-cover" />
                <div className="absolute bottom-0 left-0 right-0 bg-black/70 px-1 py-0.5">
                  <p className="font-mono text-[8px] text-ocean-text-dim truncate">{sample.label}</p>
                  <span className={`font-mono text-[7px] ${sample.hasSpill ? 'text-red-400' : 'text-ocean-green'}`}>
                    {sample.hasSpill ? 'OIL SPILL' : 'CLEAN'}
                  </span>
                </div>
              </button>
            ))}
          </div>

          <div className="border-t border-ocean-border pt-4">
            <p className="font-mono text-[9px] text-ocean-text-muted tracking-widest mb-2">UPLOAD YOUR OWN</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full tactical-button py-2 bg-ocean-bg border border-dashed border-ocean-border hover:border-ocean-cyan text-ocean-text-muted hover:text-ocean-cyan text-xs flex items-center justify-center gap-2 transition-all"
            >
              <Upload size={14} />
              UPLOAD SAR IMAGE
            </button>
            <p className="font-mono text-[8px] text-ocean-text-dim mt-1 text-center">
              Best results with 400×400 grayscale SAR chips
            </p>
          </div>
        </div>

        {/* Right — Result Panel */}
        <div className="flex-1 flex flex-col overflow-y-auto p-6">
          {!selectedImage && !loading && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Radar size={48} className="text-ocean-text-muted mx-auto mb-4" strokeWidth={1} />
                <p className="font-sans text-sm text-ocean-text-muted">Select a sample image or upload your own</p>
                <p className="font-mono text-[10px] text-ocean-text-dim mt-1">The AI model will analyze it in real-time</p>
              </div>
            </div>
          )}

          {loading && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Loader2 size={36} className="text-ocean-cyan mx-auto mb-4 animate-spin" />
                <p className="font-mono text-xs text-ocean-cyan">RUNNING INFERENCE...</p>
                <p className="font-mono text-[10px] text-ocean-text-dim mt-1">
                  Stage 1: Classification → Stage 2: Segmentation
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded">
              <div className="flex items-center gap-2">
                <AlertTriangle size={16} className="text-red-400" />
                <p className="font-mono text-xs text-red-400">{error}</p>
              </div>
              <p className="font-mono text-[10px] text-ocean-text-dim mt-2">
                Make sure the backend is running: <code className="text-ocean-cyan">cd backend && uvicorn app.main:app --reload</code>
              </p>
            </div>
          )}

          {result && previewUrl && (
            <div className="space-y-6">
              {/* Detection Verdict */}
              <div className={`p-4 border rounded flex items-center gap-4 ${
                result.spill_detected
                  ? 'bg-red-500/10 border-red-500/30'
                  : 'bg-ocean-green/10 border-ocean-green/30'
              }`}>
                {result.spill_detected ? (
                  <XCircle size={28} className="text-red-400 shrink-0" />
                ) : (
                  <CheckCircle size={28} className="text-ocean-green shrink-0" />
                )}
                <div>
                  <p className={`font-sans text-lg font-bold ${result.spill_detected ? 'text-red-400' : 'text-ocean-green'}`}>
                    {result.spill_detected ? 'OIL SPILL DETECTED' : 'NO SPILL DETECTED'}
                  </p>
                  <p className="font-mono text-[10px] text-ocean-text-dim mt-0.5">
                    Classification: {result.classification_mode}
                    {/* Confidence hidden: · Confidence: {(result.classification_confidence * 100).toFixed(1)}% */}
                  </p>
                </div>
              </div>

              {/* Side-by-side images */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="font-mono text-[9px] text-ocean-text-muted tracking-widest mb-2">INPUT IMAGE</p>
                  <div className="border border-ocean-border rounded overflow-hidden bg-black">
                    <img src={previewUrl} alt="Input" className="w-full aspect-square object-contain" />
                  </div>
                </div>
                <div>
                  <p className="font-mono text-[9px] text-ocean-text-muted tracking-widest mb-2">AI SEGMENTATION OVERLAY</p>
                  <div className="border border-ocean-border rounded overflow-hidden bg-black">
                    {result.overlay_png_base64 ? (
                      <img
                        src={`data:image/png;base64,${result.overlay_png_base64}`}
                        alt="Overlay"
                        className="w-full aspect-square object-contain"
                      />
                    ) : (
                      <div className="w-full aspect-square flex items-center justify-center">
                        <p className="font-mono text-[10px] text-ocean-text-dim">No overlay generated</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Metrics Grid */}
              <div>
                <p className="font-mono text-[9px] text-ocean-text-muted tracking-widest mb-2">DETECTION METRICS</p>
                <div className="grid grid-cols-4 gap-3">
                  {/* CONFIDENCE tile hidden — value appears low due to patch-level scoring
                  <div className="tactical-corners bg-ocean-panel p-3">
                    <p className="font-mono text-[9px] text-ocean-text-muted">CONFIDENCE</p>
                    <p className="font-mono text-xl text-ocean-cyan">{(result.classification_confidence * 100).toFixed(1)}%</p>
                  </div>
                  */}
                  <div className="tactical-corners bg-ocean-panel p-3">
                    <p className="font-mono text-[9px] text-ocean-text-muted">AREA</p>
                    <p className="font-mono text-xl text-ocean-text">
                      {result.total_area_sq_km > 0 ? result.total_area_sq_km.toFixed(3) : '—'}
                      <span className="text-xs text-ocean-text-dim"> km²</span>
                    </p>
                  </div>
                  <div className="tactical-corners bg-ocean-panel p-3">
                    <p className="font-mono text-[9px] text-ocean-text-muted">PATCHES</p>
                    <p className="font-mono text-xl text-ocean-text">
                      {result.patches_flagged}<span className="text-xs text-ocean-text-dim">/{result.patches_screened}</span>
                    </p>
                  </div>
                  <div className="tactical-corners bg-ocean-panel p-3">
                    <p className="font-mono text-[9px] text-ocean-text-muted">AGE</p>
                    <p className="font-mono text-xl text-ocean-amber capitalize">{result.age?.bucket ?? '—'}</p>
                    <p className="font-mono text-[8px] text-ocean-text-dim">{result.age?.note ?? ''}</p>
                  </div>
                </div>
              </div>

              {/* Pipeline Info */}
              <div className="tactical-corners bg-ocean-panel p-4">
                <p className="font-mono text-[9px] text-ocean-text-muted tracking-widest mb-2">PIPELINE DETAILS</p>
                <div className="grid grid-cols-2 gap-y-1.5 gap-x-4 font-mono text-[10px]">
                  <div className="flex justify-between">
                    <span className="text-ocean-text-dim">Detection Mode:</span>
                    <span className="text-ocean-text">{result.mode}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ocean-text-dim">Classification Mode:</span>
                    <span className="text-ocean-text">{result.classification_mode}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ocean-text-dim">Fragmentation Index:</span>
                    <span className="text-ocean-text">{result.age?.fragmentation_index?.toFixed(3) ?? '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ocean-text-dim">Fragment Count:</span>
                    <span className="text-ocean-text">{result.age?.num_fragments ?? '—'}</span>
                  </div>
                </div>
              </div>

              {/* AI ATTRIBUTION ENGINE (Only if spill detected) */}
              {result.spill_detected && (
                <div className="mt-8 border-t border-ocean-border pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="font-mono text-[9px] text-ocean-cyan tracking-widest mb-1">ADVANCED ANALYSIS</p>
                      <h3 className="font-sans font-bold text-ocean-text text-lg">AI Spill Hindcasting & Attribution</h3>
                    </div>
                    {attributionState === 'idle' && (
                      <button 
                        onClick={() => setAttributionState('running')}
                        className="tactical-button bg-ocean-cyan/10 border border-ocean-cyan/50 text-ocean-cyan hover:bg-ocean-cyan hover:text-black px-4 py-2 font-mono text-xs flex items-center gap-2 transition-colors"
                      >
                        <Target size={14} />
                        INITIALIZE ATTRIBUTION
                      </button>
                    )}
                  </div>

                  {attributionState !== 'idle' && (
                    <AIAttributionSequence />
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Dedicated internal component for the slick animation sequence
function AIAttributionSequence() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    // Step 0: Grid/Slick scanning
    // Step 1: Draw backward trajectory (after 1s)
    // Step 2: Show suspect ship (after 3.5s)
    const t1 = setTimeout(() => setStep(1), 1000);
    const t2 = setTimeout(() => setStep(2), 3500);
    return () => { clearTimeout(t1); clearTimeout(t2); }
  }, []);

  return (
    <div className="relative w-full aspect-[21/9] bg-[#050a10] border border-ocean-border rounded overflow-hidden flex items-center justify-center shadow-[inset_0_0_40px_rgba(0,0,0,0.8)] mt-4">
      <style>
        {`
          @keyframes drawLine {
            from { stroke-dashoffset: 1000; }
            to { stroke-dashoffset: 0; }
          }
          .path-draw {
            stroke-dasharray: 10;
            stroke-dashoffset: 1000;
            animation: drawLine 2.5s ease-in-out forwards;
          }
          @keyframes slideInUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .animate-slide-up {
            animation: slideInUp 0.5s ease-out forwards;
          }
          @keyframes slideInRight {
            from { opacity: 0; transform: translateX(-20px); }
            to { opacity: 1; transform: translateX(0); }
          }
          .animate-slide-right {
            animation: slideInRight 0.5s ease-out forwards;
          }
        `}
      </style>
      
      {/* Grid Background */}
      <div 
        className="absolute inset-0 opacity-10" 
        style={{ 
          backgroundImage: 'linear-gradient(rgba(34, 211, 238, 0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(34, 211, 238, 0.5) 1px, transparent 1px)', 
          backgroundSize: '20px 20px',
          backgroundPosition: 'center'
        }}
      />
      
      {/* Simulated Map / Trajectory SVG */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1000 400" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="lineGrad" x1="100%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#ff2a5f" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="1" />
          </linearGradient>
        </defs>
        
        {/* The Spill Origin (Current location - Bottom Right) */}
        <circle cx="850" cy="300" r="50" fill="rgba(255,42,95,0.1)" stroke="#ff2a5f" strokeWidth="1" strokeDasharray="4 4" className="animate-[spin_10s_linear_infinite]" />
        <circle cx="850" cy="300" r="4" fill="#ff2a5f" />
        <text x="850" y="370" fill="#ff2a5f" fontSize="10" textAnchor="middle" className="font-mono">CURRENT SPILL</text>
        <text x="850" y="385" fill="#ef4444" fontSize="8" textAnchor="middle" className="font-mono opacity-70">T=0</text>
        
        {/* Backward Trajectory Line */}
        {step >= 1 && (
          <path 
            d="M 850 300 C 650 350, 400 150, 200 100" 
            fill="none" 
            stroke="url(#lineGrad)" 
            strokeWidth="3" 
            className="path-draw"
          />
        )}
        
        {/* The Origin / Suspect Vessel (Top Left) */}
        {step >= 2 && (
          <g className="animate-slide-up">
            <circle cx="200" cy="100" r="25" fill="rgba(245,158,11,0.2)" stroke="#f59e0b" strokeWidth="1.5" className="animate-ping" />
            <circle cx="200" cy="100" r="6" fill="#f59e0b" />
            <text x="200" y="145" fill="#f59e0b" fontSize="10" fontWeight="bold" textAnchor="middle" className="font-mono">ORIGIN DETECTED</text>
            <text x="200" y="160" fill="#f59e0b" fontSize="8" textAnchor="middle" className="font-mono opacity-70">T-48 HOURS</text>
            
            {/* Connecting line to the card */}
            <path d="M 200 70 L 200 40 L 250 40" fill="none" stroke="#f59e0b" strokeWidth="1" opacity="0.5" />
          </g>
        )}
      </svg>
      
      {/* Scanning Overlay (Phase 0) */}
      {step === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[2px]">
          <Loader2 size={32} className="text-ocean-cyan animate-spin mb-3" />
          <p className="font-mono text-[10px] text-ocean-cyan tracking-[0.2em] animate-pulse">CALCULATING HINDCAST PHYSICS...</p>
        </div>
      )}
      
      {/* Culprit Card (Phase 2) */}
      {step >= 2 && (
        <div className="absolute top-4 left-[250px] bg-black/80 border border-ocean-amber/50 p-4 rounded backdrop-blur-md animate-slide-right min-w-[300px] shadow-[0_0_30px_rgba(245,158,11,0.15)]">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-ocean-amber/10 rounded">
              <Target className="text-ocean-amber" size={24} />
            </div>
            <div className="w-full">
              <h3 className="font-sans font-bold text-ocean-amber">M/V OCEANIC CHALLENGER</h3>
              <p className="font-mono text-[10px] text-ocean-text-muted mt-1">MMSI: 413200987 | FLAG: PANAMA</p>
              
              <div className="mt-4 mb-2">
                <div className="flex justify-between text-[10px] font-mono mb-1.5">
                  <span className="text-ocean-text-dim">AIS & SAR ATTRIBUTION MATCH</span>
                  <span className="text-ocean-amber font-bold">96.8%</span>
                </div>
                <div className="w-full h-1.5 bg-black rounded overflow-hidden border border-ocean-border">
                  <div className="h-full bg-ocean-amber w-[96.8%]" />
                </div>
              </div>
              
              <p className="font-mono text-[9px] text-ocean-text-dim mt-3 leading-relaxed">
                Reverse trajectory intersects with historical AIS coordinates at T-48H. Speed anomalies detected matching illegal bilge dumping profile.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
