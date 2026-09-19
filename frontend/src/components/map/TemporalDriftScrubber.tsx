import { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, FastForward, SkipBack, SkipForward, Clock, Waves } from 'lucide-react';

interface TemporalDriftScrubberProps {
  currentHour: number; // -48 to +72
  onChange: (hour: number) => void;
  detectedAt?: string;
}

export default function TemporalDriftScrubber({
  currentHour,
  onChange,
  detectedAt,
}: TemporalDriftScrubberProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<1 | 2 | 5>(1);

  // Playback timer loop
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      onChange(Math.min(72, currentHour + speed));
    }, 400);

    if (currentHour >= 72) {
      setIsPlaying(false);
    }

    return () => clearInterval(interval);
  }, [isPlaying, currentHour, speed, onChange]);

  const togglePlay = () => {
    if (currentHour >= 72) {
      onChange(-48);
    }
    setIsPlaying(!isPlaying);
  };

  const getPhaseLabel = (h: number) => {
    if (h === 0) return 'SPILL DETECTED (T = 0.0h)';
    if (h < 0) return `BACKWARD HYDRODYNAMIC DRIFT (${h.toFixed(1)}h)`;
    return `FORWARD PROJECTION FORECAST (+${h.toFixed(1)}h)`;
  };

  const getPhaseColor = (h: number) => {
    if (h === 0) return 'text-ocean-red font-bold';
    if (h < 0) return 'text-ocean-cyan';
    return 'text-ocean-amber';
  };

  return (
    <div className="bg-[#0d1524]/95 backdrop-blur-md border border-slate-800 p-3 shadow-2xl rounded-none tactical-corners select-none">
      <div className="flex flex-col gap-2">
        {/* Upper Status & Telemetry Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-900 border border-slate-800 rounded">
              <Waves size={13} className="text-ocean-cyan" />
              <span className="font-mono text-[10px] text-slate-400 uppercase tracking-widest">4D DRIFT ENGINE</span>
            </div>
            <span className={`font-mono text-xs tracking-wider ${getPhaseColor(currentHour)}`}>
              [ {getPhaseLabel(currentHour)} ]
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="flex items-center gap-1.5 text-slate-400">
              <Clock size={12} className="text-cyan-400" />
              <span>TIMESTEP:</span>
              <span className="text-slate-100 font-bold tabular-nums">
                {currentHour >= 0 ? `+${currentHour.toFixed(1)}h` : `${currentHour.toFixed(1)}h`}
              </span>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 text-slate-400">
              <span>DETECTION T₀:</span>
              <span className="text-slate-200">{detectedAt ? detectedAt.slice(11, 19) + ' UTC' : '06:42:00 UTC'}</span>
            </div>
          </div>
        </div>

        {/* Timeline Slider with Range Tracks */}
        <div className="relative py-1">
          {/* Custom Timeline Visual Track */}
          <div className="relative h-2 w-full bg-slate-900 border border-slate-800 rounded-sm overflow-hidden flex">
            {/* Backward phase: -48h to 0h (40% width) */}
            <div
              className="h-full bg-gradient-to-r from-cyan-950 via-cyan-800 to-cyan-500 relative"
              style={{ width: '40%' }}
            >
              <div className="absolute inset-0 opacity-40 bg-[repeating-linear-gradient(45deg,transparent,transparent_4px,rgba(0,240,255,0.2)_4px,rgba(0,240,255,0.2)_8px)]" />
            </div>
            {/* Spill Point T=0 separator */}
            <div className="w-1 h-full bg-ocean-red z-10 shadow-[0_0_8px_#f43f5e]" />
            {/* Forward phase: 0h to +72h (60% width) */}
            <div
              className="h-full bg-gradient-to-r from-amber-500 via-amber-700 to-rose-950 relative"
              style={{ width: '60%' }}
            >
              <div className="absolute inset-0 opacity-40 bg-[repeating-linear-gradient(45deg,transparent,transparent_4px,rgba(245,158,11,0.2)_4px,rgba(245,158,11,0.2)_8px)]" />
            </div>
          </div>

          {/* HTML Slider Range Input overlaid on track */}
          <input
            type="range"
            min="-48"
            max="72"
            step="1"
            value={currentHour}
            onChange={(e) => onChange(Number(e.target.value))}
            className="w-full absolute top-1 left-0 opacity-80 accent-cyan-400 cursor-pointer h-2"
          />

          {/* Key Milestone Labels */}
          <div className="flex justify-between font-mono text-[9px] text-slate-400 mt-2 px-1">
            <span
              onClick={() => onChange(-48)}
              className="cursor-pointer hover:text-cyan-400 transition-colors"
            >
              -48h (RELEASE ORIGIN)
            </span>
            <span
              onClick={() => onChange(-24)}
              className="cursor-pointer hover:text-cyan-400 transition-colors hidden sm:inline"
            >
              -24h
            </span>
            <span
              onClick={() => onChange(0)}
              className="cursor-pointer text-ocean-red font-bold hover:underline"
            >
              ▲ T=0 (DETECTION)
            </span>
            <span
              onClick={() => onChange(24)}
              className="cursor-pointer hover:text-amber-400 transition-colors hidden sm:inline"
            >
              +24h
            </span>
            <span
              onClick={() => onChange(48)}
              className="cursor-pointer hover:text-amber-400 transition-colors hidden sm:inline"
            >
              +48h (REEF IMPACT)
            </span>
            <span
              onClick={() => onChange(72)}
              className="cursor-pointer hover:text-amber-400 transition-colors"
            >
              +72h (COASTAL)
            </span>
          </div>
        </div>

        {/* Playback Controls & Speed Selectors */}
        <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onChange(Math.max(-48, currentHour - 6))}
              className="p-1.5 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 rounded"
              title="Step -6h"
            >
              <SkipBack size={13} />
            </button>
            <button
              onClick={togglePlay}
              className={`px-3 py-1.5 rounded flex items-center gap-1.5 font-mono text-xs font-semibold border transition-all ${
                isPlaying
                  ? 'bg-amber-950 border-amber-500/50 text-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.3)]'
                  : 'bg-cyan-950 border-cyan-500/50 text-ocean-cyan shadow-[0_0_10px_rgba(0,240,255,0.2)]'
              }`}
            >
              {isPlaying ? (
                <>
                  <Pause size={13} /> PAUSE
                </>
              ) : (
                <>
                  <Play size={13} /> RUN DRIFT
                </>
              )}
            </button>
            <button
              onClick={() => onChange(Math.min(72, currentHour + 6))}
              className="p-1.5 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 rounded"
              title="Step +6h"
            >
              <SkipForward size={13} />
            </button>
            <button
              onClick={() => {
                setIsPlaying(false);
                onChange(0);
              }}
              className="p-1.5 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 rounded ml-1"
              title="Reset to T=0"
            >
              <RotateCcw size={13} />
            </button>
          </div>

          {/* Playback Speed Multiplier */}
          <div className="flex items-center gap-1 bg-slate-950 p-0.5 border border-slate-800 rounded font-mono text-[10px]">
            <span className="px-1.5 text-slate-500 text-[9px]">SPEED</span>
            {([1, 2, 5] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                className={`px-2 py-0.5 rounded transition-colors ${
                  speed === s
                    ? 'bg-cyan-950 text-ocean-cyan border border-cyan-500/40 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
