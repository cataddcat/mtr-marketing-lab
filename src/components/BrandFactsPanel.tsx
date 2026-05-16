import { useCallback, useEffect, useId, useRef, useState } from 'react';
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
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, handleClose]);

  if (!open) return null;

  const activeCount = facts.filter(f => f.enabled && f.value.trim().length > 0).length;

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
        className="sheet-up rounded-t-2xl md:rounded-xl w-full max-w-xl max-h-[90vh] md:max-h-[80vh] flex flex-col outline-none border"
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
            className="justify-self-start text-sm font-medium min-h-[44px] px-2 transition-colors"
            style={{ color: 'var(--color-accent)' }}
            lang="th"
          >
            เสร็จ
          </button>
          <h2
            id={titleId}
            className="justify-self-center text-[15px] font-semibold text-fg-1"
            lang="th"
          >
            ข้อมูลร้าน
          </h2>
          <button
            type="button"
            onClick={() => onAdd('หัวข้อใหม่', '')}
            aria-label="เพิ่มข้อมูลใหม่"
            className="justify-self-end inline-flex items-center justify-center min-w-[44px] min-h-[44px] rounded-md text-fg-2 hover:text-accent hover:bg-bg-hover transition-colors"
          >
            <Plus className="w-5 h-5" strokeWidth={1.5} aria-hidden="true" />
          </button>
        </header>

        <div className="px-4 pt-3 pb-1 font-mono text-[10.5px] tracking-[0.14em] uppercase text-fg-3" lang="th">
          {activeCount} จาก {facts.length} รายการกำลังใช้งาน
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-3">
          {facts.length === 0 ? (
            <div
              role="status"
              className="m-4 text-center text-sm text-fg-3 py-10 border border-dashed rounded-md"
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
                className="text-sm text-fg-3 hover:text-fg-1 min-h-[44px] px-3 transition-colors"
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
                className="text-sm font-medium min-h-[44px] px-3 transition-colors"
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
              className="text-xs text-fg-3 hover:text-fg-1 min-h-[44px] px-2 transition-colors"
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
