# Waitlist — where signups go

## Storage (working now)

**Cloudflare KV** → `propparlay-waitlist` → **KV Pairs** tab

You already see `email:...` keys there. That is the backup record.

## Inbox email (Formspree — same as Doortronix)

FormSubmit does **not** work from Cloudflare Workers. **Formspree does.**

### Setup (~3 minutes)

1. [formspree.io](https://formspree.io) → **+ Add New** → new form: **PropParlay Waitlist**
2. Open the form — copy the ID from the URL: `formspree.io/forms/**mbdbndbe**` → ID is `mbdbndbe`
3. Cloudflare → **Workers & Pages** → **propparlayai** → **Settings** → **Variables and Secrets**
4. **Add** → Type: **Text** (not secret required)
   - Name: `FORMSPREE_FORM_ID`
   - Value: your form ID (e.g. `mbdbndbe`)
5. **Deploy** / save (redeploy Worker if prompted)

New signups will:
- Save to KV (as now)
- Email you via Formspree (like Doortronix forms)
- Show in Formspree dashboard under that form

Duplicate signups only update KV (no repeat emails).
