import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import axiosClient from '../api/axiosClient';

interface AuthContextType {
  token: string | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  // Keep a ref so the interceptor closure always reads the latest token
  const tokenRef = useRef<string | null>(token);

  useEffect(() => {
    tokenRef.current = token;
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }, [token]);

  // ── Request interceptor — attaches Bearer token at call-time ──────────────
  // Using an interceptor (vs. defaults.headers) ensures:
  //   1. The token is read fresh on every request (no stale closure).
  //   2. Logout immediately stops all future requests from sending the token.
  //   3. No risk of the token being "stuck" in headers after logout.
  useEffect(() => {
    const interceptorId = axiosClient.interceptors.request.use((config) => {
      const currentToken = tokenRef.current;
      if (currentToken) {
        config.headers = config.headers ?? {};
        config.headers['Authorization'] = `Bearer ${currentToken}`;
      } else {
        delete config.headers?.['Authorization'];
      }
      return config;
    });

    // Eject interceptor on unmount to prevent memory leaks
    return () => {
      axiosClient.interceptors.request.eject(interceptorId);
    };
  }, []); // Runs once — the interceptor reads tokenRef dynamically

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const formData = new URLSearchParams();
      formData.append('username', username);
      formData.append('password', password);

      const response = await axiosClient.post('/auth/login', formData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
      setToken(response.data.access_token);
      return true;
    } catch (err) {
      console.error('Login failed', err);
      return false;
    }
  };

  const logout = () => {
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ token, isAuthenticated: !!token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
