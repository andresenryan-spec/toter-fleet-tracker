import React, { useEffect, useState, useMemo } from 'react';
import { supabase, STAGES, STAGE_COLORS, OUTFITTERS } from '../lib/supabase';
import { useSession } from '../lib/SessionContext';

// Target days per stage — internal benchmark
const STAGE_TARGETS = {
  'Built at OEM': 21,
  'In Transit to Outfitter': 5,
  'Outfitting in Progress': 30,
  'Ready to Ship to Branding': 7,
  'In Transit to Branding': 5,
  'Branding in Progress': 7,
  'Ready to Ship to Rocky Top': 5,
  'Shipped to RT': 3,
  'Dealer Inspection': 5,
  'PDI Complete': 5,
  'In Service': null,
};

const STAGE_FIELD_MAP = {
  'Built at OEM': 'built_at_oem_date',
  'In Transit to Outfitter': 'in_transit_to_outfitter_date',
  'Outfitting in Progress': 'outfitting_in_progress_date',
  'Ready to Ship to Branding': 'ready_to_ship_to_branding_date',
  'In Transit to Branding': 'in_transit_to_branding_date',
  'Branding in Progress': 'branding_complete_date',
  'Ready to Ship to Rocky Top': 'ready_to_ship_to_rocky_top_date',
  'Shipped to RT': 'shipped_to_rt_date',
  'Dealer Inspection': 'dealer_inspection_date',
  'PDI Complete': 'pdi_complete_date',
  'In Service': 'in_service_date',
};

const SHORT = {
  'Built at OEM': 'At OEM',
  'In Transit to Outfitter': 'Transit→Out',
  'Outfitting in Progress': 'Outfitting',
  'Ready to Ship to Branding': 'Ready→Brand',
  'In Transit to Branding': 'Transit→Brand',
  'Branding in Progress': 'Branding',
  'Ready to Ship to Rocky Top': 'Ready→RT',
  'Shipped to RT': 'Shipped→RT',
  'Dealer Inspection': 'Dealer Insp.',
  'PDI Complete': 'PDI',
  'In Service': 'In Service',
};

function daysBetween(start, end) {
  if (!start) return null;
  const s = new Date(start);
  const e = end ? new Date(end) : new Date();
  return Math.max(0, Math.floor((e - s) / 86400000));
}

function getStageDays(truck) {
  // Returns array of { stage, days } for each stage the truck has passed through or is currently in
  const result = [];
  for (let i = 0; i < STAGES.length; i++) {
    const stage = STAGES[i];
    const field = STAGE_FIELD_MAP[stage];
    const nextField = i < STAGES.length - 1 ? STAGE_FIELD_MAP[STAGES[i + 1]] : null;
    const startDate = truck[field];
    if (!startDate) continue;
    const endDate = nextField ? truck[nextField] : null;
    const days = daysBetween(startDate, endDate);
    result.push({ stage, days, startDate, endDate, color: STAGE_COLORS[stage] });
  }
  return result;
}

function heatColor(avg, target) {
  if (!target) return { bg: 'rgba(88,166,255,0.08)', border: 'rgba(88,166,255,0.25)', text: '#58a6ff', bar: '#58a6ff' };
  const ratio = avg / target;
  if (ratio <= 0.85) return { bg: 'rgba(63,185,80,0.08)', border: 'rgba(63,185,80,0.25)', text: '#3fb950', bar: '#3fb950' };
  if (ratio <= 1.1) return { bg: 'rgba(210,153,34,0.08)', border: 'rgba(210,153,34,0.3)', text: '#d29922', bar: '#d29922' };
  return { bg: 'rgba(248,81,73,0.08)', border: 'rgba(248,81,73,0.3)', text: '#f85149', bar: '#f85149' };
}

