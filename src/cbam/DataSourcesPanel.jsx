import { Database, ExternalLink, Wifi, WifiOff } from 'lucide-react';
import { colors } from './theme.js';
import { DATA_SOURCES } from './data/sources.js';
import { useFX } from './feeds/fxFeed.js';

/**
 * Trust panel — every input the engine consumes, where it came from, when it
 * was last refreshed. Rendered at the bottom of each view so the RM and the
 * client both see the same provenance footprint.
 */
export function DataSourcesPanel() {
  const fx = useFX();

  // Inject the live FX state into the static catalogue so the asOf date and
  // the live/snapshot indicator reflect the actual runtime feed.
  const sources = DATA_SOURCES.map(s =>
    s.id === 'fx-usd-eur'
      ? {
          ...s,
          asOf: fx.asOf,
          mode: fx.live ? 'live' : 'snapshot',
          note: fx.live
            ? `Frankfurter responded with USD→EUR ${fx.rate.toFixed(4)} on ${fx.asOf}.`
            : 'Frankfurter unreachable; fallback rate 0.92 in use until next page load.',
        }
      : s,
  );

  return (
    <div style={{ border: `1px solid ${colors.rule}`, backgroundColor: colors.cream, borderRadius: '10px', overflow: 'hidden' }}>
      <div className="px-6 py-3 border-b flex items-center justify-between" style={{ borderColor: colors.rule }}>
        <div className="flex items-center gap-2">
          <Database className="w-3.5 h-3.5" style={{ color: colors.muted }} />
          <div className="text-[10px] uppercase tracking-[0.2em]" style={{ color: colors.muted }}>
            Data sources &amp; provenance
          </div>
        </div>
        <div className="text-[11px]" style={{ color: colors.muted }}>
          Engine inputs — live, snapshot, or fixed by regulation
        </div>
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr>
            <th className="text-left px-6 py-2 text-[10px] uppercase tracking-wider font-medium" style={{ color: colors.muted }}>Input</th>
            <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider font-medium" style={{ color: colors.muted }}>Provider</th>
            <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider font-medium" style={{ color: colors.muted }}>As of</th>
            <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider font-medium" style={{ color: colors.muted }}>Cadence</th>
            <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider font-medium" style={{ color: colors.muted }}>Mode</th>
            <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider font-medium" style={{ color: colors.muted }}>Reference</th>
          </tr>
        </thead>
        <tbody>
          {sources.map(s => (
            <tr key={s.id} className="border-t align-top" style={{ borderColor: colors.rule }}>
              <td className="px-6 py-2.5" style={{ color: colors.ink, fontWeight: 500 }}>{s.label}</td>
              <td className="px-3 py-2.5" style={{ color: colors.ink }}>{s.provider}</td>
              <td className="px-3 py-2.5 tabular-nums" style={{ color: colors.muted }}>{s.asOf}</td>
              <td className="px-3 py-2.5" style={{ color: colors.muted }}>{s.cadence}</td>
              <td className="px-3 py-2.5">
                <ModePill mode={s.mode} />
              </td>
              <td className="px-3 py-2.5">
                {s.url
                  ? (
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 underline"
                      style={{ color: colors.accentDark }}
                    >
                      Open <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )
                  : <span style={{ color: colors.muted }}>—</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="px-6 py-3 border-t text-[11px] leading-relaxed" style={{ borderColor: colors.rule, color: colors.muted }}>
        Engine reads CN-code defaults from Annex IV; origin-country effective carbon prices from the World Bank Carbon Pricing
        Dashboard; EUA spot from the EEX weekly auction (proxy for the official Commission CBAM certificate price, which begins
        publication ahead of the Feb 2027 sales-platform launch); USD→EUR live from Frankfurter (ECB), with a snapshot fallback.
      </div>
    </div>
  );
}

function ModePill({ mode }) {
  const map = {
    live: { bg: '#E0F4F3', fg: colors.accentDark, label: 'Live', Icon: Wifi },
    snapshot: { bg: colors.cream, fg: colors.ink, label: 'Snapshot', Icon: WifiOff },
    fixed: { bg: '#EDE7DA', fg: '#5A4B2E', label: 'Regulation', Icon: WifiOff },
    pending: { bg: '#FBEEDC', fg: '#8A4B0E', label: 'Pending', Icon: WifiOff },
  };
  const t = map[mode] ?? map.snapshot;
  const Icon = t.Icon;
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] uppercase tracking-wider font-medium"
      style={{ backgroundColor: t.bg, color: t.fg }}
    >
      <Icon className="w-2.5 h-2.5" /> {t.label}
    </span>
  );
}
