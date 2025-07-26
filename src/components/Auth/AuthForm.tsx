import React, { useState, useEffect } from 'react';
import { CSSTransition } from 'react-transition-group';
import { signIn, signUp, confirmSignUp, resendSignUpCode, getCurrentUser } from '@aws-amplify/auth';
import { UserStatsService } from '../../services/stats/userStats';

import './Auth.css';

interface AuthFormProps {
  onClose?: () => void;
  show: boolean;
  onSuccess?: () => void;
}

interface PasswordValidation {
  hasMinLength: boolean;
  hasUpperCase: boolean;
  hasLowerCase: boolean;
  hasNumber: boolean;
  hasSpecialChar: boolean;
}

interface VerificationFormProps {
  email: string;
  onVerified: () => void;
  onCancel: () => void;
  isLoading: boolean;
  error: string | null;
  setError: (error: string | null) => void;
}

const VerificationForm = ({ 
  email, 
  onVerified, 
  onCancel, 
  isLoading, 
  error, 
  setError 
}: VerificationFormProps) => {
  const [verificationCode, setVerificationCode] = useState('');

  const handleVerificationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationCode.trim()) {
      setError('Verification code is required');
      return;
    }

    try {
      await confirmSignUp({
        username: email,
        confirmationCode: verificationCode
      });
      onVerified();
    } catch (err) {
      console.error('Verification failed:', err);
      setError(err instanceof Error ? err.message : 'Verification failed. Please try again.');
    }
  };

  const handleResendCode = async () => {
    try {
      await resendSignUpCode({ username: email });
      setError('A new verification code has been sent to your email.');
    } catch (err) {
      console.error('Failed to resend code:', err);
      setError(err instanceof Error ? err.message : 'Failed to resend code. Please try again.');
    }
  };

  return (
    <div className="verification-form">
      <h3>Verify Your Email</h3>
      <p>We've sent a verification code to {email}</p>
      
      <form onSubmit={handleVerificationSubmit}>
        <div className="form-group">
          <input
            type="text"
            value={verificationCode}
            onChange={(e) => setVerificationCode(e.target.value)}
            placeholder="Enter verification code"
            className="auth-input"
            disabled={isLoading}
          />
        </div>

        <button 
          type="submit" 
          className="auth-submit-button"
          disabled={isLoading}
        >
          {isLoading ? (
            <div className="loading-spinner" />
          ) : (
            'Verify Email'
          )}
        </button>
      </form>

      <div className="verification-actions">
        <button
          onClick={handleResendCode}
          className="resend-button"
          disabled={isLoading}
        >
          Resend verification code
        </button>
        <button
          onClick={onCancel}
          className="cancel-button"
          disabled={isLoading}
        >
          Cancel
        </button>
      </div>

      {error && (
        <div className="auth-error-message">
          {error}
        </div>
      )}
    </div>
  );
};

