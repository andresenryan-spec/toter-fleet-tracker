import React, { useState } from 'react';
import { supabase, OUTFITTERS, TERMINALS } from '../lib/supabase';

export default function AddTruckModal({ onClose, onSaved }) {
  const [form, setForm] = useState({
    unit: '', vin: '', order_number: '', model: '',
    bus_unit: 'Connect', outfitter_name: '', ship_to: '',
    invoice: '', built_at_oem_date: '', pre_assigned_terminal: '', notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function handleSave(e) {
    e.preventDefault();
    if (!form.unit || !form.vin) { setError('Unit and VIN are required.'); return; }
    setSaving(true);
    const payload = { ...form };
    if (!payload.built_at_oem_date) delete payload.built_at_oem_date;
    if (!payload.outfitter_name) delete payload.outfitter_name;
    if (!payload.pre_assigned_terminal) delete payload.pre_assigned_terminal;
    const { error } = await supabase.from('trucks').insert(payload);
    setSaving(false);
    if (error) { setError(error.message); return; }
    onSaved();
    onClose();
  }

  return (
    <div style={styles.backdrop} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.4rem', fontWeight: 800, letterSpacing: '0.05em' }}>Add New Truck</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSave} style={{ padding: '20px 24px 24px' }}>
          {error && <div className="alert alert-error">{error}</div>}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Unit # *</label>
              <input value={form.unit} onChange={e => set('unit', e.target.value)} placeholder="27-9999" required />
            </div>
            <div className="form-group">
              <label className="form-label">VIN *</label>
              <input value={form.vin} onChange={e => set('vin', e.target.value)} placeholder="4V4CC9EH..." required />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Order #</label>
              <input value={form.order_number} onChange={e => set('order_number', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Model</label>
              <input value={form.model} onChange={e => set('model', e.target.value)} placeholder="VNR64T300" />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Bus Unit</label>
              <select value={form.bus_unit} onChange={e => set('bus_unit', e.target.value)}>
                <option>Connect</option>
                <option>Supply</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Outfitter</label>
              <select value={form.outfitter_name} onChange={e => set('outfitter_name', e.target.value)}>
                <option value="">— None —</option>
                {OUTFITTERS.map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Pre-Assigned Terminal</label>
              <select value={form.pre_assigned_terminal} onChange={e => set('pre_assigned_terminal', e.target.value)}>
                <option value="">— Not assigned —</option>
                {TERMINALS.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Built at OEM Date</label>
              <input type="date" value={form.built_at_oem_date} onChange={e => set('built_at_oem_date', e.target.value)} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Invoice</label>
              <input value={form.invoice} onChange={e => set('invoice', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Ship To</label>
              <input value={form.ship_to} onChange={e => set('ship_to', e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Notes</label>
            <textarea rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Saving…</> : 'Add Truck'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const styles = {
  backdrop: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 },
  modal: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.6)' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid var(--border)' },
};
