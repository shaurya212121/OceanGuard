import { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  SkipBack,
  SkipForward,
  Clock,
  Waves,
  Flame,
  Droplets,
  ShieldAlert,
  Compass,
} from 'lucide-react';
import { calculateWeatheringTelemetry, type WeatheringTelemetry } from '@/utils/driftPhysics';

interface TemporalDriftScrubberProps {
  currentHour: number; // -48.0 to +72.0
  onChange: (hour: number) => void;
  detectedAt?: string;
  weatheringTelemetry?: WeatheringTelemetry;
}

export default function TemporalDriftScrubber({
  currentHour,
  onChange,
  detectedAt,
  weatheringTelemetry,
}: TemporalDriftScrubberProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<1 | 2 | 5>(1);
  const [loopMode, setLoopMode] = useState(true);
  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  // Fallback telemetry if not provided by parent
  const telemetry = weatheringTelemetry || calculateWeatheringTelemetry(currentHour);

  // High-precision smooth requestAnimationFrame playback loop
  useEffect(() => {
    if (!isPlaying) {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      lastTimeRef.current = null;
      return;
    }

    const animate = (timestamp: number) => {
      if (lastTimeRef.current === null) {
        lastTimeRef.current = timestamp;
      }
      const deltaSec = (timestamp - lastTimeRef.current) / 1000;
      lastTimeRef.current = timestamp;

      // 1x speed = ~4 simulation hours per real-time second
      const hourStep = deltaSec * 3.5 * speed;

      let nextHour = currentHour + hourStep;
      if (nextHour > 72) {
        if (loopMode) {
          nextHour = -48;
        } else {
          nextHour = 72;
          setIsPlaying(false);
        }
      }

      onChange(Number(nextHour.toFixed(2)));
      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isPlaying, currentHour, speed, loopMode, onChange]);

  const togglePlay = () => {
    if (currentHour >= 72) {
      onChange(-48);
    }
    setIsPlaying(!isPlaying);
  };

  const getPhaseLabel = (h: number) => {
    if (Math.abs(h) < 0.2) return 'SAR DETECTION LOCK (T = 0.0h)';
    if (h < 0) return `HYDRODYNAMIC BACKTRACKING (${h.toFixed(1)}h)`;
    return `FORWARD IMPACT PROJECTION (+${h.toFixed(1)}h)`;
  };

  const getPhaseColor = (h: number) => {
    if (Math.abs(h) < 0.2) return 'text-[#00f0ff] font-bold drop-shadow-[0_0_8px_#00f0ff]';
    if (h < 0) return 'text-[#f59e0b]';
    return telemetry.beachedPercent > 10 ? 'text-[#f43f5e]' : 'text-[#38bdf8]';
  };

  // Milestone jump helper
  const jumpTo = (targetHour: number) => {
    onChange(targetHour);
  };

  return (
    <div className="bg-[#0b1320]/95 backdrop-blur-md border border-slate-800 p-3 shadow-2xl rounded-none tactical-corners select-none">
      <div className="flex flex-col gap-2.5">
        {/* Upper Status & Telemetry Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-900 border border-slate-800 rounded">
              <Waves size={13} className="text-[#00f0ff] animate-pulse" />
              <span className="font-mono text-[10px] text-slate-300 uppercase tracking-widest font-semibold">
                OPENDRIFT 4D ENGINE
              </span>
            </div>
            <span className={`font-mono text-xs tracking-wider ${getPhaseColor(currentHour)}`}>
              [ {getPhaseLabel(currentHour)} ]
            </span>
          </div>

          {/* Quick Weathering Telemetry Badges */}
          <div className="hidden lg:flex items-center gap-4 text-[11px] font-mono">
            <div className="flex items-center gap-1.5 text-slate-400">
              <Flame size={12} className="text-amber-400" />
              <span>EVAP:</span>
              <span className="text-amber-300 font-bold tabular-nums">
                {telemetry.evaporatedPercent}%
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-400">
              <Droplets size={12} className="text-cyan-400" />
              <span>EMULS:</span>
              <span className="text-cyan-300 font-bold tabular-nums">
                {telemetry.emulsifiedPercent}%
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-400">
              <Compass size={12} className="text-rose-400" />
              <span>COAST:</span>
              <span className="text-slate-100 font-bold tabular-nums">
                {telemetry.distanceToShoreNm} NM
              </span>
            </div>
            {telemetry.beachedPercent > 0 && (
              <div className="flex items-center gap-1 px-1.5 py-0.5 bg-rose-950/70 border border-rose-500/50 rounded text-rose-300 font-bold animate-pulse">
                <ShieldAlert size={12} />
                <span>SHORE IMPACT: {telemetry.beachedPercent}%</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="flex items-center gap-1.5 text-slate-400">
              <Clock size={12} className="text-[#00f0ff]" />
              <span>TIMESTEP:</span>
              <span className="text-slate-100 font-bold tabular-nums">
                {currentHour >= 0 ? `+${currentHour.toFixed(1)}h` : `${currentHour.toFixed(1)}h`}
              </span>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 text-slate-400">
              <span>T₀:</span>
              <span className="text-slate-200">{detectedAt ? detectedAt.slice(11, 19) + ' UTC' : '06:42:00 UTC'}</span>
            </div>
          </div>
        </div>

        {/* Timeline Slider with Range Tracks */}
        <div className="relative py-1">
          {/* Custom Timeline Visual Track */}
          <div className="relative h-2.5 w-full bg-slate-900 border border-slate-800 rounded-sm overflow-hidden flex">
            {/* Backward phase: -48h to 0h (40% width) */}
            <div
              className="h-full bg-gradient-to-r from-amber-950 via-amber-800 to-amber-500 relative"
              style={{ width: '40%' }}
            >
              <div className="absolute inset-0 opacity-40 bg-[repeating-linear-gradient(45deg,transparent,transparent_4px,rgba(245,158,11,0.25)_4px,rgba(245,158,11,0.25)_8px)]" />
            </div>

            {/* Spill Point T=0 separator (Glowing indicator) */}
            <div className="w-1.5 h-full bg-[#00f0ff] z-10 shadow-[0_0_12px_#00f0ff]" />

            {/* Forward phase: 0h to +72h (60% width) */}
            <div
              className="h-full bg-gradient-to-r from-cyan-600 via-sky-800 to-rose-900 relative"
              style={{ width: '60%' }}
            >
              <div className="absolute inset-0 opacity-40 bg-[repeating-linear-gradient(45deg,transparent,transparent_4px,rgba(56,189,248,0.25)_4px,rgba(56,189,248,0.25)_8px)]" />
            </div>
          </div>

          {/* HTML Slider Range Input overlaid on track with 0.1 resolution */}
          <input
            type="range"
            min="-48"
            max="72"
            step="0.1"
            value={currentHour}
            onChange={(e) => onChange(Number(e.target.value))}
            className="w-full absolute top-1 left-0 opacity-80 accent-[#00f0ff] cursor-pointer h-2.5"
          />

          {/* Interactive Milestone Keyframe Buttons */}
          <div className="flex justify-between font-mono text-[9px] text-slate-400 mt-2 px-1">
            <button
              onClick={() => jumpTo(-48)}
              className={`hover:text-amber-400 transition-colors uppercase ${
                currentHour <= -45 ? 'text-amber-400 font-bold underline' : ''
              }`}
            >
              -48h [DISCHARGE ORIGIN]
            </button>
            <button
              onClick={() => jumpTo(-24)}
              className={`hover:text-amber-400 transition-colors hidden md:inline ${
                currentHour > -26 && currentHour < -22 ? 'text-amber-400 font-bold underline' : ''
              }`}
            >
              -24h [AIS GAP]
            </button>
            <button
              onClick={() => jumpTo(0)}
              className={`text-[#00f0ff] font-bold hover:underline ${
                Math.abs(currentHour) < 1 ? 'drop-shadow-[0_0_6px_#00f0ff]' : ''
              }`}
            >
              ▲ T=0 [SAR DETECTION]
            </button>
            <button
              onClick={() => jumpTo(24)}
              className={`hover:text-cyan-400 transition-colors hidden md:inline ${
                currentHour > 22 && currentHour < 26 ? 'text-cyan-400 font-bold underline' : ''
              }`}
            >
              +24h [SHEEN DISPERSION]
            </button>
            <button
              onClick={() => jumpTo(42)}
              className={`hover:text-rose-400 transition-colors hidden sm:inline ${
                currentHour > 40 && currentHour < 44 ? 'text-rose-400 font-bold underline' : ''
              }`}
            >
              +42h [SHORELINE THREAT]
            </button>
            <button
              onClick={() => jumpTo(72)}
              className={`hover:text-rose-400 transition-colors ${
                currentHour >= 70 ? 'text-rose-400 font-bold underline' : ''
              }`}
            >
              +72h [COASTAL IMPACT]
            </button>
          </div>
        </div>

        {/* Playback Controls & Speed Selectors */}
        <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onChange(Math.max(-48, Number((currentHour - 6).toFixed(1))))}
              className="p-1.5 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 rounded active:scale-95 transition-all"
              title="Step -6h"
            >
              <SkipBack size={13} />
            </button>
            <button
              onClick={togglePlay}
              className={`px-3 py-1.5 rounded flex items-center gap-1.5 font-mono text-xs font-semibold border transition-all active:scale-95 ${
                isPlaying
                  ? 'bg-amber-950 border-amber-500/50 text-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                  : 'bg-cyan-950 border-cyan-500/50 text-[#00f0ff] shadow-[0_0_12px_rgba(0,240,255,0.25)]'
              }`}
            >
              {isPlaying ? (
                <>
                  <Pause size={13} className="animate-pulse" /> PAUSE DRIFT
                </>
              ) : (
                <>
                  <Play size={13} /> RUN 4D DRIFT
                </>
              )}
            </button>
            <button
              onClick={() => onChange(Math.min(72, Number((currentHour + 6).toFixed(1))))}
              className="p-1.5 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 rounded active:scale-95 transition-all"
              title="Step +6h"
            >
              <SkipForward size={13} />
            </button>
            <button
              onClick={() => {
                setIsPlaying(false);
                onChange(0);
              }}
              className="p-1.5 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 rounded ml-1 active:scale-95 transition-all"
              title="Reset to T=0"
            >
              <RotateCcw size={13} />
            </button>
          </div>

          {/* Loop toggle & Speed selectors */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setLoopMode(!loopMode)}
              className={`font-mono text-[10px] px-2 py-0.5 rounded border transition-colors ${
                loopMode
                  ? 'bg-cyan-950/60 border-cyan-500/40 text-[#00f0ff]'
                  : 'bg-slate-900 border-slate-800 text-slate-500'
              }`}
              title="Loop simulation continuously"
            >
              LOOP: {loopMode ? 'ON' : 'OFF'}
            </button>

            {/* Playback Speed Multiplier */}
            <div className="flex items-center gap-1 bg-slate-950 p-0.5 border border-slate-800 rounded font-mono text-[10px]">
              <span className="px-1.5 text-slate-500 text-[9px]">SPEED</span>
              {([1, 2, 5] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSpeed(s)}
                  className={`px-2 py-0.5 rounded transition-colors ${
                    speed === s
                      ? 'bg-cyan-950 text-[#00f0ff] border border-cyan-500/50 font-bold shadow-[0_0_6px_rgba(0,240,255,0.3)]'
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
    </div>
  );
}
