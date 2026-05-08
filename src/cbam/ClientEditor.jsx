import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { colors } from './theme.js';

/**
 * Modal editor for client-level metadata (name, CIF, sector, RM rating,
 * annual revenue). Mounted via portal at body. Same pattern as
 * `ImportLineEditor`.
 *
 * Props:
 *   mode    — 'add' | 'edit'
 *   client  — existing client (only when mode === 'edit')
 *   onSave  — (patch) => void, where patch is the updated metadata
 *   onCancel — () => void
 */
export function ClientEditor({ mode, client, onSave, onCancel }) {
  const [form, setForm] = useState(() => (client ? toForm(client) : EMPTY_FORM));

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onCancel?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const errors = validate(form);
  const valid = Object.keys(errors).length === 0;

  const update = (key) => (e) => {
    setForm(f => ({ ...f, [key]: e.target.value }));
  };

  const handleSave = () => {
    if (!valid) return;
    onSave({
      name: form.name.trim(),
      cif: form.cif.trim(),
      sector: form.sector.trim(),
      rmRating: form.rmRating.trim(),
      annualRevenue: Number(form.annualRevenue),
    });
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(10, 22, 40, 0.55)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel?.(); }}
      role="dialog"
      aria-modal="true"
      aria-label={mode === 'edit' ? 'Edit client' : 'Add client'}
    >
      <div
        className="w-full max-w-[560px]"
        style={{ backgroundColor: colors.paper, fontFamily: 'Söhne, sans-serif', boxShadow: '0 30px 80px rgba(10, 22, 40, 0.45)' }}
      >
        <header className="flex items-start justify-between px-6 py-4 border-b" style={{ borderColor: colors.rule }}>
          <div>
            <div className="text-[10px] uppercase tracking-[0.22em]" style={{ color: colors.muted }}>
              Corporate client
            </div>
            <h2 className="text-xl mt-0.5" style={{ fontFamily: '"Tiempos Headline", Georgia, serif', color: colors.ink, fontWeight: 500 }}>
              {mode === 'edit' ? 'Edit client metadata' : 'New corporate client'}
            </h2>
          </div>
          <button type="button" onClick={onCancel} aria-label="Close" className="p-1">
            <X className="w-4 h-4" style={{ color: colors.muted }} />
          </button>
        </header>

        <div className="px-6 py-5 space-y-4">
          <Field label="Legal name" required error={errors.name}>
            <input
              type="text"
              value={form.name}
              onChange={update('name')}
              placeholder="e.g. Aceros del Mediterráneo S.A."
              style={INPUT_STYLE}
            />
          </Field>

          <div className="grid grid-cols-2 gap-5">
            <Field label="CIF / Tax ID">
              <input
                type="text"
                value={form.cif}
                onChange={update('cif')}
                placeholder="e.g. A-08123456"
                style={INPUT_STYLE}
              />
            </Field>
            <Field label="Sector (free text)">
              <input
                type="text"
                value={form.sector}
                onChange={update('sector')}
                placeholder="e.g. Steel manufacturer"
                style={INPUT_STYLE}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-5">
            <Field label="Internal rating">
              <input
                type="text"
                value={form.rmRating}
                onChange={update('rmRating')}
                placeholder="e.g. BB+"
                style={INPUT_STYLE}
              />
            </Field>
            <Field label="Annual revenue (EUR)" required error={errors.annualRevenue}>
              <input
                type="number"
                min="0"
                step="1000000"
                value={form.annualRevenue}
                onChange={update('annualRevenue')}
                placeholder="100000000"
                style={INPUT_STYLE}
              />
            </Field>
          </div>
        </div>

        <footer className="flex items-center justify-end gap-3 px-6 py-4 border-t" style={{ borderColor: colors.rule, backgroundColor: colors.cream }}>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-xs border"
            style={{ borderColor: colors.rule, color: colors.muted }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!valid}
            className="px-4 py-2 text-xs"
            style={{
              backgroundColor: valid ? colors.ink : colors.rule,
              color: valid ? colors.paper : colors.muted,
              cursor: valid ? 'pointer' : 'not-allowed',
              fontWeight: 500,
            }}
          >
            {mode === 'edit' ? 'Save changes' : 'Create client'}
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}

function Field({ label, required, error, children }) {
  return (
    <div>
      <label className="text-[10px] uppercase tracking-[0.18em] block mb-1.5" style={{ color: colors.muted }}>
        {label}{required && <span style={{ color: colors.alert }}> *</span>}
      </label>
      {children}
      {error && <div className="text-[11px] mt-1" style={{ color: colors.alert }}>{error}</div>}
    </div>
  );
}

const INPUT_STYLE = {
  width: '100%',
  padding: '6px 0',
  borderBottom: `1px solid ${colors.rule}`,
  background: 'transparent',
  color: colors.ink,
  fontFamily: 'Söhne, sans-serif',
  fontSize: '14px',
  outline: 'none',
};

const EMPTY_FORM = {
  name: '',
  cif: '',
  sector: '',
  rmRating: 'BB',
  annualRevenue: '100000000',
};

function toForm(client) {
  return {
    name: client.name ?? '',
    cif: client.cif ?? '',
    sector: client.sector ?? '',
    rmRating: client.rmRating ?? '',
    annualRevenue: client.annualRevenue != null ? String(client.annualRevenue) : '',
  };
}

function validate(form) {
  const e = {};
  if (!form.name || !form.name.trim()) e.name = 'Required';
  if (!form.annualRevenue || Number(form.annualRevenue) <= 0) e.annualRevenue = 'Must be greater than 0';
  return e;
}
