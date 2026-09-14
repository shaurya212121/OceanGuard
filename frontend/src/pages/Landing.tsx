import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Anchor, Satellite, Route, ShieldCheck, ArrowRight, BarChart3, Cpu } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-navy-950 text-text overflow-hidden relative flex flex-col justify-between">
      {/* Background elements */}
      <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-navy-800 via-navy-950 to-navy-950" />
      <div className="absolute top-1/3 left-0 w-full h-[1px] bg-ocean/20 shadow-[0_0_15px_rgba(6,182,212,0.5)]" />
      
      <div className="relative z-10 flex flex-col items-center justify-center flex-1 text-center px-4 pt-16">
        <motion.div initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.8 }}>
          <Anchor className="text-ocean mx-auto mb-4" size={56} />
          <h1 className="text-6xl font-bold tracking-tight mb-4">
            OceanGuard <span className="text-transparent bg-clip-text bg-gradient-to-r from-ocean to-ocean-light">AI</span>
          </h1>
          <div className="inline-block bg-navy-900 border border-line px-3 py-1 rounded-full text-xs font-mono text-warning mb-6">
            SIH 2026 • Problem Statement SIH26143 Prototype
          </div>
          <p className="text-xl text-text-muted max-w-2xl mx-auto mb-8">
            Marine Oil Spill Detection, Particle Drift Hindcasting, and Counterfactual AIS Vessel Attribution System.
          </p>
        </motion.div>

        <div className="flex flex-wrap justify-center gap-4">
          <motion.button 
            initial={{ scale: 0.9, opacity: 0 }} 
            animate={{ scale: 1, opacity: 1 }} 
            transition={{ delay: 0.3 }}
            onClick={() => navigate('/dashboard')}
            className="bg-ocean hover:bg-ocean-light text-navy-950 font-bold px-8 py-3.5 rounded-lg flex items-center gap-2 transition-all hover:scale-105 hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] cursor-pointer"
          >
            Launch Investigation Console <ArrowRight size={20} />
          </motion.button>

          <motion.button 
            initial={{ scale: 0.9, opacity: 0 }} 
            animate={{ scale: 1, opacity: 1 }} 
            transition={{ delay: 0.4 }}
            onClick={() => navigate('/evaluation')}
            className="bg-navy-900 hover:bg-navy-800 text-text border border-line font-bold px-6 py-3.5 rounded-lg flex items-center gap-2 transition-all cursor-pointer"
          >
            <BarChart3 size={20} className="text-ocean" /> Ground-Truth Benchmark
          </motion.button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 max-w-5xl mx-auto">
          {[
            { icon: <Satellite size={24} className="text-ocean"/>, title: 'SAR Satellite Detection', desc: 'Preprocesses SAR intensity imagery, handles speckle noise, and evaluates multi-class look-alike probabilities.' },
            { icon: <Route size={24} className="text-ocean"/>, title: 'Physical Drift Hindcasting', desc: 'Multi-particle Lagrangian drift simulation outputting probable source regions and release windows.' },
            { icon: <Cpu size={24} className="text-ocean"/>, title: 'Counterfactual Validation', desc: 'Simulates forward drift from candidate vessel trajectories to compute spatial physical overlap IoU.' }
          ].map((feature, i) => (
            <motion.div key={i} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 + (i*0.2) }} className="bg-navy-900/50 backdrop-blur-sm border border-line p-6 rounded-xl text-left">
              <div className="bg-navy-800 p-3 rounded-lg inline-block mb-4">{feature.icon}</div>
              <h3 className="text-lg font-bold mb-2">{feature.title}</h3>
              <p className="text-text-muted text-sm">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="relative z-10 border-t border-line bg-navy-900/80 backdrop-blur-md py-4">
        <div className="max-w-6xl mx-auto flex flex-wrap justify-center gap-10 text-xs font-mono text-ocean-light">
          <span>MULTI-FACTOR AIS ATTRIBUTION</span>
          <span>ENSEMBLE DRIFT HINDCASTING</span>
          <span>SENTINEL-1 SAR ANALYSIS</span>
          <span>EVIDENCE-BASED CANDIDATE RANKING</span>
        </div>
      </div>
    </div>
  );
}
