interface SectionTagProps {
  readonly code: string;
  /** When true, positions absolutely at top-right of the closest relative ancestor. */
  readonly floating?: boolean;
  readonly className?: string;
}

/**
 * Dev-only section identifier so we can refer to UI regions by name during
 * design feedback. The app is pre-launch — these are intentionally visible.
 */
export function SectionTag({ code, floating = false, className = '' }: SectionTagProps) {
  const base =
    'font-mono text-[9.5px] tracking-[0.08em] uppercase px-1.5 py-0.5 rounded-sm border pointer-events-none select-none';
  const pos = floating ? 'absolute top-1.5 right-1.5 z-10' : 'inline-block';
  return (
    <span
      aria-hidden="true"
      data-dev-code={code}
      className={`${base} ${pos} ${className}`}
      style={{
        background: 'var(--color-bg-elevated)',
        color: 'var(--color-fg-4)',
        borderColor: 'var(--color-border-faint)',
      }}
    >
      §{code}
    </span>
  );
}
