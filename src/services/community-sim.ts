// ════════════════════════════════════════════════════════════════════
// Community Simulation orchestration (Track E.M2 — MTR Super-Judge)
//
// This MTR-side service drives a full MiroFish pipeline for one ad:
//   1. Build seed text from ad + brand context
//   2. Generate ontology + build graph
//   3. Create + prepare + start simulation
//   4. Poll until rounds finish
//   5. Interview every agent with structured questions
//   6. Aggregate responses into the MTR-shape `CommunitySim`
//
// MiroFish itself stays generic — it has no idea this is for ad eval.
// All the "ad-aware" logic (seed framing, question prompts, sentiment
// classification, objection extraction) lives here.
// ════════════════════════════════════════════════════════════════════

import {
  buildGraph,
  createSimulation,
  generateOntology,
  getPrepareStatus,
  getRunStatus,
  getTaskStatus,
  interviewAll,
  prepareSimulation,
  startSimulation,
  stopSimulation,
} from '../lib/mirofish-client';
import type { AdIdea } from './marketing-agent';
import type {
  CommunitySim,
  CommunitySimConfig,
  ObjectionItem,
  QuoteItem,
  Sentiment,
} from '../lib/schemas';
import type { BrandFact } from '../lib/brand-facts';

const POLL_GRAPH_MS = 3000;
const POLL_PREPARE_MS = 3000;
const POLL_RUN_MS = 3000;
const MAX_IDLE_GRACE_TICKS = 8;

const sleep = (ms: number, signal?: AbortSignal): Promise<void> =>
  new Promise((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(t);
        reject(new DOMException('Aborted', 'AbortError'));
      },
      { once: true },
    );
  });

// ════════════════════════════════════════════════════════════════════
// Public types
// ════════════════════════════════════════════════════════════════════

export type CommunitySimProgressStage =
  | 'seed_uploading'
  | 'graph_building'
  | 'sim_creating'
  | 'sim_preparing'
  | 'sim_starting'
  | 'sim_running'
  | 'interviewing'
  | 'aggregating'
  | 'done';

export interface CommunitySimProgress {
  readonly stage: CommunitySimProgressStage;
  readonly message: string;
  readonly percent: number;
}

export interface RunCommunitySimArgs {
  readonly ad: AdIdea;
  readonly config: CommunitySimConfig;
  readonly brandFacts?: readonly BrandFact[];
  readonly onProgress?: (p: CommunitySimProgress) => void;
  readonly signal?: AbortSignal;
}

// ════════════════════════════════════════════════════════════════════
// Seed-text builder
// ════════════════════════════════════════════════════════════════════
//
// Design goals for the seed:
//   1. Give MiroFish enough community structure to extract 4-6 distinct
//      entity types — each maps to a different agent profile type.
//   2. Describe social edges (who talks to whom) so the graph has
//      meaningful connections rather than isolated nodes.
//   3. Include purchase-decision psychology per group so agents respond
//      realistically to the ad (price sensitivity, trust signals, etc.).
//   4. Keep the ad itself at the end so every agent "sees" it as a
//      social-media post appearing in their feed.

