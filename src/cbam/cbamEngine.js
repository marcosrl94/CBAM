// ============================================================================
// CBAM DATA & CALCULATION ENGINE
// ============================================================================
// Regulatory frame (as of May 2026):
//   · Regulation (EU) 2023/956 — CBAM base regulation (definitive period from 1 Jan 2026).
//   · Implementing Regulation (EU) 2025/486 — verification, registry, default values rules.
//   · Omnibus simplification Regulation (EU) 2025/2083 — 50 t/year de minimis threshold.
//   · Commission delegated/implementing acts of 17 December 2025 — default values calibration.
//   · Acts pending Q1 2026 — third-country carbon-price credit methodology (Article 9).
//
// Calibration policy: structural constants (phase-in factors, regulation
// references) live here; all numerical inputs that move with markets or with
// regulatory updates are sourced from `./data/*` (CN-code defaults, World
// Bank carbon prices, EUA spot snapshot) and from `./feeds/*` (live FX).
// Each data file carries its own `asOf` and source URL — the catalogue at
// `./data/sources.js` exposes the consolidated trust layer to the UI.
// ============================================================================

import { lookupCNDefault } from './data/cnCodeDefaults.js';
import { WORLD_BANK_CARBON_PRICES } from './data/worldBankCarbonPrices.js';
import { EUA_SPOT_SNAPSHOT } from './data/euaSpot.js';

export { CN_CODE_DEFAULTS, lookupCNDefault } from './data/cnCodeDefaults.js';
export { WORLD_BANK_CARBON_PRICES, WORLD_BANK_DASHBOARD_URL, WORLD_BANK_AS_OF } from './data/worldBankCarbonPrices.js';
export { EUA_SPOT_SNAPSHOT, getCurrentEUAPriceEUR } from './data/euaSpot.js';
export { DATA_SOURCES } from './data/sources.js';

/**
 * Sector-level metadata (display + structural attributes). Numerical defaults
 * are CN-code level — see `data/cnCodeDefaults.js`. The values here serve as
 * fallbacks when an import line lacks a CN code, and provide UI metadata
 * (label, icon, whether Scope 2 is in scope under Annex II).
 *
 * Source: CBAM Regulation (EU) 2023/956 Annex I (sector scope) + Annex II
 * (which sectors require Scope 2 to be embedded). Last reviewed 2026-05-08.
 */
export const CBAM_SECTORS = {
  cement: {
    label: 'Cement',
    cnCodes: ['2523', '2507'],
    defaultEF: 0.72,
    indirectEF: 0.05,
    indirectIncluded: true,
    markupPct: 0.30,
    icon: '🏗️',
  },
  steel: {
    label: 'Iron & Steel',
    cnCodes: ['7208', '7210', '7213', '7214', '7216', '7301', '7302'],
    defaultEF: 2.10,
    indirectEF: 0,
    indirectIncluded: false,
    markupPct: 0.30,
    icon: '⚙️',
  },
  aluminium: {
    label: 'Aluminium',
    cnCodes: ['7601', '7604', '7606', '7608'],
    defaultEF: 14.50,
    indirectEF: 0,
    indirectIncluded: false,
    markupPct: 0.30,
    icon: '🔩',
  },
  fertilisers: {
    label: 'Fertilisers',
    cnCodes: ['2808', '3102', '3105'],
    defaultEF: 2.85,
    indirectEF: 0.35,
    indirectIncluded: true,
    markupPct: 0.30,
    icon: '🌾',
  },
  hydrogen: {
    label: 'Hydrogen',
    cnCodes: ['2804'],
    defaultEF: 11.20,
    indirectEF: 0,
    indirectIncluded: false,
    markupPct: 0.30,
    icon: '⚛️',
  },
  electricity: {
    label: 'Electricity',
    cnCodes: ['2716'],
    defaultEF: 0.65,
    indirectEF: 0,
    indirectIncluded: false,
    markupPct: 0.30,
    icon: '⚡',
  },
};

