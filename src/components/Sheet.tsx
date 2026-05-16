import { useCallback, useEffect, useId, useRef, type ReactNode } from 'react';

interface Props {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly title: string;
  readonly children: ReactNode;
  /** Optional element rendered on the right side of the header (e.g. an Add button). */
  readonly headerAction?: ReactNode;
}

/**
 * Generic modal sheet (centered on desktop, bottom-sheet on mobile) with a
 * standardized header bar ("เสร็จ" close button, centered title, optional action),
 * escape-to-close, scroll-lock, and backdrop click-to-close.
 */
export function Sheet({ open, onClose, title, children, headerAction }: Props) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);

  const handleClose = useCallback(() => {
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
        className="sheet-up rounded-t-2xl md:rounded-xl w-full max-w-xl max-h-[90vh] md:max-h-[85vh] flex flex-col outline-none border"
        style={{
          background: 'var(--color-bg-elevated)',
          borderColor: 'var(--color-border)',
          boxShadow: 'var(--shadow-3)',
        }}
      >
        <header
          className="grid grid-cols-[1fr_auto_1fr] items-center px-3 py-2.5 border-b"
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
            {title}
          </h2>
          <div className="justify-self-end">
            {headerAction}
          </div>
        </header>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
