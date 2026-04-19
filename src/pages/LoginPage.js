import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../lib/SessionContext';

export default function LoginPage() {
  const { login } = useSession();
  const navigate = useNavigate();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const ok = await login(email.trim().toLowerCase(), password.trim());
      if (ok) {
        navigate('/');
      } else {
        setError('Incorrect email or password. Contact your administrator.');
        setPassword('');
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.');
      setPassword('');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.panel}>
        <div style={styles.header}>
          <span style={styles.icon}>◈</span>
          <h1 style={styles.title}>TOTER</h1>
          <p style={styles.subtitle}>Fleet Tracker</p>
        </div>

        <form onSubmit={handleSubmit}>
          {error && <div className="alert alert-error">{error}</div>}

          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@company.com"
              autoComplete="username"
              autoFocus
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', padding: '11px' }}
            disabled={loading}
          >
            {loading
              ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Checking...</>
              : 'Enter'}
          </button>
        </form>

        <p style={styles.note}>Contact Rocky Top for access.</p>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--bg)',
    backgroundImage: 'radial-gradient(ellipse at 50% 0%, rgba(240,180,41,0.07) 0%, transparent 65%)',
    padding: 20,
  },
  panel: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    padding: '44px 40px',
    width: '100%',
    maxWidth: 380,
    boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
  },
  header: { textAlign: 'center', marginBottom: 36 },
  icon: { fontSize: '2.8rem', color: 'var(--accent)', display: 'block', marginBottom: 10 },
  title: { fontSize: '2.6rem', color: 'var(--text)', letterSpacing: '0.15em' },
  subtitle: {
    color: 'var(--text-muted)', fontSize: '0.82rem',
    letterSpacing: '0.12em', textTransform: 'uppercase',
    fontFamily: "'Barlow Condensed', sans-serif", marginTop: 4,
  },
  note: { marginTop: 20, fontSize: '0.78rem', color: 'var(--text-dim)', textAlign: 'center' },
};
