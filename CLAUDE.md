# CBAM · Contexto para Claude

POC de aplicativo CBAM + pricing de financiación verde para BBVA. Vive en
`Apps/2. Plataformas/CBAM/` (sub-categoría "Plataformas" del ecosistema). Repo
remoto: [github.com/marcosrl94/CBAM](https://github.com/marcosrl94/CBAM).

## 1. Contexto y objetivo

**Para quién:** propuesta de valor para BBVA CIB Sustainable Finance Solutions.
**Qué problema resuelve:** los clientes corporativos de BBVA empiezan a
acumular obligación CBAM en 2026, pero el primer surrender real es 30 sept
2027 y la plataforma central de venta arranca 1 feb 2027. Hay una **ventana
de 2026** para posicionar a BBVA como partner que cierra el loop dato-de-
emisiones → pricing-de-financiación, antes de que Big4 + fintechs MRV
(Sprih, IntegrityNext, Carboneer) ocupen el espacio.

**Qué produce el aplicativo:**
- Vista cliente corporativo: cockpit de exposure CBAM con bandas P10–P90,
  cash-flow trimestral, matchmaking de productos BBVA (SLL, WC Line, Supplier
  Decarbonisation Finance, Green Bond).
- Vista BBVA RM: cartera ranked por exposure, peak WC con rango por cliente,
  panel de Pillar 2 transition risk add-on.
- Term sheet imprimible (Cmd+P → PDF) de Sustainability-Linked Loan con KPI
  CBAM-aligned (weighted-average embedded EF, ratchet de margen).

**Diferencial frente a competencia:** el cierre del loop con financiación.
Big4 venden CBAM advisory bundleado con sus tools; fintechs venden MRV puro.
BBVA puede vender el matchmaking y el dimensionado del WC Line al P90 peak —
esto requiere ser banco *y* tener motor de cálculo, que ningún proveedor
único cubre.

## 2. Stack técnico

- **Frontend:** Vite 8 + React 19 + Tailwind 4 (artifact embebible, sin
  backend). recharts para gráficas, lucide-react para iconos.
- **Build:** `npm run build` produce `dist/` estático code-split.
  Bundle inicial ~184 kB (58 kB gz); recharts + deps comunes en un chunk
  compartido ~361 kB (107 kB gz) que entra al cargar la primera vista;
  `TermSheet`, `ClientEditor`, `ImportLineEditor` en chunks de 4–20 kB
  por demanda. Se puede embeber vía iframe + SSO en el portal de BBVA
  Net Cash o servir como standalone.
- **Sin variables de entorno requeridas.** La única llamada de red es a
  Frankfurter (USD→EUR, ECB reference rates) que es free + CORS-enabled +
  con fallback a snapshot 0.92 si falla.
- **Comandos:**
  - `npm install`
  - `npm run dev` — vite dev server
  - `npm run build` — bundle de producción
  - `npm run lint` — eslint
  - `npm run test` — vitest (CI mode), `npm run test:watch` para iterar
  - `npm run preview` — sirve `dist/`

## 3. Estado actual y próximos pasos

**Commit de referencia:** `060d929` (constructible from zero · empty-state onboarding + code-splitting).

**Hecho ✅:**
- Motor CBAM con lookup por CN code (Annex IV) + fallback sectorial, indirect
  emissions per Annex II, +30% markup desde 2028, crédito Art. 9 por carbon
  price del país de origen.
- Cashflow trimestral con regla 50% Art. 22(2), surrender Q3 anual, FIFO de
  lots, seasonality configurable (4 presets).
- Monte Carlo sobre el path ETS (random walk log-space, σ=22% default, 500
  trials) con P10/P50/P90 propagados a costes anuales y peak working capital.
- **Slider σ Monte Carlo** (15–30%) en ClientView + RMView; el TermSheet
  hereda la σ activa vía prop `mcVol` y el footer de metodología la cita.
- Panel de Data Sources con FX live (Frankfurter) + snapshots de EUA spot
  (EEX), World Bank Carbon Pricing Dashboard, CN-code defaults, ETS forecast.
- Term sheet imprimible vía portal modal + print CSS, con linkage rationale
  CBAM, peak WC sizing y P10–P90 range del MC.
- Botones "Generate term sheet" en RM view y "View indicative term sheet" en
  ClientView.
- **Persistencia multi-cliente**: store con localStorage (`cbam.clients.v1`),
  CRUD de clientes y líneas de import vía modal portals (`ClientEditor`,
  `ImportLineEditor`), `ClientSwitcher` en header, export/import de
  portfolio en JSON con validación. **Default state = empty** — los seed
  fixtures viven en `data/sampleClients.js` y solo entran vía
  `loadSampleClients()` (CTA explícito en empty states + en `ClientSwitcher`).
- **Empty-state onboarding**: cuando el portfolio está vacío,
  `ClientView` muestra hero "Set up your CBAM profile" (3 CTAs: profile /
  load sample / import JSON) y `RMView` muestra "Your portfolio is empty"
  (3 CTAs: add corporate / import / load sample). Ambos roles pueden
  sembrar — el motor y el store son idénticos por debajo. Cuando hay
  cliente pero `imports.length === 0`, la tabla de imports muestra empty
  state secundario con CTA "Add your first import line".
- **Code-splitting**: `ClientView` y `RMView` lazy-loaded en `App.jsx`;
  `TermSheet`, `ClientEditor`, `ImportLineEditor` lazy-loaded dentro de
  cada vista. Bundle inicial ~58 kB gz (vs 200 kB gz monolítico previo);
  recharts y deps comunes hoisted en chunk vendor compartido.
- **Test suite (vitest)**: 25 tests cubriendo cashflowEngine (Art. 22(1)/(2),
  FIFO, seasonality presets, pricePath override) y monteCarloEngine
  (invariantes P10≤P50≤P90, anchor 2026 colapsado, σ-sensitivity, vol/trials
  metadata). Scripts `npm run test` y `npm run test:watch`.
- **Estilismo E6.0**: tokens (canvas/panel/ink/NFQ) + Inter/JetBrains Mono +
  primitives Card/Stat/KpiCard/Pill/MicroLabel + KPI hero rows + segmented
  controls pill + Header rebuild + TermSheet rewrite. Mismo lenguaje visual
  que `@e60/ui` para que el demo lea como sibling de la plataforma.

**Pendiente 🚧 (no bloqueante para la propuesta):**
- Web Worker para MC en RM view cuando la cartera crezca >10 clientes.
- Pull live del precio CBAM oficial de la Comisión (cuando se publique desde
  feb 2027) — requiere build-time fetch o backend ETL.
- Backend de persistencia (post-localStorage): cuando entre uso real, mover
  el store a una API con auth.
- Onboarding wizard chained: tras "Set up profile" en empty state, abrir
  automáticamente ImportLineEditor para guiar al primer KPI sin click extra.
  Hoy son dos clicks separados (decisión consciente — más en control).

**Decisiones abiertas:**
- ¿Branding final? Usamos "Carbon·Edge" como nombre del producto interno.
  Si BBVA quiere otro nombre, está en `Header.jsx` y `TermSheet.jsx`.
- ¿Modelo de despliegue? Vercel/Netlify es trivial; embedding en BBVA Net
  Cash necesita SSO + iframe + revisión IT de BBVA.

## Cómo trabajar en este proyecto con Claude

**Reglas de la casa:**
- Antes de cerrar cualquier cambio: `npm run lint && npm run test && npm run build`.
  HEAD pasa los tres con 0 warnings; mantenerlo así.
- **No commitear sin confirmación explícita** del usuario.
- Para refresco de datos: editar el archivo correspondiente en `src/cbam/data/`
  y bumpear `asOf`. La firma del motor es estable; reemplazar valores no debe
  tocar lógica.
- Sourcing: cualquier constante numérica nueva lleva comentario con fuente +
  fecha de revisión + cadencia esperada (ver patrón en `cbamEngine.js`).
- No introducir backwards-compat shims ni feature flags. El proyecto es POC,
  los cambios son frescos.
- Comentarios: solo cuando el *por qué* sea no-obvio. El qué se infiere del
  código.
- **Estilismo E6.0** (alineado con `@e60/ui`): canvas `#f4f4f6` + panels
  `#fff` + ink scale 5-step + acentos NFQ (red/orange/blue/purple/green) +
  Inter (body/headers) + JetBrains Mono (micro-labels uppercase
  `tracking-[0.12em]`). Componentes en `ui.jsx`: `Card`, `Stat`, `KpiCard`,
  `Pill`, `MicroLabel`. Sin Tiempos / Söhne / navy / cream / teal — quedaron
  fuera en `c95f4b0`. Tampoco Source Serif 4 / Inter Tight: el `<style>`
  global que los inyectaba en `App.jsx` se eliminó en `060d929` (forzaba
  serif en `h1/h2/h3`). Inter se carga una sola vez vía `index.html` +
  `index.css`; no añadir más font-faces. Sin emojis ni gradientes en producción.
- **Charts**: paleta cíclica vía `chartSeriesFills`
  (blue → orange → purple → green → red). No introducir nuevos hex inline.
- **Tests**: cualquier cambio en `cashflowEngine` o `monteCarloEngine` debe
  ir con su test correspondiente en `src/cbam/__tests__/`. Property tests
  preferidos sobre tests con seed (P10≤P50≤P90, monotonicidad σ, anchor
  determinista) — más resistentes y más expresivos.

**Donde está cada cosa:**
- Cálculos: `src/cbam/cbamEngine.js`, `cashflowEngine.js`, `monteCarloEngine.js`.
- Datos calibrables: `src/cbam/data/`.
- Feed live (FX): `src/cbam/feeds/fxFeed.js`.
- UI por rol: `ClientView.jsx`, `RMView.jsx`.
- Persistencia: `src/cbam/store/clientsStore.js` (localStorage,
  `useSyncExternalStore`; default empty + `loadSampleClients` /
  `resetToEmpty` actions) y `portfolioIO.js` (download / file-pick).
- Seed fixtures: `src/cbam/data/sampleClients.js` (4 corporates).
  **No referenciar desde el motor** — el engine es data-agnostic; las
  fixtures solo entran al store vía CTA explícito del usuario.
- Editores modales: `ClientEditor.jsx`, `ImportLineEditor.jsx`, `ClientSwitcher.jsx`.
- Empty states: `ClientEmptyState` (final de `ClientView.jsx`) y
  `RMEmptyState` (final de `RMView.jsx`).
- Print artifact: `TermSheet.jsx` (portal a `body`, print CSS oculta el resto).
- Trazabilidad: `DataSourcesPanel.jsx` + `data/sources.js`.
- Design tokens + primitives: `src/cbam/theme.js` (canvas/panel/ink/NFQ +
  radii/shadows/fonts) y `src/cbam/ui.jsx` (Card, Stat, KpiCard, Pill, MicroLabel).
- Tests: `src/cbam/__tests__/cashflowEngine.test.js`, `monteCarloEngine.test.js`.

**Frame regulatorio (referencia rápida):**
- Reg. (UE) 2023/956 — base CBAM (Art. 21 precio cert, Art. 22 surrender +
  50% rule, Art. 36 phase-in).
- Reg. Implementación 2025/486 — verificación, registry, default values.
- Reg. Omnibus 2025/2083 — simplificación, threshold 50 t/año.
- Actos de la Comisión 17 dic 2025 — calibración default values.
- Acto delegado pendiente Q1 2026 — metodología crédito Art. 9 (carbon price
  tercer país).
