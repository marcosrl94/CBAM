// ============================================================================
// SAMPLE PORTFOLIO — illustrative client data for demos and resets
// ============================================================================
// Decoupled from `cbamEngine.js`: the engine is data-agnostic and does not
// reach for fixtures. The store seeds with this only when the user explicitly
// asks (Load sample portfolio / Reset to sample clients).
//
// Each import line carries its CN code so the engine routes through the
// granular Annex IV defaults; lines without a verified `actualEF` pick up
// the per-CN-code default (and from 2028, the +markupPct surcharge).
// ============================================================================

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
