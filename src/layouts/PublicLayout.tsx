import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import styles from './PublicLayout.module.css';

export default function PublicLayout() {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        backgroundColor: '#1e1e1e',
        color: '#fff'
      }}>
        <div>Loading...</div>
      </div>
    );
  }

  // Redirect to dashboard if already authenticated
  if (isAuthenticated && location.pathname !== '/welcome') {
    return <Navigate to="/dashboard" replace />;
  }

  // Render the public route content
  return (
    <div className={styles.layout}>
      <main className={styles.main}>
        <Outlet />
      </main>
      <footer className={styles.footer}>
        <p>Built with AWS Amplify Gen2</p>
      </footer>
    </div>
  );
} 