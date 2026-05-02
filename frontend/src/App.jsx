import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import { getDevices } from './api/api';
import Dashboard from './pages/Dashboard';
import History from './pages/History';
import Alerts from './pages/Alerts';
import SensorDetail from './pages/SensorDetail';
import Login from './pages/Login';
import Register from './pages/Register';
import './App.css';

function ProtectedLayout() {
  const { user, deviceChecked, setDevice } = useAuth();

  useEffect(() => {
    if (!user || deviceChecked) return;
    getDevices()
      .then(({ data }) => setDevice(data.length > 0 ? data[0] : null))
      .catch(() => setDevice(null));
  }, [user, deviceChecked, setDevice]);

  if (!user) return <Navigate to="/login" replace />;

  return <Layout />;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/" element={<ProtectedLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="history" element={<History />} />
            <Route path="alerts" element={<Alerts />} />
            <Route path="sensor/:type" element={<SensorDetail />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;

