import { useState } from 'react';
import { Users, Clock, Play } from 'lucide-react';
import type { AdIdea } from '../services/marketing-agent';
import type { CommunitySimConfig } from '../lib/schemas';

interface Props {
  readonly ad: AdIdea;
  readonly onStart: (config: CommunitySimConfig) => void;
  readonly onCancel: () => void;
}

const AGENT_PRESETS: ReadonlyArray<{ value: number; label: string; hint: string }> = [
  { value: 5, label: '5 agents', hint: 'เร็ว · ~3-5 นาที · signal เล็ก' },
  { value: 20, label: '20 agents', hint: 'มาตรฐาน · ~7-10 นาที · signal ชัด' },
  { value: 100, label: '100 agents', hint: 'ลึก · ~30-60 นาที · campaign decision' },
];

const ROUND_PRESETS: ReadonlyArray<{ value: number; label: string; hint: string }> = [
  { value: 10, label: '10 rounds', hint: 'ปฏิกิริยาแรก' },
  { value: 24, label: '24 rounds', hint: '~1 วันเสมือน (มาตรฐาน)' },
  { value: 48, label: '48 rounds', hint: 'long-tail engagement' },
];

export function CommunitySimConfigForm({ ad, onStart, onCancel }: Props) {
  const [agents, setAgents] = useState<number>(20);
  const [rounds, setRounds] = useState<number>(24);

  return (
    <div className="p-4 space-y-4" data-dev-code="COMMUNITY_CONFIG">
      <section
        className="rounded-md border p-4 space-y-3"
        style={{
          background: 'var(--color-bg-sunken)',
          borderColor: 'var(--color-border-faint)',
          borderLeft: '3px solid var(--color-accent)',
        }}
      >
        <p
          className="font-mono text-[10.5px] tracking-[0.14em] uppercase inline-flex items-center gap-1.5"
          style={{ color: 'var(--color-accent)' }}
          lang="en"
        >
          <Users className="w-3 h-3" strokeWidth={1.5} aria-hidden="true" />
          Target ad
        </p>
        <p className="text-sm text-fg-2 leading-relaxed" lang="th">
          <span className="font-medium text-fg-1">{ad.style}</span>
          {' — '}
          <span className="text-fg-3">{ad.copy.slice(0, 120)}{ad.copy.length > 120 ? '…' : ''}</span>
        </p>
      </section>

      {/* Agent count */}
      <fieldset className="space-y-2">
        <legend
          className="font-mono text-[10.5px] tracking-[0.14em] uppercase text-fg-3 inline-flex items-center gap-1.5"
          lang="en"
        >
          <Users className="w-3 h-3" strokeWidth={1.5} aria-hidden="true" />
          Agent count
        </legend>
        <div className="grid grid-cols-3 gap-2">
          {AGENT_PRESETS.map(p => {
            const active = agents === p.value;
            return (
              <button
                key={p.value}
                type="button"
                onClick={() => setAgents(p.value)}
                className="text-left rounded-md border px-3 py-2.5 space-y-1 transition-colors"
                style={{
                  background: active
                    ? 'color-mix(in oklch, var(--color-accent) 10%, transparent)'
                    : 'var(--color-bg-elevated)',
                  borderColor: active
                    ? 'color-mix(in oklch, var(--color-accent) 45%, transparent)'
                    : 'var(--color-border)',
                  color: active ? 'var(--color-accent)' : 'var(--color-fg-1)',
                }}
              >
                <p className="font-medium text-sm">{p.label}</p>
                <p className="text-[10.5px] text-fg-3 leading-snug" lang="th">{p.hint}</p>
              </button>
            );
          })}
        </div>
      </fieldset>

      {/* Rounds */}
      <fieldset className="space-y-2">
        <legend
          className="font-mono text-[10.5px] tracking-[0.14em] uppercase text-fg-3 inline-flex items-center gap-1.5"
          lang="en"
        >
          <Clock className="w-3 h-3" strokeWidth={1.5} aria-hidden="true" />
          Simulation rounds
        </legend>
        <div className="grid grid-cols-3 gap-2">
          {ROUND_PRESETS.map(p => {
            const active = rounds === p.value;
            return (
              <button
                key={p.value}
                type="button"
                onClick={() => setRounds(p.value)}
                className="text-left rounded-md border px-3 py-2.5 space-y-1 transition-colors"
                style={{
                  background: active
                    ? 'color-mix(in oklch, var(--color-accent) 10%, transparent)'
                    : 'var(--color-bg-elevated)',
                  borderColor: active
                    ? 'color-mix(in oklch, var(--color-accent) 45%, transparent)'
                    : 'var(--color-border)',
                  color: active ? 'var(--color-accent)' : 'var(--color-fg-1)',
                }}
              >
                <p className="font-medium text-sm">{p.label}</p>
                <p className="text-[10.5px] text-fg-3 leading-snug" lang="th">{p.hint}</p>
              </button>
            );
          })}
        </div>
      </fieldset>

      {/* Estimated cost note */}
      <div
        className="rounded-md border p-3 text-[11.5px] text-fg-3 leading-relaxed"
        style={{
          background: 'var(--color-bg-sunken)',
          borderColor: 'var(--color-border-faint)',
        }}
        lang="th"
      >
        <p>
          <span className="font-medium text-fg-2">หมายเหตุ:</span>{' '}
          การรันจะทำงานเบื้องหลัง — คุณกลับมาดูผลที่ ad card ได้ตลอด
          มีการแจ้งเตือนเมื่อเสร็จ
        </p>
        <p className="mt-1 text-fg-4">
          ~{Math.ceil((agents * rounds) / 60)} นาที (ประมาณ) · ใช้ MiroFish pool free-first
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 inline-flex items-center justify-center text-sm px-3 py-2 min-h-[40px] rounded-md border text-fg-2 hover:text-fg-1 hover:bg-bg-hover transition-colors"
          style={{ borderColor: 'var(--color-border)' }}
          lang="th"
        >
          ยกเลิก
        </button>
        <button
          type="button"
          onClick={() => onStart({ agent_count: agents, rounds })}
          className="flex-1 inline-flex items-center justify-center gap-1.5 text-sm font-medium px-3 py-2 min-h-[40px] rounded-md transition-colors"
          style={{
            background: 'var(--color-accent)',
            color: 'var(--color-fg-on-accent, white)',
          }}
        >
          <Play className="w-3.5 h-3.5" strokeWidth={2} aria-hidden="true" />
          Start simulation
        </button>
      </div>
    </div>
  );
}