const buildSeedText = (
  ad: AdIdea,
  brandFacts: readonly BrandFact[],
): string => {
  const factsBlock = brandFacts
    .filter(f => f.enabled && f.value.trim())
    .map(f => `• ${f.label}: ${f.value}`)
    .join('\n');

  return `\
=== ชุมชนจำลอง: ตลาดม่านและการตกแต่งบ้าน ลพบุรี-สิงห์บุรี-อ่างทอง ===

── สภาพแวดล้อมตลาด ──
พื้นที่: จังหวัดลพบุรีและอำเภอใกล้เคียง (สิงห์บุรี, อ่างทอง, อยุธยา) ภาคกลางตอนบน
ภูมิอากาศ: ร้อนแล้ง 9-10 เดือน/ปี แสงแดด UV สูง ม่านเสื่อมสภาพเร็วถ้าคุณภาพต่ำ
เศรษฐกิจ: เมืองราชการ-เกษตร-ท่องเที่ยวประวัติศาสตร์ กลุ่มรายได้หลัก middle income
ตลาด home improvement: เติบโตหลังโควิด ผู้คนใช้เวลาที่บ้านนานขึ้น ลงทุนตกแต่งมากขึ้น
จุดซื้อหลัก: ร้านในตัวเมืองลพบุรี + Facebook marketplace + Line@ ร้านค้า
ช่วง high season: ม.ค.-ก.พ. (ปีใหม่-บ้านใหม่), เม.ย. (ก่อนหน้าร้อน), พ.ย.-ธ.ค. (ลดราคาปลายปี)

── 5 กลุ่มผู้บริโภคหลักในชุมชน ──

1. พ่อบ้าน-แม่บ้านเจ้าของบ้านเดี่ยว (อายุ 35-55 ปี)
   รายได้ครัวเรือน: 40,000-80,000 บาท/เดือน | เป็นเจ้าของบ้านเดี่ยว/ทาวน์เฮาส์
   ลำดับการตัดสินใจ: ทนทาน-คุ้มค่า > ราคา > ความสวย
   ตัดสินใจร่วมกันสองคน ต้องการใบเสนอราคาชัดเจนก่อนตกลง
   ข้อกังวลหลัก: ช่างไม่ตรงเวลา, งานสะดุด, ต้องซ่อมซ้ำภายในปีแรก
   พฤติกรรมสื่อ: Facebook feed เช้า-เย็น, LINE กลุ่มหมู่บ้าน, YouTube รีวิวสินค้า
   เส้นทางซื้อ: เห็น ad → ดูรีวิว → ถามเพื่อนบ้าน → นัดดูหน้างาน → ตัดสินใจ (1-4 สัปดาห์)

2. แม่บ้านดูแลบ้าน-homemaker (อายุ 30-50 ปี)
   รายได้ครัวเรือน: 25,000-55,000 บาท/เดือน | อยู่บ้าน ดูแลลูก-ครัวเรือนเป็นหลัก
   ลำดับการตัดสินใจ: ความสวย > ดูแลง่าย > ราคา (สามีมักตามที่เลือก)
   เป็น influencer หลักในบ้าน แชร์รูปผลงานหลังติดตั้งสม่ำเสมอ
   ข้อกังวลหลัก: ผ้าซีดเร็ว, ซักลำบาก, แสงส่องทำให้ห้องร้อน, เด็กแพ้ฝุ่น
   พฤติกรรมสื่อ: Facebook Groups (บ้านสวย, แม่บ้าน), TikTok ไอเดียตกแต่ง, Instagram
   เส้นทางซื้อ: เห็นรูป before-after → ถามกลุ่ม → นัดร้าน → เลือกผ้าตัวอย่าง (1-2 สัปดาห์)

3. เจ้าของธุรกิจ-SME ในพื้นที่ (อายุ 35-60 ปี)
   ประเภท: ร้านค้า, คาเฟ่, โรงแรมขนาดเล็ก, คลินิก, ออฟฟิศ สำนักงาน
   รายได้ธุรกิจ: 80,000-500,000 บาท/เดือน | สั่งงานหลายห้องพร้อมกัน
   ลำดับการตัดสินใจ: ดูมืออาชีพ > ตรงเวลา > ราคา (ต้องการใบกำกับภาษี)
   ข้อกังวลหลัก: ล่าช้ากระทบธุรกิจ, ราคารวมเปลี่ยน, ไม่มี credit term
   พฤติกรรมสื่อ: Facebook กลุ่มธุรกิจ-ผู้ประกอบการ, Line@ ร้านค้า, Google search
   เส้นทางซื้อ: ค้นหาออนไลน์ → โทร/Line สอบถาม → ขอใบเสนอราคา → ตัดสินใจเร็ว (2-7 วัน)

4. คนรุ่นใหม่เช่าคอนโด-หอพัก (อายุ 20-35 ปี)
   ประเภท: นักศึกษา, พนักงานเอกชน, ข้าราชการรุ่นใหม่ ย้ายมาทำงาน/เรียน
   รายได้: 12,000-35,000 บาท/เดือน | เช่า studio-1BR ในตัวเมือง
   ลำดับการตัดสินใจ: ราคา > ความสวย > ติดตั้งง่าย (ไม่ต้องขออนุญาตมาก)
   ข้อกังวลหลัก: ราคาเกินงบ, ต้องขออนุญาตเจ้าของห้อง, ย้ายแล้วเอาติดไปไม่ได้
   พฤติกรรมสื่อ: TikTok, Instagram, X/Twitter, Google, ถาม Facebook กลุ่มคนลพบุรี
   เส้นทางซื้อ: เห็น content → เช็คราคาทันที → ถามเพื่อน → ซื้อเลย (1-3 วัน ถ้าราคาโอเค)

5. ผู้รับเหมา-ช่างตกแต่งบ้าน (อายุ 30-55 ปี)
   บทบาท: รับงานรีโนเวท-ตกแต่งบ้านในลพบุรีและจังหวัดใกล้เคียง
   เป็น B2B influencer สำคัญ — แนะนำร้านม่านให้ลูกค้าตรงๆ เลย
   ลำดับการตัดสินใจ: คุณภาพสม่ำเสมอ > ตรงเวลา > ราคาส่ง (ต้องการ credit/ราคาพิเศษ)
   ข้อกังวลหลัก: ของส่งช้า ทำให้งานสะดุด, คุณภาพไม่สม่ำเสมอ, ไม่มีใบกำกับภาษี
   พฤติกรรมสื่อ: LINE กลุ่มช่าง-ผู้รับเหมา, Facebook กลุ่มช่าง, ปากต่อปากในวงการ
   เส้นทางซื้อ: ลองงานหนึ่งชิ้น → ถ้าดีสั่งซ้ำประจำ + แนะนำลูกค้าต่อ

── โครงสร้างความสัมพันธ์ทางสังคม ──
• เพื่อนบ้านในหมู่บ้านเดียวกัน → แชร์ประสบการณ์ผ่าน LINE กลุ่มหมู่บ้าน (กลุ่มละ 50-200 คน)
• กลุ่ม Facebook "บ้านสวยลพบุรี / ซื้อขายลพบุรี" ~3,000-10,000 คน — แม่บ้านถามรีวิวบ่อย
• กลุ่ม PTA โรงเรียน / กลุ่มออกกำลังกาย — แม่บ้านแนะนำร้านกันในกลุ่มนี้
• กลุ่ม LINE ช่าง-ผู้รับเหมา — ช่างแนะนำซัพพลายเออร์ที่เชื่อถือได้ให้กัน
• คนรุ่นใหม่ใช้ Google + TikTok ก่อน แล้วถามกลุ่ม Facebook คนลพบุรี

── ปัจจัยที่มีผลต่อการตัดสินใจซื้อ (ตามลำดับความสำคัญ) ──
ทุกกลุ่ม: (1) ราคาชัดเจน ไม่บวกเพิ่มทีหลัง  (2) รีวิวจากคนรู้จักหรือในพื้นที่  (3) ดูตัวอย่างผ้าจริง
เฉพาะกลุ่ม: ทนแดด (บ้านเดี่ยว), ทำความสะอาดง่าย (แม่บ้าน), ใบกำกับ+ตรงเวลา (SME), ราคา+ภาพสวย (GenZ)

── trigger ที่ทำให้ซื้อ ──
ย้ายบ้านใหม่, ม่านเก่าชำรุด/ซีด, เห็น before-after ของเพื่อน, โปรลด, ลูกแพ้ฝุ่น, รีโนเวทบ้าน

=== ข้อมูลแบรนด์ ม่านธารา ===
${factsBlock || '(ยังไม่มีข้อมูลแบรนด์)'}

=== Ad ที่จะทดสอบกับชุมชน ===
Style: ${ad.style}
Copy:
${ad.copy}

Visual idea:
${ad.visual_idea}
`;
};

