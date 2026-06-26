# support@propparlay.ai setup

PropParlay uses **Cloudflare Email Routing** (free) on `propparlay.ai` — same Cloudflare account as the Worker.

## What’s already configured

1. **Email Routing enabled** on `propparlay.ai` (status: ready).
2. **MX / SPF / DKIM** records applied by Cloudflare for inbound mail.
3. **Routing rules:**
   | Address | Forwards to |
   |---------|-------------|
   | `support@propparlay.ai` | `support@tunedtv.com` |
   | `hello@propparlay.ai` | `spcecwby@gmail.com` |
   | `social@propparlay.ai` | `spcecwby@gmail.com` |
4. **Verified destination addresses:** `support@tunedtv.com`, `spcecwby@gmail.com`

## Test inbound (do this once)

From any email account, send three quick tests:

```
To: support@propparlay.ai   → support@tunedtv.com
To: hello@propparlay.ai     → spcecwby@gmail.com
To: social@propparlay.ai    → spcecwby@gmail.com
```

Each should arrive within a minute or two.

---

## Outgoing email — step by step

You have **two jobs**: (A) reply to people manually from Gmail, and (B) automated emails from the app (waitlist confirmations, etc.). You can use one solution or both.

### Option A — Google Workspace (best for manual replies)

Full inbox at `@propparlay.ai`. Easiest if you want to read and reply like normal email.

1. Go to [workspace.google.com](https://workspace.google.com) → **Get started**.
2. Choose **Business Starter** (~$7/user/mo).
3. When asked for a domain, enter **`propparlay.ai`**.
4. Google gives you a **TXT verification record**. Add it in Cloudflare:
   - Dashboard → **propparlay.ai** → **DNS** → **Add record** → TXT → paste value → Save.
5. Wait a few minutes, click **Verify** in the Google setup wizard.
6. Create users (or aliases):
   - **`support@propparlay.ai`** — App Store support, privacy requests
   - **`hello@propparlay.ai`** — general contact
   - **`social@propparlay.ai`** — X / social signup
7. **Important:** After Workspace is live, update Cloudflare Email Routing:
   - Either **remove** the forward rules for addresses that now live in Workspace, **or**
   - Point forwards to the Workspace mailbox instead of Gmail/TunedTV (avoid duplicate delivery).
8. Send a test from each address to your personal Gmail. Check **From** shows `@propparlay.ai`.

**You do:** steps 1–8 in Google + Cloudflare DNS.  
**Result:** Send and receive as `support@`, `hello@`, `social@` from Gmail app or mail.google.com.

---

### Option B — Cloudflare Email Sending (best for automated app email)

Use this for **transactional** mail from the Worker (waitlist “you’re on the list”, signup alerts). Not a full inbox — you still read mail via Email Routing forwards.

1. Open Cloudflare Dashboard → **Compute & AI** → **Email Service** → **Email Sending**.
2. Click **Onboard domain** → select **`propparlay.ai`** → **Add records and onboard**.
3. Cloudflare adds **SPF + DKIM** DNS records automatically. Wait ~5–15 min for DNS.
4. Confirm status shows **Active** on the domain.
5. Send a test from the dashboard (or CLI once your API token has Email Sending permission):

   ```bash
   cd /Users/ai/propparlay
   npx wrangler email sending send propparlay.ai \
     --from "PropParlay <support@propparlay.ai>" \
     --to spcecwby@gmail.com \
     --subject "PropParlay outbound test" \
     --text "If you see this, Email Sending works."
   ```

6. Wire the Worker (optional — for waitlist confirmations):
   - Add to `wrangler.jsonc`: `"send_email": [{ "name": "EMAIL" }]`
   - Replace the Resend stub in `src/worker.js` with `env.EMAIL.send({ from: { email: "support@propparlay.ai", name: "PropParlay" }, ... })`
   - Redeploy: `npm run deploy`

**You do:** steps 1–5 in Dashboard (CLI send is optional).  
**Result:** The app can send branded `@propparlay.ai` email. You still reply manually from Gmail unless you also do Option A or C.

---

### Option C — Gmail “Send mail as” (free, fiddly)

Keep reading mail in **`spcecwby@gmail.com`** (hello@ / social@ forwards) but **send as** `support@propparlay.ai`.

**Requires Option B first** — Cloudflare Email Sending must be enabled so the domain can authenticate outbound mail.

1. Complete **Option B steps 1–4** (Email Sending onboarded on `propparlay.ai`).
2. In Gmail (spcecwby@gmail.com) → **Settings** (gear) → **See all settings** → **Accounts and Import**.
3. Under **Send mail as**, click **Add another email address**.
4. Name: `PropParlay` · Email: **`support@propparlay.ai`** → Next.
5. For SMTP, Cloudflare Email Sending is **API-only** (no Gmail SMTP host). This path usually **does not work** with free Gmail + Cloudflare alone.
6. **Practical workaround:** use **Google Workspace** (Option A) instead, or reply from Gmail and set **Reply-To: support@propparlay.ai** (recipients see your Gmail From — not ideal for brand).

**Recommendation:** Skip Option C. Use **Workspace** for human replies + **Cloudflare Email Sending** for automated messages.

## CLI reference

```bash
npx wrangler email routing settings propparlay.ai
npx wrangler email routing addresses list
npx wrangler email routing rules list propparlay.ai
```

## Dashboard

Cloudflare → select **propparlay.ai** → **Email** → **Email Routing**
