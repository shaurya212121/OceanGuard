import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import Dashboard from '@/pages/Dashboard';
import LiveTacticalMap from '@/pages/LiveTacticalMap';
import InvestigationsDesk from '@/pages/InvestigationsDesk';
import VesselsRegistry from '@/pages/VesselsRegistry';
import AnalyticsReports from '@/pages/AnalyticsReports';
import LiveDetectionDemo from '@/pages/LiveDetectionDemo';
import StartingPage from '@/pages/StartingPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<StartingPage />} />
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/map" element={<LiveTacticalMap />} />
          <Route path="/investigations" element={<InvestigationsDesk />} />
          <Route path="/vessels" element={<VesselsRegistry />} />
          <Route path="/analytics" element={<AnalyticsReports />} />
          <Route path="/detect" element={<LiveDetectionDemo />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