// ════════════════════════════════════════════════════════════════════
// Interview prompt — fixed structure so we can parse JSON consistently.
// MiroFish doesn't know this is for ad eval; we just ask each agent
// to answer 4 questions about the ad embedded in the seed.
// ════════════════════════════════════════════════════════════════════

const buildInterviewPrompt = (ad: AdIdea): string => `\
คุณคือคน **จริง ๆ** คนหนึ่งในลพบุรี ไม่ใช่ผู้บริโภคทั่วไปที่ตอบให้ "ดูดี" — คุณมีอาชีพ มีเงินจำกัด มีปัญหาเฉพาะตัว
ที่ได้เห็น ad ชิ้นนี้บน Facebook/TikTok:

Style: ${ad.style}
Copy:
${ad.copy}
Visual idea: ${ad.visual_idea}

═══════════════════════════════════════════════════════════════
กฎสำคัญที่สุด — กันการตอบแบบ "pleaser":
1. **Ad ส่วนใหญ่ไม่ตรงกับทุกคน** — ถ้า ad นี้ไม่ตรงกลุ่มคุณ ให้ stance="negative" หรือ "neutral" ตรง ๆ
   ห้ามตอบ "positive" เพราะรู้สึกเกรงใจ
2. **มี objection = ไม่บอกว่า positive** — ถ้าคุณกังวลเรื่องราคา/คุณภาพ/ติดตั้ง/อื่น ๆ stance ต้อง
   "neutral" หรือ "negative" (positive แปลว่า "ไม่มีอะไรค้างคา พร้อมตัดสินใจเลย" เท่านั้น)
3. **Click = ตัดสินใจจริง** — would_click="yes" แปลว่า "จะหยิบมือถือทักไลน์ตอนนี้ภายในวันนี้"
   ไม่ใช่ "อาจจะ" หรือ "น่าสนใจดี" — ถ้าลังเลใช้ "maybe", ถ้าไม่ใช่กลุ่ม ใช้ "no"
4. **Trust < 4 = ยังไม่เชื่อพอจะคลิก** — ถ้า trust 1-3 แล้ว would_click="yes" คือขัดแย้ง
5. **Share = action ของจริง** — would_share="yes" แปลว่า "จะแชร์ใน LINE กลุ่ม/แท็กเพื่อน ตอนนี้"
   ไม่ใช่ "save เก็บไว้" — ของจริงคนแชร์ ad น้อยกว่าที่คิด < 30%

═══════════════════════════════════════════════════════════════
ตอบตามบุคลิกและชีวิตจริงของตัวละครที่คุณเล่น — ห้ามรวมเสียงเป็นความเห็นกลาง ๆ ที่ใครก็เซย์ได้
ตอบเป็น JSON object เดียวเท่านั้น ไม่มี text อื่นนอก JSON:
{
  "would_click": "yes" | "no" | "maybe",
  "reason": "เหตุผล 1-2 ประโยค — ทำไมถึงคลิก/ไม่คลิก (ภาษาไทย ใช้สำเนียงและคำที่คนกลุ่มคุณใช้)",
  "objection": "ข้อกังวล/สิ่งที่รั้งไว้ 1 ประโยค (ภาษาไทย) หรือ 'none' ถ้าไม่มีจริง ๆ",
  "trust": 1 | 2 | 3 | 4 | 5,
  "would_share": "yes" | "no",
  "stance": "positive" | "neutral" | "negative",
  "quote": "ประโยคที่คุณจะพูดถึง ad นี้ต่อหน้าเพื่อน/ครอบครัว 1 ประโยค (ภาษาไทย ใช้สำเนียงเฉพาะตัว)",
  "purchase_timeline": "now" | "this_month" | "this_year" | "no",
  "wom_channel": "line_group" | "facebook" | "tell_friend" | "none"
}

คำอธิบายฟิลด์:
- trust: 1=ไม่เชื่อเลย, 3=กลางๆ ต้องเช็คเพิ่ม, 5=เชื่อมากและไว้ใจ (เก็บ 5 ไว้สำหรับร้านที่คุณรู้จักจริง ๆ)
- purchase_timeline: now=ติดต่อเลยวันนี้, this_month=ภายในเดือน, this_year=ปีนี้, no=ไม่ซื้อ
- wom_channel: ของจริงต้องเลือก "none" ถ้าไม่แน่ใจว่าจะแชร์
- objection: ใช้คำของคุณเอง ไม่ใช่ template — ของจริงคนคิด objection เฉพาะตัว ไม่ใช่ "ราคาแพงเกินไป" ทุกคน
`.trim();

