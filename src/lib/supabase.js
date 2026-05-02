import { createClient } from '@supabase/supabase-js';

// Pipeline app's own Supabase
export const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY
);

// Fleet Manager Supabase — receives asset records when trucks go In Service
const FM_URL = 'https://okymgdxomkeozmuinybc.supabase.co';
const FM_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9reW1nZHhvbWtlb3ptdWlueWJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0Mjk1MDQsImV4cCI6MjA5MjAwNTUwNH0.fBFWAglSqyMdRP8nRmXpRQEGSQaNZsSwvLO6itnrVcA';
const fmDb = createClient(FM_URL, FM_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, storageKey: 'pipeline_fm_auth' }
});

// Called when a truck advances to In Service —
// creates or updates the matching record in Fleet Manager Asset Registry
export async function syncAssetToFleetManager(truck) {
  try {
    // Check if asset already exists by VIN
    const { data: existing } = await fmDb
      .from('assets')
      .select('id, status, terminal')
      .eq('vin', truck.vin)
      .limit(1);

    // Extract year from unit number (e.g. "27-9589" → 2027)
    const unitYear = truck.unit ? parseInt('20' + truck.unit.split('-')[0]) : null;

    if (existing && existing.length > 0) {
      // Asset exists — update status to Active and terminal if now assigned
      const updates = {
        status: 'Active',
        updated_at: new Date().toISOString(),
      };
      if (truck.pre_assigned_terminal && !existing[0].terminal) {
        updates.terminal = truck.pre_assigned_terminal;
      }
      await fmDb.from('assets').update(updates).eq('id', existing[0].id);
      console.log('Fleet Manager asset updated:', truck.unit);
    } else {
      // Insert new asset record
      const newAsset = {
        truck_number:       truck.unit,
        vin:                truck.vin,
        year:               unitYear,
        type:               'Toter',
        make:               null,
        model:              truck.model || null,
        terminal:           truck.pre_assigned_terminal || '',
        domicile:           null,
        status:             'Active',
        current_assignment: '',
        mileage:            0,
        notes:              'Added from Pipeline Tracker' + (truck.notes ? ' — ' + truck.notes : ''),
        for_sale:           false,
        sold:               false,
        geotab:             false,
        lytx:               false,
      };
      const { error } = await fmDb.from('assets').insert(newAsset);
      if (error) {
        console.error('Fleet Manager asset insert failed:', error.message);
      } else {
        console.log('Fleet Manager asset created:', truck.unit);
      }
    }
  } catch(e) {
    console.error('syncAssetToFleetManager error:', e.message);
  }
}

// ── Access profiles ──────────────────────────────────────────
export const ACCESS_PROFILES = {
  internal: { password: 'Dreamhome26', label: 'Internal', partner: null, canSeeAll: true, canSeeSell: true },
  bg:       { password: 'BigTrucks26', label: 'B&G Truck Conversions', partner: 'B&G Truck Conversions', canSeeAll: false, canSeeSell: false },
  unique:   { password: 'UniqueTrucks26', label: 'Unique Fabrications Inc', partner: 'Unique Fabrications Inc', canSeeAll: false, canSeeSell: false },
  worldwide:{ password: 'WorldwideTrucks26', label: 'Worldwide Equipment', partner: null, canSeeAll: true, canSeeSell: false },
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
  '7012 TN', '7013 AL', '7014 TX', '7015 NC', '7016 AR',
];

export const OUTFITTERS = [
  'B&G Truck Conversions',
  'Unique Fabrications Inc',
  'Worldwide Equipment',
];

// ── Default location per stage ────────────────────────────────
// Dublin, VA = OEM build location
// Outfitter stages use ship_to field if available
// All other stages default to Rocky Top, TN
export function defaultLocation(stage, truck) {
  if (stage === 'Built at OEM') return 'Dublin, VA';
  if (
    stage === 'In Transit to Outfitter' ||
    stage === 'Outfitting in Progress'  ||
    stage === 'Ready to Ship to Branding'
  ) {
    return truck?.ship_to || truck?.outfitter_name || 'Outfitter Location';
  }
  return 'Rocky Top, TN';
}

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
