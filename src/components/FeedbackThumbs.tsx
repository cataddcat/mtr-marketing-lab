import { useEffect, useRef, useState } from 'react';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { useFeedback } from '../hooks/useFeedback';
import { DOWN_REASONS, type FeedbackTarget } from '../lib/feedback';

interface Props {
  readonly target: FeedbackTarget;
  /** Optional inline label (defaults to none). */
  readonly hint?: string;
  /** Size of the thumb icons; default 'sm'. */
  readonly size?: 'sm' | 'md';
  /** Visual variant. 'inline' for small spots in cards; 'standalone' adds a subtle border. */
  readonly variant?: 'inline' | 'standalone';
}

export function FeedbackThumbs({
  target,
  hint,
  size = 'sm',
  variant = 'inline',
}: Props) {
  const { current, setSignal, clear } = useFeedback(target);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [reasonText, setReasonText] = useState('');
  const popRef = useRef<HTMLDivElement>(null);

  // Close popover on outside click / escape
  useEffect(() => {
    if (!popoverOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!popRef.current) return;
      if (!popRef.current.contains(e.target as Node)) setPopoverOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPopoverOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [popoverOpen]);

  const isUp = current?.signal === 'up';
  const isDown = current?.signal === 'down';
  const iconSize = size === 'md' ? 'w-4 h-4' : 'w-3.5 h-3.5';
  const btnSize = size === 'md' ? 'min-w-[32px] min-h-[32px]' : 'min-w-[28px] min-h-[28px]';

  const handleUp = () => {
    if (isUp) clear();
    else setSignal('up');
    setPopoverOpen(false);
  };

  const handleDown = () => {
    if (isDown && !popoverOpen) {
      clear();
      return;
    }
    setReasonText(current?.reason ?? '');
    setPopoverOpen(true);
  };

  const submitReason = (reason?: string) => {
    const trimmed = (reason ?? reasonText).trim();
    setSignal('down', trimmed || undefined);
    setPopoverOpen(false);
  };

  return (
    <div
      className={
        variant === 'standalone'
          ? 'inline-flex items-center gap-1.5 rounded-pill border px-1.5 py-0.5 relative'
          : 'inline-flex items-center gap-1 relative'
      }
      style={
        variant === 'standalone'
          ? { borderColor: 'var(--color-border-faint)', background: 'var(--color-bg-sunken)' }
          : undefined
      }
    >
      {hint && (
        <span className="font-mono text-[9.5px] tracking-[0.10em] uppercase text-fg-3 mr-1">
          {hint}
        </span>
      )}
      <button
        type="button"
        onClick={handleUp}
        aria-label={isUp ? 'ลบ feedback บวก' : 'feedback บวก'}
        aria-pressed={isUp}
        title={isUp ? 'ลบ thumb up' : 'ผลลัพธ์ดี'}
        className={`inline-flex items-center justify-center ${btnSize} rounded-md transition-colors`}
        style={{
          color: isUp ? 'var(--color-success)' : 'var(--color-fg-3)',
          background: isUp
            ? 'color-mix(in oklch, var(--color-success) 12%, transparent)'
            : 'transparent',
        }}
      >
        <ThumbsUp className={iconSize} strokeWidth={1.5} aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={handleDown}
        aria-label={isDown ? 'แก้ไข feedback ลบ' : 'feedback ลบ'}
        aria-pressed={isDown}
        title={isDown ? 'แก้/ลบ thumb down' : 'ผลลัพธ์ไม่ดี (กดเพื่อเลือกเหตุผล)'}
        className={`inline-flex items-center justify-center ${btnSize} rounded-md transition-colors`}
        style={{
          color: isDown ? 'var(--color-danger)' : 'var(--color-fg-3)',
          background: isDown
            ? 'color-mix(in oklch, var(--color-danger) 12%, transparent)'
            : 'transparent',
        }}
      >
        <ThumbsDown className={iconSize} strokeWidth={1.5} aria-hidden="true" />
      </button>
      {isDown && current?.reason && !popoverOpen && (
        <span
          className="text-[10.5px] text-fg-3 max-w-[180px] truncate"
          title={current.reason}
          lang="th"
        >
          · {current.reason}
        </span>
      )}

      {popoverOpen && (
        <div
          ref={popRef}
          role="dialog"
          aria-label="เหตุผลที่ผลลัพธ์ไม่ดี"
          className="absolute top-full right-0 mt-1.5 z-30 w-[260px] rounded-md border p-2.5 shadow-lg space-y-2"
          style={{
            background: 'var(--color-bg-elevated)',
            borderColor: 'var(--color-border)',
            boxShadow: 'var(--shadow-3)',
          }}
        >
          <p
            className="font-mono text-[9.5px] tracking-[0.12em] uppercase text-fg-3"
            lang="th"
          >
            เหตุผล (เลือกหรือพิมพ์)
          </p>
          <div className="flex flex-wrap gap-1">
            {DOWN_REASONS.map(r => (
              <button
                key={r}
                type="button"
                onClick={() => submitReason(r)}
                className="text-[11px] px-2 py-1 rounded-pill border transition-colors hover:bg-bg-hover"
                style={{
                  borderColor: 'var(--color-border-faint)',
                  color: 'var(--color-fg-2)',
                }}
                lang="th"
              >
                {r}
              </button>
            ))}
          </div>
          <textarea
            value={reasonText}
            onChange={e => setReasonText(e.target.value)}
            rows={2}
            maxLength={240}
            placeholder="เพิ่มความเห็น (optional)"
            lang="th"
            className="w-full rounded-md border px-2 py-1.5 text-[12px] text-fg-1 placeholder:text-fg-4 resize-none focus:outline-none"
            style={{
              background: 'var(--color-bg)',
              borderColor: 'var(--color-border-faint)',
            }}
          />
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => {
                clear();
                setPopoverOpen(false);
              }}
              className="text-[11px] text-fg-3 hover:text-fg-1 min-h-[28px] px-1.5"
              lang="th"
            >
              ล้าง
            </button>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPopoverOpen(false)}
                className="text-[11px] text-fg-3 hover:text-fg-1 min-h-[28px] px-2"
                lang="th"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => submitReason()}
                className="text-[11px] font-medium min-h-[28px] px-2.5 rounded-md"
                style={{
                  background: 'var(--color-accent)',
                  color: 'var(--color-accent-fg)',
                }}
                lang="th"
              >
                บันทึก
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
