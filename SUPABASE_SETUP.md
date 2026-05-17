# Supabase Setup (Track D1)

The app runs in **local-only mode** when Supabase env vars are empty (current
behavior). To enable multi-user / online SaaS mode, follow these steps once.

## 1. Create a Supabase project

1. Go to <https://supabase.com> → New project
2. Pick the closest region (Singapore is fine for Thailand)
3. Copy `Project URL` and `anon public` key from **Project Settings → API**

## 2. Configure the app

Edit `.env` (not committed) and fill:

```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=ey...
```

Restart `npm run dev`. The app will now show a sign-in screen instead of going
straight to the generator.

## 3. Apply the schema

Open **Supabase Studio → SQL Editor**. Paste the contents of
[`supabase/migrations/0001_initial.sql`](supabase/migrations/0001_initial.sql)
and run.

This creates:
- `profiles` (extends `auth.users`, holds tier + Stripe + BYOK keys)
- `orgs` + `org_members` (multi-tenant primitive)
- `brand_facts`, `customer_quotes` (1 row per user, JSONB documents)
- `saved_ads`, `strategy_briefs` (1 row per item)
- `usage_events` (for cost/latency dashboard, Track B.10)
- Row-Level Security on every data table (`owner + org member` policy)
- Trigger that auto-creates a `profiles` row on user signup

Re-running the SQL is safe — every statement uses `if not exists` /
`drop policy if exists` / `create or replace`.

## 4. Enable Auth providers

In **Authentication → Providers**:

- **Email** (magic-link is on by default) → set "Site URL" to your app
  origin (e.g. `http://localhost:5173` for dev, your prod URL for live)
- **Google** (optional) → follow Supabase's wizard for OAuth client ID
- **LINE** (optional, recommended for Thai market) → custom OAuth provider,
  set up at <https://developers.line.biz/console/> then plug into Supabase

For magic-link emails, set `Redirect URLs` to include your app origin so the
"open the email link" flow actually returns to the app.

## 5. Test the flow

1. Visit the app → sign-in screen appears
2. Enter your email → click "ส่งลิงก์เข้าระบบ" → check inbox
3. Click the magic link → app loads with your email shown in the header
4. Run `select * from public.profiles;` in Studio → your row should be there
   with `tier = 'free'`

## 6. (Once you have local data) Migrate to cloud

> Coming in Sprint 2 / D2 — `src/services/migration.ts` is already wired
> with `importLocalToCloud(userId)`. UI dialog will land alongside the
> tier switcher.

For now you can invoke it from the browser console after sign-in:

```js
import('/src/services/migration.ts').then(m => {
  // replace with your user id from `auth.users` table
  m.importLocalToCloud('<your-uuid>').then(console.log);
});
```

## Reverting to local-only

Just clear `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` and restart. Your
local-storage data is never touched by the migration — it's an additive copy.