// ════════════════════════════════════════════════════════════════════
// Response parsing + aggregation
// ════════════════════════════════════════════════════════════════════

interface ParsedResponse {
  would_click: 'yes' | 'no' | 'maybe';
  reason: string;
  objection: string;
  trust: number;
  would_share: 'yes' | 'no';
  stance: 'positive' | 'neutral' | 'negative';
  quote: string;
  // Optional enrichment fields — present in new prompt, absent in legacy runs.
  agent_persona?: string;
  purchase_timeline?: 'now' | 'this_month' | 'this_year' | 'no';
  wom_channel?: 'line_group' | 'facebook' | 'tell_friend' | 'none';
}

// MiroFish's interview/all endpoint returns the `result` field as
// arbitrary JSON. The shape varies by simulation profile. We probe a few
// common locations + fall back to scanning the string for a JSON object.
const parseInterview = (raw: unknown): ParsedResponse | null => {
  if (raw === null || raw === undefined) return null;

  // Some MiroFish responses wrap the agent answer in { agent_id, response: { ... } }
  // or just return the JSON object directly. Try to dig.
  const candidates: unknown[] = [];
  const stack: unknown[] = [raw];
  while (stack.length && candidates.length < 8) {
    const top = stack.pop();
    if (typeof top === 'string') {
      const m = top.match(/\{[\s\S]*\}/);
      if (m) candidates.push(safeJson(m[0]));
    } else if (top && typeof top === 'object') {
      candidates.push(top);
      for (const v of Object.values(top as Record<string, unknown>)) {
        if (v && (typeof v === 'object' || typeof v === 'string')) stack.push(v);
      }
    }
  }

  for (const c of candidates) {
    const parsed = coerceResponse(c);
    if (parsed) return parsed;
  }
  return null;
};

