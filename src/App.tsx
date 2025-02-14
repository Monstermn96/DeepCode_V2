import React, { Suspense } from 'react';
import '@aws-amplify/ui-react/styles.css';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AIProvider } from './contexts/AIContext';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { PublicLayout } from './layouts/PublicLayout';
import { AuthLayout } from './layouts/AuthLayout';
import { DashboardLayout } from './layouts/DashboardLayout';
import WelcomeScreen from './components/WelcomeScreen';
import { Authenticator } from '@aws-amplify/ui-react';
import styles from './App.module.css';

// Lazy load other components
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Challenges = React.lazy(() => import('./pages/Challenges'));
const Profile = React.lazy(() => import('./pages/Profile'));

function LoginPage() {
  const navigate = useNavigate();

  return (
    <div className={styles.authContainer}>
      <Authenticator>
        {({ user }) => {
          setTimeout(() => navigate('/dashboard'), 0);
          return <div className={styles.loadingContainer}>
            <div className={styles.loadingSpinner} />
            <p>Redirecting to dashboard...</p>
          </div>;
        }}
      </Authenticator>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AIProvider>
          <BrowserRouter>
            <Routes>
              {/* Public routes */}
              <Route element={<PublicLayout />}>
                <Route path="/welcome" element={<WelcomeScreen />} />
                <Route path="/" element={<Navigate to="/welcome" replace />} />
                <Route path="/login" element={<LoginPage />} />
              </Route>

              {/* Protected routes */}
              <Route element={<AuthLayout />}>
                <Route element={<DashboardLayout />}>
                  <Route path="/dashboard" element={
                    <Suspense fallback={<div>Loading...</div>}>
                      <Dashboard />
                    </Suspense>
                  } />
                  <Route path="/challenges" element={
                    <Suspense fallback={<div>Loading...</div>}>
                      <Challenges />
                    </Suspense>
                  } />
                  <Route path="/profile" element={
                    <Suspense fallback={<div>Loading...</div>}>
                      <Profile />
                    </Suspense>
                  } />
                </Route>
              </Route>

              {/* Catch all route */}
              <Route path="*" element={<Navigate to="/welcome" replace />} />
            </Routes>
          </BrowserRouter>
        </AIProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
