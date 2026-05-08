import { useState, useMemo } from 'react';
import { ArrowRight, Plus, Trash2, Pencil, Info, Leaf, Wallet, TrendingUp, Target } from 'lucide-react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  ReferenceLine,
  ComposedChart,
  Bar,
} from 'recharts';
import {
  CBAM_SECTORS,
  ETS_PRICE_PATH,
  COUNTRY_DEFAULTS,
  calculateCBAMCost,
  getEffectiveEF,
  lookupCNDefault,
} from './cbamEngine.js';
import { colors, chartSeriesFills, canvas } from './theme.js';
import { formatEUR } from './format.js';
import { Card, Pill, KpiCard } from './ui.jsx';
import { TermSheet } from './TermSheet.jsx';
import { useFX } from './feeds/fxFeed.js';
import { DataSourcesPanel } from './DataSourcesPanel.jsx';
import { projectCBAMCashflow, QUARTERLY_PRESETS } from './cashflowEngine.js';
import { runMonteCarlo } from './monteCarloEngine.js';
import { ImportLineEditor } from './ImportLineEditor.jsx';
import { ClientEditor } from './ClientEditor.jsx';
import { ClientSwitcher } from './ClientSwitcher.jsx';
import {
  useClientsStore,
  updateClient,
  updateClientImports,
  createClient,
} from './store/clientsStore.js';

const EMPTY_IMPORTS = [];

