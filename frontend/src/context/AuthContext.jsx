import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      authAPI.me()
        .then(res => setUser(res.data))
        .catch(() => localStorage.removeItem('token'))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  // Apply dark mode
  useEffect(() => {
    if (user?.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [user?.darkMode]);

  const login = async (email, password) => {
    const res = await authAPI.login({ email, password });
    localStorage.setItem('token', res.data.token);
    setUser(res.data.user);
  };

  const register = async (name, email, password) => {
    const res = await authAPI.register({ name, email, password });
    localStorage.setItem('token', res.data.token);
    setUser(res.data.user);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  const toggleDarkMode = async () => {
    const newMode = !user.darkMode;
    setUser(prev => ({ ...prev, darkMode: newMode }));
    await authAPI.updatePrefs({ darkMode: newMode, budgetPeriod: user.budgetPeriod });
  };

  const updateBudgetPeriod = async (period) => {
    setUser(prev => ({ ...prev, budgetPeriod: period }));
    await authAPI.updatePrefs({ darkMode: user.darkMode, budgetPeriod: period });
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, toggleDarkMode, updateBudgetPeriod }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
