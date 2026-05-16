import {
  Loader2,
  Image as ImageIcon,
  BarChart,
  CheckCircle,
  Copy as CopyIcon,
  Check,
  Bookmark,
  Palette,
  TrendingUp,
  Microscope,
} from 'lucide-react';
import type { AdIdea, VisualPrompt } from '../services/marketing-agent';
import type { AdEvaluation, PersonaId } from '../lib/schemas';
import { PERSONA_LABELS, personaAverage } from '../lib/schemas';
import type { RewriteState } from './PersonaScoreCard';
import { InlineError } from './InlineError';
import { EnsembleBadge } from './EnsembleBadge';
import { PersonaPanelGroup } from './PersonaPanelGroup';
import { StructureBreakdown } from './StructureBreakdown';
import { ChannelFitPanel } from './ChannelFitPanel';
import { CompetitorPanel } from './CompetitorPanel';
import { ImagePreview } from './ImagePreview';
import { Gauge } from './Gauge';
import { Radar } from './Radar';
import { ScoreBar } from './ScoreBar';
import { scoreClass, scoreLabel, scoreColorVar, scoreBgVar } from '../lib/score';

interface Props {
  readonly ad: AdIdea;
  readonly idx: number;
  readonly expanded: boolean;
  readonly onToggle: (idx: number) => void;

  readonly evaluation: AdEvaluation | undefined;
  readonly evalLoading: boolean;
  readonly evalError: string | undefined;
  readonly onEvaluate: () => void;

  readonly visualPrompt: VisualPrompt | undefined;
  readonly visualLoading: boolean;
  readonly visualError: string | undefined;
  readonly onGenerateVisual: () => void;

  readonly ensembleLoading: boolean;
  readonly ensembleError: string | undefined;
  readonly onRunEnsemble: () => void;

  readonly copiedIndex: string | null;
  readonly onCopy: (text: string, id: string) => void;
  readonly onSave: () => void;

  readonly rewriteStateOf: (pid: PersonaId) => RewriteState | undefined;
  readonly onRewrite: (pid: PersonaId) => void;
  readonly onCopyRewrite: (text: string) => void;

  readonly trendsNew?: readonly string[];
  readonly trendsPrev?: readonly string[];
}

