# PropParlay.ai

AI-Powered Prop Betting Intelligence - Landing Page

## Deploy to Cloudflare Pages

### Option 1: Direct Upload (Fastest)
1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com) → Pages
2. Click "Create a project" → "Direct Upload"
3. Upload the `index.html` file
4. Set custom domain to `propparlay.ai`

### Option 2: Git Integration
1. Push this repo to GitHub
2. Connect to Cloudflare Pages
3. Build settings: None needed (static HTML)
4. Deploy

## Connect Custom Domain

1. In Cloudflare Pages, go to your project → Custom domains
2. Add `propparlay.ai`
3. Since your domain is already on Cloudflare, DNS will auto-configure

## Add Real Waitlist Backend (Optional)

Replace the form handler in `index.html` with one of these:

### Cloudflare Workers + KV
```javascript
// See /workers/waitlist.js for implementation
```

### Supabase
```javascript
const { createClient } = await import('https://esm.sh/@supabase/supabase-js');
const supabase = createClient('YOUR_URL', 'YOUR_KEY');
await supabase.from('waitlist').insert({ email });
```

### Formspree (No-code)
```html
<form action="https://formspree.io/f/YOUR_ID" method="POST">
```

## Waitlist emails

**Default (works now):** each signup emails **spcecwby@gmail.com** via FormSubmit.

- First signup triggers a **one-time activation email** from FormSubmit — click the link to confirm.
- After that, every signup lands in your inbox.

**Optional database (your own Supabase, not Lovable):** create a free project at [supabase.com](https://supabase.com), run `supabase/waitlist.sql`, then add Cloudflare Worker secrets:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

Lovable Cloud (TunedTV) is **not** in your personal Supabase account — PropParlay uses its own backend path.

## Tech Stack
- Pure HTML/CSS/JS in `public/` (no build step)
- Google Fonts (Inter)
- Responsive design
- Animated background effects