export const AuthForm: React.FC<AuthFormProps> = ({ onClose, show, onSuccess }) => {
  const nodeRef = React.useRef(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPasswordRequirements, setShowPasswordRequirements] = useState(false);
  const [passwordValidation, setPasswordValidation] = useState<PasswordValidation>({
    hasMinLength: false,
    hasUpperCase: false,
    hasLowerCase: false,
    hasNumber: false,
    hasSpecialChar: false
  });

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const [needsVerification, setNeedsVerification] = useState(false);

  useEffect(() => {
    checkAuthState();
  }, [onSuccess]);

  const checkAuthState = async () => {
    try {
      const user = await getCurrentUser();
      if (user && onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.log('No user is currently signed in');
    } finally {
      setIsLoading(false);
    }
  };

  const validatePassword = (password: string): PasswordValidation => {
    return {
      hasMinLength: password.length >= 8,
      hasUpperCase: /[A-Z]/.test(password),
      hasLowerCase: /[a-z]/.test(password),
      hasNumber: /[0-9]/.test(password),
      hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    };
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    if (name === 'password') {
      setPasswordValidation(validatePassword(value));
      setShowPasswordRequirements(true);
    }

    if (error) setError(null);
  };

  const isPasswordValid = (validation: PasswordValidation): boolean => {
    return Object.values(validation).every(value => value);
  };

  const validateForm = () => {
    if (isSignUp) {
      if (!formData.username.trim()) {
        setError('Username is required');
        return false;
      }
      if (!formData.email.trim()) {
        setError('Email is required');
        return false;
      }
      if (!formData.password.trim()) {
        setError('Password is required');
        return false;
      }
      if (!isPasswordValid(passwordValidation)) {
        setError('Password does not meet all requirements');
        return false;
      }
      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match');
        return false;
      }
    } else {
      if (!formData.email.trim()) {
        setError('Email is required');
        return false;
      }
      if (!formData.password.trim()) {
        setError('Password is required');
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) return;

    setIsLoading(true);
    try {
      if (isSignUp) {
        try {
          await signUp({
            username: formData.email,
            password: formData.password,
            options: {
              userAttributes: {
                email: formData.email,
                nickname: formData.username
              }
            }
          });
          setNeedsVerification(true);
        } catch (err: any) {
          if (err.name === 'UsernameExistsException') {
            setError('An account with this email already exists. Please sign in instead.');
            setIsSignUp(false);
          } else {
            throw err;
          }
        }
      } else {
        try {
          await signIn({
            username: formData.email,
            password: formData.password
          });
          if (onSuccess) onSuccess();
        } catch (err: any) {
          if (err.name === 'UserNotFoundException') {
            setError('No account found with this email. Please sign up first.');
            setIsSignUp(true);
          } else if (err.name === 'NotAuthorizedException') {
            setError('Incorrect password. Please try again.');
          } else if (err.name === 'UserNotConfirmedException') {
            setNeedsVerification(true);
            try {
              await resendSignUpCode({ username: formData.email });
              setError('Account not verified. A new verification code has been sent to your email.');
            } catch (resendErr) {
              console.error('Failed to resend verification code:', resendErr);
              setError('Failed to resend verification code. Please try again.');
            }
          } else {
            throw err;
          }
        }
      }
    } catch (err) {
      console.error('Authentication failed:', err);
      if (err instanceof Error) {
        if (err.message.includes('Auth.Cognito')) {
          setError('Authentication service is not configured. Please ensure you are running the sandbox.');
        } else {
          setError(err.message);
        }
      } else {
        setError('Authentication failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerificationSuccess = async () => {
    setNeedsVerification(false);
    setError(null);
    setIsLoading(true);
    
    try {
      console.log('Attempting sign in after verification...');
      await signIn({
        username: formData.email,
        password: formData.password
      });
      console.log('Sign in successful');

      // Get current user after successful sign in
      const currentUser = await getCurrentUser();
      
      // Initialize user stats with the correct user ID
      try {
        const userStatsService = UserStatsService.getInstance();
        await userStatsService.initializeUserStats(currentUser.userId);
        console.log('User stats initialized successfully');
      } catch (statsError) {
        console.error('Error initializing user stats:', statsError);
        // Don't block the sign-in process if stats initialization fails
      }

      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Sign in after verification failed:', err);
      setError(
        err instanceof Error 
          ? `Sign in failed: ${err.message}. Please try signing in manually.`
          : 'Sign in failed. Please try signing in manually.'
      );
      setIsSignUp(false);
      setFormData(prev => ({
        ...prev,
        password: '',
        confirmPassword: ''
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const switchMode = () => {
    setIsSignUp(!isSignUp);
    setError(null);
    setShowPasswordRequirements(false);
    setFormData({
      username: '',
      email: '',
      password: '',
      confirmPassword: ''
    });
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <CSSTransition
      in={show}
      timeout={200}
      classNames="auth-transition"
      unmountOnExit
      nodeRef={nodeRef}
    >
      <div className="auth-overlay" ref={nodeRef}>
        <div className="auth-modal">
          {onClose && (
            <button 
              className="auth-close-button" 
              onClick={onClose}
              disabled={isLoading}
            >
              ×
            </button>
          )}
          <div className="auth-content">
            <div className="auth-header">
              <div className="auth-logo">
                <span className="logo-icon">⚡</span>
                <span className="logo-text">DeepDevAi</span>
              </div>
              {!needsVerification && (
                <>
                  <h2>{isSignUp ? 'Create Account' : 'Welcome Back'}</h2>
                  <p className="auth-subtitle">
                    {isSignUp 
                      ? 'Start your coding journey'
                      : 'Continue your coding journey'}
                  </p>
                </>
              )}
            </div>

            <div className="auth-body">
              {needsVerification ? (
                <VerificationForm
                  email={formData.email}
                  onVerified={handleVerificationSuccess}
                  onCancel={() => setNeedsVerification(false)}
                  isLoading={isLoading}
                  error={error}
                  setError={setError}
                />
              ) : (
                <form onSubmit={handleSubmit} className="auth-form">
                  {isSignUp && (
                    <div className="form-group">
                      <input
                        type="text"
                        name="username"
                        placeholder="Username"
                        value={formData.username}
                        onChange={handleInputChange}
                        disabled={isLoading}
                        required
                        className="auth-input"
                      />
                    </div>
                  )}

                  <div className="form-group">
                    <input
                      type="email"
                      name="email"
                      placeholder="Email"
                      value={formData.email}
                      onChange={handleInputChange}
                      disabled={isLoading}
                      required
                      className="auth-input"
                    />
                  </div>

                  <div className="form-group">
                    <input
                      type="password"
                      name="password"
                      placeholder="Password"
                      value={formData.password}
                      onChange={handleInputChange}
                      onFocus={() => setShowPasswordRequirements(true)}
                      disabled={isLoading}
                      required
                      className="auth-input"
                    />
                    {isSignUp && showPasswordRequirements && (
                      <div className="password-requirements">
                        <p>Password must contain:</p>
                        <ul>
                          <li className={passwordValidation.hasMinLength ? 'valid' : ''}>
                            At least 8 characters
                          </li>
                          <li className={passwordValidation.hasUpperCase ? 'valid' : ''}>
                            One uppercase letter
                          </li>
                          <li className={passwordValidation.hasLowerCase ? 'valid' : ''}>
                            One lowercase letter
                          </li>
                          <li className={passwordValidation.hasNumber ? 'valid' : ''}>
                            One number
                          </li>
                          <li className={passwordValidation.hasSpecialChar ? 'valid' : ''}>
                            One special character
                          </li>
                        </ul>
                      </div>
                    )}
                  </div>

                  {isSignUp && (
                    <div className="form-group">
                      <input
                        type="password"
                        name="confirmPassword"
                        placeholder="Confirm Password"
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                        disabled={isLoading}
                        required
                        className="auth-input"
                      />
                    </div>
                  )}

                  <button 
                    type="submit" 
                    className="auth-submit-button"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <div className="loading-spinner" />
                    ) : (
                      isSignUp ? 'Sign Up' : 'Sign In'
                    )}
                  </button>
                </form>
              )}

              {error && (
                <div className="auth-error-message">
                  {error}
                </div>
              )}

              <div className="auth-switch">
                <p>
                  {isSignUp 
                    ? 'Already have an account?'
                    : "Don't have an account?"}
                  <button
                    className="switch-button"
                    onClick={switchMode}
                    disabled={isLoading}
                  >
                    {isSignUp ? 'Sign In' : 'Sign Up'}
                  </button>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </CSSTransition>
  );
} 