export function ClientView() {
  const { clients, selectedId } = useClientsStore();
  const selectedClient = clients.find(c => c.id === selectedId) ?? clients[0];
  const imports = selectedClient ? selectedClient.imports : EMPTY_IMPORTS;

  const [forecastYear, setForecastYear] = useState(2026);
  const [useActuals, setUseActuals] = useState(true);
  const [termSheetOpen, setTermSheetOpen] = useState(false);
  const [seasonality, setSeasonality] = useState('even');
  const [mcSigma, setMcSigma] = useState(0.22);
  const [editor, setEditor] = useState(null);
  const [clientEditor, setClientEditor] = useState(null);
  const fx = useFX();
  const quarterlyMix = QUARTERLY_PRESETS[seasonality].mix;

  const setImports = (next) => {
    if (!selectedClient) return;
    const value = typeof next === 'function' ? next(selectedClient.imports) : next;
    updateClientImports(selectedClient.id, value);
  };

  const handleEditorSave = (line) => {
    setImports(prev => {
      const exists = prev.some(i => i.id === line.id);
      return exists ? prev.map(i => (i.id === line.id ? line : i)) : [...prev, line];
    });
    setEditor(null);
  };

  const handleClientEditorSave = (patch) => {
    if (clientEditor?.mode === 'add') {
      createClient({ ...patch, imports: [] });
    } else if (selectedClient) {
      updateClient(selectedClient.id, patch);
    }
    setClientEditor(null);
  };

  const totals = useMemo(() => {
    const totalTonnes = imports.reduce((s, i) => s + i.tonnes, 0);
    const totalEmissions = imports.reduce((s, i) => s + i.tonnes * getEffectiveEF(i, forecastYear, useActuals), 0);
    const cost2026 = imports.reduce((s, i) => s + calculateCBAMCost(i, 2026, useActuals, fx.rate), 0);
    const cost2030 = imports.reduce((s, i) => s + calculateCBAMCost(i, 2030, useActuals, fx.rate), 0);
    const cost2034 = imports.reduce((s, i) => s + calculateCBAMCost(i, 2034, useActuals, fx.rate), 0);
    const overThreshold = totalTonnes > 50;

    const costNoVerification = imports.reduce((s, i) => s + calculateCBAMCost(i, forecastYear, false, fx.rate), 0);
    const costWithCurrent = imports.reduce((s, i) => s + calculateCBAMCost(i, forecastYear, useActuals, fx.rate), 0);
    const verificationSavings = costNoVerification - costWithCurrent;

    return { totalTonnes, totalEmissions, cost2026, cost2030, cost2034, overThreshold, costNoVerification, costWithCurrent, verificationSavings };
  }, [imports, forecastYear, useActuals, fx.rate]);

  const projectionData = useMemo(() => {
    return Object.keys(ETS_PRICE_PATH).map(year => {
      const y = parseInt(year);
      const cost = imports.reduce((s, i) => s + calculateCBAMCost(i, y, useActuals, fx.rate), 0);
      const costDefaults = imports.reduce((s, i) => s + calculateCBAMCost(i, y, false, fx.rate), 0);
      return {
        year: y,
        cost: Math.round(cost),
        costDefaults: Math.round(costDefaults),
        etsPrice: ETS_PRICE_PATH[y],
      };
    });
  }, [imports, useActuals, fx.rate]);

  const sectorBreakdown = useMemo(() => {
    const map = {};
    imports.forEach(i => {
      const cost = calculateCBAMCost(i, forecastYear, useActuals, fx.rate);
      if (!map[i.sector]) map[i.sector] = { sector: CBAM_SECTORS[i.sector].label, value: 0 };
      map[i.sector].value += cost;
    });
    return Object.values(map);
  }, [imports, forecastYear, useActuals, fx.rate]);

  const cashflow = useMemo(
    () => projectCBAMCashflow(imports, { fxRate: fx.rate, quarterlyMix }),
    [imports, fx.rate, quarterlyMix],
  );

  const mc = useMemo(
    () => runMonteCarlo(imports, { fxRate: fx.rate, quarterlyMix, vol: mcSigma }),
    [imports, fx.rate, quarterlyMix, mcSigma],
  );

  const projectionDataWithBands = useMemo(() => {
    const map = Object.fromEntries(mc.costPercentiles.map(p => [p.year, p]));
    return projectionData.map(d => {
      const p = map[d.year];
      return {
        ...d,
        p10: Math.round(p?.p10 ?? d.cost),
        p90: Math.round(p?.p90 ?? d.cost),
        band: [Math.round(p?.p10 ?? d.cost), Math.round(p?.p90 ?? d.cost)],
      };
    });
  }, [projectionData, mc]);

  const cashflowSeriesWithBands = useMemo(() => {
    const map = Object.fromEntries(mc.wcPercentiles.map(p => [p.period, p]));
    return cashflow.series.map(s => {
      const p = map[s.period];
      return {
        ...s,
        p10WC: Math.round(p?.p10 ?? s.workingCapitalEUR),
        p90WC: Math.round(p?.p90 ?? s.workingCapitalEUR),
        wcBand: [Math.round(p?.p10 ?? s.workingCapitalEUR), Math.round(p?.p90 ?? s.workingCapitalEUR)],
      };
    });
  }, [cashflow, mc]);

  const removeImport = (id) => setImports(imports.filter(i => i.id !== id));

  const financingRecs = useMemo(() => {
    const recs = [];
    const exposure10y = projectionData.reduce((s, d) => s + d.cost, 0);
    if (exposure10y > 500_000) {
      recs.push({
        product: 'Sustainability-Linked Loan',
        amount: Math.round(exposure10y * 1.2 / 100_000) * 100_000,
        feature: 'Margin ratchet of -25 to -50 bps tied to verified emission reduction (per tCO2e embedded)',
        why: 'Direct hedge against rising CBAM exposure through 2034',
        priority: 'high',
      });
    }
    const unverifiedShare = imports.filter(i => !i.hasVerification).reduce((s, i) => s + i.tonnes, 0) / Math.max(1, totals.totalTonnes);
    const wcLineSize = Math.max(
      Math.round(cashflow.totals.peakWorkingCapitalEUR * 1.10 / 100_000) * 100_000,
      Math.round(totals.cost2026 * 1.5 / 10_000) * 10_000,
    );
    if (unverifiedShare > 0.3 || cashflow.totals.peakWorkingCapitalEUR > 200_000) {
      recs.push({
        product: 'Working Capital Line · CBAM Bridge',
        amount: wcLineSize,
        feature: `Revolving facility sized at 110% of peak certificate holding (peak ${cashflow.totals.peakPeriod ?? '—'}), priced off Euribor + 90 bps with ESG pricing grid`,
        why: 'Smooths cash flow from quarterly 50% certificate-holding requirement (Q2 2027 onwards) plus annual surrender ramp',
        priority: 'high',
      });
    }
    if (imports.some(i => i.tonnes > 1000 && !i.hasVerification)) {
      recs.push({
        product: 'Supplier Decarbonisation Finance',
        amount: 5_000_000,
        feature: 'Project finance to non-EU supplier for plant electrification / process upgrade',
        why: 'Reduces embedded EF at source — every 0.1 tCO2e/t cut saves ~€8/t in 2030 CBAM cost',
        priority: 'medium',
      });
    }
    recs.push({
      product: 'Green Bond Issuance Support',
      amount: 50_000_000,
      feature: 'BBVA acts as sustainability coordinator; use of proceeds aligned to ICMA Green Bond Principles',
      why: 'Long-dated funding for full decarbonisation roadmap, signals commitment to investors',
      priority: 'low',
    });
    return recs;
  }, [imports, totals, projectionData, cashflow]);

  if (!selectedClient) {
    return (
      <div className="px-8 py-12 text-center" style={{ backgroundColor: canvas, minHeight: 'calc(100vh - 56px)', color: colors.muted }}>
        No clients in the portfolio. Create one from the BBVA RM view, or refresh.
      </div>
    );
  }

  return (
    <div className="px-8 py-6 space-y-6" style={{ backgroundColor: canvas, minHeight: 'calc(100vh - 56px)' }}>
      <div className="flex items-end justify-between border-b pb-4" style={{ borderColor: colors.rule }}>
        <div>
          <div className="mb-2">
            <ClientSwitcher
              onCreate={() => setClientEditor({ mode: 'add' })}
              onEdit={() => setClientEditor({ mode: 'edit', client: selectedClient })}
            />
          </div>
          <h1 className="text-4xl leading-none" style={{ color: colors.ink, fontWeight: 600, letterSpacing: '-0.015em' }}>
            Your CBAM exposure
          </h1>
          <div className="mt-2 text-sm" style={{ color: colors.muted }}>
            Definitive period · First surrender deadline 30 Sept 2027 · {imports.length} import line{imports.length === 1 ? '' : 's'} tracked
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Pill tone={totals.overThreshold ? 'bad' : 'good'}>
            {totals.overThreshold ? 'Above 50t threshold · Authorisation required' : 'Below threshold'}
          </Pill>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <KpiCard
          icon={<Wallet className="w-3.5 h-3.5" />}
          iconColor="blue"
          label="2026 Cost (forecast)"
          value={formatEUR(totals.cost2026)}
          sublabel={`Phase-in 2.5% · ETS €${ETS_PRICE_PATH[2026].toFixed(0)}/t (spot)`}
        />
        <KpiCard
          icon={<TrendingUp className="w-3.5 h-3.5" />}
          iconColor="orange"
          label="2030 Cost"
          value={formatEUR(totals.cost2030)}
          sublabel={`P10–P90 ${formatEUR(mc.costPercentiles.find(p => p.year === 2030)?.p10 ?? totals.cost2030)} – ${formatEUR(mc.costPercentiles.find(p => p.year === 2030)?.p90 ?? totals.cost2030)}`}
        />
        <KpiCard
          icon={<Target className="w-3.5 h-3.5" />}
          iconColor="red"
          label="2034 Cost (full phase-in)"
          value={formatEUR(totals.cost2034)}
          sublabel={`P10–P90 ${formatEUR(mc.costPercentiles.find(p => p.year === 2034)?.p10 ?? totals.cost2034)} – ${formatEUR(mc.costPercentiles.find(p => p.year === 2034)?.p90 ?? totals.cost2034)}`}
        />
        <KpiCard
          icon={<Leaf className="w-3.5 h-3.5" />}
          iconColor="green"
          label="Verification savings"
          value={formatEUR(totals.verificationSavings)}
          sublabel={`vs. all-defaults baseline · ${forecastYear}`}
        />
      </div>

      <div className="grid grid-cols-3 gap-6">
        <Card className="col-span-2 p-6" accent>
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="text-[10px] uppercase tracking-[0.2em] mb-1" style={{ color: colors.muted }}>
                Long-term exposure path
              </div>
              <h2 className="text-2xl" style={{ color: colors.ink, fontWeight: 600, letterSpacing: '-0.015em' }}>
                Annual CBAM cost · 2026 — 2034
              </h2>
            </div>
            <div className="flex items-center gap-2 text-xs" style={{ color: colors.muted }}>
              <button
                type="button"
                onClick={() => setUseActuals(!useActuals)}
                className="px-3 py-1.5 transition-colors"
                style={{
                  border: `1px solid ${useActuals ? colors.accent : colors.rule}`,
                  backgroundColor: useActuals ? colors.accentBg : '#fff',
                  color: useActuals ? colors.accent : colors.muted,
                  borderRadius: '999px',
                  fontWeight: useActuals ? 600 : 500,
                }}
              >
                {useActuals ? '✓ ' : ''}Use verified actuals where available
              </button>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={projectionDataWithBands} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={colors.accent} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={colors.accent} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={colors.rule} strokeDasharray="0" vertical={false} />
              <XAxis dataKey="year" stroke={colors.muted} style={{ fontSize: '11px' }} />
              <YAxis
                stroke={colors.muted}
                tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`}
                style={{ fontSize: '11px' }}
              />
              <Tooltip
                contentStyle={{ backgroundColor: colors.ink, border: 'none', borderRadius: 0, color: colors.paper, fontSize: '12px' }}
                formatter={(v, name) => {
                  const labels = { cost: 'P50 · current data mix', costDefaults: 'All defaults', band: 'P10 — P90 (ETS price uncertainty)' };
                  if (Array.isArray(v)) {
                    return [`€${Math.round(v[0]).toLocaleString('es-ES')} — €${Math.round(v[1]).toLocaleString('es-ES')}`, labels[name] ?? name];
                  }
                  return [`€${Math.round(v).toLocaleString('es-ES')}`, labels[name] ?? name];
                }}
              />
              <Area type="monotone" dataKey="band" stroke="none" fill={colors.accent} fillOpacity={0.12} name="band" />
              <Area type="monotone" dataKey="costDefaults" stroke={colors.warn} strokeWidth={1} strokeDasharray="3 3" fill="none" name="costDefaults" />
              <Area type="monotone" dataKey="cost" stroke={colors.accent} strokeWidth={2.5} fill="url(#costGrad)" name="cost" />
            </AreaChart>
          </ResponsiveContainer>
          <div className="mt-3 flex items-center gap-6 text-xs flex-wrap" style={{ color: colors.muted }}>
            <span className="flex items-center gap-2"><span className="inline-block w-3 h-0.5" style={{ backgroundColor: colors.accent }}/>Median (P50) · current data mix</span>
            <span className="flex items-center gap-2"><span className="inline-block w-3 h-2" style={{ backgroundColor: colors.accent, opacity: 0.18 }}/>P10 — P90 band · ETS price uncertainty (σ {Math.round(mc.vol * 100)}%, {mc.trials} trials)</span>
            <span className="flex items-center gap-2"><span className="inline-block w-3 h-0.5 border-t border-dashed" style={{ borderColor: colors.warn }}/>All-defaults reference</span>
          </div>
        </Card>

        <Card className="p-6">
          <div className="text-[10px] uppercase tracking-[0.2em] mb-1" style={{ color: colors.muted }}>
            Cost composition
          </div>
          <h2 className="text-xl mb-4" style={{ color: colors.ink, fontWeight: 600, letterSpacing: '-0.015em' }}>
            By sector · {forecastYear}
          </h2>
          <div
            className="inline-flex items-center mb-4 text-xs"
            style={{
              border: `1px solid ${colors.rule}`,
              borderRadius: '999px',
              backgroundColor: colors.panelHover,
              padding: 2,
            }}
          >
            {[2026, 2030, 2034].map(y => (
              <button
                key={y}
                type="button"
                onClick={() => setForecastYear(y)}
                className="px-3 py-1 transition-colors"
                style={{
                  borderRadius: '999px',
                  backgroundColor: forecastYear === y ? '#fff' : 'transparent',
                  color: forecastYear === y ? colors.ink : colors.muted,
                  fontWeight: forecastYear === y ? 600 : 500,
                  boxShadow: forecastYear === y ? '0 1px 2px rgba(11,13,18,0.06)' : 'none',
                  border: forecastYear === y ? `1px solid ${colors.rule}` : '1px solid transparent',
                }}
              >
                {y}
              </button>
            ))}
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={sectorBreakdown} dataKey="value" nameKey="sector" innerRadius={45} outerRadius={75} paddingAngle={2}>
                {sectorBreakdown.map((_, i) => (
                  <Cell key={i} fill={chartSeriesFills[i % chartSeriesFills.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => formatEUR(v)} contentStyle={{ backgroundColor: colors.ink, border: 'none', color: colors.paper, fontSize: '12px' }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 text-xs mt-2">
            {sectorBreakdown.map((s, i) => (
              <div key={s.sector} className="flex items-center justify-between">
                <span className="flex items-center gap-2" style={{ color: colors.ink }}>
                  <span className="inline-block w-2 h-2" style={{ backgroundColor: chartSeriesFills[i % chartSeriesFills.length] }}/>
                  {s.sector}
                </span>
                <span className="tabular-nums" style={{ color: colors.muted }}>{formatEUR(s.value)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="p-6" accent>
        <div className="flex items-start justify-between mb-5">
          <div>
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] mb-1" style={{ color: colors.accentDark }}>
              <Wallet className="w-3 h-3" /> Working capital cockpit
            </div>
            <h2 className="text-2xl" style={{ color: colors.ink, fontWeight: 600, letterSpacing: '-0.015em' }}>
              Quarterly certificate cash flow · 2026 — 2034
            </h2>
            <div className="text-xs mt-1" style={{ color: colors.muted }}>
              Models the Reg. 2023/956 Art. 22(2) 50% quarterly holding rule (active Q2 2027) and the 30 Sept annual surrender. Certificates priced at the prevailing ETS quarter, consumed FIFO at surrender.
            </div>
          </div>
          <div className="grid grid-cols-3 gap-6 text-right">
            <div>
              <div className="text-[10px] uppercase tracking-[0.18em]" style={{ color: colors.muted }}>
                Peak working capital
              </div>
              <div className="text-2xl tabular-nums" style={{ color: colors.ink, fontWeight: 600, letterSpacing: '-0.015em' }}>
                {formatEUR(cashflow.totals.peakWorkingCapitalEUR)}
              </div>
              <div className="text-[11px]" style={{ color: colors.muted }}>
                {cashflow.totals.peakPeriod ?? '—'} · P10–P90 {formatEUR(mc.peakWCPercentiles.p10)} – {formatEUR(mc.peakWCPercentiles.p90)}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.18em]" style={{ color: colors.muted }}>
                Cumulative cert outflow
              </div>
              <div className="text-2xl tabular-nums" style={{ color: colors.ink, fontWeight: 600, letterSpacing: '-0.015em' }}>
                {formatEUR(cashflow.totals.totalOutflowEUR)}
              </div>
              <div className="text-[11px]" style={{ color: colors.muted }}>2026 — 2034</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.18em]" style={{ color: colors.muted }}>
                First surrender
              </div>
              <div className="text-2xl tabular-nums" style={{ color: colors.ink, fontWeight: 600, letterSpacing: '-0.015em' }}>
                2027Q3
              </div>
              <div className="text-[11px]" style={{ color: colors.muted }}>30 Sept 2027 · for 2026 imports</div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-x-4 gap-y-2 mb-4 text-xs flex-wrap">
          <div className="flex items-center gap-2">
            <span style={{ color: colors.muted }}>Quarterly import seasonality:</span>
            <div
              className="inline-flex items-center"
              style={{
                border: `1px solid ${colors.rule}`,
                borderRadius: '999px',
                backgroundColor: colors.panelHover,
                padding: 2,
              }}
            >
              {Object.entries(QUARTERLY_PRESETS).map(([key, preset]) => {
                const active = seasonality === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSeasonality(key)}
                    className="px-2.5 py-1 transition-colors"
                    style={{
                      borderRadius: '999px',
                      backgroundColor: active ? '#fff' : 'transparent',
                      color: active ? colors.ink : colors.muted,
                      fontWeight: active ? 600 : 500,
                      boxShadow: active ? '0 1px 2px rgba(11,13,18,0.06)' : 'none',
                      border: active ? `1px solid ${colors.rule}` : '1px solid transparent',
                    }}
                  >
                    {preset.label} · {preset.mix.map(m => `${Math.round(m * 100)}`).join('/')}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span style={{ color: colors.muted }}>ETS volatility σ:</span>
            <input
              type="range"
              min="15"
              max="30"
              step="1"
              value={Math.round(mcSigma * 100)}
              onChange={(e) => setMcSigma(Number(e.target.value) / 100)}
              aria-label="Monte Carlo ETS volatility sigma"
              style={{ accentColor: colors.accent, width: 120 }}
            />
            <span className="tabular-nums" style={{ color: colors.ink, minWidth: 28 }}>
              {Math.round(mcSigma * 100)}%
            </span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <ComposedChart data={cashflowSeriesWithBands} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="wcGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={colors.accent} stopOpacity={0.40} />
                <stop offset="100%" stopColor={colors.accent} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={colors.rule} strokeDasharray="0" vertical={false} />
            <XAxis
              dataKey="period"
              stroke={colors.muted}
              interval={3}
              style={{ fontSize: '10px' }}
            />
            <YAxis
              yAxisId="left"
              stroke={colors.muted}
              tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`}
              style={{ fontSize: '10px' }}
            />
            <Tooltip
              contentStyle={{ backgroundColor: colors.ink, border: 'none', borderRadius: 0, color: colors.paper, fontSize: '11px' }}
              formatter={(v, name) => {
                const labels = {
                  workingCapitalEUR: 'P50 working capital',
                  outflowEUR: 'Cert purchase outflow',
                  surrenderValueEUR: 'Surrender (FIFO value)',
                  wcBand: 'P10 — P90 (ETS uncertainty)',
                };
                if (Array.isArray(v)) {
                  return [`€${Math.round(v[0]).toLocaleString('es-ES')} — €${Math.round(v[1]).toLocaleString('es-ES')}`, labels[name] ?? name];
                }
                return [`€${Math.round(v).toLocaleString('es-ES')}`, labels[name] ?? name];
              }}
            />
            <ReferenceLine
              yAxisId="left"
              x="2027Q3"
              stroke={colors.alert}
              strokeDasharray="3 3"
              label={{ value: 'First surrender', fill: colors.alert, fontSize: 10, position: 'insideTopRight' }}
            />
            {cashflow.totals.peakPeriod && (
              <ReferenceLine
                yAxisId="left"
                x={cashflow.totals.peakPeriod}
                stroke={colors.accentDark}
                strokeDasharray="3 3"
                label={{ value: 'Peak WC', fill: colors.accentDark, fontSize: 10, position: 'insideTopLeft' }}
              />
            )}
            <Bar yAxisId="left" dataKey="outflowEUR" fill={colors.steel} opacity={0.55} name="outflowEUR" />
            <Bar yAxisId="left" dataKey="surrenderValueEUR" fill={colors.warn} opacity={0.85} name="surrenderValueEUR" />
            <Area yAxisId="left" type="monotone" dataKey="wcBand" stroke="none" fill={colors.accent} fillOpacity={0.14} name="wcBand" />
            <Area yAxisId="left" type="monotone" dataKey="workingCapitalEUR" stroke={colors.accent} strokeWidth={2.5} fill="url(#wcGrad)" name="workingCapitalEUR" />
          </ComposedChart>
        </ResponsiveContainer>
        <div className="mt-3 flex items-center gap-6 text-xs flex-wrap" style={{ color: colors.muted }}>
          <span className="flex items-center gap-2"><span className="inline-block w-3 h-0.5" style={{ backgroundColor: colors.accent }}/>P50 working capital (held cert lots @ acquisition cost)</span>
          <span className="flex items-center gap-2"><span className="inline-block w-3 h-2" style={{ backgroundColor: colors.accent, opacity: 0.18 }}/>P10 — P90 band · ETS price uncertainty</span>
          <span className="flex items-center gap-2"><span className="inline-block w-3 h-2" style={{ backgroundColor: colors.steel, opacity: 0.55 }}/>Cert purchase outflow (quarter)</span>
          <span className="flex items-center gap-2"><span className="inline-block w-3 h-2" style={{ backgroundColor: colors.warn, opacity: 0.85 }}/>Surrender event (Q3 each year)</span>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: colors.rule }}>
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] mb-1" style={{ color: colors.muted }}>
              Inventory
            </div>
            <h2 className="text-xl" style={{ color: colors.ink, fontWeight: 600, letterSpacing: '-0.015em' }}>
              Import lines tracked
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setEditor({ mode: 'add' })}
            className="text-xs px-3 py-2 flex items-center gap-1.5 transition-colors"
            style={{
              backgroundColor: colors.ink,
              color: '#fff',
              borderRadius: '999px',
              fontWeight: 500,
              boxShadow: '0 1px 2px rgba(11,13,18,0.10)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = colors.navy)}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = colors.ink)}
          >
            <Plus className="w-3 h-3" /> Add import line
          </button>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ backgroundColor: colors.cream }}>
              <th className="text-left px-6 py-2.5 text-[10px] uppercase tracking-wider font-medium" style={{ color: colors.muted }}>Sector</th>
              <th className="text-left px-3 py-2.5 text-[10px] uppercase tracking-wider font-medium" style={{ color: colors.muted }}>Product</th>
              <th className="text-left px-3 py-2.5 text-[10px] uppercase tracking-wider font-medium" style={{ color: colors.muted }}>Origin</th>
              <th className="text-right px-3 py-2.5 text-[10px] uppercase tracking-wider font-medium" style={{ color: colors.muted }}>Tonnes</th>
              <th className="text-right px-3 py-2.5 text-[10px] uppercase tracking-wider font-medium" style={{ color: colors.muted }}>EF (tCO₂e/t)</th>
              <th className="text-right px-3 py-2.5 text-[10px] uppercase tracking-wider font-medium" style={{ color: colors.muted }}>Embedded</th>
              <th className="text-right px-3 py-2.5 text-[10px] uppercase tracking-wider font-medium" style={{ color: colors.muted }}>Cost {forecastYear}</th>
              <th className="px-3 py-2.5 text-[10px] uppercase tracking-wider font-medium" style={{ color: colors.muted }}>Status</th>
              <th className="px-6 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {imports.map(i => {
              const sector = CBAM_SECTORS[i.sector];
              const ef = getEffectiveEF(i, forecastYear, useActuals);
              const embedded = i.tonnes * ef;
              const cost = calculateCBAMCost(i, forecastYear, useActuals, fx.rate);
              return (
                <tr key={i.id} className="border-t" style={{ borderColor: colors.rule }}>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{sector.icon}</span>
                      <span style={{ color: colors.ink }}>{sector.label}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3" style={{ color: colors.ink }}>{i.productName}</td>
                  <td className="px-3 py-3" style={{ color: colors.muted }}>{COUNTRY_DEFAULTS[i.origin]?.label}</td>
                  <td className="px-3 py-3 text-right tabular-nums" style={{ color: colors.ink }}>{i.tonnes.toLocaleString('es-ES')}</td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    <span style={{ color: i.actualEF != null && useActuals ? colors.accentDark : colors.warn }}>
                      {ef.toFixed(2)}
                    </span>
                    <div className="text-[10px]" style={{ color: colors.muted }}>
                      {i.actualEF != null && useActuals
                        ? 'verified'
                        : `${lookupCNDefault(i.cnCode)?.route ?? 'sector default'}${forecastYear >= 2028 ? ' · +30%' : ''}`}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums" style={{ color: colors.ink }}>{Math.round(embedded).toLocaleString('es-ES')} t</td>
                  <td className="px-3 py-3 text-right tabular-nums" style={{ color: colors.ink, fontWeight: 500 }}>{formatEUR(cost)}</td>
                  <td className="px-3 py-3">
                    {i.hasVerification ? <Pill tone="good">Verified</Pill> : <Pill tone="warn">Unverified</Pill>}
                  </td>
                  <td className="px-6 py-3 text-right">
                    <div className="inline-flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setEditor({ mode: 'edit', line: i })}
                        className="opacity-40 hover:opacity-100"
                        title="Edit"
                        aria-label="Edit"
                      >
                        <Pencil className="w-3.5 h-3.5" style={{ color: colors.muted }} />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeImport(i.id)}
                        className="opacity-40 hover:opacity-100"
                        title="Delete"
                        aria-label="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" style={{ color: colors.muted }} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2" style={{ borderColor: colors.ink, backgroundColor: colors.cream }}>
              <td colSpan={3} className="px-6 py-3 text-[10px] uppercase tracking-wider" style={{ color: colors.ink, fontWeight: 600 }}>Total</td>
              <td className="px-3 py-3 text-right tabular-nums" style={{ color: colors.ink, fontWeight: 600 }}>{totals.totalTonnes.toLocaleString('es-ES')}</td>
              <td className="px-3 py-3"></td>
              <td className="px-3 py-3 text-right tabular-nums" style={{ color: colors.ink, fontWeight: 600 }}>{Math.round(totals.totalEmissions).toLocaleString('es-ES')} t</td>
              <td className="px-3 py-3 text-right tabular-nums" style={{ color: colors.ink, fontWeight: 600 }}>
                {formatEUR(imports.reduce((s, i) => s + calculateCBAMCost(i, forecastYear, useActuals, fx.rate), 0))}
              </td>
              <td colSpan={2}></td>
            </tr>
          </tfoot>
        </table>
      </Card>

      <Card className="p-6" accent>
        <div className="flex items-start justify-between mb-5">
          <div>
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] mb-1" style={{ color: colors.accentDark }}>
              <Leaf className="w-3 h-3" /> BBVA Green Financing Engine
            </div>
            <h2 className="text-2xl" style={{ color: colors.ink, fontWeight: 600, letterSpacing: '-0.015em' }}>
              Tailored to your CBAM profile
            </h2>
          </div>
          <Pill tone="good">{financingRecs.length} matches</Pill>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {financingRecs.map((r, idx) => (
            <div
              key={idx}
              className="p-5 transition-shadow cursor-pointer group"
              style={{
                border: `1px solid ${colors.rule}`,
                backgroundColor: '#fff',
                borderRadius: '10px',
                boxShadow: '0 1px 2px rgba(11,13,18,0.04)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(11,13,18,0.08)';
                e.currentTarget.style.borderColor = colors.mutedSoft;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 1px 2px rgba(11,13,18,0.04)';
                e.currentTarget.style.borderColor = colors.rule;
              }}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.18em] mb-1" style={{ color: colors.muted }}>
                    {r.priority === 'high' ? '★ High match' : r.priority === 'medium' ? 'Medium match' : 'Strategic'}
                  </div>
                  <div className="text-lg" style={{ color: colors.ink, fontWeight: 600, letterSpacing: '-0.015em' }}>
                    {r.product}
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 mt-1 opacity-30 group-hover:opacity-100 group-hover:translate-x-1 transition-all" style={{ color: colors.accent }} />
              </div>
              <div className="text-xs leading-relaxed mb-3" style={{ color: colors.muted }}>
                {r.feature}
              </div>
              <div className="border-t pt-3 flex items-center justify-between" style={{ borderColor: colors.rule }}>
                <div>
                  <div className="text-[10px] uppercase tracking-wider" style={{ color: colors.muted }}>
                    Indicative size
                  </div>
                  <div className="text-base tabular-nums" style={{ color: colors.ink, fontWeight: 600, letterSpacing: '-0.01em' }}>
                    {formatEUR(r.amount)}
                  </div>
                </div>
                <div className="text-right max-w-[60%]">
                  <div className="text-[10px] uppercase tracking-wider" style={{ color: colors.muted }}>Why this</div>
                  <div className="text-[11px] leading-tight" style={{ color: colors.ink }}>{r.why}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
        {financingRecs.some(r => r.product === 'Sustainability-Linked Loan') && (
          <div className="mt-5 pt-4 border-t flex items-center justify-between" style={{ borderColor: colors.rule }}>
            <div className="text-xs" style={{ color: colors.muted }}>
              Preview the indicative term sheet for the headline Sustainability-Linked Loan match.
            </div>
            <button
              type="button"
              onClick={() => setTermSheetOpen(true)}
              className="px-4 py-2 text-xs flex items-center gap-2 transition-colors"
              style={{
                backgroundColor: colors.ink,
                color: '#fff',
                borderRadius: '999px',
                fontWeight: 500,
                boxShadow: '0 1px 2px rgba(11,13,18,0.10)',
              }}
            >
              View indicative term sheet <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        )}
      </Card>

      <Card className="p-5 flex items-start gap-4" >
        <Info className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: colors.muted }} />
        <div className="text-xs leading-relaxed" style={{ color: colors.muted }}>
          <strong style={{ color: colors.ink }}>Methodology · </strong>
          Calculations apply CBAM Regulation 2023/956 as amended by Omnibus Regulation 2025/2083 and implementing acts of 17 Dec 2025. Default emission factors are routed through CN-code lookup (Annex IV) with sector-level fallback; +30% markup applies from 2028. Phase-in factors mirror the EU ETS free allocation phase-out schedule. ETS price path anchors 2026 to the latest EUA spot snapshot; outer years use analyst-consensus (illustrative). USD→EUR conversion is fetched live from Frankfurter (ECB reference rates) with snapshot fallback. First certificate surrender obligation: 30 September 2027 for 2026 imports. From Q2 2027, declarants must hold certificates covering at least 50% of cumulative embedded emissions by quarter-end.
        </div>
      </Card>

      <DataSourcesPanel />

      {termSheetOpen && (
        <TermSheet
          client={selectedClient}
          mcVol={mcSigma}
          onClose={() => setTermSheetOpen(false)}
        />
      )}

      {editor && (
        <ImportLineEditor
          mode={editor.mode}
          line={editor.line}
          onSave={handleEditorSave}
          onCancel={() => setEditor(null)}
        />
      )}

      {clientEditor && (
        <ClientEditor
          mode={clientEditor.mode}
          client={clientEditor.client}
          onSave={handleClientEditorSave}
          onCancel={() => setClientEditor(null)}
        />
      )}
    </div>
  );
}
