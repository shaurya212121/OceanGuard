import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { AppLayout } from './components/layout';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import LiveMap from './pages/LiveMap';
import Investigation from './pages/Investigation';
import Vessels from './pages/Vessels';
import Reports from './pages/Reports';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route element={<AppLayout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/map" element={<LiveMap />} />
        <Route path="/investigation/:id" element={<Investigation />} />
        <Route path="/vessels" element={<Vessels />} />
        <Route path="/reports" element={<Reports />} />
      </Route>
    </Routes>
  );
}

export default App;