const safeJson = (s: string): unknown => {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
};

const TIMELINE_VALUES = new Set(['now', 'this_month', 'this_year', 'no'] as const);
const WOM_VALUES = new Set(['line_group', 'facebook', 'tell_friend', 'none'] as const);

/**
 * Classify the objection text into "real concern" vs "no-op". Anything
 * beyond the no-op tokens counts as a real reservation that should
 * down-weight an otherwise-positive stance (LLM pleaser-bias correction).
 *
 * Thai variants like "ไม่มีนะ", "ไม่มีเลยจ้า", "ไม่มีอะไรค้างคา" all need to
 * match — exact tokens missed them. The regex matches:
 *   1. ASCII no-ops: empty, "none", "-", "—", "n/a", "null"
 *   2. Thai negation stem "ไม่มี" + optional trailing words (เลย, ค่ะ,
 *      ครับ, จ้า, นะ, อะไร, ปัญหา, ข้อกังวล, ค้างคา…) up to ~20 chars
 *
 * Length-based fallback is intentionally NOT used — Thai single-word
 * objections like "ราคา" / "แพง" must still count as real concerns.
 */
const NO_OP_OBJECTION_REGEX =
  /^(?:|none|-+|—|n\/?a|null|nil|ไม่มี(?:เลย|ค่ะ|ครับ|จ้า|นะ|อะไร|ปัญหา|ข้อกังวล|ค้างคา|\s)*)$/i;

const isRealObjection = (objection: string): boolean => {
  const trimmed = objection.trim().toLowerCase();
  return !NO_OP_OBJECTION_REGEX.test(trimmed);
};

