import re

with open("frontend/src/pages/LiveTacticalMap.tsx", "r", encoding="utf-8") as f:
    content = f.read()

scrubber = """        </MapContainer>

        {/* Global Drift Scrubber Controls */}
        {spills.length > 0 && minHour < Infinity && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[500px] z-[1000] bg-[#0b1320]/90 border border-slate-800 p-4 shadow-2xl backdrop-blur-md rounded-lg">
            
            <div className="flex justify-between items-end mb-2">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="w-10 h-10 rounded-full bg-[#00f0ff]/10 border border-[#00f0ff] text-[#00f0ff] flex items-center justify-center hover:bg-[#00f0ff] hover:text-black transition-colors"
                >
                  {isPlaying ? <Pause size={18} /> : <Play size={18} fill="currentColor" />}
                </button>
                
                <div className="flex gap-1 bg-[#0a0f18] p-1 rounded border border-slate-800">
                  {[1, 2, 5].map(s => (
                    <button 
                      key={s}
                      onClick={() => setPlaySpeed(s)}
                      className={`px-2 py-0.5 text-[10px] font-mono rounded ${playSpeed === s ? 'bg-[#00f0ff] text-black font-bold' : 'text-slate-400 hover:text-white'}`}
                    >
                      {s}x
                    </button>
                  ))}
                </div>
              </div>

              <div className="text-right">
                <div className="text-[10px] font-mono text-[#00f0ff] font-bold uppercase tracking-wider mb-1">
                  GLOBAL SYNCHRONIZED DRIFT
                </div>
                <div className="text-xs font-mono text-slate-400">
                  T{currentHour > 0 ? '+' : ''}{currentHour.toFixed(1)}h
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-4">
              <span className="text-[10px] font-mono text-slate-400 whitespace-nowrap">
                {minHour.toFixed(0)}h
              </span>
              
              <div className="relative flex-1">
                <input
                  type="range"
                  min={minHour}
                  max={maxHour}
                  step={0.5}
                  value={currentHour}
                  onChange={(e) => {
                    setCurrentHour(parseFloat(e.target.value));
                    setIsPlaying(false);
                  }}
                  className="w-full h-1 bg-slate-800 rounded-full appearance-none cursor-pointer accent-[#00f0ff]"
                />
                <div className="absolute top-4 left-1/2 -translate-x-1/2 text-[9px] font-mono text-slate-500">
                  DETECTION (T=0)
                </div>
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-1 h-3 bg-slate-600/30" />
              </div>

              <span className="text-[10px] font-mono text-slate-400 whitespace-nowrap">
                +{maxHour.toFixed(0)}h
              </span>
            </div>
          </div>
        )}"""

content = content.replace("        </MapContainer>", scrubber)

with open("frontend/src/pages/LiveTacticalMap.tsx", "w", encoding="utf-8") as f:
    f.write(content)
print("Phase 3 LiveTacticalMap replacement complete.")
