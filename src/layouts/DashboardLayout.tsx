import type { FC } from 'react';
import { Outlet } from 'react-router-dom';
import Navigation from '../components/Navigation';

const DashboardLayout: FC = () => {
  return (
    <div className="dashboard-layout">
      <Navigation />
      <main>
        <Outlet />
      </main>
    </div>
  );
};

export default DashboardLayout; 