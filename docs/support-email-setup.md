# support@propparlay.ai setup

PropParlay uses **Cloudflare Email Routing** (free) on `propparlay.ai` — same Cloudflare account as the Worker.

## What’s already configured

1. **Email Routing enabled** on `propparlay.ai` (status: ready).
2. **MX / SPF / DKIM** records applied by Cloudflare for inbound mail.
3. **Routing rule:** `support@propparlay.ai` → forwards to `support@tunedtv.com`.
4. **Destination addresses pending verification:**
   - `support@tunedtv.com` (primary forward target)
   - `spcecwby@gmail.com` (added as backup — verify if you want to use it instead)

## What you need to do now (5 minutes)

### 1. Verify the forward destination

Check **both** inboxes (in case you want Gmail instead of tunedtv):

- `support@tunedtv.com`
- `spcecwby@gmail.com`

Open the email from **Cloudflare Email Routing** and click **Verify**. Until verified, forwards to that address will not work.

### 2. Test inbound mail

From any email account, send:

```
To: support@propparlay.ai
Subject: PropParlay support test
Body: test
```

It should arrive at `support@tunedtv.com` within a minute or two.

### 3. (Optional) Forward to Gmail instead

If you prefer Gmail as the inbox:

```bash
cd web
# After spcecwby@gmail.com is verified:
npx wrangler email routing rules list propparlay.ai
# Note the rule ID, then update or recreate with spcecwby@gmail.com
```

Or in Cloudflare Dashboard: **Email** → **Email Routing** → **propparlay.ai** → edit the **Support inbox** rule.

## Replying as support@propparlay.ai

Forwarding only handles **receiving**. To **send** replies that show `From: support@propparlay.ai`:

| Option | Cost | Notes |
|--------|------|--------|
| **Gmail “Send mail as”** | Free | After mail forwards to Gmail: Settings → Accounts → Send mail as → add `support@propparlay.ai`. You may need SMTP (Google Workspace or Cloudflare Email Sending). |
| **Google Workspace** | ~$6/mo | Full mailbox `support@propparlay.ai` — simplest if you want a real inbox. |
| **Cloudflare Email Sending** | Pay per email | Enable in Dashboard → Email Service → Sending. Our API token couldn’t enable it via CLI (permissions); use the Dashboard if you want Worker/Resend-style outbound from the domain. |

For App Store purposes, **receiving** at `support@propparlay.ai` is enough. Replying from your personal Gmail is fine for early support if you mention PropParlay in the signature.

## CLI reference

```bash
npx wrangler email routing settings propparlay.ai
npx wrangler email routing addresses list
npx wrangler email routing rules list propparlay.ai
```

## Dashboard

Cloudflare → select **propparlay.ai** → **Email** → **Email Routing**
