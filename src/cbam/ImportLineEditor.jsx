import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import {
  CBAM_SECTORS,
  COUNTRY_DEFAULTS,
  CN_CODE_DEFAULTS,
  lookupCNDefault,
} from './cbamEngine.js';
import { colors } from './theme.js';

/**
 * Modal editor for a single import line — supports both "add" and "edit"
 * modes. Mounted via portal at body. Closes on Esc, on backdrop click, or
 * on explicit Cancel.
 *
 * Props:
 *   mode    — 'add' | 'edit'
 *   line    — existing import line (only when mode === 'edit')
 *   onSave  — (newLine) => void
 *   onCancel — () => void
 */
export function ImportLineEditor({ mode, line, onSave, onCancel }) {
  // The form is seeded once at mount. Parent is expected to remount this
  // component when switching between rows (we ship one editor for one row at
  // a time), so resetting on `line` change isn't needed.
  const [form, setForm] = useState(() => (line ? toForm(line) : EMPTY_FORM));

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

  const cnHint = useMemo(() => {
    const m = lookupCNDefault(form.cnCode);
    if (!m) return null;
    return `${m.productLabel} · ${m.route} · default EF ${m.defaultEF.toFixed(2)} tCO₂e/t`;
  }, [form.cnCode]);

  const errors = validate(form);
  const valid = Object.keys(errors).length === 0;

  const handleSave = () => {
    if (!valid) return;
    const out = {
      id: line?.id ?? newId(),
      sector: form.sector,
      cnCode: form.cnCode || undefined,
      origin: form.origin,
      tonnes: Number(form.tonnes),
      productName: form.productName.trim(),
      hasVerification: !!form.hasVerification,
      actualEF: form.hasVerification && form.actualEF !== ''
        ? Number(form.actualEF)
        : null,
    };
    onSave(out);
  };

  const update = (key) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm(f => ({ ...f, [key]: value }));
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(10, 22, 40, 0.55)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel?.(); }}
      role="dialog"
      aria-modal="true"
      aria-label={mode === 'edit' ? 'Edit import line' : 'Add import line'}
    >
      <div
        className="w-full max-w-[560px]"
        style={{ backgroundColor: colors.paper, fontFamily: 'Söhne, sans-serif', boxShadow: '0 30px 80px rgba(10, 22, 40, 0.45)' }}
      >
        <header className="flex items-start justify-between px-6 py-4 border-b" style={{ borderColor: colors.rule }}>
          <div>
            <div className="text-[10px] uppercase tracking-[0.22em]" style={{ color: colors.muted }}>
              Inventory
            </div>
            <h2 className="text-xl mt-0.5" style={{ fontFamily: '"Tiempos Headline", Georgia, serif', color: colors.ink, fontWeight: 500 }}>
              {mode === 'edit' ? 'Edit import line' : 'Add import line'}
            </h2>
          </div>
          <button type="button" onClick={onCancel} aria-label="Close" className="p-1">
            <X className="w-4 h-4" style={{ color: colors.muted }} />
          </button>
        </header>

        <div className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-5">
            <Field label="Sector" required>
              <select value={form.sector} onChange={update('sector')} style={SELECT_STYLE}>
                {Object.entries(CBAM_SECTORS).map(([key, s]) => (
                  <option key={key} value={key}>{s.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Origin" required>
              <select value={form.origin} onChange={update('origin')} style={SELECT_STYLE}>
                {Object.entries(COUNTRY_DEFAULTS).map(([code, c]) => (
                  <option key={code} value={code}>{c.label}</option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-5">
            <Field label="CN code" hint={cnHint} hintTone="good">
              <input
                type="text"
                list="cn-code-options"
                value={form.cnCode}
                onChange={update('cnCode')}
                placeholder="e.g. 720851"
                style={INPUT_STYLE}
              />
              <datalist id="cn-code-options">
                {Object.entries(CN_CODE_DEFAULTS).map(([code, d]) => (
                  <option key={code} value={code}>{d.productLabel}</option>
                ))}
              </datalist>
            </Field>
            <Field label="Product name" required error={errors.productName}>
              <input
                type="text"
                value={form.productName}
                onChange={update('productName')}
                placeholder="e.g. Hot-rolled coils"
                style={INPUT_STYLE}
              />
            </Field>
          </div>

          <Field label="Tonnes (per year)" required error={errors.tonnes}>
            <input
              type="number"
              min="0"
              step="1"
              value={form.tonnes}
              onChange={update('tonnes')}
              placeholder="0"
              style={INPUT_STYLE}
            />
          </Field>

          <div className="pt-2">
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <input
                type="checkbox"
                checked={form.hasVerification}
                onChange={update('hasVerification')}
                style={{ accentColor: colors.accent }}
              />
              <span style={{ color: colors.ink }}>Verified emissions data (ISAE 3410)</span>
            </label>
            {form.hasVerification && (
              <div className="mt-3 ml-6">
                <Field label="Actual EF (tCO₂e/t)" hint="Overrides the default value at calculation time">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.actualEF}
                    onChange={update('actualEF')}
                    placeholder="e.g. 1.85"
                    style={INPUT_STYLE}
                  />
                </Field>
              </div>
            )}
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
            {mode === 'edit' ? 'Save changes' : 'Add line'}
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}

function Field({ label, required, hint, hintTone, error, children }) {
  return (
    <div>
      <label className="text-[10px] uppercase tracking-[0.18em] block mb-1.5" style={{ color: colors.muted }}>
        {label}{required && <span style={{ color: colors.alert }}> *</span>}
      </label>
      {children}
      {error && <div className="text-[11px] mt-1" style={{ color: colors.alert }}>{error}</div>}
      {hint && !error && (
        <div className="text-[11px] mt-1" style={{ color: hintTone === 'good' ? colors.accentDark : colors.muted }}>
          {hint}
        </div>
      )}
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

const SELECT_STYLE = {
  ...INPUT_STYLE,
  padding: '6px 0 7px',
  appearance: 'none',
  WebkitAppearance: 'none',
  cursor: 'pointer',
};

const EMPTY_FORM = {
  sector: 'steel',
  cnCode: '',
  origin: 'TR',
  tonnes: '',
  productName: '',
  hasVerification: false,
  actualEF: '',
};

function toForm(line) {
  return {
    sector: line.sector ?? 'steel',
    cnCode: line.cnCode ?? '',
    origin: line.origin ?? 'TR',
    tonnes: line.tonnes != null ? String(line.tonnes) : '',
    productName: line.productName ?? '',
    hasVerification: !!line.hasVerification,
    actualEF: line.actualEF != null ? String(line.actualEF) : '',
  };
}

function validate(form) {
  const e = {};
  if (!form.productName || !form.productName.trim()) e.productName = 'Required';
  if (!form.tonnes || Number(form.tonnes) <= 0) e.tonnes = 'Must be greater than 0';
  return e;
}

function newId() {
  return `i${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
}
