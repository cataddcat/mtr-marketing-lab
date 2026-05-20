import JSZip from 'jszip';
import { WikilinkRegistry } from '../lib/wikilink';
import {
  canvasId,
  positionInGrid,
  serializeCanvas,
  type CanvasFile,
  type CanvasNode,
  type CanvasEdge,
  type CanvasNodeColor,
} from '../lib/obsidian-canvas';
import type { ExportInput, AdExportRow } from '../lib/export-models';
import { buildAdRows } from '../lib/export-models';
import {
  ARCHETYPE_LABELS,
  OBJECTIVE_LABELS,
  FUNNEL_LABELS,
  type StrategyBrief,
} from '../lib/strategy-brief';
import {
  CHANNEL_LABELS,
  PERSONA_LABELS,
  getPersonaLabel,
  type ChannelId,
  type PersonaId,
} from '../lib/schemas';
import { isPerformanceEmpty } from '../lib/performance';

const VAULT_ROOT = 'Marnthara-Marketing';

// ════════════════════════════════════════════════════════════════════
// YAML frontmatter helper — keeps Thai + special chars safe
// ════════════════════════════════════════════════════════════════════

const yamlScalar = (value: string | number | null | boolean): string => {
  if (value === null) return 'null';
  if (typeof value === 'boolean' || typeof value === 'number') return String(value);
  // Always quote strings (handles colons, hyphens, Thai punctuation)
  return JSON.stringify(value);
};

const yamlList = (values: readonly (string | number)[]): string => {
  if (values.length === 0) return '[]';
  return `[${values.map(yamlScalar).join(', ')}]`;
};

interface FrontmatterFields {
  readonly [key: string]: string | number | boolean | null | readonly (string | number)[];
}

const renderFrontmatter = (fields: FrontmatterFields): string => {
  const lines = ['---'];
  for (const [key, value] of Object.entries(fields)) {
    if (Array.isArray(value)) {
      lines.push(`${key}: ${yamlList(value)}`);
    } else {
      lines.push(`${key}: ${yamlScalar(value as string | number | boolean | null)}`);
    }
  }
  lines.push('---', '');
  return lines.join('\n');
};

// ════════════════════════════════════════════════════════════════════
// Per-section renderers
// ════════════════════════════════════════════════════════════════════

const personaAvg = (p: {
  scroll_stop_score: number;
  focused_score: number;
  memory_score: number;
}): number => (p.scroll_stop_score + p.focused_score + p.memory_score) / 3;

const renderPersonaIndex = (registry: WikilinkRegistry): string => {
  const persona = (id: PersonaId): string =>
    registry.wikilink(`persona:${id}`, getPersonaLabel(id));
  const links = (Object.keys(PERSONA_LABELS) as PersonaId[])
    .map(id => `- ${persona(id)}`)
    .join('\n');
  return `# 👥 Personas (Map of Content)

15 core consumer archetypes the Judge can simulate. The app additionally
generates sub-personas at runtime from Strategy-Brief expansion — those
stay in localStorage and aren't exported here (transient by design).

${links}

Each persona note links to every ad the Judge thought it would respond well to (avg ≥ 7).
`;
};

const renderPersonaNote = (
  id: PersonaId,
  adsForPersona: readonly AdExportRow[],
  registry: WikilinkRegistry,
): string => {
  const fm = renderFrontmatter({
    type: 'persona',
    persona_id: id,
    label: getPersonaLabel(id),
    ad_count: adsForPersona.length,
  });
  const links = adsForPersona.length
    ? adsForPersona.map(r => `- ${registry.wikilink(`ad:${r.id}`, r.ad.style)}`).join('\n')
    : '- (ยังไม่มี ad ที่ตรงกับ persona นี้)';
  return `${fm}# 👤 ${getPersonaLabel(id)}

> Persona ที่ Judge ใช้สมมุติบทบาทผู้บริโภคในการประเมิน ad

## Ads ที่เข้าตา persona นี้ (avg ≥ 7)
${links}
`;
};

const renderBrandFactsNote = (input: ExportInput): string => {
  const active = input.brandFacts.filter(f => f.enabled && f.value.trim().length > 0);
  const fm = renderFrontmatter({
    type: 'brand_facts',
    count: active.length,
    exported_at: input.exportedAt,
  });
  const rows = active.map(f => `- **${f.label}**: ${f.value}`).join('\n');
  return `${fm}# 🏷️ Brand Facts

ข้อเท็จจริงเฉพาะของร้านม่านธารา — single source of truth ที่ AI อ้างอิงเสมอ

${rows || '_(ไม่มี facts ที่เปิดใช้)_'}
`;
};

