// ============================================================================
// CN-code default emission factors — Annex IV of CBAM Reg. (EU) 2023/956
// as operationalised by Implementing Regulation (EU) 2025/486 and the
// Commission acts of 17 December 2025.
// ============================================================================
//
// The Commission publishes a granular per-CN-code default table covering
// roughly 100 codes across the six CBAM sectors. The values below are the
// most-cited CN codes for typical CBAM importers, with the corresponding
// default emission factor (tCO2e per tonne of product) and, where the
// regulation requires Scope 2 to be embedded (cement, fertilisers), an
// indirect emission factor reflecting the assumed grid intensity at origin.
//
// Each entry carries:
//   defaultEF   — direct embedded emissions, tCO2e/t (Annex IV default)
//   indirectEF  — indirect (Scope 2) embedded emissions, tCO2e/t (0 if not
//                 required to be included for that sector under Annex II)
//   route       — production route assumed by the default (BOF, EAF, primary
//                 smelter, etc.). Real declarants can override with verified
//                 actuals from the supplier.
//   markupPct   — surcharge applied to the default from reporting period 2028
//                 (Reg. 2023/956 Art. 7(2)). 30% across the board today,
//                 subject to recalibration in future implementing acts.
//
// Source: aggregated from Reg. 2023/956 Annex IV + Implementing Reg. 2025/486
// (default values methodology) + Commission acts 17 Dec 2025. Last reviewed
// 2026-05-08 — refresh against the live PDF/Excel published by DG TAXUD.
// Numbers are conservative simplifications calibrated to the public regulatory
// texts; binding declarations require the latest official table.

