import { Briefcase, Users } from 'lucide-react';
import { ink, line, panel, panelHover, nfq, fonts } from './theme.js';

/**
 * E6.0-style topbar — light surface, hairline bottom border, ink-1 brand
 * mark, segmented role switcher on the right. No gradient; no dark navy.
 */
export function Header({ role, setRole }) {
  return (
    <header
      className="px-8 flex items-center justify-between"
      style={{
        backgroundColor: panel,
        borderBottom: `1px solid ${line}`,
        height: 56,
      }}
    >
      <div className="flex items-center gap-8">
        <div className="flex items-baseline gap-3">
          <div
            className="leading-none"
            style={{
              color: ink[1],
              fontWeight: 600,
              fontSize: '17px',
              letterSpacing: '-0.015em',
            }}
          >
            Carbon<span style={{ color: nfq.blue }}>·</span>Edge
          </div>
          <div
            style={{
              color: ink[3],
              fontFamily: fonts.mono,
              fontSize: '10px',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              fontWeight: 500,
            }}
          >
            BBVA · CBAM Suite
          </div>
        </div>
        <nav
          className="hidden md:flex items-center gap-5"
          style={{ color: ink[3], fontSize: '13px' }}
        >
          {['Dashboard', 'Reporting', 'Financing', 'Registry'].map((label) => (
            <span
              key={label}
              className="cursor-pointer pb-0.5 transition-colors"
              style={{ borderBottom: '2px solid transparent' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = ink[1])}
              onMouseLeave={(e) => (e.currentTarget.style.color = ink[3])}
            >
              {label}
            </span>
          ))}
        </nav>
      </div>
      <div className="flex items-center gap-3">
        <div
          className="flex items-center"
          style={{
            border: `1px solid ${line}`,
            borderRadius: '999px',
            backgroundColor: panelHover,
            padding: 2,
            fontSize: '12px',
          }}
        >
          {[
            { id: 'client', label: 'Corporate Client', Icon: Briefcase },
            { id: 'rm', label: 'BBVA Relationship Manager', Icon: Users },
          ].map(({ id, label, Icon }) => {
            const active = role === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setRole(id)}
                className="flex items-center gap-1.5 px-3 py-1.5 transition-colors"
                style={{
                  borderRadius: '999px',
                  backgroundColor: active ? panel : 'transparent',
                  color: active ? ink[1] : ink[3],
                  fontWeight: active ? 600 : 500,
                  boxShadow: active ? '0 1px 2px rgba(11,13,18,0.06)' : 'none',
                  border: active ? `1px solid ${line}` : '1px solid transparent',
                }}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
}