const renderBriefNote = (
  brief: StrategyBrief,
  registry: WikilinkRegistry,
): string => {
  const fm = renderFrontmatter({
    type: 'strategy_brief',
    archetype: brief.positioning.archetype,
    objective: brief.campaign.objective,
    drafted_at: brief.drafted_at,
    source: brief.source,
    campaign_hash: brief.campaign_hash,
    edited_field_count: brief.edited_fields.length,
    segments: brief.segments.map(s => s.name),
    channel_mix: brief.campaign.channel_mix as readonly string[],
  });

  const segmentsBlock = brief.segments
    .map(
      s => `### Segment #${s.priority}: ${s.name}
- **JTBD (functional):** ${s.jtbd_functional}
- **JTBD (emotional):** ${s.jtbd_emotional}
- **JTBD (social):** ${s.jtbd_social}
- **Top objection:** ${s.top_objection}
- **Winning angle:** ${s.winning_angle}
- **Funnel:** ${FUNNEL_LABELS[s.funnel_stage]}
${s.linked_persona ? `- **Linked persona:** ${registry.wikilink(`persona:${s.linked_persona}`, getPersonaLabel(s.linked_persona))}` : ''}`,
    )
    .join('\n\n');

  const competitorsBlock = brief.competitors.length
    ? `## ⚔️ Competitor Landscape\n${brief.competitors
        .map(
          c => `### ${c.name}
- **Positioning:** ${c.positioning}
- **Typical offer:** ${c.typical_offer}
- **Weakness:** ${c.weakness}`,
        )
        .join('\n\n')}`
    : '';

  const whitespaceBlock = brief.whitespace.length
    ? `## 🎯 Whitespace Opportunities\n${brief.whitespace
        .map(
          (w, i) => `${i + 1}. **${w.opportunity}**
   - evidence: ${w.evidence}
   - recommended angle: ${w.recommended_angle}`,
        )
        .join('\n')}`
    : '';

  const benchmarksBlock = brief.benchmarks.length
    ? `## 📊 Channel Benchmarks _(AI estimate)_\n${brief.benchmarks
        .map(
          b => `### ${CHANNEL_LABELS[b.channel]}
- CTR p50: ${b.ctr_pct.p50.toFixed(2)}% (p25-p75: ${b.ctr_pct.p25.toFixed(2)}-${b.ctr_pct.p75.toFixed(2)})
- CPC p50: ฿${b.cpc_thb.p50.toFixed(0)}
- Hook length: ${b.hook_length_chars.min}-${b.hook_length_chars.max} chars
- Best time: ${b.best_time_local}
${b.notes ? `- note: ${b.notes}` : ''}`,
        )
        .join('\n\n')}`
    : '';

  return `${fm}# 🧭 Strategy Brief

> Drafted ${new Date(brief.drafted_at).toLocaleString('th-TH')} · source: \`${brief.source}\`
> ${brief.edited_fields.length} fields edited by user

## 🎨 Positioning
- **Archetype:** ${ARCHETYPE_LABELS[brief.positioning.archetype]}
- **Value proposition:** ${brief.positioning.value_prop}
- **Tone rules:**
${brief.positioning.tone_rules.map(t => `  - ${t}`).join('\n')}
- **Brand promises:**
${brief.positioning.brand_promises.map(p => `  - ${p}`).join('\n')}
- **Anti-positioning:**
${brief.positioning.anti_positioning.map(a => `  - ${a}`).join('\n')}

## 👥 Audience Segments
${segmentsBlock}

${competitorsBlock}

${whitespaceBlock}

## 📣 Campaign
- **Objective:** ${OBJECTIVE_LABELS[brief.campaign.objective]}
- **Offer structure:** ${brief.campaign.offer_structure}
- **Urgency:** ${brief.campaign.urgency || '_(none)_'}
- **Channel mix:** ${brief.campaign.channel_mix.map(c => CHANNEL_LABELS[c]).join(' → ')}

${benchmarksBlock}
`;
};

