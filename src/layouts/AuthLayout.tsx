import { Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function AuthLayout() {
  const { isLoading } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return <Outlet />;
} 