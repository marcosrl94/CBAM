// ============================================================================
// Data-source catalogue — single source of truth for the "Data sources" panel
// ============================================================================
//
// Every input the engine consumes is registered here with: a stable id, a
// human label, the canonical URL, the date last refreshed, the cadence at
// which it should be refreshed, and whether the underlying data is live
// (fetched at runtime) or a bundled snapshot (refreshed by editing source).
// ============================================================================

export const DATA_SOURCES = [
  {
    id: 'eua-spot',
    label: 'EUA spot price (€/tCO2e)',
    provider: 'EEX Primary Auction Results',
    url: 'https://www.eex.com/en/market-data/environmental-markets/eua-primary-auction-spot-download',
    asOf: '2026-05-02',
    cadence: 'Weekly (Friday)',
    mode: 'snapshot',
    note: 'CBAM certificate price benchmark per Reg. 2023/956 Art. 21. Becomes live publication on the Commission CBAM page ahead of Feb 2027 sales platform.',
  },
  {
    id: 'cbam-certificate-price',
    label: 'CBAM certificate weekly price',
    provider: 'European Commission (DG TAXUD)',
    url: 'https://taxation-customs.ec.europa.eu/cbam_en',
    asOf: 'Pending — published from sales-platform launch',
    cadence: 'Weekly (Friday)',
    mode: 'pending',
    note: 'Official Commission publication. Replaces the EEX EUA proxy once live.',
  },
  {
    id: 'cn-code-defaults',
    label: 'CN-code default emission factors',
    provider: 'European Commission · Reg. (EU) 2023/956 Annex IV + Impl. 2025/486',
    url: 'https://eur-lex.europa.eu/eli/reg_impl/2025/486/oj',
    asOf: '2025-12-17',
    cadence: 'On regulatory amendment',
    mode: 'snapshot',
    note: 'Subset of the official defaults table covering most-imported CN codes. Refresh on each new implementing act.',
  },
  {
    id: 'world-bank-carbon-prices',
    label: 'Origin-country effective carbon prices',
    provider: 'World Bank Carbon Pricing Dashboard',
    url: 'https://carbonpricingdashboard.worldbank.org',
    asOf: '2026-05-08',
    cadence: 'Quarterly',
    mode: 'snapshot',
    note: 'Used for the CBAM Art. 9 third-country carbon-price credit. Methodology subject to delegated act expected Q1 2026.',
  },
  {
    id: 'fx-usd-eur',
    label: 'FX · USD → EUR',
    provider: 'Frankfurter (ECB reference rates)',
    url: 'https://api.frankfurter.dev/v1/latest?base=USD&symbols=EUR',
    asOf: 'live',
    cadence: 'Daily (ECB)',
    mode: 'live',
    note: 'Free, public, CORS-enabled. Falls back to snapshot if the network call fails.',
  },
  {
    id: 'ets-forecast',
    label: 'EU ETS price forecast 2026–2034',
    provider: 'Analyst consensus (illustrative)',
    url: '',
    asOf: '2026-05-08',
    cadence: 'Quarterly',
    mode: 'snapshot',
    note: 'Indicative consensus blend (ICIS / BNEF / Refinitiv). Forecasts beyond the current year are paid feeds; treat as illustrative.',
  },
  {
    id: 'phase-in',
    label: 'CBAM phase-in factors 2026–2034',
    provider: 'Reg. (EU) 2023/956 Art. 36',
    url: 'https://eur-lex.europa.eu/eli/reg/2023/956/oj',
    asOf: '2023-05-10',
    cadence: 'On regulatory amendment',
    mode: 'fixed',
    note: 'Schedule fixed by primary regulation; no recalibration unless amended.',
  },
];
