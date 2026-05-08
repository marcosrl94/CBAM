// ============================================================================
// EU ETS allowance (EUA) spot prices — recent weekly closes
// ============================================================================
//
// Source: EEX (European Energy Exchange) primary auction settlement prices,
// cross-referenced with ICE Endex secondary market closes. Public end-of-day
// data; aggregated into weekly averages.
//
// CBAM relevance: under Reg. (EU) 2023/956 Article 21, the price of CBAM
// certificates is set weekly by the Commission as the average closing price
// of EU ETS allowances on the Common Auction Platform. The CBAM certificate
// sales platform launches on 1 February 2027; until then, the EUA spot serves
// as the benchmark for engine calibration.
//
// Refresh: every Friday from EEX EUA Primary Auction Results. Replace the
// `weeklyAverages` array and bump `asOf`. The most recent value also drives
// the `currentEUR` field used as the engine's "live anchor".
// ============================================================================

export const EUA_SPOT_SNAPSHOT = {
  source: 'EEX EUA Primary Market (weekly auction average)',
  sourceUrl: 'https://www.eex.com/en/market-data/environmental-markets/eua-primary-auction-spot-download',
  asOf: '2026-05-02',
  currency: 'EUR',
  unit: '€/tCO2e',
  currentEUR: 76.40,
  weeklyAverages: [
    { weekStart: '2026-03-02', priceEUR: 72.15 },
    { weekStart: '2026-03-09', priceEUR: 73.80 },
    { weekStart: '2026-03-16', priceEUR: 74.55 },
    { weekStart: '2026-03-23', priceEUR: 75.20 },
    { weekStart: '2026-03-30', priceEUR: 75.10 },
    { weekStart: '2026-04-06', priceEUR: 74.85 },
    { weekStart: '2026-04-13', priceEUR: 75.95 },
    { weekStart: '2026-04-20', priceEUR: 76.70 },
    { weekStart: '2026-04-27', priceEUR: 76.40 },
  ],
  note: 'When the official Commission CBAM certificate price page goes live ahead of the Feb 2027 sales window, replace this snapshot with the weekly Commission publication (taxation-customs.ec.europa.eu/cbam_en).',
};

/** Lightweight accessor — the engine reads `currentEUR` to anchor 2026. */
export function getCurrentEUAPriceEUR() {
  return EUA_SPOT_SNAPSHOT.currentEUR;
}
