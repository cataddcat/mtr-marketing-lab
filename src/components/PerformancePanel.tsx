import { useEffect, useId, useRef, useState } from 'react';
import { Eye, MousePointerClick, Bookmark, Share2, Receipt } from 'lucide-react';
import {
  type PerformanceMetrics,
  ctrPercent,
  costPerClick,
  costPerReach,
} from '../lib/performance';

interface Props {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly adStyle: string;
  readonly initial: PerformanceMetrics | undefined;
  readonly onSave: (next: PerformanceMetrics) => void;
}

const toNumber = (s: string): number | undefined => {
  const trimmed = s.replace(/[, ]+/g, '');
  if (trimmed === '') return undefined;
  const n = Number(trimmed);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
};

const toStr = (n: number | undefined): string =>
  typeof n === 'number' ? String(n) : '';

export function PerformancePanel({ open, onClose, adStyle, initial, onSave }: Props) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);

  const [reach, setReach] = useState('');
  const [impressions, setImpressions] = useState('');
  const [clicks, setClicks] = useState('');
  const [saves, setSaves] = useState('');
  const [shares, setShares] = useState('');
  const [engagement, setEngagement] = useState('');
  const [cost, setCost] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!open) return;
    setReach(toStr(initial?.reach));
    setImpressions(toStr(initial?.impressions));
    setClicks(toStr(initial?.clicks));
    setSaves(toStr(initial?.saves));
    setShares(toStr(initial?.shares));
    setEngagement(toStr(initial?.engagement));
    setCost(toStr(initial?.cost_thb));
    setNotes(initial?.notes ?? '');
  }, [open, initial]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  const draft: PerformanceMetrics = {
    reach: toNumber(reach),
    impressions: toNumber(impressions),
    clicks: toNumber(clicks),
    saves: toNumber(saves),
    shares: toNumber(shares),
    engagement: toNumber(engagement),
    cost_thb: toNumber(cost),
    notes: notes.trim() || undefined,
    recorded_at: new Date().toISOString(),
  };

  const ctr = ctrPercent(draft);
  const cpc = costPerClick(draft);
  const cpm = costPerReach(draft);

  const handleSave = () => {
    onSave(draft);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center"
      onMouseDown={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="sheet-up bg-panel border border-gray-800 rounded-t-2xl md:rounded-2xl w-full max-w-xl max-h-[92vh] md:max-h-[85vh] flex flex-col shadow-card outline-none"
      >
        <header className="relative grid grid-cols-[1fr_auto_1fr] items-center px-3 py-2.5 border-b border-gray-800">
          <button
            type="button"
            onClick={onClose}
            className="justify-self-start text-sm text-gray-400 hover:text-gray-100 min-h-[44px] px-2"
          >
            ยกเลิก
          </button>
          <h2 id={titleId} className="justify-self-center text-[15px] font-semibold text-gray-100 truncate max-w-[60vw]">
            ผลโฆษณา · {adStyle}
          </h2>
          <button
            type="button"
            onClick={handleSave}
            className="justify-self-end text-sm text-hermes hover:text-orange-400 font-medium min-h-[44px] px-2"
          >
            บันทึก
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
          <p className="text-[12px] text-gray-400 leading-relaxed">
            ใส่ตัวเลขจาก Facebook Ads Manager / Insights หลังจาก ad ลงไปแล้ว — ใช้สร้าง feedback loop ให้ระบบเรียนรู้ว่าโฆษณาแบบไหนทำงานจริง.
            <br />ทุก field optional — ใส่เท่าที่มีก็ได้.
          </p>

          <section className="space-y-3">
            <h3 className="text-[11px] uppercase tracking-wide text-gray-500">การมองเห็น</h3>
            <div className="grid grid-cols-2 gap-2">
              <NumField icon={Eye} label="Reach" value={reach} onChange={setReach} hint="คนเห็นไม่ซ้ำ" />
              <NumField icon={Eye} label="Impressions" value={impressions} onChange={setImpressions} hint="ครั้งที่แสดง" />
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-[11px] uppercase tracking-wide text-gray-500">การโต้ตอบ</h3>
            <div className="grid grid-cols-2 gap-2">
              <NumField icon={MousePointerClick} label="Clicks" value={clicks} onChange={setClicks} hint="คลิกที่ลิงก์" />
              <NumField icon={Bookmark} label="Saves" value={saves} onChange={setSaves} hint="บันทึกไว้ดู" />
              <NumField icon={Share2} label="Shares" value={shares} onChange={setShares} hint="แชร์ออก" />
              <NumField icon={Eye} label="Engagement" value={engagement} onChange={setEngagement} hint="like+comment+...." />
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-[11px] uppercase tracking-wide text-gray-500">ต้นทุน</h3>
            <NumField icon={Receipt} label="ค่าโฆษณา (บาท)" value={cost} onChange={setCost} hint="รวมที่จ่ายให้ Meta/TikTok" />
          </section>

          {(ctr !== null || cpc !== null || cpm !== null) && (
            <section className="bg-black/30 border border-gray-700 rounded-lg p-3 space-y-1.5">
              <h3 className="text-[11px] uppercase tracking-wide text-gray-500 mb-2">คำนวณอัตโนมัติ</h3>
              {ctr !== null && (
                <Computed label="CTR (Click-through rate)" value={`${ctr.toFixed(2)}%`} />
              )}
              {cpc !== null && (
                <Computed label="CPC (Cost per click)" value={`฿${cpc.toFixed(2)}`} />
              )}
              {cpm !== null && (
                <Computed label="CPM (Cost per 1K reach)" value={`฿${cpm.toFixed(2)}`} />
              )}
            </section>
          )}

          <section className="space-y-2">
            <h3 className="text-[11px] uppercase tracking-wide text-gray-500">บันทึก</h3>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="เช่น 'ลงเสาร์-อาทิตย์ 5 วัน เริ่มแรงตั้งแต่วันที่ 2', 'ลูกค้าทักว่าราคา?'"
              className="w-full text-sm resize-y"
            />
          </section>
        </div>
      </div>
    </div>
  );
}

interface NumFieldProps {
  readonly icon: typeof Eye;
  readonly label: string;
  readonly value: string;
  readonly onChange: (next: string) => void;
  readonly hint?: string;
}

function NumField({ icon: Icon, label, value, onChange, hint }: NumFieldProps) {
  const inputId = useId();
  return (
    <div>
      <label htmlFor={inputId} className="text-[11px] text-gray-400 mb-1 inline-flex items-center gap-1.5">
        <Icon className="w-3 h-3 text-gray-500" aria-hidden="true" />
        {label}
      </label>
      <input
        id={inputId}
        type="text"
        inputMode="numeric"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={hint ?? '0'}
        className="w-full min-h-[44px] text-sm tabular-nums"
      />
    </div>
  );
}

function Computed({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-gray-400">{label}</span>
      <span className="text-hermes font-semibold tabular-nums">{value}</span>
    </div>
  );
}
