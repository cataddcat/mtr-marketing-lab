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
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="w-full text-sm text-fg-3 hover:text-accent py-2 min-h-[40px] rounded-md inline-flex items-center justify-center gap-2 transition-colors border border-dashed border-border hover:bg-bg-hover"
      >
        <Plus className="w-4 h-4" strokeWidth={1.5} aria-hidden="true" />
        Advanced · เพิ่ม ad คู่แข่งเพื่อเปรียบเทียบ
      </button>
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
          Ad คู่แข่ง <span className="text-fg-4 normal-case tracking-normal">(optional)</span>
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
            className="inline-flex items-center justify-center min-w-[32px] min-h-[32px] text-fg-3 hover:bg-bg-hover rounded-md transition-colors"
            style={{ color: 'var(--color-fg-3)' }}
            onMouseOver={(e) => { e.currentTarget.style.color = 'var(--color-danger)'; }}
            onMouseOut={(e) => { e.currentTarget.style.color = 'var(--color-fg-3)'; }}
          >
            <X className="w-4 h-4" strokeWidth={1.5} aria-hidden="true" />
          </button>
        </div>
      </div>
      <textarea
        id={fieldId}
        value={value}
        onChange={e => onChange(e.target.value)}
        rows={3}
        placeholder="วาง ad ของคู่แข่งที่นี่ — Judge จะเปรียบเทียบกับ ad ที่เรา generate"
        lang="th"
        className="w-full min-h-[80px] resize-y rounded-md border border-border bg-bg px-3 py-2 text-sm leading-relaxed text-fg-1 placeholder:text-fg-4 transition-colors hover:border-border-strong focus:border-accent"
      />
      <p className="text-[11px] text-fg-3 mt-1.5 leading-relaxed" lang="th">
        เปิดใช้แล้ว — ทุกครั้งที่กด "ประเมินความโดนใจ" ระบบจะ output{' '}
        <span style={{ color: 'var(--color-accent)' }}>เปรียบเทียบกับคู่แข่ง</span>{' '}
        ในแผงผลด้วย
      </p>
    </div>
  );
}