/**
 * EU ETS price path, €/tCO2e (annual average benchmark).
 *
 * 2026 is anchored to the most recent EUA spot snapshot
 * (`data/euaSpot.js · currentEUR`) so the engine reflects today's market;
 * 2027–2034 are analyst-consensus illustrative values (ICIS / BNEF / Refinitiv
 * blend). Replace the consensus tail when a paid feed is contracted.
 */
export const ETS_PRICE_PATH = {
  2026: EUA_SPOT_SNAPSHOT.currentEUR,
  2027: 85,
  2028: 95,
  2029: 105,
  2030: 118,
  2031: 130,
  2032: 142,
  2033: 155,
  2034: 170,
};

/**
 * CBAM phase-in factor — share of embedded emissions liable for surrender each year.
 *
 * Source: CBAM Regulation (EU) 2023/956 Article 36(2) — mirrors the EU ETS
 * free-allocation phase-out (Directive 2003/87/EC Art. 10a). Fixed by primary
 * regulation; no recalibration unless amended.
 */
export const CBAM_PHASE_IN = {
  2026: 0.025,
  2027: 0.05,
  2028: 0.10,
  2029: 0.225,
  2030: 0.485,
  2031: 0.61,
  2032: 0.735,
  2033: 0.86,
  2034: 1.00,
};

/**
 * Backward-compatible slim alias: `{ origin: { label, carbonPriceUSD } }`.
 * Source data is `WORLD_BANK_CARBON_PRICES`; the alias keeps existing UI
 * imports working without touching call sites.
 */
export const COUNTRY_DEFAULTS = Object.fromEntries(
  Object.entries(WORLD_BANK_CARBON_PRICES).map(([code, entry]) => [
    code,
    { label: entry.label, carbonPriceUSD: entry.priceUSD },
  ]),
);

// ============================================================================
// Calculation primitives
// ============================================================================

/**
 * Effective emission factor (tCO2e per tonne of product) actually applied to
 * an import line for a given year, with markup logic and indirect emissions.
 *
 * Resolution order:
 *   1. If `useActualEF` and the import line carries a verified `actualEF`,
 *      return that as-is (verifier-confirmed values are not subject to the
 *      regulatory markup).
 *   2. Else look up the CN-code default in `CN_CODE_DEFAULTS`. If present,
 *      use its direct + indirect EFs and CN-specific markup.
 *   3. Else fall back to sector-level defaults from `CBAM_SECTORS`.
 *
 * Markup of +(markupPct) applies from reporting period 2028 onwards
 * (Reg. 2023/956 Art. 7(2) + implementing acts).
 */
export function getEffectiveEF(importLine, year, useActualEF = false) {
  if (useActualEF && importLine.actualEF != null) {
    return importLine.actualEF;
  }
  const cnDefault = lookupCNDefault(importLine.cnCode);
  const sector = CBAM_SECTORS[importLine.sector];
  const direct = cnDefault?.defaultEF ?? sector?.defaultEF ?? 0;
  const indirect = (sector?.indirectIncluded)
    ? (cnDefault?.indirectEF ?? sector?.indirectEF ?? 0)
    : 0;
  const markupPct = cnDefault?.markupPct ?? sector?.markupPct ?? 0.30;
  const markupFactor = year >= 2028 ? (1 + markupPct) : 1;
  return (direct + indirect) * markupFactor;
}

/**
 * Annual CBAM cost (€) for a single import line in a given calendar year.
 *
 * Inputs:
 *   importLine    — { sector, cnCode?, origin, tonnes, actualEF?, hasVerification? }
 *   year          — calendar year between 2026 and 2034
 *   useActualEF   — if true, prefer the line's verified EF over defaults
 *   fxRate        — USD → EUR rate. Defaults to the snapshot fallback so the
 *                   function is callable without the FX hook (e.g. server-side
 *                   or in tests). UI passes the live rate from `feeds/fxFeed.js`.
 *   priceOverride — optional ETS price (€/tCO2e) to use instead of the central
 *                   path. Used by the Monte Carlo engine to feed sampled price
 *                   trajectories without rewriting the calc logic.
 */