const coerceResponse = (obj: unknown): ParsedResponse | null => {
  if (!obj || typeof obj !== 'object') return null;
  const r = obj as Record<string, unknown>;
  const click = String(r.would_click ?? '').toLowerCase();
  if (click !== 'yes' && click !== 'no' && click !== 'maybe') return null;
  const stanceRaw = String(r.stance ?? '').toLowerCase();
  let stance: ParsedResponse['stance'] =
    stanceRaw === 'positive' || stanceRaw === 'negative' ? stanceRaw : 'neutral';
  const shareRaw = String(r.would_share ?? '').toLowerCase();
  let share: ParsedResponse['would_share'] = shareRaw === 'yes' ? 'yes' : 'no';
  const trustNum = Number(r.trust);
  const trust = Number.isFinite(trustNum) ? Math.min(5, Math.max(1, Math.round(trustNum))) : 3;
  const objection = typeof r.objection === 'string' ? r.objection : '';
  let normalizedClick: ParsedResponse['would_click'] = click;

  // ───── Cross-check: demote contradictory combinations ─────
  // LLMs default to "positive + I'd click + 5/5 trust" even when they
  // simultaneously emit a real objection. Real consumer psychology says:
  // "I have a concern" → at most neutral. The corrections below give the
  // aggregator output that actually matches the agent's own words.
  const hasRealObjection = isRealObjection(objection);
  if (hasRealObjection && stance === 'positive') {
    stance = 'neutral'; // objection contradicts positive stance
  }
  if (trust < 4 && normalizedClick === 'yes') {
    normalizedClick = 'maybe'; // can't be "yes" if trust is low
  }
  if (trust <= 2 && stance === 'positive') {
    stance = 'neutral'; // very low trust contradicts positive stance
  }
  if (normalizedClick === 'no' && share === 'yes') {
    share = 'no'; // wouldn't click but would share? nope, downgrade.
  }

  // Optional enrichment — gracefully absent in legacy/short runs.
  const timelineRaw = String(r.purchase_timeline ?? '').toLowerCase() as ParsedResponse['purchase_timeline'];
  const purchase_timeline = TIMELINE_VALUES.has(timelineRaw as never) ? timelineRaw : undefined;
  const womRaw = String(r.wom_channel ?? '').toLowerCase() as ParsedResponse['wom_channel'];
  const wom_channel = WOM_VALUES.has(womRaw as never) ? womRaw : undefined;

  return {
    would_click: normalizedClick,
    reason: typeof r.reason === 'string' ? r.reason : '',
    objection,
    trust,
    would_share: share,
    stance,
    quote: typeof r.quote === 'string' ? r.quote : '',
    agent_persona: typeof r.agent_persona === 'string' ? r.agent_persona : undefined,
    purchase_timeline,
    wom_channel,
  };
};

// Cluster objections by lowercased first 40 chars — good enough for free
// text without burning another LLM call. The judge prompt sees the top
// few clusters so duplicates getting flattened is the desired behaviour.
const aggregateObjections = (responses: readonly ParsedResponse[]): ObjectionItem[] => {
  const counts = new Map<string, { text: string; count: number }>();
  for (const r of responses) {
    const o = r.objection.trim();
    if (!isRealObjection(o)) continue;
    const key = o.toLowerCase().slice(0, 40);
    const existing = counts.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      counts.set(key, { text: o, count: 1 });
    }
  }
  return [...counts.values()].sort((a, b) => b.count - a.count).slice(0, 5);
};

const WOM_LABEL: Record<NonNullable<ParsedResponse['wom_channel']>, string> = {
  line_group: 'LINE กลุ่ม',
  facebook: 'Facebook',
  tell_friend: 'บอกเพื่อน',
  none: '',
};

const TIMELINE_LABEL: Record<NonNullable<ParsedResponse['purchase_timeline']>, string> = {
  now: 'ซื้อเลย',
  this_month: 'ซื้อเดือนนี้',
  this_year: 'ซื้อปีนี้',
  no: 'ไม่ซื้อ',
};

const buildPersonaTag = (r: ParsedResponse): string => {
  const base = r.agent_persona ?? 'agent';
  const parts: string[] = [];
  if (r.purchase_timeline && r.purchase_timeline !== 'no') {
    parts.push(TIMELINE_LABEL[r.purchase_timeline]);
  }
  if (r.wom_channel && r.wom_channel !== 'none') {
    parts.push(`แชร์ ${WOM_LABEL[r.wom_channel]}`);
  }
  return parts.length > 0 ? `${base} · ${parts.join(' · ')}` : base;
};