export const CN_CODE_DEFAULTS = {
  // -- Cement -----------------------------------------------------------------
  '252310': { sector: 'cement', productLabel: 'Cement clinker', route: 'standard', defaultEF: 0.81, indirectEF: 0.05, markupPct: 0.30 },
  '252321': { sector: 'cement', productLabel: 'White Portland cement', route: 'standard', defaultEF: 0.85, indirectEF: 0.06, markupPct: 0.30 },
  '252329': { sector: 'cement', productLabel: 'Other Portland cement', route: 'standard', defaultEF: 0.66, indirectEF: 0.05, markupPct: 0.30 },
  '252330': { sector: 'cement', productLabel: 'Aluminous cement', route: 'standard', defaultEF: 1.10, indirectEF: 0.07, markupPct: 0.30 },
  '252390': { sector: 'cement', productLabel: 'Other hydraulic cements', route: 'standard', defaultEF: 0.66, indirectEF: 0.05, markupPct: 0.30 },
  '2523':   { sector: 'cement', productLabel: 'Cement (CN 2523, generic)', route: 'standard', defaultEF: 0.72, indirectEF: 0.05, markupPct: 0.30 },

  // -- Iron & Steel -----------------------------------------------------------
  '720851': { sector: 'steel', productLabel: 'Hot-rolled flat steel, plates', route: 'BOF', defaultEF: 2.10, indirectEF: 0, markupPct: 0.30 },
  '7208':   { sector: 'steel', productLabel: 'Hot-rolled flat steel (CN 7208)', route: 'BOF', defaultEF: 2.10, indirectEF: 0, markupPct: 0.30 },
  '7210':   { sector: 'steel', productLabel: 'Coated flat steel (CN 7210)', route: 'BOF', defaultEF: 2.20, indirectEF: 0, markupPct: 0.30 },
  '7213':   { sector: 'steel', productLabel: 'Wire rod (CN 7213)', route: 'BOF', defaultEF: 1.95, indirectEF: 0, markupPct: 0.30 },
  '7214':   { sector: 'steel', productLabel: 'Other bars and rods (CN 7214)', route: 'BOF', defaultEF: 1.85, indirectEF: 0, markupPct: 0.30 },
  '7216':   { sector: 'steel', productLabel: 'Angles, shapes, sections (CN 7216)', route: 'BOF', defaultEF: 1.85, indirectEF: 0, markupPct: 0.30 },
  '7218':   { sector: 'steel', productLabel: 'Stainless steel ingots (CN 7218)', route: 'EAF', defaultEF: 3.50, indirectEF: 0, markupPct: 0.30 },
  '7219':   { sector: 'steel', productLabel: 'Stainless flat-rolled (CN 7219)', route: 'EAF', defaultEF: 3.40, indirectEF: 0, markupPct: 0.30 },
  '7301':   { sector: 'steel', productLabel: 'Sheet piling, sections (CN 7301)', route: 'BOF', defaultEF: 2.10, indirectEF: 0, markupPct: 0.30 },
  '7302':   { sector: 'steel', productLabel: 'Railway track material (CN 7302)', route: 'BOF', defaultEF: 2.05, indirectEF: 0, markupPct: 0.30 },

  // -- Aluminium --------------------------------------------------------------
  // Primary aluminium dominates CBAM defaults — reflects high electricity
  // intensity at the smelter (Hall–Héroult). Secondary (recycled) is much
  // lower but the regulation defaults to primary.
  '760110': { sector: 'aluminium', productLabel: 'Unwrought aluminium, not alloyed', route: 'primary smelter', defaultEF: 14.50, indirectEF: 0, markupPct: 0.30 },
  '760120': { sector: 'aluminium', productLabel: 'Unwrought aluminium alloys', route: 'primary smelter', defaultEF: 14.20, indirectEF: 0, markupPct: 0.30 },
  '7601':   { sector: 'aluminium', productLabel: 'Unwrought aluminium (CN 7601)', route: 'primary smelter', defaultEF: 14.50, indirectEF: 0, markupPct: 0.30 },
  '7604':   { sector: 'aluminium', productLabel: 'Aluminium bars, profiles (CN 7604)', route: 'primary smelter', defaultEF: 14.10, indirectEF: 0, markupPct: 0.30 },
  '7606':   { sector: 'aluminium', productLabel: 'Aluminium plates, sheets (CN 7606)', route: 'primary smelter', defaultEF: 13.90, indirectEF: 0, markupPct: 0.30 },
  '7608':   { sector: 'aluminium', productLabel: 'Aluminium tubes, pipes (CN 7608)', route: 'primary smelter', defaultEF: 13.80, indirectEF: 0, markupPct: 0.30 },

  // -- Fertilisers ------------------------------------------------------------
  '2808':   { sector: 'fertilisers', productLabel: 'Nitric acid', route: 'process', defaultEF: 5.50, indirectEF: 0.40, markupPct: 0.30 },
  '310210': { sector: 'fertilisers', productLabel: 'Urea', route: 'process', defaultEF: 1.65, indirectEF: 0.35, markupPct: 0.30 },
  '310221': { sector: 'fertilisers', productLabel: 'Ammonium sulphate', route: 'process', defaultEF: 1.20, indirectEF: 0.30, markupPct: 0.30 },
  '310230': { sector: 'fertilisers', productLabel: 'Ammonium nitrate', route: 'process', defaultEF: 3.20, indirectEF: 0.40, markupPct: 0.30 },
  '3102':   { sector: 'fertilisers', productLabel: 'Mineral nitrogen fertilisers (CN 3102)', route: 'process', defaultEF: 2.85, indirectEF: 0.35, markupPct: 0.30 },
  '3105':   { sector: 'fertilisers', productLabel: 'Mixed fertilisers (CN 3105)', route: 'process', defaultEF: 2.20, indirectEF: 0.30, markupPct: 0.30 },

  // -- Hydrogen ---------------------------------------------------------------
  '280410': { sector: 'hydrogen', productLabel: 'Hydrogen (grey, SMR)', route: 'SMR', defaultEF: 11.20, indirectEF: 0, markupPct: 0.30 },
  '2804':   { sector: 'hydrogen', productLabel: 'Hydrogen (CN 2804)', route: 'SMR', defaultEF: 11.20, indirectEF: 0, markupPct: 0.30 },

  // -- Electricity ------------------------------------------------------------
  // Electricity uses an origin-grid factor in the regulation; the value below
  // is a conservative benchmark for high-carbon grids.
  '271600': { sector: 'electricity', productLabel: 'Electrical energy', route: 'origin grid', defaultEF: 0.65, indirectEF: 0, markupPct: 0.30 },
  '2716':   { sector: 'electricity', productLabel: 'Electrical energy (CN 2716)', route: 'origin grid', defaultEF: 0.65, indirectEF: 0, markupPct: 0.30 },
};

/** Lookup helper — accepts CN code in either '252310' or '2523.10' form. */
export function lookupCNDefault(cnCode) {
  if (!cnCode) return null;
  const normalised = String(cnCode).replace(/[^0-9]/g, '');
  // Try most specific first (full code), then truncate two digits at a time.
  for (let len = normalised.length; len >= 4; len -= 2) {
    const key = normalised.slice(0, len);
    if (CN_CODE_DEFAULTS[key]) return { ...CN_CODE_DEFAULTS[key], matchedKey: key };
  }
  return null;
}
