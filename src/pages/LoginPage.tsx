import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { InputText } from 'primereact/inputtext';
import { Password } from 'primereact/password';
import { Button } from 'primereact/button';
import { useAuth } from '../context/AuthContext';

const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please enter username and password');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const success = await login(username, password);
      if (success) {
        navigate('/projects');
      } else {
        setError('Invalid username or password');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-background"></div>

      {/* Decorative Orbs */}
      <div className="orb orb-1"></div>
      <div className="orb orb-2"></div>

      <div className="login-card fade-in">
        <div className="login-header">
          <div className="login-logo-container">
            <i className="pi pi-server login-logo-icon" />
          </div>
          <h2 className="login-title">Project Management</h2>
          <p className="login-subtitle">Welcome back. Log in to your workspace.</p>
        </div>

        <form onSubmit={handleLogin} className="login-form">
          {error && (
            <div className="login-error">
              <i className="pi pi-exclamation-triangle" /> {error}
            </div>
          )}

          <div className="p-float-label p-input-icon-left login-input-group">
            <i className="pi pi-user" />
            <InputText
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="login-input w-full"
            />
            <label htmlFor="username">Username</label>
          </div>

          <div className="p-float-label p-input-icon-left login-input-group">
            <i className="pi pi-lock" style={{ zIndex: 3 }} />
            <Password
              inputId="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              feedback={false}
              toggleMask
              className="w-full password-wrapper"
              inputClassName="login-input w-full p-inputtext-sm"
              style={{ width: '100%' }}
            />
            <label htmlFor="password">Password</label>
          </div>

          <Button
            type="submit"
            label={loading ? "Authenticating..." : "Sign In"}
            icon={loading ? "pi pi-spin pi-spinner" : "pi pi-sign-in"}
            className="login-btn"
            disabled={loading}
          />
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
