import { colors } from './theme.js';

export function Card({ children, className = '', accent = false }) {
  return (
    <div
      className={`bg-white border ${className}`}
      style={{
        borderColor: accent ? colors.accent : colors.rule,
        borderTopWidth: accent ? '3px' : '1px',
      }}
    >
      {children}
    </div>
  );
}

export function Stat({ label, value, sublabel, trend, intense = false }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="text-[10px] uppercase tracking-[0.18em] font-medium" style={{ color: colors.muted, fontFamily: 'Söhne, ui-sans-serif, sans-serif' }}>
        {label}
      </div>
      <div
        className={`${intense ? 'text-3xl' : 'text-2xl'} leading-none tabular-nums`}
        style={{
          fontFamily: '"Tiempos Headline", "Source Serif Pro", Georgia, serif',
          color: colors.ink,
          fontWeight: 500,
        }}
      >
        {value}
      </div>
      {sublabel && (
        <div className="text-xs" style={{ color: colors.muted }}>
          {trend === 'up' && <span style={{ color: colors.alert }}>▲ </span>}
          {trend === 'down' && <span style={{ color: colors.accent }}>▼ </span>}
          {sublabel}
        </div>
      )}
    </div>
  );
}

export function Pill({ children, tone = 'neutral' }) {
  const tones = {
    neutral: { bg: colors.cream, fg: colors.ink },
    good: { bg: '#E0F4F3', fg: colors.accentDark },
    warn: { bg: '#FBEEDC', fg: '#8A4B0E' },
    bad: { bg: '#F7DDD9', fg: colors.alert },
  };
  const t = tones[tone];
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 text-[10px] uppercase tracking-wider font-medium"
      style={{ backgroundColor: t.bg, color: t.fg, fontFamily: 'Söhne, ui-sans-serif, sans-serif' }}
    >
      {children}
    </span>
  );
}
