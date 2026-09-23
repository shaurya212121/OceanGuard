import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const TITLE = "OCEAN GUARD";

export default function StartingPage() {
  const navigate = useNavigate();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [lightningOpacity, setLightningOpacity] = useState(0);

  // Lightning effect
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    const triggerLightning = () => {
      setLightningOpacity(0.4);
      setTimeout(() => setLightningOpacity(0), 100);
      const nextDelay = 8000 + Math.random() * 7000;
      timeout = setTimeout(triggerLightning, nextDelay);
    };
    timeout = setTimeout(triggerLightning, 5000);
    return () => clearTimeout(timeout);
  }, []);

  // Keyboard interaction
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !isTransitioning) {
        startTransition();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isTransitioning]);

  const startTransition = () => {
    setIsTransitioning(true);
    setTimeout(() => {
      navigate('/dashboard');
    }, 600);
  };

  return (
    <>
      <style>
        {`
          @media (prefers-reduced-motion: no-preference) {
            .rain-fall { animation: rainFall 0.6s linear infinite; }
            .cinematic-pan { animation: cinematicPan 20s ease-in-out infinite alternate; }
          }
          
          /* Smoothly moves the ENTIRE image (ship + water) together */
          @keyframes cinematicPan {
            0% { transform: scale(1.05) translate(0, 0); }
            100% { transform: scale(1.15) translate(-1%, 2%); }
          }
          
          @keyframes rainFall {
            0% { transform: translateY(-50%) translateX(20%); }
            100% { transform: translateY(0%) translateX(0%); }
          }
          
          @keyframes letterEntrance {
            0% { transform: translateY(30px); opacity: 0; }
            100% { transform: translateY(0); opacity: 1; }
          }
          
          @keyframes titleGlow {
            0%, 100% { filter: drop-shadow(0 0 15px rgba(56, 225, 223, 0.3)); }
            50% { filter: drop-shadow(0 0 35px rgba(56, 225, 223, 0.7)); }
          }
          
          @keyframes badgePulse {
            0%, 100% { transform: scale(1.0); opacity: 0.8; box-shadow: 0 0 15px rgba(34,211,238,0.15); }
            50% { transform: scale(1.05); opacity: 1; box-shadow: 0 0 30px rgba(34,211,238,0.4); }
          }
          
          @keyframes cursorBlink {
            0%, 100% { opacity: 1; }
            50% { opacity: 0; }
          }
          
          @keyframes sonarRipple {
            0% { transform: scale(1); opacity: 0.5; }
            100% { transform: scale(1.5); opacity: 0; }
          }
          
          @keyframes warpTransition {
            0% { transform: scale(1); opacity: 1; filter: brightness(1); }
            100% { transform: scale(1.25); opacity: 0; filter: brightness(2); }
          }
          
          .rain-texture {
            background-image: repeating-linear-gradient(15deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.03) 1%, rgba(255,255,255,0) 2%, rgba(255,255,255,0) 100%);
            background-size: 100px 100px;
          }
        `}
      </style>

      {/* Main Viewport */}
      <div 
        className="relative w-screen h-screen overflow-hidden bg-black text-white font-sans cursor-pointer"
        onClick={!isTransitioning ? startTransition : undefined}
      >
        <div 
          className="absolute inset-0 w-full h-full flex flex-col items-center justify-center"
          style={{ animation: isTransitioning ? 'warpTransition 0.6s ease-in forwards' : 'none' }}
        >

          {/* LAYER 1: Full Cinematic Background (Ship + Water baked together) */}
          <div 
            className="absolute inset-0 z-0 cinematic-pan origin-center pointer-events-none"
            style={{ 
              backgroundImage: 'url(/ship_oil_spill.jpg)',
              backgroundSize: 'cover', // Prevent tiling
              backgroundPosition: 'center',
            }}
          />

          {/* LAYER 2: Environment Overlays - Rain, Vignette */}
          <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden">
            <div className="absolute top-0 left-[-50%] w-[200%] h-[200%] rain-texture rain-fall opacity-40"></div>
            <div className="absolute inset-0 bg-white transition-opacity duration-75 mix-blend-overlay" style={{ opacity: lightningOpacity }} />
            <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/80" />
          </div>

          {/* LAYER 4: Foreground Title */}
          <div className="absolute top-[15%] md:top-[20%] z-30 pointer-events-none">
            <h1 className="text-7xl md:text-9xl font-black tracking-widest text-cyan-50" style={{ animation: 'titleGlow 5s ease-in-out infinite 2s' }}>
              {TITLE.split('').map((char, i) => (
                <span 
                  key={i} 
                  className="inline-block"
                  style={{ animation: `letterEntrance 1.2s cubic-bezier(0.2, 0.8, 0.2, 1) forwards ${i * 0.04}s`, opacity: 0 }}
                >
                  {char === ' ' ? '\u00A0' : char}
                </span>
              ))}
            </h1>
          </div>
          
          {/* LAYER 5: Interactive UI */}
          <div className="absolute bottom-[10%] md:bottom-[15%] z-40 flex flex-col items-center">
            <p className="text-lg md:text-2xl text-gray-300 font-mono tracking-widest flex items-center gap-3">
              <span className="opacity-70">AWAITING INPUT</span>
              <span className="inline-block w-2 h-5 bg-cyan-400" style={{ animation: 'cursorBlink 1s step-start infinite' }}></span>
            </p>
            <div className="relative mt-6 group">
              <div className="absolute inset-0 border-2 border-cyan-400/50 rounded pointer-events-none" style={{ animation: 'sonarRipple 2s linear infinite' }}></div>
              <button 
                className="relative border border-cyan-500/60 bg-cyan-900/40 backdrop-blur-sm px-8 py-3 rounded text-cyan-200 font-bold tracking-[0.2em] transition-colors hover:bg-cyan-800/60 hover:text-white"
                style={{ animation: 'badgePulse 4s ease-in-out infinite' }}
                onClick={(e) => { e.stopPropagation(); if (!isTransitioning) startTransition(); }}
              >
                PRESS ENTER
              </button>
            </div>
          </div>
          
        </div>
      </div>
    </>
  );
}
