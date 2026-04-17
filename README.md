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

This step loads all your existing truck data from the Excel spreadsheet into Supabase. You only need to do this once.

### 2.1 — Install Python (if you don't have it)
Download and install Python from [python.org](https://python.org/downloads). During install, check the box that says **"Add Python to PATH"**.

### 2.2 — Install the required libraries
Open a terminal (on Windows: search for "Command Prompt"), navigate to the project folder, and run:
```
pip install pandas openpyxl supabase python-dotenv
```

### 2.3 — Get your Supabase service key
1. Go to your Supabase project
2. Click **Settings** (gear icon) in the left sidebar
3. Click **API**
4. Under **Project API keys**, copy the **service_role** key (click the eye icon to reveal it)

⚠️ This key has full database access — only use it for this import script, never share it publicly.

### 2.4 — Create a .env file
In the project folder, create a new file called exactly `.env` (no other extension) and paste this inside, filling in your values:
```
SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
SUPABASE_SERVICE_KEY=paste_your_service_role_key_here
```
Your Supabase URL can be found in Settings → API → Project URL.

### 2.5 — Copy your Excel file into the project folder
Place `Toter_Truck_Dashboard-Final.xlsm` in the same folder as `import_trucks.py`.

### 2.6 — Run the import
In your terminal, from the project folder, run:
```
python import_trucks.py
```

You should see something like:
```
Reading Toter_Truck_Dashboard-Final.xlsm...
Found 68 trucks (2 rows skipped)
✓ Imported 68 trucks
✓ Imported 14 trucks to sell
All done!
```

If it works, you're done with this step. You can delete the `.env` file afterward for security.

---

## Step 3 — Deploy to Netlify

This step puts the app on the internet so anyone with the password can use it. There are two parts: first getting the files onto GitHub, then connecting GitHub to Netlify.

---

### Part A — Upload the files to GitHub

GitHub is where your app's code lives. Netlify will pull from it to build the website.

**3.1 — Create a GitHub account** (if you don't have one)
Go to [github.com](https://github.com) and sign up for a free account.

**3.2 — Create a new repository**
1. Once logged in, click the **+** icon in the top right corner
2. Click **New repository**
3. Name it `toter-fleet-tracker`
4. Leave everything else as default
5. Click **Create repository**

**3.3 — Upload the project files**
1. On the repository page you just created, click **uploading an existing file** (it's a link in the middle of the page)
2. Unzip the `toter-fleet-tracker-v2.zip` file on your computer first
3. Open the unzipped folder called `toter-v2`
4. Select ALL the files and folders inside it and drag them into the GitHub upload area
5. Scroll down and click **Commit changes**

Your code is now on GitHub.

---

### Part B — Connect GitHub to Netlify

**3.4 — Log in to Netlify**
Go to [netlify.com](https://netlify.com) and log in to your account.

**3.5 — Create a new site**
1. Click **Add new site**
2. Click **Import an existing project**
3. Click **GitHub**
4. Authorize Netlify to access your GitHub if prompted
5. Find and click on **toter-fleet-tracker** in the list

**3.6 — Configure the build settings**
Netlify will show you a settings screen. Fill in:
- **Build command:** `npm run build`
- **Publish directory:** `build`

Everything else can stay as default.

**3.7 — Add your Supabase credentials**
Before clicking deploy, you need to tell Netlify how to connect to your database:
1. Click **Show advanced** (below the build settings)
2. Click **New variable** and add these two, one at a time:

| Key | Where to find the value |
|-----|------------------------|
| `REACT_APP_SUPABASE_URL` | Supabase → Settings → API → Project URL |
| `REACT_APP_SUPABASE_ANON_KEY` | Supabase → Settings → API → anon/public key |

**3.8 — Deploy**
Click **Deploy site**. Netlify will take about 2-3 minutes to build and publish the app.

When it's done you'll see a green **Published** status and a link like `https://random-name-123.netlify.app`. That's your live app! You can rename it to something friendlier in **Site Settings → Site name**.

**3.9 — Test it**
Open the link, enter the password `Dreamhome26` and confirm everything works.

---

## Local Development

```bash
npm install
cp .env.example .env.local
# Fill in .env.local with your Supabase URL and anon key
npm start
```
