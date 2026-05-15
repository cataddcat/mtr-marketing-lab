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
      className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center"
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
        className="sheet-up bg-panel border border-gray-800 rounded-t-2xl md:rounded-2xl w-full max-w-xl max-h-[92vh] md:max-h-[85vh] flex flex-col shadow-card outline-none"
      >
        <header className="relative grid grid-cols-[1fr_auto_1fr] items-center px-3 py-2.5 border-b border-gray-800">
          <button
            type="button"
            onClick={handleClose}
            className="justify-self-start text-sm text-hermes hover:text-orange-400 font-medium min-h-[44px] px-2"
          >
            เสร็จ
          </button>
          <h2 id={titleId} className="justify-self-center text-[15px] font-semibold text-gray-100">
            เสียงลูกค้าจริง
          </h2>
          <button
            type="button"
            onClick={() => onAdd(activePersona)}
            aria-label={`เพิ่มคำพูดของ ${PERSONA_LABELS[activePersona]}`}
            className="justify-self-end inline-flex items-center justify-center min-w-[44px] min-h-[44px] rounded-md text-gray-300 hover:text-hermes hover:bg-gray-800 transition-colors"
          >
            <Plus className="w-5 h-5" aria-hidden="true" />
          </button>
        </header>

        <div className="px-4 pt-3 pb-1 text-[11px] uppercase tracking-wide text-gray-500">
          {enabledTotal} คำพูดที่กำลังใช้งาน
        </div>

        {/* Tab nav */}
        <nav
          role="tablist"
          aria-label="เลือก persona"
          className="flex gap-1 px-3 py-2 border-b border-gray-800 overflow-x-auto"
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
                className={`shrink-0 min-h-[44px] px-3 text-xs rounded-md transition-colors inline-flex items-center gap-1.5 ${
                  active
                    ? 'bg-hermes/15 text-hermes border border-hermes/40'
                    : 'text-gray-400 hover:text-gray-100 hover:bg-gray-800 border border-transparent'
                }`}
              >
                {PERSONA_LABELS[pid]}
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    n > 0
                      ? active
                        ? 'bg-hermes/30 text-hermes'
                        : 'bg-gray-800 text-gray-300'
                      : 'bg-gray-900 text-gray-600'
                  }`}
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
              className="text-center text-sm text-gray-500 py-10 border border-dashed border-gray-800 rounded-xl"
            >
              ยังไม่มีคำพูดของ {PERSONA_LABELS[activePersona]}
              <br />
              <button
                type="button"
                onClick={() => onAdd(activePersona)}
                className="text-hermes hover:underline mt-2 inline-block min-h-[44px]"
              >
                + เพิ่มคำพูดแรก
              </button>
            </div>
          ) : (
            <ul className="bg-black/30 border border-gray-800 rounded-xl divide-y divide-gray-800 overflow-hidden">
              {activeQuotes.map(q => (
                <li key={q.id}>
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
          <p className="text-[11px] text-gray-500 mt-3 leading-relaxed">
            💡 เคล็ดลับ: paste คำคอมเมนต์จริงจาก Facebook, LINE, หรือสัมภาษณ์ลูกค้า. ระบบจะใช้เป็น tone & ภาษาอ้างอิงให้ Judge — ทำให้คะแนนใกล้กับลูกค้าจริงมากขึ้น.
          </p>
        </div>

        <footer className="flex items-center justify-between gap-3 px-4 py-2.5 border-t border-gray-800 min-h-[52px]">
          {confirmReset ? (
            <>
              <span className="text-xs text-gray-400 flex-1">คืนค่าเริ่มต้นทั้งหมด?</span>
              <button
                type="button"
                onClick={() => setConfirmReset(false)}
                className="text-sm text-gray-400 hover:text-gray-100 min-h-[44px] px-3"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => {
                  onResetAll();
                  setConfirmReset(false);
                }}
                className="text-sm text-red-400 hover:text-red-300 font-medium min-h-[44px] px-3"
              >
                คืนค่า
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              className="text-xs text-gray-500 hover:text-gray-300 min-h-[44px] px-2"
            >
              คืนค่าเริ่มต้นทั้งหมด
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}
