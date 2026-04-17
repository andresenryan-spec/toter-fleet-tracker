import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY
);

// ── Access profiles ──────────────────────────────────────────
// Each entry: { password, label, partner, canSeeAll, canSeeSell }
export const ACCESS_PROFILES = {
  internal: {
    password: 'Dreamhome26',
    label: 'Internal',
    partner: null,       // null = sees all trucks
    canSeeAll: true,
    canSeeSell: true,
  },
  bg: {
    password: 'BigTrucks26',
    label: 'B&G Truck Conversions',
    partner: 'B&G Truck Conversions',
    canSeeAll: false,
    canSeeSell: false,
  },
  unique: {
    password: 'UniqueTrucks26',
    label: 'Unique Fabrications Inc',
    partner: 'Unique Fabrications Inc',
    canSeeAll: false,
    canSeeSell: false,
  },
  worldwide: {
    password: 'WorldwideTrucks26',
    label: 'Worldwide Equipment',
    partner: 'Worldwide Equipment',
    canSeeAll: false,
    canSeeSell: false,
  },
};

export function checkPassword(input) {
  return Object.values(ACCESS_PROFILES).find(p => p.password === input) || null;
}

// ── Stages ───────────────────────────────────────────────────
export const STAGES = [
  'Built at OEM',
  'In Transit to Outfitter',
  'Outfitting in Progress',
  'Ready to Ship to Branding',
  'In Transit to Branding',
  'Branding in Progress',
  'Ready to Ship to Rocky Top',
  'Shipped to RT',
  'Dealer Inspection',
  'PDI Complete',
  'In Service',
];

export const STAGE_FIELD_MAP = {
  'Built at OEM':                   'built_at_oem_date',
  'In Transit to Outfitter':        'in_transit_to_outfitter_date',
  'Outfitting in Progress':         'outfitting_in_progress_date',
  'Ready to Ship to Branding':      'ready_to_ship_to_branding_date',
  'In Transit to Branding':         'in_transit_to_branding_date',
  'Branding in Progress':           'branding_complete_date',
  'Ready to Ship to Rocky Top':     'ready_to_ship_to_rocky_top_date',
  'Shipped to RT':                  'shipped_to_rt_date',
  'Dealer Inspection':              'dealer_inspection_date',
  'PDI Complete':                   'pdi_complete_date',
  'In Service':                     'in_service_date',
};

export const STAGE_COLORS = {
  'Built at OEM':                   '#6366f1',
  'In Transit to Outfitter':        '#8b5cf6',
  'Outfitting in Progress':         '#f59e0b',
  'Ready to Ship to Branding':      '#10b981',
  'In Transit to Branding':         '#3b82f6',
  'Branding in Progress':           '#f97316',
  'Ready to Ship to Rocky Top':     '#06b6d4',
  'Shipped to RT':                  '#84cc16',
  'Dealer Inspection':              '#e879f9',
  'PDI Complete':                   '#22c55e',
  'In Service':                     '#f0b429',
};

export const TERMINALS = [
  '7012 TN',
  '7013 AL',
  '7014 TX',
  '7015 NC',
  '7016 AR',
];

export const OUTFITTERS = [
  'B&G Truck Conversions',
  'Unique Fabrications Inc',
  'Worldwide Equipment',
];

export async function logUpdate(truckId, changedBy, fieldChanged, oldValue, newValue, note) {
  await supabase.from('truck_updates').insert({
    truck_id: truckId,
    changed_by: changedBy,
    field_changed: fieldChanged,
    old_value: oldValue?.toString() || null,
    new_value: newValue?.toString() || null,
    note: note || null,
  });
}
