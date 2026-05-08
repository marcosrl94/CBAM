import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Plus, Pencil, Copy, Trash2, RotateCcw, Check, Download, Upload } from 'lucide-react';
import { colors } from './theme.js';
import {
  useClientsStore,
  selectClient,
  duplicateClient,
  deleteClient,
  resetToDefaults,
} from './store/clientsStore.js';
import { downloadPortfolioFile, readAndImportPortfolioFile } from './store/portfolioIO.js';

/**
 * Compact client switcher displayed in the ClientView header. Shows the
 * currently selected client name + CIF, opens a popover with:
 *   · the list of saved clients (click to select)
 *   · per-client actions (duplicate, delete) on hover
 *   · "+ New corporate client" entry at top
 *   · "Edit current" entry
 *   · "Reset to defaults" footer (wipes localStorage back to seed)
 *
 * Props:
 *   onCreate — () => void  (opens ClientEditor in 'add' mode)
 *   onEdit   — () => void  (opens ClientEditor in 'edit' mode for current)
 */
export function ClientSwitcher({ onCreate, onEdit }) {
  const { clients, selectedId } = useClientsStore();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const fileInputRef = useRef(null);
  const selected = clients.find(c => c.id === selectedId) ?? clients[0];

  const handleImportPick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-importing the same file later
    if (!file) return;
    const result = await readAndImportPortfolioFile(file);
    if (result.cancelled) return;
    if (!result.ok) {
      window.alert(`Import failed: ${result.error}`);
    } else {
      setOpen(false);
    }
  };

  useEffect(() => {
    if (!open) return undefined;
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('mousedown', onClick);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onClick);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!selected) return null;

  return (
    <div ref={ref} className="relative" style={{ fontFamily: 'Söhne, sans-serif' }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 hover:opacity-80"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <div className="text-left">
          <div className="text-[10px] uppercase tracking-[0.2em]" style={{ color: colors.muted }}>
            {selected.cif ? `${selected.name} · CIF ${selected.cif}` : selected.name}
          </div>
        </div>
        <ChevronDown
          className="w-3.5 h-3.5"
          style={{ color: colors.muted, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}
        />
      </button>

      {open && (
        <div
          className="absolute left-0 top-full mt-2 z-30 border shadow-lg"
          style={{ backgroundColor: colors.paper, borderColor: colors.rule, minWidth: 360, boxShadow: '0 12px 40px rgba(10, 22, 40, 0.18)' }}
          role="menu"
        >
          <button
            type="button"
            onClick={() => { setOpen(false); onCreate?.(); }}
            className="w-full px-4 py-3 text-left flex items-center gap-2 text-xs hover:bg-stone-100"
            style={{ color: colors.ink }}
          >
            <Plus className="w-3.5 h-3.5" /> New corporate client
          </button>

          <div className="border-t" style={{ borderColor: colors.rule }} />

          <div className="max-h-[320px] overflow-y-auto">
            {clients.map(c => (
              <ClientRow
                key={c.id}
                client={c}
                isSelected={c.id === selectedId}
                isOnly={clients.length === 1}
                onSelect={() => { selectClient(c.id); setOpen(false); }}
                onDuplicate={() => { duplicateClient(c.id); setOpen(false); }}
                onDelete={() => deleteClient(c.id)}
              />
            ))}
          </div>

          <div className="border-t" style={{ borderColor: colors.rule }} />
          <button
            type="button"
            onClick={() => { setOpen(false); onEdit?.(); }}
            className="w-full px-4 py-2.5 text-left flex items-center gap-2 text-xs hover:bg-stone-100"
            style={{ color: colors.ink }}
          >
            <Pencil className="w-3 h-3" /> Edit current client metadata
          </button>
          <button
            type="button"
            onClick={() => { downloadPortfolioFile(); setOpen(false); }}
            className="w-full px-4 py-2.5 text-left flex items-center gap-2 text-xs hover:bg-stone-100 border-t"
            style={{ color: colors.ink, borderColor: colors.rule }}
          >
            <Download className="w-3 h-3" /> Export portfolio (.json)
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full px-4 py-2.5 text-left flex items-center gap-2 text-xs hover:bg-stone-100"
            style={{ color: colors.ink }}
          >
            <Upload className="w-3 h-3" /> Import portfolio…
          </button>
          <button
            type="button"
            onClick={() => {
              if (window.confirm('Discard local changes and restore the four sample clients?')) {
                resetToDefaults();
                setOpen(false);
              }
            }}
            className="w-full px-4 py-2.5 text-left flex items-center gap-2 text-xs hover:bg-stone-100 border-t"
            style={{ color: colors.muted, borderColor: colors.rule }}
          >
            <RotateCcw className="w-3 h-3" /> Reset to sample clients
          </button>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        onChange={handleImportPick}
        style={{ display: 'none' }}
      />
    </div>
  );
}

function ClientRow({ client, isSelected, isOnly, onSelect, onDuplicate, onDelete }) {
  return (
    <div
      className="group flex items-center justify-between px-4 py-2.5 hover:bg-stone-100 cursor-pointer"
      onClick={onSelect}
      role="menuitem"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 text-sm" style={{ color: colors.ink }}>
          {isSelected && <Check className="w-3 h-3" style={{ color: colors.accentDark }} />}
          <span className="truncate">{client.name}</span>
        </div>
        <div className="text-[11px]" style={{ color: colors.muted }}>
          {(client.cif ? `${client.cif} · ` : '')}{client.imports.length} import line{client.imports.length === 1 ? '' : 's'}
        </div>
      </div>
      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <IconButton
          title="Duplicate"
          onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
          icon={Copy}
        />
        {!isOnly && (
          <IconButton
            title="Delete"
            onClick={(e) => {
              e.stopPropagation();
              if (window.confirm(`Delete "${client.name}"? This cannot be undone.`)) onDelete();
            }}
            icon={Trash2}
          />
        )}
      </div>
    </div>
  );
}

function IconButton({ title, onClick, icon: Icon }) {
  return (
    <button type="button" title={title} onClick={onClick} className="p-1 hover:bg-stone-200">
      <Icon className="w-3 h-3" style={{ color: colors.muted }} />
    </button>
  );
}
