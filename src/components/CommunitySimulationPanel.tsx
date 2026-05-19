import { useState } from 'react';
import { Loader2, Play, X, Fish, RotateCcw, MessageSquare, FileText } from 'lucide-react';
import { useMiroFishSim, type SimStage } from '../hooks/useMiroFishSim';
import { isMiroFishConfigured, miroFishUrl } from '../lib/mirofish-client';
import type { AdIdea } from '../services/marketing-agent';
import type { BrandFact } from '../lib/brand-facts';

interface Props {
  readonly ad?: AdIdea | null;
  readonly brandFacts?: readonly BrandFact[];
}

const STAGE_LABEL: Record<SimStage, string> = {
  idle: 'พร้อมเริ่ม',
  seed_uploading: '1/6 · อัปโหลด seed',
  graph_building: '2/6 · สร้าง community graph',
  sim_creating: '3/6 · สร้าง simulation',
  sim_preparing: '4/6 · generate agent profiles',
  sim_starting: '5/6 · เริ่ม simulation',
  sim_running: '6/6 · agents กำลังโต้ตอบ',
  sim_done: 'เสร็จสมบูรณ์',
  error: 'ล้มเหลว',
  cancelled: 'ยกเลิก',
};

const STAGE_COLOR: Record<SimStage, string> = {
  idle: 'var(--color-fg-3)',
  seed_uploading: 'var(--color-info)',
  graph_building: 'var(--color-info)',
  sim_creating: 'var(--color-info)',
  sim_preparing: 'var(--color-info)',
  sim_starting: 'var(--color-info)',
  sim_running: 'var(--color-accent)',
  sim_done: 'var(--color-success)',
  error: 'var(--color-danger)',
  cancelled: 'var(--color-fg-3)',
};

const seedFromBrandData = (brandFacts: readonly BrandFact[]): string => {
  const factsBlock = brandFacts
    .filter(f => f.enabled && f.value.trim())
    .map(f => `${f.label}: ${f.value}`)
    .join('\n');

  return `=== Marnthara ม่านธารา ร้านม่านในลพบุรี ===

${factsBlock || '(ไม่มี brand facts)'}

=== บริบทตลาด ===
ลพบุรี-สิงห์บุรี-อ่างทอง — อากาศร้อนทั้งปี, ตลาด home improvement กลุ่ม middle income,
ลูกค้าหลัก: พ่อบ้าน-แม่บ้าน-เจ้าของธุรกิจขนาดเล็ก-คนรุ่นใหม่ที่อยู่คอนโด/หอ.
`;
};

