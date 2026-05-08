// ============================================================================
// CBAM CASH-FLOW ENGINE
// ============================================================================
// Models the working-capital trajectory of a CBAM declarant as a quarterly
// schedule, accounting for:
//
//   · Reg. (EU) 2023/956 Art. 22(2) — quarterly 50% holding rule:
//     "By the last day of each quarter, the declarant shall ensure that the
//      number of CBAM certificates on its account corresponds to at least
//      50% of the embedded emissions cumulated since the beginning of the
//      calendar year." Active from Q2 2027 (first quarter end after the
//      sales platform launches on 1 Feb 2027).
//
//   · Reg. (EU) 2023/956 Art. 22(1) — annual surrender deadline:
//     30 September of each year, covering the full embedded emissions of the
//     prior calendar year (after phase-in). First surrender: 30 Sept 2027 for
//     2026 imports.
//
//   · Lot accounting: certificates are bought at the prevailing ETS price for
//     the quarter and consumed FIFO at surrender. Working capital outstanding
//     is the EUR value of the open-lot ledger at quarter end (i.e. cash spent
//     on certs not yet surrendered, valued at acquisition cost).
//
// Optional inputs (for Monte Carlo and seasonality):
//   · pricePath    — { year: € } overrides ETS_PRICE_PATH per trial.
//   · quarterlyMix — [q1, q2, q3, q4] shares (must sum to 1) to model
//                    seasonal import patterns. Defaults to [0.25, 0.25, 0.25, 0.25].
//
// What this engine does NOT model (yet):
//   · Buyback of excess certificates at year-end (Reg. Art. 23 — ⅓ of held
//     certs above obligation can be sold back at original price). The
//     treasurer in this model never over-buys, so the optionality is unused.
//   · Penalties for non-compliance (Art. 26).
//   · Intra-year ETS price drift (we use the annual average from the path
//     for all four quarters of the year).
// ============================================================================

import {
  ETS_PRICE_PATH,
  CBAM_PHASE_IN,
  calculateCBAMCost,
  getEffectiveEF,
} from './cbamEngine.js';

const UNIFORM_MIX = [0.25, 0.25, 0.25, 0.25];

/**
 * @param {Array} imports — list of import lines
 * @param {object} options
 * @param {number} options.fxRate         — USD→EUR rate for credit calc (default 0.92)
 * @param {number} options.startYear      — default 2026
 * @param {number} options.endYear        — default 2034
 * @param {object} options.pricePath      — optional { year: € } override
 * @param {Array}  options.quarterlyMix   — optional [q1, q2, q3, q4] (sum to 1)
 * @returns {{ series: Array, peak: object|null, totals: object }}
 */
