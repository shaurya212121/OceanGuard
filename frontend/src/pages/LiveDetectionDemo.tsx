import { useState, useEffect, useRef } from 'react';
import { Upload, Radar, AlertTriangle, CheckCircle, XCircle, Loader2, Info } from 'lucide-react';

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
                    Classification: {result.classification_mode} · Confidence: {(result.classification_confidence * 100).toFixed(1)}%
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
                  <div className="tactical-corners bg-ocean-panel p-3">
                    <p className="font-mono text-[9px] text-ocean-text-muted">CONFIDENCE</p>
                    <p className="font-mono text-xl text-ocean-cyan">{(result.classification_confidence * 100).toFixed(1)}%</p>
                  </div>
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
