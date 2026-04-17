-- ============================================================
-- TOTER FLEET TRACKER v2 - Simplified Schema
-- No Supabase Auth required. Run this in Supabase SQL Editor.
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TRUCKS
-- ============================================================

CREATE TABLE public.trucks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  order_number TEXT,
  model TEXT,
  unit TEXT UNIQUE NOT NULL,
  vin TEXT UNIQUE NOT NULL,
  bus_unit TEXT,
  ship_to TEXT,
  invoice TEXT,
  outfitter_name TEXT, -- 'B&G Truck Conversions', 'Unique Fabrications Inc', 'Worldwide Equipment', or NULL

  -- Stage dates (NULL = not yet reached)
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

  current_status TEXT NOT NULL DEFAULT 'Built at OEM',
  eta DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TRUCK UPDATES (audit log)
-- ============================================================

CREATE TABLE public.truck_updates (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  truck_id UUID REFERENCES public.trucks(id) ON DELETE CASCADE NOT NULL,
  changed_by TEXT, -- 'internal', 'B&G Truck Conversions', etc.
  field_changed TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TRUCK PHOTOS
-- ============================================================

CREATE TABLE public.truck_photos (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  truck_id UUID REFERENCES public.trucks(id) ON DELETE CASCADE NOT NULL,
  changed_by TEXT,
  storage_path TEXT NOT NULL,
  caption TEXT,
  stage TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TRUCKS TO SELL
-- ============================================================

CREATE TABLE public.trucks_to_sell (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  terminal TEXT,
  year INTEGER,
  truck_number TEXT,
  make TEXT,
  model TEXT,
  vin TEXT UNIQUE NOT NULL,
  mileage INTEGER,
  general_notes TEXT,
  decommissioned BOOLEAN DEFAULT FALSE,
  unwrapped BOOLEAN DEFAULT FALSE,
  pictures_taken BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- AUTO UPDATE updated_at
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trucks_updated_at
  BEFORE UPDATE ON public.trucks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trucks_to_sell_updated_at
  BEFORE UPDATE ON public.trucks_to_sell
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- AUTO COMPUTE current_status
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_truck_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.pdi_complete_date IS NOT NULL THEN
    NEW.current_status := 'PDI Complete';
  ELSIF NEW.dealer_inspection_date IS NOT NULL THEN
    NEW.current_status := 'Dealer Inspection';
  ELSIF NEW.shipped_to_rt_date IS NOT NULL THEN
    NEW.current_status := 'Shipped to RT';
  ELSIF NEW.ready_to_ship_to_rocky_top_date IS NOT NULL THEN
    NEW.current_status := 'Ready to Ship to Rocky Top';
  ELSIF NEW.branding_complete_date IS NOT NULL THEN
    NEW.current_status := 'Branding in Progress';
  ELSIF NEW.in_transit_to_branding_date IS NOT NULL THEN
    NEW.current_status := 'In Transit to Branding';
  ELSIF NEW.ready_to_ship_to_branding_date IS NOT NULL THEN
    NEW.current_status := 'Ready to Ship to Branding';
  ELSIF NEW.outfitting_in_progress_date IS NOT NULL THEN
    NEW.current_status := 'Outfitting in Progress';
  ELSIF NEW.in_transit_to_outfitter_date IS NOT NULL THEN
    NEW.current_status := 'In Transit to Outfitter';
  ELSE
    NEW.current_status := 'Built at OEM';
  END IF;
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trucks_auto_status
  BEFORE INSERT OR UPDATE ON public.trucks
  FOR EACH ROW EXECUTE FUNCTION public.update_truck_status();

-- ============================================================
-- OPEN ACCESS (no auth - app handles access control)
-- ============================================================

ALTER TABLE public.trucks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.truck_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.truck_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trucks_to_sell ENABLE ROW LEVEL SECURITY;

-- Allow all operations via anon key (app handles password/access logic)
CREATE POLICY "Allow all" ON public.trucks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON public.truck_updates FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON public.truck_photos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON public.trucks_to_sell FOR ALL USING (true) WITH CHECK (true);