export function projectCBAMCashflow(imports, options = {}) {
  const fxRate = options.fxRate ?? 0.92;
  const startYear = options.startYear ?? 2026;
  const endYear = options.endYear ?? 2034;
  const pricePath = options.pricePath ?? ETS_PRICE_PATH;
  const mix = normalizeMix(options.quarterlyMix);

  // Annual aggregates — emissions in tCO2e (post phase-in) and effective ETS
  // price for that year (from the supplied path).
  const annual = {};
  for (let y = startYear; y <= endYear; y++) {
    const phaseIn = CBAM_PHASE_IN[y] ?? 1;
    const annualUnits = imports.reduce(
      (s, i) => s + i.tonnes * getEffectiveEF(i, y, true) * phaseIn,
      0,
    );
    const etsPrice = pricePath[y] ?? pricePath[endYear];
    const annualCostEUR = imports.reduce(
      (s, i) => s + calculateCBAMCost(i, y, true, fxRate, etsPrice),
      0,
    );
    annual[y] = {
      units: annualUnits,
      costEUR: annualCostEUR,
      etsPrice,
    };
  }

  // Lot ledger — FIFO queue of { units, pricePerUnit }
  const lots = [];
  const series = [];
  let cumulativeOutflow = 0;
  let cumulativeSurrenderValue = 0;

  function buy(units, pricePerUnit) {
    if (units <= 0) return 0;
    const cost = units * pricePerUnit;
    cumulativeOutflow += cost;
    lots.push({ units, pricePerUnit });
    return cost;
  }

  function surrender(units) {
    let remaining = units;
    let valueConsumed = 0;
    while (remaining > 1e-9 && lots.length > 0) {
      const lot = lots[0];
      const take = Math.min(lot.units, remaining);
      lot.units -= take;
      remaining -= take;
      valueConsumed += take * lot.pricePerUnit;
      if (lot.units < 1e-9) lots.shift();
    }
    cumulativeSurrenderValue += valueConsumed;
    return valueConsumed;
  }

  function totalHeldUnits() {
    return lots.reduce((s, l) => s + l.units, 0);
  }
  function totalHeldValue() {
    return lots.reduce((s, l) => s + l.units * l.pricePerUnit, 0);
  }

  for (let y = startYear; y <= endYear; y++) {
    const a = annual[y];
    for (let q = 1; q <= 4; q++) {
      const target = combinedHoldingTarget(y, q, annual, mix);

      const heldStart = totalHeldUnits();
      const buyUnits = Math.max(0, target - heldStart);
      const outflow = buy(buyUnits, a.etsPrice);

      let surrenderedValue = 0;
      let surrenderedUnits = 0;
      if (q === 3 && y >= 2027 && annual[y - 1]) {
        surrenderedUnits = annual[y - 1].units;
        surrenderedValue = surrender(surrenderedUnits);
      }

      const heldEoq = totalHeldUnits();
      const heldValueEoq = totalHeldValue();

      series.push({
        period: `${y}Q${q}`,
        year: y,
        quarter: q,
        targetUnits: target,
        buyUnits,
        outflowEUR: outflow,
        surrenderedUnits,
        surrenderValueEUR: surrenderedValue,
        certsHeldUnits: heldEoq,
        workingCapitalEUR: heldValueEoq,
        cumulativeOutflowEUR: cumulativeOutflow,
        cumulativeSurrenderValueEUR: cumulativeSurrenderValue,
        ruleActive: (y > 2027) || (y === 2027 && q >= 2),
      });
    }
  }

  const peak = series.reduce(
    (best, s) => (s.workingCapitalEUR > (best?.workingCapitalEUR ?? -Infinity) ? s : best),
    null,
  );

  const totals = {
    totalOutflowEUR: cumulativeOutflow,
    totalSurrenderValueEUR: cumulativeSurrenderValue,
    peakWorkingCapitalEUR: peak?.workingCapitalEUR ?? 0,
    peakPeriod: peak?.period ?? null,
  };

  return { series, peak, totals };
}

/**
 * Combined minimum cert holding at end of quarter q of year y, BEFORE the Q3
 * surrender event. Sum of:
 *   · prior-year surrender ramp (Q1=⅓, Q2=⅔, Q3=full, Q4=0 — already surrendered)
 *   · current-year 50% rule, applied to cumulative emissions weighted by the
 *     quarterly mix (uniform by default; seasonal otherwise)
 */
function combinedHoldingTarget(y, q, annual, mix) {
  let target = 0;

  if (y >= 2027 && annual[y - 1]) {
    const prior = annual[y - 1].units;
    if (q === 1) target += prior / 3;
    else if (q === 2) target += (2 * prior) / 3;
    else if (q === 3) target += prior;
    // q == 4: prior already surrendered earlier in y → 0
  }

  const ruleActive = (y > 2027) || (y === 2027 && q >= 2);
  if (ruleActive && annual[y]) {
    const cumulativeShare = mix.slice(0, q).reduce((s, m) => s + m, 0);
    target += 0.5 * cumulativeShare * annual[y].units;
  }

  return target;
}

function normalizeMix(input) {
  if (!Array.isArray(input) || input.length !== 4) return UNIFORM_MIX;
  const sum = input.reduce((s, x) => s + (Number(x) || 0), 0);
  if (sum <= 0) return UNIFORM_MIX;
  return input.map(x => (Number(x) || 0) / sum);
}

/** Preset seasonality profiles for the UI control. */
export const QUARTERLY_PRESETS = {
  even:           { label: 'Even',           mix: [0.25, 0.25, 0.25, 0.25] },
  frontLoaded:    { label: 'Front-loaded',   mix: [0.35, 0.30, 0.20, 0.15] },
  backLoaded:     { label: 'Back-loaded',    mix: [0.15, 0.20, 0.30, 0.35] },
  constructionPeak: { label: 'Q2-Q3 peak',   mix: [0.18, 0.32, 0.32, 0.18] },
};
