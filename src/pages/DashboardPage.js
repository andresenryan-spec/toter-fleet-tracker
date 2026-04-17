import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { supabase, STAGES, STAGE_COLORS } from '../lib/supabase';
import { useSession } from '../lib/SessionContext';

export default function DashboardPage() {
  const { session, isInternal } = useSession();
  const [loading, setLoading] = useState(true);
  const [trucks, setTrucks] = useState([]);
  const [recentUpdates, setRecentUpdates] = useState([]);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    let query = supabase.from('trucks').select('id, unit, current_status, outfitter_name, updated_at');
    if (!isInternal && session?.partner) {
      query = query.eq('outfitter_name', session.partner);
    }
    const { data } = await query;
    setTrucks(data || []);

    let uQuery = supabase
      .from('truck_updates')
      .select('*, trucks(unit)')
      .order('created_at', { ascending: false })
      .limit(8);
    const { data: updates } = await uQuery;
    setRecentUpdates(updates || []);
    setLoading(false);
  }

  const stageCounts = STAGES.map(stage => ({
    name: stage,
    short: stage
      .replace('In Transit to Outfitter', 'Transit→Outfitter')
      .replace('Outfitting in Progress', 'Outfitting')
      .replace('Ready to Ship to Branding', 'Ready→Brand')
      .replace('In Transit to Branding', 'Transit→Brand')
      .replace('Branding in Progress', 'Branding')
      .replace('Built at OEM', 'At OEM')
      .replace('Ready to Ship to Rocky Top', 'Ready→RT')
      .replace('Shipped to RT', 'Shipped→RT')
      .replace('Dealer Inspection', 'Dealer Insp.')
      .replace('PDI Complete', 'PDI Done'),
    count: trucks.filter(t => t.current_status === stage).length,
    color: STAGE_COLORS[stage],
  }));

  const total = trucks.length;
  const complete = stageCounts.find(s => s.name === 'PDI Complete')?.count || 0;
  const inProgress = total - complete - (stageCounts.find(s => s.name === 'Built at OEM')?.count || 0);

  const outfitterCounts = Object.entries(
    trucks.reduce((acc, t) => {
      if (t.outfitter_name) acc[t.outfitter_name] = (acc[t.outfitter_name] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, count]) => ({ name, count }));

  if (loading) return <div style={{ paddingTop: 60, textAlign: 'center' }}><div className="spinner" /></div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">
            {isInternal ? 'Full fleet overview' : `${session?.partner} — your trucks`}
          </p>
        </div>
        {isInternal && (
          <Link to="/trucks"><button className="btn btn-primary">+ Add Truck</button></Link>
        )}
      </div>

      {/* KPIs */}
      <div style={styles.kpiRow}>
        {[
          { label: 'Total Trucks', value: total, color: 'var(--text)' },
          { label: 'In Progress', value: inProgress, color: 'var(--warning)' },
          { label: 'PDI Complete', value: complete, color: 'var(--success)' },
          { label: 'Completion', value: total ? Math.round((complete / total) * 100) + '%' : '0%', color: 'var(--info)' },
        ].map(k => (
          <div key={k.label} className="card" style={{ textAlign: 'center' }}>
            <div style={styles.kpiLabel}>{k.label}</div>
            <div style={{ ...styles.kpiValue, color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      <div style={styles.grid2}>
        {/* Bar chart */}
        <div className="card">
          <h3 style={styles.cardTitle}>Trucks by Stage</h3>
          <div style={{ height: 300, marginTop: 16 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stageCounts} layout="vertical" margin={{ left: 0, right: 20 }}>
                <XAxis type="number" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="short" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} width={120} />
                <Tooltip
                  contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12 }}
                  formatter={(val, _n, props) => [val + ' trucks', props.payload.name]}
                />
                <Bar dataKey="count" radius={[0, 3, 3, 0]}>
                  {stageCounts.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Outfitter breakdown - internal only */}
          {isInternal && outfitterCounts.length > 0 && (
            <div className="card">
              <h3 style={styles.cardTitle}>By Outfitter</h3>
              <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {outfitterCounts.map(o => (
                  <div key={o.name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: '0.82rem', color: 'var(--text)', minWidth: 160 }}>{o.name}</span>
                    <div style={{ flex: 1, height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ width: `${(o.count / total) * 100}%`, height: '100%', background: 'var(--accent)', borderRadius: 3 }} />
                    </div>
                    <span style={{ fontSize: '0.85rem', color: 'var(--accent)', fontWeight: 700, minWidth: 24, textAlign: 'right' }}>{o.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Stage pills */}
          <div className="card">
            <h3 style={styles.cardTitle}>Quick Filter</h3>
            <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {stageCounts.filter(s => s.count > 0).map(s => (
                <Link key={s.name} to={`/trucks?status=${encodeURIComponent(s.name)}`} style={{ textDecoration: 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', border: `1px solid ${s.color}44`, borderRadius: 4, background: 'var(--bg)', cursor: 'pointer' }}>
                    <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.1rem', fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.count}</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.04em', textTransform: 'uppercase' }}>{s.name}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      {recentUpdates.length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <h3 style={styles.cardTitle}>Recent Activity</h3>
          <div style={{ marginTop: 12 }}>
            {recentUpdates.map(u => (
              <div key={u.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border-light)', fontSize: '0.85rem' }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', marginTop: 6, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <span style={{ fontWeight: 600, color: 'var(--accent)' }}>{u.trucks?.unit || '—'}</span>
                  <span style={{ color: 'var(--text-muted)', margin: '0 6px' }}>·</span>
                  <span style={{ color: 'var(--text)' }}>{u.field_changed}</span>
                  {u.new_value && <span style={{ color: 'var(--text-muted)' }}> → <span className="mono">{u.new_value}</span></span>}
                  {u.changed_by && <span style={{ color: 'var(--text-dim)', marginLeft: 6, fontSize: '0.75rem' }}>by {u.changed_by}</span>}
                </div>
                <div style={{ color: 'var(--text-dim)', fontSize: '0.72rem', whiteSpace: 'nowrap' }}>
                  {new Date(u.created_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  kpiRow: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 },
  kpiLabel: { fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.72rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 },
  kpiValue: { fontFamily: "'Barlow Condensed', sans-serif", fontSize: '2.4rem', fontWeight: 800, lineHeight: 1 },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 },
  cardTitle: { fontSize: '0.82rem', letterSpacing: '0.08em', color: 'var(--text-muted)', fontWeight: 700, fontFamily: "'Barlow Condensed', sans-serif", textTransform: 'uppercase' },
};
