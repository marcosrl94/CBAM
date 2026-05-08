// ============================================================================
// E6.0-aligned design tokens
// ============================================================================
// Source of truth for visual decisions. Mirrors the token shape of E6.0's
// `@e60/ui` package (canvas / panel / ink scale / NFQ accents) so the
// CBAM standalone reads as a sibling of the platform.
//
// Legacy keys (`ink`, `paper`, `cream`, `accent`, `accentDark`, `warn`,
// `alert`, `muted`, `rule`, `navy`, `steel`) are preserved but remapped to
// E6.0 tokens; new code should prefer the structured exports below.
// ============================================================================

// Canvas & surfaces
export const canvas = '#f4f4f6';
export const canvasEdge = '#ebebee';
export const panel = '#ffffff';
export const panelSoft = '#fafafb';
export const panelHover = '#f7f7f9';

// Lines
export const line = '#e7e7eb';
export const lineSoft = '#f0f0f3';

// Ink (text scale, 1=darkest)
export const ink = {
  1: '#0b0d12',
  2: '#424653',
  3: '#6e7280',
  4: '#9b9ea7',
  5: '#c2c4cb',
};

// Sidebar / topbar surfaces
export const side = {
  bg: '#f8f8fa',
  border: '#e9e9ec',
};

// NFQ accent palette (matches @e60/ui tokens.nfq)
export const nfq = {
  red: '#f04e3e',     redSoft: '#ff7868',  redBg: '#fef0ee',
  orange: '#ff8c2d',  orangeSoft: '#ffa75e', orangeBg: '#fef3e8',
  blue: '#3b6cf3',    blueSoft: '#6b8ef5',  blueBg: '#ecf0fe',
  purple: '#7a4cf0',  purpleSoft: '#9d77f5', purpleBg: '#f0eafe',
  green: '#1aa56a',   greenSoft: '#4cc28a', greenBg: '#e8f7ee',
  amber: '#d99514',
};

// Status semantics
export const status = {
  ok: nfq.green,
  warn: nfq.amber,
  err: nfq.red,
  info: nfq.blue,
};

// ============================================================================
// Compat shim — the original flat `colors` export, remapped to E6.0 tokens.
// Existing call sites keep working without rewrites; any new code should
// import structured tokens above.
// ============================================================================
export const colors = {
  // Legacy keys → E6.0 mapping
  ink: ink[1],            // darkest text
  navy: ink[2],           // mid text
  steel: ink[3],          // muted text
  paper: panel,           // panel surface
  cream: panelSoft,       // soft panel surface (was the warm cream)
  canvas,                 // page background
  accent: nfq.blue,       // primary accent (was teal)
  accentDark: ink[1],     // strongest emphasis
  accentBg: nfq.blueBg,   // accent on light surface
  warn: nfq.amber,        // amber status / warn pill
  warnBg: nfq.orangeBg,
  alert: nfq.red,         // red status / errors
  alertBg: nfq.redBg,
  ok: nfq.green,
  okBg: nfq.greenBg,
  muted: ink[3],          // muted text
  mutedSoft: ink[4],
  rule: line,             // line / divider
  ruleSoft: lineSoft,
  panelHover,
};

/**
 * Cyclical palette for chart series. Drawn from the NFQ accents so charts
 * read as native E6.0. Order mirrors the icon-color sequence in KpiCards
 * (blue → orange → purple → green → red).
 */
export const chartSeriesFills = [
  nfq.blue,
  nfq.orange,
  nfq.purple,
  nfq.green,
  nfq.red,
];

// Radii / shadow / typography tokens (re-exported as constants so JSX can
// reach for them without pulling in the whole tokens object).
export const radii = { sm: '4px', md: '6px', lg: '10px', xl: '14px' };
export const shadows = {
  sm: '0 1px 2px rgba(11, 13, 18, 0.04)',
  md: '0 1px 3px rgba(11, 13, 18, 0.06), 0 0 0 1px rgba(11, 13, 18, 0.02)',
  lg: '0 4px 12px rgba(11, 13, 18, 0.08)',
  pop: '0 8px 24px rgba(11, 13, 18, 0.12)',
};
export const fonts = {
  body: 'Inter, -apple-system, system-ui, sans-serif',
  mono: '"JetBrains Mono", "SF Mono", monospace',
};
