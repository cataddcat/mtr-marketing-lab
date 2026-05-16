import { useId } from 'react';
import { RotateCcw, Trash2 } from 'lucide-react';
import type { CustomerQuote } from '../lib/customer-quotes';

interface Props {
  readonly quote: CustomerQuote;
  readonly onUpdate: (id: string, patch: Partial<CustomerQuote>) => void;
  readonly onReset: (id: string) => void;
  readonly onDelete: (id: string) => void;
}

export function CustomerQuoteRow({ quote, onUpdate, onReset, onDelete }: Props) {
  const quoteId = useId();
  const contextId = useId();

  return (
    <div
      className={`group flex items-start gap-3 px-4 py-3.5 transition-opacity ${
        quote.enabled ? 'opacity-100' : 'opacity-55'
      }`}
    >
      <div className="flex-1 min-w-0 space-y-2">
        <textarea
          id={quoteId}
          value={quote.quote}
          onChange={e => onUpdate(quote.id, { quote: e.target.value })}
          placeholder={'"คำพูดจริงของลูกค้า — สั้น ตรง ใช้ภาษาที่ลูกค้าใช้จริง"'}
          aria-label="คำพูดของลูกค้า"
          rows={2}
          maxLength={400}
          lang="th"
          className="w-full bg-transparent border-0 px-0 py-0 text-sm leading-relaxed text-fg-1 placeholder:text-fg-4 resize-y focus:outline-none focus:ring-0 min-h-[2.5rem] [field-sizing:content]"
        />
        <input
          id={contextId}
          type="text"
          value={quote.context}
          onChange={e => onUpdate(quote.id, { context: e.target.value })}
          placeholder="บริบท เช่น 'หลังติดตั้ง 1 เดือน', 'จาก FB comment' (optional)"
          aria-label="บริบทของคำพูด"
          lang="th"
          className="w-full bg-transparent border-0 px-0 py-0 text-[11px] text-fg-3 placeholder:text-fg-4 focus:outline-none focus:ring-0 min-h-[28px]"
        />
        <div className="flex items-center gap-4 pt-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
          {quote.isDefault && (
            <button
              type="button"
              onClick={() => onReset(quote.id)}
              className="text-[11px] text-fg-3 hover:text-accent transition-colors min-h-[24px] inline-flex items-center gap-1"
              lang="th"
            >
              <RotateCcw className="w-3 h-3" strokeWidth={1.5} aria-hidden="true" />
              คืนค่า
            </button>
          )}
          <button
            type="button"
            onClick={() => onDelete(quote.id)}
            className="text-[11px] transition-colors min-h-[24px] inline-flex items-center gap-1"
            style={{ color: 'var(--color-fg-3)' }}
            onMouseOver={(e) => { e.currentTarget.style.color = 'var(--color-danger)'; }}
            onMouseOut={(e) => { e.currentTarget.style.color = 'var(--color-fg-3)'; }}
            lang="th"
          >
            <Trash2 className="w-3 h-3" strokeWidth={1.5} aria-hidden="true" />
            ลบ
          </button>
        </div>
      </div>
      <Toggle
        checked={quote.enabled}
        onChange={next => onUpdate(quote.id, { enabled: next })}
        label={`เปิดใช้คำพูดนี้`}
      />
    </div>
  );
}

interface ToggleProps {
  readonly checked: boolean;
  readonly onChange: (next: boolean) => void;
  readonly label: string;
}

function Toggle({ checked, onChange, label }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className="inline-flex items-center justify-center shrink-0 min-w-[44px] min-h-[44px] -my-2 -mr-2 cursor-pointer rounded-md"
    >
      <span
        aria-hidden="true"
        className="relative inline-block h-[26px] w-[44px] rounded-pill transition-colors duration-200"
        style={{ background: checked ? 'var(--color-accent)' : 'var(--color-border)' }}
      >
        <span
          className={`absolute top-[2px] left-[2px] inline-block h-[22px] w-[22px] rounded-full transition-transform duration-200 ease-out ${
            checked ? 'translate-x-[18px]' : 'translate-x-0'
          }`}
          style={{
            background: 'var(--color-paper)',
            boxShadow: '0 2px 4px rgba(0,0,0,0.18)',
          }}
        />
      </span>
    </button>
  );
}
