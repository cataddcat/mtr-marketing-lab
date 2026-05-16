import { useId } from 'react';
import type { BrandFact } from '../lib/brand-facts';

interface Props {
  readonly fact: BrandFact;
  readonly onUpdate: (id: string, patch: Partial<BrandFact>) => void;
  readonly onReset: (id: string) => void;
  readonly onDelete: (id: string) => void;
}

export function BrandFactRow({ fact, onUpdate, onReset, onDelete }: Props) {
  const labelId = useId();
  const valueId = useId();

  return (
    <div
      className={`group flex items-start gap-3 px-4 py-3.5 transition-opacity ${
        fact.enabled ? 'opacity-100' : 'opacity-55'
      }`}
    >
      <div className="flex-1 min-w-0 space-y-1">
        <input
          id={labelId}
          type="text"
          value={fact.label}
          onChange={e => onUpdate(fact.id, { label: e.target.value })}
          placeholder="หัวข้อ"
          aria-label="หัวข้อ"
          lang="th"
          className="w-full bg-transparent border-0 px-0 py-0 text-[13px] font-medium text-fg-1 placeholder:text-fg-4 focus:outline-none focus:ring-0"
        />
        <textarea
          id={valueId}
          value={fact.value}
          onChange={e => onUpdate(fact.id, { value: e.target.value })}
          placeholder="เนื้อหา"
          aria-label={`เนื้อหา ${fact.label}`}
          rows={1}
          maxLength={400}
          lang="th"
          className="w-full bg-transparent border-0 px-0 py-0 text-sm leading-relaxed text-fg-2 placeholder:text-fg-4 resize-y focus:outline-none focus:ring-0 min-h-[1.5rem] [field-sizing:content]"
        />
        <div className="flex items-center gap-4 pt-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
          {fact.isDefault && (
            <button
              type="button"
              onClick={() => onReset(fact.id)}
              className="text-[11px] text-fg-3 hover:text-accent transition-colors min-h-[24px]"
              lang="th"
            >
              คืนค่าเริ่มต้น
            </button>
          )}
          <button
            type="button"
            onClick={() => onDelete(fact.id)}
            className="text-[11px] text-fg-3 transition-colors min-h-[24px]"
            style={{ color: 'var(--color-fg-3)' }}
            onMouseOver={(e) => { e.currentTarget.style.color = 'var(--color-danger)'; }}
            onMouseOut={(e) => { e.currentTarget.style.color = 'var(--color-fg-3)'; }}
            lang="th"
          >
            ลบ
          </button>
        </div>
      </div>
      <Toggle
        checked={fact.enabled}
        onChange={next => onUpdate(fact.id, { enabled: next })}
        label={`เปิดใช้ ${fact.label}`}
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
