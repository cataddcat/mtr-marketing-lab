/**
 * Persona Pool — extensible catalog of consumer archetypes the Judge can
 * select from when evaluating an ad.
 *
 * Replaces the previous fixed 15-persona enum. Architecture:
 *   • 15 "core" personas are baked in (CORE_PERSONA_POOL) for backward
 *     compatibility with old saved ads + demo data.
 *   • An additional 0-50+ "generated" personas live in localStorage,
 *     produced by `persona-expander.ts` taking Strategy Brief segments
 *     × variation axes (age/income/life-stage/channel-habit).
 *   • Combined pool = `[...core, ...generated].filter(enabled)` and is
 *     handed to `buildJudgePrompt()` which renders the dynamic pool block
 *     and instructs the Judge to pick 4-12 most-relevant for each ad.
 */
import * as v from 'valibot';

const slug = v.pipe(v.string(), v.minLength(1), v.maxLength(80));
const shortText = v.pipe(v.string(), v.maxLength(60));
const longText = v.pipe(v.string(), v.maxLength(280));

/**
 * A single persona archetype. `id` must be a stable kebab-case slug so
 * it survives serialization (saved ad evaluations reference IDs).
 */
export const PersonaSchema = v.object({
  id: slug,
  label: shortText,
  description: longText,
  /** When this persona was synthesized from a Strategy-Brief segment. */
  source_segment_name: v.optional(shortText),
  /** Optional structured attributes used by the expander prompt + UI. */
  attrs: v.optional(
    v.object({
      age_range: v.optional(shortText),
      income_range: v.optional(shortText),
      life_stage: v.optional(shortText),
      channel_habit: v.optional(shortText),
      key_objection: v.optional(longText),
    }),
  ),
  /** True for the 15 core personas — UI shows them as locked-in. */
  is_core: v.boolean(),
  /** False disables this persona from the Judge pool without deleting it. */
  enabled: v.boolean(),
  /** ISO timestamp when persona was created/generated. */
  created_at: v.string(),
});

export const PersonaPoolSchema = v.array(PersonaSchema);

export type Persona = v.InferOutput<typeof PersonaSchema>;
export type PersonaPool = v.InferOutput<typeof PersonaPoolSchema>;

// ════════════════════════════════════════════════════════════════════
// Core pool — 15 always-available personas with rich descriptions.
// IDs match the original Track F3 enum so old saved ads still resolve.
// ════════════════════════════════════════════════════════════════════

const CORE_CREATED_AT = '2026-05-01T00:00:00.000Z';

const core = (
  id: string,
  label: string,
  description: string,
  attrs?: Persona['attrs'],
): Persona => ({
  id,
  label,
  description,
  is_core: true,
  enabled: true,
  created_at: CORE_CREATED_AT,
  attrs,
});

