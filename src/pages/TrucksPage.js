import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase, STAGES, STAGE_COLORS, STAGE_FIELD_MAP, OUTFITTERS, TERMINALS } from '../lib/supabase';
import { useSession } from '../lib/SessionContext';
import AddTruckModal from '../components/AddTruckModal';

function daysInStage(truck) {
  const field = STAGE_FIELD_MAP[truck.current_status];
  if (!field || !truck[field]) return null;
  const start = new Date(truck[field]);
  const today = new Date();
  return Math.floor((today - start) / 86400000);
}

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

function exportToXLS(trucks) {
  const headers = ['Unit', 'VIN', 'Order #', 'Model', 'Bus Unit', 'Outfitter', 'Pre-Assigned Terminal', 'Current Stage', 'ETA', 'Built at OEM', 'In Transit to Outfitter', 'Outfitting In Progress', 'Ready to Ship to Branding', 'In Transit to Branding', 'Branding Complete', 'Ready to Ship to RT', 'Shipped to RT', 'Dealer Inspection', 'PDI Complete', 'In Service', 'Notes'];
  const rows = trucks.map(t => [
    t.unit, t.vin, t.order_number || '', t.model || '', t.bus_unit || '',
    t.outfitter_name || '', t.pre_assigned_terminal || '', t.current_status,
    t.eta || '',
    t.built_at_oem_date || '', t.in_transit_to_outfitter_date || '',
    t.outfitting_in_progress_date || '', t.ready_to_ship_to_branding_date || '',
    t.in_transit_to_branding_date || '', t.branding_complete_date || '',
    t.ready_to_ship_to_rocky_top_date || '', t.shipped_to_rt_date || '',
    t.dealer_inspection_date || '', t.pdi_complete_date || '',
    t.in_service_date || '', t.notes || '',
  ]);

  const csvContent = [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `toter-fleet-${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export default function TrucksPage() {
  const { session, isInternal } = useSession();
  const [searchParams, setSearchParams] = useSearchParams();
  const [trucks, setTrucks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [outfitterFilter, setOutfitterFilter] = useState('');
  const [terminalFilter, setTerminalFilter] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  // eslint-disable-next-line react-hooks/exhaustive-deps
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
    const matchTerminal = !terminalFilter || t.pre_assigned_terminal === terminalFilter;
    return matchSearch && matchStatus && matchOutfitter && matchTerminal;
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Fleet Tracker</h1>
          <p className="page-subtitle">{filtered.length} of {trucks.length} trucks</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost" onClick={() => exportToXLS(filtered)} title="Export to Excel">
            ⬇ Export XLS
          </button>
          {isInternal && <button className="btn btn-primary" onClick={() => setShowAdd(true)}>+ Add Truck</button>}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <input
          type="text" placeholder="Search unit, VIN, order #..."
          value={search} onChange={e => setSearch(e.target.value)}
          style={{ maxWidth: 240 }}
        />
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setSearchParams(e.target.value ? { status: e.target.value } : {}); }} style={{ maxWidth: 210 }}>
          <option value="">All Stages</option>
          {STAGES.map(s => <option key={s}>{s}</option>)}
        </select>
        {isInternal && (
          <>
            <select value={outfitterFilter} onChange={e => setOutfitterFilter(e.target.value)} style={{ maxWidth: 200 }}>
              <option value="">All Outfitters</option>
              {OUTFITTERS.map(o => <option key={o}>{o}</option>)}
            </select>
            <select value={terminalFilter} onChange={e => setTerminalFilter(e.target.value)} style={{ maxWidth: 160 }}>
              <option value="">All Terminals</option>
              {TERMINALS.map(t => <option key={t}>{t}</option>)}
            </select>
          </>
        )}
        {(search || statusFilter || outfitterFilter || terminalFilter) && (
          <button className="btn btn-ghost btn-sm" onClick={() => { setSearch(''); setStatusFilter(''); setOutfitterFilter(''); setTerminalFilter(''); setSearchParams({}); }}>Clear</button>
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
                {isInternal && <th>Terminal</th>}
                <th>Stage</th>
                <th>Days in Stage</th>
                <th>ETA</th>
                <th>Updated</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10} style={{ textAlign: 'center', padding: 40 }}><div className="spinner" /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={10}><div className="empty-state"><h3>No trucks found</h3><p>Adjust your filters.</p></div></td></tr>
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
                  {isInternal && (
                    <td style={{ fontSize: '0.82rem' }}>
                      {truck.pre_assigned_terminal
                        ? <span style={{ background: 'rgba(240,180,41,0.12)', color: 'var(--accent)', padding: '2px 7px', borderRadius: 3, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '0.75rem', letterSpacing: '0.04em' }}>{truck.pre_assigned_terminal}</span>
                        : <span style={{ color: 'var(--text-dim)' }}>—</span>}
                    </td>
                  )}
                  <td><StatusBadge status={truck.current_status} /></td>
                  <td style={{ fontSize: '0.85rem', fontFamily: "'JetBrains Mono', monospace" }}>
                    {(() => {
                      const d = daysInStage(truck);
                      if (d === null) return <span style={{ color: 'var(--text-dim)' }}>—</span>;
                      const target = { 'Built at OEM': 21, 'In Transit to Outfitter': 5, 'Outfitting in Progress': 30, 'Ready to Ship to Branding': 7, 'In Transit to Branding': 5, 'Branding in Progress': 7, 'Ready to Ship to Rocky Top': 5, 'Shipped to RT': 3, 'Dealer Inspection': 5, 'PDI Complete': 5 }[truck.current_status];
                      const color = !target ? 'var(--text)' : d > target * 1.1 ? '#f85149' : d > target * 0.85 ? '#d29922' : '#3fb950';
                      return <span style={{ color, fontWeight: 600 }}>{d}d</span>;
                    })()}
                  </td>
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
