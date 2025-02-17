import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAI } from '../contexts/AIContext';
import styles from './ChallengeView.module.css';

export function ChallengeView() {
  const { challengeId } = useParams();
  const navigate = useNavigate();
  const { currentChallenge } = useAI();
  const [code, setCode] = React.useState('');
  const [isRunning, setIsRunning] = React.useState(false);
  const [testResults, setTestResults] = React.useState<any[]>([]);

  React.useEffect(() => {
    if (!currentChallenge) {
      console.log('No challenge found, redirecting to dashboard');
      navigate('/dashboard');
      return;
    }

    console.log('Loading challenge:', {
      id: challengeId,
      title: currentChallenge.title,
      language: currentChallenge.language
    });

    // Initialize editor with starter code
    setCode(currentChallenge.starterCode || '');
  }, [challengeId, currentChallenge, navigate]);

  const handleRunTests = async () => {
    try {
      console.log('Running tests for challenge:', challengeId);
      setIsRunning(true);
      
      // TODO: Implement test running logic
      const results = await Promise.resolve([]); // Placeholder
      
      console.log('Test results:', results);
      setTestResults(results);
    } catch (error) {
      console.error('Failed to run tests:', error);
    } finally {
      setIsRunning(false);
    }
  };

  if (!currentChallenge) {
    return null;
  }

  return (
    <div className={styles.challengeView}>
      <div className={styles.problemPanel}>
        <h1 className={styles.title}>{currentChallenge.title}</h1>
        <div className={styles.description}>
          {currentChallenge.description}
        </div>
        
        <div className={styles.testCases}>
          <h2>Test Cases</h2>
          {currentChallenge.testCases.map((testCase: any, index: number) => (
            <div key={index} className={styles.testCase}>
              <div className={styles.testHeader}>
                <span>Test {index + 1}</span>
                {testResults[index] && (
                  <span className={`${styles.testResult} ${testResults[index].passed ? styles.passed : styles.failed}`}>
                    {testResults[index].passed ? '✓' : '✗'}
                  </span>
                )}
              </div>
              <div className={styles.testDetails}>
                <div>Input: <code>{testCase.input}</code></div>
                <div>Expected: <code>{testCase.expectedOutput}</code></div>
                {testResults[index]?.actual && (
                  <div>Actual: <code>{testResults[index].actual}</code></div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.editorPanel}>
        <div className={styles.editorHeader}>
          <span>{currentChallenge.language}</span>
          <button
            className={styles.runButton}
            onClick={handleRunTests}
            disabled={isRunning}
          >
            {isRunning ? (
              <>
                <div className={styles.loadingSpinner} />
                Running...
              </>
            ) : (
              'Run Tests'
            )}
          </button>
        </div>
        
        <div className={styles.editor}>
          {/* TODO: Integrate Monaco Editor */}
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className={styles.textarea}
            placeholder="Your code here..."
          />
        </div>
      </div>
    </div>
  );
} 