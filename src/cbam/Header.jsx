import { Briefcase, Users } from 'lucide-react';
import { colors } from './theme.js';

export function Header({ role, setRole }) {
  return (
    <header
      className="border-b px-8 py-4 flex items-center justify-between"
      style={{ backgroundColor: colors.ink, borderColor: colors.steel }}
    >
      <div className="flex items-center gap-8">
        <div className="flex items-baseline gap-2">
          <div
            className="text-xl tracking-tight"
            style={{ fontFamily: '"Tiempos Headline", Georgia, serif', color: colors.paper, fontWeight: 500 }}
          >
            Carbon<span style={{ color: colors.accent }}>·</span>Edge
          </div>
          <div
            className="text-[10px] uppercase tracking-[0.2em]"
            style={{ color: '#7C8BA1', fontFamily: 'Söhne, sans-serif' }}
          >
            BBVA · CBAM Suite
          </div>
        </div>
        <nav className="hidden md:flex items-center gap-6 text-sm" style={{ color: '#A4B3C8', fontFamily: 'Söhne, sans-serif' }}>
          <span className="border-b border-transparent hover:border-current cursor-pointer pb-0.5">Dashboard</span>
          <span className="border-b border-transparent hover:border-current cursor-pointer pb-0.5">Reporting</span>
          <span className="border-b border-transparent hover:border-current cursor-pointer pb-0.5">Financing</span>
          <span className="border-b border-transparent hover:border-current cursor-pointer pb-0.5">Registry</span>
        </nav>
      </div>
      <div className="flex items-center gap-3">
        <div
          className="flex items-center text-xs border"
          style={{ borderColor: colors.steel, fontFamily: 'Söhne, sans-serif' }}
        >
          <button
            type="button"
            onClick={() => setRole('client')}
            className="px-3 py-1.5 transition-colors"
            style={{
              backgroundColor: role === 'client' ? colors.accent : 'transparent',
              color: role === 'client' ? colors.ink : '#A4B3C8',
              fontWeight: role === 'client' ? 600 : 400,
            }}
          >
            <Briefcase className="inline w-3 h-3 mr-1.5" />
            Corporate Client
          </button>
          <button
            type="button"
            onClick={() => setRole('rm')}
            className="px-3 py-1.5 transition-colors"
            style={{
              backgroundColor: role === 'rm' ? colors.accent : 'transparent',
              color: role === 'rm' ? colors.ink : '#A4B3C8',
              fontWeight: role === 'rm' ? 600 : 400,
            }}
          >
            <Users className="inline w-3 h-3 mr-1.5" />
            BBVA Relationship Manager
          </button>
        </div>
      </div>
    </header>
  );
}
