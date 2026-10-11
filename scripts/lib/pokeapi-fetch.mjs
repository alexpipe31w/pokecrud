// fetch a PokéAPI con: caché en disco (.cache/pokeapi), timeout, reintentos con backoff+jitter
// y concurrencia limitada. Reanudable: lo ya descargado no se vuelve a pedir.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const BASE = 'https://pokeapi.co/api/v2/';
const CACHE_DIR = join(process.cwd(), '.cache', 'pokeapi');
const TIMEOUT_MS = 15_000;
const MAX_RETRIES = 4;

function cachePath(url) {
  const rel = url.replace(BASE, '').replace(/[?&=]/g, '_').replace(/\/$/, '');
  return join(CACHE_DIR, `${rel}.json`);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function getJson(urlOrPath) {
  const url = urlOrPath.startsWith('http') ? urlOrPath : BASE + urlOrPath;
  const file = cachePath(url);
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch {
    /* no está en caché: se descarga */
  }
  let lastError;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
      if (res.status === 404) throw Object.assign(new Error(`404 ${url}`), { fatal: true });
      if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
      const json = await res.json();
      await mkdir(dirname(file), { recursive: true });
      await writeFile(file, JSON.stringify(json));
      return json;
    } catch (err) {
      lastError = err;
      if (err.fatal) break;
      const backoff = Math.min(8000, 500 * 2 ** attempt) + Math.random() * 300;
      await sleep(backoff);
    }
  }
  throw lastError;
}

/** Ejecuta `fn` sobre `items` con como mucho `limit` promesas a la vez. */
export async function mapLimit(items, limit, fn, onProgress) {
  const out = new Array(items.length);
  let next = 0;
  let done = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i], i);
      done++;
      if (onProgress && done % 50 === 0) onProgress(done, items.length);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

export const idFromUrl = (url) => Number(url.split('/').filter(Boolean).pop());
