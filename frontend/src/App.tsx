import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import Dashboard from '@/pages/Dashboard';
import LiveTacticalMap from '@/pages/LiveTacticalMap';
import InvestigationsDesk from '@/pages/InvestigationsDesk';
import VesselsRegistry from '@/pages/VesselsRegistry';
import AnalyticsReports from '@/pages/AnalyticsReports';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/map" element={<LiveTacticalMap />} />
          <Route path="/investigations" element={<InvestigationsDesk />} />
          <Route path="/vessels" element={<VesselsRegistry />} />
          <Route path="/analytics" element={<AnalyticsReports />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
