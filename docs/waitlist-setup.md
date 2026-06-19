# PropParlay waitlist — Lovable Cloud setup

FormSubmit does **not** work from Cloudflare Workers (blocked). Use one of these:

## Option A — KV (fastest, ~2 minutes)

1. Cloudflare → **Workers & Pages** → **propparlayai** → **Bindings**
2. **Add binding** → **KV namespace** → **Create new** → name: `propparlay-waitlist`
3. Variable name: `WAITLIST` → **Deploy**

View signups: **Storage & Databases** → **Workers KV** → `propparlay-waitlist` → keys like `email:user@example.com`

## Option B — Lovable Cloud table (view in Lovable UI)

1. Open [TunedTV Lovable project](https://lovable.dev/projects/4f9faf28-59e2-470d-bc80-dcaee350ca77)
2. Paste in chat:

```
Create a new database table propparlay_waitlist for the PropParlay.ai landing page (not TunedTV UI).
Columns: id uuid default gen_random_uuid(), email text unique not null, source text default 'landing', created_at timestamptz default now().
Enable RLS: allow anonymous INSERT only (no public SELECT on the table).
Add function propparlay_waitlist_count() security definer returning count for anonymous execute only.
Publish to production.
```

3. View rows in Lovable → **Cloud** → **Database** → `propparlay_waitlist`

## Option C — Email inbox (optional)

Add Resend API key as Worker secret `RESEND_API_KEY` for copies to spcecwby@gmail.com.
