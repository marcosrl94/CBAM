import { describe, it, expect } from 'vitest';
import { projectCBAMCashflow, QUARTERLY_PRESETS } from '../cashflowEngine.js';
import { ETS_PRICE_PATH, CBAM_PHASE_IN, getEffectiveEF } from '../cbamEngine.js';

const STEEL_LINE = {
  id: 'i_test',
  sector: 'steel',
  cnCode: '720851',
  origin: 'TR',
  tonnes: 1000,
  productName: 'Test hot-rolled coils',
  actualEF: 1.85,
  hasVerification: true,
};

const sampleImports = [STEEL_LINE];

describe('projectCBAMCashflow · structure', () => {
  it('emits 36 quarters (2026Q1 → 2034Q4) by default', () => {
    const { series } = projectCBAMCashflow(sampleImports);
    expect(series).toHaveLength(36);
    expect(series[0].period).toBe('2026Q1');
    expect(series.at(-1).period).toBe('2034Q4');
  });

  it('returns zero-everything when imports is empty', () => {
    const { series, totals } = projectCBAMCashflow([]);
    expect(series.every(s => s.workingCapitalEUR === 0)).toBe(true);
    expect(series.every(s => s.outflowEUR === 0)).toBe(true);
    expect(totals.peakWorkingCapitalEUR).toBe(0);
    // peakPeriod resolves to the first quarter because every WC equals 0
    // (reduce keeps the first element that's not strictly less than -Infinity).
    expect(totals.peakPeriod).toBe('2026Q1');
  });

  it('respects custom startYear / endYear range', () => {
    const { series } = projectCBAMCashflow(sampleImports, { startYear: 2027, endYear: 2028 });
    expect(series).toHaveLength(8);
    expect(series[0].period).toBe('2027Q1');
    expect(series.at(-1).period).toBe('2028Q4');
  });
});

describe('projectCBAMCashflow · 50% holding rule (Art. 22(2))', () => {
  it('flags ruleActive correctly across the phase-in boundary', () => {
    const { series } = projectCBAMCashflow(sampleImports);
    const get = (period) => series.find(s => s.period === period);
    expect(get('2026Q4').ruleActive).toBe(false);
    expect(get('2027Q1').ruleActive).toBe(false);
    expect(get('2027Q2').ruleActive).toBe(true);
    expect(get('2028Q1').ruleActive).toBe(true);
    expect(get('2034Q4').ruleActive).toBe(true);
  });

  it('does not require any cert holdings before 2027Q1', () => {
    const { series } = projectCBAMCashflow(sampleImports);
    const pre2027 = series.filter(s => s.year === 2026);
    expect(pre2027.every(s => s.targetUnits === 0)).toBe(true);
    expect(pre2027.every(s => s.buyUnits === 0)).toBe(true);
  });
});

describe('projectCBAMCashflow · annual surrender (Art. 22(1))', () => {
  it('first surrender lands in 2027Q3 with the 2026 emissions volume', () => {
    const { series } = projectCBAMCashflow(sampleImports);
    const ef = getEffectiveEF(STEEL_LINE, 2026, true);
    const expected2026Units = STEEL_LINE.tonnes * ef * CBAM_PHASE_IN[2026];

    const q3 = series.find(s => s.period === '2027Q3');
    expect(q3.surrenderedUnits).toBeCloseTo(expected2026Units, 3);
    expect(q3.surrenderValueEUR).toBeGreaterThan(0);

    // No other quarter in 2027 surrenders anything.
    for (const q of [1, 2, 4]) {
      const s = series.find(x => x.period === `2027Q${q}`);
      expect(s.surrenderedUnits).toBe(0);
    }
  });

  it('Q4 of any year holds nothing from the prior-year ramp (already surrendered Q3)', () => {
    const { series } = projectCBAMCashflow(sampleImports);
    // 2028Q4: prior-year (2027) ramp is already 0, only current-year 50% rule contributes.
    const q4 = series.find(s => s.period === '2028Q4');
    const ef2028 = getEffectiveEF(STEEL_LINE, 2028, true);
    const annual2028 = STEEL_LINE.tonnes * ef2028 * CBAM_PHASE_IN[2028];
    // Cumulative share Q4 = 1.0; rule contribution = 0.5 × annual.
    expect(q4.targetUnits).toBeCloseTo(0.5 * annual2028, 3);
  });
});

