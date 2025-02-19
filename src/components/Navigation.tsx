import { NavLink, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { UserStatsService } from '../services/stats/userStats';
import styles from './Navigation.module.css';

export default function Navigation() {
  const { user, signOut } = useAuth();

  const handleInitStats = async () => {
    if (!user?.userId) {
      console.error('No user ID found:', user);
      alert('No user ID found. Check console for details.');
      return;
    }

    try {
      const userStatsService = UserStatsService.getInstance();
      await userStatsService.initializeUserStats(user.userId);
      console.log('User stats initialized successfully');
      alert('User stats initialized successfully!');
    } catch (error) {
      console.error('Error initializing user stats:', error);
      alert('Error initializing user stats. Check console for details.');
    }
  };

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
        <span className={styles.logoText}>DeepDevAi</span>
      </Link>
      
      <div className={styles.navRight}>
        {user && (
          <>
            <span className={styles.username}>{user.username}</span>
            <button onClick={handleInitStats} className={styles.initStatsButton}>
              Initialize Stats
            </button>
            <button onClick={signOut} className={styles.signOutButton}>
              Sign Out
            </button>
          </>
        )}
      </div>
    </nav>
  );
} 