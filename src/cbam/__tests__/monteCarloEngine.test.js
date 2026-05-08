import { describe, it, expect } from 'vitest';
import { runMonteCarlo } from '../monteCarloEngine.js';
import { ETS_PRICE_PATH, calculateCBAMCost } from '../cbamEngine.js';

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

describe('runMonteCarlo · structure & metadata', () => {
  it('echoes back trials and vol used', () => {
    const mc = runMonteCarlo(sampleImports, { trials: 50, vol: 0.18 });
    expect(mc.trials).toBe(50);
    expect(mc.vol).toBe(0.18);
  });

  it('defaults to 500 trials and σ=0.22', () => {
    const mc = runMonteCarlo(sampleImports);
    expect(mc.trials).toBe(500);
    expect(mc.vol).toBe(0.22);
  });

  it('costPercentiles cover 2026 → 2034 in order', () => {
    const mc = runMonteCarlo(sampleImports, { trials: 30 });
    const years = mc.costPercentiles.map(p => p.year);
    expect(years).toEqual([2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033, 2034]);
  });

  it('wcPercentiles emits 36 quarters in chronological order', () => {
    const mc = runMonteCarlo(sampleImports, { trials: 30 });
    expect(mc.wcPercentiles).toHaveLength(36);
    expect(mc.wcPercentiles[0].period).toBe('2026Q1');
    expect(mc.wcPercentiles.at(-1).period).toBe('2034Q4');
  });
});

describe('runMonteCarlo · invariants', () => {
  it('p10 ≤ p50 ≤ p90 for every cost year', () => {
    const mc = runMonteCarlo(sampleImports, { trials: 100 });
    for (const p of mc.costPercentiles) {
      expect(p.p10).toBeLessThanOrEqual(p.p50);
      expect(p.p50).toBeLessThanOrEqual(p.p90);
    }
  });

  it('p10 ≤ p50 ≤ p90 for every WC quarter', () => {
    const mc = runMonteCarlo(sampleImports, { trials: 100 });
    for (const p of mc.wcPercentiles) {
      expect(p.p10).toBeLessThanOrEqual(p.p50);
      expect(p.p50).toBeLessThanOrEqual(p.p90);
    }
  });

  it('peak WC percentiles also respect the ordering', () => {
    const mc = runMonteCarlo(sampleImports, { trials: 100 });
    expect(mc.peakWCPercentiles.p10).toBeLessThanOrEqual(mc.peakWCPercentiles.p50);
    expect(mc.peakWCPercentiles.p50).toBeLessThanOrEqual(mc.peakWCPercentiles.p90);
  });

  it('anchor year 2026 collapses to the deterministic central cost (zero spread)', () => {
    const mc = runMonteCarlo(sampleImports, { trials: 100 });
    const anchor = mc.costPercentiles.find(p => p.year === 2026);
    const central = calculateCBAMCost(STEEL_LINE, 2026, true, 0.92, ETS_PRICE_PATH[2026]);
    expect(anchor.p10).toBeCloseTo(central, 0);
    expect(anchor.p50).toBeCloseTo(central, 0);
    expect(anchor.p90).toBeCloseTo(central, 0);
  });
});

describe('runMonteCarlo · σ sensitivity', () => {
  it('higher σ widens the P10–P90 cost band at the horizon', () => {
    const trials = 400;
    const low  = runMonteCarlo(sampleImports, { trials, vol: 0.10 });
    const high = runMonteCarlo(sampleImports, { trials, vol: 0.40 });
    const lowSpread  = (low.costPercentiles.at(-1).p90  - low.costPercentiles.at(-1).p10);
    const highSpread = (high.costPercentiles.at(-1).p90 - high.costPercentiles.at(-1).p10);
    expect(highSpread).toBeGreaterThan(lowSpread);
  });

  it('σ=0 collapses the whole price path (and the bands) to the central case', () => {
    const mc = runMonteCarlo(sampleImports, { trials: 60, vol: 0 });
    for (const p of mc.costPercentiles) {
      expect(p.p10).toBeCloseTo(p.p50, 0);
      expect(p.p50).toBeCloseTo(p.p90, 0);
    }
  });
});

describe('runMonteCarlo · degenerate inputs', () => {
  it('returns zero percentiles when imports is empty', () => {
    const mc = runMonteCarlo([], { trials: 30 });
    expect(mc.costPercentiles.every(p => p.p10 === 0 && p.p50 === 0 && p.p90 === 0)).toBe(true);
    expect(mc.peakWCPercentiles).toEqual({ p10: 0, p50: 0, p90: 0 });
  });
});
