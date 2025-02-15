import { NavLink, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import styles from './Navigation.module.css';

export default function Navigation() {
  const { user, signOut } = useAuth();

  return (
    <nav className={styles.nav}>
      <div className={styles.navLeft}>
        <NavLink 
          to="/dashboard" 
          className={({ isActive }) => 
            `${styles.navLink} ${isActive ? styles.active : ''}`
          }
        >
          Dashboard
        </NavLink>
        <NavLink 
          to="/challenges" 
          className={({ isActive }) => 
            `${styles.navLink} ${isActive ? styles.active : ''}`
          }
        >
          Challenges
        </NavLink>
        <NavLink 
          to="/profile" 
          className={({ isActive }) => 
            `${styles.navLink} ${isActive ? styles.active : ''}`
          }
        >
          Profile
        </NavLink>
      </div>

      <Link to="/dashboard" className={styles.logo}>
        <span className={styles.logoIcon}>⚡</span>
        <span className={styles.logoText}>DeepCode</span>
      </Link>
      
      <div className={styles.navRight}>
        {user && (
          <>
            <span className={styles.username}>{user.username}</span>
            <button onClick={signOut} className={styles.signOutButton}>
              Sign Out
            </button>
          </>
        )}
      </div>
    </nav>
  );
} 