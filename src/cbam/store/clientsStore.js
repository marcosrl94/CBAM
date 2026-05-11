// ============================================================================
// CLIENTS STORE — localStorage-backed multi-client state
// ============================================================================
//
// Single source of truth for the corporate-client portfolio. Persists to
// localStorage so demo state survives reload. Both `ClientView` and `RMView`
// subscribe via `useClientsStore()`.
//
// Shape:
//   {
//     version: 1,
//     selectedId: string,
//     clients: Array<{ id, name, cif, sector, rmRating, annualRevenue, imports[] }>
//   }
//
// On first load (no key in localStorage) we seed from `SAMPLE_CLIENTS`. The
// `resetToDefaults()` action wipes user state back to the seed.
// ============================================================================

import { useSyncExternalStore } from 'react';
import { SAMPLE_CLIENTS } from '../data/sampleClients.js';

const STORAGE_KEY = 'cbam.clients.v1';
const VERSION = 1;

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

/** Empty starting state — first install lands here, both views show empty UX. */
function buildEmpty() {
  return { version: VERSION, selectedId: null, clients: [] };
}

/** Pre-populated demo state — opt-in via `loadSampleClients()`. */
function buildSeed() {
  const clients = deepClone(SAMPLE_CLIENTS);
  return {
    version: VERSION,
    selectedId: clients[0]?.id ?? null,
    clients,
  };
}

function load() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== VERSION || !Array.isArray(parsed.clients)) return null;
    return parsed;
  } catch {
    return null;
  }
}

let state = load() ?? buildEmpty();
const listeners = new Set();

function persist() {
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Quota or privacy mode — silently degrade to in-memory only.
    }
  }
  for (const fn of listeners) fn();
}

function subscribe(fn) {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

function getSnapshot() {
  return state;
}

// ============================================================================
// Public hook
// ============================================================================

export function useClientsStore() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

// ============================================================================
// Actions — mutate `state` then persist + emit
// ============================================================================

export function selectClient(id) {
  if (!state.clients.some(c => c.id === id)) return;
  state = { ...state, selectedId: id };
  persist();
}

export function createClient(initial = {}) {
  const id = newId('c');
  const client = {
    id,
    name: initial.name ?? 'New corporate client',
    cif: initial.cif ?? '',
    sector: initial.sector ?? '',
    rmRating: initial.rmRating ?? 'BB',
    annualRevenue: initial.annualRevenue ?? 100_000_000,
    imports: initial.imports ? deepClone(initial.imports) : [],
  };
  state = {
    ...state,
    selectedId: id,
    clients: [...state.clients, client],
  };
  persist();
  return id;
}

export function updateClient(id, patch) {
  state = {
    ...state,
    clients: state.clients.map(c => (c.id === id ? { ...c, ...patch } : c)),
  };
  persist();
}

export function updateClientImports(id, imports) {
  state = {
    ...state,
    clients: state.clients.map(c => (c.id === id ? { ...c, imports } : c)),
  };
  persist();
}

export function deleteClient(id) {
  const remaining = state.clients.filter(c => c.id !== id);
  const selectedId = state.selectedId === id
    ? (remaining[0]?.id ?? null)
    : state.selectedId;
  state = { ...state, clients: remaining, selectedId };
  persist();
}

export function duplicateClient(id) {
  const original = state.clients.find(c => c.id === id);
  if (!original) return null;
  const newClientId = newId('c');
  const copy = {
    ...deepClone(original),
    id: newClientId,
    name: `${original.name} (copy)`,
    imports: original.imports.map(line => ({ ...line, id: newId('i') })),
  };
  state = {
    ...state,
    clients: [...state.clients, copy],
    selectedId: newClientId,
  };
  persist();
  return newClientId;
}

/** Wipe portfolio to its empty state. Used by the empty-state CTA + onboarding. */
export function resetToEmpty() {
  state = buildEmpty();
  persist();
}

/**
 * Replace portfolio with the bundled four-corporate sample. The headline
 * "Load sample portfolio" CTA from the RM/Client empty states routes here,
 * and the ClientSwitcher exposes it as "Load sample portfolio" too.
 */
export function loadSampleClients() {
  state = buildSeed();
  persist();
}

/** @deprecated kept for backwards-compat with older call sites. Use `loadSampleClients`. */
export const resetToDefaults = loadSampleClients;

// ============================================================================
// Portfolio import / export (JSON)
// ============================================================================

/** Returns the full portfolio state as a pretty-printed JSON string. */
export function exportPortfolio() {
  return JSON.stringify(state, null, 2);
}

/**
 * Replaces the entire portfolio with the contents of a JSON payload.
 * Validates structure before mutating; on failure, state is untouched.
 *
 * @param {string} jsonString
 * @returns {{ ok: true } | { ok: false, error: string }}
 */
export function importPortfolio(jsonString) {
  let parsed;
  try {
    parsed = JSON.parse(jsonString);
  } catch (e) {
    return { ok: false, error: `Invalid JSON: ${e.message}` };
  }
  const validation = validatePortfolio(parsed);
  if (!validation.ok) return validation;
  state = {
    version: VERSION,
    selectedId: parsed.selectedId && parsed.clients.some(c => c.id === parsed.selectedId)
      ? parsed.selectedId
      : (parsed.clients[0]?.id ?? null),
    clients: parsed.clients,
  };
  persist();
  return { ok: true };
}

function validatePortfolio(obj) {
  if (!obj || typeof obj !== 'object') return { ok: false, error: 'Payload is not an object' };
  if (obj.version !== VERSION) return { ok: false, error: `Unsupported version ${obj.version}; expected ${VERSION}` };
  if (!Array.isArray(obj.clients) || obj.clients.length === 0) return { ok: false, error: 'No clients in payload' };
  for (const c of obj.clients) {
    if (typeof c?.id !== 'string' || !c.id) return { ok: false, error: 'Client missing string id' };
    if (typeof c?.name !== 'string' || !c.name) return { ok: false, error: `Client ${c.id} missing name` };
    if (!Array.isArray(c.imports)) return { ok: false, error: `Client "${c.name}" has no imports array` };
    for (const i of c.imports) {
      if (typeof i?.id !== 'string') return { ok: false, error: `"${c.name}" — import line missing id` };
      if (typeof i?.sector !== 'string') return { ok: false, error: `"${c.name}" — import line ${i.id} missing sector` };
      if (typeof i?.origin !== 'string') return { ok: false, error: `"${c.name}" — import line ${i.id} missing origin` };
      if (typeof i?.tonnes !== 'number' || !(i.tonnes > 0)) return { ok: false, error: `"${c.name}" — import line ${i.id} has invalid tonnes` };
    }
  }
  return { ok: true };
}

// ============================================================================
// Selectors
// ============================================================================

export function getSelectedClient(snapshot = state) {
  return snapshot.clients.find(c => c.id === snapshot.selectedId) ?? snapshot.clients[0] ?? null;
}

// ============================================================================
// Helpers
// ============================================================================

function newId(prefix) {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
}