export const CORE_PERSONA_POOL: readonly Persona[] = [
  core(
    'family_man',
    'พ่อบ้านลพบุรี',
    'พ่อบ้าน 35-55 ตจว. มีลูก-มีบ้านเดี่ยว ใส่ใจค่าไฟ/warranty มากกว่า aesthetic',
    { age_range: '35-55', life_stage: 'มีลูก-บ้านเดี่ยว', channel_habit: 'FB feed เย็น' },
  ),
  core(
    'housewife',
    'แม่บ้านชานเมือง',
    'แม่บ้าน 35-55 ชานเมือง ตกแต่งบ้านเอง ใส่ใจ "ดูแล้วน่าอยู่ ลูกแพ้ฝุ่นน้อย"',
    { age_range: '35-55', life_stage: 'ดูแลครัวเรือน', channel_habit: 'FB Groups + TikTok' },
  ),
  core(
    'businessman',
    'เจ้าของธุรกิจขนาดเล็ก',
    'เจ้าของธุรกิจเล็ก (ร้าน/คาเฟ่/สปา) ต้องการ vibe + ออกใบกำกับภาษี + งานเสร็จก่อนเปิดร้าน',
    { age_range: '30-50', channel_habit: 'LINE OA + FB' },
  ),
  core(
    'genz',
    'นักศึกษา/GenZ หอ',
    'นักศึกษาหอ/คอนโด 19-23 งบ ฿2-5k เน้น aesthetic + share IG/TikTok',
    { age_range: '19-23', income_range: 'ต่ำ', channel_habit: 'TikTok + IG' },
  ),
  core(
    'family_man_commuter',
    'พ่อบ้าน กทม.-ปริมณฑล',
    'พ่อบ้าน กทม.-ปริมณฑล 30-45 ผ่อนบ้าน ทำงาน 9-5 ตัดสินใจเรื่องบ้านร่วมกับภรรยา',
    { age_range: '30-45', life_stage: 'ผ่อนบ้าน-มีลูกเล็ก', channel_habit: 'FB feed บนรถไฟฟ้า' },
  ),
  core(
    'housewife_urban',
    'แม่บ้านคอนโดเมือง',
    'แม่บ้านคอนโดเมือง 28-40 รายได้สูง ใส่ใจ designer/brand-name + curated look',
    { age_range: '28-40', income_range: 'สูง', channel_habit: 'IG feed + Pinterest' },
  ),
  core(
    'businessman_hotelier',
    'เจ้าของโรงแรมบูทีค',
    'เจ้าของโรงแรมบูทีค/รีสอร์ต ต้องการ batch order, premium fabric, ดูดี-ทน-ซักได้',
    { channel_habit: 'LINE OA + email proposal' },
  ),
  core(
    'genz_first_condo',
    'GenZ คอนโดใหม่',
    'GenZ 22-28 เพิ่งย้ายเข้าคอนโดแรก งบ ฿5-10k/ห้อง mood-driven, vibe-first',
    { age_range: '22-28', life_stage: 'ย้ายคอนโดแรก', channel_habit: 'IG Stories + TikTok' },
  ),
  core(
    'contractor',
    'รับเหมา/ตกแต่งภายใน',
    'รับเหมา/ตกแต่งภายใน refer client เน้น margin + งานเร็ว + ไม่มีปัญหากับ end customer',
    { key_objection: 'ทีมงานช้า เคลมยาก ไม่มี margin' },
  ),
  core(
    'interior_designer',
    'นักออกแบบ interior',
    'นักออกแบบ interior เน้น fabric library, custom color, สั่งทำ + ทันโปรเจกต์',
    { key_objection: 'ลายผ้าจำกัด สี standard เกินไป' },
  ),
  core(
    'millennial_remote_worker',
    'มิลเลนเนียล WFH',
    'WFH 30-38 ตกแต่งห้องทำงานบ้าน ใส่ใจกันแสง + เสียง + Zoom background',
    { age_range: '30-38', life_stage: 'WFH', channel_habit: 'LinkedIn + IG' },
  ),
  core(
    'retiree_downsize',
    'ผู้สูงวัยปรับปรุงบ้าน',
    'ผู้สูงวัย 55+ ปรับปรุงบ้านเก่า เน้น "ทน-ซักง่าย-ไม่ต้องเปลี่ยนบ่อย"',
    { age_range: '55+', channel_habit: 'LINE + FB feed' },
  ),
  core(
    'landlord_rental',
    'เจ้าของบ้านให้เช่า',
    'เจ้าของบ้าน/คอนโด ให้เช่า ต้องการ "ดูดีในรูป + ราคาประหยัด + ติดเร็ว"',
    { key_objection: 'ลงทุนต่ำสุด ROI สูงสุด' },
  ),
  core(
    'wedding_couple',
    'คู่แต่งงานใหม่',
    'คู่แต่งงานใหม่ ตกแต่งบ้านครั้งแรก งบใหญ่ ตัดสินใจร่วม ใส่ใจ "สวย-ทน-คุ้ม"',
    { life_stage: 'แต่งงานใหม่', channel_habit: 'IG + Pinterest + LINE คู่' },
  ),
  core(
    'price_hunter',
    'นักล่าราคาถูก',
    'ลูกค้าที่หาราคาถูกที่สุด — รับ promo, ต่อรอง, เปรียบ 3 ร้าน, deal-driven',
    { key_objection: 'มีถูกกว่านี้ที่อื่น' },
  ),
];

