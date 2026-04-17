import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useSession } from '../lib/SessionContext';

export default function Layout() {
  const { session, logout, isInternal } = useSession();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const navItems = [
    { to: '/', label: 'Dashboard', icon: '▦', exact: true },
    { to: '/trucks', label: 'Fleet Tracker', icon: '◈' },
  ];

  return (
    <div style={styles.root}>
      {open && <div style={styles.overlay} onClick={() => setOpen(false)} />}
      <aside style={{ ...styles.sidebar, ...(open ? styles.sidebarOpen : {}) }}>
        <div style={styles.logo}>
          <span style={styles.logoIcon}>◈</span>
          <div>
            <div style={styles.logoText}>TOTER</div>
            <div style={styles.logoSub}>Fleet Tracker</div>
          </div>
        </div>
        <nav style={styles.nav}>
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.exact}
              style={({ isActive }) => ({ ...styles.navItem, ...(isActive ? styles.navActive : {}) })}
              onClick={() => setOpen(false)}
            >
              <span style={styles.navIcon}>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div style={styles.footer}>
          <div style={styles.whoami}>
            <div style={styles.whoLabel}>Logged in as</div>
            <div style={styles.whoName}>{session?.label}</div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={handleLogout} style={{ width: '100%', marginTop: 8 }}>
            Sign Out
          </button>
        </div>
      </aside>
      <div style={styles.main}>
        <header style={styles.topBar}>
          <button style={styles.menuBtn} onClick={() => setOpen(!open)}>☰</button>
          {!isInternal && session?.partner && (
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Viewing: <strong style={{ color: 'var(--accent)' }}>{session.partner}</strong> trucks only
            </span>
          )}
        </header>
        <div style={styles.content}>
          <Outlet />
        </div>
      </div>
    </div>
  );
}

const styles = {
  root: { display: 'flex', minHeight: '100vh' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 98 },
  sidebar: { width: 220, minWidth: 220, background: 'var(--bg-card)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', position: 'sticky', top: 0, height: '100vh', zIndex: 99 },
  sidebarOpen: { position: 'fixed' },
  logo: { display: 'flex', alignItems: 'center', gap: 10, padding: '20px 16px', borderBottom: '1px solid var(--border)' },
  logoIcon: { fontSize: '1.8rem', color: 'var(--accent)', lineHeight: 1 },
  logoText: { fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: '1.4rem', letterSpacing: '0.1em', textTransform: 'uppercase', lineHeight: 1 },
  logoSub: { fontSize: '0.65rem', color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: "'Barlow Condensed', sans-serif" },
  nav: { flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 2 },
  navItem: { display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 'var(--radius)', color: 'var(--text-muted)', fontSize: '0.875rem', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', textDecoration: 'none', transition: 'all 0.1s' },
  navActive: { background: 'rgba(240,180,41,0.12)', color: 'var(--accent)' },
  navIcon: { fontSize: '1rem', width: 18, textAlign: 'center' },
  footer: { padding: 16, borderTop: '1px solid var(--border)' },
  whoami: { marginBottom: 4 },
  whoLabel: { fontSize: '0.68rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: "'Barlow Condensed', sans-serif" },
  whoName: { fontSize: '0.85rem', fontWeight: 600, color: 'var(--text)', marginTop: 2 },
  main: { flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 },
  topBar: { height: 52, borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', padding: '0 20px', justifyContent: 'space-between', background: 'var(--bg-card)', position: 'sticky', top: 0, zIndex: 50 },
  menuBtn: { background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.2rem', padding: '4px 8px', cursor: 'pointer', borderRadius: 4 },
  content: { flex: 1, padding: '28px 24px', maxWidth: 1400, width: '100%' },
};
