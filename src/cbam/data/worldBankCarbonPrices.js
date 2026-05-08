// ============================================================================
// World Bank Carbon Pricing Dashboard — origin-country effective carbon prices
// ============================================================================
//
// Source: World Bank Carbon Pricing Dashboard
//   https://carbonpricingdashboard.worldbank.org
//   "Compliance carbon pricing — annual" data product, instrument-level prices
//   converted to USD/tCO2e and aggregated by jurisdiction.
//
// Used for the CBAM Article 9 credit: where the producer in the country of
// origin has effectively paid a carbon price on the relevant emissions, that
// price is creditable against the CBAM certificate cost. The exact crediting
// methodology is subject to the delegated act expected in Q1 2026; until that
// act is published, the engine applies the credit linearly.
//
// Snapshot: 2026-05-08. Refresh by re-downloading the dashboard's CSV / Excel
// export and updating the `priceUSD` and `asOf` fields for each jurisdiction.
// ============================================================================

export const WORLD_BANK_CARBON_PRICES = {
  CN: {
    label: 'China',
    priceUSD: 13,
    instrument: 'National ETS (covering power, expanding to industrials)',
    asOf: '2026-05',
    note: 'CBAM-relevant export sectors (steel, aluminium) progressively brought into scope from 2024-2026.',
  },
  IN: {
    label: 'India',
    priceUSD: 0,
    instrument: 'No mandatory pricing in force',
    asOf: '2026-05',
    note: 'Carbon Credit Trading Scheme (CCTS) being phased in; no compliance price applicable to CBAM exports yet.',
  },
  TR: {
    label: 'Türkiye',
    priceUSD: 0,
    instrument: 'ETS in development (pilot phase)',
    asOf: '2026-05',
    note: 'Pilot ETS launched 2024; no binding price on CBAM-relevant industrial exports yet.',
  },
  RU: {
    label: 'Russia',
    priceUSD: 0,
    instrument: 'Sakhalin regional ETS (limited coverage)',
    asOf: '2026-05',
    note: 'No federal price; Sakhalin pilot does not cover CBAM export sectors.',
  },
  UA: {
    label: 'Ukraine',
    priceUSD: 0.3,
    instrument: 'Carbon tax (UAH 30/tCO2)',
    asOf: '2026-05',
    note: 'Token-level carbon tax; effective price near zero in USD terms.',
  },
  BR: {
    label: 'Brazil',
    priceUSD: 0,
    instrument: 'SBCE in development',
    asOf: '2026-05',
    note: 'Brazilian ETS (SBCE) approved late 2024, not yet in force for CBAM-relevant trade.',
  },
  KR: {
    label: 'South Korea',
    priceUSD: 9,
    instrument: 'K-ETS (Korea Emissions Trading Scheme)',
    asOf: '2026-05',
    note: 'KAU spot prices have softened versus 2023 highs; figure represents recent average.',
  },
  US: {
    label: 'United States',
    priceUSD: 0,
    instrument: 'No federal price; sub-national programmes (RGGI, California)',
    asOf: '2026-05',
    note: 'CBAM credit applies only to the share of production covered by sub-national pricing — typically zero for export-oriented industrial CN codes.',
  },
  MA: {
    label: 'Morocco',
    priceUSD: 0,
    instrument: 'No mandatory pricing in force',
    asOf: '2026-05',
    note: 'Voluntary carbon market only.',
  },
  EG: {
    label: 'Egypt',
    priceUSD: 0,
    instrument: 'No mandatory pricing in force',
    asOf: '2026-05',
    note: 'Voluntary market initiative announced 2022; no compliance price.',
  },
  JP: {
    label: 'Japan',
    priceUSD: 2,
    instrument: 'GX-ETS (voluntary phase) + carbon surcharge',
    asOf: '2026-05',
    note: 'Mandatory phase scheduled for 2026 onwards; effective price still low.',
  },
  TH: {
    label: 'Thailand',
    priceUSD: 0,
    instrument: 'Voluntary market, no compliance price',
    asOf: '2026-05',
    note: '',
  },
  VN: {
    label: 'Vietnam',
    priceUSD: 0,
    instrument: 'Domestic ETS in design phase',
    asOf: '2026-05',
    note: '',
  },
};

/** Source URL exposed for UI / disclaimer rendering. */
export const WORLD_BANK_DASHBOARD_URL = 'https://carbonpricingdashboard.worldbank.org';
export const WORLD_BANK_AS_OF = '2026-05-08';
