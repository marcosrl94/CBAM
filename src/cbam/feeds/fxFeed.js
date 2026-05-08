// ============================================================================
// FX feed — USD → EUR via Frankfurter (ECB reference rates)
// ============================================================================
//
// Frankfurter is a free, public, CORS-enabled mirror of the ECB reference
// rates. No API key required. Endpoint:
//   https://api.frankfurter.dev/v1/latest?base=USD&symbols=EUR
//
// Behaviour:
//   · On app mount, refreshFX() fires once. If the call succeeds, the cached
//     value is updated and React subscribers re-render via useFX().
//   · If the network is offline / CORS misbehaves / Frankfurter is down, the
//     fallback snapshot is preserved.
//   · No retries — this is a soft enrichment, not a critical path.
// ============================================================================

import { useEffect, useState } from 'react';

const FALLBACK = Object.freeze({
  rate: 0.92,
  asOf: '2026-05-08',
  source: 'Snapshot fallback',
  live: false,
});

const ENDPOINT = 'https://api.frankfurter.dev/v1/latest?base=USD&symbols=EUR';

let cache = FALLBACK;
const listeners = new Set();
let inFlight = null;

export function getFX() {
  return cache;
}

export async function refreshFX() {
  if (inFlight) return inFlight;
  inFlight = (async () => {
    try {
      const res = await fetch(ENDPOINT, { cache: 'no-store' });
      if (!res.ok) throw new Error(`Frankfurter ${res.status}`);
      const json = await res.json();
      const rate = json?.rates?.EUR;
      if (typeof rate !== 'number') throw new Error('Unexpected payload');
      cache = {
        rate,
        asOf: json.date ?? new Date().toISOString().slice(0, 10),
        source: 'Frankfurter (ECB reference rates)',
        live: true,
      };
      listeners.forEach(fn => fn(cache));
      return cache;
    } catch {
      return cache;
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}

/** React hook — returns the current FX state and triggers a refresh on mount. */
export function useFX() {
  const [fx, setFx] = useState(cache);
  useEffect(() => {
    listeners.add(setFx);
    refreshFX();
    return () => listeners.delete(setFx);
  }, []);
  return fx;
}
