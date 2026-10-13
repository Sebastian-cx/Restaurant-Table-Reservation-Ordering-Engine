import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('restaurant_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('restaurant_token') || null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (token) {
      localStorage.setItem('restaurant_token', token);
    } else {
      localStorage.removeItem('restaurant_token');
    }
  }, [token]);

  useEffect(() => {
    if (user) {
      localStorage.setItem('restaurant_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('restaurant_user');
    }
  }, [user]);

  // Login with credentials
  const login = async (email, password) => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      setUser(data.user);
      setToken(data.token);
      return data.user;
    } finally {
      setLoading(false);
    }
  };

  // Quick 1-click role switcher for faculty evaluation / demo
  const quickSwitchRole = async (roleName) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/auth/quick-login/${roleName}`, {
        method: 'POST'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Quick switch failed');
      setUser(data.user);
      setToken(data.token);
      return data.user;
    } catch (err) {
      console.error('Quick switch error:', err);
      alert(`Could not switch to role ${roleName}: ` + err.message);
    } finally {
      setLoading(false);
    }
  };

  // 1-Click instant login by email (for demo test accounts)
  const quickLoginByEmail = async (email) => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/quick-login-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Quick login failed');
      setUser(data.user);
      setToken(data.token);
      return data.user;
    } catch (err) {
      console.error('Quick login by email error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const register = async (name, email, password, role = 'Customer') => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');
      setUser(data.user);
      setToken(data.token);
      return data.user;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('restaurant_user');
    localStorage.removeItem('restaurant_token');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        logout,
        quickSwitchRole,
        quickLoginByEmail,
        isAuthenticated: !!user
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
