import { colors, ink, nfq, panel, panelHover, line, shadows, fonts } from './theme.js';

// ============================================================================
// Card · panel surface with subtle line + soft shadow (E6.0 KpiCard ancestor)
// ============================================================================
export function Card({ children, className = '', accent = false, hover = false }) {
  return (
    <div
      className={`bg-white ${className}`}
      style={{
        backgroundColor: panel,
        border: `1px solid ${line}`,
        borderTopWidth: accent ? '3px' : '1px',
        borderTopColor: accent ? colors.accent : line,
        borderRadius: '10px',
        boxShadow: shadows.sm,
        transition: hover ? 'box-shadow 120ms ease, border-color 120ms ease' : undefined,
      }}
    >
      {children}
    </div>
  );
}

// ============================================================================
// Stat · classic label/value/sublabel block in E6.0 voice
// (mono uppercase micro-label, Inter tabular value, ink-3 sublabel)
// ============================================================================
export function Stat({ label, value, sublabel, trend, intense = false }) {
  return (
    <div className="flex flex-col gap-1">
      <div
        className="font-medium"
        style={{
          color: ink[3],
          fontFamily: fonts.mono,
          fontSize: '9.5px',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </div>
      <div
        className={`${intense ? 'text-[28px]' : 'text-[22px]'} leading-none tabular-nums`}
        style={{
          color: ink[1],
          fontWeight: 600,
          letterSpacing: '-0.015em',
        }}
      >
        {value}
      </div>
      {sublabel && (
        <div className="text-[11px]" style={{ color: ink[3] }}>
          {trend === 'up' && <span style={{ color: nfq.red }}>▲ </span>}
          {trend === 'down' && <span style={{ color: nfq.green }}>▼ </span>}
          {sublabel}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// KpiCard · headline metric (icon square + ALL CAPS mono label + big value
// + optional sparkline). Direct port of @e60/ui's KpiCard pattern.
// ============================================================================
const KPI_BG = {
  red: nfq.red,
  orange: nfq.orange,
  blue: nfq.blue,
  purple: nfq.purple,
  green: nfq.green,
  dark: ink[1],
};

export function KpiCard({
  icon,
  iconColor = 'blue',
  label,
  value,
  unit,
  sublabel,
  trend,
  sparkline,
  onClick,
  className = '',
}) {
  const interactive = typeof onClick === 'function';
  return (
    <div
      onClick={onClick}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      className={`${interactive ? 'cursor-pointer' : ''} ${className}`}
      style={{
        backgroundColor: panel,
        border: `1px solid ${line}`,
        borderRadius: '10px',
        padding: '14px',
        boxShadow: shadows.sm,
        transition: 'box-shadow 120ms ease, border-color 120ms ease',
      }}
      onMouseEnter={(e) => {
        if (!interactive) return;
        e.currentTarget.style.boxShadow = shadows.md;
        e.currentTarget.style.borderColor = ink[5];
      }}
      onMouseLeave={(e) => {
        if (!interactive) return;
        e.currentTarget.style.boxShadow = shadows.sm;
        e.currentTarget.style.borderColor = line;
      }}
    >
      <div
        aria-hidden="true"
        className="mb-3 flex items-center justify-center"
        style={{
          width: 28,
          height: 28,
          borderRadius: '4px',
          backgroundColor: KPI_BG[iconColor] ?? KPI_BG.blue,
          color: '#ffffff',
        }}
      >
        <span style={{ width: 14, height: 14, display: 'inline-flex' }}>{icon}</span>
      </div>

      <div
        className="mb-1 font-medium"
        style={{
          color: ink[3],
          fontFamily: fonts.mono,
          fontSize: '9.5px',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </div>

      <div className="flex items-end justify-between gap-2">
        <div
          className="tabular-nums leading-none"
          style={{
            color: ink[1],
            fontSize: '22px',
            fontWeight: 600,
            letterSpacing: '-0.015em',
          }}
        >
          {value}
          {unit && (
            <span
              className="ml-0.5"
              style={{
                color: ink[3],
                fontSize: '12px',
                fontWeight: 500,
                letterSpacing: 0,
              }}
            >
              {unit}
            </span>
          )}
        </div>
        {sparkline && <div style={{ height: 22, width: 56, flexShrink: 0 }}>{sparkline}</div>}
        {trend && <div style={{ flexShrink: 0 }}>{trend}</div>}
      </div>

      {sublabel && (
        <div className="mt-1.5 text-[11px]" style={{ color: ink[3] }}>
          {sublabel}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Pill / Tag · compact uppercase mono label with tone variants
// ============================================================================
export function Pill({ children, tone = 'neutral' }) {
  const tones = {
    neutral: { bg: panelHover, fg: ink[2], border: line },
    good:    { bg: nfq.greenBg, fg: nfq.green, border: nfq.greenBg },
    warn:    { bg: nfq.orangeBg, fg: '#a4630e', border: nfq.orangeBg },
    bad:     { bg: nfq.redBg, fg: nfq.red, border: nfq.redBg },
    info:    { bg: nfq.blueBg, fg: nfq.blue, border: nfq.blueBg },
  };
  const t = tones[tone] ?? tones.neutral;
  return (
    <span
      className="inline-flex items-center"
      style={{
        backgroundColor: t.bg,
        color: t.fg,
        border: `1px solid ${t.border}`,
        padding: '2px 8px',
        borderRadius: '999px',
        fontFamily: fonts.mono,
        fontSize: '10px',
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        fontWeight: 500,
      }}
    >
      {children}
    </span>
  );
}

// ============================================================================
// MicroLabel · the eyebrow above headers. Reusable so we keep one place
// for the mono-uppercase pattern.
// ============================================================================
export function MicroLabel({ children, className = '' }) {
  return (
    <div
      className={className}
      style={{
        color: ink[3],
        fontFamily: fonts.mono,
        fontSize: '10px',
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        fontWeight: 500,
      }}
    >
      {children}
    </div>
  );
}
