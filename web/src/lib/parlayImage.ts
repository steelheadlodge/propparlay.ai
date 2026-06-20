import type { FuturesLeg } from "../context/FuturesParlayContext";
import { formatAmerican, formatCurrency } from "./odds";
import { teamColor } from "./theme";

const W = 1200;
const H = 630;

function rr(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Render a branded parlay card to a PNG blob for sharing.
export async function buildParlayImage(
  legs: FuturesLeg[],
  american: number,
  payout: number,
  stake: number,
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // Background
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#0a0f1f");
  bg.addColorStop(1, "#131c33");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Top accent bar
  const accent = ctx.createLinearGradient(0, 0, W, 0);
  accent.addColorStop(0, "#6366f1");
  accent.addColorStop(1, "#34d399");
  ctx.fillStyle = accent;
  ctx.fillRect(0, 0, W, 8);

  // Brand
  ctx.textBaseline = "alphabetic";
  ctx.font = "800 44px Inter, system-ui, sans-serif";
  ctx.fillStyle = "#a5b4fc";
  ctx.fillText("PropParlay", 64, 86);
  const pw = ctx.measureText("PropParlay").width;
  ctx.fillStyle = "#e2e8f0";
  ctx.fillText(".ai", 64 + pw, 86);
  ctx.font = "700 18px Inter, system-ui, sans-serif";
  ctx.fillStyle = "#64748b";
  ctx.fillText("THE FUTURE OF PARLAYS", 66, 116);

  // Legs
  const startY = 168;
  const rowH = 78;
  const maxRows = 4;
  const shown = legs.slice(0, maxRows);
  shown.forEach((l, i) => {
    const y = startY + i * rowH;
    rr(ctx, 64, y, W - 128, rowH - 14, 14);
    ctx.fillStyle = "rgba(255,255,255,0.04)";
    ctx.fill();

    // team color chip
    ctx.fillStyle = teamColor(l.abbr ?? l.name);
    rr(ctx, 84, y + 14, 36, 36, 9);
    ctx.fill();
    ctx.font = "800 16px Inter, system-ui, sans-serif";
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.fillText((l.abbr ?? l.name).slice(0, 3).toUpperCase(), 102, y + 38);
    ctx.textAlign = "left";

    ctx.font = "700 30px Inter, system-ui, sans-serif";
    ctx.fillStyle = "#f1f5f9";
    ctx.fillText(l.name, 140, y + 30);
    ctx.font = "500 18px Inter, system-ui, sans-serif";
    ctx.fillStyle = "#94a3b8";
    ctx.fillText(`${l.league} · ${l.marketTitle}`, 140, y + 54);

    ctx.font = "800 30px Inter, system-ui, sans-serif";
    ctx.fillStyle = "#a5b4fc";
    ctx.textAlign = "right";
    ctx.fillText(formatAmerican(l.price), W - 96, y + 42);
    ctx.textAlign = "left";
  });

  if (legs.length > maxRows) {
    ctx.font = "600 20px Inter, system-ui, sans-serif";
    ctx.fillStyle = "#94a3b8";
    ctx.fillText(
      `+ ${legs.length - maxRows} more leg${legs.length - maxRows > 1 ? "s" : ""}`,
      84,
      startY + maxRows * rowH + 18,
    );
  }

  // Footer payout band
  const fy = H - 118;
  rr(ctx, 64, fy, W - 128, 86, 16);
  const fg = ctx.createLinearGradient(64, 0, W - 64, 0);
  fg.addColorStop(0, "rgba(99,102,241,0.18)");
  fg.addColorStop(1, "rgba(16,185,129,0.18)");
  ctx.fillStyle = fg;
  ctx.fill();

  ctx.font = "600 18px Inter, system-ui, sans-serif";
  ctx.fillStyle = "#94a3b8";
  ctx.fillText("PARLAY ODDS", 92, fy + 34);
  ctx.font = "800 46px Inter, system-ui, sans-serif";
  ctx.fillStyle = "#34d399";
  ctx.fillText(formatAmerican(american), 92, fy + 74);

  ctx.textAlign = "right";
  ctx.font = "600 18px Inter, system-ui, sans-serif";
  ctx.fillStyle = "#94a3b8";
  ctx.fillText(`${formatCurrency(stake)} returns`, W - 96, fy + 34);
  ctx.font = "800 46px Inter, system-ui, sans-serif";
  ctx.fillStyle = "#f1f5f9";
  ctx.fillText(formatCurrency(payout), W - 96, fy + 74);
  ctx.textAlign = "left";

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("toBlob failed"))),
      "image/png",
    );
  });
}
