import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase, STAGES, STAGE_COLORS, OUTFITTERS } from '../lib/supabase';
import { useSession } from '../lib/SessionContext';
import AddTruckModal from '../components/AddTruckModal';

export function StatusBadge({ status }) {
  const color = STAGE_COLORS[status] || '#8b949e';
  return (
    <span style={{
      display: 'inline-block', padding: '3px 8px', borderRadius: 3,
      fontSize: '0.72rem', fontFamily: "'Barlow Condensed', sans-serif",
      fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase',
      background: color + '22', color, border: `1px solid ${color}44`, whiteSpace: 'nowrap',
    }}>
      {status}
    </span>
  );
}

export default function TrucksPage() {
  const { session, isInternal } = useSession();
  const [searchParams, setSearchParams] = useSearchParams();
  const [trucks, setTrucks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [outfitterFilter, setOutfitterFilter] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    let query = supabase.from('trucks').select('*').order('updated_at', { ascending: false });
    if (!isInternal && session?.partner) {
      query = query.eq('outfitter_name', session.partner);
    }
    const { data } = await query;
    setTrucks(data || []);
    setLoading(false);
  }

  const filtered = trucks.filter(t => {
    const q = search.toLowerCase();
    const matchSearch = !q || t.unit?.toLowerCase().includes(q) || t.vin?.toLowerCase().includes(q) || t.order_number?.toLowerCase().includes(q);
    const matchStatus = !statusFilter || t.current_status === statusFilter;
    const matchOutfitter = !outfitterFilter || t.outfitter_name === outfitterFilter;
    return matchSearch && matchStatus && matchOutfitter;
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Fleet Tracker</h1>
          <p className="page-subtitle">{filtered.length} of {trucks.length} trucks</p>
        </div>
        {isInternal && <button className="btn btn-primary" onClick={() => setShowAdd(true)}>+ Add Truck</button>}
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <input
          type="text" placeholder="Search unit, VIN, order #..."
          value={search} onChange={e => setSearch(e.target.value)}
          style={{ maxWidth: 260 }}
        />
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setSearchParams(e.target.value ? { status: e.target.value } : {}); }} style={{ maxWidth: 220 }}>
          <option value="">All Stages</option>
          {STAGES.map(s => <option key={s}>{s}</option>)}
        </select>
        {isInternal && (
          <select value={outfitterFilter} onChange={e => setOutfitterFilter(e.target.value)} style={{ maxWidth: 220 }}>
            <option value="">All Outfitters</option>
            {OUTFITTERS.map(o => <option key={o}>{o}</option>)}
          </select>
        )}
        {(search || statusFilter || outfitterFilter) && (
          <button className="btn btn-ghost btn-sm" onClick={() => { setSearch(''); setStatusFilter(''); setOutfitterFilter(''); setSearchParams({}); }}>Clear</button>
        )}
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Unit</th>
                <th>VIN</th>
                <th>Model</th>
                {isInternal && <th>Outfitter</th>}
                <th>Stage</th>
                <th>ETA</th>
                <th>Updated</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40 }}><div className="spinner" /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8}><div className="empty-state"><h3>No trucks found</h3><p>Adjust your filters.</p></div></td></tr>
              ) : filtered.map(truck => (
                <tr key={truck.id}>
                  <td>
                    <Link to={`/trucks/${truck.id}`} style={{ color: 'var(--accent)', fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>
                      {truck.unit}
                    </Link>
                  </td>
                  <td><span className="mono" style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{truck.vin}</span></td>
                  <td style={{ fontSize: '0.85rem' }}>{truck.model || '—'}</td>
                  {isInternal && <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{truck.outfitter_name || '—'}</td>}
                  <td><StatusBadge status={truck.current_status} /></td>
                  <td style={{ fontSize: '0.82rem', color: truck.eta ? 'var(--info)' : 'var(--text-dim)' }}>
                    {truck.eta ? new Date(truck.eta).toLocaleDateString() : '—'}
                  </td>
                  <td style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                    {new Date(truck.updated_at).toLocaleDateString()}
                  </td>
                  <td>
                    <Link to={`/trucks/${truck.id}`}><button className="btn btn-ghost btn-sm">View →</button></Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showAdd && <AddTruckModal onClose={() => setShowAdd(false)} onSaved={load} />}
    </div>
  );
}