const renderAdNote = (
  row: AdExportRow,
  registry: WikilinkRegistry,
): string => {
  const ad = row.ad;
  const evalData = ad.evaluation;
  const avg = evalData?.average_score;
  const scoreText = typeof avg === 'number' ? avg.toFixed(1) : 'N/A';

  const fm: FrontmatterFields = {
    type: 'ad',
    style: ad.style,
    score: typeof avg === 'number' ? avg : 'N/A',
    outcome: ad.outcome ?? null,
    strong_personas: row.strongPersonas as readonly string[],
    best_channel: evalData?.channel_fit.best ?? null,
    has_strategy_fit: !!evalData?.strategy_fit,
    has_competitor: !!evalData?.competitor,
    ad_id: ad.id,
    linked_brief: row.briefId ? registry.linkOrNull(`brief:${row.briefId}`) ?? null : null,
  };

  const personaLines = evalData
    ? evalData.personas
        .map(p => {
          const linked = registry.wikilink(`persona:${p.id}`, getPersonaLabel(p.id));
          return `- ${linked} (${personaAvg(p).toFixed(1)}/10) — ${p.verdict}\n  - 💡 ${p.suggestion}`;
        })
        .join('\n')
    : '- N/A';

  const verdictLine = evalData?.panel_verdict ? `\n> ${evalData.panel_verdict}\n` : '';

  const structureLines = evalData
    ? `\n### 🧱 Structure
- **Hook** (${evalData.structure.hook_score}/10): ${evalData.structure.hook_critique}
- **Body** (${evalData.structure.body_score}/10): ${evalData.structure.body_critique}
- **CTA** (${evalData.structure.cta_score}/10): ${evalData.structure.cta_critique}
`
    : '';

  const channelLines = evalData
    ? `\n### 📱 Channel fit
- **Best:** ${CHANNEL_LABELS[evalData.channel_fit.best]}
- **Why:** ${evalData.channel_fit.reasoning}
- **Ranked:** ${evalData.channel_fit.ranked.map(r => `${CHANNEL_LABELS[r.channel]} ${r.score}/10`).join(' · ')}
`
    : '';

  const strategyFitLines = evalData?.strategy_fit
    ? (() => {
        const sf = evalData.strategy_fit;
        const jtbd = sf.jtbd_coverage
          .map(c => `  - **${c.segment_name}** (${c.score}/10) — gap: ${c.gap || '—'}`)
          .join('\n');
        return `\n### 🧭 Strategy fit (per Brief)
- **Positioning:** ${sf.positioning_score}/10 — ${sf.positioning_critique}
- **Whitespace:** ${sf.whitespace_capture}/10 — ${sf.whitespace_critique}
- **JTBD coverage:**
${jtbd}
`;
      })()
    : '';

  const competitorLines = evalData?.competitor
    ? `\n### ⚔️ Competitor
- **Winner:** ${evalData.competitor.winner} (margin ${evalData.competitor.margin}/10)
- **Ours strong:** ${evalData.competitor.ours_strengths.join(' · ')}
- **Theirs strong:** ${evalData.competitor.theirs_strengths.join(' · ')}
- **Recommendation:** ${evalData.competitor.recommendation}
`
    : '';

  const performanceLines = !isPerformanceEmpty(ad.performance)
    ? (() => {
        const p = ad.performance!;
        const rows: string[] = [];
        if (typeof p.reach === 'number') rows.push(`- **Reach:** ${p.reach.toLocaleString('en-US')}`);
        if (typeof p.impressions === 'number')
          rows.push(`- **Impressions:** ${p.impressions.toLocaleString('en-US')}`);
        if (typeof p.clicks === 'number') rows.push(`- **Clicks:** ${p.clicks.toLocaleString('en-US')}`);
        if (typeof p.saves === 'number') rows.push(`- **Saves:** ${p.saves.toLocaleString('en-US')}`);
        if (typeof p.shares === 'number') rows.push(`- **Shares:** ${p.shares.toLocaleString('en-US')}`);
        if (typeof p.engagement === 'number')
          rows.push(`- **Engagement:** ${p.engagement.toLocaleString('en-US')}`);
        if (typeof p.cost_thb === 'number') rows.push(`- **Cost:** ฿${p.cost_thb.toLocaleString('en-US')}`);
        if (p.notes) rows.push(`- **Notes:** ${p.notes}`);
        return rows.length > 0 ? `\n### 📈 Real Performance\n${rows.join('\n')}\n` : '';
      })()
    : '';

  const briefLink = row.briefId
    ? `\n> Strategy: ${registry.wikilink(`brief:${row.briefId}`)}\n`
    : '';

  return `${renderFrontmatter(fm)}# 🎯 ${ad.style}

${briefLink}
## 📝 Ad Copy

${ad.copy}

## 🖼️ Visual Idea

${ad.visual_idea}

## 📊 Evaluation
${verdictLine}**Average score:** ${scoreText}/10
${structureLines}${channelLines}${strategyFitLines}${competitorLines}${performanceLines}

### Per-persona breakdown
${personaLines}
`;
};

