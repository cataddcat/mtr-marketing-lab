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
        className="w-full text-sm text-gray-500 hover:text-hermes hover:bg-black/30 py-2 min-h-[44px] rounded-md inline-flex items-center justify-center gap-2 transition-colors border border-dashed border-gray-800 hover:border-hermes/40"
      >
        <Plus className="w-4 h-4" aria-hidden="true" />
        เพิ่ม ad คู่แข่งเพื่อเปรียบเทียบ
      </button>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-2">
        <label htmlFor={fieldId} className="block text-sm font-medium text-gray-400 inline-flex items-center gap-1.5">
          <Swords className="w-3.5 h-3.5 text-gray-500" aria-hidden="true" />
          Ad คู่แข่ง <span className="text-gray-600 font-normal text-xs">(optional)</span>
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
            className="inline-flex items-center justify-center min-w-[36px] min-h-[36px] text-gray-500 hover:text-red-300 rounded-md transition-colors"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>
      <textarea
        id={fieldId}
        value={value}
        onChange={e => onChange(e.target.value)}
        rows={4}
        placeholder="วาง ad ของคู่แข่งที่นี่ — Judge จะเปรียบเทียบกับ ad ที่เรา generate"
        className="w-full min-h-[80px] resize-y text-sm"
      />
      <p className="text-[11px] text-gray-500 mt-1.5 leading-relaxed">
        เปิดใช้แล้ว — ทุกครั้งที่กด "ประเมินความโดนใจ" ระบบจะ output {' '}
        <span className="text-hermes">เปรียบเทียบกับคู่แข่ง</span>{' '}
        ในแผงผลด้วย
      </p>
    </div>
  );
}
