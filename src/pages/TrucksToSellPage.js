import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function TrucksToSellPage() {
  const [trucks, setTrucks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ terminal: '', year: '', truck_number: '', make: 'Freightliner', model: '', vin: '', mileage: '', general_notes: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from('trucks_to_sell').select('*').order('year', { ascending: false });
    setTrucks(data || []);
    setLoading(false);
  }

  async function toggle(id, field, val) {
    await supabase.from('trucks_to_sell').update({ [field]: val }).eq('id', id);
    load();
  }

  async function handleAdd(e) {
    e.preventDefault();
    setSaving(true);
    await supabase.from('trucks_to_sell').insert({ ...form, year: parseInt(form.year) || null, mileage: parseInt(form.mileage) || null });
    setSaving(false);
    setShowAdd(false);
    setForm({ terminal: '', year: '', truck_number: '', make: 'Freightliner', model: '', vin: '', mileage: '', general_notes: '' });
    load();
  }

  const decommissioned = trucks.filter(t => t.decommissioned).length;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Trucks to Sell</h1>
          <p className="page-subtitle">{trucks.length} trucks — {decommissioned} decommissioned</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd(!showAdd)}>
          {showAdd ? 'Cancel' : '+ Add Truck'}
        </button>
      </div>

      {showAdd && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h3 style={{ fontFamily: "'Barlow Condensed'", fontSize: '0.85rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 16 }}>
            Add Truck to Sell
          </h3>
          <form onSubmit={handleAdd}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              {[['Terminal', 'terminal'], ['Year', 'year', 'number'], ['Truck #', 'truck_number'], ['Make', 'make'], ['Model', 'model'], ['VIN', 'vin'], ['Mileage', 'mileage', 'number']].map(([label, key, type]) => (
                <div className="form-group" key={key} style={{ marginBottom: 8 }}>
                  <label className="form-label">{label}</label>
                  <input type={type || 'text'} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
                </div>
              ))}
            </div>
            <div className="form-group">
              <label className="form-label">Notes</label>
              <textarea rows={2} value={form.general_notes} onChange={e => setForm(f => ({ ...f, general_notes: e.target.value }))} />
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-ghost" onClick={() => setShowAdd(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>Save</button>
            </div>
          </form>
        </div>
      )}

      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Terminal</th><th>Year</th><th>Truck #</th><th>Make / Model</th>
                <th>VIN</th><th>Mileage</th><th>Notes</th>
                <th>Decommissioned</th><th>Unwrapped</th><th>Pictures</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10} style={{ textAlign: 'center', padding: 40 }}><div className="spinner" /></td></tr>
              ) : trucks.map(t => (
                <tr key={t.id}>
                  <td style={{ fontSize: '0.85rem' }}>{t.terminal}</td>
                  <td style={{ fontSize: '0.85rem' }}>{t.year}</td>
                  <td><span className="mono" style={{ fontSize: '0.82rem' }}>{t.truck_number}</span></td>
                  <td style={{ fontSize: '0.85rem' }}>{t.make} {t.model}</td>
                  <td><span className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t.vin}</span></td>
                  <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{t.mileage?.toLocaleString()}</td>
                  <td style={{ fontSize: '0.8rem', maxWidth: 200, color: 'var(--text-muted)' }}>{t.general_notes}</td>
                  <td><Toggle checked={t.decommissioned} onChange={v => toggle(t.id, 'decommissioned', v)} /></td>
                  <td><Toggle checked={t.unwrapped} onChange={v => toggle(t.id, 'unwrapped', v)} /></td>
                  <td><Toggle checked={t.pictures_taken} onChange={v => toggle(t.id, 'pictures_taken', v)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Toggle({ checked, onChange }) {
  return (
    <button onClick={() => onChange(!checked)} style={{
      background: checked ? 'rgba(63,185,80,0.15)' : 'transparent',
      border: `1px solid ${checked ? '#3fb950' : 'var(--border)'}`,
      color: checked ? '#3fb950' : 'var(--text-dim)',
      borderRadius: 4, padding: '3px 10px', cursor: 'pointer',
      fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.75rem',
      fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', transition: 'all 0.15s',
    }}>
      {checked ? '✓ Yes' : 'No'}
    </button>
  );
}