const renderIndexNote = (
  rows: readonly AdExportRow[],
  briefs: readonly StrategyBrief[],
  registry: WikilinkRegistry,
): string => {
  const briefLinks = briefs.length
    ? briefs.map(b => `- ${registry.wikilink(`brief:${b.campaign_hash}`)} · ${ARCHETYPE_LABELS[b.positioning.archetype]} · ${OBJECTIVE_LABELS[b.campaign.objective]}`).join('\n')
    : '- _(ยังไม่มี brief)_';

  const adLinks = rows.length
    ? rows
        .slice(0, 100)
        .map(r => `- ${registry.wikilink(`ad:${r.id}`, r.ad.style)}${r.ad.outcome ? ` (${r.ad.outcome})` : ''}`)
        .join('\n')
    : '- _(ยังไม่มี ad)_';

  return `# 📑 Marnthara Marketing — Index

Marketing knowledge graph exported from [Marketing Lab](https://github.com).

## Quick links
- [[Brand Facts]]
- [[Customer Voice]]
- [[Personas Index]]
- [[Campaign Index.canvas]]

## Strategy Briefs
${briefLinks}

## Saved Ads
${adLinks}
`;
};

// ════════════════════════════════════════════════════════════════════
// Canvas builders
// ════════════════════════════════════════════════════════════════════

// Obsidian Canvas only has 6 system colors (1=red, 2=orange, 3=yellow,
// 4=green, 5=cyan, 6=purple). We have 15 personas, so we cycle the palette
// while keeping the original 4 on their historic colors for visual continuity.
const PERSONA_COLOR: Record<PersonaId, CanvasNodeColor> = {
  // Original 4 — preserved colors so old exports look unchanged.
  family_man: '4',  // green
  housewife: '3',   // yellow
  businessman: '5', // cyan
  genz: '6',        // purple
  // Refined splits of the original 4 — same hue family.
  family_man_commuter:   '4',
  housewife_urban:       '3',
  businessman_hotelier:  '5',
  genz_first_condo:      '6',
  // New segments — distribute across remaining hues.
  contractor:               '2', // orange
  interior_designer:        '1', // red
  millennial_remote_worker: '6', // purple
  retiree_downsize:         '4', // green
  landlord_rental:          '5', // cyan
  wedding_couple:           '3', // yellow
  price_hunter:             '1', // red
};

const buildPersonaPanelCanvas = (
  rows: readonly AdExportRow[],
  registry: WikilinkRegistry,
): CanvasFile => {
  const nodes: CanvasNode[] = [];
  const edges: CanvasEdge[] = [];

  // Only render personas that actually have ≥1 strong ad assignment.
  // With 15 personas in the pool, drawing all of them every export would
  // mostly produce empty nodes — show only what the user's library proves
  // is relevant. Wraps to a 5-per-row grid for readability.
  const activePersonas = new Set<PersonaId>();
  for (const row of rows) {
    for (const pid of row.strongPersonas) activePersonas.add(pid);
  }
  const personaIds: PersonaId[] = [...activePersonas];
  const PERSONAS_PER_ROW = 5;
  const PERSONA_ROW_HEIGHT = 160; // 120 node + 40 gap
  const personaNodeIds: Record<PersonaId, string> = {} as Record<PersonaId, string>;
  personaIds.forEach((pid, i) => {
    const nid = canvasId('persona');
    personaNodeIds[pid] = nid;
    nodes.push({
      id: nid,
      type: 'file',
      file: `02-Personas/${registry.link(`persona:${pid}`)}.md`,
      x: (i % PERSONAS_PER_ROW) * 360,
      y: Math.floor(i / PERSONAS_PER_ROW) * PERSONA_ROW_HEIGHT,
      width: 280,
      height: 120,
      color: PERSONA_COLOR[pid],
    });
  });

  // Ad nodes below — linked to personas that scored them ≥ 7.
  // Push down by the height of the persona block (may be 1-3 rows now).
  const personaRowCount = Math.max(1, Math.ceil(personaIds.length / PERSONAS_PER_ROW));
  const adOriginY = personaRowCount * PERSONA_ROW_HEIGHT + 120;
  let adIndex = 0;
  for (const row of rows) {
    if (row.strongPersonas.length === 0) continue;
    const pos = positionInGrid(adIndex++, {
      cols: 4,
      cellWidth: 260,
      cellHeight: 140,
      gap: 28,
      originY: adOriginY,
    });
    const adNid = canvasId('ad');
    nodes.push({
      id: adNid,
      type: 'file',
      file: `04-Ads/${registry.link(`ad:${row.id}`)}.md`,
      x: pos.x,
      y: pos.y,
      width: pos.width,
      height: pos.height,
    });
    for (const pid of row.strongPersonas) {
      const target = personaNodeIds[pid];
      if (!target) continue;
      edges.push({
        id: canvasId('e'),
        fromNode: target,
        fromSide: 'bottom',
        toNode: adNid,
        toSide: 'top',
        color: PERSONA_COLOR[pid],
      });
    }
  }

  return { nodes, edges };
};

