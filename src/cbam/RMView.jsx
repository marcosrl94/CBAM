import { useState, useMemo, useRef } from 'react';
import { ChevronRight, Target, Zap, Shield, Download, Upload } from 'lucide-react';
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
import { colors } from './theme.js';
import { formatEUR } from './format.js';
import { Card, Stat, Pill } from './ui.jsx';
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
      const mc = runMonteCarlo(c.imports, { fxRate: fx.rate, trials: 200 });
      const peakWCp10 = mc.peakWCPercentiles.p10;
      const peakWCp90 = mc.peakWCPercentiles.p90;
      let riskTier = 'low';
      if (exposureToRevenue > 0.005 || verifiedShare < 0.4) riskTier = 'medium';
      if (exposureToRevenue > 0.01 || verifiedShare < 0.2) riskTier = 'high';
      return { ...c, cost2026, cost2030, cost2034, totalTonnes, verifiedShare, exposureToRevenue, riskTier, peakWC, peakWCPeriod, peakWCp10, peakWCp90 };
    });
  }, [fx.rate, clients]);

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
    <div className="px-8 py-6 space-y-6" style={{ backgroundColor: colors.paper, minHeight: 'calc(100vh - 73px)' }}>
      <div className="flex items-end justify-between border-b pb-4" style={{ borderColor: colors.rule }}>
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] mb-2" style={{ color: colors.muted, fontFamily: 'Söhne, sans-serif' }}>
            BBVA CIB · Iberia portfolio · Q1 2026
          </div>
          <h1 className="text-4xl leading-none" style={{ fontFamily: '"Tiempos Headline", Georgia, serif', color: colors.ink, fontWeight: 500 }}>
            CBAM portfolio cockpit
          </h1>
          <div className="mt-2 text-sm" style={{ color: colors.muted, fontFamily: 'Söhne, sans-serif' }}>
            {clients.length} corporate client{clients.length === 1 ? '' : 's'} · {clients.reduce((s, c) => s + c.imports.length, 0)} import lines · Powered by Carbon·Edge
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs" style={{ fontFamily: 'Söhne, sans-serif' }}>
          <button
            type="button"
            onClick={downloadPortfolioFile}
            className="px-3 py-2 border flex items-center gap-1.5 hover:bg-stone-100"
            style={{ borderColor: colors.rule, color: colors.ink }}
          >
            <Download className="w-3 h-3" /> Export portfolio
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-2 border flex items-center gap-1.5 hover:bg-stone-100"
            style={{ borderColor: colors.rule, color: colors.ink }}
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

      <div className="grid grid-cols-5 gap-px" style={{ backgroundColor: colors.rule }}>
        <div className="p-5 bg-white">
          <Stat label="Portfolio CBAM 2026" value={formatEUR(portfolioTotals.totalCost2026)} sublabel="Phase-in 2.5%" intense />
        </div>
        <div className="p-5 bg-white">
          <Stat label="Portfolio CBAM 2030" value={formatEUR(portfolioTotals.totalCost2030)} sublabel="Phase-in 48.5%" trend="up" intense />
        </div>
        <div className="p-5 bg-white">
          <Stat label="Portfolio CBAM 2034" value={formatEUR(portfolioTotals.totalCost2034)} sublabel="Full phase-in" trend="up" intense />
        </div>
        <div className="p-5 bg-white">
          <Stat label="High-risk clients" value={portfolioTotals.highRisk} sublabel="Need RM action this Q" intense />
        </div>
        <div className="p-5" style={{ backgroundColor: '#0F2847', color: colors.paper }}>
          <div className="text-[10px] uppercase tracking-[0.18em] font-medium mb-1" style={{ color: '#A4B3C8', fontFamily: 'Söhne, sans-serif' }}>
            Cross-sell opportunity
          </div>
          <div className="text-3xl leading-none tabular-nums" style={{ fontFamily: '"Tiempos Headline", Georgia, serif', color: colors.paper, fontWeight: 500 }}>
            {formatEUR(portfolioTotals.crossSellOpportunity)}
          </div>
          <div className="text-xs mt-1" style={{ color: colors.accent }}>
            <Target className="w-3 h-3 inline mr-1" />Sustainable financing addressable
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <Card className="col-span-2 p-6" accent>
          <div className="text-[10px] uppercase tracking-[0.2em] mb-1" style={{ color: colors.muted, fontFamily: 'Söhne, sans-serif' }}>
            Concentration view
          </div>
          <h2 className="text-2xl mb-4" style={{ fontFamily: '"Tiempos Headline", Georgia, serif', color: colors.ink, fontWeight: 500 }}>
            Portfolio exposure by sector · 2030
          </h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={sectorAggregation} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid stroke={colors.rule} strokeDasharray="0" horizontal={false} />
              <XAxis type="number" stroke={colors.muted} tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`} style={{ fontSize: '11px', fontFamily: 'Söhne, sans-serif' }} />
              <YAxis type="category" dataKey="sector" stroke={colors.muted} width={100} style={{ fontSize: '11px', fontFamily: 'Söhne, sans-serif' }} />
              <Tooltip
                contentStyle={{ backgroundColor: colors.ink, border: 'none', color: colors.paper, fontSize: '12px' }}
                formatter={(v) => formatEUR(v)}
              />
              <Bar dataKey="exposure2030" fill={colors.accent} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6">
          <div className="text-[10px] uppercase tracking-[0.2em] mb-1" style={{ color: colors.muted, fontFamily: 'Söhne, sans-serif' }}>
            Priority actions
          </div>
          <h2 className="text-xl mb-4" style={{ fontFamily: '"Tiempos Headline", Georgia, serif', color: colors.ink, fontWeight: 500 }}>
            This week
          </h2>
          <div className="space-y-3">
            <div className="border-l-2 pl-3 py-1" style={{ borderColor: colors.alert }}>
              <div className="text-[10px] uppercase tracking-wider" style={{ color: colors.alert, fontFamily: 'Söhne, sans-serif' }}>Critical</div>
              <div className="text-sm" style={{ color: colors.ink, fontFamily: 'Söhne, sans-serif' }}>2 clients still using default values for &gt;60% of imports</div>
              <div className="text-xs mt-0.5" style={{ color: colors.muted, fontFamily: 'Söhne, sans-serif' }}>+€340k extra CBAM cost in 2030</div>
            </div>
            <div className="border-l-2 pl-3 py-1" style={{ borderColor: colors.warn }}>
              <div className="text-[10px] uppercase tracking-wider" style={{ color: colors.warn, fontFamily: 'Söhne, sans-serif' }}>High</div>
              <div className="text-sm" style={{ color: colors.ink, fontFamily: 'Söhne, sans-serif' }}>Cementos Ibéricos · SLL renewal due in Q2</div>
              <div className="text-xs mt-0.5" style={{ color: colors.muted, fontFamily: 'Söhne, sans-serif' }}>Embed CBAM-linked KPIs in margin ratchet</div>
            </div>
            <div className="border-l-2 pl-3 py-1" style={{ borderColor: colors.accent }}>
              <div className="text-[10px] uppercase tracking-wider" style={{ color: colors.accentDark, fontFamily: 'Söhne, sans-serif' }}>Opportunity</div>
              <div className="text-sm" style={{ color: colors.ink, fontFamily: 'Söhne, sans-serif' }}>AluTech: working capital line for cert. purchase</div>
              <div className="text-xs mt-0.5" style={{ color: colors.muted, fontFamily: 'Söhne, sans-serif' }}>Est. ticket €420k · pricing E + 90 bps</div>
            </div>
            <div className="border-l-2 pl-3 py-1" style={{ borderColor: colors.steel }}>
              <div className="text-[10px] uppercase tracking-wider" style={{ color: colors.steel, fontFamily: 'Söhne, sans-serif' }}>Strategic</div>
              <div className="text-sm" style={{ color: colors.ink, fontFamily: 'Söhne, sans-serif' }}>Q1 2026 delegated acts: third-country carbon price credit</div>
              <div className="text-xs mt-0.5" style={{ color: colors.muted, fontFamily: 'Söhne, sans-serif' }}>Brief clients with KR/CN imports</div>
            </div>
          </div>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="px-6 py-4 border-b" style={{ borderColor: colors.rule }}>
          <div className="text-[10px] uppercase tracking-[0.2em] mb-1" style={{ color: colors.muted, fontFamily: 'Söhne, sans-serif' }}>
            Client portfolio
          </div>
          <h2 className="text-xl" style={{ fontFamily: '"Tiempos Headline", Georgia, serif', color: colors.ink, fontWeight: 500 }}>
            CBAM exposure by client · ranked
          </h2>
        </div>
        <table className="w-full text-sm" style={{ fontFamily: 'Söhne, sans-serif' }}>
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
            <div className="border-t-2 px-6 py-5" style={{ borderColor: colors.ink, backgroundColor: '#FCFAF5' }}>
              <div className="grid grid-cols-3 gap-6">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.2em] mb-2" style={{ color: colors.muted, fontFamily: 'Söhne, sans-serif' }}>
                    Recommended action
                  </div>
                  <div className="text-lg leading-tight mb-2" style={{ fontFamily: '"Tiempos Headline", Georgia, serif', color: colors.ink, fontWeight: 500 }}>
                    Initiate Sustainability-Linked Loan refinancing
                  </div>
                  <div className="text-xs leading-relaxed" style={{ color: colors.muted, fontFamily: 'Söhne, sans-serif' }}>
                    Embed CBAM-aligned KPI: reduction in weighted-average embedded EF (tCO₂e per tonne imported) of ≥15% by FY2028.
                    Margin step-down of 25 bps on achievement; step-up of 15 bps on miss.
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-[0.2em] mb-2" style={{ color: colors.muted, fontFamily: 'Söhne, sans-serif' }}>
                    Indicative ticket
                  </div>
                  <div className="text-3xl tabular-nums mb-1" style={{ fontFamily: '"Tiempos Headline", Georgia, serif', color: colors.ink, fontWeight: 500 }}>
                    {formatEUR(c.cost2030 * 1.5)}
                  </div>
                  <div className="text-xs" style={{ color: colors.muted, fontFamily: 'Söhne, sans-serif' }}>
                    ~1.5x peak CBAM exposure · 5-year tenor
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-[0.2em] mb-2" style={{ color: colors.muted, fontFamily: 'Söhne, sans-serif' }}>
                    Bank P&L impact (5y)
                  </div>
                  <div className="space-y-1.5 text-sm" style={{ fontFamily: 'Söhne, sans-serif' }}>
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
                <div className="col-span-3 flex gap-3 pt-2 border-t" style={{ borderColor: colors.rule }}>
                  <button
                    type="button"
                    onClick={() => setTermSheetClient(c)}
                    className="px-4 py-2 text-xs flex items-center gap-2 hover:opacity-90"
                    style={{ backgroundColor: colors.ink, color: colors.paper, fontFamily: 'Söhne, sans-serif' }}
                  >
                    <Zap className="w-3 h-3" /> Generate term sheet
                  </button>
                  <button type="button" className="px-4 py-2 text-xs border" style={{ borderColor: colors.ink, color: colors.ink, fontFamily: 'Söhne, sans-serif' }}>
                    Open client view
                  </button>
                  <button type="button" className="px-4 py-2 text-xs border" style={{ borderColor: colors.rule, color: colors.muted, fontFamily: 'Söhne, sans-serif' }}>
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
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] mb-1" style={{ color: colors.accentDark, fontFamily: 'Söhne, sans-serif' }}>
            <Shield className="w-3 h-3" /> Pillar 2 transition risk · BBVA capital insight
          </div>
          <h2 className="text-2xl mb-3" style={{ fontFamily: '"Tiempos Headline", Georgia, serif', color: colors.ink, fontWeight: 500 }}>
            Each €1M of CBAM exposure your clients absorb shifts your transition-risk weighting
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: colors.muted, fontFamily: 'Söhne, sans-serif' }}>
            Across this portfolio, the projected 2030 CBAM cost burden of {formatEUR(portfolioTotals.totalCost2030)} sits in obligors with limited verified emissions data ({Math.round(portfolioTotals.avgVerification * 100)}% portfolio average).
            Under the ECB&apos;s climate stress test framework, this concentration translates into an estimated +18 bps add-on to the implied transition-risk capital requirement on this book.
            Active financing of supplier decarbonisation and verification programmes can reduce this add-on by 6–10 bps over a 24-month window.
          </p>
        </div>
        <div className="border-l pl-6" style={{ borderColor: colors.rule }}>
          <div className="text-[10px] uppercase tracking-[0.2em] mb-2" style={{ color: colors.muted, fontFamily: 'Söhne, sans-serif' }}>
            Impact on this book
          </div>
          <div className="space-y-3">
            <div>
              <div className="text-2xl tabular-nums" style={{ fontFamily: '"Tiempos Headline", Georgia, serif', color: colors.ink, fontWeight: 500 }}>+18 bps</div>
              <div className="text-xs" style={{ color: colors.muted, fontFamily: 'Söhne, sans-serif' }}>Current transition add-on</div>
            </div>
            <div>
              <div className="text-2xl tabular-nums" style={{ fontFamily: '"Tiempos Headline", Georgia, serif', color: colors.accentDark, fontWeight: 500 }}>−8 bps</div>
              <div className="text-xs" style={{ color: colors.muted, fontFamily: 'Söhne, sans-serif' }}>Achievable in 24 months</div>
            </div>
          </div>
        </div>
      </Card>

      <DataSourcesPanel />

      {termSheetClient && (
        <TermSheet
          client={termSheetClient}
          onClose={() => setTermSheetClient(null)}
        />
      )}
    </div>
  );
}
