import { useEffect, useId, useRef, useState } from 'react';
import { X, Plus, RefreshCw } from 'lucide-react';
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
  const descId = useId();
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
    // initial focus on dialog for screen readers
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
      className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm flex items-start md:items-center justify-center p-3 md:p-6 overflow-y-auto"
      onMouseDown={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        tabIndex={-1}
        className="bg-panel border border-gray-700 rounded-xl shadow-card w-full max-w-2xl my-auto outline-none"
      >
        <header className="flex items-start justify-between gap-3 p-4 md:p-6 border-b border-gray-800">
          <div className="flex-1 min-w-0">
            <h2 id={titleId} className="text-lg font-semibold text-gray-100">
              ข้อมูลร้าน (Brand Facts)
            </h2>
            <p id={descId} className="text-xs text-gray-400 mt-1 leading-relaxed">
              ข้อมูลเหล่านี้จะถูกแนบเข้าไปใน prompt ทุกครั้งที่ generate / evaluate ad —
              แก้/ปิด/เพิ่มได้เลย{' '}
              <span className="text-hermes">เปิดอยู่ {activeCount} รายการ</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="ปิด"
            className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] rounded-md text-gray-400 hover:text-white hover:bg-gray-800 transition-colors shrink-0"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </header>

        <div className="p-4 md:p-6 space-y-3 max-h-[60vh] overflow-y-auto">
          {facts.length === 0 ? (
            <div
              role="status"
              className="text-center text-sm text-gray-500 py-8 border-2 border-dashed border-gray-800 rounded-lg"
            >
              ยังไม่มีข้อมูลร้าน — กด "+ เพิ่มข้อมูลใหม่" หรือ "Reset ทั้งหมด" ด้านล่าง
            </div>
          ) : (
            facts.map(f => (
              <BrandFactRow
                key={f.id}
                fact={f}
                onUpdate={onUpdate}
                onReset={onResetField}
                onDelete={onRemove}
              />
            ))
          )}

          <button
            type="button"
            onClick={() => onAdd('หัวข้อใหม่', '')}
            className="w-full min-h-[44px] border-2 border-dashed border-gray-700 hover:border-hermes hover:bg-hermes/5 text-gray-400 hover:text-hermes rounded-lg p-3 text-sm inline-flex items-center justify-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            เพิ่มข้อมูลใหม่
          </button>
        </div>

        <footer className="flex items-center justify-between gap-2 p-4 md:p-6 border-t border-gray-800">
          {confirmReset ? (
            <div className="flex items-center gap-2 flex-1 flex-wrap">
              <span className="text-xs text-gray-400">แน่ใจ? คืนค่าเริ่มต้นทั้งหมด</span>
              <button
                type="button"
                onClick={() => {
                  onResetAll();
                  setConfirmReset(false);
                }}
                className="text-sm px-3 min-h-[44px] bg-red-900/40 hover:bg-red-900/60 border border-red-800/50 text-red-100 rounded-md transition-colors"
              >
                ยืนยัน Reset
              </button>
              <button
                type="button"
                onClick={() => setConfirmReset(false)}
                className="text-sm px-3 min-h-[44px] bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-md transition-colors"
              >
                ยกเลิก
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              className="text-sm px-3 min-h-[44px] text-gray-400 hover:text-white inline-flex items-center gap-2 rounded-md"
            >
              <RefreshCw className="w-4 h-4" aria-hidden="true" />
              Reset ทั้งหมด
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="text-sm px-4 min-h-[44px] bg-hermes hover:bg-orange-600 text-white font-medium rounded-md transition-colors"
          >
            ปิด
          </button>
        </footer>
      </div>
    </div>
  );
}