describe('projectCBAMCashflow · FIFO lot accounting', () => {
  it('total outflow = total surrender value + final working capital value', () => {
    const { series, totals } = projectCBAMCashflow(sampleImports);
    const finalWC = series.at(-1).workingCapitalEUR;
    expect(totals.totalOutflowEUR).toBeCloseTo(
      totals.totalSurrenderValueEUR + finalWC,
      0, // EUR units; rounding noise within 1
    );
  });

  it('surrender values use older lot prices, not the current quarter price', () => {
    const { series } = projectCBAMCashflow(sampleImports);
    const ef = getEffectiveEF(STEEL_LINE, 2026, true);
    const units2026 = STEEL_LINE.tonnes * ef * CBAM_PHASE_IN[2026];
    // 2026 buys happen at 2026's ETS price. But the rule isn't active in 2026,
    // so first 2026-priced lots are bought during 2027Q1-Q3 ramp under the
    // 1/3 → 2/3 → full schedule. ETS path: 2026 anchor (snapshot) vs 2027 = 85.
    // Surrender in 2027Q3 consumes the 2027-priced lots first.
    const q3 = series.find(s => s.period === '2027Q3');
    const expectedAt2027Price = units2026 * ETS_PRICE_PATH[2027];
    expect(q3.surrenderValueEUR).toBeCloseTo(expectedAt2027Price, 0);
  });
});

describe('projectCBAMCashflow · seasonality presets', () => {
  it('all 4 presets sum to 1', () => {
    for (const [, preset] of Object.entries(QUARTERLY_PRESETS)) {
      const sum = preset.mix.reduce((s, m) => s + m, 0);
      expect(sum).toBeCloseTo(1, 6);
    }
  });

  it('front-loaded peaks earlier than back-loaded in the first ruleActive year', () => {
    const front = projectCBAMCashflow(sampleImports, { quarterlyMix: QUARTERLY_PRESETS.frontLoaded.mix });
    const back  = projectCBAMCashflow(sampleImports, { quarterlyMix: QUARTERLY_PRESETS.backLoaded.mix });
    // Look at 2027Q2 cumulative share contribution to the holding target.
    const f = front.series.find(s => s.period === '2027Q2');
    const b = back.series.find(s => s.period === '2027Q2');
    expect(f.targetUnits).toBeGreaterThan(b.targetUnits);
  });

  it('falls back to uniform mix when input array is malformed', () => {
    const baseline = projectCBAMCashflow(sampleImports, { quarterlyMix: [0.25, 0.25, 0.25, 0.25] });
    const bad = projectCBAMCashflow(sampleImports, { quarterlyMix: [0, 0, 0, 0] });
    const tooShort = projectCBAMCashflow(sampleImports, { quarterlyMix: [0.5, 0.5] });
    expect(bad.totals.peakWorkingCapitalEUR).toBeCloseTo(baseline.totals.peakWorkingCapitalEUR, 0);
    expect(tooShort.totals.peakWorkingCapitalEUR).toBeCloseTo(baseline.totals.peakWorkingCapitalEUR, 0);
  });
});

describe('projectCBAMCashflow · price path override', () => {
  it('higher 2034 ETS price increases peak working capital monotonically', () => {
    const low  = projectCBAMCashflow(sampleImports, { pricePath: { ...ETS_PRICE_PATH, 2034: 100 } });
    const high = projectCBAMCashflow(sampleImports, { pricePath: { ...ETS_PRICE_PATH, 2034: 300 } });
    expect(high.totals.peakWorkingCapitalEUR).toBeGreaterThan(low.totals.peakWorkingCapitalEUR);
  });

  it('peak coincides with the period of max workingCapitalEUR in series', () => {
    const { series, peak, totals } = projectCBAMCashflow(sampleImports);
    const maxFromSeries = Math.max(...series.map(s => s.workingCapitalEUR));
    expect(peak.workingCapitalEUR).toBe(maxFromSeries);
    expect(totals.peakPeriod).toBe(peak.period);
  });
});
