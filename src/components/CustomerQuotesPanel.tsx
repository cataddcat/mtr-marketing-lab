import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import type { CustomerQuote } from '../lib/customer-quotes';
import { CustomerQuoteRow } from './CustomerQuoteRow';
import { PERSONA_LABELS, type PersonaId } from '../lib/schemas';

interface Props {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly quotes: readonly CustomerQuote[];
  readonly onUpdate: (id: string, patch: Partial<CustomerQuote>) => void;
  readonly onAdd: (persona: PersonaId) => void;
  readonly onRemove: (id: string) => void;
  readonly onResetAll: () => void;
  readonly onResetField: (id: string) => void;
}

const PERSONA_ORDER: readonly PersonaId[] = [
  'family_man',
  'housewife',
  'businessman',
  'genz',
];

export function CustomerQuotesPanel({
  open,
  onClose,
  quotes,
  onUpdate,
  onAdd,
  onRemove,
  onResetAll,
  onResetField,
}: Props) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const [activePersona, setActivePersona] = useState<PersonaId>('family_man');
  const [confirmReset, setConfirmReset] = useState(false);

  const handleClose = useCallback(() => {
    setConfirmReset(false);
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, handleClose]);

  if (!open) return null;

  const activeQuotes = quotes.filter(q => q.persona === activePersona);
  const enabledTotal = quotes.filter(q => q.enabled && q.quote.trim().length > 0).length;
  const countOf = (pid: PersonaId): number =>
    quotes.filter(q => q.persona === pid && q.enabled && q.quote.trim().length > 0).length;

  return (
    <div
      className="fixed inset-0 z-40 backdrop-blur-sm flex items-end md:items-center justify-center"
      style={{ background: 'rgba(0, 0, 0, 0.55)' }}
      onMouseDown={e => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="sheet-up rounded-t-2xl md:rounded-xl w-full max-w-xl max-h-[92vh] md:max-h-[85vh] flex flex-col outline-none border"
        style={{
          background: 'var(--color-bg-elevated)',
          borderColor: 'var(--color-border)',
          boxShadow: 'var(--shadow-3)',
        }}
      >
        <header
          className="relative grid grid-cols-[1fr_auto_1fr] items-center px-3 py-2.5 border-b"
          style={{ borderColor: 'var(--color-border-faint)' }}
        >
          <button
            type="button"
            onClick={handleClose}
            className="justify-self-start text-sm font-medium min-h-[44px] px-2"
            style={{ color: 'var(--color-accent)' }}
            lang="th"
          >
            เสร็จ
          </button>
          <h2 id={titleId} className="justify-self-center text-[15px] font-semibold text-fg-1" lang="th">
            เสียงลูกค้าจริง
          </h2>
          <button
            type="button"
            onClick={() => onAdd(activePersona)}
            aria-label={`เพิ่มคำพูดของ ${PERSONA_LABELS[activePersona]}`}
            className="justify-self-end inline-flex items-center justify-center min-w-[44px] min-h-[44px] rounded-md text-fg-2 hover:text-accent hover:bg-bg-hover transition-colors"
          >
            <Plus className="w-5 h-5" strokeWidth={1.5} aria-hidden="true" />
          </button>
        </header>

        <div className="px-4 pt-3 pb-1 font-mono text-[10.5px] tracking-[0.14em] uppercase text-fg-3" lang="th">
          {enabledTotal} คำพูดที่กำลังใช้งาน
        </div>

        {/* Tab nav */}
        <nav
          role="tablist"
          aria-label="เลือก persona"
          className="flex gap-1 px-3 py-2 border-b overflow-x-auto"
          style={{ borderColor: 'var(--color-border-faint)' }}
        >
          {PERSONA_ORDER.map(pid => {
            const n = countOf(pid);
            const active = pid === activePersona;
            return (
              <button
                key={pid}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActivePersona(pid)}
                className="shrink-0 min-h-[36px] px-3 text-xs rounded-md transition-colors inline-flex items-center gap-1.5 border"
                style={active
                  ? {
                      background: 'color-mix(in oklch, var(--color-accent) 12%, transparent)',
                      color: 'var(--color-accent)',
                      borderColor: 'color-mix(in oklch, var(--color-accent) 35%, transparent)',
                    }
                  : {
                      color: 'var(--color-fg-3)',
                      borderColor: 'transparent',
                    }
                }
                lang="th"
              >
                {PERSONA_LABELS[pid]}
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded-pill font-mono"
                  style={n > 0
                    ? (active
                        ? { background: 'color-mix(in oklch, var(--color-accent) 25%, transparent)', color: 'var(--color-accent)' }
                        : { background: 'var(--color-bg-sunken)', color: 'var(--color-fg-2)' })
                    : { background: 'var(--color-bg-sunken)', color: 'var(--color-fg-4)' }
                  }
                >
                  {n}
                </span>
              </button>
            );
          })}
        </nav>

        <div className="flex-1 overflow-y-auto px-3 py-3">
          {activeQuotes.length === 0 ? (
            <div
              role="status"
              className="text-center text-sm text-fg-3 py-10 border border-dashed rounded-md"
              style={{ borderColor: 'var(--color-border)' }}
              lang="th"
            >
              ยังไม่มีคำพูดของ {PERSONA_LABELS[activePersona]}
              <br />
              <button
                type="button"
                onClick={() => onAdd(activePersona)}
                className="hover:underline mt-2 inline-block min-h-[44px]"
                style={{ color: 'var(--color-accent)' }}
              >
                + เพิ่มคำพูดแรก
              </button>
            </div>
          ) : (
            <ul
              className="rounded-md overflow-hidden border list-none p-0"
              style={{
                background: 'var(--color-bg-sunken)',
                borderColor: 'var(--color-border-faint)',
              }}
            >
              {activeQuotes.map((q, i) => (
                <li
                  key={q.id}
                  className={i > 0 ? 'border-t' : ''}
                  style={i > 0 ? { borderColor: 'var(--color-border-faint)' } : undefined}
                >
                  <CustomerQuoteRow
                    quote={q}
                    onUpdate={onUpdate}
                    onReset={onResetField}
                    onDelete={onRemove}
                  />
                </li>
              ))}
            </ul>
          )}
          <p className="text-[11px] text-fg-3 mt-3 leading-relaxed" lang="th">
            💡 เคล็ดลับ: paste คำคอมเมนต์จริงจาก Facebook, LINE, หรือสัมภาษณ์ลูกค้า. ระบบจะใช้เป็น tone & ภาษาอ้างอิงให้ Judge — ทำให้คะแนนใกล้กับลูกค้าจริงมากขึ้น.
          </p>
        </div>

        <footer
          className="flex items-center justify-between gap-3 px-4 py-2.5 border-t min-h-[52px]"
          style={{ borderColor: 'var(--color-border-faint)' }}
        >
          {confirmReset ? (
            <>
              <span className="text-xs text-fg-3 flex-1" lang="th">คืนค่าเริ่มต้นทั้งหมด?</span>
              <button
                type="button"
                onClick={() => setConfirmReset(false)}
                className="text-sm text-fg-3 hover:text-fg-1 min-h-[44px] px-3"
                lang="th"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => {
                  onResetAll();
                  setConfirmReset(false);
                }}
                className="text-sm font-medium min-h-[44px] px-3"
                style={{ color: 'var(--color-danger)' }}
                lang="th"
              >
                คืนค่า
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              className="text-xs text-fg-3 hover:text-fg-1 min-h-[44px] px-2"
              lang="th"
            >
              คืนค่าเริ่มต้นทั้งหมด
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}
