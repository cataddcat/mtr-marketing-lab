import {
  Bookmark,
  ThumbsUp,
  ThumbsDown,
  LineChart,
  Download,
  Copy as CopyIcon,
  Languages,
  Trash2,
  Target,
} from 'lucide-react';
import type { AdIdea } from '../services/marketing-agent';
import type { AdEvaluation } from '../lib/schemas';
import { isPerformanceEmpty, type PerformanceMetrics } from '../lib/performance';
import { scoreClass, scoreColorVar, scoreBgVar } from '../lib/score';

type Outcome = 'used-good' | 'used-bad';

export interface SavedAdItem extends AdIdea {
  id: string;
  evaluation: AdEvaluation | null;
  outcome?: Outcome;
  performance?: PerformanceMetrics;
}

interface Props {
  readonly items: readonly SavedAdItem[];
  readonly headingId: string;
  /**
   * Subset of `items` whose IDs are currently feeding the Judge's
   * calibration prompt. Rendered as a small chip per matching item so
   * the user can see which past ads are actively shaping new scores.
   */
  readonly calibratingIds?: ReadonlySet<string>;
  readonly onRemove: (id: string) => void;
  readonly onToggleOutcome: (id: string, outcome: Outcome) => void;
  readonly onOpenPerformance: (id: string) => void;
  readonly onOpenTranslate: (id: string) => void;
  readonly onExport: (item: SavedAdItem) => void;
  readonly onCopy: (text: string) => void;
}

