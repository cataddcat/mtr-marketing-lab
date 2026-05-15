import { useId } from 'react';
import { RotateCcw, Trash2 } from 'lucide-react';
import type { BrandFact } from '../lib/brand-facts';

interface Props {
  readonly fact: BrandFact;
  readonly onUpdate: (id: string, patch: Partial<BrandFact>) => void;
  readonly onReset: (id: string) => void;
  readonly onDelete: (id: string) => void;
}

export function BrandFactRow({ fact, onUpdate, onReset, onDelete }: Props) {
  const checkboxId = useId();
  const labelId = useId();
  const valueId = useId();

  const dimmed = !fact.enabled;

  return (
    <div
      className={`bg-black/30 border border-gray-800 rounded-lg p-3 space-y-2 transition-opacity ${
        dimmed ? 'opacity-60' : 'opacity-100'
      }`}
    >
      <div className="flex items-center gap-2">
        <input
          id={checkboxId}
          type="checkbox"
          checked={fact.enabled}
          onChange={e => onUpdate(fact.id, { enabled: e.target.checked })}
          className="w-4 h-4 accent-hermes cursor-pointer shrink-0"
          aria-label={`เปิดใช้ ${fact.label}`}
        />
        <input
          id={labelId}
          type="text"
          value={fact.label}
          onChange={e => onUpdate(fact.id, { label: e.target.value })}
          placeholder="หัวข้อ"
          aria-label="หัวข้อ"
          className="flex-1 min-w-0 bg-transparent border-0 px-0 py-0 text-sm font-medium text-gray-200 focus:outline-none focus:ring-0 min-h-[44px]"
        />
        <div className="flex items-center gap-1 shrink-0">
          {fact.isDefault && (
            <button
              type="button"
              onClick={() => onReset(fact.id)}
              aria-label={`คืนค่าเริ่มต้นของ ${fact.label}`}
              title="คืนค่าเริ่มต้น"
              className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] rounded-md text-gray-500 hover:text-gray-200 hover:bg-gray-800 transition-colors"
            >
              <RotateCcw className="w-4 h-4" aria-hidden="true" />
            </button>
          )}
          <button
            type="button"
            onClick={() => onDelete(fact.id)}
            aria-label={`ลบ ${fact.label}`}
            title="ลบ"
            className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] rounded-md text-gray-500 hover:text-red-400 hover:bg-red-900/20 transition-colors"
          >
            <Trash2 className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>
      <textarea
        id={valueId}
        value={fact.value}
        onChange={e => onUpdate(fact.id, { value: e.target.value })}
        placeholder="เนื้อหา"
        aria-label={`เนื้อหา ${fact.label}`}
        rows={Math.max(1, Math.ceil(fact.value.length / 60))}
        maxLength={400}
        className="w-full min-h-[44px] text-sm leading-relaxed resize-y"
      />
      {!fact.enabled && (
        <p className="text-[11px] text-gray-500">ปิดอยู่ — จะไม่ถูกส่งเข้า prompt</p>
      )}
    </div>
  );
}
