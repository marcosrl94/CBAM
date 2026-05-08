// ============================================================================
// PORTFOLIO IO — browser-side download + file-pick helpers
// ============================================================================
// Wraps the store's `exportPortfolio` / `importPortfolio` with the small
// amount of DOM glue (Blob URL for download, FileReader for upload) that
// shouldn't live inside the pure store module.
// ============================================================================

import { exportPortfolio, importPortfolio } from './clientsStore.js';

/** Triggers a JSON download of the full portfolio state. */
export function downloadPortfolioFile() {
  const json = exportPortfolio();
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `cbam-portfolio-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Reads a user-selected JSON file, asks for confirmation showing the size of
 * the incoming payload, then replaces the store state.
 *
 * @param {File} file
 * @returns {Promise<{ ok: true } | { ok: false, error?: string, cancelled?: boolean }>}
 */
export function readAndImportPortfolioFile(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const raw = String(reader.result ?? '');
      let parsed;
      try {
        parsed = JSON.parse(raw);
      } catch (e) {
        resolve({ ok: false, error: `Invalid JSON: ${e.message}` });
        return;
      }
      if (!parsed || !Array.isArray(parsed.clients)) {
        resolve({ ok: false, error: 'No clients array in payload' });
        return;
      }
      const total = parsed.clients.reduce((s, c) => s + (Array.isArray(c.imports) ? c.imports.length : 0), 0);
      const ok = window.confirm(
        `Replace your current portfolio with ${parsed.clients.length} client${parsed.clients.length === 1 ? '' : 's'} ` +
        `(${total} import line${total === 1 ? '' : 's'})?\n\nThis cannot be undone.`,
      );
      if (!ok) {
        resolve({ ok: false, cancelled: true });
        return;
      }
      resolve(importPortfolio(raw));
    };
    reader.onerror = () => resolve({ ok: false, error: 'Could not read file' });
    reader.readAsText(file);
  });
}
