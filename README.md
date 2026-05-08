# CBAM · BBVA Carbon-Edge

> POC de aplicativo CBAM + pricing de financiación verde para BBVA. Calcula la
> exposure financiera al Mecanismo de Ajuste en Frontera por Carbono (CBAM) de
> un importador corporativo, modela el coste de certificados y el working
> capital trimestral, y propone instrumentos de financiación BBVA dimensionados
> al perfil real del cliente.

## Tesis

CBAM entró en fase definitiva el 1 de enero de 2026. El primer surrender real
de certificados es el 30 de septiembre de 2027 sobre las importaciones de 2026,
y la plataforma central de venta arranca el 1 de febrero de 2027. Esto deja
2026 como **ventana de oro**: los clientes corporativos están operando ya bajo
obligación financiera real pero todavía no han desembolsado, y necesitan
forecastear, optimizar y estructurar financiación. El diferencial de BBVA
frente a fintechs MRV (Sprih, IntegrityNext, Carboneer) y consultoras Big4 es
**cerrar el loop dato-de-emisiones → pricing-de-financiación**: ningún
proveedor MRV puro puede hacerlo.

## Lo que entrega el aplicativo

Dos vistas con el mismo backend de datos:

- **Vista cliente corporativo** — KPIs de coste 2026/2030/2034 con bandas
  P10–P90 de Monte Carlo, gráfica de proyección a 2034, cockpit de working
  capital trimestral con la regla 50% del Art. 22(2), tabla editable de
  importaciones (sector, CN code, origen, EF, ruta de producción), motor de
  matchmaking de productos BBVA.
- **Vista BBVA Relationship Manager** — cockpit de cartera, ranking por
  exposure 2030, peak working capital con rango P10–P90 por cliente, panel de
  acciones prioritarias, narrativa de Pillar 2 transition risk capital.
- **Indicative term sheet imprimible** — Sustainability-Linked Loan con
  ratchet de margen, KPI definido (weighted-average embedded EF), CBAM
  linkage rationale con números reales del cliente y dimensionado del WC Line
  al 110% del P90 peak.
- **Panel de Data Sources** — trazabilidad explícita de cada input del motor
  con provider, fecha de refresco y mode (live / snapshot / regulation).

## Motores

| Motor | Qué hace | Archivo |
|---|---|---|
| CBAM cost | EF por CN code con fallback sectorial, indirect emissions per Annex II, +30% markup desde 2028, crédito por carbon price del país de origen | [`src/cbam/cbamEngine.js`](src/cbam/cbamEngine.js) |
| Cash-flow trimestral | Regla 50% Art. 22(2), surrender Q3 anual, FIFO de lots, seasonality configurable | [`src/cbam/cashflowEngine.js`](src/cbam/cashflowEngine.js) |
| Monte Carlo | Random walk en log-space sobre el path ETS, P10/P50/P90 propagados a coste anual y peak WC | [`src/cbam/monteCarloEngine.js`](src/cbam/monteCarloEngine.js) |

## Datos

| Input | Fuente | Mode |
|---|---|---|
| Default emission factors por CN code | Reg. 2023/956 Annex IV + Impl. 2025/486 | Snapshot |
| Origin-country carbon prices | World Bank Carbon Pricing Dashboard | Snapshot |
| EUA spot weekly | EEX Primary Auction Results | Snapshot |
| CBAM certificate price | DG TAXUD (publicación oficial) | Pending — desde feb 2027 |
| FX USD→EUR | Frankfurter (ECB) | **Live** con fallback |
| Forecast ETS 2027–2034 | Consensus blend (ICIS / BNEF / Refinitiv) | Snapshot |
| Phase-in 2026–2034 | Reg. 2023/956 Art. 36 | Fixed by regulation |

Cada bloque de constantes en el motor lleva comentario con la fuente, la fecha
de última revisión y la cadencia recomendada de refresco. Política explícita
en cabecera de [`cbamEngine.js`](src/cbam/cbamEngine.js): los números son
ilustrativos pero la signatura del engine es estable; reemplazar valores no
implica tocar lógica.

## Stack

- Vite 8 + React 19 + Tailwind 4
- recharts (gráficas), lucide-react (iconografía)
- Sin backend — todo cliente, snapshots bundleados + un único feed live (FX)
- Build estático: 670 kB JS gzipped, 18 kB CSS gzipped

```bash
npm install
npm run dev      # vite dev server
npm run build    # producción (output en dist/)
npm run lint     # eslint
npm run preview  # serve dist/ localmente
```

No requiere variables de entorno. La llamada a Frankfurter se hace desde el
browser y degrada gracefully a snapshot si falla.

## Estructura

```
src/cbam/
  ClientView.jsx          Vista corporate
  RMView.jsx              Vista BBVA RM
  TermSheet.jsx           Term sheet printable (portal modal + print CSS)
  Header.jsx              Toggle de rol
  cbamEngine.js           Cost calc + sectores + ETS path + COUNTRY_DEFAULTS
  cashflowEngine.js       Proyección trimestral 50% rule + Q3 surrender
  monteCarloEngine.js     P10/P50/P90 sobre path ETS
  DataSourcesPanel.jsx    Trazabilidad de inputs
  data/
    cnCodeDefaults.js     ~30 entradas CN-code → {EF directo, indirecto, ruta, markup}
    worldBankCarbonPrices.js  13 países con precio efectivo + nota
    euaSpot.js            Snapshot 9 semanas EUA + currentEUR
    sources.js            Catálogo de provenance
  feeds/
    fxFeed.js             Frankfurter (ECB) live + fallback 0.92
```

## Estado

POC en repo nuevo. Build limpio, lint limpio, sin tests aún. Visualmente
acabado para presentar a BBVA CIB Sustainability como propuesta de valor.

**Hecho:**
- Motor CBAM con CN-code routing + indirect emissions + markup correcto
- Cash-flow trimestral con FIFO de lots y regla 50%
- Monte Carlo con bandas P10/P50/P90 propagadas
- Term sheet imprimible (Cmd+P → Save as PDF)
- Panel de data sources con FX live
- Seasonality configurable (4 presets)
- Cliente custom: vista RM con 4 clientes ejemplo

**Pendiente (no bloqueante):**
- Tests automatizados (sobre todo del cashflow engine y el MC)
- Persistencia: hoy todo es state in-memory + SAMPLE_CLIENTS hardcoded
- Slider para σ del Monte Carlo en sala
- Web Worker para MC cuando el RM portfolio crezca
- Live pull de EUA spot + CBAM cert price (necesita backend / build-time fetch)

## Disclaimer

Aplicativo demo. Los datos numéricos son ilustrativos calibrados a fuentes
públicas y conforme al espíritu del reglamento; cualquier decisión vinculante
de pricing, RWA o compromiso comercial requiere recalibrar contra la última
publicación oficial de la Comisión y los feeds de mercado contratados.

---

Marcos Rodríguez — `marcos.rodriguez@nfq.es`
