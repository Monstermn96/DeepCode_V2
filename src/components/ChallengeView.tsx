import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAI } from '../contexts/AIContext';
import { aiService, type SupportedLanguage } from '../services/ai/openai';
import styles from './ChallengeView.module.css';

interface TestResult {
  passed: boolean;
  actual?: string;
  explanation?: string;
}

interface Example {
  input: Record<string, any>;
  output: any;
}

export function ChallengeView() {
  const { challengeId } = useParams();
  const navigate = useNavigate();
  const { currentChallenge } = useAI();
  const [code, setCode] = React.useState('');
  const [isRunning, setIsRunning] = React.useState(false);
  const [testResults, setTestResults] = React.useState<TestResult[]>([]);

  React.useEffect(() => {
    if (!currentChallenge) {
      console.log('No challenge found, redirecting to dashboard');
      navigate('/dashboard');
      return;
    }

    console.log('Loading challenge:', {
      id: challengeId,
      challenge: currentChallenge
    });

    // Initialize editor with starter code if available
    if (currentChallenge.problem?.examples?.[0]?.input) {
      setCode(JSON.stringify(currentChallenge.problem.examples[0].input, null, 2));
    }
  }, [challengeId, currentChallenge, navigate]);

  const handleRunTests = async () => {
    if (!currentChallenge) return;

    try {
      console.log('Running tests for challenge:', challengeId);
      setIsRunning(true);
      
      const response = await aiService.evaluateCode(
        code,
        currentChallenge.problem.examples.map((ex: Example) => ({
          input: JSON.stringify(ex.input),
          expectedOutput: ex.output.toString()
        })),
        (currentChallenge.problem.language || 'C#') as SupportedLanguage
      );

      console.log('Test results:', response);

      // Map the evaluation response to test results
      const results = response.data.results.map((passed, index) => ({
        passed,
        explanation: response.data.explanations[index]
      }));
      
      setTestResults(results);
    } catch (error) {
      console.error('Failed to run tests:', error);
    } finally {
      setIsRunning(false);
    }
  };

  if (!currentChallenge?.problem) {
    return null;
  }

  return (
    <div className={styles.challengeView}>
      <div className={styles.problemPanel}>
        <h1 className={styles.title}>{currentChallenge.problem.title}</h1>
        <div className={styles.description}>
          {currentChallenge.problem.description}
        </div>
        
        <div className={styles.testCases}>
          <h2>Test Cases</h2>
          {currentChallenge.problem.examples.map((example: Example, index: number) => (
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
                <div>Input: <code>{JSON.stringify(example.input, null, 2)}</code></div>
                <div>Expected: <code>{example.output}</code></div>
                {testResults[index] && !testResults[index].passed && (
                  <div className={styles.explanation}>
                    {testResults[index].explanation}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {currentChallenge.problem.hints && currentChallenge.problem.hints.length > 0 && (
          <div className={styles.hints}>
            <h2>Hints</h2>
            <ul>
              {currentChallenge.problem.hints.map((hint: string, index: number) => (
                <li key={index}>{hint}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className={styles.editorPanel}>
        <div className={styles.editorHeader}>
          <span>{currentChallenge.problem.language || 'C#'}</span>
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