const buildFunnelMapCanvas = (
  brief: StrategyBrief,
  rows: readonly AdExportRow[],
  registry: WikilinkRegistry,
): CanvasFile => {
  const nodes: CanvasNode[] = [];
  const edges: CanvasEdge[] = [];
  const stages: { id: 'cold' | 'warm' | 'hot'; label: string; x: number }[] = [
    { id: 'cold', label: 'Cold — ยังไม่รู้จัก', x: 0 },
    { id: 'warm', label: 'Warm — รู้จักแล้ว ยังไม่ตัดสินใจ', x: 700 },
    { id: 'hot', label: 'Hot — พร้อมซื้อ', x: 1400 },
  ];

  for (const stage of stages) {
    const segs = brief.segments.filter(s => s.funnel_stage === stage.id);
    nodes.push({
      id: canvasId('group'),
      type: 'group',
      label: stage.label,
      x: stage.x,
      y: 0,
      width: 640,
      height: Math.max(360, segs.length * 220 + 80),
    });
    segs.forEach((seg, i) => {
      nodes.push({
        id: canvasId('seg'),
        type: 'text',
        text: `### #${seg.priority} ${seg.name}\n\n${seg.winning_angle}`,
        x: stage.x + 40,
        y: 80 + i * 220,
        width: 560,
        height: 180,
        color: '3',
      });
    });
  }

  // Drop ad cards into a row at the bottom for reference
  rows.slice(0, 8).forEach((row, i) => {
    nodes.push({
      id: canvasId('ad'),
      type: 'file',
      file: `04-Ads/${registry.link(`ad:${row.id}`)}.md`,
      x: i * 280,
      y: 1300,
      width: 260,
      height: 140,
    });
  });

  return { nodes, edges };
};

// ════════════════════════════════════════════════════════════════════
// Top-level vault generator
// ════════════════════════════════════════════════════════════════════

export interface VaultExportOptions {
  readonly includeRoot?: boolean; // wrap files under `Marnthara-Marketing/` (default true)
}

const personaCount = (
  rows: readonly AdExportRow[],
  pid: PersonaId,
): AdExportRow[] => rows.filter(r => r.strongPersonas.includes(pid));

const channelTagOf = (
  rows: readonly AdExportRow[],
  cid: ChannelId,
): boolean => rows.some(r => r.ad.evaluation?.channel_fit.best === cid);

export interface VaultFile {
  path: string; // forward slashes only
  content: string;
}