export function CommunitySimulationPanel({ ad, brandFacts = [] }: Props) {
  const { state, start, cancel, reset, running } = useMiroFishSim();
  const [requirement, setRequirement] = useState(
    ad
      ? `วิเคราะห์ปฏิกิริยาของชุมชนต่อ ad ม่านธารา style "${ad.style}" — คาดการณ์ engagement, sentiment, และข้อโต้แย้ง`
      : 'วิเคราะห์พฤติกรรมและความสนใจของชุมชนเกี่ยวกับการตกแต่งบ้านในลพบุรี',
  );
  const [seedText, setSeedText] = useState<string>(() =>
    seedFromBrandData(brandFacts),
  );
  const [maxRounds, setMaxRounds] = useState(24);

  if (!isMiroFishConfigured()) {
    return (
      <div className="p-4">
        <div
          className="rounded-md border p-5 text-center space-y-2"
          style={{
            background: 'var(--color-bg-sunken)',
            borderColor: 'var(--color-border-faint)',
          }}
        >
          <Fish
            className="w-7 h-7 mx-auto"
            strokeWidth={1.5}
            style={{ color: 'var(--color-fg-3)' }}
            aria-hidden="true"
          />
          <p className="text-sm font-medium text-fg-1" lang="th">
            MiroFish ยังไม่ได้ตั้งค่า
          </p>
          <p className="text-[12px] text-fg-3 leading-relaxed" lang="th">
            ตั้ง <code>VITE_MIROFISH_URL=http://localhost:5001</code> ใน <code>.env</code> และ
            รัน MiroFish backend ก่อน
          </p>
          <p className="text-[11px] text-fg-4" lang="th">
            ดู <code>MIROFISH_SETUP.md</code>
          </p>
        </div>
      </div>
    );
  }

  const canStart = !running && requirement.trim().length > 0;

  return (
    <div className="p-4 space-y-4">
      <section
        className="rounded-md border p-4 space-y-3"
        style={{
          background: 'var(--color-bg-sunken)',
          borderColor: 'var(--color-border-faint)',
        }}
      >
        <header className="flex items-start gap-3">
          <Fish
            className="w-5 h-5 mt-0.5 shrink-0"
            strokeWidth={1.5}
            style={{ color: 'var(--color-accent)' }}
            aria-hidden="true"
          />
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-fg-1" lang="th">
              Community Simulation (MiroFish)
            </h3>
            <p className="text-[11px] text-fg-3 mt-0.5 leading-relaxed" lang="th">
              จำลอง agents หลายร้อยตัวให้เห็น ad ของคุณบน Reddit+Twitter-style platform แล้ว
              วัด virality + sentiment + engagement จริง · backend: {miroFishUrl()}
            </p>
          </div>
        </header>

        {ad && (
          <div
            className="rounded-md p-2.5 border text-[12px] leading-relaxed"
            style={{
              background: 'var(--color-bg)',
              borderColor: 'var(--color-border-faint)',
              borderLeft: '3px solid var(--color-accent)',
            }}
            lang="th"
          >
            <div className="font-mono text-[10px] tracking-[0.12em] uppercase text-fg-3 mb-1">
              ad ที่จะทดสอบ
            </div>
            <div className="text-fg-1 font-medium">{ad.style}</div>
            <div className="text-fg-2 whitespace-pre-wrap mt-1 line-clamp-3">{ad.copy}</div>
          </div>
        )}

        <label className="block">
          <span
            className="block font-mono text-[10.5px] uppercase tracking-[0.12em] text-fg-3 mb-1"
            lang="th"
          >
            Simulation requirement
          </span>
          <textarea
            value={requirement}
            onChange={e => setRequirement(e.target.value)}
            rows={2}
            disabled={running}
            lang="th"
            className="w-full rounded-md border px-2.5 py-1.5 text-sm text-fg-1 placeholder:text-fg-4 resize-y leading-relaxed focus:outline-none transition-colors disabled:opacity-60"
            style={{
              background: 'var(--color-bg)',
              borderColor: 'var(--color-border-faint)',
            }}
          />
        </label>

        <label className="block">
          <span
            className="block font-mono text-[10.5px] uppercase tracking-[0.12em] text-fg-3 mb-1"
            lang="th"
          >
            Seed text — brand context, quotes, ลูกค้า, ตลาด
          </span>
          <textarea
            value={seedText}
            onChange={e => setSeedText(e.target.value)}
            rows={8}
            disabled={running}
            lang="th"
            className="w-full rounded-md border px-2.5 py-1.5 text-[12px] text-fg-1 placeholder:text-fg-4 resize-y leading-relaxed focus:outline-none transition-colors disabled:opacity-60 font-mono"
            style={{
              background: 'var(--color-bg)',
              borderColor: 'var(--color-border-faint)',
            }}
          />
        </label>

        <div className="flex items-center justify-between gap-3 text-[12px]">
          <label className="inline-flex items-center gap-2 text-fg-3">
            <span lang="th">Max rounds:</span>
            <input
              type="number"
              min={4}
              max={144}
              value={maxRounds}
              onChange={e => setMaxRounds(Number(e.target.value) || 24)}
              disabled={running}
              className="w-16 rounded-md border px-2 py-1 text-fg-1 focus:outline-none disabled:opacity-60"
              style={{
                background: 'var(--color-bg)',
                borderColor: 'var(--color-border-faint)',
              }}
            />
          </label>
          <span className="text-[10.5px] text-fg-4" lang="th">
            ~1 รอบ ≈ 1 ชั่วโมง simulated
          </span>
        </div>

        <div className="flex items-center gap-2">
          {running ? (
            <button
              type="button"
              onClick={cancel}
              className="inline-flex items-center justify-center gap-1.5 min-h-[36px] px-4 rounded-md text-[13px] font-medium border transition-colors"
              style={{
                borderColor: 'color-mix(in oklch, var(--color-danger) 35%, transparent)',
                color: 'var(--color-danger)',
              }}
              lang="th"
            >
              <X className="w-3.5 h-3.5" strokeWidth={1.5} aria-hidden="true" />
              ยกเลิก sim
            </button>
          ) : state.stage === 'sim_done' || state.stage === 'error' || state.stage === 'cancelled' ? (
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center justify-center gap-1.5 min-h-[36px] px-4 rounded-md text-[13px] font-medium border transition-colors hover:bg-bg-hover"
              style={{
                borderColor: 'var(--color-border-faint)',
                color: 'var(--color-fg-2)',
              }}
              lang="th"
            >
              <RotateCcw className="w-3.5 h-3.5" strokeWidth={1.5} aria-hidden="true" />
              เริ่มใหม่
            </button>
          ) : (
            <button
              type="button"
              onClick={() =>
                void start({
                  simulationRequirement: requirement,
                  seedText,
                  ad: ad ?? undefined,
                  maxRounds,
                })
              }
              disabled={!canStart}
              className="inline-flex items-center justify-center gap-1.5 min-h-[36px] px-4 rounded-md text-[13px] font-medium transition-colors disabled:opacity-50"
              style={{
                background: 'var(--color-accent)',
                color: 'var(--color-accent-fg)',
              }}
              lang="th"
            >
              <Play className="w-3.5 h-3.5" strokeWidth={1.5} aria-hidden="true" />
              เริ่ม community simulation
            </button>
          )}
          <p className="text-[10.5px] text-fg-4 flex-1" lang="th">
            ⚠️ MiroFish จะใช้ LLM tokens เยอะ — อาจใช้เวลา 3-15 นาที ขึ้นกับ max rounds + agent count
          </p>
        </div>
      </section>

      {/* Progress indicator */}
      {state.stage !== 'idle' && (
        <section
          className="rounded-md border p-3 space-y-2"
          style={{
            background: 'var(--color-bg-sunken)',
            borderColor: 'var(--color-border-faint)',
          }}
        >
          <div className="flex items-center justify-between gap-3">
            <span
              className="font-mono text-[11px] tracking-[0.10em] uppercase"
              style={{ color: STAGE_COLOR[state.stage] }}
            >
              {STAGE_LABEL[state.stage]}
            </span>
            <span className="font-mono text-[11px] text-fg-3 tabular-nums">
              {state.progressPercent}%
              {state.totalActions > 0 ? ` · ${state.totalActions} actions` : ''}
            </span>
          </div>
          <div
            className="w-full h-1.5 rounded-pill overflow-hidden"
            style={{ background: 'var(--color-border-faint)' }}
          >
            <div
              className="h-full transition-all"
              style={{
                width: `${state.progressPercent}%`,
                background: STAGE_COLOR[state.stage],
              }}
            />
          </div>
          {state.message && (
            <p className="text-[11.5px] text-fg-3 leading-relaxed" lang="th">
              {running && (
                <Loader2
                  className="inline w-3 h-3 animate-spin mr-1 align-text-bottom"
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
              )}
              {state.message}
            </p>
          )}
          {state.error && (
            <p className="text-[11.5px] leading-relaxed" style={{ color: 'var(--color-danger)' }}>
              {state.error}
            </p>
          )}
          {state.simulationId && (
            <p className="text-[10.5px] text-fg-4 font-mono">
              sim: {state.simulationId}
              {state.projectId ? ` · proj: ${state.projectId}` : ''}
            </p>
          )}
        </section>
      )}

      {/* Results */}
      {state.stage === 'sim_done' && (
        <>
          {state.posts.length > 0 && (
            <section
              className="rounded-md border overflow-hidden"
              style={{
                background: 'var(--color-bg-sunken)',
                borderColor: 'var(--color-border-faint)',
              }}
            >
              <header
                className="px-3 py-2 flex items-center gap-2 border-b"
                style={{ borderColor: 'var(--color-border-faint)' }}
              >
                <FileText
                  className="w-3.5 h-3.5"
                  strokeWidth={1.5}
                  style={{ color: 'var(--color-accent)' }}
                  aria-hidden="true"
                />
                <span className="font-mono text-[10.5px] tracking-[0.14em] uppercase text-fg-3">
                  Agent posts ({state.posts.length})
                </span>
              </header>
              <ul className="p-2 space-y-1.5 list-none m-0 max-h-[400px] overflow-y-auto">
                {state.posts.slice(0, 30).map((p, i) => (
                  <li
                    key={`${p.post_id ?? i}-${i}`}
                    className="rounded-md border p-2.5 text-[12px] leading-relaxed"
                    style={{
                      background: 'var(--color-bg)',
                      borderColor: 'var(--color-border-faint)',
                    }}
                  >
                    <div className="flex items-center gap-2 mb-1 text-[10.5px] text-fg-3 font-mono">
                      <span>agent #{String(p.user_id ?? '?')}</span>
                      {typeof p.num_likes === 'number' && <span>· 👍 {p.num_likes}</span>}
                      {typeof p.num_shares === 'number' && <span>· 🔁 {p.num_shares}</span>}
                    </div>
                    <p className="text-fg-1 whitespace-pre-wrap" lang="th">
                      {p.content ?? '(no content)'}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {state.comments.length > 0 && (
            <section
              className="rounded-md border overflow-hidden"
              style={{
                background: 'var(--color-bg-sunken)',
                borderColor: 'var(--color-border-faint)',
              }}
            >
              <header
                className="px-3 py-2 flex items-center gap-2 border-b"
                style={{ borderColor: 'var(--color-border-faint)' }}
              >
                <MessageSquare
                  className="w-3.5 h-3.5"
                  strokeWidth={1.5}
                  style={{ color: 'var(--color-info)' }}
                  aria-hidden="true"
                />
                <span className="font-mono text-[10.5px] tracking-[0.14em] uppercase text-fg-3">
                  Agent comments ({state.comments.length})
                </span>
              </header>
              <ul className="p-2 space-y-1.5 list-none m-0 max-h-[400px] overflow-y-auto">
                {state.comments.slice(0, 50).map((c, i) => (
                  <li
                    key={`${c.comment_id ?? i}-${i}`}
                    className="rounded-md border p-2 text-[11.5px] leading-relaxed"
                    style={{
                      background: 'var(--color-bg)',
                      borderColor: 'var(--color-border-faint)',
                    }}
                  >
                    <div className="text-[10px] text-fg-3 font-mono mb-0.5">
                      agent #{String(c.user_id ?? '?')} → post #{String(c.post_id ?? '?')}
                    </div>
                    <p className="text-fg-2" lang="th">
                      {c.content ?? '(no content)'}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {state.posts.length === 0 && state.comments.length === 0 && (
            <div
              className="rounded-md border border-dashed p-4 text-center text-[12px] text-fg-3"
              style={{ borderColor: 'var(--color-border-faint)' }}
              lang="th"
            >
              simulation จบแต่ไม่มี post/comment — ลองเพิ่ม max rounds หรือเช็ค backend logs
            </div>
          )}
        </>
      )}
    </div>
  );
}
