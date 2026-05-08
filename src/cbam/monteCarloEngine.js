// ============================================================================
// MONTE CARLO ENGINE — ETS price uncertainty propagated to cost & WC bands
// ============================================================================
//
// What this does:
//   · Anchors 2026 to the live spot price (from `ETS_PRICE_PATH`, which now
//     reads the EEX snapshot via `data/euaSpot.js`).
//   · Models 2027–2034 prices as a correlated random walk in log-space around
//     the central path. Each year's noise is N(0, vol); cumulative drift is
//     applied multiplicatively.
//   · For each trial: recomputes annual CBAM cost and the full quarterly cash
//     flow with `projectCBAMCashflow(... { pricePath })`.
//   · Aggregates P10/P50/P90 per year (cost) and per quarter (WC), plus peak
//     WC distribution.
//
// Defaults: 500 trials, σ = 22% (annualised log-space). EU ETS one-year
// realised vol has hovered around 25–40% in recent years; 22% is moderate
// and produces bands wide enough to be useful without being alarmist.
// Override either via `options` for sensitivity testing.
//
// Performance: ~500 trials × 9 years × N imports + 500 cashflow projections
// runs in ~30–80ms in the browser for typical portfolios. No worker needed.
// ============================================================================

import { ETS_PRICE_PATH, calculateCBAMCost } from './cbamEngine.js';
import { projectCBAMCashflow } from './cashflowEngine.js';

const DEFAULT_TRIALS = 500;
const DEFAULT_VOL = 0.22;
const ANCHOR_YEAR = 2026;

/**
 * @param {Array} imports
 * @param {object} options
 * @param {number} options.trials       — default 500
 * @param {number} options.vol          — annualised log-space σ (default 0.22)
 * @param {number} options.fxRate       — USD→EUR (default 0.92)
 * @param {Array}  options.quarterlyMix — passed through to cashflow engine
 * @returns {{
 *   costPercentiles: Array<{year, p10, p50, p90}>,
 *   wcPercentiles: Array<{period, year, quarter, p10, p50, p90}>,
 *   peakWCPercentiles: {p10, p50, p90},
 *   trials: number,
 *   vol: number,
 * }}
 */
export function runMonteCarlo(imports, options = {}) {
  const trials = options.trials ?? DEFAULT_TRIALS;
  const vol = options.vol ?? DEFAULT_VOL;
  const fxRate = options.fxRate ?? 0.92;
  const quarterlyMix = options.quarterlyMix;
  const years = Object.keys(ETS_PRICE_PATH).map(Number).sort((a, b) => a - b);

  // Per-year cost samples and per-period WC samples
  const costsByYear = new Map();
  const wcByPeriod = new Map();
  const periodOrder = []; // preserve order across trials
  const peakWCSamples = [];

  for (let t = 0; t < trials; t++) {
    const path = generatePricePath(years, vol);

    // Annual costs
    for (const y of years) {
      const cost = imports.reduce(
        (s, i) => s + calculateCBAMCost(i, y, true, fxRate, path[y]),
        0,
      );
      const arr = costsByYear.get(y) ?? [];
      arr.push(cost);
      costsByYear.set(y, arr);
    }

    // Cashflow trajectory under this trial
    const cf = projectCBAMCashflow(imports, { fxRate, pricePath: path, quarterlyMix });
    cf.series.forEach(s => {
      let arr = wcByPeriod.get(s.period);
      if (!arr) {
        arr = [];
        wcByPeriod.set(s.period, arr);
        if (t === 0) periodOrder.push({ period: s.period, year: s.year, quarter: s.quarter });
      }
      arr.push(s.workingCapitalEUR);
    });
    peakWCSamples.push(cf.totals.peakWorkingCapitalEUR);
  }

  const costPercentiles = years
    .map(y => {
      const samples = costsByYear.get(y) ?? [];
      return { year: y, ...percentiles(samples) };
    });

  const wcPercentiles = periodOrder.map(({ period, year, quarter }) => ({
    period,
    year,
    quarter,
    ...percentiles(wcByPeriod.get(period) ?? []),
  }));

  const peakWCPercentiles = percentiles(peakWCSamples);

  return {
    costPercentiles,
    wcPercentiles,
    peakWCPercentiles,
    trials,
    vol,
  };
}

// ============================================================================
// Helpers
// ============================================================================

function generatePricePath(years, vol) {
  const path = {};
  let lnDrift = 0;
  for (const y of years) {
    if (y <= ANCHOR_YEAR) {
      path[y] = ETS_PRICE_PATH[y];
    } else {
      lnDrift += randNormal() * vol;
      path[y] = ETS_PRICE_PATH[y] * Math.exp(lnDrift);
    }
  }
  return path;
}

/** Box-Muller transform — single-draw standard normal. */
function randNormal() {
  const u1 = Math.random() || 1e-12;
  const u2 = Math.random();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

function percentiles(samples) {
  if (!samples.length) return { p10: 0, p50: 0, p90: 0 };
  const sorted = [...samples].sort((a, b) => a - b);
  const at = (p) => {
    const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor(p * sorted.length)));
    return sorted[idx];
  };
  return { p10: at(0.10), p50: at(0.50), p90: at(0.90) };
}
