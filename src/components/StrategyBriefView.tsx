import { Loader2, Wand2, Trash2 } from 'lucide-react';
import type {
  StrategyBrief,
  Archetype,
  CampaignObjective,
  FunnelStage,
  AudienceSegment,
  CompetitorEntry,
  WhiteSpaceItem,
  ChannelBenchmark,
} from '../lib/strategy-brief';
import {
  ARCHETYPE_LABELS,
  OBJECTIVE_LABELS,
  FUNNEL_LABELS,
  summarizeBrief,
} from '../lib/strategy-brief';
import type { ChannelId, PersonaId } from '../lib/schemas';
import { CHANNEL_LABELS, PERSONA_LABELS } from '../lib/schemas';
import { FeedbackThumbs } from './FeedbackThumbs';
import { hashContent } from '../lib/feedback';

interface Props {
  readonly brief: StrategyBrief | null;
  readonly loading: boolean;
  readonly error: string | null;
  readonly isStale: boolean;
  readonly product: string;
  readonly onGenerate: () => void;
  readonly onRegenerate: () => void;
  readonly onUpdate: (path: string, value: unknown) => void;
  readonly onClear: () => void;
}

export function StrategyBriefView({
  brief,
  loading,
  error,
  isStale,
  product,
  onGenerate,
  onRegenerate,
  onUpdate,
  onClear,
}: Props) {
  const canDraft = product.trim().length > 0;

  if (!brief) {
    return (
      <div className="p-5 space-y-4">
        {error && <ErrorBox message={error} />}
        <div
          className="rounded-md border border-dashed p-6 text-center"
          style={{ borderColor: 'var(--color-border)' }}
          lang="th"
        >
          <p className="text-sm text-fg-2 leading-relaxed mb-1">
            ยังไม่มี Strategy Brief สำหรับแคมเปญนี้
          </p>
          <p className="text-xs text-fg-3 mb-4 leading-relaxed">
            Brief คือ ground truth ของแบรนด์+กลุ่มเป้าหมาย+คู่แข่ง+แคมเปญ — AI จะอ่านก่อนสร้างและประเมินทุก ad
          </p>
          {isStale && (
            <p className="text-[11px] text-fg-3 mb-3" lang="th">
              (มี brief เก่าอยู่ในระบบ แต่ไม่ตรงกับ product/promo ปัจจุบัน)
            </p>
          )}
          <button
            type="button"
            onClick={onGenerate}
            disabled={!canDraft || loading}
            className="inline-flex items-center justify-center gap-2 min-h-[44px] px-5 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
            style={{
              background: 'var(--color-accent)',
              color: 'var(--color-accent-fg)',
            }}
          >
            {loading ? (
              <Loader2 className="animate-spin w-4 h-4" strokeWidth={1.5} aria-hidden="true" />
            ) : (
              <Wand2 className="w-4 h-4" strokeWidth={1.5} aria-hidden="true" />
            )}
            {loading ? 'กำลังร่าง...' : 'ร่าง Strategy Brief'}
          </button>
          {!canDraft && (
            <p className="text-[11px] text-fg-4 mt-3" lang="th">
              กรอก Product ก่อน จากนั้นกลับมาเปิด panel นี้
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {error && <ErrorBox message={error} />}

      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="font-mono text-[10.5px] tracking-[0.14em] uppercase text-fg-3 mb-1">
            Strategy Brief · {brief.source.replaceAll('_', ' ')}
          </div>
          <h3 className="text-sm font-semibold text-fg-1 leading-snug" lang="th">
            {summarizeBrief(brief)}
          </h3>
          <p className="text-[11px] text-fg-3 mt-1" lang="th">
            ร่างล่าสุด {new Date(brief.drafted_at).toLocaleString('th-TH', {
              dateStyle: 'medium',
              timeStyle: 'short',
            })}
            {brief.edited_fields.length > 0 && (
              <>
                {' · '}
                <span style={{ color: 'var(--color-accent)' }}>
                  {brief.edited_fields.length} ฟิลด์แก้แล้ว
                </span>
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={onRegenerate}
            disabled={loading}
            className="inline-flex items-center gap-1.5 text-xs min-h-[36px] px-2.5 rounded-md border transition-colors disabled:opacity-50"
            style={{
              borderColor: 'var(--color-border-faint)',
              color: 'var(--color-fg-2)',
            }}
            title="ขอ AI ร่างใหม่ (ฟิลด์ที่แก้ไว้จะคงอยู่)"
            lang="th"
          >
            {loading ? (
              <Loader2 className="animate-spin w-3.5 h-3.5" strokeWidth={1.5} aria-hidden="true" />
            ) : (
              <Wand2 className="w-3.5 h-3.5" strokeWidth={1.5} aria-hidden="true" />
            )}
            ร่างใหม่
          </button>
          <button
            type="button"
            onClick={onClear}
            disabled={loading}
            className="inline-flex items-center justify-center min-w-[36px] min-h-[36px] rounded-md text-fg-3 hover:text-danger transition-colors disabled:opacity-50"
            title="ลบ brief ของแคมเปญนี้"
            aria-label="ลบ brief"
          >
            <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} aria-hidden="true" />
          </button>
        </div>
      </div>

      <SectionCard
        title="Positioning"
        feedbackHash={hashContent(
          'strategist',
          brief.campaign_hash,
          'positioning',
          brief.positioning.archetype,
          brief.positioning.value_prop,
        )}
        feedbackKind="brief_positioning"
        feedbackParentId={brief.campaign_hash}
      >
        <SelectField
          label="Brand archetype"
          value={brief.positioning.archetype}
          options={Object.entries(ARCHETYPE_LABELS) as [Archetype, string][]}
          onChange={v => onUpdate('positioning.archetype', v)}
        />
        <TextField
          label="Value proposition"
          value={brief.positioning.value_prop}
          rows={2}
          onChange={v => onUpdate('positioning.value_prop', v)}
        />
        <StringListField
          label="Tone rules"
          items={brief.positioning.tone_rules}
          onChange={list => onUpdate('positioning.tone_rules', list)}
          placeholder="เช่น warm/ไม่ corporate"
        />
        <StringListField
          label="Brand promises"
          items={brief.positioning.brand_promises}
          onChange={list => onUpdate('positioning.brand_promises', list)}
          placeholder="เช่น รับประกัน 3 ปี"
        />
        <StringListField
          label="Anti-positioning (อย่าทำ)"
          items={brief.positioning.anti_positioning}
          onChange={list => onUpdate('positioning.anti_positioning', list)}
          placeholder="เช่น ไม่ใช่แบรนด์ luxury กรุงเทพ"
        />
      </SectionCard>

      <SectionCard
        title="Audience Segments"
        feedbackHash={hashContent(
          'strategist',
          brief.campaign_hash,
          'segments',
          brief.segments.map(s => s.name).join('|'),
        )}
        feedbackKind="brief_segments"
        feedbackParentId={brief.campaign_hash}
      >
        {brief.segments.map((seg, i) => (
          <SegmentEditor
            key={i}
            segment={seg}
            onPatch={(field, value) => onUpdate(`segments[${i}].${field}`, value)}
          />
        ))}
      </SectionCard>

      {brief.competitors.length > 0 && (
        <SectionCard
          title="Competitor landscape"
          feedbackHash={hashContent(
            'strategist',
            brief.campaign_hash,
            'competitors',
            brief.competitors.map(c => c.name).join('|'),
          )}
          feedbackKind="brief_competitors"
          feedbackParentId={brief.campaign_hash}
        >
          {brief.competitors.map((c, i) => (
            <CompetitorEditor
              key={i}
              entry={c}
              onPatch={(field, value) => onUpdate(`competitors[${i}].${field}`, value)}
            />
          ))}
        </SectionCard>
      )}

      {brief.whitespace.length > 0 && (
        <SectionCard
          title="Whitespace opportunities"
          feedbackHash={hashContent(
            'strategist',
            brief.campaign_hash,
            'whitespace',
            brief.whitespace.map(w => w.opportunity).join('|'),
          )}
          feedbackKind="brief_whitespace"
          feedbackParentId={brief.campaign_hash}
        >
          {brief.whitespace.map((w, i) => (
            <WhiteSpaceEditor
              key={i}
              item={w}
              onPatch={(field, value) => onUpdate(`whitespace[${i}].${field}`, value)}
            />
          ))}
        </SectionCard>
      )}

      <SectionCard
        title="Campaign"
        feedbackHash={hashContent(
          'strategist',
          brief.campaign_hash,
          'campaign',
          brief.campaign.objective,
          brief.campaign.offer_structure,
        )}
        feedbackKind="brief_campaign"
        feedbackParentId={brief.campaign_hash}
      >
        <SelectField
          label="Objective"
          value={brief.campaign.objective}
          options={Object.entries(OBJECTIVE_LABELS) as [CampaignObjective, string][]}
          onChange={v => onUpdate('campaign.objective', v)}
        />
        <TextField
          label="Offer structure"
          value={brief.campaign.offer_structure}
          rows={2}
          onChange={v => onUpdate('campaign.offer_structure', v)}
        />
        <TextField
          label="Urgency"
          value={brief.campaign.urgency}
          rows={1}
          onChange={v => onUpdate('campaign.urgency', v)}
        />
        <ChannelChips
          label="Channel mix (ลำดับความสำคัญ)"
          selected={brief.campaign.channel_mix}
          onChange={list => onUpdate('campaign.channel_mix', list)}
        />
      </SectionCard>

      {brief.benchmarks.length > 0 && (
        <SectionCard
          title="Channel benchmarks (AI estimate)"
          feedbackHash={hashContent(
            'strategist',
            brief.campaign_hash,
            'benchmarks',
            brief.benchmarks.map(b => b.channel).join('|'),
          )}
          feedbackKind="brief_benchmarks"
          feedbackParentId={brief.campaign_hash}
        >
          <div className="space-y-2">
            {brief.benchmarks.map((b, i) => (
              <BenchmarkRow key={i} bench={b} />
            ))}
            <p className="text-[10.5px] text-fg-4 mt-1" lang="th">
              * ค่าประมาณจาก AI ไม่ใช่ข้อมูลจริง — Phase 3 จะดึงจาก web/proxy
            </p>
          </div>
        </SectionCard>
      )}

      <p className="text-[10.5px] text-fg-4 text-center pt-1" lang="th">
        Brief เก็บใน browser ของคุณ (localStorage) · campaign hash: {brief.campaign_hash}
      </p>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// Add-button (mounted as headerAction of the Sheet)
// ════════════════════════════════════════════════════════════════════

interface AddButtonProps {
  readonly hasBrief: boolean;
  readonly loading: boolean;
  readonly canDraft: boolean;
  readonly onGenerate: () => void;
  readonly onRegenerate: () => void;
}

export function StrategyBriefHeaderAction({
  hasBrief,
  loading,
  canDraft,
  onGenerate,
  onRegenerate,
}: AddButtonProps) {
  const action = hasBrief ? onRegenerate : onGenerate;
  const label = hasBrief ? 'ร่างใหม่' : 'ร่าง brief';
  return (
    <button
      type="button"
      onClick={action}
      disabled={!canDraft || loading}
      aria-label={label}
      className="inline-flex items-center justify-center gap-1.5 min-h-[44px] px-3 rounded-md text-sm font-medium text-accent hover:bg-bg-hover transition-colors disabled:opacity-50"
      lang="th"
    >
      {loading ? (
        <Loader2 className="animate-spin w-4 h-4" strokeWidth={1.5} aria-hidden="true" />
      ) : (
        <Wand2 className="w-4 h-4" strokeWidth={1.5} aria-hidden="true" />
      )}
      {label}
    </button>
  );
}

// ════════════════════════════════════════════════════════════════════
// Sub-components
// ════════════════════════════════════════════════════════════════════

function ErrorBox({ message }: { readonly message: string }) {
  return (
    <div
      role="alert"
      className="rounded-md border p-3 text-xs"
      style={{
        background: 'var(--color-danger-bg)',
        borderColor: 'color-mix(in oklch, var(--color-danger) 35%, transparent)',
        color: 'var(--color-danger)',
      }}
      lang="th"
    >
      {message}
    </div>
  );
}

function SectionCard({
  title,
  children,
  feedbackHash,
  feedbackKind,
  feedbackParentId,
}: {
  readonly title: string;
  readonly children: React.ReactNode;
  readonly feedbackHash?: string;
  readonly feedbackKind?: string;
  readonly feedbackParentId?: string;
}) {
  return (
    <section
      className="rounded-md border overflow-hidden"
      style={{
        borderColor: 'var(--color-border-faint)',
        background: 'var(--color-bg-sunken)',
      }}
    >
      <div
        className="px-3 py-2 flex items-center justify-between gap-2 border-b"
        style={{ borderColor: 'var(--color-border-faint)' }}
      >
        <span
          className="font-mono text-[10.5px] tracking-[0.14em] uppercase text-fg-3"
          lang="th"
        >
          {title}
        </span>
        {feedbackHash && feedbackKind && (
          <FeedbackThumbs
            target={{
              contentHash: feedbackHash,
              role: 'strategist',
              kind: feedbackKind,
              parentId: feedbackParentId,
            }}
          />
        )}
      </div>
      <div className="p-3 space-y-3">{children}</div>
    </section>
  );
}

function TextField({
  label,
  value,
  rows = 1,
  onChange,
  placeholder,
}: {
  readonly label: string;
  readonly value: string;
  readonly rows?: number;
  readonly onChange: (next: string) => void;
  readonly placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="block text-[11px] uppercase tracking-wider text-fg-3 mb-1 font-mono" lang="th">
        {label}
      </span>
      <textarea
        value={value}
        rows={rows}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        lang="th"
        className="w-full rounded-md border px-2.5 py-1.5 text-sm text-fg-1 placeholder:text-fg-4 resize-y leading-relaxed focus:outline-none transition-colors"
        style={{
          background: 'var(--color-bg)',
          borderColor: 'var(--color-border-faint)',
        }}
      />
    </label>
  );
}

function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  readonly label: string;
  readonly value: T;
  readonly options: readonly [T, string][];
  readonly onChange: (next: T) => void;
}) {
  return (
    <label className="block">
      <span className="block text-[11px] uppercase tracking-wider text-fg-3 mb-1 font-mono" lang="th">
        {label}
      </span>
      <select
        value={value}
        onChange={e => onChange(e.target.value as T)}
        lang="th"
        className="w-full rounded-md border px-2.5 py-1.5 text-sm text-fg-1 focus:outline-none transition-colors"
        style={{
          background: 'var(--color-bg)',
          borderColor: 'var(--color-border-faint)',
        }}
      >
        {options.map(([val, lab]) => (
          <option key={val} value={val}>
            {lab}
          </option>
        ))}
      </select>
    </label>
  );
}

function StringListField({
  label,
  items,
  onChange,
  placeholder,
}: {
  readonly label: string;
  readonly items: readonly string[];
  readonly onChange: (next: string[]) => void;
  readonly placeholder?: string;
}) {
  return (
    <div>
      <span className="block text-[11px] uppercase tracking-wider text-fg-3 mb-1 font-mono" lang="th">
        {label}
      </span>
      <div className="space-y-1.5">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <input
              type="text"
              value={item}
              onChange={e => {
                const next = [...items];
                next[i] = e.target.value;
                onChange(next);
              }}
              placeholder={placeholder}
              lang="th"
              className="flex-1 rounded-md border px-2.5 py-1 text-sm text-fg-1 placeholder:text-fg-4 focus:outline-none"
              style={{
                background: 'var(--color-bg)',
                borderColor: 'var(--color-border-faint)',
              }}
            />
            <button
              type="button"
              onClick={() => onChange(items.filter((_, j) => j !== i))}
              className="text-fg-3 hover:text-danger transition-colors min-w-[28px] min-h-[28px] inline-flex items-center justify-center"
              aria-label="ลบ"
            >
              ×
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => onChange([...items, ''])}
          className="text-[11px] text-fg-3 hover:text-accent transition-colors"
          lang="th"
        >
          + เพิ่ม
        </button>
      </div>
    </div>
  );
}

function SegmentEditor({
  segment,
  onPatch,
}: {
  readonly segment: AudienceSegment;
  readonly onPatch: <K extends keyof AudienceSegment>(field: K, value: AudienceSegment[K]) => void;
}) {
  return (
    <div
      className="rounded-md border p-2.5 space-y-2"
      style={{
        background: 'var(--color-bg)',
        borderColor: 'var(--color-border-faint)',
      }}
    >
      <div className="flex items-start gap-2">
        <span
          className="font-mono text-[10px] px-1.5 py-0.5 rounded-pill shrink-0"
          style={{
            background: 'color-mix(in oklch, var(--color-accent) 12%, transparent)',
            color: 'var(--color-accent)',
          }}
        >
          #{segment.priority}
        </span>
        <input
          type="text"
          value={segment.name}
          onChange={e => onPatch('name', e.target.value)}
          placeholder="ชื่อ segment"
          lang="th"
          className="flex-1 bg-transparent border-0 px-0 py-0 text-sm font-semibold text-fg-1 placeholder:text-fg-4 focus:outline-none focus:ring-0"
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <SelectField
          label="Linked persona"
          value={(segment.linked_persona ?? 'null') as PersonaId | 'null'}
          options={[
            ['null' as PersonaId | 'null', '—'],
            ...(Object.entries(PERSONA_LABELS) as [PersonaId, string][]).map(
              ([k, v]) => [k as PersonaId | 'null', v] as [PersonaId | 'null', string],
            ),
          ]}
          onChange={v => onPatch('linked_persona', v === 'null' ? null : (v as PersonaId))}
        />
        <SelectField
          label="Funnel stage"
          value={segment.funnel_stage}
          options={Object.entries(FUNNEL_LABELS) as [FunnelStage, string][]}
          onChange={v => onPatch('funnel_stage', v)}
        />
      </div>
      <TextField
        label="JTBD functional"
        value={segment.jtbd_functional}
        rows={1}
        onChange={v => onPatch('jtbd_functional', v)}
      />
      <TextField
        label="JTBD emotional"
        value={segment.jtbd_emotional}
        rows={1}
        onChange={v => onPatch('jtbd_emotional', v)}
      />
      <TextField
        label="JTBD social"
        value={segment.jtbd_social}
        rows={1}
        onChange={v => onPatch('jtbd_social', v)}
      />
      <TextField
        label="Top objection"
        value={segment.top_objection}
        rows={1}
        onChange={v => onPatch('top_objection', v)}
      />
      <TextField
        label="Winning angle"
        value={segment.winning_angle}
        rows={2}
        onChange={v => onPatch('winning_angle', v)}
      />
    </div>
  );
}

function CompetitorEditor({
  entry,
  onPatch,
}: {
  readonly entry: CompetitorEntry;
  readonly onPatch: <K extends keyof CompetitorEntry>(field: K, value: CompetitorEntry[K]) => void;
}) {
  return (
    <div
      className="rounded-md border p-2.5 space-y-2"
      style={{
        background: 'var(--color-bg)',
        borderColor: 'var(--color-border-faint)',
      }}
    >
      <input
        type="text"
        value={entry.name}
        onChange={e => onPatch('name', e.target.value)}
        placeholder="ชื่อคู่แข่ง"
        lang="th"
        className="w-full bg-transparent border-0 px-0 py-0 text-sm font-semibold text-fg-1 placeholder:text-fg-4 focus:outline-none focus:ring-0"
      />
      <TextField label="Positioning" value={entry.positioning} rows={1} onChange={v => onPatch('positioning', v)} />
      <TextField label="Typical offer" value={entry.typical_offer} rows={1} onChange={v => onPatch('typical_offer', v)} />
      <TextField label="Weakness" value={entry.weakness} rows={1} onChange={v => onPatch('weakness', v)} />
    </div>
  );
}

function WhiteSpaceEditor({
  item,
  onPatch,
}: {
  readonly item: WhiteSpaceItem;
  readonly onPatch: <K extends keyof WhiteSpaceItem>(field: K, value: WhiteSpaceItem[K]) => void;
}) {
  return (
    <div
      className="rounded-md border p-2.5 space-y-2"
      style={{
        background: 'var(--color-bg)',
        borderColor: 'var(--color-border-faint)',
      }}
    >
      <TextField label="Opportunity" value={item.opportunity} rows={1} onChange={v => onPatch('opportunity', v)} />
      <TextField label="Evidence" value={item.evidence} rows={1} onChange={v => onPatch('evidence', v)} />
      <TextField
        label="Recommended angle"
        value={item.recommended_angle}
        rows={2}
        onChange={v => onPatch('recommended_angle', v)}
      />
    </div>
  );
}

function ChannelChips({
  label,
  selected,
  onChange,
}: {
  readonly label: string;
  readonly selected: readonly ChannelId[];
  readonly onChange: (next: ChannelId[]) => void;
}) {
  const all = Object.entries(CHANNEL_LABELS) as [ChannelId, string][];
  const toggle = (c: ChannelId) => {
    if (selected.includes(c)) onChange(selected.filter(x => x !== c));
    else onChange([...selected, c]);
  };
  return (
    <div>
      <span className="block text-[11px] uppercase tracking-wider text-fg-3 mb-1 font-mono" lang="th">
        {label}
      </span>
      <div className="flex flex-wrap gap-1.5">
        {all.map(([c, lab]) => {
          const isSel = selected.includes(c);
          const order = isSel ? selected.indexOf(c) + 1 : null;
          return (
            <button
              key={c}
              type="button"
              onClick={() => toggle(c)}
              className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-pill border min-h-[28px] transition-colors"
              style={
                isSel
                  ? {
                      background: 'color-mix(in oklch, var(--color-accent) 14%, transparent)',
                      borderColor: 'color-mix(in oklch, var(--color-accent) 45%, transparent)',
                      color: 'var(--color-accent)',
                    }
                  : {
                      borderColor: 'var(--color-border-faint)',
                      color: 'var(--color-fg-3)',
                    }
              }
            >
              {order !== null && (
                <span className="font-mono text-[9.5px] tabular-nums">{order}.</span>
              )}
              {lab}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function BenchmarkRow({ bench }: { readonly bench: ChannelBenchmark }) {
  return (
    <div
      className="rounded-md border p-2.5 grid grid-cols-2 gap-x-3 gap-y-1 text-[11.5px] leading-relaxed"
      style={{
        background: 'var(--color-bg)',
        borderColor: 'var(--color-border-faint)',
      }}
    >
      <div className="col-span-2 text-sm font-medium text-fg-1">
        {CHANNEL_LABELS[bench.channel]}
      </div>
      <div className="text-fg-3" lang="th">
        CTR p50:{' '}
        <span className="font-mono text-fg-2 tabular-nums">
          {bench.ctr_pct.p50.toFixed(2)}%
        </span>
      </div>
      <div className="text-fg-3" lang="th">
        CPC p50:{' '}
        <span className="font-mono text-fg-2 tabular-nums">
          ฿{bench.cpc_thb.p50.toFixed(0)}
        </span>
      </div>
      <div className="text-fg-3" lang="th">
        Hook:{' '}
        <span className="font-mono text-fg-2 tabular-nums">
          {bench.hook_length_chars.min}-{bench.hook_length_chars.max} ตัวอักษร
        </span>
      </div>
      <div className="text-fg-3" lang="th">
        Best time: <span className="text-fg-2">{bench.best_time_local}</span>
      </div>
      {bench.notes && (
        <div className="col-span-2 text-fg-3" lang="th">
          {bench.notes}
        </div>
      )}
    </div>
  );
}