export function calculateCBAMCost(importLine, year, useActualEF = false, fxRate = 0.92, priceOverride = null) {
  const sector = CBAM_SECTORS[importLine.sector];
  if (!sector) return 0;

  const ef = getEffectiveEF(importLine, year, useActualEF);
  const embeddedEmissions = importLine.tonnes * ef;
  const etsPrice = priceOverride != null
    ? priceOverride
    : (ETS_PRICE_PATH[year] ?? ETS_PRICE_PATH[2034]);
  const phaseIn = CBAM_PHASE_IN[year] ?? 1.0;

  const country = COUNTRY_DEFAULTS[importLine.origin];
  const carbonPriceCreditEUR = country ? country.carbonPriceUSD * fxRate : 0;

  const grossCost = embeddedEmissions * etsPrice * phaseIn;
  const credit = embeddedEmissions * carbonPriceCreditEUR * phaseIn;
  return Math.max(0, grossCost - credit);
}

// ============================================================================
// SAMPLE PORTFOLIO — illustrative client data
// ============================================================================
// Each import line now carries its CN code so the engine routes through the
// granular Annex IV defaults. Lines without a verified `actualEF` will pick
// up the per-CN-code default (and from 2028, the +markupPct surcharge).

export const SAMPLE_CLIENTS = [
  {
    id: 'c1',
    name: 'Aceros del Mediterráneo S.A.',
    sector: 'Steel manufacturer',
    cif: 'A-08123456',
    rmRating: 'BB+',
    annualRevenue: 340_000_000,
    imports: [
      { id: 'i1', sector: 'steel', cnCode: '720851', origin: 'TR', tonnes: 4200, productName: 'Hot-rolled coils', actualEF: 1.85, hasVerification: true },
      { id: 'i2', sector: 'steel', cnCode: '7213',   origin: 'IN', tonnes: 1800, productName: 'Wire rod', actualEF: null, hasVerification: false },
      { id: 'i3', sector: 'aluminium', cnCode: '760110', origin: 'CN', tonnes: 220, productName: 'Aluminium ingots', actualEF: null, hasVerification: false },
    ],
  },
  {
    id: 'c2',
    name: 'Cementos Ibéricos Holding',
    sector: 'Cement & construction',
    cif: 'A-28987654',
    rmRating: 'A-',
    annualRevenue: 890_000_000,
    imports: [
      { id: 'i4', sector: 'cement', cnCode: '252310', origin: 'MA', tonnes: 12000, productName: 'Clinker', actualEF: 0.78, hasVerification: true },
      { id: 'i5', sector: 'cement', cnCode: '252329', origin: 'EG', tonnes: 6500, productName: 'Cement', actualEF: null, hasVerification: false },
    ],
  },
  {
    id: 'c3',
    name: 'Fertilizantes Atlántico',
    sector: 'Agro-chemical',
    cif: 'B-46321789',
    rmRating: 'BBB',
    annualRevenue: 215_000_000,
    imports: [
      { id: 'i6', sector: 'fertilisers', cnCode: '310210', origin: 'RU', tonnes: 3400, productName: 'Urea', actualEF: null, hasVerification: false },
      { id: 'i7', sector: 'fertilisers', cnCode: '310230', origin: 'UA', tonnes: 2100, productName: 'Ammonium nitrate', actualEF: 2.45, hasVerification: true },
    ],
  },
  {
    id: 'c4',
    name: 'AluTech Industries',
    sector: 'Industrial manufacturing',
    cif: 'A-08765432',
    rmRating: 'BB',
    annualRevenue: 125_000_000,
    imports: [
      { id: 'i8', sector: 'aluminium', cnCode: '7606', origin: 'CN', tonnes: 950, productName: 'Aluminium sheets', actualEF: null, hasVerification: false },
      { id: 'i9', sector: 'aluminium', cnCode: '7604', origin: 'KR', tonnes: 410, productName: 'Aluminium profiles', actualEF: 11.80, hasVerification: true },
    ],
  },
];
