import { useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Printer, X } from 'lucide-react';
import { CBAM_SECTORS, COUNTRY_DEFAULTS, calculateCBAMCost, getEffectiveEF } from './cbamEngine.js';
import { colors } from './theme.js';
import { formatEUR } from './format.js';
import { useFX } from './feeds/fxFeed.js';
import { projectCBAMCashflow } from './cashflowEngine.js';
import { runMonteCarlo } from './monteCarloEngine.js';

/**
 * Indicative term sheet — printable, embedded modal.
 *
 * Inputs:
 *   client   — full client object (incl. imports[])
 *   deal     — optional overrides; defaults derive from CBAM exposure
 *   mcVol    — annualised log-space σ for Monte Carlo (default 0.22). Passed
 *              from the calling view's slider so the printed P10–P90 bands
 *              match what the RM showed in-session.
 *   onClose  — close handler
 *
 * Print behaviour: the component injects @media print rules that hide the
 * toolbar and the rest of the app, leaving only the document. The RM clicks
 * Print, the OS print dialog opens, "Save as PDF" produces the deliverable.
 */
export function TermSheet({ client, deal: dealOverride, mcVol = 0.22, onClose }) {
  const today = useMemo(() => new Date(), []);
  const fx = useFX();
  const reference = useMemo(
    () => `TS-${client.cif.replace(/[^A-Z0-9]/gi, '')}-${formatRef(today)}`,
    [client.cif, today],
  );

  const exposure = useMemo(() => {
    const cost2026 = client.imports.reduce((s, i) => s + calculateCBAMCost(i, 2026, true, fx.rate), 0);
    const cost2030 = client.imports.reduce((s, i) => s + calculateCBAMCost(i, 2030, true, fx.rate), 0);
    const cost2034 = client.imports.reduce((s, i) => s + calculateCBAMCost(i, 2034, true, fx.rate), 0);
    const totalTonnes = client.imports.reduce((s, i) => s + i.tonnes, 0);
    const totalEmbedded = client.imports.reduce(
      (s, i) => s + i.tonnes * getEffectiveEF(i, 2026, true),
      0,
    );
    const verifiedTonnes = client.imports.filter(i => i.hasVerification).reduce((s, i) => s + i.tonnes, 0);
    const weightedEF = totalEmbedded / Math.max(1, totalTonnes);
    const sectorMix = aggregateBy(client.imports, i => CBAM_SECTORS[i.sector].label);
    const originMix = aggregateBy(client.imports, i => COUNTRY_DEFAULTS[i.origin]?.label ?? i.origin);
    const cashflow = projectCBAMCashflow(client.imports, { fxRate: fx.rate });
    const mc = runMonteCarlo(client.imports, { fxRate: fx.rate, trials: 300, vol: mcVol });
    return {
      cost2026,
      cost2030,
      cost2034,
      totalTonnes,
      totalEmbedded,
      verifiedShare: verifiedTonnes / Math.max(1, totalTonnes),
      weightedEF,
      sectorMix,
      originMix,
      peakWorkingCapitalEUR: cashflow.totals.peakWorkingCapitalEUR,
      peakPeriod: cashflow.totals.peakPeriod,
      peakWCp10: mc.peakWCPercentiles.p10,
      peakWCp90: mc.peakWCPercentiles.p90,
      mcTrials: mc.trials,
      mcVol: mc.vol,
    };
  }, [client, fx.rate, mcVol]);

  const deal = useMemo(() => {
    const ticket = round100k(exposure.cost2030 * 1.5);
    return {
      facility: 'Sustainability-Linked Term Loan Facility',
      currency: 'EUR',
      amount: ticket,
      tenor: '5 years (60 months)',
      drawdown: 'Single drawdown within 90 days of signing',
      repayment: 'Bullet at maturity, with optional voluntary prepayment at par',
      baseRate: '3-month EURIBOR',
      baseSpread: 215,
      stepDown: 25,
      stepUp: 15,
      kpiTarget: 15,
      kpiBaseline: exposure.weightedEF,
      kpiTestDate: 'FY2028 audited figures, tested in Q2 2029',
      ...(dealOverride ?? {}),
    };
  }, [exposure, dealOverride]);

  // Lock background scroll while modal is open and allow Esc to close.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return createPortal(
    <div
      className="ts-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Indicative term sheet"
    >
      <style>{PRINT_CSS}</style>

      {/* Toolbar — hidden when printing */}
      <div className="ts-toolbar" style={{ backgroundColor: colors.ink, color: '#fff' }}>
        <div className="text-[10px] uppercase tracking-[0.14em]" style={{ color: '#9b9ea7', fontWeight: 500 }}>
          Indicative term sheet · {reference}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="px-3 py-1.5 text-xs flex items-center gap-1.5"
            style={{ backgroundColor: '#fff', color: colors.ink, fontWeight: 600, borderRadius: '999px' }}
          >
            <Printer className="w-3 h-3" /> Print / Save as PDF
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs flex items-center gap-1.5"
            style={{ border: '1px solid rgba(255,255,255,0.3)', color: '#fff', borderRadius: '999px' }}
          >
            <X className="w-3 h-3" /> Close
          </button>
        </div>
      </div>

      {/* Document */}
      <div className="ts-doc-wrap" style={{ backgroundColor: '#f4f4f6' }}>
        <article className="ts-doc" style={{ backgroundColor: colors.paper, color: colors.ink }}>

          {/* Letterhead */}
          <header className="ts-letterhead" style={{ borderColor: colors.ink }}>
            <div>
              <div className="text-2xl tracking-tight" style={{ fontWeight: 700, letterSpacing: '-0.02em' }}>
                Carbon<span style={{ color: colors.accent }}>·</span>Edge
              </div>
              <div className="text-[10px] uppercase tracking-[0.22em] mt-0.5" style={{ color: colors.muted }}>
                BBVA CIB · Sustainable Finance Solutions
              </div>
            </div>
            <div className="text-right text-[10px] uppercase tracking-[0.2em]" style={{ color: colors.muted }}>
              <div>Strictly private &amp; confidential</div>
              <div className="mt-1">Indicative · non-binding</div>
            </div>
          </header>

          {/* Title block */}
          <section className="ts-title">
            <div className="text-[10px] uppercase tracking-[0.22em]" style={{ color: colors.muted }}>
              {deal.facility}
            </div>
            <h1 className="ts-h1" style={{ fontWeight: 700, letterSpacing: '-0.02em' }}>
              Indicative term sheet
            </h1>
            <div className="ts-meta" style={{ color: colors.muted }}>
              <span>Reference {reference}</span>
              <span aria-hidden="true">·</span>
              <span>Issued {formatHumanDate(today)}</span>
              <span aria-hidden="true">·</span>
              <span>Valid until {formatHumanDate(addDays(today, 30))}</span>
            </div>
          </section>

          {/* Parties */}
          <Block title="1 · Parties">
            <KeyValueGrid rows={[
              ['Lender', 'Banco Bilbao Vizcaya Argentaria, S.A. (acting through BBVA CIB Sustainable Finance)'],
              ['Borrower', `${client.name}${client.cif ? ` (CIF ${client.cif})` : ''}`],
              ['Sustainability coordinator', 'BBVA CIB · Sustainable Finance Solutions'],
              ['Sustainability KPI verifier', 'Independent third-party assurance provider, Limited Assurance under ISAE 3410'],
            ]} />
          </Block>

          {/* Facility summary */}
          <Block title="2 · Facility summary">
            <KeyValueGrid rows={[
              ['Facility type', deal.facility],
              ['Purpose', 'General corporate purposes including (i) coverage of CBAM certificate purchases, (ii) capex linked to the supplier-decarbonisation programme, and (iii) refinancing of existing bilateral indebtedness'],
              ['Currency', deal.currency],
              ['Commitment amount', formatEUR(deal.amount)],
              ['Tenor', deal.tenor],
              ['Drawdown', deal.drawdown],
              ['Repayment profile', deal.repayment],
              ['Ranking', 'Senior unsecured, pari passu with existing senior unsecured indebtedness'],
            ]} />
          </Block>

          {/* Pricing & ratchet */}
          <Block title="3 · Pricing &amp; sustainability margin ratchet">
            <KeyValueGrid rows={[
              ['Reference rate', deal.baseRate],
              ['Initial margin', `${deal.baseSpread} bps over reference rate`],
              ['Margin step-down (KPI achieved)', `−${deal.stepDown} bps`],
              ['Margin step-up (KPI missed)', `+${deal.stepUp} bps`],
              ['Margin neutrality (KPI partially met)', '0 bps adjustment'],
              ['Test mechanic', 'Annual margin reset on the anniversary of signing, based on the most recent verified KPI report'],
            ]} />

            <div className="ts-ratchet">
              <table className="ts-table">
                <thead>
                  <tr>
                    <th>Scenario</th>
                    <th>KPI achievement</th>
                    <th className="text-right">All-in margin</th>
                    <th className="text-right">Annual interest cost (illustrative)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Outperform</td>
                    <td>≥ {deal.kpiTarget}% reduction by FY2028</td>
                    <td className="text-right" style={{ color: colors.accentDark }}>
                      {deal.baseSpread - deal.stepDown} bps
                    </td>
                    <td className="text-right">
                      {formatEUR(deal.amount * (deal.baseSpread - deal.stepDown) / 10000)}
                    </td>
                  </tr>
                  <tr>
                    <td>Base</td>
                    <td>Below trigger, above floor</td>
                    <td className="text-right">{deal.baseSpread} bps</td>
                    <td className="text-right">
                      {formatEUR(deal.amount * deal.baseSpread / 10000)}
                    </td>
                  </tr>
                  <tr>
                    <td>Underperform</td>
                    <td>No measurable progress vs. baseline</td>
                    <td className="text-right" style={{ color: colors.alert }}>
                      {deal.baseSpread + deal.stepUp} bps
                    </td>
                    <td className="text-right">
                      {formatEUR(deal.amount * (deal.baseSpread + deal.stepUp) / 10000)}
                    </td>
                  </tr>
                </tbody>
              </table>
              <div className="ts-note" style={{ color: colors.muted }}>
                Annual interest cost shown over reference rate only, full drawdown assumed, for illustration.
              </div>
            </div>
          </Block>

          {/* KPI */}
          <Block title="4 · Sustainability performance target (SPT)">
            <KeyValueGrid rows={[
              ['KPI', 'Weighted-average embedded emission factor across CBAM-scope imports (tCO₂e per tonne imported)'],
              ['Calculation method', 'Volume-weighted average of verified embedded emissions for CBAM goods imported into the EU during the relevant calendar year, computed in accordance with Reg. (EU) 2023/956'],
              ['Baseline', `${exposure.weightedEF.toFixed(2)} tCO₂e/t (calendar year 2025 verified imports)`],
              ['Target', `≥ ${deal.kpiTarget}% reduction vs. baseline`],
              ['Test date', deal.kpiTestDate],
              ['Verification', 'Limited assurance from an accredited verifier (ISAE 3410), report to be delivered to the Lender within 120 days of period end'],
              ['Information undertaking', 'Annual Sustainability Performance Report mirroring CBAM declaration data, addressed to the Lender'],
            ]} />
          </Block>

          {/* CBAM context */}
          <Block title="5 · CBAM linkage rationale">
            <p className="ts-para" style={{ color: colors.ink }}>
              The KPI is materially aligned with the Borrower&apos;s exposure under the EU Carbon Border Adjustment
              Mechanism. Reducing the weighted-average embedded emission factor of CBAM-scope imports translates
              one-for-one into a reduction of certificate-surrender obligations from 2027 onwards, and progressively
              de-risks the Borrower as phase-in advances toward 100% in 2034.
            </p>
            <div className="ts-grid-3">
              <ExposureCell label="CBAM cost · 2026" value={formatEUR(exposure.cost2026)} note="Phase-in 2.5%" />
              <ExposureCell label="CBAM cost · 2030" value={formatEUR(exposure.cost2030)} note="Phase-in 48.5%" />
              <ExposureCell label="CBAM cost · 2034" value={formatEUR(exposure.cost2034)} note="Phase-in 100%" />
            </div>

            <p className="ts-para" style={{ color: colors.ink, marginTop: 18 }}>
              Working capital sizing — the Reg. 2023/956 Art. 22(2) 50% quarterly holding rule (active from
              Q2 2027) and the 30 September annual surrender produce the following projected peak certificate
              working-capital outstanding under the central ETS path, with P10–P90 bounds from a Monte Carlo
              simulation ({exposure.mcTrials} trials, σ {Math.round(exposure.mcVol * 100)}%).
            </p>
            <div className="ts-grid-3">
              <ExposureCell
                label="Peak working capital (P50)"
                value={formatEUR(exposure.peakWorkingCapitalEUR)}
                note={exposure.peakPeriod ? `Peak quarter ${exposure.peakPeriod}` : '—'}
              />
              <ExposureCell
                label="Peak P10 — P90 range"
                value={`${formatEUR(exposure.peakWCp10)} – ${formatEUR(exposure.peakWCp90)}`}
                note="Monte Carlo · ETS price uncertainty"
              />
              <ExposureCell
                label="Indicative WC headroom"
                value={formatEUR(exposure.peakWCp90 * 1.10)}
                note="Sized at 110% of P90 peak"
              />
            </div>

            <div className="ts-grid-2" style={{ marginTop: 16 }}>
              <MixCell title="Sector mix (by tonnage)" entries={exposure.sectorMix} />
              <MixCell title="Origin mix (by tonnage)" entries={exposure.originMix} />
            </div>
            <div className="ts-note" style={{ color: colors.muted }}>
              Verified-emissions coverage at signing: {Math.round(exposure.verifiedShare * 100)}% of imported tonnage.
              Increasing coverage to ≥80% within 18 months of signing is a documentation undertaking under §6.
            </div>
          </Block>

          {/* CPs and undertakings */}
          <Block title="6 · Conditions precedent &amp; sustainability undertakings">
            <ol className="ts-list" style={{ color: colors.ink }}>
              <li>Customary CPs for an investment-grade unsecured facility (corporate authorisations, KYC, legal opinion, no MAC, accuracy of representations).</li>
              <li>Delivery of the CBAM declarant authorisation issued by the competent national authority pursuant to Reg. (EU) 2023/956 Art. 5.</li>
              <li>Baseline KPI report covering calendar year 2025 imports, prepared in line with the CBAM methodology and subject to limited assurance.</li>
              <li>Adoption of a CBAM data-governance framework, including supplier engagement plan for verified emissions data on ≥80% of imported tonnage within 18 months of signing.</li>
              <li>Annual delivery of (i) the Sustainability Performance Report, and (ii) the corresponding CBAM declaration filed with the EU Registry.</li>
              <li>Information rights enabling the Lender to validate KPI computation, with non-disclosure customary for sustainable-finance documentation.</li>
            </ol>
          </Block>

          {/* Boilerplate */}
          <Block title="7 · Documentation, governing law &amp; standards alignment">
            <KeyValueGrid rows={[
              ['Documentation', 'LMA-style facility agreement with sustainability-linked rider'],
              ['Governing law', 'Spanish law'],
              ['Jurisdiction', 'Courts of Madrid'],
              ['Standards alignment', 'LMA/LSTA/APLMA Sustainability-Linked Loan Principles (June 2023 update)'],
              ['ICMA reference', 'Compatible with ICMA SLB Principles for any subsequent capital-markets refinancing'],
              ['Reporting frame', 'Aligned with CSRD/ESRS E1 (climate change) disclosures of the Borrower'],
            ]} />
          </Block>

          {/* Signatures */}
          <section className="ts-sig">
            <div className="ts-sig-block">
              <div className="text-[10px] uppercase tracking-[0.22em]" style={{ color: colors.muted }}>
                For and on behalf of the Lender
              </div>
              <div className="ts-sig-line" />
              <div className="text-xs" style={{ color: colors.ink }}>
                Banco Bilbao Vizcaya Argentaria, S.A.
              </div>
              <div className="text-[11px]" style={{ color: colors.muted }}>
                Name · Title · Date
              </div>
            </div>
            <div className="ts-sig-block">
              <div className="text-[10px] uppercase tracking-[0.22em]" style={{ color: colors.muted }}>
                For and on behalf of the Borrower
              </div>
              <div className="ts-sig-line" />
              <div className="text-xs" style={{ color: colors.ink }}>
                {client.name}
              </div>
              <div className="text-[11px]" style={{ color: colors.muted }}>
                Name · Title · Date
              </div>
            </div>
          </section>

          {/* Disclaimer */}
          <footer className="ts-disclaimer" style={{ borderColor: colors.rule, color: colors.muted }}>
            This indicative term sheet has been prepared by BBVA CIB Sustainable Finance Solutions for discussion
            purposes only. It is non-binding, subject to internal credit and sustainability-finance approvals,
            customary due diligence, satisfactory documentation and market conditions. Pricing references are
            illustrative and may differ from final pricing. The CBAM cost projections referenced in §5 are produced
            by the Carbon·Edge engine on the basis of Regulation (EU) 2023/956, Implementing Regulation (EU)
            2025/486, Omnibus Regulation (EU) 2025/2083 and the Commission acts of 17 December 2025. ETS price path
            and origin-country carbon prices are analyst-consensus / World Bank Carbon Pricing Dashboard estimates
            respectively, and should be re-verified at the relevant decision date. Reference {reference}.
          </footer>
        </article>
      </div>
    </div>,
    document.body,
  );
}

