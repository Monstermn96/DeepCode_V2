import React from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import styles from './DashboardLayout.module.css';

export function DashboardLayout() {
  const { user, isLoading, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/welcome');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner} />
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className={styles.layout}>
      <nav className={styles.nav}>
        <div className={styles.logo}>
          <h1>DeepCode</h1>
        </div>
        <ul className={styles.menu}>
          <li>
            <Link to="/dashboard">Dashboard</Link>
          </li>
          <li>
            <Link to="/challenges">Challenges</Link>
          </li>
          <li>
            <Link to="/profile">Profile</Link>
          </li>
        </ul>
        <div className={styles.user}>
          <span>{user?.username}</span>
          <button 
            onClick={handleSignOut} 
            className={styles.signOut}
            disabled={isLoading}
          >
            {isLoading ? 'Signing out...' : 'Sign Out'}
          </button>
        </div>
      </nav>
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
} 