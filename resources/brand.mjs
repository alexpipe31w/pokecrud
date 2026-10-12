// Icono y splash PROVISIONALES de PokéCRUD GO (F0-09): pin de mapa con forma de ball, arte propio (no oficial).
// Colores = tokens de docs/plan/DISENO.md. Regenerar los PNG:  node resources/brand.mjs
// (luego `npx @capacitor/assets generate --android`). Usa Chrome headless por CDP para rasterizar el SVG.
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const C = {
  ink: '#0f1a2b',
  ink2: '#33415c',
  paper: '#fbf7ee',
  paper2: '#efe8d8',
  accent: '#ff4d4d',
  gold: '#ffcb3d',
};

/** Pin-ball en un lienzo de 1024: cabeza r=300 centrada en (512,430), punta en (512,930). */
const pin = (id) => `
  <defs>
    <clipPath id="${id}-clip"><path d="M272 610 A300 300 0 1 1 752 610 L512 930 Z"/></clipPath>
    <linearGradient id="${id}-red" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ff6b6b"/><stop offset="1" stop-color="${C.accent}"/>
    </linearGradient>
    <linearGradient id="${id}-cream" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${C.paper}"/><stop offset="1" stop-color="${C.paper2}"/>
    </linearGradient>
  </defs>
  <ellipse cx="512" cy="944" rx="150" ry="28" fill="#000" opacity=".28"/>
  <g clip-path="url(#${id}-clip)">
    <rect x="0" y="0" width="1024" height="430" fill="url(#${id}-red)"/>
    <rect x="0" y="430" width="1024" height="600" fill="url(#${id}-cream)"/>
    <rect x="0" y="406" width="1024" height="48" fill="${C.ink}"/>
    <ellipse cx="400" cy="250" rx="120" ry="70" fill="#fff" opacity=".22" transform="rotate(-28 400 250)"/>
  </g>
  <path d="M272 610 A300 300 0 1 1 752 610 L512 930 Z" fill="none" stroke="${C.ink}" stroke-width="22" stroke-linejoin="round"/>
  <circle cx="512" cy="430" r="104" fill="${C.ink}"/>
  <circle cx="512" cy="430" r="72" fill="${C.paper}"/>
  <circle cx="512" cy="430" r="34" fill="none" stroke="${C.gold}" stroke-width="12"/>`;

const svg = (size, body, bg = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${bg}${body}</svg>`;
const scaled = (size, k, id) => {
  const s = (size / 1024) * k;
  const off = (size - 1024 * s) / 2;
  return `<g transform="translate(${off} ${off}) scale(${s})">${pin(id)}</g>`;
};
const nightBg = (size) => `
  <defs><radialGradient id="glow" cx=".78" cy=".12" r=".9">
    <stop offset="0" stop-color="${C.accent}" stop-opacity=".22"/><stop offset=".55" stop-color="${C.ink}" stop-opacity="0"/>
  </radialGradient></defs>
  <rect width="${size}" height="${size}" fill="${C.ink}"/><rect width="${size}" height="${size}" fill="url(#glow)"/>`;

const ASSETS = {
  // Adaptativo (Android 8+): el primer plano tiene que caber en el círculo seguro (~61 % central).
  'icon-foreground.png': [1024, svg(1024, scaled(1024, 0.6, 'fg')), true],
  'icon-background.png': [1024, svg(1024, '', nightBg(1024)), false],
  // Icono clásico (Android < 8) y fuente por defecto.
  'icon-only.png': [1024, svg(1024, scaled(1024, 0.82, 'io'), nightBg(1024)), false],
  'splash.png': [2732, svg(2732, scaled(2732, 0.34, 'sp'), nightBg(2732)), false],
  'splash-dark.png': [2732, svg(2732, scaled(2732, 0.34, 'sd'), nightBg(2732)), false],
};

// ── rasterizado con Chrome headless (CDP) ──
const CHROME = process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 9334;
const chrome = spawn(
  CHROME,
  [
    '--headless=new',
    '--disable-gpu',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${mkdtempSync(join(tmpdir(), 'brand-'))}`,
    'about:blank',
  ],
  { stdio: 'ignore' },
);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let target;
for (let i = 0; i < 50 && !target; i++) {
  await sleep(200);
  try {
    target = (await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()).find(
      (t) => t.type === 'page',
    );
  } catch {}
}
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r, { once: true }));
let n = 0;
const pending = new Map();
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data);
  pending.get(m.id)?.(m);
  pending.delete(m.id);
});
const send = (method, params = {}) =>
  new Promise((res, rej) => {
    const id = ++n;
    pending.set(id, (m) => (m.error ? rej(new Error(m.error.message)) : res(m.result)));
    ws.send(JSON.stringify({ id, method, params }));
  });

const dir = new URL('.', import.meta.url);
for (const [file, [size, markup, transparent]] of Object.entries(ASSETS)) {
  await send('Emulation.setDeviceMetricsOverride', {
    width: size,
    height: size,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await send(
    'Emulation.setDefaultBackgroundColorOverride',
    transparent ? { color: { r: 0, g: 0, b: 0, a: 0 } } : {},
  );
  const html = `<html><body style="margin:0;background:transparent">${markup}</body></html>`;
  await send('Page.navigate', {
    url: `data:text/html;base64,${Buffer.from(html).toString('base64')}`,
  });
  await sleep(400);
  const { data } = await send('Page.captureScreenshot', {
    format: 'png',
    clip: { x: 0, y: 0, width: size, height: size, scale: 1 },
  });
  writeFileSync(new URL(file, dir), Buffer.from(data, 'base64'));
  console.log(`✔ resources/${file} (${size}×${size})`);
}
ws.close();
chrome.kill();
