// import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import styles from './Profile.module.css';
import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { UserStatsService, UserStats } from '../services/stats/userStats';

interface ProgressBarProps {
  value: number;
  max: number;
  color?: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ value, max, color = '#0070f3' }) => (
  <div className={styles.progressBarContainer}>
    <div 
      className={styles.progressBar}
      style={{ 
        width: `${(value / max) * 100}%`,
        backgroundColor: color
      }}
    />
  </div>
);

export default function Profile() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'subscription'>('overview');
  const [showTipMessage, setShowTipMessage] = useState(false);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [monthlyUsage, setMonthlyUsage] = useState<{
    totalTokens: number;
    totalCost: number;
    challengesGenerated: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.userId) return;

      try {
        const statsService = UserStatsService.getInstance();
        
        // Fetch user stats
        const stats = await statsService.getUserStats(user.userId);
        if (stats) {
          setUserStats(stats);
        } else {
          const initialStats = await statsService.initializeUserStats(user.userId);
          setUserStats(initialStats);
        }

        // Fetch current month's usage
        const currentYearMonth = new Date().toISOString().substring(0, 7);
        const usage = await statsService.getMonthlyUsage(user.userId, currentYearMonth);
        setMonthlyUsage(usage);
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user?.userId]);

  // Function to handle tip button click
  const handleTipClick = () => {
    setShowTipMessage(true);
    setTimeout(() => setShowTipMessage(false), 3000);
  };

  if (loading) {
    return <div className={styles.loading}>Loading...</div>;
  }

  return (
    <div className={styles.profile}>
      {/* Header Section */}
      <div className={styles.header}>
        <div className={styles.userInfo}>
          <div className={styles.avatar}>
            {user?.username?.[0]?.toUpperCase() || '?'}
          </div>
          <div className={styles.userDetails}>
            <h1>{user?.username || 'User'}</h1>
            <p>{user?.email}</p>
            <div className={styles.subscriptionBadge}>
              Pre-Alpha Access
            </div>
          </div>
        </div>
        <div className={styles.quickStats}>
          <div className={styles.quickStat}>
            <span className={styles.value}>{userStats?.completedChallenges || 0}</span>
            <span className={styles.label}>Challenges</span>
          </div>
          <div className={styles.quickStat}>
            <span className={styles.value}>{userStats?.currentStreak || 0}🔥</span>
            <span className={styles.label}>Day Streak</span>
          </div>
          <div className={styles.quickStat}>
            <span className={styles.value}>{userStats?.totalPoints || 0}⭐</span>
            <span className={styles.label}>Points</span>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className={styles.tabs}>
        <button 
          className={`${styles.tab} ${activeTab === 'overview' ? styles.active : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button 
          className={`${styles.tab} ${activeTab === 'subscription' ? styles.active : ''}`}
          onClick={() => setActiveTab('subscription')}
        >
          Subscription
        </button>
      </div>

      {/* Content Section */}
      <div className={styles.content}>
        {activeTab === 'overview' ? (
          <>
            {/* Language Proficiency Section */}
            <div className={styles.section}>
              <h2>Language Proficiency</h2>
              <div className={styles.languageGrid}>
                {Object.entries(userStats?.languageStats || {}).map(([lang, stats]) => (
                  <div key={lang} className={styles.languageCard}>
                    <div className={styles.languageHeader}>
                      <h3>{lang}</h3>
                      <span>{stats.completed} challenges</span>
                    </div>
                    <ProgressBar 
                      value={stats.proficiency} 
                      max={100} 
                      color={
                        stats.proficiency > 80 ? '#22c55e' : 
                        stats.proficiency > 60 ? '#3b82f6' : 
                        '#f59e0b'
                      } 
                    />
                    <span className={styles.proficiencyLabel}>
                      {stats.proficiency}% Proficiency
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Monthly Usage Section */}
            <div className={styles.section}>
              <h2>This Month's Usage</h2>
              <div className={styles.usageStats}>
                <div className={styles.usageStat}>
                  <span className={styles.label}>Total Tokens Used</span>
                  <span className={styles.value}>{monthlyUsage?.totalTokens?.toLocaleString() || 0}</span>
                </div>
                <div className={styles.usageStat}>
                  <span className={styles.label}>Estimated Cost</span>
                  <span className={styles.value}>
                    ${monthlyUsage?.totalCost?.toFixed(2) || '0.00'}
                  </span>
                </div>
                <div className={styles.usageStat}>
                  <span className={styles.label}>Challenges Generated</span>
                  <span className={styles.value}>
                    {monthlyUsage?.challengesGenerated || 0}
                  </span>
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Subscription Section */}
            <div className={styles.section}>
              <div className={styles.subscriptionHeader}>
                <h2>Pre-Alpha Access</h2>
                <div className={styles.preAlphaBadge}>
                  🚧 Work in Progress
                </div>
              </div>
              
              <div className={styles.subscriptionCard}>
                <div className={styles.welcomeMessage}>
                  <h3>🎉 Welcome to the Future of AI Learning!</h3>
                  <p>You're one of our early explorers helping shape DeepDevAI. While we're still in pre-alpha, 
                    you have full access to all features as we develop them!</p>
                </div>

                <div className={styles.features}>
                  <h4>What You Get:</h4>
                  <ul className={styles.featureList}>
                    <li>✨ Early Access to New Features</li>
                    <li>🤖 Unlimited AI Challenges</li>
                    <li>🎯 Custom Learning Paths</li>
                    <li>🚀 Helping Shape the Future of AI Learning!</li>
                  </ul>
                </div>

                <div className={styles.costInfo}>
                  <h4>A Note About Costs:</h4>
                  <p>While access is currently free, please note:</p>
                  <ul>
                    <li>OpenAI API Usage (~$0.01-0.03 per challenge)</li>
                    <li>AWS Infrastructure (minimal)</li>
                    <li>Developer's Coffee ☕</li>
                  </ul>
                  
                  {/* Current Month's Usage Summary */}
                  <div className={styles.currentUsage}>
                    <h4>Your Current Month's Usage:</h4>
                    <p>Total Tokens: {monthlyUsage?.totalTokens?.toLocaleString() || 0}</p>
                    <p>Estimated Cost: ${monthlyUsage?.totalCost?.toFixed(2) || '0.00'}</p>
                    <p>Challenges Generated: {monthlyUsage?.challengesGenerated || 0}</p>
                  </div>
                </div>

                <div className={styles.tipSection}>
                  <div className={styles.tipMessage}>
                    <h4>💝 Support the Development</h4>
                    <p>If you're enjoying DeepDevAI and want to support its development (or just buy me a coffee), 
                      tips are always appreciated but never required!</p>
                  </div>
                  
                  <div className={styles.qrContainer}>
                    <QRCodeSVG
                      value="https://venmo.com/Eric-Bischetsrieder"
                      size={150}
                      level="L"
                      includeMargin={true}
                      className={styles.qrCode}
                    />
                    <p className={styles.qrLabel}>@Eric-Bischetsrieder</p>
                  </div>

                  <button 
                    className={styles.tipButton}
                    onClick={handleTipClick}
                  >
                    Open Venmo
                  </button>
                  
                  {showTipMessage && (
                    <div className={styles.thankYouMessage}>
                      Thank you for your support! 🙏
                    </div>
                  )}
                </div>

                <div className={styles.disclaimer}>
                  <p>Note: This is a pre-alpha version, and features may change. Your feedback helps shape the future of DeepDevAI!</p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
} 