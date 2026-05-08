import { useState, useMemo, useRef } from 'react';
import { ChevronRight, Target, Zap, Shield, Download, Upload, Briefcase, TrendingUp, AlertTriangle, Sparkles } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { CBAM_SECTORS, calculateCBAMCost } from './cbamEngine.js';
import { colors, canvas } from './theme.js';
import { formatEUR } from './format.js';
import { Card, Pill, KpiCard } from './ui.jsx';
import { TermSheet } from './TermSheet.jsx';
import { useFX } from './feeds/fxFeed.js';
import { DataSourcesPanel } from './DataSourcesPanel.jsx';
import { projectCBAMCashflow } from './cashflowEngine.js';
import { runMonteCarlo } from './monteCarloEngine.js';
import { useClientsStore } from './store/clientsStore.js';
import { downloadPortfolioFile, readAndImportPortfolioFile } from './store/portfolioIO.js';

export function RMView() {
  const { clients } = useClientsStore();
  const [selectedClient, setSelectedClient] = useState(null);
  const [termSheetClient, setTermSheetClient] = useState(null);
  const [mcSigma, setMcSigma] = useState(0.22);
  const fileInputRef = useRef(null);
  const fx = useFX();

  const handleImportPick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const result = await readAndImportPortfolioFile(file);
    if (result.cancelled) return;
    if (!result.ok) window.alert(`Import failed: ${result.error}`);
  };

  const portfolioData = useMemo(() => {
    return clients.map(c => {
      const cost2026 = c.imports.reduce((s, i) => s + calculateCBAMCost(i, 2026, true, fx.rate), 0);
      const cost2030 = c.imports.reduce((s, i) => s + calculateCBAMCost(i, 2030, true, fx.rate), 0);
      const cost2034 = c.imports.reduce((s, i) => s + calculateCBAMCost(i, 2034, true, fx.rate), 0);
      const totalTonnes = c.imports.reduce((s, i) => s + i.tonnes, 0);
      const verifiedShare = c.imports.filter(i => i.hasVerification).reduce((s, i) => s + i.tonnes, 0) / Math.max(1, totalTonnes);
      const exposureToRevenue = cost2030 / c.annualRevenue;
      const cashflow = projectCBAMCashflow(c.imports, { fxRate: fx.rate });
      const peakWC = cashflow.totals.peakWorkingCapitalEUR;
      const peakWCPeriod = cashflow.totals.peakPeriod;
      const mc = runMonteCarlo(c.imports, { fxRate: fx.rate, trials: 200, vol: mcSigma });
      const peakWCp10 = mc.peakWCPercentiles.p10;
      const peakWCp90 = mc.peakWCPercentiles.p90;
      let riskTier = 'low';
      if (exposureToRevenue > 0.005 || verifiedShare < 0.4) riskTier = 'medium';
      if (exposureToRevenue > 0.01 || verifiedShare < 0.2) riskTier = 'high';
      return { ...c, cost2026, cost2030, cost2034, totalTonnes, verifiedShare, exposureToRevenue, riskTier, peakWC, peakWCPeriod, peakWCp10, peakWCp90 };
    });
  }, [fx.rate, clients, mcSigma]);

  const portfolioTotals = useMemo(() => {
    return {
      totalCost2026: portfolioData.reduce((s, c) => s + c.cost2026, 0),
      totalCost2030: portfolioData.reduce((s, c) => s + c.cost2030, 0),
      totalCost2034: portfolioData.reduce((s, c) => s + c.cost2034, 0),
      highRisk: portfolioData.filter(c => c.riskTier === 'high').length,
      avgVerification: portfolioData.reduce((s, c) => s + c.verifiedShare, 0) / portfolioData.length,
      crossSellOpportunity: portfolioData.reduce((s, c) => s + c.cost2030, 0) * 1.5,
    };
  }, [portfolioData]);

  const sectorAggregation = useMemo(() => {
    const map = {};
    clients.forEach(c => {
      c.imports.forEach(i => {
        const sec = CBAM_SECTORS[i.sector]?.label;
        if (!sec) return;
        if (!map[sec]) map[sec] = { sector: sec, exposure2030: 0, tonnes: 0 };
        map[sec].exposure2030 += calculateCBAMCost(i, 2030, true, fx.rate);
        map[sec].tonnes += i.tonnes;
      });
    });
    return Object.values(map).sort((a, b) => b.exposure2030 - a.exposure2030);
  }, [fx.rate, clients]);

  const rankedClients = useMemo(
    () => [...portfolioData].sort((a, b) => b.cost2030 - a.cost2030),
    [portfolioData],
  );

  return (
    <div className="px-8 py-6 space-y-6" style={{ backgroundColor: canvas, minHeight: 'calc(100vh - 56px)' }}>
      <div className="flex items-end justify-between border-b pb-4" style={{ borderColor: colors.rule }}>
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] mb-2" style={{ color: colors.muted }}>
            BBVA CIB · Iberia portfolio · Q1 2026
          </div>
          <h1 className="text-4xl leading-none" style={{ color: colors.ink, fontWeight: 600, letterSpacing: '-0.015em' }}>
            CBAM portfolio cockpit
          </h1>
          <div className="mt-2 text-sm" style={{ color: colors.muted }}>
            {clients.length} corporate client{clients.length === 1 ? '' : 's'} · {clients.reduce((s, c) => s + c.imports.length, 0)} import lines · Powered by Carbon·Edge
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span style={{ color: colors.muted }}>ETS σ:</span>
            <input
              type="range"
              min="15"
              max="30"
              step="1"
              value={Math.round(mcSigma * 100)}
              onChange={(e) => setMcSigma(Number(e.target.value) / 100)}
              aria-label="Monte Carlo ETS volatility sigma"
              style={{ accentColor: colors.accent, width: 110 }}
            />
            <span className="tabular-nums" style={{ color: colors.ink, minWidth: 28 }}>
              {Math.round(mcSigma * 100)}%
            </span>
          </div>
          <button
            type="button"
            onClick={downloadPortfolioFile}
            className="px-3 py-2 flex items-center gap-1.5 transition-colors"
            style={{
              border: `1px solid ${colors.rule}`,
              backgroundColor: '#fff',
              color: colors.ink,
              borderRadius: '999px',
              fontWeight: 500,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = colors.panelHover)}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#fff')}
          >
            <Download className="w-3 h-3" /> Export portfolio
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-2 flex items-center gap-1.5 transition-colors"
            style={{
              border: `1px solid ${colors.rule}`,
              backgroundColor: '#fff',
              color: colors.ink,
              borderRadius: '999px',
              fontWeight: 500,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = colors.panelHover)}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#fff')}
          >
            <Upload className="w-3 h-3" /> Import portfolio
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            onChange={handleImportPick}
            style={{ display: 'none' }}
          />
        </div>
      </div>

      <div className="grid grid-cols-5 gap-3">
        <KpiCard
          icon={<Briefcase className="w-3.5 h-3.5" />}
          iconColor="blue"
          label="Portfolio CBAM 2026"
          value={formatEUR(portfolioTotals.totalCost2026)}
          sublabel="Phase-in 2.5%"
        />
        <KpiCard
          icon={<TrendingUp className="w-3.5 h-3.5" />}
          iconColor="orange"
          label="Portfolio CBAM 2030"
          value={formatEUR(portfolioTotals.totalCost2030)}
          sublabel="Phase-in 48.5%"
        />
        <KpiCard
          icon={<Target className="w-3.5 h-3.5" />}
          iconColor="red"
          label="Portfolio CBAM 2034"
          value={formatEUR(portfolioTotals.totalCost2034)}
          sublabel="Full phase-in"
        />
        <KpiCard
          icon={<AlertTriangle className="w-3.5 h-3.5" />}
          iconColor="purple"
          label="High-risk clients"
          value={String(portfolioTotals.highRisk)}
          sublabel="Need RM action this Q"
        />
        <KpiCard
          icon={<Sparkles className="w-3.5 h-3.5" />}
          iconColor="green"
          label="Cross-sell opportunity"
          value={formatEUR(portfolioTotals.crossSellOpportunity)}
          sublabel="Sustainable financing addressable"
        />
      </div>

      <div className="grid grid-cols-3 gap-6">
        <Card className="col-span-2 p-6" accent>
          <div className="text-[10px] uppercase tracking-[0.2em] mb-1" style={{ color: colors.muted }}>
            Concentration view
          </div>
          <h2 className="text-2xl mb-4" style={{ color: colors.ink, fontWeight: 600, letterSpacing: '-0.015em' }}>
            Portfolio exposure by sector · 2030
          </h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={sectorAggregation} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid stroke={colors.rule} strokeDasharray="0" horizontal={false} />
              <XAxis type="number" stroke={colors.muted} tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`} style={{ fontSize: '11px' }} />
              <YAxis type="category" dataKey="sector" stroke={colors.muted} width={100} style={{ fontSize: '11px' }} />
              <Tooltip
                contentStyle={{ backgroundColor: colors.ink, border: 'none', color: colors.paper, fontSize: '12px' }}
                formatter={(v) => formatEUR(v)}
              />
              <Bar dataKey="exposure2030" fill={colors.accent} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6">
          <div className="text-[10px] uppercase tracking-[0.2em] mb-1" style={{ color: colors.muted }}>
            Priority actions
          </div>
          <h2 className="text-xl mb-4" style={{ color: colors.ink, fontWeight: 600, letterSpacing: '-0.015em' }}>
            This week
          </h2>
          <div className="space-y-3">
            <div className="border-l-2 pl-3 py-1" style={{ borderColor: colors.alert }}>
              <div className="text-[10px] uppercase tracking-wider" style={{ color: colors.alert }}>Critical</div>
              <div className="text-sm" style={{ color: colors.ink }}>2 clients still using default values for &gt;60% of imports</div>
              <div className="text-xs mt-0.5" style={{ color: colors.muted }}>+€340k extra CBAM cost in 2030</div>
            </div>
            <div className="border-l-2 pl-3 py-1" style={{ borderColor: colors.warn }}>
              <div className="text-[10px] uppercase tracking-wider" style={{ color: colors.warn }}>High</div>
              <div className="text-sm" style={{ color: colors.ink }}>Cementos Ibéricos · SLL renewal due in Q2</div>
              <div className="text-xs mt-0.5" style={{ color: colors.muted }}>Embed CBAM-linked KPIs in margin ratchet</div>
            </div>
            <div className="border-l-2 pl-3 py-1" style={{ borderColor: colors.accent }}>
              <div className="text-[10px] uppercase tracking-wider" style={{ color: colors.accentDark }}>Opportunity</div>
              <div className="text-sm" style={{ color: colors.ink }}>AluTech: working capital line for cert. purchase</div>
              <div className="text-xs mt-0.5" style={{ color: colors.muted }}>Est. ticket €420k · pricing E + 90 bps</div>
            </div>
            <div className="border-l-2 pl-3 py-1" style={{ borderColor: colors.steel }}>
              <div className="text-[10px] uppercase tracking-wider" style={{ color: colors.steel }}>Strategic</div>
              <div className="text-sm" style={{ color: colors.ink }}>Q1 2026 delegated acts: third-country carbon price credit</div>
              <div className="text-xs mt-0.5" style={{ color: colors.muted }}>Brief clients with KR/CN imports</div>
            </div>
          </div>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="px-6 py-4 border-b" style={{ borderColor: colors.rule }}>
          <div className="text-[10px] uppercase tracking-[0.2em] mb-1" style={{ color: colors.muted }}>
            Client portfolio
          </div>
          <h2 className="text-xl" style={{ color: colors.ink, fontWeight: 600, letterSpacing: '-0.015em' }}>
            CBAM exposure by client · ranked
          </h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ backgroundColor: colors.cream }}>
              <th className="text-left px-6 py-2.5 text-[10px] uppercase tracking-wider font-medium" style={{ color: colors.muted }}>Client</th>
              <th className="text-left px-3 py-2.5 text-[10px] uppercase tracking-wider font-medium" style={{ color: colors.muted }}>Sector</th>
              <th className="text-right px-3 py-2.5 text-[10px] uppercase tracking-wider font-medium" style={{ color: colors.muted }}>Rating</th>
              <th className="text-right px-3 py-2.5 text-[10px] uppercase tracking-wider font-medium" style={{ color: colors.muted }}>2026</th>
              <th className="text-right px-3 py-2.5 text-[10px] uppercase tracking-wider font-medium" style={{ color: colors.muted }}>2030</th>
              <th className="text-right px-3 py-2.5 text-[10px] uppercase tracking-wider font-medium" style={{ color: colors.muted }}>2034</th>
              <th className="text-right px-3 py-2.5 text-[10px] uppercase tracking-wider font-medium" style={{ color: colors.muted }}>Peak WC</th>
              <th className="text-right px-3 py-2.5 text-[10px] uppercase tracking-wider font-medium" style={{ color: colors.muted }}>Exp/Rev</th>
              <th className="text-right px-3 py-2.5 text-[10px] uppercase tracking-wider font-medium" style={{ color: colors.muted }}>Verified</th>
              <th className="px-3 py-2.5 text-[10px] uppercase tracking-wider font-medium" style={{ color: colors.muted }}>Risk</th>
              <th className="px-6 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {rankedClients.map(c => (
              <tr key={c.id} className="border-t hover:bg-stone-50 cursor-pointer" style={{ borderColor: colors.rule }}
                onClick={() => setSelectedClient(selectedClient === c.id ? null : c.id)}>
                <td className="px-6 py-3.5">
                  <div style={{ color: colors.ink, fontWeight: 500 }}>{c.name}</div>
                  <div className="text-[11px]" style={{ color: colors.muted }}>{c.cif}</div>
                </td>
                <td className="px-3 py-3.5" style={{ color: colors.muted }}>{c.sector}</td>
                <td className="px-3 py-3.5 text-right tabular-nums" style={{ color: colors.ink }}>{c.rmRating}</td>
                <td className="px-3 py-3.5 text-right tabular-nums" style={{ color: colors.ink }}>{formatEUR(c.cost2026)}</td>
                <td className="px-3 py-3.5 text-right tabular-nums" style={{ color: colors.ink, fontWeight: 500 }}>{formatEUR(c.cost2030)}</td>
                <td className="px-3 py-3.5 text-right tabular-nums" style={{ color: colors.ink }}>{formatEUR(c.cost2034)}</td>
                <td className="px-3 py-3.5 text-right tabular-nums" style={{ color: colors.ink }}>
                  <div>{formatEUR(c.peakWC)}</div>
                  <div className="text-[10px]" style={{ color: colors.muted }}>
                    {c.peakWCPeriod ?? '—'} · {formatEUR(c.peakWCp10)}–{formatEUR(c.peakWCp90)}
                  </div>
                </td>
                <td className="px-3 py-3.5 text-right tabular-nums" style={{ color: colors.muted }}>
                  {(c.exposureToRevenue * 100).toFixed(2)}%
                </td>
                <td className="px-3 py-3.5 text-right tabular-nums">
                  <div className="flex items-center justify-end gap-2">
                    <div className="w-12 h-1.5" style={{ backgroundColor: colors.rule }}>
                      <div className="h-full" style={{ width: `${c.verifiedShare * 100}%`, backgroundColor: c.verifiedShare > 0.6 ? colors.accent : c.verifiedShare > 0.3 ? colors.warn : colors.alert }} />
                    </div>
                    <span style={{ color: colors.muted }}>{Math.round(c.verifiedShare * 100)}%</span>
                  </div>
                </td>
                <td className="px-3 py-3.5">
                  <Pill tone={c.riskTier === 'high' ? 'bad' : c.riskTier === 'medium' ? 'warn' : 'good'}>
                    {c.riskTier}
                  </Pill>
                </td>
                <td className="px-6 py-3.5 text-right">
                  <ChevronRight className="w-4 h-4 inline opacity-30" style={{ color: colors.muted, transform: selectedClient === c.id ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {selectedClient && (() => {
          const c = portfolioData.find(x => x.id === selectedClient);
          if (!c) return null;
          return (
            <div className="border-t px-6 py-5" style={{ borderColor: colors.rule, backgroundColor: colors.panelHover }}>
              <div className="grid grid-cols-3 gap-6">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.2em] mb-2" style={{ color: colors.muted }}>
                    Recommended action
                  </div>
                  <div className="text-lg leading-tight mb-2" style={{ color: colors.ink, fontWeight: 600, letterSpacing: '-0.015em' }}>
                    Initiate Sustainability-Linked Loan refinancing
                  </div>
                  <div className="text-xs leading-relaxed" style={{ color: colors.muted }}>
                    Embed CBAM-aligned KPI: reduction in weighted-average embedded EF (tCO₂e per tonne imported) of ≥15% by FY2028.
                    Margin step-down of 25 bps on achievement; step-up of 15 bps on miss.
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-[0.2em] mb-2" style={{ color: colors.muted }}>
                    Indicative ticket
                  </div>
                  <div className="text-3xl tabular-nums mb-1" style={{ color: colors.ink, fontWeight: 600, letterSpacing: '-0.015em' }}>
                    {formatEUR(c.cost2030 * 1.5)}
                  </div>
                  <div className="text-xs" style={{ color: colors.muted }}>
                    ~1.5x peak CBAM exposure · 5-year tenor
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-[0.2em] mb-2" style={{ color: colors.muted }}>
                    Bank P&L impact (5y)
                  </div>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between"><span style={{ color: colors.muted }}>Net interest income</span><span className="tabular-nums" style={{ color: colors.ink }}>{formatEUR(c.cost2030 * 1.5 * 0.022 * 5)}</span></div>
                    <div className="flex justify-between"><span style={{ color: colors.muted }}>Fees (advisory + verification)</span><span className="tabular-nums" style={{ color: colors.ink }}>{formatEUR(c.cost2030 * 0.015)}</span></div>
                    <div className="flex justify-between border-t pt-1.5 mt-1.5" style={{ borderColor: colors.rule }}>
                      <span style={{ color: colors.ink, fontWeight: 600 }}>Total revenue</span>
                      <span className="tabular-nums" style={{ color: colors.accentDark, fontWeight: 600 }}>
                        {formatEUR(c.cost2030 * 1.5 * 0.022 * 5 + c.cost2030 * 0.015)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="col-span-3 flex gap-2 pt-2 border-t" style={{ borderColor: colors.rule }}>
                  <button
                    type="button"
                    onClick={() => setTermSheetClient(c)}
                    className="px-4 py-2 text-xs flex items-center gap-2 transition-colors"
                    style={{
                      backgroundColor: colors.ink,
                      color: '#fff',
                      borderRadius: '999px',
                      fontWeight: 500,
                      boxShadow: '0 1px 2px rgba(11,13,18,0.10)',
                    }}
                  >
                    <Zap className="w-3 h-3" /> Generate term sheet
                  </button>
                  <button
                    type="button"
                    className="px-4 py-2 text-xs"
                    style={{
                      border: `1px solid ${colors.rule}`,
                      backgroundColor: '#fff',
                      color: colors.ink,
                      borderRadius: '999px',
                      fontWeight: 500,
                    }}
                  >
                    Open client view
                  </button>
                  <button
                    type="button"
                    className="px-4 py-2 text-xs"
                    style={{
                      border: `1px solid ${colors.rule}`,
                      backgroundColor: '#fff',
                      color: colors.muted,
                      borderRadius: '999px',
                      fontWeight: 500,
                    }}
                  >
                    Send brief to client
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
      </Card>

      <Card className="p-6 grid grid-cols-3 gap-6" accent>
        <div className="col-span-2">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] mb-1" style={{ color: colors.accentDark }}>
            <Shield className="w-3 h-3" /> Pillar 2 transition risk · BBVA capital insight
          </div>
          <h2 className="text-2xl mb-3" style={{ color: colors.ink, fontWeight: 600, letterSpacing: '-0.015em' }}>
            Each €1M of CBAM exposure your clients absorb shifts your transition-risk weighting
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: colors.muted }}>
            Across this portfolio, the projected 2030 CBAM cost burden of {formatEUR(portfolioTotals.totalCost2030)} sits in obligors with limited verified emissions data ({Math.round(portfolioTotals.avgVerification * 100)}% portfolio average).
            Under the ECB&apos;s climate stress test framework, this concentration translates into an estimated +18 bps add-on to the implied transition-risk capital requirement on this book.
            Active financing of supplier decarbonisation and verification programmes can reduce this add-on by 6–10 bps over a 24-month window.
          </p>
        </div>
        <div className="border-l pl-6" style={{ borderColor: colors.rule }}>
          <div className="text-[10px] uppercase tracking-[0.2em] mb-2" style={{ color: colors.muted }}>
            Impact on this book
          </div>
          <div className="space-y-3">
            <div>
              <div className="text-2xl tabular-nums" style={{ color: colors.ink, fontWeight: 600, letterSpacing: '-0.015em' }}>+18 bps</div>
              <div className="text-xs" style={{ color: colors.muted }}>Current transition add-on</div>
            </div>
            <div>
              <div className="text-2xl tabular-nums" style={{ color: colors.accent, fontWeight: 600, letterSpacing: '-0.015em' }}>−8 bps</div>
              <div className="text-xs" style={{ color: colors.muted }}>Achievable in 24 months</div>
            </div>
          </div>
        </div>
      </Card>

      <DataSourcesPanel />

      {termSheetClient && (
        <TermSheet
          client={termSheetClient}
          mcVol={mcSigma}
          onClose={() => setTermSheetClient(null)}
        />
      )}
    </div>
  );
}
