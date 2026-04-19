// ============================================================
//  SessionContext.js — Toter Fleet Tracker (Pipeline App)
//  Unified email + password login for everyone.
//
//  Access control:
//    role = 'admin' or 'manager'  → internal staff, sees all trucks
//    role = 'viewer'              → outfitter partner, sees only
//                                   their trucks (filtered by
//                                   outfitter_name field)
//
//  All users are managed in Fleet Manager → User Management.
//  When adding an outfitter user, set:
//    Role     → Viewer
//    Outfitter → B&G Truck Conversions / Unique Fabrications Inc
//                / Worldwide Equipment
//  (stored in the outfitter_name column of fleet_users)
// ============================================================

import React, { createContext, useContext, useState, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

const AUTH_URL = 'https://okymgdxomkeozmuinybc.supabase.co';
const AUTH_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9reW1nZHhvbWtlb3ptdWlueWJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0Mjk1MDQsImV4cCI6MjA5MjAwNTUwNH0.fBFWAglSqyMdRP8nRmXpRQEGSQaNZsSwvLO6itnrVcA';

const authDb  = createClient(AUTH_URL, AUTH_KEY);
const SESSION_KEY = 'connect_fleet_session';
const SESSION_TTL = 8 * 60 * 60 * 1000; // 8 hours

const SessionContext = createContext({});

export function SessionProvider({ children }) {
  const [session, setSession] = useState(() => {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const s = JSON.parse(raw);
      if (Date.now() - s.loggedInAt > SESSION_TTL) {
        localStorage.removeItem(SESSION_KEY);
        return null;
      }
      return s;
    } catch { return null; }
  });

  const login = useCallback(async (email, password) => {
    const { data, error } = await authDb
      .from('fleet_users')
      .select('*')
      .eq('email', email)
      .eq('password', password)
      .eq('active', true)
      .single();

    if (error || !data) return false;

    // Update last_login timestamp
    await authDb
      .from('fleet_users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', data.id);

    // Build session — outfitter_name drives truck filtering
    const s = {
      ...data,
      label:      data.name,
      partner:    data.outfitter_name || null,  // null = sees all trucks
      canSeeAll:  !data.outfitter_name,          // outfitters see only their trucks
      canSeeSell: data.role === 'admin',
      loggedInAt: Date.now(),
    };

    setSession(s);
    localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    return true;
  }, []);

  const logout = useCallback(() => {
    setSession(null);
    localStorage.removeItem(SESSION_KEY);
  }, []);

  // isInternal: can see all trucks and all features
  const isInternal = session?.canSeeAll === true;

  // isPartner: outfitter — filtered view only
  const isPartner = !!session?.partner;

  return (
    <SessionContext.Provider value={{ session, login, logout, isInternal, isPartner }}>
      {children}
    </SessionContext.Provider>
  );
}

export const useSession = () => useContext(SessionContext);
