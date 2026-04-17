-- ============================================================
-- TOTER FLEET TRACKER v3 - Simplified Schema
-- Run this in Supabase SQL Editor.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE public.trucks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  order_number TEXT,
  model TEXT,
  unit TEXT UNIQUE NOT NULL,
  vin TEXT UNIQUE NOT NULL,
  bus_unit TEXT,
  ship_to TEXT,
  invoice TEXT,
  outfitter_name TEXT,
  pre_assigned_terminal TEXT,

  built_at_oem_date DATE,
  in_transit_to_outfitter_date DATE,
  outfitting_in_progress_date DATE,
  ready_to_ship_to_branding_date DATE,
  in_transit_to_branding_date DATE,
  branding_complete_date DATE,
  ready_to_ship_to_rocky_top_date DATE,
  shipped_to_rt_date DATE,
  dealer_inspection_date DATE,
  pdi_complete_date DATE,
  in_service_date DATE,

  current_status TEXT NOT NULL DEFAULT 'Built at OEM',
  eta DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.truck_updates (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  truck_id UUID REFERENCES public.trucks(id) ON DELETE CASCADE NOT NULL,
  changed_by TEXT,
  field_changed TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.truck_photos (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  truck_id UUID REFERENCES public.trucks(id) ON DELETE CASCADE NOT NULL,
  changed_by TEXT,
  storage_path TEXT NOT NULL,
  caption TEXT,
  stage TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trucks_updated_at
  BEFORE UPDATE ON public.trucks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE OR REPLACE FUNCTION public.update_truck_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.in_service_date IS NOT NULL THEN NEW.current_status := 'In Service';
  ELSIF NEW.pdi_complete_date IS NOT NULL THEN NEW.current_status := 'PDI Complete';
  ELSIF NEW.dealer_inspection_date IS NOT NULL THEN NEW.current_status := 'Dealer Inspection';
  ELSIF NEW.shipped_to_rt_date IS NOT NULL THEN NEW.current_status := 'Shipped to RT';
  ELSIF NEW.ready_to_ship_to_rocky_top_date IS NOT NULL THEN NEW.current_status := 'Ready to Ship to Rocky Top';
  ELSIF NEW.branding_complete_date IS NOT NULL THEN NEW.current_status := 'Branding in Progress';
  ELSIF NEW.in_transit_to_branding_date IS NOT NULL THEN NEW.current_status := 'In Transit to Branding';
  ELSIF NEW.ready_to_ship_to_branding_date IS NOT NULL THEN NEW.current_status := 'Ready to Ship to Branding';
  ELSIF NEW.outfitting_in_progress_date IS NOT NULL THEN NEW.current_status := 'Outfitting in Progress';
  ELSIF NEW.in_transit_to_outfitter_date IS NOT NULL THEN NEW.current_status := 'In Transit to Outfitter';
  ELSE NEW.current_status := 'Built at OEM';
  END IF;
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trucks_auto_status
  BEFORE INSERT OR UPDATE ON public.trucks
  FOR EACH ROW EXECUTE FUNCTION public.update_truck_status();

ALTER TABLE public.trucks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.truck_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.truck_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all" ON public.trucks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON public.truck_updates FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON public.truck_photos FOR ALL USING (true) WITH CHECK (true);
