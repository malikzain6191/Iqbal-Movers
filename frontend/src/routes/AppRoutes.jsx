import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import Layout from '../components/Layout';

import Login from '../pages/Login';
import Dashboard from '../pages/Dashboard';
import Cities from '../pages/Cities';
import Fleet from '../pages/Fleet';
import Drivers from '../pages/Drivers';
import RoutesPage from '../pages/Routes';
import Schedules from '../pages/Schedules';
import Booking from '../pages/Booking';
import Manifest from '../pages/Manifest';
import Users from '../pages/Users';
import Reports from '../pages/Reports';
import Audit from '../pages/Audit';

// Nav config lives here too — Layout/Sidebar reads it, so adding a page
// means adding one route below + one entry in NAV_ITEMS.
export const NAV_ITEMS = [
  { path: '/dashboard', label: '📊 Dashboard', roles: ['super_admin', 'city_admin', 'counter_operator'] },
  { path: '/cities', label: '🏙 Cities & Terminals', roles: ['super_admin', 'city_admin'] },
  { path: '/fleet', label: '🚌 Fleet', roles: ['super_admin', 'city_admin'] },
  { path: '/drivers', label: '🧑‍✈️ Drivers', roles: ['super_admin', 'city_admin'] },
  { path: '/routes', label: '🗺 Routes', roles: ['super_admin', 'city_admin'] },
  { path: '/schedules', label: '📅 Schedules & Availability', roles: ['super_admin', 'city_admin'] },
  { path: '/booking', label: '🎟 Ticket Booking', roles: ['super_admin', 'city_admin', 'counter_operator'] },
  { path: '/manifest', label: '📋 Manifests', roles: ['super_admin', 'city_admin', 'counter_operator'] },
  { path: '/users', label: '👤 Users & Permissions', roles: ['super_admin'] },
  { path: '/reports', label: '📈 Reports & Cash', roles: ['super_admin', 'city_admin', 'counter_operator'] },
  { path: '/audit', label: '🕓 Audit Log', roles: ['super_admin', 'city_admin'] }
];

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/cities" element={<ProtectedRoute roles={['super_admin', 'city_admin']}><Cities /></ProtectedRoute>} />
        <Route path="/fleet" element={<ProtectedRoute roles={['super_admin', 'city_admin']}><Fleet /></ProtectedRoute>} />
        <Route path="/drivers" element={<ProtectedRoute roles={['super_admin', 'city_admin']}><Drivers /></ProtectedRoute>} />
        <Route path="/routes" element={<ProtectedRoute roles={['super_admin', 'city_admin']}><RoutesPage /></ProtectedRoute>} />
        <Route path="/schedules" element={<ProtectedRoute roles={['super_admin', 'city_admin']}><Schedules /></ProtectedRoute>} />
        <Route path="/booking" element={<Booking />} />
        <Route path="/manifest" element={<Manifest />} />
        <Route path="/users" element={<ProtectedRoute roles={['super_admin']}><Users /></ProtectedRoute>} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/audit" element={<ProtectedRoute roles={['super_admin', 'city_admin']}><Audit /></ProtectedRoute>} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
