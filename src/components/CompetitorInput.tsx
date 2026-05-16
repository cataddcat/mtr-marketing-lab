import { useId, useState } from 'react';
import { Plus, X, Swords } from 'lucide-react';
import { ExamplePicker } from './ExamplePicker';
import { COMPETITOR_EXAMPLES } from '../lib/example-prompts';

interface Props {
  readonly value: string;
  readonly onChange: (next: string) => void;
}

export function CompetitorInput({ value, onChange }: Props) {
  const fieldId = useId();
  const [expanded, setExpanded] = useState(value.trim().length > 0);

  if (!expanded) {
    return (
      <div className="flex flex-col">
        <span className="block mb-2 h-[15px]" aria-hidden="true">&nbsp;</span>
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="flex-1 min-h-[140px] rounded-md inline-flex items-center justify-center gap-2 text-sm text-fg-3 hover:text-accent transition-colors border border-dashed border-border hover:bg-bg-hover"
        >
          <Plus className="w-4 h-4" strokeWidth={1.5} aria-hidden="true" />
          <span lang="th">Advanced · เพิ่ม ad คู่แข่ง</span>
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-2">
        <label
          htmlFor={fieldId}
          className="block font-mono text-[10.5px] tracking-[0.14em] uppercase text-fg-3 inline-flex items-center gap-1.5"
        >
          <Swords className="w-3 h-3 text-fg-4" strokeWidth={1.5} aria-hidden="true" />
          Advanced · ad คู่แข่ง
        </label>
        <div className="flex items-center gap-1">
          <ExamplePicker
            examples={COMPETITOR_EXAMPLES}
            onPick={onChange}
            label="ad คู่แข่ง"
          />
          <button
            type="button"
            onClick={() => {
              onChange('');
              setExpanded(false);
            }}
            aria-label="ลบ ad คู่แข่ง"
            title="ลบและย่อกลับ"
            className="inline-flex items-center justify-center min-w-[24px] min-h-[24px] text-fg-3 hover:bg-bg-hover rounded-md transition-colors"
            style={{ color: 'var(--color-fg-3)' }}
            onMouseOver={(e) => { e.currentTarget.style.color = 'var(--color-danger)'; }}
            onMouseOut={(e) => { e.currentTarget.style.color = 'var(--color-fg-3)'; }}
          >
            <X className="w-3.5 h-3.5" strokeWidth={1.5} aria-hidden="true" />
          </button>
        </div>
      </div>
      <textarea
        id={fieldId}
        value={value}
        onChange={e => onChange(e.target.value)}
        rows={5}
        placeholder="วาง ad คู่แข่ง — Judge จะเปรียบเทียบให้"
        lang="th"
        className="w-full min-h-[140px] resize-none rounded-md border border-border bg-bg px-3 py-2 text-sm leading-relaxed text-fg-1 placeholder:text-fg-4 transition-colors hover:border-border-strong focus:border-accent"
      />
    </div>
  );
}
