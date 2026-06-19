const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NOTIFY_EMAIL = "spcecwby@gmail.com";

function supabaseHeaders(anonKey) {
  return {
    apikey: anonKey,
    Authorization: `Bearer ${anonKey}`,
  };
}

async function notifyInbox(email) {
  try {
    const res = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(NOTIFY_EMAIL)}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        email,
        product: "PropParlay.ai",
        _subject: "PropParlay waitlist signup",
        _template: "table",
        _captcha: "false",
      }),
    });
    return res.ok;
  } catch (err) {
    console.error("inbox notify failed", err);
    return false;
  }
}

async function getWaitlistCount(env) {
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) return null;

  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/propparlay_waitlist_count`, {
    headers: supabaseHeaders(env.SUPABASE_ANON_KEY),
  });
  if (!res.ok) return null;
  const count = await res.json();
  return typeof count === "number" ? count : null;
}

async function insertWaitlistEmail(email, env) {
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
    return { ok: false, skipped: true };
  }

  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/propparlay_waitlist`, {
    method: "POST",
    headers: {
      ...supabaseHeaders(env.SUPABASE_ANON_KEY),
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({ email, source: "landing" }),
  });

  if (res.ok) return { ok: true, duplicate: false };

  const body = await res.text();
  if (res.status === 409 || body.includes("propparlay_waitlist_email_unique")) {
    return { ok: true, duplicate: true };
  }

  console.error("supabase insert failed", res.status, body);
  return { ok: false, error: body };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/waitlist/count" && request.method === "GET") {
      const count = await getWaitlistCount(env);
      return Response.json({ count: count ?? 0 });
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

      const inboxOk = await notifyInbox(email);
      const supabaseResult = await insertWaitlistEmail(email, env);

      if (supabaseResult.ok || inboxOk) {
        return Response.json({
          ok: true,
          duplicate: supabaseResult.duplicate ?? false,
        });
      }

      return Response.json(
        { error: "Could not save signup. Please try again." },
        { status: 503 },
      );
    }

    if (url.pathname.startsWith("/api/")) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }

    return env.ASSETS.fetch(request);
  },
};
