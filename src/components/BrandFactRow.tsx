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
          className="w-full bg-transparent border-0 px-0 py-0 text-[13px] font-medium text-gray-100 placeholder-gray-600 focus:outline-none focus:ring-0"
        />
        <textarea
          id={valueId}
          value={fact.value}
          onChange={e => onUpdate(fact.id, { value: e.target.value })}
          placeholder="เนื้อหา"
          aria-label={`เนื้อหา ${fact.label}`}
          rows={1}
          maxLength={400}
          className="w-full bg-transparent border-0 px-0 py-0 text-sm leading-relaxed text-gray-300 placeholder-gray-600 resize-y focus:outline-none focus:ring-0 min-h-[1.5rem] [field-sizing:content]"
        />
        <div className="flex items-center gap-4 pt-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
          {fact.isDefault && (
            <button
              type="button"
              onClick={() => onReset(fact.id)}
              className="text-[11px] text-gray-500 hover:text-hermes transition-colors min-h-[24px]"
            >
              คืนค่าเริ่มต้น
            </button>
          )}
          <button
            type="button"
            onClick={() => onDelete(fact.id)}
            className="text-[11px] text-gray-500 hover:text-red-400 transition-colors min-h-[24px]"
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
        className={`relative inline-block h-[26px] w-[44px] rounded-full transition-colors duration-200 ${
          checked ? 'bg-hermes' : 'bg-gray-700'
        }`}
      >
        <span
          className={`absolute top-[2px] left-[2px] inline-block h-[22px] w-[22px] rounded-full bg-white shadow-[0_2px_4px_rgba(0,0,0,0.35)] transition-transform duration-200 ease-out ${
            checked ? 'translate-x-[18px]' : 'translate-x-0'
          }`}
        />
      </span>
    </button>
  );
}
