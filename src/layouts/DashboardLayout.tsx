import type { FC } from 'react';
import { Outlet } from 'react-router-dom';
import Navigation from '../components/Navigation';
import styles from './DashboardLayout.module.css';

const DashboardLayout: FC = () => {
  return (
    <div className={styles.dashboardLayout}>
      <Navigation />
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
};

export default DashboardLayout; 