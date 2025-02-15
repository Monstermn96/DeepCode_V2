import React, { useState } from 'react';
import { CSSTransition } from 'react-transition-group';
import { signIn, signUp } from 'aws-amplify/auth';
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

export const AuthForm = ({ onClose, show, onSuccess }: AuthFormProps) => {
  const nodeRef = React.useRef(null);
  const [error, setError] = useState<string | null>(null);
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
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

    // Clear error when user starts typing
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
        // Registration successful
        if (onClose) onClose();
      } else {
        await signIn({
          username: formData.email,
          password: formData.password
        });
        // Login successful
        if (onSuccess) onSuccess();
      }
    } catch (err) {
      console.error('Authentication failed:', err);
      setError(err instanceof Error ? err.message : 'Authentication failed. Please try again.');
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
                <span className="logo-text">DeepCode</span>
              </div>
              <h2>{isSignUp ? 'Create Account' : 'Welcome Back'}</h2>
              <p className="auth-subtitle">
                {isSignUp 
                  ? 'Start your coding journey'
                  : 'Continue your coding journey'}
              </p>
            </div>

            <div className="auth-body">
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
}; 