export const buildVault = (input: ExportInput, options: VaultExportOptions = {}): VaultFile[] => {
  const includeRoot = options.includeRoot !== false;
  const prefix = includeRoot ? `${VAULT_ROOT}/` : '';
  const registry = new WikilinkRegistry();
  const rows = buildAdRows(input.savedAds, input.briefs);

  // Pre-register every linkable id so wikilinks resolve consistently
  registry.register('index', 'Index');
  registry.register('brand-facts', 'Brand Facts');
  registry.register('quotes', 'Customer Voice');
  registry.register('personas-index', 'Personas Index');
  registry.register('canvas-persona', 'Persona Panel');
  registry.register('canvas-campaign', 'Campaign Index');
  for (const [pid, label] of Object.entries(PERSONA_LABELS) as [PersonaId, string][]) {
    registry.register(`persona:${pid}`, label);
  }
  for (const brief of input.briefs) {
    const title = `${brief.drafted_at.slice(0, 10)} · ${ARCHETYPE_LABELS[brief.positioning.archetype]}`;
    registry.register(`brief:${brief.campaign_hash}`, title, 'Strategy Brief');
  }
  for (const ad of input.savedAds) {
    registry.register(`ad:${ad.id}`, ad.style, 'Ad');
  }

  const files: VaultFile[] = [];

  // 00-Index
  files.push({
    path: `${prefix}00-Index/${registry.link('index')}.md`,
    content: renderIndexNote(rows, input.briefs, registry),
  });
  files.push({
    path: `${prefix}00-Index/${registry.link('personas-index')}.md`,
    content: renderPersonaIndex(registry),
  });

  // 01-Brand
  files.push({
    path: `${prefix}01-Brand/${registry.link('brand-facts')}.md`,
    content: renderBrandFactsNote(input),
  });

  // 02-Personas
  for (const pid of Object.keys(PERSONA_LABELS) as PersonaId[]) {
    files.push({
      path: `${prefix}02-Personas/${registry.link(`persona:${pid}`)}.md`,
      content: renderPersonaNote(pid, personaCount(rows, pid), registry),
    });
  }

  // 03-Strategy
  for (const brief of input.briefs) {
    files.push({
      path: `${prefix}03-Strategy/${registry.link(`brief:${brief.campaign_hash}`)}.md`,
      content: renderBriefNote(brief, registry),
    });
  }

  // 04-Ads
  for (const row of rows) {
    files.push({
      path: `${prefix}04-Ads/${registry.link(`ad:${row.id}`)}.md`,
      content: renderAdNote(row, registry),
    });
  }

  // 08-Canvas
  files.push({
    path: `${prefix}08-Canvas/${registry.link('canvas-persona')}.canvas`,
    content: serializeCanvas(buildPersonaPanelCanvas(rows, registry)),
  });
  // Funnel canvas (per latest brief if any)
  const latestBrief = input.briefs.length
    ? [...input.briefs].sort((a, b) => b.drafted_at.localeCompare(a.drafted_at))[0]
    : null;
  if (latestBrief) {
    files.push({
      path: `${prefix}08-Canvas/${registry.link('canvas-campaign')}.canvas`,
      content: serializeCanvas(buildFunnelMapCanvas(latestBrief, rows, registry)),
    });
  }

  // README at the vault root
  files.push({
    path: `${prefix}README.md`,
    content: `# Marnthara Marketing Vault

Generated by **Marketing Lab** at ${input.exportedAt}.

## How to use

1. Open this folder as an **Obsidian vault** (File → Open → this folder).
2. Open \`00-Index/Index.md\` for the table of contents.
3. View the graph (Ctrl/Cmd+G) to see how ads ↔ personas ↔ briefs link up.
4. Open files in \`08-Canvas/\` to see the visual maps.

Each file has YAML frontmatter — perfect for Dataview queries:

\`\`\`dataview
TABLE score, outcome, best_channel FROM "04-Ads"
WHERE outcome = "used-good"
SORT score DESC
\`\`\`

## Channel coverage (in this export)
${(Object.keys(CHANNEL_LABELS) as ChannelId[])
  .filter(c => channelTagOf(rows, c))
  .map(c => `- ${CHANNEL_LABELS[c]}`)
  .join('\n') || '- _(no ads scored yet)_'}

## Counts
- Brand facts: ${input.brandFacts.filter(f => f.enabled).length}
- Strategy briefs: ${input.briefs.length}
- Saved ads: ${input.savedAds.length}
- Feedback signals captured: ${input.feedback.length}
`,
  });

  return files;
};

// ════════════════════════════════════════════════════════════════════
// ZIP delivery
// ════════════════════════════════════════════════════════════════════

export const buildVaultZip = async (
  input: ExportInput,
  options: VaultExportOptions = {},
): Promise<Blob> => {
  const files = buildVault(input, options);
  const zip = new JSZip();
  for (const f of files) {
    zip.file(f.path, f.content);
  }
  return zip.generateAsync({ type: 'blob' });
};

export const triggerVaultDownload = async (input: ExportInput): Promise<{ fileCount: number }> => {
  const files = buildVault(input);
  const zip = new JSZip();
  for (const f of files) {
    zip.file(f.path, f.content);
  }
  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const date = new Date().toISOString().slice(0, 10);
  link.href = url;
  link.download = `Marnthara-Marketing-Vault-${date}.zip`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  return { fileCount: files.length };
};
