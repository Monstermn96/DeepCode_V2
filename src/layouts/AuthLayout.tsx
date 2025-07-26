import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function AuthLayout() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  console.log('🛡️ AuthLayout check:', { 
    isAuthenticated, 
    isLoading, 
    hasUser: !!user,
    currentPath: location.pathname 
  });

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        backgroundColor: '#1e1e1e',
        color: '#fff',
        flexDirection: 'column',
        gap: '20px'
      }}>
        <div className="spinner" style={{
          width: '40px',
          height: '40px',
          border: '4px solid #333',
          borderTop: '4px solid #007acc',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <div>Checking authentication...</div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    console.log('❌ Not authenticated, redirecting to login');
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  console.log('✅ Authenticated, rendering protected content');
  // Render the protected route content if authenticated
  return <Outlet />;
} 