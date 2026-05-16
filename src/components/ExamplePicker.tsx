import { useEffect, useId, useRef, useState } from 'react';
import { Sparkles } from 'lucide-react';

interface Props {
  readonly examples: readonly string[];
  readonly onPick: (value: string) => void;
  readonly label: string;
}

export function ExamplePicker({ examples, onPick, label }: Props) {
  const [open, setOpen] = useState(false);
  const buttonId = useId();
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative inline-block">
      <button
        id={buttonId}
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={`เลือก${label}ตัวอย่าง`}
        className="inline-flex items-center gap-1 text-xs text-fg-3 hover:text-accent transition-colors min-h-[28px] px-2 -my-1 -mr-2 rounded-md"
      >
        <Sparkles className="w-3 h-3" strokeWidth={1.5} aria-hidden="true" />
        ตัวอย่าง
      </button>
      {open && (
        <div
          id={listId}
          role="listbox"
          aria-labelledby={buttonId}
          className="absolute right-0 top-full mt-1 z-30 w-72 max-h-72 overflow-y-auto rounded-md border"
          style={{
            background: 'var(--color-bg-elevated)',
            borderColor: 'var(--color-border)',
            boxShadow: 'var(--shadow-2)',
          }}
        >
          {examples.map((ex, i) => (
            <button
              key={i}
              type="button"
              role="option"
              aria-selected={false}
              onClick={() => {
                onPick(ex);
                setOpen(false);
              }}
              className="w-full text-left px-3 py-2.5 text-sm text-fg-2 hover:bg-bg-hover hover:text-accent transition-colors min-h-[40px] leading-snug border-b last:border-b-0"
              style={{ borderColor: 'var(--color-border-faint)' }}
              lang="th"
            >
              {ex}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
