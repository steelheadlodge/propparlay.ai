const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Lovable Cloud (TunedTV project) — public anon key, safe in frontend/workers with RLS
const DEFAULT_SUPABASE_URL = "https://pbjxfitpjocaooxxafri.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBianhmaXRwam9jYW9veHhhZnJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxNTQ3MzQsImV4cCI6MjA5NDczMDczNH0.zUXgAqjWQM0x7VDGtwiVcHakceD9yjjHQgAjneavEOo";

function supabaseConfig(env) {
  return {
    url: env.SUPABASE_URL || DEFAULT_SUPABASE_URL,
    anonKey: env.SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY,
  };
}

function supabaseHeaders(anonKey) {
  return {
    apikey: anonKey,
    Authorization: `Bearer ${anonKey}`,
  };
}

async function saveToKv(email, env) {
  if (!env.WAITLIST) return { ok: false, skipped: true };

  const key = `email:${email}`;
  const existing = await env.WAITLIST.get(key);
  if (existing) return { ok: true, duplicate: true, store: "kv" };

  const record = JSON.stringify({
    email,
    created_at: new Date().toISOString(),
    source: "landing",
  });

  await env.WAITLIST.put(key, record);

  const countKey = "meta:count";
  const current = parseInt(await env.WAITLIST.get(countKey) || "0", 10);
  await env.WAITLIST.put(countKey, String(current + 1));

  return { ok: true, duplicate: false, store: "kv" };
}

async function getKvCount(env) {
  if (!env.WAITLIST) return null;
  const count = await env.WAITLIST.get("meta:count");
  return count ? parseInt(count, 10) : 0;
}

async function getSupabaseCount(env) {
  const { url, anonKey } = supabaseConfig(env);
  const res = await fetch(`${url}/rest/v1/rpc/propparlay_waitlist_count`, {
    headers: supabaseHeaders(anonKey),
  });
  if (!res.ok) return null;
  const count = await res.json();
  return typeof count === "number" ? count : null;
}

async function saveToSupabase(email, env) {
  const { url, anonKey } = supabaseConfig(env);
  const res = await fetch(`${url}/rest/v1/propparlay_waitlist`, {
    method: "POST",
    headers: {
      ...supabaseHeaders(anonKey),
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({ email, source: "landing" }),
  });

  if (res.ok) return { ok: true, duplicate: false, store: "supabase" };

  const body = await res.text();
  if (res.status === 409 || body.includes("propparlay_waitlist_email_unique")) {
    return { ok: true, duplicate: true, store: "supabase" };
  }

  console.error("supabase insert failed", res.status, body);
  return { ok: false, error: body, store: "supabase" };
}

async function notifyViaFormspree(email, env) {
  const formId = env.FORMSPREE_FORM_ID;
  if (!formId) return false;

  try {
    const res = await fetch(`https://formspree.io/f/${formId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        email,
        product: "PropParlay.ai",
        message: `Waitlist signup: ${email}`,
        _subject: "PropParlay waitlist signup",
      }),
    });
    if (!res.ok) {
      console.error("formspree failed", res.status, await res.text());
    }
    return res.ok;
  } catch (err) {
    console.error("formspree failed", err);
    return false;
  }
}

async function notifyViaResend(email, env) {
  if (!env.RESEND_API_KEY) return false;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "PropParlay <onboarding@resend.dev>",
        to: ["spcecwby@gmail.com"],
        subject: "PropParlay waitlist signup",
        html: `<p>New waitlist signup: <strong>${email}</strong></p>`,
      }),
    });
    return res.ok;
  } catch (err) {
    console.error("resend failed", err);
    return false;
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/waitlist/count" && request.method === "GET") {
      const supabaseCount = await getSupabaseCount(env);
      if (supabaseCount !== null) return Response.json({ count: supabaseCount });

      const kvCount = await getKvCount(env);
      return Response.json({ count: kvCount ?? 0 });
    }

    if (url.pathname === "/api/waitlist" && request.method === "POST") {
      let payload;
      try {
        payload = await request.json();
      } catch {
        return Response.json({ error: "Invalid JSON" }, { status: 400 });
      }

      const email = String(payload?.email || "")
        .toLowerCase()
        .trim();

      if (!email || !EMAIL_RE.test(email)) {
        return Response.json({ error: "Invalid email" }, { status: 400 });
      }

      const kvResult = await saveToKv(email, env);
      const supabaseResult = await saveToSupabase(email, env);
      const isDuplicate = kvResult.duplicate || supabaseResult.duplicate;

      let alreadyNotified = false;
      if (env.WAITLIST) {
        alreadyNotified = Boolean(await env.WAITLIST.get(`notified:${email}`));
      }

      // Send Formspree for new signups, or if we saved to KV before Formspree was wired
      const shouldNotify = !isDuplicate || !alreadyNotified;

      let formspreeOk = false;
      if (shouldNotify) {
        formspreeOk = await notifyViaFormspree(email, env);
        if (formspreeOk && env.WAITLIST) {
          await env.WAITLIST.put(`notified:${email}`, new Date().toISOString());
        }
        await notifyViaResend(email, env);
      }

      if (kvResult.ok || supabaseResult.ok || formspreeOk || isDuplicate) {
        return Response.json({
          ok: true,
          duplicate: isDuplicate || false,
        });
      }

      return Response.json(
        {
          error:
            "Waitlist storage is not configured yet. Add a KV binding or create the database table.",
        },
        { status: 503 },
      );
    }

    if (url.pathname.startsWith("/api/")) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }

    return env.ASSETS.fetch(request);
  },
};
