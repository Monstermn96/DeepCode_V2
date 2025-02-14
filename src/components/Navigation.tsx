import { type FC } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import styles from './Navigation.module.css';
import { Button } from '@aws-amplify/ui-react';

const Navigation: FC = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/welcome');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <nav className={styles.nav}>
      <div className={styles.content}>
        <div className={styles.logo}>
          <Link to="/dashboard">DeepCode</Link>
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
          <span className={styles.username}>{user?.username}</span>
          <Button
            onClick={handleSignOut}
            variation="primary"
            size="small"
          >
            Sign Out
          </Button>
        </div>
      </div>
    </nav>
  );
};

export default Navigation; 