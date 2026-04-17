import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase, STAGES, STAGE_FIELD_MAP, STAGE_COLORS, TERMINALS, logUpdate } from '../lib/supabase';
import { useSession } from '../lib/SessionContext';
import { StatusBadge } from './TrucksPage';

export default function TruckDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { session, isInternal } = useSession();
  const [truck, setTruck] = useState(null);
  const [updates, setUpdates] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState('');
  const [eta, setEta] = useState('');
  const [terminal, setTerminal] = useState('');
  const [photoCaption, setPhotoCaption] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const fileRef = useRef();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadAll(); }, [id]);

  async function loadAll() {
    setLoading(true);
    const [{ data: t }, { data: u }, { data: p }] = await Promise.all([
      supabase.from('trucks').select('*').eq('id', id).single(),
      supabase.from('truck_updates').select('*').eq('truck_id', id).order('created_at', { ascending: false }),
      supabase.from('truck_photos').select('*').eq('truck_id', id).order('created_at', { ascending: false }),
    ]);
    setTruck(t);
    setUpdates(u || []);
    setPhotos(p || []);
    setEta(t?.eta || '');
    setTerminal(t?.pre_assigned_terminal || '');
    setLoading(false);
  }

  function flash(msg, isError = false) {
    if (isError) setError(msg); else setSuccess(msg);
    setTimeout(() => { setError(''); setSuccess(''); }, 3000);
  }

  async function advanceStage() {
    const currentIdx = STAGES.indexOf(truck.current_status);
    if (currentIdx >= STAGES.length - 1) return;
    const nextStage = STAGES[currentIdx + 1];
    const field = STAGE_FIELD_MAP[nextStage];
    const today = new Date().toISOString().split('T')[0];
    setSaving(true);
    const { error } = await supabase.from('trucks').update({ [field]: today }).eq('id', id);
    if (error) { flash(error.message, true); setSaving(false); return; }
    await logUpdate(id, session?.label, 'Status Advanced', truck.current_status, nextStage, note || null);
    setNote('');
    flash(`Advanced to "${nextStage}"`);
    setSaving(false);
    loadAll();
  }

  async function saveEta() {
    setSaving(true);
    await supabase.from('trucks').update({ eta: eta || null }).eq('id', id);
    await logUpdate(id, session?.label, 'ETA Updated', truck.eta, eta, null);
    flash('ETA saved');
    setSaving(false);
    loadAll();
  }

  async function saveTerminal() {
    setSaving(true);
    await supabase.from('trucks').update({ pre_assigned_terminal: terminal || null }).eq('id', id);
    await logUpdate(id, session?.label, 'Terminal Assigned', truck.pre_assigned_terminal, terminal, null);
    flash('Terminal saved');
    setSaving(false);
    loadAll();
  }

  async function saveNote() {
    if (!note.trim()) return;
    await logUpdate(id, session?.label, 'Note Added', null, null, note);
    setNote('');
    flash('Note saved');
    loadAll();
  }

  async function updateStageDate(stage, dateVal) {
    const field = STAGE_FIELD_MAP[stage];
    await supabase.from('trucks').update({ [field]: dateVal || null }).eq('id', id);
    await logUpdate(id, session?.label, `Date Updated: ${stage}`, truck[field], dateVal, null);
    loadAll();
  }

  async function uploadPhoto(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingPhoto(true);
    const ext = file.name.split('.').pop();
    const path = `${id}/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from('truck-photos').upload(path, file);
    if (upErr) { flash(upErr.message, true); setUploadingPhoto(false); return; }
    await supabase.from('truck_photos').insert({
      truck_id: id, changed_by: session?.label,
      storage_path: path, caption: photoCaption, stage: truck?.current_status,
    });
    await logUpdate(id, session?.label, 'Photo Uploaded', null, path, photoCaption || 'Photo added');
    setPhotoCaption('');
    setUploadingPhoto(false);
    flash('Photo uploaded');
    loadAll();
    e.target.value = '';
  }

  if (loading) return <div style={{ textAlign: 'center', paddingTop: 60 }}><div className="spinner" /></div>;
  if (!truck) return <div className="alert alert-error">Truck not found.</div>;

  const currentIdx = STAGES.indexOf(truck.current_status);
  const isComplete = truck.current_status === 'In Service';

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/trucks')}>← Back</button>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '2rem', fontWeight: 800 }}>Unit {truck.unit}</h1>
            <StatusBadge status={truck.current_status} />
            {truck.pre_assigned_terminal && (
              <span style={{ background: 'rgba(240,180,41,0.12)', color: 'var(--accent)', padding: '3px 10px', borderRadius: 4, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '0.8rem', letterSpacing: '0.05em' }}>
                📍 {truck.pre_assigned_terminal}
              </span>
            )}
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 4, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <span className="mono">{truck.vin}</span>
            {truck.model && <span>{truck.model}</span>}
            {truck.outfitter_name && <span>Outfitter: <strong style={{ color: 'var(--text)' }}>{truck.outfitter_name}</strong></span>}
          </div>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div style={styles.grid}>
        {/* Left: Stage pipeline */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card">
            <h3 style={styles.sectionTitle}>Stage Pipeline</h3>
            <div style={{ marginTop: 16 }}>
              {STAGES.map((stage, idx) => {
                const field = STAGE_FIELD_MAP[stage];
                const date = truck[field];
                const isPast = idx < currentIdx;
                const isCurrent = idx === currentIdx;
                const isFuture = idx > currentIdx;
                const color = STAGE_COLORS[stage];
                return (
                  <div key={stage} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, position: 'relative', paddingBottom: 20 }}>
                    <div style={{
                      width: 14, height: 14, borderRadius: '50%', flexShrink: 0, marginTop: 3, position: 'relative', zIndex: 1,
                      background: isFuture ? 'var(--bg-elevated)' : color,
                      border: isCurrent ? `2px solid ${color}` : isFuture ? '2px solid var(--border)' : 'none',
                      boxShadow: isCurrent ? `0 0 10px ${color}66` : 'none',
                    }} />
                    {idx < STAGES.length - 1 && (
                      <div style={{ position: 'absolute', left: 6, top: 17, width: 2, height: '100%', zIndex: 0, background: isPast ? 'var(--border)' : 'var(--border-light)' }} />
                    )}
                    <div style={{ flex: 1, paddingTop: 2 }}>
                      <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: isCurrent ? 700 : 600, fontSize: '0.9rem', letterSpacing: '0.03em', textTransform: 'uppercase', color: isFuture ? 'var(--text-dim)' : isCurrent ? color : 'var(--text)' }}>
                        {stage}
                      </div>
                      {isInternal ? (
                        <input type="date" value={date || ''} onChange={e => updateStageDate(stage, e.target.value)}
                          style={{ marginTop: 4, fontSize: '0.78rem', padding: '3px 8px', width: 'auto' }} />
                      ) : (
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
                          {date ? new Date(date).toLocaleDateString() : <span style={{ color: 'var(--text-dim)' }}>Pending</span>}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {!isComplete ? (
              <div style={{ marginTop: 4 }}>
                <div className="form-group">
                  <label className="form-label">Note (optional)</label>
                  <textarea rows={2} value={note} onChange={e => setNote(e.target.value)} placeholder="Add context for this stage change..." />
                </div>
                <button className="btn btn-primary" onClick={advanceStage} disabled={saving} style={{ width: '100%', justifyContent: 'center' }}>
                  {saving ? <span className="spinner" style={{ width: 16, height: 16 }} /> : `✓ Mark as "${STAGES[currentIdx + 1]}"`}
                </button>
              </div>
            ) : (
              <div className="alert alert-success" style={{ marginTop: 8 }}>
                ✓ In Service — This truck has completed its full lifecycle.
              </div>
            )}
          </div>

          {/* ETA */}
          <div className="card">
            <h3 style={styles.sectionTitle}>ETA from Outfitter</h3>
            <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
              <input type="date" value={eta} onChange={e => setEta(e.target.value)} style={{ flex: 1 }} />
              <button className="btn btn-ghost" onClick={saveEta} disabled={saving}>Save</button>
            </div>
          </div>

          {/* Pre-Assigned Terminal - internal only */}
          {isInternal && (
            <div className="card">
              <h3 style={styles.sectionTitle}>Pre-Assigned Terminal</h3>
              <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                <select value={terminal} onChange={e => setTerminal(e.target.value)} style={{ flex: 1 }}>
                  <option value="">— Not assigned —</option>
                  {TERMINALS.map(t => <option key={t}>{t}</option>)}
                </select>
                <button className="btn btn-ghost" onClick={saveTerminal} disabled={saving}>Save</button>
              </div>
            </div>
          )}
        </div>

        {/* Right: Details, photos, activity */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Truck info - internal only */}
          {isInternal && (
            <div className="card">
              <h3 style={styles.sectionTitle}>Truck Details</h3>
              <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 20px', fontSize: '0.85rem' }}>
                {[
                  ['Order #', truck.order_number],
                  ['Model', truck.model],
                  ['Bus Unit', truck.bus_unit],
                  ['Invoice', truck.invoice],
                  ['Ship To', truck.ship_to],
                  ['Outfitter', truck.outfitter_name],
                ].map(([k, v]) => v ? (
                  <React.Fragment key={k}>
                    <span style={{ color: 'var(--text-muted)', fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.72rem', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{k}</span>
                    <span>{v}</span>
                  </React.Fragment>
                ) : null)}
              </div>
            </div>
          )}

          {/* Photos */}
          <div className="card">
            <h3 style={styles.sectionTitle}>Photos</h3>
            <div style={{ marginTop: 12 }}>
              {photos.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
                  {photos.map(p => {
                    const { data: { publicUrl } } = supabase.storage.from('truck-photos').getPublicUrl(p.storage_path);
                    return (
                      <div key={p.id} style={{ aspectRatio: '1', borderRadius: 4, overflow: 'hidden', background: 'var(--bg-elevated)', border: '1px solid var(--border)', position: 'relative' }}>
                        <a href={publicUrl} target="_blank" rel="noopener noreferrer">
                          <img src={publicUrl} alt={p.caption || ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </a>
                        {p.caption && (
                          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.65)', color: '#fff', fontSize: '0.65rem', padding: '2px 6px' }}>
                            {p.caption}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <input type="text" placeholder="Caption (optional)" value={photoCaption} onChange={e => setPhotoCaption(e.target.value)} style={{ flex: 1, minWidth: 120 }} />
                <button className="btn btn-ghost" onClick={() => fileRef.current?.click()} disabled={uploadingPhoto}>
                  {uploadingPhoto ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Uploading…</> : '📷 Upload'}
                </button>
                <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={uploadPhoto} />
              </div>
            </div>
          </div>

          {/* Notes & Activity */}
          <div className="card">
            <h3 style={styles.sectionTitle}>Notes & Activity</h3>
            <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
              <input type="text" placeholder="Add a note..." value={note} onChange={e => setNote(e.target.value)} onKeyDown={e => e.key === 'Enter' && saveNote()} style={{ flex: 1 }} />
              <button className="btn btn-ghost" onClick={saveNote}>Add</button>
            </div>
            <div style={{ marginTop: 12, maxHeight: 340, overflowY: 'auto' }}>
              {updates.length === 0 ? (
                <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>No activity yet.</p>
              ) : updates.map(u => (
                <div key={u.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--border-light)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 2 }}>
                    <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {u.field_changed}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>
                      {new Date(u.created_at).toLocaleString()}
                    </span>
                  </div>
                  {u.old_value && u.new_value && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      <span style={{ color: 'var(--danger)' }}>{u.old_value}</span>
                      <span style={{ margin: '0 6px' }}>→</span>
                      <span style={{ color: 'var(--success)' }}>{u.new_value}</span>
                    </div>
                  )}
                  {u.note && <div style={{ fontSize: '0.82rem', color: 'var(--text)', marginTop: 2 }}>{u.note}</div>}
                  {u.changed_by && <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: 2 }}>{u.changed_by}</div>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  grid: { display: 'grid', gridTemplateColumns: '360px 1fr', gap: 16, alignItems: 'start' },
  sectionTitle: { fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)' },
};
