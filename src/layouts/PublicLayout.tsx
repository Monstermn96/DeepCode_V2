import React from 'react';
import { Outlet } from 'react-router-dom';
import styles from './PublicLayout.module.css';

export function PublicLayout() {
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