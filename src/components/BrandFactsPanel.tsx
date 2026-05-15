import { useEffect, useId, useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import type { BrandFact } from '../lib/brand-facts';
import { BrandFactRow } from './BrandFactRow';

interface Props {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly facts: readonly BrandFact[];
  readonly onUpdate: (id: string, patch: Partial<BrandFact>) => void;
  readonly onAdd: (label: string, value: string) => void;
  readonly onRemove: (id: string) => void;
  readonly onResetAll: () => void;
  readonly onResetField: (id: string) => void;
}

export function BrandFactsPanel({
  open,
  onClose,
  facts,
  onUpdate,
  onAdd,
  onRemove,
  onResetAll,
  onResetField,
}: Props) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) setConfirmReset(false);
  }, [open]);

  if (!open) return null;

  const activeCount = facts.filter(f => f.enabled && f.value.trim().length > 0).length;

  return (
    <div
      className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center"
      onMouseDown={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="sheet-up bg-panel border border-gray-800 rounded-t-2xl md:rounded-2xl w-full max-w-xl max-h-[90vh] md:max-h-[80vh] flex flex-col shadow-card outline-none"
      >
        <header className="relative grid grid-cols-[1fr_auto_1fr] items-center px-3 py-2.5 border-b border-gray-800">
          <button
            type="button"
            onClick={onClose}
            className="justify-self-start text-sm text-hermes hover:text-orange-400 font-medium min-h-[44px] px-2"
          >
            เสร็จ
          </button>
          <h2
            id={titleId}
            className="justify-self-center text-[15px] font-semibold text-gray-100"
          >
            ข้อมูลร้าน
          </h2>
          <button
            type="button"
            onClick={() => onAdd('หัวข้อใหม่', '')}
            aria-label="เพิ่มข้อมูลใหม่"
            className="justify-self-end inline-flex items-center justify-center min-w-[44px] min-h-[44px] rounded-md text-gray-300 hover:text-hermes hover:bg-gray-800 transition-colors"
          >
            <Plus className="w-5 h-5" aria-hidden="true" />
          </button>
        </header>

        <div className="px-4 pt-3 pb-1 text-[11px] uppercase tracking-wide text-gray-500">
          {activeCount} จาก {facts.length} รายการกำลังใช้งาน
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-3">
          {facts.length === 0 ? (
            <div
              role="status"
              className="m-4 text-center text-sm text-gray-500 py-10 border border-dashed border-gray-800 rounded-xl"
            >
              ยังไม่มีข้อมูลร้าน
              <br />
              <button
                type="button"
                onClick={onResetAll}
                className="text-hermes hover:underline mt-2 inline-block min-h-[44px]"
              >
                คืนค่าเริ่มต้นทั้งหมด
              </button>
            </div>
          ) : (
            <ul className="bg-black/30 border border-gray-800 rounded-xl divide-y divide-gray-800 overflow-hidden">
              {facts.map(f => (
                <li key={f.id}>
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
