-- ============================================================
-- TOTER FLEET TRACKER - Upgrade Script
-- Run this in Supabase SQL Editor IF you already ran the
-- original schema. This adds the new columns only.
-- ============================================================

-- Add In Service date column
ALTER TABLE public.trucks 
ADD COLUMN IF NOT EXISTS in_service_date DATE;

-- Add Pre-Assigned Terminal column
ALTER TABLE public.trucks 
ADD COLUMN IF NOT EXISTS pre_assigned_terminal TEXT;

-- Update the status trigger to include In Service
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

-- Done!
SELECT 'Upgrade complete. New columns: in_service_date, pre_assigned_terminal' as result;
