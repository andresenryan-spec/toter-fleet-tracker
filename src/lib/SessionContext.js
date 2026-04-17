import React, { createContext, useContext, useState } from 'react';
import { checkPassword } from './supabase';

const SessionContext = createContext({});

export function SessionProvider({ children }) {
  const [session, setSession] = useState(() => {
    try {
      const saved = localStorage.getItem('toter_session');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });

  function login(password) {
    const profile = checkPassword(password);
    if (!profile) return false;
    const s = { ...profile, loggedInAt: Date.now() };
    setSession(s);
    localStorage.setItem('toter_session', JSON.stringify(s));
    return true;
  }

  function logout() {
    setSession(null);
    localStorage.removeItem('toter_session');
  }

  const isInternal = session?.canSeeAll === true;
  const isPartner = session?.partner !== null && session?.partner !== undefined && !isInternal;

  return (
    <SessionContext.Provider value={{ session, login, logout, isInternal, isPartner }}>
      {children}
    </SessionContext.Provider>
  );
}

export const useSession = () => useContext(SessionContext);
