const SUPABASE_URL = "https://pbjxfitpjocaooxxafri.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBianhmaXRwam9jYW9veHhhZnJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxNTQ3MzQsImV4cCI6MjA5NDczMDczNH0.zUXgAqjWQM0x7VDGtwiVcHakceD9yjjHQgAjneavEOo";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function supabaseHeaders() {
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  };
}

async function getWaitlistCount() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/propparlay_waitlist_count`, {
    headers: supabaseHeaders(),
  });
  if (!res.ok) return 0;
  const count = await res.json();
  return typeof count === "number" ? count : 0;
}

async function insertWaitlistEmail(email) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/propparlay_waitlist`, {
    method: "POST",
    headers: {
      ...supabaseHeaders(),
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

  console.error("waitlist insert failed", res.status, body);
  return { ok: false, error: body };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/waitlist/count" && request.method === "GET") {
      const count = await getWaitlistCount();
      return Response.json({ count });
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

      const result = await insertWaitlistEmail(email);
      if (!result.ok) {
        return Response.json(
          { error: "Waitlist is not ready yet. Try again shortly." },
          { status: 503 },
        );
      }

      return Response.json({ ok: true, duplicate: result.duplicate });
    }

    if (url.pathname.startsWith("/api/")) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }

    return env.ASSETS.fetch(request);
  },
};
