// Renders the Open Graph / Twitter Card share images (public/og/*.jpg), one
// per network variant declared in src/config/socialMeta.ts.
//
//   pnpm generate:og-images
//
// The images are committed, so this only needs to be re-run when the design
// below or the variant list changes. It drives the Chromium that Playwright
// already installs for the e2e tests (`pnpm exec playwright install chromium`)
// and loads the Inter font from Google Fonts, so it needs network access - it
// fails rather than silently rendering with a fallback font.
//
// JPEG, not PNG: the gradient background makes a lossless 1200x630 PNG weigh
// ~460 kB, above the ~300 kB at which some messengers (WhatsApp) drop the
// preview image; a high-quality JPEG is a quarter of that.

import { mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import {
  OG_IMAGE_HEIGHT,
  OG_IMAGE_WIDTH,
  allOgImageVariants,
  ogImageFileName,
  type OgImageVariant,
} from "../src/config/socialMeta";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = resolve(root, "public/og");

// Inline the brand mark; drop the XML-ish attributes that are meaningless
// once the <svg> is embedded in HTML.
const logoSvg = readFileSync(resolve(root, "src/assets/logo.svg"), "utf8")
  .replace(/<\?xml[^>]*\?>/, "")
  .replace(/\s(?:inkscape|sodipodi):[\w-]+="[^"]*"/g, "")
  .replace(/\sxmlns:(?:inkscape|sodipodi)="[^"]*"/g, "");

/** Inter weights the design uses: requested from Google Fonts and verified as loaded. */
const FONT_WEIGHTS = [400, 500, 600, 700, 800];

const features = [
  "Blocks",
  "Transactions",
  "DEX Trades",
  "Liquidity Pools",
  "Assets",
  "Swap",
];

/** Headline size range; long network names are shrunk until they fit one line. */
const HEADLINE_MAX_PX = 84;
const HEADLINE_MIN_PX = 48;

/** Small deterministic PRNG so the decorative chart is identical on every run. */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Decorative candlestick chart (upward-trending random walk). */
function candlesSvg(width: number, height: number): string {
  const rand = mulberry32(20261115);
  const count = 22;
  const step = width / count;
  const body = step * 0.56;

  const candles: { open: number; close: number; high: number; low: number }[] =
    [];
  let price = 100;
  for (let i = 0; i < count; i++) {
    const open = price;
    const close = open + (rand() - 0.4) * 9;
    const high = Math.max(open, close) + rand() * 4;
    const low = Math.min(open, close) - rand() * 4;
    candles.push({ open, close, high, low });
    price = close;
  }

  const max = Math.max(...candles.map((c) => c.high));
  const min = Math.min(...candles.map((c) => c.low));
  const pad = 10;
  const y = (v: number) => pad + ((max - v) / (max - min)) * (height - 2 * pad);

  const grid = [0.25, 0.5, 0.75]
    .map(
      (f) =>
        `<line x1="0" x2="${width}" y1="${height * f}" y2="${height * f}" stroke="#94a3b8" stroke-opacity="0.14" stroke-dasharray="3 6"/>`,
    )
    .join("");

  const marks = candles
    .map((c, i) => {
      const cx = i * step + step / 2;
      const up = c.close >= c.open;
      const color = up ? "#34d399" : "#f87171";
      const top = y(Math.max(c.open, c.close));
      const h = Math.max(2, Math.abs(y(c.open) - y(c.close)));
      return (
        `<line x1="${cx}" x2="${cx}" y1="${y(c.high)}" y2="${y(c.low)}" stroke="${color}" stroke-width="2" stroke-linecap="round"/>` +
        `<rect x="${cx - body / 2}" y="${top}" width="${body}" height="${h}" rx="2" fill="${color}"/>`
      );
    })
    .join("");

  return `<svg viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">${grid}${marks}</svg>`;
}

function html(variant: OgImageVariant): string {
  const chips = features.map((f) => `<span class="chip">${f}</span>`).join("");
  const rows = [
    { side: "Buy", cls: "up", amount: "12,480.00", ago: "4s" },
    { side: "Sell", cls: "down", amount: "3,150.25", ago: "11s" },
    { side: "Buy", cls: "up", amount: "48,900.00", ago: "19s" },
  ]
    .map(
      (r) => `
        <div class="row">
          <span class="side ${r.cls}">${r.side}</span>
          <span class="amount">${r.amount} ${variant.unit}</span>
          <span class="ago">${r.ago} ago</span>
        </div>`,
    )
    .join("");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@${FONT_WEIGHTS.join(";")}&display=swap" rel="stylesheet" />
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { width: ${OG_IMAGE_WIDTH}px; height: ${OG_IMAGE_HEIGHT}px; }
  body {
    font-family: Inter, "Segoe UI", system-ui, sans-serif;
    color: #f8fafc;
    background:
      radial-gradient(760px 520px at 88% 8%, rgba(37, 99, 235, 0.55), transparent 62%),
      radial-gradient(620px 460px at 4% 108%, rgba(14, 165, 233, 0.30), transparent 60%),
      linear-gradient(135deg, #0b1120 0%, #0f172a 55%, #172554 100%);
    overflow: hidden;
    position: relative;
  }
  /* Faint blueprint grid, fading out towards the text column. */
  .grid {
    position: absolute; inset: 0;
    background-image:
      linear-gradient(rgba(148, 163, 184, 0.09) 1px, transparent 1px),
      linear-gradient(90deg, rgba(148, 163, 184, 0.09) 1px, transparent 1px);
    background-size: 42px 42px;
    mask-image: linear-gradient(100deg, transparent 18%, #000 78%);
  }
  .layout {
    position: absolute; inset: 0;
    display: grid;
    grid-template-columns: minmax(0, 1fr) 440px;
    gap: 40px;
    padding: 56px 64px 52px;
  }
  .left { display: flex; flex-direction: column; min-width: 0; min-height: 0; }
  .brand { display: flex; align-items: center; gap: 18px; }
  .tile {
    width: 76px; height: 76px; border-radius: 20px; padding: 9px;
    background: linear-gradient(120deg, #ffffff 0%, #bfdbfe 100%);
    box-shadow: 0 12px 34px rgba(37, 99, 235, 0.55);
    display: flex; align-items: center; justify-content: center;
  }
  .tile svg { width: 100%; height: 100%; display: block; }
  .name { font-size: 38px; font-weight: 700; letter-spacing: -0.02em; color: #ffffff; }
  .headline {
    margin-top: 46px;
    font-weight: 800; letter-spacing: -0.035em; line-height: 1.04;
    font-size: ${HEADLINE_MAX_PX}px; /* shrunk to fit by main() */
    white-space: nowrap;
  }
  .headline .net {
    display: block;
    background: linear-gradient(90deg, #60a5fa 0%, #38bdf8 55%, #a5f3fc 100%);
    -webkit-background-clip: text; background-clip: text; color: transparent;
    padding-bottom: 6px;
  }
  .headline .what { display: block; color: #ffffff; }
  .sub {
    margin-top: 22px; max-width: 600px;
    font-size: 25px; line-height: 1.38; font-weight: 400; color: #cbd5e1;
  }
  .chips { margin-top: auto; padding-top: 16px; display: flex; flex-wrap: wrap; gap: 10px; max-width: 620px; }
  .chip {
    font-size: 19px; font-weight: 600; color: #dbeafe;
    padding: 8px 16px; border-radius: 999px;
    background: rgba(37, 99, 235, 0.22);
    border: 1px solid rgba(96, 165, 250, 0.45);
  }
  .right { display: flex; flex-direction: column; justify-content: center; min-width: 0; min-height: 0; }
  .card {
    border-radius: 24px; padding: 24px 24px 20px;
    background: linear-gradient(160deg, rgba(30, 41, 59, 0.92), rgba(15, 23, 42, 0.88));
    border: 1px solid rgba(148, 163, 184, 0.24);
    box-shadow: 0 30px 70px rgba(2, 6, 23, 0.65), inset 0 1px 0 rgba(255, 255, 255, 0.06);
  }
  .card-head { display: flex; align-items: center; justify-content: space-between; }
  .pair { font-size: 23px; font-weight: 700; color: #ffffff; white-space: nowrap; min-width: 0; }
  .live {
    display: flex; align-items: center; gap: 8px;
    font-size: 15px; font-weight: 700; letter-spacing: 0.08em; color: #34d399;
  }
  .live i { width: 9px; height: 9px; border-radius: 50%; background: #34d399; box-shadow: 0 0 12px #34d399; }
  .chart { margin-top: 16px; }
  .chart svg { display: block; }
  .rows { margin-top: 14px; border-top: 1px solid rgba(148, 163, 184, 0.2); }
  .row {
    display: grid; grid-template-columns: 62px minmax(0, 1fr) auto; align-items: center;
    padding: 10px 0; font-size: 18px;
    border-bottom: 1px solid rgba(148, 163, 184, 0.12);
  }
  .row:last-child { border-bottom: 0; padding-bottom: 0; }
  .side { font-weight: 700; }
  .up { color: #34d399; }
  .down { color: #f87171; }
  .amount { color: #e2e8f0; font-weight: 500; font-variant-numeric: tabular-nums; white-space: nowrap; min-width: 0; }
  .ago { color: #94a3b8; font-size: 16px; }
  .host {
    margin-top: 22px; text-align: right;
    font-size: 21px; font-weight: 600; color: #93c5fd; letter-spacing: 0.01em;
    white-space: nowrap;
  }
</style>
</head>
<body>
  <div class="grid"></div>
  <div class="layout">
    <div class="left">
      <div class="brand">
        <div class="tile">${logoSvg}</div>
        <div class="name">Biatec Scan</div>
      </div>
      <h1 class="headline">
        <span class="net">${variant.label}</span>
        <span class="what">DEX Explorer</span>
      </h1>
      <p class="sub">Real-time blocks, transactions, AMM trades, liquidity pools and asset prices.</p>
      <div class="chips">${chips}</div>
    </div>
    <div class="right">
      <div class="card">
        <div class="card-head">
          <span class="pair">${variant.unit} / USD</span>
          <span class="live"><i></i>LIVE</span>
        </div>
        <div class="chart">${candlesSvg(392, 190)}</div>
        <div class="rows">${rows}</div>
      </div>
      ${variant.host ? `<div class="host">${variant.host}</div>` : ""}
    </div>
  </div>
</body>
</html>`;
}

async function main(): Promise<void> {
  mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({
      viewport: { width: OG_IMAGE_WIDTH, height: OG_IMAGE_HEIGHT },
      deviceScaleFactor: 1,
    });
    for (const variant of allOgImageVariants) {
      await page.setContent(html(variant), { waitUntil: "networkidle" });

      // A committed image in the wrong font, or with a clipped headline, is
      // worse than a failed run - verify both before taking the screenshot.
      const problem = await page.evaluate(
        async ({ maxPx, minPx, weights }) => {
          await document.fonts.ready;
          // document.fonts holds only the @font-face rules of the Google Fonts
          // stylesheet (never a locally installed Inter), and a face is
          // "loaded" only once its file was fetched - so every weight the
          // design uses must be covered by a loaded web-font face.
          const loaded = [...document.fonts].filter(
            (face) => /inter/i.test(face.family) && face.status === "loaded",
          );
          const missing = weights.filter(
            (weight) =>
              !loaded.some((face) => {
                // "400" for a static face, "100 900" for a variable one.
                const [min, max = min] = face.weight.split(" ").map(Number);
                return min <= weight && weight <= max;
              }),
          );
          if (missing.length > 0) {
            return `the Inter web font did not load for weight(s) ${missing.join(", ")} (no network access to Google Fonts, or the design no longer uses that weight - then drop it from FONT_WEIGHTS)`;
          }
          // Shrink the headline until the network name fits on one line.
          const headline = document.querySelector<HTMLElement>(".headline");
          if (headline) {
            let size = maxPx;
            while (
              size > minPx &&
              headline.scrollWidth > headline.clientWidth
            ) {
              size -= 2;
              headline.style.fontSize = `${size}px`;
            }
          }

          // Every piece of variant-driven text is single-line (nowrap), so
          // text too long for its box shows up as horizontal overflow.
          for (const selector of [".headline", ".pair", ".amount", ".host"]) {
            for (const el of document.querySelectorAll(selector)) {
              if (el.scrollWidth > el.clientWidth) {
                return `"${el.textContent?.trim()}" (${selector}) overflows its box (${el.scrollWidth}px > ${el.clientWidth}px)`;
              }
            }
          }
          // Anything pushed out of a column or off the canvas (too many
          // chips, a subtitle running to a third line, ...) overflows it.
          for (const selector of ["html", ".layout", ".left", ".right"]) {
            const el = document.querySelector(selector);
            if (
              el &&
              (el.scrollHeight > el.clientHeight ||
                el.scrollWidth > el.clientWidth)
            ) {
              return `the content of ${selector} overflows it (${el.scrollWidth}x${el.scrollHeight}px in ${el.clientWidth}x${el.clientHeight}px)`;
            }
          }
          return null;
        },
        {
          maxPx: HEADLINE_MAX_PX,
          minPx: HEADLINE_MIN_PX,
          weights: FONT_WEIGHTS,
        },
      );
      if (problem) {
        throw new Error(`Cannot render "${variant.slug}": ${problem}`);
      }

      const path = resolve(outDir, ogImageFileName(variant));
      await page.screenshot({ path, type: "jpeg", quality: 90 });
      console.log(`wrote ${path}`);
    }
  } finally {
    await browser.close();
  }
}

await main();