export default function TimingPage() {
  const { session, isInternal } = useSession();
  const [trucks, setTrucks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [outfitterFilter, setOutfitterFilter] = useState('');

  useEffect(() => {
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const filtered = useMemo(() =>
    outfitterFilter ? trucks.filter(t => t.outfitter_name === outfitterFilter) : trucks,
    [trucks, outfitterFilter]
  );

  // Stage heat data — trucks currently at each stage
  const heatData = useMemo(() => {
    return STAGES.filter(s => s !== 'In Service').map(stage => {
      const atStage = filtered.filter(t => t.current_status === stage);
      const daysArr = atStage.map(t => {
        const field = STAGE_FIELD_MAP[stage];
        return daysBetween(t[field], null);
      }).filter(d => d !== null);
      const avg = daysArr.length ? Math.round(daysArr.reduce((a, b) => a + b, 0) / daysArr.length) : 0;
      const target = STAGE_TARGETS[stage];
      return { stage, count: atStage.length, avg, target, colors: heatColor(avg, target) };
    });
  }, [filtered]);

  // Gantt data — trucks with at least 2 stage dates
  const ganttTrucks = useMemo(() =>
    filtered.filter(t => {
      const stageDays = getStageDays(t);
      return stageDays.length >= 2;
    }).slice(0, 12),
    [filtered]
  );

  // Avg stage duration — completed trucks
  const avgData = useMemo(() => {
    return STAGES.filter(s => s !== 'In Service').map(stage => {
      const field = STAGE_FIELD_MAP[stage];
      const nextStage = STAGES[STAGES.indexOf(stage) + 1];
      const nextField = nextStage ? STAGE_FIELD_MAP[nextStage] : null;
      const days = filtered
        .filter(t => t[field] && (nextField ? t[nextField] : true))
        .map(t => daysBetween(t[field], nextField ? t[nextField] : null))
        .filter(d => d !== null && d > 0 && d < 200);
      const avg = days.length ? Math.round(days.reduce((a, b) => a + b, 0) / days.length) : null;
      const target = STAGE_TARGETS[stage];
      return { stage, avg, target, count: days.length, colors: avg ? heatColor(avg, target) : null };
    }).filter(d => d.avg !== null);
  }, [filtered]);

  // Stuck trucks — over target at current stage
  const stuckTrucks = useMemo(() => {
    return filtered.map(t => {
      const stage = t.current_status;
      if (stage === 'In Service') return null;
      const field = STAGE_FIELD_MAP[stage];
      const days = daysBetween(t[field], null);
      const target = STAGE_TARGETS[stage];
      if (!days || !target || days <= target) return null;
      return { ...t, daysAtStage: days, target, over: days - target };
    }).filter(Boolean).sort((a, b) => b.over - a.over);
  }, [filtered]);

  // Monthly vs all-time comparison
  const monthlyData = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    return STAGES.filter(s => s !== 'In Service').map(stage => {
      const field = STAGE_FIELD_MAP[stage];
      const nextStage = STAGES[STAGES.indexOf(stage) + 1];
      const nextField = nextStage ? STAGE_FIELD_MAP[nextStage] : null;
      const allDays = filtered.filter(t => t[field] && nextField && t[nextField])
        .map(t => daysBetween(t[field], t[nextField]))
        .filter(d => d > 0 && d < 200);
      const monthDays = filtered.filter(t => t[field] && nextField && t[nextField] && new Date(t[nextField]) >= monthStart)
        .map(t => daysBetween(t[field], t[nextField]))
        .filter(d => d > 0 && d < 200);
      const allAvg = allDays.length ? Math.round(allDays.reduce((a,b)=>a+b,0)/allDays.length) : null;
      const monthAvg = monthDays.length ? Math.round(monthDays.reduce((a,b)=>a+b,0)/monthDays.length) : null;
      if (!allAvg && !monthAvg) return null;
      return { stage, allAvg, monthAvg, trend: monthAvg && allAvg ? (monthAvg > allAvg ? 'up' : monthAvg < allAvg ? 'down' : 'flat') : 'flat' };
    }).filter(Boolean);
  }, [filtered]);

  const maxAvgDays = Math.max(...avgData.map(d => Math.max(d.avg || 0, d.target || 0)), 1) * 1.15;

  if (loading) return <div style={{ textAlign: 'center', paddingTop: 60 }}><div className="spinner" /></div>;

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Stage Timing</h1>
          <p className="page-subtitle">
            {filtered.length} trucks · {stuckTrucks.length} over target
            {outfitterFilter && ` · ${outfitterFilter}`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {isInternal && (
            <select
              value={outfitterFilter}
              onChange={e => setOutfitterFilter(e.target.value)}
              style={{ maxWidth: 220, fontSize: '0.85rem', padding: '7px 12px' }}
            >
              <option value="">All Outfitters</option>
              {OUTFITTERS.map(o => <option key={o}>{o}</option>)}
            </select>
          )}
        </div>
      </div>

      {/* ── SECTION 1: HEAT CARDS ── */}
      <div style={styles.sectionHeader}>
        <div style={styles.sectionNum}>01</div>
        <div>
          <h2 style={styles.sectionTitle}>Current Stage Heat</h2>
          <p style={styles.sectionDesc}>Trucks at each stage right now — color indicates on/over target</p>
        </div>
        <div style={styles.legend}>
          <span style={{ ...styles.legendDot, background: '#3fb950' }} /> On Track
          <span style={{ ...styles.legendDot, background: '#d29922', marginLeft: 12 }} /> Slight Delay
          <span style={{ ...styles.legendDot, background: '#f85149', marginLeft: 12 }} /> Over Target
        </div>
      </div>

      <div style={styles.heatGrid}>
        {heatData.map(d => (
          <div key={d.stage} style={{ ...styles.heatCard, background: d.colors.bg, borderColor: d.colors.border }}>
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: d.colors.bar, borderRadius: '0 0 6px 6px' }} />
            <div style={styles.heatStage}>{SHORT[d.stage]}</div>
            <div style={{ ...styles.heatCount, color: d.colors.text }}>{d.count}</div>
            <div style={styles.heatAvg}>
              Avg <span className="mono" style={{ fontWeight: 500 }}>{d.avg}d</span>
              {d.target && <span style={{ color: 'var(--text-dim)' }}> · tgt {d.target}d</span>}
            </div>
            {d.target && (
              <div style={styles.heatBarWrap}>
                <div style={{ ...styles.heatBarFill, width: `${Math.min((d.avg / d.target) * 100, 100)}%`, background: d.colors.bar }} />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── SECTION 2: GANTT ── */}
      <div style={styles.sectionHeader}>
        <div style={styles.sectionNum}>02</div>
        <div>
          <h2 style={styles.sectionTitle}>Per-Truck Timeline</h2>
          <p style={styles.sectionDesc}>Each bar shows time spent at each stage — hover for exact days</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16, overflowX: 'auto' }}>
        {ganttTrucks.length === 0 ? (
          <div className="empty-state"><h3>Not enough data yet</h3><p>Trucks need dates at multiple stages to appear here.</p></div>
        ) : (
          <>
            <div style={{ minWidth: 600 }}>
              {/* Stage labels */}
              <div style={{ display: 'flex', marginBottom: 8, paddingLeft: 90 }}>
                {STAGES.filter(s => s !== 'In Service').map(s => (
                  <div key={s} style={{ flex: 1, fontSize: '0.62rem', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-dim)', textAlign: 'center', padding: '0 1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {SHORT[s]}
                  </div>
                ))}
              </div>

              {ganttTrucks.map(truck => {
                const stageDays = getStageDays(truck);

                return (
                  <div key={truck.id} style={{ display: 'flex', alignItems: 'center', marginBottom: 5 }}>
                    <div style={{ width: 90, flexShrink: 0, fontFamily: "'JetBrains Mono', monospace", fontSize: '0.72rem', color: 'var(--accent)', fontWeight: 500 }}>
                      {truck.unit}
                    </div>
                    <div style={{ flex: 1, display: 'flex', height: 22, gap: 2, position: 'relative' }}>
                      {STAGES.filter(s => s !== 'In Service').map(stage => {
                        const sd = stageDays.find(s => s.stage === stage);
                        if (!sd) return <div key={stage} style={{ flex: 1, background: 'var(--border-light)', borderRadius: 3, opacity: 0.2 }} />;
                        const target = STAGE_TARGETS[stage];
                        const isOver = target && sd.days > target * 1.1;
                        return (
                          <div
                            key={stage}
                            title={`${stage}: ${sd.days} days${target ? ` (target: ${target}d)` : ''}`}
                            style={{
                              flex: Math.max(sd.days, 1),
                              background: isOver ? '#f85149' : sd.color,
                              borderRadius: 3,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '0.58rem', fontFamily: "'JetBrains Mono', monospace",
                              color: 'rgba(0,0,0,0.65)', fontWeight: 500,
                              cursor: 'default', transition: 'height 0.15s', overflow: 'hidden',
                            }}
                          >
                            {sd.days > 3 ? `${sd.days}d` : ''}
                          </div>
                        );
                      })}
                    </div>
                    <div style={{ width: 45, textAlign: 'right', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.7rem', color: 'var(--text-muted)', paddingLeft: 8, flexShrink: 0 }}>
                      {stageDays.reduce((a,b)=>a+b.days,0)}d
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Legend */}
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--border-light)' }}>
              {STAGES.filter(s => s !== 'In Service').map(s => (
                <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: STAGE_COLORS[s] }} />
                  {SHORT[s]}
                </div>
              ))}
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: '#f85149' }} />
                Over Target
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── SECTION 3 & 4 SIDE BY SIDE ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>

        {/* SECTION 3: AVG DURATION */}
        <div>
          <div style={styles.sectionHeader}>
            <div style={styles.sectionNum}>03</div>
            <div>
              <h2 style={styles.sectionTitle}>Average Stage Duration</h2>
              <p style={styles.sectionDesc}>Historical average vs. target — red line = target</p>
            </div>
          </div>
          <div className="card">
            {avgData.length === 0 ? (
              <div className="empty-state" style={{ padding: '30px 20px' }}><h3>Not enough data</h3></div>
            ) : avgData.map(d => {
              const pct = (d.avg / maxAvgDays) * 100;
              const targetPct = d.target ? (d.target / maxAvgDays) * 100 : null;
              const delta = d.target ? d.avg - d.target : null;
              return (
                <div key={d.stage} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <div style={{ width: 90, flexShrink: 0, fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                    {SHORT[d.stage]}
                  </div>
                  <div style={{ flex: 1, height: 22, background: 'var(--border-light)', borderRadius: 4, overflow: 'visible', position: 'relative' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: d.colors?.bar || 'var(--accent)', borderRadius: 4, display: 'flex', alignItems: 'center', paddingLeft: 8, transition: 'width 1s ease' }}>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.65rem', color: 'rgba(0,0,0,0.7)', fontWeight: 500, whiteSpace: 'nowrap' }}>{d.avg}d</span>
                    </div>
                    {targetPct && (
                      <div style={{ position: 'absolute', top: -2, bottom: -2, left: `${targetPct}%`, width: 2, background: 'rgba(248,81,73,0.7)', borderRadius: 1 }} />
                    )}
                  </div>
                  {delta !== null && (
                    <div style={{ width: 40, textAlign: 'right', fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.75rem', fontWeight: 700, color: delta > 0 ? '#f85149' : '#3fb950', flexShrink: 0 }}>
                      {delta > 0 ? '+' : ''}{delta}d
                    </div>
                  )}
                </div>
              );
            })}
            <div style={{ marginTop: 10, fontSize: '0.72rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 20, height: 2, background: 'rgba(248,81,73,0.7)' }} />
              Target day threshold
            </div>
          </div>
        </div>

        {/* SECTION 4: STUCK + MONTHLY */}
        <div>
          <div style={styles.sectionHeader}>
            <div style={styles.sectionNum}>04</div>
            <div>
              <h2 style={styles.sectionTitle}>Watchlist & Monthly Trend</h2>
              <p style={styles.sectionDesc}>Trucks over target + this month vs. all-time</p>
            </div>
          </div>

          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 12 }}>
              🔥 Over Target — Needs Attention
            </div>
            {stuckTrucks.length === 0 ? (
              <div style={{ color: 'var(--success)', fontSize: '0.85rem', padding: '12px 0' }}>✓ All trucks are on track!</div>
            ) : stuckTrucks.slice(0, 6).map(t => (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid var(--border-light)' }}>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.78rem', color: 'var(--accent)', width: 75, flexShrink: 0 }}>{t.unit}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text)' }}>{SHORT[t.current_status]}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 1 }}>{t.outfitter_name || 'Internal'}</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.3rem', fontWeight: 800, lineHeight: 1, color: t.over > 10 ? '#f85149' : '#d29922' }}>{t.daysAtStage}d</div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.05em', textTransform: 'uppercase' }}>+{t.over}d over</div>
                </div>
              </div>
            ))}
          </div>

          <div className="card">
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 12 }}>
              This Month vs. All-Time Average
            </div>
            {monthlyData.length === 0 ? (
              <div style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>No completed data yet.</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                <thead>
                  <tr>
                    {['Stage', 'This Month', 'All-Time', ''].map(h => (
                      <th key={h} style={{ textAlign: h === 'Stage' ? 'left' : 'right', padding: '4px 6px', color: 'var(--text-dim)', fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.68rem', letterSpacing: '0.07em', textTransform: 'uppercase', borderBottom: '1px solid var(--border)', fontWeight: 700 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {monthlyData.map(d => (
                    <tr key={d.stage} style={{ borderBottom: '1px solid var(--border-light)' }}>
                      <td style={{ padding: '7px 6px', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', fontSize: '0.75rem' }}>{SHORT[d.stage]}</td>
                      <td style={{ padding: '7px 6px', textAlign: 'right', fontFamily: "'JetBrains Mono', monospace", color: d.trend === 'up' ? '#f85149' : d.trend === 'down' ? '#3fb950' : 'var(--text)' }}>{d.monthAvg !== null ? `${d.monthAvg}d` : '—'}</td>
                      <td style={{ padding: '7px 6px', textAlign: 'right', fontFamily: "'JetBrains Mono', monospace", color: 'var(--text-muted)' }}>{d.allAvg !== null ? `${d.allAvg}d` : '—'}</td>
                      <td style={{ padding: '7px 6px', textAlign: 'right', fontSize: '0.9rem' }}>
                        {d.trend === 'up' ? '🔴↑' : d.trend === 'down' ? '🟢↓' : '⚪→'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  sectionHeader: { display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12, flexWrap: 'wrap' },
  sectionNum: { fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.8rem', fontWeight: 900, color: 'var(--accent)', opacity: 0.35, lineHeight: 1, flexShrink: 0 },
  sectionTitle: { fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.1rem', fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase', lineHeight: 1 },
  sectionDesc: { fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: "'Barlow', sans-serif", fontWeight: 400, textTransform: 'none', letterSpacing: 0, marginTop: 3 },
  legend: { marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.04em', textTransform: 'uppercase' },
  legendDot: { display: 'inline-block', width: 8, height: 8, borderRadius: '50%' },
  heatGrid: { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 24 },
  heatCard: { borderRadius: 6, padding: '14px 12px', border: '1px solid', position: 'relative', overflow: 'hidden', transition: 'transform 0.15s' },
  heatStage: { fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 },
  heatCount: { fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.8rem', fontWeight: 800, lineHeight: 1, marginBottom: 4 },
  heatAvg: { fontSize: '0.75rem', color: 'var(--text-muted)' },
  heatBarWrap: { marginTop: 8, height: 3, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' },
  heatBarFill: { height: '100%', borderRadius: 2 },
};