// ════════════════════════════════════════════════════════════════════
// localStorage persistence
// ════════════════════════════════════════════════════════════════════

const STORAGE_KEY = 'mtr_persona_pool';

/** Read the generated (non-core) personas the user has accumulated. */
export const loadGeneratedPersonas = (): Persona[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = v.safeParse(PersonaPoolSchema, JSON.parse(raw));
    if (!parsed.success) return [];
    // Defensive: filter out anything that mistakenly got is_core=true.
    return parsed.output.filter(p => !p.is_core);
  } catch {
    return [];
  }
};

export const saveGeneratedPersonas = (personas: readonly Persona[]): void => {
  try {
    // Never persist the core 15 — they live in code, not storage.
    const toSave = personas.filter(p => !p.is_core);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch {
    // localStorage full / disabled — silent
  }
};

/** Convenience: lookup map for label/description rendering anywhere. */
export const buildLookups = (
  generated: readonly Persona[],
): {
  labels: Record<string, string>;
  descriptions: Record<string, string>;
} => {
  const all = [...CORE_PERSONA_POOL, ...generated];
  const labels: Record<string, string> = {};
  const descriptions: Record<string, string> = {};
  for (const p of all) {
    labels[p.id] = p.label;
    descriptions[p.id] = p.description;
  }
  return { labels, descriptions };
};

// ════════════════════════════════════════════════════════════════════
// Runtime label registry — module-level lookup that components can read
// without prop-drilling the pool through every layer.
//
// App.tsx subscribes to `usePersonaPool().labels` and pushes updates here
// via `setRuntimeLabels()` whenever the pool changes. `getPersonaLabel()`
// in schemas.ts checks this registry FIRST so generated persona IDs like
// `seg-pa-baan-v3` render with the LLM-produced label instead of the
// raw slug. Falls back to core PERSONA_LABELS, then the id itself.
//
// Single-tenant SPA → module-level mutable state is acceptable here.
// ════════════════════════════════════════════════════════════════════

// Stored on globalThis so the resolver in schemas.ts (which we can't import
// here — would cycle) can read without an explicit import. SPA-safe.
type RegistryGlobal = {
  __mtrPersonaLabels?: Readonly<Record<string, string>>;
  __mtrPersonaDescriptions?: Readonly<Record<string, string>>;
};

export const setRuntimeLabels = (labels: Readonly<Record<string, string>>): void => {
  (globalThis as RegistryGlobal).__mtrPersonaLabels = labels;
};

export const setRuntimeDescriptions = (descriptions: Readonly<Record<string, string>>): void => {
  (globalThis as RegistryGlobal).__mtrPersonaDescriptions = descriptions;
};

export const getRuntimeLabel = (id: string): string | undefined =>
  (globalThis as RegistryGlobal).__mtrPersonaLabels?.[id];

export const getRuntimeDescription = (id: string): string | undefined =>
  (globalThis as RegistryGlobal).__mtrPersonaDescriptions?.[id];

/** Stable hash for cache invalidation (Judge prompt cache key).
 *  Includes label + description content so edits to a persona's text
 *  invalidate the Judge cache — not just id/enabled toggles. */
export const hashPersonaPool = (pool: readonly Persona[]): string => {
  if (pool.length === 0) return '';
  let h = 0;
  for (const p of pool) {
    const s = `${p.id}|${p.enabled ? 1 : 0}|${p.label}|${p.description}`;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return h.toString(36);
};

/**
 * Slugify a Thai/English segment-name + variant index into a stable ID.
 * Used by the expander so identical segments always produce identical IDs.
 */
export const segmentVariantId = (segmentName: string, variantIndex: number): string => {
  const base = segmentName
    .toLowerCase()
    .replace(/[\s/()]+/g, '-')
    .replace(/[^a-z0-9ก-๙\-]/gi, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50);
  return `seg-${base || 'x'}-v${variantIndex}`;
};
