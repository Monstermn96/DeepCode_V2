import React from 'react';
import { logger } from '../utils/logger';

export const EnvironmentDebug: React.FC = () => {
  const envInfo = logger.getEnvironmentInfo();
  
  // Only show in development or when debug is enabled
  if (envInfo.isProduction && !import.meta.env?.VITE_SHOW_ENV_DEBUG) {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      background: 'rgba(0,0,0,0.8)',
      color: 'white',
      padding: '8px',
      borderRadius: '4px',
      fontSize: '12px',
      zIndex: 9999,
      fontFamily: 'monospace'
    }}>
      <div>🌍 Environment Debug</div>
      <div>Dev: {envInfo.isDevelopment ? '✅' : '❌'}</div>
      <div>Local: {envInfo.isLocalhost ? '✅' : '❌'}</div>
      <div>Prod: {envInfo.isProduction ? '🔒' : '🚧'}</div>
      <div>Logs: {envInfo.logLevel}</div>
      <div>Host: {window.location.hostname}</div>
    </div>
  );
}; 