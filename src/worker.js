import { getGames } from "./espn.js";
import { getGameOdds, getPlayerProps, getOddsQuota, SPORT_KEYS } from "./odds.js";
import { buildSlate } from "./slate.js";
import { getFutures } from "./futures.js";
import {
  decodeParlay,
  combinedAmerican,
  formatAmerican,
  logoUrl,
  escapeHtml,
} from "./share.js";

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

function shareLanding(url) {
  const p = url.searchParams.get("p") || "";
  const legs = decodeParlay(p);
  const appUrl = legs ? `/app/?p=${encodeURIComponent(p)}` : "/app/";

  if (!legs) {
    return Response.redirect(`${url.origin}/app/`, 302);
  }

  const { american } = combinedAmerican(legs);
  const decimal = legs.reduce(
    (acc, l) => acc * (l.price > 0 ? 1 + l.price / 100 : 1 + 100 / Math.abs(l.price)),
    1,
  );
  const payout = Math.round(10 * decimal);
  const names = legs.map((l) => l.name).join(" + ");
  const title = `${names} — ${formatAmerican(american)}`;
  const desc = `${legs.length}-leg futures parlay · $10 returns $${payout} · built on PropParlay.ai, the future of parlays.`;
  const ogImg = `${url.origin}/og.svg?p=${encodeURIComponent(p)}`;

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)} · PropParlay.ai</title>
<meta name="description" content="${escapeHtml(desc)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="PropParlay.ai">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(desc)}">
<meta property="og:image" content="${escapeHtml(ogImg)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(title)}">
<meta name="twitter:description" content="${escapeHtml(desc)}">
<meta name="twitter:image" content="${escapeHtml(ogImg)}">
<link rel="canonical" href="${escapeHtml(url.origin + appUrl)}">
<style>
  html,body{margin:0;height:100%;background:#0a0f1f;color:#e2e8f0;font-family:Inter,system-ui,sans-serif}
  .wrap{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100%;gap:1rem;text-align:center;padding:1.5rem}
  .brand{font-weight:800;font-size:1.4rem;color:#a5b4fc}
  .brand span{color:#e2e8f0}
  .t{font-weight:700;font-size:1.1rem;max-width:32rem}
  .odds{font-weight:800;font-size:2rem;color:#34d399}
  a.cta{margin-top:.5rem;padding:.7rem 1.4rem;border-radius:10px;font-weight:700;color:#0a0f1f;background:linear-gradient(135deg,#818cf8,#34d399);text-decoration:none}
</style>
</head>
<body>
<div class="wrap">
  <div class="brand">PropParlay<span>.ai</span></div>
  <div class="t">${escapeHtml(names)}</div>
  <div class="odds">${escapeHtml(formatAmerican(american))}</div>
  <div style="color:#94a3b8">$10 returns $${payout}</div>
  <a class="cta" href="${escapeHtml(appUrl)}">Open this parlay →</a>
</div>
<script>setTimeout(function(){location.replace(${JSON.stringify(appUrl)})},1200);</script>
</body>
</html>`;

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=600",
    },
  });
}

function shareImage(url) {
  const p = url.searchParams.get("p") || "";
  const legs = decodeParlay(p);
  if (!legs) {
    return new Response("not found", { status: 404 });
  }

  const decimal = legs.reduce(
    (acc, l) => acc * (l.price > 0 ? 1 + l.price / 100 : 1 + 100 / Math.abs(l.price)),
    1,
  );
  const payout = Math.round(10 * decimal);
  const { american } = combinedAmerican(legs);

  const maxRows = 4;
  const shown = legs.slice(0, maxRows);
  const rows = shown
    .map((l, i) => {
      const y = 168 + i * 88;
      const logo = logoUrl(l.league, l.abbr);
      const badge = logo
        ? `<image href="${escapeHtml(logo)}" x="92" y="${y + 8}" width="48" height="48" preserveAspectRatio="xMidYMid meet"/>`
        : `<circle cx="116" cy="${y + 32}" r="24" fill="#6366f1"/><text x="116" y="${y + 39}" text-anchor="middle" font-size="18" font-weight="800" fill="#fff">${escapeHtml((l.abbr || l.name).slice(0, 3).toUpperCase())}</text>`;
      return `
        <rect x="64" y="${y}" width="1072" height="64" rx="14" fill="rgba(255,255,255,0.05)"/>
        ${badge}
        <text x="160" y="${y + 32}" font-size="30" font-weight="700" fill="#f1f5f9">${escapeHtml(l.name)}</text>
        <text x="160" y="${y + 56}" font-size="18" fill="#94a3b8">${escapeHtml(`${l.league} · ${l.marketTitle}`)}</text>
        <text x="1112" y="${y + 44}" text-anchor="end" font-size="30" font-weight="800" fill="#a5b4fc">${escapeHtml(formatAmerican(l.price))}</text>`;
    })
    .join("");

  const more =
    legs.length > maxRows
      ? `<text x="84" y="${168 + maxRows * 88 + 20}" font-size="20" font-weight="600" fill="#94a3b8">+ ${legs.length - maxRows} more leg${legs.length - maxRows > 1 ? "s" : ""}</text>`
      : "";

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" font-family="Inter, system-ui, sans-serif">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0a0f1f"/><stop offset="1" stop-color="#131c33"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#6366f1"/><stop offset="1" stop-color="#34d399"/>
    </linearGradient>
    <linearGradient id="foot" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="rgba(99,102,241,0.18)"/><stop offset="1" stop-color="rgba(16,185,129,0.18)"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect width="1200" height="8" fill="url(#accent)"/>
  <text x="64" y="86" font-size="44" font-weight="800" fill="#a5b4fc">PropParlay<tspan fill="#e2e8f0">.ai</tspan></text>
  <text x="66" y="116" font-size="18" font-weight="700" fill="#64748b">THE FUTURE OF PARLAYS</text>
  ${rows}
  ${more}
  <rect x="64" y="512" width="1072" height="86" rx="16" fill="url(#foot)"/>
  <text x="92" y="546" font-size="18" font-weight="600" fill="#94a3b8">PARLAY ODDS</text>
  <text x="92" y="586" font-size="46" font-weight="800" fill="#34d399">${escapeHtml(formatAmerican(american))}</text>
  <text x="1108" y="546" text-anchor="end" font-size="18" font-weight="600" fill="#94a3b8">$10 returns</text>
  <text x="1108" y="586" text-anchor="end" font-size="46" font-weight="800" fill="#f1f5f9">$${payout}</text>
</svg>`;

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
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
        const data = await cachedJson("slate:v3", 900, () => buildSlate(env));
        return jsonResponse(data);
      } catch (err) {
        console.error("slate failed", err);
        return jsonResponse({ configured: true, props: [], error: "Slate unavailable" }, 502);
      }
    }

    // Futures board (championship / conference / division / win-total / award
    // markets), edge-cached 12h — futures move slowly and this protects quota.
    if (url.pathname === "/api/futures" && request.method === "GET") {
      try {
        const data = await cachedJson("futures:v2", 12 * 60 * 60, () =>
          getFutures(env),
        );
        return jsonResponse(data);
      } catch (err) {
        console.error("futures failed", err);
        return jsonResponse({ configured: true, markets: [], error: "Futures unavailable" }, 502);
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

    // Shareable parlay link: rich OG unfurl for crawlers, redirect for humans.
    if (url.pathname === "/s") {
      return shareLanding(url);
    }

    // Dynamically rendered OG image (SVG) for a shared parlay.
    if (url.pathname === "/og.svg") {
      return shareImage(url);
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