const pickQuotes = (responses: readonly ParsedResponse[]): QuoteItem[] => {
  // Keep up to 6 quotes, balanced across stances.
  // Prefer quotes from agents with high purchase intent — they're most
  // actionable as marketing evidence and objection signals.
  const byStance: Record<'positive' | 'neutral' | 'negative', QuoteItem[]> = {
    positive: [],
    neutral: [],
    negative: [],
  };
  for (const r of responses) {
    if (!r.quote.trim()) continue;
    byStance[r.stance].push({
      persona: buildPersonaTag(r).slice(0, 60),
      text: r.quote.trim().slice(0, 280),
      stance: r.stance,
    });
  }
  // Interleave stances: positive, negative, neutral alternating — ensures
  // both advocates and critics appear even in short quote lists.
  const out: QuoteItem[] = [];
  for (let i = 0; i < 2; i += 1) {
    if (byStance.positive[i]) out.push(byStance.positive[i]);
    if (byStance.negative[i]) out.push(byStance.negative[i]);
    if (byStance.neutral[i]) out.push(byStance.neutral[i]);
  }
  return out.slice(0, 6);
};

const aggregate = (
  responses: readonly ParsedResponse[],
  meta: { simId: string; projectId: string; runAt: string; config: CommunitySimConfig },
): CommunitySim => {
  const total = Math.max(1, responses.length);

  // Sentiment counts → percentages
  const stanceCounts = { positive: 0, neutral: 0, negative: 0 };
  let clickYes = 0;
  let clickMaybe = 0;
  let shareYes = 0;
  let trustSum = 0;
  for (const r of responses) {
    stanceCounts[r.stance] += 1;
    if (r.would_click === 'yes') clickYes += 1;
    else if (r.would_click === 'maybe') clickMaybe += 1;
    if (r.would_share === 'yes') shareYes += 1;
    trustSum += r.trust;
  }

  const sentiment: Sentiment = {
    positive: Math.round((stanceCounts.positive / total) * 100),
    neutral: Math.round((stanceCounts.neutral / total) * 100),
    negative: Math.round((stanceCounts.negative / total) * 100),
  };

  const clickIntent = Math.round(((clickYes + clickMaybe * 0.5) / total) * 100);
  const trustScore = trustSum / total;
  const viralitySignal = Math.round((shareYes / total) * 100);

  return {
    sim_id: meta.simId,
    project_id: meta.projectId,
    run_at: meta.runAt,
    config: meta.config,
    sentiment,
    click_intent: clickIntent,
    trust_score: Math.round(trustScore * 10) / 10,
    virality_signal: viralitySignal,
    top_objections: aggregateObjections(responses),
    representative_quotes: pickQuotes(responses),
    responses_total: responses.length,
  };
};

// ════════════════════════════════════════════════════════════════════
// Public entry point
// ════════════════════════════════════════════════════════════════════

