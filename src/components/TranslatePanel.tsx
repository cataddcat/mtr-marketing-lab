import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Loader2, Copy as CopyIcon, AlertCircle, Languages } from 'lucide-react';
import {
  translateAd,
  LANGUAGE_LABEL,
  type AdIdea,
  type TargetLanguage,
  type TranslatedAd,
} from '../services/marketing-agent';

interface Props {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly ad: AdIdea | null;
  readonly onCopy: (text: string) => void;
}

type State =
  | { status: 'idle' }
  | { status: 'loading'; lang: TargetLanguage }
  | { status: 'ready'; result: TranslatedAd }
  | { status: 'error'; lang: TargetLanguage; message: string };

const LANGS: readonly TargetLanguage[] = ['en', 'zh'];

export function TranslatePanel({ open, onClose, ad, onCopy }: Props) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [state, setState] = useState<State>({ status: 'idle' });

  const handleClose = useCallback(() => {
    abortRef.current?.abort();
    setState({ status: 'idle' });
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, handleClose]);

  if (!open || !ad) return null;

  const run = async (lang: TargetLanguage) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setState({ status: 'loading', lang });
    try {
      const result = await translateAd(ad, lang, controller.signal);
      if (controller.signal.aborted) return;
      if (result) {
        setState({ status: 'ready', result });
      } else {
        setState({ status: 'error', lang, message: 'แปลไม่สำเร็จ ลองอีกครั้ง' });
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setState({ status: 'error', lang, message: msg });
    }
  };

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
        className="sheet-up rounded-t-2xl md:rounded-xl w-full max-w-xl max-h-[92vh] md:max-h-[85vh] flex flex-col outline-none border"
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
          <span className="justify-self-start text-[11px] text-fg-3 px-2 truncate max-w-[40vw]">
            {ad.style}
          </span>
          <h2 id={titleId} className="justify-self-center text-[15px] font-semibold text-fg-1 inline-flex items-center gap-1.5" lang="th">
            <Languages className="w-4 h-4" strokeWidth={1.5} style={{ color: 'var(--color-accent)' }} aria-hidden="true" />
            แปลโฆษณา
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="justify-self-end text-sm font-medium min-h-[44px] px-2 transition-colors"
            style={{ color: 'var(--color-accent)' }}
            lang="th"
          >
            เสร็จ
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          <div
            className="rounded-md p-3 space-y-2 border"
            style={{
              background: 'var(--color-bg-sunken)',
              borderColor: 'var(--color-border-faint)',
            }}
          >
            <p className="font-mono text-[10.5px] tracking-[0.14em] uppercase text-fg-3" lang="th">ต้นฉบับ (ไทย)</p>
            <p className="text-xs text-fg-1 leading-relaxed whitespace-pre-wrap" lang="th">{ad.copy}</p>
          </div>

          <div className="flex gap-2 flex-wrap">
            {LANGS.map(lang => {
              const active =
                (state.status === 'loading' && state.lang === lang) ||
                (state.status === 'ready' && state.result.language === lang);
              return (
                <button
                  key={lang}
                  type="button"
                  onClick={() => run(lang)}
                  disabled={state.status === 'loading'}
                  className="text-sm px-3 min-h-[40px] rounded-md border inline-flex items-center gap-2 transition-colors disabled:opacity-50"
                  style={active
                    ? {
                        background: 'color-mix(in oklch, var(--color-accent) 12%, transparent)',
                        borderColor: 'color-mix(in oklch, var(--color-accent) 35%, transparent)',
                        color: 'var(--color-accent)',
                      }
                    : {
                        background: 'var(--color-bg-elevated)',
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-fg-2)',
                      }
                  }
                >
                  {state.status === 'loading' && state.lang === lang ? (
                    <Loader2 className="w-3 h-3 animate-spin" strokeWidth={1.5} aria-hidden="true" />
                  ) : null}
                  {LANGUAGE_LABEL[lang]}
                </button>
              );
            })}
          </div>

          {state.status === 'error' && (
            <p className="text-xs flex items-start gap-1.5" style={{ color: 'var(--color-danger)' }}>
              <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" strokeWidth={1.5} aria-hidden="true" />
              <span>{LANGUAGE_LABEL[state.lang]}: {state.message}</span>
            </p>
          )}

          {state.status === 'ready' && (
            <div
              className="rounded-md p-3 space-y-3 border"
              style={{
                background: 'var(--color-bg-sunken)',
                borderColor: 'color-mix(in oklch, var(--color-accent) 35%, transparent)',
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <p
                  className="font-mono text-[10px] tracking-[0.14em] uppercase"
                  style={{ color: 'var(--color-accent)' }}
                >
                  {LANGUAGE_LABEL[state.result.language]}
                </p>
                <button
                  type="button"
                  onClick={() => onCopy(state.result.copy)}
                  className="text-[11px] text-fg-3 hover:text-accent inline-flex items-center gap-1 min-h-[28px] transition-colors"
                  lang="th"
                >
                  <CopyIcon className="w-3 h-3" strokeWidth={1.5} aria-hidden="true" />
                  คัดลอก copy
                </button>
              </div>
              <p className="text-sm text-fg-1 leading-relaxed whitespace-pre-wrap">{state.result.copy}</p>
              <div
                className="pt-2 border-t"
                style={{ borderColor: 'var(--color-border-faint)' }}
              >
                <p className="font-mono text-[10px] tracking-[0.14em] uppercase text-fg-3 mb-1">Visual idea</p>
                <p className="text-xs text-fg-2 leading-relaxed">{state.result.visual_idea}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
