import React, { useState, useEffect } from 'react';
import { AuthContext } from './authContextInstance';
import { fetchAccountsApi } from '../services/api';

export function AuthProvider({ children, onShowToast, onNavigate }) {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return sessionStorage.getItem('nota_kasir_authenticated') === 'true';
  });

  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const stored = sessionStorage.getItem('nota_kasir_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [accounts, setAccounts] = useState([]);

  useEffect(() => {
    let isMounted = true;
    const loadInitialAccounts = async () => {
      try {
        const accs = await fetchAccountsApi();
        if (isMounted && Array.isArray(accs) && accs.length > 0) {
          setAccounts(accs);
        }
      } catch (err) {
        console.warn('Initial accounts load error:', err);
      }
    };
    loadInitialAccounts();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleLoginSuccess = (userAcc) => {
    sessionStorage.setItem('nota_kasir_authenticated', 'true');
    sessionStorage.setItem('nota_kasir_user', JSON.stringify(userAcc));
    setIsAuthenticated(true);
    setCurrentUser(userAcc);
    if (onShowToast) {
      onShowToast(`Berhasil masuk sebagai ${userAcc.role === 'superadmin' ? 'Superadmin' : 'Admin Kasir'} (${userAcc.username})!`, 'success');
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('nota_kasir_authenticated');
    sessionStorage.removeItem('nota_kasir_user');
    setIsAuthenticated(false);
    setCurrentUser(null);
    if (onNavigate) onNavigate('editor');
  };

  const value = {
    isAuthenticated,
    setIsAuthenticated,
    currentUser,
    setCurrentUser,
    accounts,
    setAccounts,
    handleLoginSuccess,
    handleLogout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