// ============================================================================
// Sub-components
// ============================================================================

function Block({ title, children }) {
  return (
    <section className="ts-block">
      <h2 className="ts-h2" style={{ borderColor: colors.ink }}>
        {title}
      </h2>
      <div className="ts-block-body">{children}</div>
    </section>
  );
}

function KeyValueGrid({ rows }) {
  return (
    <dl className="ts-kv">
      {rows.map(([k, v]) => (
        <div key={k} className="ts-kv-row" style={{ borderColor: colors.rule }}>
          <dt style={{ color: colors.muted }}>{k}</dt>
          <dd style={{ color: colors.ink }}>{v}</dd>
        </div>
      ))}
    </dl>
  );
}

function ExposureCell({ label, value, note }) {
  return (
    <div className="ts-exposure" style={{ borderColor: colors.rule, backgroundColor: '#FCFAF5' }}>
      <div className="text-[10px] uppercase tracking-[0.2em]" style={{ color: colors.muted }}>
        {label}
      </div>
      <div className="text-2xl tabular-nums mt-1" style={{ color: colors.ink, fontWeight: 500 }}>
        {value}
      </div>
      <div className="text-[11px] mt-0.5" style={{ color: colors.muted }}>{note}</div>
    </div>
  );
}

function MixCell({ title, entries }) {
  const total = entries.reduce((s, e) => s + e.tonnes, 0);
  return (
    <div className="ts-mix">
      <div className="text-[10px] uppercase tracking-[0.2em] mb-2" style={{ color: colors.muted }}>
        {title}
      </div>
      <div className="space-y-1.5">
        {entries.map(e => (
          <div key={e.label} className="flex items-center justify-between text-xs">
            <span style={{ color: colors.ink }}>{e.label}</span>
            <span className="tabular-nums" style={{ color: colors.muted }}>
              {e.tonnes.toLocaleString('es-ES')} t · {Math.round((e.tonnes / Math.max(1, total)) * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Helpers
// ============================================================================

function aggregateBy(arr, keyFn) {
  const map = new Map();
  arr.forEach(it => {
    const key = keyFn(it);
    map.set(key, (map.get(key) ?? 0) + it.tonnes);
  });
  return [...map.entries()]
    .map(([label, tonnes]) => ({ label, tonnes }))
    .sort((a, b) => b.tonnes - a.tonnes);
}

function round100k(n) {
  return Math.round(n / 100_000) * 100_000;
}

function formatRef(d) {
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
}

function formatHumanDate(d) {
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function addDays(d, n) {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
}

// ============================================================================
// Print + layout CSS — co-located so the term sheet works as a standalone unit.
// ============================================================================

const PRINT_CSS = `
  .ts-overlay {
    position: fixed; inset: 0; z-index: 50;
    display: flex; flex-direction: column;
    background: rgba(11, 13, 18, 0.45);
  }
  .ts-toolbar {
    display: flex; align-items: center; justify-content: space-between;
    padding: 0.625rem 1.25rem;
    flex-shrink: 0;
  }
  .ts-doc-wrap {
    flex: 1; overflow-y: auto;
    padding: 2rem 1rem 4rem;
    display: flex; justify-content: center;
  }
  .ts-doc {
    width: 100%;
    max-width: 880px;
    padding: 56px 64px 72px;
    box-shadow: 0 24px 60px rgba(11, 13, 18, 0.18);
    line-height: 1.5;
    border-radius: 4px;
  }
  .ts-letterhead {
    display: flex; align-items: flex-end; justify-content: space-between;
    padding-bottom: 14px;
    border-bottom: 1.5px solid #0b0d12;
    margin-bottom: 28px;
  }
  .ts-title { margin-bottom: 32px; }
  .ts-h1 {
    font-size: 38px; font-weight: 700; line-height: 1.05;
    letter-spacing: -0.025em;
    margin: 6px 0 12px;
  }
  .ts-meta { display: flex; flex-wrap: wrap; gap: 0.5rem; font-size: 11px; }
  .ts-block { margin-bottom: 26px; page-break-inside: avoid; }
  .ts-h2 {
    font-size: 13px; font-weight: 600; letter-spacing: 0.04em;
    text-transform: uppercase;
    border-bottom: 1px solid;
    padding-bottom: 6px; margin-bottom: 14px;
  }
  .ts-kv { display: grid; grid-template-columns: 1fr; gap: 0; }
  .ts-kv-row {
    display: grid; grid-template-columns: 220px 1fr;
    padding: 8px 0;
    border-top: 1px solid;
    font-size: 12px;
  }
  .ts-kv-row:first-child { border-top: none; }
  .ts-kv-row dt {
    font-size: 10px; text-transform: uppercase; letter-spacing: 0.14em;
    padding-top: 1px; font-weight: 500;
  }
  .ts-kv-row dd { margin: 0; line-height: 1.55; }
  .ts-ratchet { margin-top: 18px; }
  .ts-table {
    width: 100%; border-collapse: collapse; font-size: 12px;
  }
  .ts-table th, .ts-table td {
    text-align: left; padding: 8px 10px;
    border-bottom: 1px solid #e7e7eb;
  }
  .ts-table th {
    text-transform: uppercase; letter-spacing: 0.12em; font-size: 10px;
    color: #6e7280; font-weight: 500;
    background: #fafafb;
    border-bottom: 1.5px solid #0b0d12;
  }
  .ts-table .text-right { text-align: right; }
  .ts-note { font-size: 11px; margin-top: 8px; }
  .ts-para { font-size: 13px; line-height: 1.55; margin: 0 0 14px; }
  .ts-list {
    counter-reset: ts; padding-left: 0; margin: 0;
    list-style: none;
    font-size: 12.5px; line-height: 1.55;
  }
  .ts-list li {
    counter-increment: ts;
    position: relative; padding-left: 28px; margin-bottom: 10px;
  }
  .ts-list li::before {
    content: counter(ts) ".";
    position: absolute; left: 0; top: 0;
    color: #3b6cf3; font-weight: 600;
  }
  .ts-grid-3 {
    display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;
    margin: 14px 0;
  }
  .ts-grid-2 {
    display: grid; grid-template-columns: repeat(2, 1fr); gap: 24px;
    margin-top: 16px;
  }
  .ts-exposure { padding: 14px 16px; border: 1px solid; border-radius: 6px; }
  .ts-mix {}
  .ts-sig {
    display: grid; grid-template-columns: 1fr 1fr; gap: 40px;
    margin-top: 40px; page-break-inside: avoid;
  }
  .ts-sig-line {
    border-bottom: 1px solid #0b0d12;
    height: 38px; margin: 6px 0 8px;
  }
  .ts-disclaimer {
    margin-top: 36px; padding-top: 14px;
    border-top: 1px solid;
    font-size: 10px; line-height: 1.55;
  }
  @media print {
    body { background: white !important; }
    body > *:not(.ts-overlay) { display: none !important; }
    .ts-overlay { position: static; background: white; }
    .ts-toolbar { display: none !important; }
    .ts-doc-wrap { padding: 0; background: white !important; overflow: visible; }
    .ts-doc { box-shadow: none; max-width: none; padding: 12mm 14mm; border-radius: 0; }
    @page { size: A4; margin: 0; }
  }
`;
