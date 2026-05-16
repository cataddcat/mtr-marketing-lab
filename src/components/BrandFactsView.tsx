import { useState } from 'react';
import { Plus } from 'lucide-react';
import type { BrandFact } from '../lib/brand-facts';
import { BrandFactRow } from './BrandFactRow';

interface Props {
  readonly facts: readonly BrandFact[];
  readonly onUpdate: (id: string, patch: Partial<BrandFact>) => void;
  readonly onAdd: (label: string, value: string) => void;
  readonly onRemove: (id: string) => void;
  readonly onResetAll: () => void;
  readonly onResetField: (id: string) => void;
}

export function BrandFactsView({
  facts,
  onUpdate,
  onAdd,
  onRemove,
  onResetAll,
  onResetField,
}: Props) {
  const [confirmReset, setConfirmReset] = useState(false);
  const activeCount = facts.filter(f => f.enabled && f.value.trim().length > 0).length;

  return (
    <div
      className="rounded-lg border flex flex-col max-w-2xl mx-auto"
      style={{
        background: 'var(--color-bg-elevated)',
        borderColor: 'var(--color-border)',
      }}
    >
      <header
        className="flex items-center justify-between gap-3 px-4 py-3 border-b"
        style={{ borderColor: 'var(--color-border-faint)' }}
      >
        <div>
          <h2 className="text-[15px] font-semibold text-fg-1" lang="th">ข้อมูลร้าน</h2>
          <p className="font-mono text-[10.5px] tracking-[0.14em] uppercase text-fg-3 mt-1" lang="th">
            {activeCount} จาก {facts.length} รายการกำลังใช้งาน
          </p>
        </div>
        <button
          type="button"
          onClick={() => onAdd('หัวข้อใหม่', '')}
          aria-label="เพิ่มข้อมูลใหม่"
          className="inline-flex items-center gap-1.5 px-3 min-h-[36px] rounded-md text-sm text-fg-2 hover:text-accent hover:bg-bg-hover transition-colors border border-border-faint"
        >
          <Plus className="w-4 h-4" strokeWidth={1.5} aria-hidden="true" />
          เพิ่ม
        </button>
      </header>

      <div className="px-3 py-3">
        {facts.length === 0 ? (
          <div
            role="status"
            className="text-center text-sm text-fg-3 py-10 border border-dashed rounded-md"
            style={{ borderColor: 'var(--color-border)' }}
            lang="th"
          >
            ยังไม่มีข้อมูลร้าน
            <br />
            <button
              type="button"
              onClick={onResetAll}
              className="hover:underline mt-2 inline-block min-h-[44px]"
              style={{ color: 'var(--color-accent)' }}
            >
              คืนค่าเริ่มต้นทั้งหมด
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
            {facts.map((f, i) => (
              <li
                key={f.id}
                className={i > 0 ? 'border-t' : ''}
                style={i > 0 ? { borderColor: 'var(--color-border-faint)' } : undefined}
              >
                <BrandFactRow
                  fact={f}
                  onUpdate={onUpdate}
                  onReset={onResetField}
                  onDelete={onRemove}
                />
              </li>
            ))}
          </ul>
        )}
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
              className="text-sm text-fg-3 hover:text-fg-1 min-h-[36px] px-3 transition-colors"
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
              className="text-sm font-medium min-h-[36px] px-3 transition-colors"
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
            className="text-xs text-fg-3 hover:text-fg-1 min-h-[36px] px-2 transition-colors"
            lang="th"
          >
            คืนค่าเริ่มต้นทั้งหมด
          </button>
        )}
      </footer>
    </div>
  );
}
