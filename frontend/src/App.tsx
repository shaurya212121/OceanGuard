import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { AppLayout } from './components/layout';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import LiveMap from './pages/LiveMap';
import InvestigationConsole from './pages/InvestigationConsole';
import Simulation from './pages/Simulation';
import Vessels from './pages/Vessels';
import Reports from './pages/Reports';
import Evaluation from './pages/Evaluation';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route element={<AppLayout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/map" element={<LiveMap />} />
        <Route path="/simulation" element={<Simulation />} />
        <Route path="/investigation/:id" element={<InvestigationConsole />} />
        <Route path="/vessels" element={<Vessels />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/evaluation" element={<Evaluation />} />
      </Route>
    </Routes>
  );
}

export default App;