export function AdCard({
  ad,
  idx,
  expanded,
  onToggle,
  evaluation,
  evalLoading,
  evalError,
  onEvaluate,
  visualPrompt,
  visualLoading,
  visualError,
  onGenerateVisual,
  ensembleLoading,
  ensembleError,
  onRunEnsemble,
  copiedIndex,
  onCopy,
  onSave,
  rewriteStateOf,
  onRewrite,
  onCopyRewrite,
  trendsNew,
  trendsPrev,
}: Props) {
  const headingId = `ad-${ad.clientId}-heading`;
  const bodyId = `ad-${ad.clientId}-body`;
  const score = evaluation?.average_score;
  const cls = scoreClass(score);

  const handleRowClick = () => onToggle(idx);
  const stop = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <article
      aria-labelledby={headingId}
      className="overflow-hidden transition-colors"
      style={{
        background: 'var(--color-bg-elevated)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
      }}
    >
      {/* Collapsed row */}
      <button
        type="button"
        onClick={handleRowClick}
        aria-expanded={expanded}
        aria-controls={bodyId}
        className="w-full grid items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-bg-hover"
        style={{ gridTemplateColumns: '40px 130px 1fr 200px auto', minHeight: 56 }}
      >
        <span className="font-mono text-[11px] tracking-[0.14em] text-fg-3">
          0{idx + 1}
        </span>
        <span id={headingId} className="text-sm font-medium text-fg-1 truncate">
          {ad.style}
        </span>
        <span className="text-[13px] text-fg-2 truncate" lang="th">
          {ad.copy.split('\n')[0]}
        </span>
        <div className="flex items-center gap-2">
          {score != null ? (
            <>
              <div className="flex-1"><ScoreBar value={score} size="thin" /></div>
              <span
                className="font-mono text-[12px] font-medium tabular-nums shrink-0"
                style={{ color: scoreColorVar(cls) }}
              >
                {score.toFixed(1)}
              </span>
            </>
          ) : (
            <span className="font-mono text-[10.5px] tracking-[0.08em] uppercase text-fg-4">
              Not scored
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0" onClick={stop}>
          {!evaluation && (
            <button
              type="button"
              onClick={(e) => { stop(e); onEvaluate(); }}
              disabled={evalLoading}
              aria-busy={evalLoading}
              className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 min-h-[32px] rounded-md border border-border text-fg-2 hover:text-fg-1 hover:bg-bg-hover transition-colors disabled:opacity-50"
            >
              {evalLoading ? (
                <Loader2 className="w-3 h-3 animate-spin" strokeWidth={1.5} aria-hidden="true" />
              ) : (
                <BarChart className="w-3 h-3" strokeWidth={1.5} aria-hidden="true" />
              )}
              {evalLoading ? 'Scoring' : 'Evaluate'}
            </button>
          )}
          <button
            type="button"
            onClick={(e) => { stop(e); onCopy(ad.copy, `copy-${idx}`); }}
            aria-label="คัดลอกข้อความโฆษณา"
            title="Copy"
            className="inline-flex items-center justify-center min-h-[32px] min-w-[32px] rounded-md text-fg-3 hover:text-fg-1 hover:bg-bg-hover transition-colors"
          >
            {copiedIndex === `copy-${idx}` ? (
              <Check className="w-4 h-4" strokeWidth={1.5} style={{ color: 'var(--color-success)' }} aria-hidden="true" />
            ) : (
              <CopyIcon className="w-4 h-4" strokeWidth={1.5} aria-hidden="true" />
            )}
          </button>
          <button
            type="button"
            onClick={(e) => { stop(e); onSave(); }}
            aria-label="บันทึก ad"
            title="Save"
            className="inline-flex items-center justify-center min-h-[32px] min-w-[32px] rounded-md text-fg-3 hover:text-fg-1 hover:bg-bg-hover transition-colors"
          >
            <Bookmark className="w-4 h-4" strokeWidth={1.5} aria-hidden="true" />
          </button>
        </div>
      </button>

      {/* Expanded body */}
      {expanded && (
        <div
          id={bodyId}
          className="px-5 py-5 space-y-5 border-t"
          style={{ borderColor: 'var(--color-border-faint)' }}
        >
          {/* Full copy */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <p className="font-mono text-[10.5px] tracking-[0.14em] uppercase text-fg-3 inline-flex items-center gap-1.5">
                <CheckCircle className="w-3 h-3" strokeWidth={1.5} aria-hidden="true" />
                Ad copy
              </p>
            </div>
            <p
              className="whitespace-pre-wrap text-fg-1 p-4 rounded-md text-sm leading-relaxed border"
              style={{
                background: 'var(--color-bg-sunken)',
                borderColor: 'var(--color-border-faint)',
                borderLeft: '3px solid var(--color-accent)',
              }}
              lang="th"
            >
              {ad.copy}
            </p>
          </div>

          {/* Visual idea */}
          <div className="space-y-2">
            <p className="font-mono text-[10.5px] tracking-[0.14em] uppercase text-fg-3 inline-flex items-center gap-1.5">
              <ImageIcon className="w-3 h-3" strokeWidth={1.5} aria-hidden="true" />
              Visual &amp; infographic idea
            </p>
            <p className="text-sm text-fg-2 leading-relaxed" lang="th">
              {ad.visual_idea}
            </p>

            {visualError && (
              <div className="mt-2">
                <InlineError
                  message={visualError}
                  onRetry={onGenerateVisual}
                />
              </div>
            )}

            {!visualPrompt ? (
              <button
                type="button"
                onClick={onGenerateVisual}
                disabled={visualLoading}
                aria-busy={visualLoading}
                className="mt-2 text-xs px-3 py-2 min-h-[36px] rounded-md inline-flex items-center gap-2 transition-colors disabled:opacity-50 border border-border text-fg-2 hover:text-fg-1 hover:bg-bg-hover"
              >
                {visualLoading ? (
                  <Loader2 className="animate-spin w-3 h-3" strokeWidth={1.5} aria-hidden="true" />
                ) : (
                  <Palette className="w-3 h-3" strokeWidth={1.5} aria-hidden="true" />
                )}
                แปลงเป็นคำค้นหา (Canva / AI Image)
              </button>
            ) : (
              <div
                className="mt-3 p-3 rounded-md space-y-3 border"
                style={{
                  background: 'var(--color-bg-sunken)',
                  borderColor: 'var(--color-border-faint)',
                }}
              >
                <div className="grid gap-3 md:grid-cols-2 items-start">
                  <PromptBlock
                    label="🎨 AI image prompt (Midjourney/DALL-E)"
                    toneAccent
                    text={visualPrompt.ai_prompt}
                    copied={copiedIndex === `ai-${idx}`}
                    onCopy={() => onCopy(visualPrompt.ai_prompt, `ai-${idx}`)}
                  />
                  <PromptBlock
                    label="🔍 Canva search keywords"
                    text={visualPrompt.canva_keywords}
                    copied={copiedIndex === `canva-${idx}`}
                    onCopy={() => onCopy(visualPrompt.canva_keywords, `canva-${idx}`)}
                  />
                </div>
                <ImagePreview
                  prompt={visualPrompt.ai_prompt}
                  downloadName={`mtr-preview-${ad.style.replace(/\s+/g, '-')}.png`}
                />
              </div>
            )}
          </div>

          {/* Evaluation */}
          <div className="pt-4 space-y-4 border-t" style={{ borderColor: 'var(--color-border-faint)' }}>
            {evalError && (
              <InlineError message={evalError} onRetry={onEvaluate} />
            )}
            {!evaluation ? (
              <div
                className="rounded-md p-6 text-center text-sm text-fg-3 border"
                style={{
                  background: 'var(--color-bg-sunken)',
                  borderColor: 'var(--color-border-faint)',
                }}
              >
                {evalLoading ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} style={{ color: 'var(--color-accent)' }} aria-hidden="true" />
                    Judge panel scoring…
                  </span>
                ) : (
                  <>Click <b className="text-fg-1 font-medium">Evaluate</b> to send this draft through the Judge panel.</>
                )}
              </div>
            ) : (
              <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
                {/* Verdict gauge */}
                <div
                  className="rounded-md p-5 flex flex-col items-center text-center border"
                  style={{
                    background: 'var(--color-bg-elevated)',
                    borderColor: 'var(--color-border-faint)',
                  }}
                >
                  <p className="font-mono text-[10.5px] tracking-[0.14em] uppercase text-fg-3 mb-3">
                    Panel verdict
                  </p>
                  <Gauge value={evaluation.average_score} size={170} />
                  <span
                    className="mt-3 inline-flex items-center px-3 py-1 rounded-pill font-mono text-[10.5px] tracking-[0.08em] uppercase border"
                    style={{
                      background: scoreBgVar(cls),
                      color: scoreColorVar(cls),
                      borderColor: 'var(--color-border-faint)',
                    }}
                  >
                    {scoreLabel(evaluation.average_score)}
                  </span>
                  <p className="text-[12.5px] text-fg-2 leading-relaxed mt-3" lang="th">
                    {evaluation.panel_verdict}
                  </p>
                  {evaluation.ensemble && (
                    <div className="mt-3">
                      <EnsembleBadge meta={evaluation.ensemble} />
                    </div>
                  )}
                  {evaluation.trends_used.length > 0 && (
                    <p className="text-[11px] text-fg-3 mt-3 inline-flex items-start gap-1.5" lang="th">
                      <TrendingUp className="w-3 h-3 mt-0.5 shrink-0" strokeWidth={1.5} style={{ color: 'var(--color-info)' }} aria-hidden="true" />
                      <span>เทรนด์ที่ Judge ใช้: <span style={{ color: 'var(--color-accent)' }}>{evaluation.trends_used.join(' · ')}</span></span>
                    </p>
                  )}
                  {trendsNew && trendsNew.length > 0 && (
                    <p
                      className="text-[11px] text-fg-3 mt-1.5 inline-flex items-start gap-1.5"
                      title={trendsPrev && trendsPrev.length > 0
                        ? `ก่อน 30 นาที: ${trendsPrev.slice(0, 5).join(' · ')}`
                        : undefined}
                      lang="th"
                    >
                      <span aria-hidden="true" style={{ color: 'var(--color-warning)' }}>🔥</span>
                      <span>เพิ่งมาแรง (30 นาที): <span style={{ color: 'var(--color-warning)' }}>{trendsNew.slice(0, 5).join(' · ')}</span></span>
                    </p>
                  )}
                  {!evaluation.ensemble && (
                    <div
                      className="mt-3 pt-3 w-full border-t"
                      style={{ borderColor: 'var(--color-border-faint)' }}
                    >
                      {ensembleError && (
                        <p className="text-[11px] mb-1.5" style={{ color: 'var(--color-danger)' }}>{ensembleError}</p>
                      )}
                      <button
                        type="button"
                        onClick={onRunEnsemble}
                        disabled={ensembleLoading}
                        aria-busy={ensembleLoading}
                        className="text-[11px] text-fg-3 hover:text-accent inline-flex items-center gap-1.5 min-h-[28px] disabled:opacity-50 transition-colors"
                      >
                        {ensembleLoading ? (
                          <Loader2 className="w-3 h-3 animate-spin" strokeWidth={1.5} aria-hidden="true" />
                        ) : (
                          <Microscope className="w-3 h-3" strokeWidth={1.5} aria-hidden="true" />
                        )}
                        {ensembleLoading
                          ? 'กำลังประเมินเพิ่ม 2 รอบ...'
                          : 'วิเคราะห์ลึก (3-run ensemble)'}
                      </button>
                    </div>
                  )}
                  <div
                    className="mt-3 pt-3 w-full border-t flex flex-col items-center gap-2"
                    style={{ borderColor: 'var(--color-border-faint)' }}
                  >
                    <p className="font-mono text-[10.5px] tracking-[0.14em] uppercase text-fg-3 self-start">
                      Persona radar
                    </p>
                    <Radar
                      values={evaluation.personas.map(personaAverage)}
                      labels={evaluation.personas.map(p => ({ name: PERSONA_LABELS[p.id] }))}
                      size={220}
                    />
                  </div>
                </div>

                {/* Right column: structure + channel + personas + competitor */}
                <div className="space-y-3 min-w-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <StructureBreakdown structure={evaluation.structure} />
                    <ChannelFitPanel channelFit={evaluation.channel_fit} />
                  </div>
                  {evaluation.competitor && (
                    <CompetitorPanel comparison={evaluation.competitor} />
                  )}
                  <PersonaPanelGroup
                    personas={evaluation.personas}
                    rewriteStateOf={rewriteStateOf}
                    onRewrite={onRewrite}
                    onCopyRewrite={onCopyRewrite}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </article>
  );
}

interface PromptBlockProps {
  readonly label: string;
  readonly text: string;
  readonly copied: boolean;
  readonly onCopy: () => void;
  readonly toneAccent?: boolean;
}

function PromptBlock({ label, text, copied, onCopy, toneAccent }: PromptBlockProps) {
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <p
          className="text-xs font-medium"
          style={{ color: toneAccent ? 'var(--color-accent)' : 'var(--color-info)' }}
        >
          {label}
        </p>
        <button
          type="button"
          onClick={onCopy}
          aria-label="คัดลอก prompt"
          className="text-fg-3 hover:text-fg-1 inline-flex items-center justify-center min-h-[28px] min-w-[28px] rounded-md transition-colors"
        >
          {copied ? (
            <Check className="w-3 h-3" strokeWidth={1.5} style={{ color: 'var(--color-success)' }} aria-hidden="true" />
          ) : (
            <CopyIcon className="w-3 h-3" strokeWidth={1.5} aria-hidden="true" />
          )}
        </button>
      </div>
      <p
        className="text-xs text-fg-2 p-2 rounded font-mono leading-relaxed border"
        style={{
          background: 'var(--color-bg-elevated)',
          borderColor: 'var(--color-border-faint)',
        }}
      >
        {text}
      </p>
    </div>
  );
}