export const runCommunitySim = async (
  args: RunCommunitySimArgs,
): Promise<CommunitySim> => {
  const { ad, config, brandFacts = [], onProgress, signal } = args;
  const report = (stage: CommunitySimProgressStage, message: string, percent: number): void =>
    onProgress?.({ stage, message, percent });

  let simulationId: string | null = null;
  try {
    // ── 1. Seed + ontology
    report('seed_uploading', 'อัปโหลด seed และวิเคราะห์ ontology...', 5);
    const seed = buildSeedText(ad, brandFacts);
    const simRequirement = `วิเคราะห์ปฏิกิริยาของชุมชนต่อ ad ม่านธารา style "${ad.style}" — คาดการณ์ engagement, sentiment, และข้อโต้แย้ง`;

    const ontology = await generateOntology({
      simulationRequirement: simRequirement,
      seedText: seed,
      projectName: `MTR community sim · ${ad.style} · ${new Date().toISOString().slice(0, 16)}`,
      signal,
    });

    // ── 2. Build graph
    report('graph_building', 'กำลังสร้าง community graph...', 15);
    const build = await buildGraph({ projectId: ontology.projectId, signal });
    while (!signal?.aborted) {
      const task = await getTaskStatus(build.taskId, signal);
      report('graph_building', task.message ?? 'building graph', 15 + Math.round((task.progress ?? 0) * 0.15));
      if (task.status === 'completed') break;
      if (task.status === 'failed') throw new Error(task.error ?? 'Graph build failed');
      await sleep(POLL_GRAPH_MS, signal);
    }
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

    // ── 3. Create sim
    report('sim_creating', 'สร้าง simulation environment...', 30);
    const sim = await createSimulation({ projectId: ontology.projectId, signal });
    simulationId = sim.simulation_id;

    // ── 4. Prepare profiles
    // Pass entity_types from the ontology — without this, backend defaults
    // to an empty set, produces zero profiles, and the task reports
    // "complete" while the simulation silently fails to register as ready
    // (manifests as "Simulation not ready. Current status: failed" at the
    // /start call). Captured 2026-05-19 from a real prepare log:
    //   "预期实体数量: 0, 类型: set()"
    report('sim_preparing', `generate ${config.agent_count} agent profiles...`, 35);
    if (ontology.entityTypes.length === 0) {
      throw new Error(
        'Ontology returned zero entity types. The seed text was probably too '
        + 'small or generic for MiroFish to extract distinct populations. '
        + 'Try adding brand facts and customer quotes before running again.',
      );
    }
    const prep = await prepareSimulation({
      simulationId,
      entityTypes: ontology.entityTypes,
      parallelProfileCount: config.agent_count,
      signal,
    });
    if (!prep.alreadyPrepared && prep.taskId) {
      while (!signal?.aborted) {
        const status = await getPrepareStatus({
          simulationId,
          taskId: prep.taskId,
          signal,
        });
        report('sim_preparing', status.message ?? 'preparing', 35 + Math.round(status.progress * 0.1));
        if (status.status === 'ready' || status.status === 'completed') break;
        if (status.status === 'failed') throw new Error(status.error ?? 'Prepare failed');
        await sleep(POLL_PREPARE_MS, signal);
      }
    }
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

    // ── 5. Start + poll run-status
    report('sim_starting', 'สั่ง simulation เริ่มรัน...', 45);
    await startSimulation({
      simulationId,
      platform: 'parallel',
      maxRounds: config.rounds,
      force: false,
      signal,
    });

    report('sim_running', 'agents กำลังโต้ตอบในชุมชน...', 50);
    let idleTicks = 0;
    while (!signal?.aborted) {
      const status = await getRunStatus(simulationId, signal);
      const pct =
        status.totalRounds > 0
          ? 50 + Math.round((status.currentRound / status.totalRounds) * 30)
          : 50;
      report(
        'sim_running',
        status.totalRounds > 0
          ? `รอบ ${status.currentRound}/${status.totalRounds} · ${status.totalActionsCount} actions`
          : 'engine warming up',
        pct,
      );
      const r = status.runnerStatus.toLowerCase();
      if (r === 'finished' || r === 'completed' || r === 'done' || r === 'stopped') break;
      if (r === 'idle') {
        if (status.totalActionsCount > 0) break;
        idleTicks += 1;
        if (idleTicks >= MAX_IDLE_GRACE_TICKS) {
          throw new Error('Simulation engine remained idle — agents never produced actions');
        }
        await sleep(POLL_RUN_MS, signal);
        continue;
      }
      idleTicks = 0;
      if (r === 'failed' || r === 'error') throw new Error(`Simulation runner ${r}`);
      await sleep(POLL_RUN_MS, signal);
    }
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

    // ── 6. Interview every agent
    report('interviewing', `สัมภาษณ์ ${config.agent_count} agents...`, 85);
    const interview = await interviewAll({
      simulationId,
      prompt: buildInterviewPrompt(ad),
      timeoutSec: 600,
      signal,
    });

    // ── 7. Aggregate
    report('aggregating', `รวบรวม ${interview.count} responses...`, 95);
    const parsed: ParsedResponse[] = [];
    for (const raw of interview.results) {
      const p = parseInterview(raw);
      if (p) parsed.push(p);
    }

    if (parsed.length === 0) {
      throw new Error(
        `MiroFish returned ${interview.count} responses but none were parseable JSON. The agents may have ignored the format instruction — try a smaller sim or rerun.`,
      );
    }

    const result = aggregate(parsed, {
      simId: simulationId,
      projectId: ontology.projectId,
      runAt: new Date().toISOString(),
      config,
    });

    report('done', `เสร็จสิ้น (${parsed.length}/${interview.count} parsable)`, 100);
    return result;
  } catch (err) {
    // On any failure, fire-and-forget stop so the backend doesn't burn LLM
    // tokens on an orphan simulation.
    if (simulationId) {
      void stopSimulation(simulationId).catch(() => {
        // intentional swallow — best-effort cleanup
      });
    }
    throw err;
  }
};
