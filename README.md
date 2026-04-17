# Toter Fleet Tracker v2 — Deployment Guide

Simple password-based access. No user accounts needed.

---

## Passwords

| Who | Password | Access |
|-----|----------|--------|
| Internal Staff | `Dreamhome26` | Everything — all trucks, trucks to sell, full edit |
| B&G Truck Conversions | `BigTrucks26` | B&G trucks only |
| Unique Fabrications Inc | `UniqueTrucks26` | Unique trucks only |
| Worldwide Equipment | `WorldwideTrucks26` | Worldwide trucks only |

To change a password, edit `src/lib/supabase.js` and redeploy.

---

## Stage Pipeline

```
Built at OEM → In Transit to Outfitter → Outfitting in Progress
→ Ready to Ship to Branding → In Transit to Branding → Branding in Progress
→ Ready to Ship to Rocky Top → Shipped to RT → Dealer Inspection → PDI Complete
```

---

## Step 1 — Supabase Setup

1. Log in at [supabase.com](https://supabase.com)
2. Open your project → **SQL Editor**
3. Paste and run `supabase_schema.sql`
4. Go to **Storage** → **New Bucket** → name it `truck-photos` → toggle **Public** ON → Save
5. In SQL Editor, run:
```sql
CREATE POLICY "Authenticated upload" ON storage.objects
FOR INSERT TO anon WITH CHECK (bucket_id = 'truck-photos');

CREATE POLICY "Public read" ON storage.objects
FOR SELECT USING (bucket_id = 'truck-photos');
```

---

## Step 2 — Import Existing Data

```bash
pip install pandas openpyxl supabase python-dotenv

# Create .env in this folder:
# SUPABASE_URL=https://YOUR_PROJECT.supabase.co
# SUPABASE_SERVICE_KEY=your_service_role_key

# Copy your Excel file here, then:
python import_trucks.py
```

> Use the **service_role** key (Supabase → Settings → API) for the import only.

---

## Step 3 — Deploy to Netlify

```bash
git init && git add . && git commit -m "init"
git remote add origin https://github.com/YOUR_ORG/toter-fleet-tracker.git
git push -u origin main
```

1. [netlify.com](https://netlify.com) → **Add new site → Import from Git**
2. Build command: `npm run build` | Publish directory: `build`
3. **Site Settings → Environment Variables** — add:
   - `REACT_APP_SUPABASE_URL` = your Supabase project URL
   - `REACT_APP_SUPABASE_ANON_KEY` = your anon/public key
4. **Deploys → Trigger deploy**

---

## Local Development

```bash
npm install
cp .env.example .env.local
# Fill in .env.local with your Supabase URL and anon key
npm start
```
