"""
import_trucks.py - Import existing spreadsheet into Supabase v2

Usage:
  pip install pandas openpyxl supabase python-dotenv
  python import_trucks.py

.env file needs:
  SUPABASE_URL=https://YOUR_PROJECT.supabase.co
  SUPABASE_SERVICE_KEY=your_service_role_key
"""

import os
import pandas as pd
from datetime import datetime, date
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_KEY"]
EXCEL_FILE = "Toter_Truck_Dashboard-Final.xlsm"

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
EXCEL_BASE = datetime(1899, 12, 30)

def excel_date(val):
    if pd.isna(val) or val == "" or val is None:
        return None
    if isinstance(val, (datetime, date)):
        return val.strftime("%Y-%m-%d")
    if isinstance(val, str):
        val = val.strip()
        if not val:
            return None
        for fmt in ("%m/%d/%y", "%m/%d/%Y", "%Y-%m-%d"):
            try:
                return datetime.strptime(val, fmt).strftime("%Y-%m-%d")
            except ValueError:
                continue
        return None
    if isinstance(val, (int, float)):
        try:
            n = int(val)
            if 40000 < n < 50000:
                return (EXCEL_BASE + pd.Timedelta(days=n)).strftime("%Y-%m-%d")
        except Exception:
            pass
    return None

def compute_status(row):
    if excel_date(row.get("PDI_Complete_Date")): return "PDI Complete"
    if excel_date(row.get("Shipped_to_RT_Date")): return "Shipped to RT"
    if excel_date(row.get("Ready_to_Ship_to_Rocky_Top_Date")): return "Ready to Ship to Rocky Top"
    if excel_date(row.get("Branding Comp_Date")): return "Branding in Progress"
    if excel_date(row.get("In_Transit_to_Branding_Date")): return "In Transit to Branding"
    if excel_date(row.get("Ready_to_Ship_to_Branding_Date")): return "Ready to Ship to Branding"
    if excel_date(row.get("Outfitting  In Progress")): return "Outfitting in Progress"
    if excel_date(row.get("In_Transit_to_Outfitter_Date")): return "In Transit to Outfitter"
    return "Built at OEM"

def get_outfitter(row):
    col = str(row.get("Outfitter Location ", "")).strip()
    if col:
        if "unique" in col.lower(): return "Unique Fabrications Inc"
        if "b & g" in col.lower() or "b&g" in col.lower(): return "B&G Truck Conversions"
        if "worldwide" in col.lower(): return "Worldwide Equipment"
        return col
    ship = str(row.get("Ship_To", "")).lower()
    if "unique" in ship: return "Unique Fabrications Inc"
    if "b & g" in ship or "b&g" in ship: return "B&G Truck Conversions"
    if "worldwide" in ship: return "Worldwide Equipment"
    return None

def main():
    print(f"Reading {EXCEL_FILE}...")
    df = pd.read_excel(EXCEL_FILE, sheet_name="New Truck Tracker", dtype=str).fillna("")

    trucks = []
    skipped = 0
    for _, row in df.iterrows():
        unit = str(row.get("Unit", "")).strip()
        vin = str(row.get("VIN", "")).strip()
        if not unit or not vin or unit == "Unit" or len(vin) < 10:
            skipped += 1
            continue

        trucks.append({
            "unit": unit,
            "vin": vin,
            "order_number": str(row.get("Order #", "")).strip() or None,
            "model": str(row.get("Model", "")).strip() or None,
            "bus_unit": str(row.get("Bus Unit", "")).strip() or None,
            "ship_to": str(row.get("Ship_To", "")).strip() or None,
            "invoice": str(row.get("Invoice", "")).strip() or None,
            "outfitter_name": get_outfitter(row),
            "built_at_oem_date": excel_date(row.get("Built_at_OEM_Date")),
            "in_transit_to_outfitter_date": excel_date(row.get("In_Transit_to_Outfitter_Date")),
            "outfitting_in_progress_date": excel_date(row.get("Outfitting  In Progress")),
            "ready_to_ship_to_branding_date": excel_date(row.get("Ready_to_Ship_to_Branding_Date")),
            "in_transit_to_branding_date": excel_date(row.get("In_Transit_to_Branding_Date")),
            "branding_complete_date": excel_date(row.get("Branding Comp_Date")),
            "ready_to_ship_to_rocky_top_date": excel_date(row.get("Ready_to_Ship_to_Rocky_Top_Date")),
            "shipped_to_rt_date": excel_date(row.get("Shipped_to_RT_Date")),
            "dealer_inspection_date": None,  # new stage - no existing data
            "pdi_complete_date": excel_date(row.get("PDI_Complete_Date")),
            "notes": str(row.get("Notes", "")).strip() or None,
            "current_status": compute_status(row),
        })

    print(f"Found {len(trucks)} trucks ({skipped} rows skipped)")
    imported = 0
    for i in range(0, len(trucks), 50):
        batch = trucks[i:i+50]
        result = supabase.table("trucks").upsert(batch, on_conflict="vin").execute()
        if hasattr(result, 'data') and result.data:
            imported += len(result.data)

    print(f"✓ Imported {imported} trucks")

    # Trucks to sell
    print("\nImporting trucks to sell...")
    df2 = pd.read_excel(EXCEL_FILE, sheet_name="Trucks to Sell", dtype=str).fillna("")
    sell = []
    for _, row in df2.iterrows():
        vin = str(row.get("VIN #", "")).strip()
        if not vin or len(vin) < 10: continue
        try: mileage = int(float(str(row.get("Mileage", "")).strip()))
        except: mileage = None
        try: year = int(str(row.get("Year", "")).strip())
        except: year = None
        sell.append({
            "terminal": str(row.get("Terminal", "")).strip() or None,
            "year": year,
            "truck_number": str(row.get("Truck Number", "")).strip() or None,
            "make": str(row.get("Make", "")).strip() or None,
            "model": str(row.get("Model", "")).strip() or None,
            "vin": vin,
            "mileage": mileage,
            "general_notes": str(row.get("General Notes", "")).strip() or None,
            "decommissioned": str(row.get("Decomissioned Yes or No", "")).strip().lower() == "yes",
            "unwrapped": str(row.get("UnWrapped Yes or No", "")).strip().lower() == "yes",
            "pictures_taken": str(row.get("Pictures ", "")).strip().lower() not in ("", "need", "no"),
        })

    if sell:
        supabase.table("trucks_to_sell").upsert(sell, on_conflict="vin").execute()
        print(f"✓ Imported {len(sell)} trucks to sell")

    print("\nAll done!")

if __name__ == "__main__":
    main()