export function SavedLibrary({
  items,
  headingId,
  calibratingIds,
  onRemove,
  onToggleOutcome,
  onOpenPerformance,
  onOpenTranslate,
  onExport,
  onCopy,
}: Props) {
  if (items.length === 0) return null;

  return (
    <section aria-labelledby={headingId}>
      <div className="flex items-end justify-between gap-4 mb-4">
        <h2 id={headingId} className="sr-only">
          คลังโฆษณาที่บันทึก
        </h2>
        <span className="inline-flex items-center gap-2 text-sm font-medium text-fg-2">
          <Bookmark className="w-4 h-4" strokeWidth={1.5} style={{ color: 'var(--color-accent)' }} aria-hidden="true" />
          รายการที่บันทึก
        </span>
        <span className="font-mono text-[10.5px] tracking-[0.12em] uppercase text-fg-3">
          {items.length} saved
        </span>
      </div>

      <ul className="list-none p-0 space-y-2">
        {items.map((it) => {
          const score = it.evaluation?.average_score;
          const cls = score != null ? scoreClass(score) : null;
          const hasPerf = !isPerformanceEmpty(it.performance);
          return (
            <li
              key={it.id}
              className="grid items-center gap-3 px-3 py-2.5 rounded-md border"
              style={{
                gridTemplateColumns: 'minmax(110px, 130px) 64px minmax(0, 1fr) auto auto',
                background: 'var(--color-bg-elevated)',
                borderColor: 'var(--color-border)',
              }}
            >
              {/* Style chip */}
              <span
                className="font-mono text-[10.5px] tracking-[0.08em] uppercase px-2 py-1 rounded-pill border truncate text-center"
                style={{
                  background: 'var(--color-bg-sunken)',
                  color: 'var(--color-fg-2)',
                  borderColor: 'var(--color-border-faint)',
                }}
              >
                {it.style}
              </span>

              {/* Score pill */}
              {score != null ? (
                <span
                  className="inline-flex items-center justify-center px-2 py-1 rounded-pill font-mono text-[11px] font-medium tabular-nums border"
                  style={{
                    background: scoreBgVar(cls),
                    color: scoreColorVar(cls),
                    borderColor: 'var(--color-border-faint)',
                  }}
                >
                  {score.toFixed(1)}
                </span>
              ) : (
                <span
                  className="inline-flex items-center justify-center px-2 py-1 rounded-pill font-mono text-[11px] text-fg-4 border"
                  style={{
                    background: 'var(--color-bg-sunken)',
                    borderColor: 'var(--color-border-faint)',
                  }}
                >
                  —
                </span>
              )}

              {/* Copy preview */}
              <p className="text-[13px] text-fg-2 leading-snug line-clamp-2 min-w-0" lang="th">
                {it.copy}
              </p>

              {/* Outcome chip + optional calibration marker (stacked when both present) */}
              <div className="flex flex-col items-end gap-1 whitespace-nowrap">
                <span
                  className="font-mono text-[10.5px] tracking-[0.08em] uppercase px-2 py-1 rounded-pill border"
                  style={{
                    background: it.outcome
                      ? (it.outcome === 'used-good' ? 'var(--color-success-bg)' : 'var(--color-warning-bg)')
                      : 'var(--color-bg-sunken)',
                    color: it.outcome
                      ? (it.outcome === 'used-good' ? 'var(--color-success)' : 'var(--color-warning)')
                      : 'var(--color-fg-4)',
                    borderColor: 'var(--color-border-faint)',
                  }}
                >
                  {it.outcome === 'used-good' ? '↑ used · good' : it.outcome === 'used-bad' ? '↓ used · bad' : '— not used'}
                </span>
                {calibratingIds?.has(it.id) && (
                  <span
                    className="inline-flex items-center gap-1 font-mono text-[10px] tracking-[0.08em] uppercase px-2 py-0.5 rounded-pill border"
                    style={{
                      background: 'color-mix(in oklch, var(--color-accent) 8%, transparent)',
                      color: 'var(--color-accent)',
                      borderColor: 'color-mix(in oklch, var(--color-accent) 35%, transparent)',
                    }}
                    title="โฆษณานี้กำลังถูกใช้เป็น calibration ให้ Judge ตอนประเมิน ad ตัวใหม่"
                  >
                    <Target className="w-2.5 h-2.5" strokeWidth={1.5} aria-hidden="true" />
                    calibrating judge
                  </span>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0">
                <IconButton
                  label={`บันทึกว่าโฆษณาสไตล์ ${it.style} ใช้แล้วได้ผลดี`}
                  title="ใช้แล้วผลดี"
                  pressed={it.outcome === 'used-good'}
                  toneVar="--color-success"
                  onClick={() => onToggleOutcome(it.id, 'used-good')}
                >
                  <ThumbsUp className="w-3.5 h-3.5" strokeWidth={1.5} aria-hidden="true" />
                </IconButton>
                <IconButton
                  label={`บันทึกว่าโฆษณาสไตล์ ${it.style} ใช้แล้วผลไม่ดี`}
                  title="ใช้แล้วผลไม่ดี"
                  pressed={it.outcome === 'used-bad'}
                  toneVar="--color-warning"
                  onClick={() => onToggleOutcome(it.id, 'used-bad')}
                >
                  <ThumbsDown className="w-3.5 h-3.5" strokeWidth={1.5} aria-hidden="true" />
                </IconButton>
                <IconButton
                  label={`บันทึกผลโฆษณาของสไตล์ ${it.style}`}
                  title="บันทึกผลโฆษณา (Reach/CTR/Cost)"
                  pressed={hasPerf}
                  toneVar="--color-accent"
                  onClick={() => onOpenPerformance(it.id)}
                >
                  <LineChart className="w-3.5 h-3.5" strokeWidth={1.5} aria-hidden="true" />
                </IconButton>
                <IconButton
                  label={`ส่งออกโฆษณาสไตล์ ${it.style} เป็นไฟล์ Markdown`}
                  title="Export to Obsidian"
                  toneVar="--color-info"
                  onClick={() => onExport(it)}
                >
                  <Download className="w-3.5 h-3.5" strokeWidth={1.5} aria-hidden="true" />
                </IconButton>
                <IconButton
                  label={`คัดลอกข้อความโฆษณาสไตล์ ${it.style}`}
                  title="Copy"
                  onClick={() => onCopy(it.copy)}
                >
                  <CopyIcon className="w-3.5 h-3.5" strokeWidth={1.5} aria-hidden="true" />
                </IconButton>
                <IconButton
                  label={`แปลโฆษณาสไตล์ ${it.style}`}
                  title="แปลเป็น EN"
                  onClick={() => onOpenTranslate(it.id)}
                >
                  <Languages className="w-3.5 h-3.5" strokeWidth={1.5} aria-hidden="true" />
                </IconButton>
                <IconButton
                  label={`ลบโฆษณาสไตล์ ${it.style}`}
                  title="Delete"
                  toneVar="--color-danger"
                  onClick={() => onRemove(it.id)}
                >
                  <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} aria-hidden="true" />
                </IconButton>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

interface IconButtonProps {
  readonly label: string;
  readonly title: string;
  readonly pressed?: boolean;
  readonly toneVar?: string;
  readonly onClick: () => void;
  readonly children: React.ReactNode;
}

function IconButton({ label, title, pressed, toneVar, onClick, children }: IconButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={pressed}
      title={title}
      className="inline-flex items-center justify-center min-h-[32px] min-w-[32px] rounded-md border transition-colors text-fg-3 hover:text-fg-1 hover:bg-bg-hover"
      style={pressed && toneVar
        ? {
            color: `var(${toneVar})`,
            background: `color-mix(in oklch, var(${toneVar}) 12%, transparent)`,
            borderColor: `color-mix(in oklch, var(${toneVar}) 35%, transparent)`,
          }
        : { borderColor: 'var(--color-border-faint)' }
      }
    >
      {children}
    </button>
  );
}
