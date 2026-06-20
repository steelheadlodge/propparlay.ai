import { getGames } from "./espn.js";
import { getGameOdds, getPlayerProps, getOddsQuota, SPORT_KEYS } from "./odds.js";
import { buildSlate } from "./slate.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Edge-cached JSON via the Cloudflare Cache API. Falls back to producing fresh
// data on a cache miss and stores it with the given TTL.
async function cachedJson(cacheKey, ttlSeconds, producer) {
  const cache = caches.default;
  const req = new Request(`https://cache.propparlay.ai/${cacheKey}`);
  const hit = await cache.match(req);
  if (hit) return await hit.json();

  const data = await producer();
  const res = new Response(JSON.stringify(data), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": `max-age=${ttlSeconds}`,
    },
  });
  await cache.put(req, res.clone());
  return data;
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=30",
    },
  });
}

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

      // Formspree runs in the browser (see public/index.html) — server posts go to spam.
      await notifyViaResend(email, env);

      if (kvResult.ok || supabaseResult.ok || isDuplicate) {
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

    // Live games from ESPN (no API key needed), edge-cached 60s.
    if (url.pathname === "/api/games" && request.method === "GET") {
      try {
        const data = await cachedJson("games:v1", 60, () => getGames());
        return jsonResponse(data);
      } catch (err) {
        console.error("games failed", err);
        return jsonResponse({ games: [], error: "ESPN unavailable" }, 502);
      }
    }

    // Game-level odds from The Odds API (key-gated), edge-cached 120s.
    if (url.pathname === "/api/odds" && request.method === "GET") {
      try {
        const data = await cachedJson("odds:games:v1", 120, () =>
          getGameOdds(env),
        );
        return jsonResponse({ ...data, quota: getOddsQuota() });
      } catch (err) {
        console.error("odds failed", err);
        return jsonResponse({ configured: true, events: [], error: "Odds unavailable" }, 502);
      }
    }

    // Live prop slate (cards) from The Odds API, edge-cached 15 min to protect
    // the request quota. Falls back to { configured: false } without a key.
    if (url.pathname === "/api/slate" && request.method === "GET") {
      try {
        const data = await cachedJson("slate:v1", 900, () => buildSlate(env));
        return jsonResponse(data);
      } catch (err) {
        console.error("slate failed", err);
        return jsonResponse({ configured: true, props: [], error: "Slate unavailable" }, 502);
      }
    }

    // Player props for one event (on demand). /api/props?sport=baseball_mlb&eventId=...
    if (url.pathname === "/api/props" && request.method === "GET") {
      const sport = url.searchParams.get("sport") || "";
      const eventId = url.searchParams.get("eventId") || "";
      if (!Object.values(SPORT_KEYS).includes(sport) || !eventId) {
        return jsonResponse({ error: "Invalid sport or eventId" }, 400);
      }
      try {
        const data = await cachedJson(
          `props:${sport}:${eventId}:v1`,
          120,
          () => getPlayerProps(env, sport, eventId),
        );
        return jsonResponse(data);
      } catch (err) {
        console.error("props failed", err);
        return jsonResponse({ configured: true, props: [], error: "Props unavailable" }, 502);
      }
    }

    if (url.pathname.startsWith("/api/")) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }

    // SPA fallback for React app at /app/*
    if (url.pathname.startsWith("/app")) {
      let response = await env.ASSETS.fetch(request);
      if (response.status === 404) {
        const indexUrl = new URL(request.url);
        indexUrl.pathname = "/app/index.html";
        response = await env.ASSETS.fetch(new Request(indexUrl, request));
      }
      return response;
    }

    const response = await env.ASSETS.fetch(request);
    const path = url.pathname;
    if (path === "/" || path === "/index.html") {
      const headers = new Headers(response.headers);
      headers.set("Cache-Control", "no-cache, must-revalidate");
      return new Response(response.body, { status: response.status, headers });
    }

    return response;
  },
};
