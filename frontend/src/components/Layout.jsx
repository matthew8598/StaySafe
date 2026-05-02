import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { AlertCenterProvider, useAlertCenter } from '../context/AlertCenterContext';

function LayoutShell() {
  const { activeAlertCount } = useAlertCenter();

  return (
    <div className="layout">
      <Sidebar activeAlertCount={activeAlertCount} />
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}

export default function Layout() {
  return (
    <AlertCenterProvider>
      <LayoutShell />
    </AlertCenterProvider>
  );
}
