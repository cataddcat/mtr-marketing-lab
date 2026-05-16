import { useState } from 'react';
import { Plus } from 'lucide-react';
import type { CustomerQuote } from '../lib/customer-quotes';
import { CustomerQuoteRow } from './CustomerQuoteRow';
import { PERSONA_LABELS, type PersonaId } from '../lib/schemas';

interface Props {
  readonly quotes: readonly CustomerQuote[];
  readonly onUpdate: (id: string, patch: Partial<CustomerQuote>) => void;
  readonly onAdd: (persona: PersonaId) => void;
  readonly onRemove: (id: string) => void;
  readonly onResetAll: () => void;
  readonly onResetField: (id: string) => void;
  /**
   * Controlled active persona — lifted to the parent so a sibling Add button
   * (rendered in Sheet's headerAction) can also use it.
   */
  readonly activePersona: PersonaId;
  readonly onActivePersonaChange: (pid: PersonaId) => void;
}

const PERSONA_ORDER: readonly PersonaId[] = [
  'family_man',
  'housewife',
  'businessman',
  'genz',
];

/**
 * Body-only view (no outer card/header). Mount inside a <Sheet> — Sheet provides
 * the title bar. Use `CustomerQuotesAddButton` as the Sheet headerAction with
 * the same `activePersona` so "+ Add" inserts into the visible persona tab.
 */
export function CustomerQuotesView({
  quotes,
  onUpdate,
  onAdd,
  onRemove,
  onResetAll,
  onResetField,
  activePersona,
  onActivePersonaChange,
}: Props) {
  const [confirmReset, setConfirmReset] = useState(false);

  const activeQuotes = quotes.filter(q => q.persona === activePersona);
  const enabledTotal = quotes.filter(q => q.enabled && q.quote.trim().length > 0).length;
  const countOf = (pid: PersonaId): number =>
    quotes.filter(q => q.persona === pid && q.enabled && q.quote.trim().length > 0).length;

  return (
    <div className="flex flex-col">
      <div className="px-4 pt-3 pb-1 font-mono text-[10.5px] tracking-[0.14em] uppercase text-fg-3" lang="th">
        {enabledTotal} คำพูดที่กำลังใช้งาน
      </div>

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
              onClick={() => onActivePersonaChange(pid)}
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

      <div className="px-3 py-3">
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
              className="text-sm text-fg-3 hover:text-fg-1 min-h-[36px] px-3"
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
              className="text-sm font-medium min-h-[36px] px-3"
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
            className="text-xs text-fg-3 hover:text-fg-1 min-h-[36px] px-2"
            lang="th"
          >
            คืนค่าเริ่มต้นทั้งหมด
          </button>
        )}
      </footer>
    </div>
  );
}

interface AddButtonProps {
  readonly activePersona: PersonaId;
  readonly onAdd: (persona: PersonaId) => void;
}

export function CustomerQuotesAddButton({ activePersona, onAdd }: AddButtonProps) {
  return (
    <button
      type="button"
      onClick={() => onAdd(activePersona)}
      aria-label={`เพิ่มคำพูดของ ${PERSONA_LABELS[activePersona]}`}
      className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] rounded-md text-fg-2 hover:text-accent hover:bg-bg-hover transition-colors"
    >
      <Plus className="w-5 h-5" strokeWidth={1.5} aria-hidden="true" />
    </button>
  );
}
