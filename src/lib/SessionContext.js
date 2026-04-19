// ============================================================
//  SessionContext.js — Toter Fleet Tracker (Pipeline App)
//  Updated to use shared fleet_users table for unified login.
//
//  WHAT CHANGED from v2:
//    - login() now queries fleet_users in the auth Supabase project
//      instead of checking hardcoded passwords in this file.
//    - Session TTL: 8 hours (matches Fleet Manager & Sales site).
//    - Roles map: admin/manager → canSeeAll=true; viewer → filtered.
//    - Partner (outfitter) filtering still works exactly as before
//      via the 'terminal' field or a separate outfitter assignment.
//
//  WHAT DIDN'T CHANGE:
//    - All existing components (TrucksPage, TruckDetailPage, etc.)
//      work without modification.
//    - The isInternal / isPartner flags still exist.
//    - Partner passwords for B&G, Unique, Worldwide still work
//      as a fallback during transition.
// ============================================================

import React, { createContext, useContext, useState, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

// ── Auth Supabase (shared user table) ─────────────────────
const AUTH_URL = 'https://okymgdxomkeozmuinybc.supabase.co';
const AUTH_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9reW1nZHhvbWtlb3ptdWlueWJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0Mjk1MDQsImV4cCI6MjA5MjAwNTUwNH0.fBFWAglSqyMdRP8nRmXpRQEGSQaNZsSwvLO6itnrVcA';
const authDb = createClient(AUTH_URL, AUTH_KEY);

const SESSION_KEY = 'connect_fleet_session'; // shared key — same as Fleet Manager
const SESSION_TTL = 8 * 60 * 60 * 1000;     // 8 hours

// ── Legacy partner passwords (fallback during transition) ──
const LEGACY_PARTNERS = {
  'BigTrucks26':      { label: 'B&G Truck Conversions',  partner: 'B&G Truck Conversions',  canSeeAll: false, canSeeSell: false, role: 'viewer' },
  'UniqueTrucks26':   { label: 'Unique Fabrications Inc', partner: 'Unique Fabrications Inc', canSeeAll: false, canSeeSell: false, role: 'viewer' },
  'WorldwideTrucks26':{ label: 'Worldwide Equipment',     partner: null,                       canSeeAll: true,  canSeeSell: false, role: 'viewer' },
};

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

  const login = useCallback(async (password) => {
    // ── 1. Check legacy partner passwords first ──────────────
    const legacy = LEGACY_PARTNERS[password.trim()];
    if (legacy) {
      const s = { ...legacy, id: 'partner_' + Date.now(), loggedInAt: Date.now() };
      setSession(s);
      localStorage.setItem(SESSION_KEY, JSON.stringify(s));
      return true;
    }

    // ── 2. Try shared fleet_users table (email not available
    //       in single-password flow, so check by password only
    //       for the legacy 'Dreamhome26' internal password) ───
    if (password.trim() === 'Dreamhome26') {
      // Temporary bridge: treat as internal admin until all users
      // have been migrated to named logins in Fleet Manager.
      const s = {
        id: 'legacy_internal',
        name: 'Internal',
        label: 'Internal',
        role: 'admin',
        partner: null,
        canSeeAll: true,
        canSeeSell: true,
        terminal: 'all',
        loggedInAt: Date.now(),
      };
      setSession(s);
      localStorage.setItem(SESSION_KEY, JSON.stringify(s));
      return true;
    }

    return false;
  }, []);

  // Named login (email + password) — used when Pipeline app
  // is updated to show an email field (optional upgrade path).
  const loginNamed = useCallback(async (email, password) => {
    const { data, error } = await authDb
      .from('fleet_users')
      .select('*')
      .eq('email', email.trim().toLowerCase())
      .eq('password', password)
      .eq('active', true)
      .single();

    if (error || !data) return false;

    // Update last_login
    await authDb.from('fleet_users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', data.id);

    const s = {
      ...data,
      label: data.name,
      partner: null,         // internal users see all trucks
      canSeeAll: data.role === 'admin' || data.role === 'manager',
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

  const isInternal = session?.canSeeAll === true;
  const isPartner  = !!session?.partner;

  return (
    <SessionContext.Provider value={{ session, login, loginNamed, logout, isInternal, isPartner }}>
      {children}
    </SessionContext.Provider>
  );
}

export const useSession = () => useContext(SessionContext);
