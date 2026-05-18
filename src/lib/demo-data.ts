/**
 * Demo data bundle — loadable seed for first-time testing.
 *
 * Writes to the same localStorage keys the live hooks read on mount, so a
 * one-shot `applyDemoBundle()` + `window.location.reload()` lights up every
 * panel (Library, Strategy Brief, Customer Quotes, Performance, Strategy
 * Fit, Calibration, Obsidian export) without requiring the user to generate
 * anything via LLM first.
 *
 * Designed for Marnthara's market context (Lopburi curtain shop).
 */

import type { CustomerQuote } from './customer-quotes';
import type { StrategyBrief } from './strategy-brief';
import type { AdEvaluation, ParsedAdIdea } from './schemas';
import type { PerformanceMetrics } from './performance';
import { campaignHashOf } from './strategy-brief';

// ════════════════════════════════════════════════════════════════════
// Sample saved ad — full evaluation incl. strategy_fit + competitor
// ════════════════════════════════════════════════════════════════════

type Outcome = 'used-good' | 'used-bad';

interface SavedAdLike extends ParsedAdIdea {
  id: string;
  clientId: string;
  evaluation: AdEvaluation | null;
  outcome?: Outcome;
  performance?: PerformanceMetrics;
}

const DEMO_BRIEF_HASH = campaignHashOf(
  'ม่านลอนเทปผ้า blackout (รุ่น hotel grade)',
  'ประเมินหน้างานฟรี + ผ่อน 0% 3 เดือน · ลพบุรี-สิงห์บุรี-อ่างทอง · ภายใน 31 พ.ค.',
);

const fullEvalA: AdEvaluation = {
  panel_verdict: 'พ่อบ้าน-แม่บ้านชอบมาก · GenZ เฉยๆ เพราะภาษาเป็นทางการเกิน',
  trends_used: ['หน้าร้อน 2026', 'ค่าไฟแพง'],
  structure: {
    hook_score: 7,
    hook_critique: '"ค่าไฟแพง?" ตรงปม pain ได้ดี แต่ first line ไม่มีตัวเลข specific',
    body_score: 8,
    body_critique: 'ตัวเลขรับประกัน 3 ปี + ทีมประจำ ครบ + offer ชัด',
    cta_score: 7,
    cta_critique: 'ทักไลน์ดี แต่ไม่มี deadline กระตุ้น urgency',
  },
  channel_fit: {
    ranked: [
      { channel: 'facebook_feed', score: 9 },
      { channel: 'facebook_reels', score: 6 },
      { channel: 'instagram_feed', score: 5 },
      { channel: 'instagram_reels', score: 4 },
      { channel: 'tiktok', score: 3 },
    ],
    best: 'facebook_feed',
    reasoning: 'ad ยาวเน้นข้อมูล + ตัวเลข เหมาะ FB Feed ที่ลูกค้าหลักสแกนต่อเนื่อง',
  },
  personas: [
    {
      id: 'family_man',
      scroll_stop_score: 8,
      focused_score: 9,
      memory_score: 8,
      confidence: 'high',
      verdict: 'มีตัวเลขชัดเจน "3 ปี" ตรงใจคนใส่ใจ warranty',
      suggestion: 'เพิ่ม "ติดเสร็จในวันเดียว" เพื่อปิดข้อกังวลเวลา',
    },
    {
      id: 'housewife',
      scroll_stop_score: 7,
      focused_score: 8,
      memory_score: 7,
      confidence: 'high',
      verdict: '"ลด 4-6°C" รู้สึกได้ทันที + ฟรีประเมินทำให้กดทักง่าย',
      suggestion: 'เพิ่ม before/after ภาพให้ ad copy ชี้ไปอ้างอิง',
    },
    {
      id: 'businessman',
      scroll_stop_score: 6,
      focused_score: 7,
      memory_score: 6,
      confidence: 'med',
      verdict: 'พูดเรื่องบ้านพักอาศัย — ไม่ระบุงาน B2B รับหลายห้อง',
      suggestion: 'เพิ่มประโยค "ร้านอาหาร/ออฟฟิศก็ทำ" + ใบกำกับภาษี',
    },
    {
      id: 'genz',
      scroll_stop_score: 3,
      focused_score: 4,
      memory_score: 3,
      confidence: 'high',
      verdict: 'corporate tone "เรียนเชิญ" "ลูกค้าผู้มีเกียรติ" — scroll ผ่าน',
      suggestion: 'rewrite ใหม่ทั้งหมด · POV/BTS + aesthetic visual + tone เป็นกันเอง',
    },
  ],
  average_score: 6.4,
  competitor: {
    winner: 'ours',
    margin: 4,
    ours_strengths: [
      'ตัวเลขรับประกันชัด · ทีมประจำของร้าน · มีหน้าร้านอ้างอิงได้',
    ],
    theirs_strengths: ['ราคาถูกกว่า 15% · มี promotion ผ่อน 0% นานกว่า'],
    recommendation: 'เน้นความเสถียรของ warranty + ทีม install เอง — ราคาห้ามไปสู้ตรง',
  },
  strategy_fit: {
    positioning_score: 8,
    positioning_critique: 'ตรง archetype "reliable craftsman" — เน้น warranty + ทีมประจำ ตามที่ brief วางไว้',
    jtbd_coverage: [
      {
        segment_name: 'พ่อบ้านลพบุรี (35-55)',
        score: 9,
        gap: '—',
      },
      {
        segment_name: 'แม่บ้านชานเมือง (35-55)',
        score: 8,
        gap: 'ขาดการ์ดอุณหภูมิ before/after',
      },
      {
        segment_name: 'GenZ คอนโด/หอ (20-28)',
        score: 3,
        gap: 'tone ไม่ match — ไม่มี vibe-first hook',
      },
    ],
    whitespace_capture: 7,
    whitespace_critique: 'จับมุม "ลดค่าไฟ" ที่คู่แข่งไม่เล่น — ดี · แต่ยังไม่เด่นพอใน hook',
    benchmark_alignment: {
      channel: 'facebook_feed',
      estimated_ctr_pct: 1.8,
      vs_benchmark: 'on',
      note: 'CTR คาดที่ ~1.8% ใกล้ p50 ของ FB Feed niche ตกแต่งบ้าน',
    },
  },
};

const fullEvalB: AdEvaluation = {
  panel_verdict: 'GenZ ขึ้น 8.7 ด้วย POV format · พ่อบ้านงง พูดไม่เข้าใจ',
  trends_used: ['POV', 'aesthetic golden hour', 'ห้องนอน soft light'],
  structure: {
    hook_score: 9,
    hook_critique: '"POV: เปิดผ้าม่านครั้งแรกตอน 6 โมงเย็น" — visual + emotion ลึกใน 1 บรรทัด',
    body_score: 7,
    body_critique: 'สั้น พอดี · ขาด proof point ตัวเลขทำให้ confidence ลด',
    cta_score: 6,
    cta_critique: '"ทักมาคุยก่อน" warm แต่ไม่ specific ว่าได้อะไรกลับ',
  },
  channel_fit: {
    ranked: [
      { channel: 'tiktok', score: 9 },
      { channel: 'instagram_reels', score: 9 },
      { channel: 'facebook_reels', score: 7 },
      { channel: 'instagram_feed', score: 6 },
      { channel: 'facebook_feed', score: 3 },
    ],
    best: 'tiktok',
    reasoning: 'POV + sound-on + 9:16 vertical — TikTok บีบโฮสต์ format นี้ตรงจุด',
  },
  personas: [
    {
      id: 'family_man',
      scroll_stop_score: 3,
      focused_score: 2,
      memory_score: 3,
      confidence: 'high',
      verdict: 'งง "POV" คืออะไร อ่านไม่ได้ความ — สแกนผ่าน',
      suggestion: 'ad นี้ไม่ใช่สำหรับ persona นี้ — แยก campaign target genz เลย',
    },
    {
      id: 'housewife',
      scroll_stop_score: 5,
      focused_score: 4,
      memory_score: 4,
      confidence: 'med',
      verdict: 'สวย แต่ไม่รู้ว่าขายอะไร · ดูซ้ำสองครั้งกว่าจะเข้าใจ',
      suggestion: 'หากทำสำหรับ persona นี้ ต้องใส่ benefit ชัด',
    },
    {
      id: 'businessman',
      scroll_stop_score: 4,
      focused_score: 3,
      memory_score: 3,
      confidence: 'med',
      verdict: 'aesthetic เกิน — ไม่เห็น ROI signal',
      suggestion: 'แยก campaign B2B เลย',
    },
    {
      id: 'genz',
      scroll_stop_score: 9,
      focused_score: 8,
      memory_score: 9,
      confidence: 'high',
      verdict: 'pure vibe · ภาษาตรง · save แล้ว show เพื่อนได้ทันที',
      suggestion: 'เพิ่ม trending audio + filter golden hour — ไป Reels',
    },
  ],
  average_score: 5.1,
};

const briefDraftedAt = new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(); // 2 days ago

const DEMO_BRIEF: StrategyBrief = {
  campaign_hash: DEMO_BRIEF_HASH,
  product_summary: 'ม่านลอนเทปผ้า blackout เกรดโรงแรม กันแสง 99% กันร้อน 4-6°C',
  promo_summary: 'ประเมินหน้างานฟรี + ผ่อน 0% 3 เดือน · ภายใน 31 พ.ค.',
  positioning: {
    archetype: 'reliable_craftsman',
    value_prop: 'ม่านที่ทนแดดลพบุรี 8-10 ปี ติดตั้งโดยช่างประจำของร้าน',
    tone_rules: [
      'warm, no corporate',
      'ใช้ "ครับ" สำหรับพ่อบ้าน · "ค่ะ" สำหรับแม่บ้าน',
      'ห้าม "เรียนเชิญ" "ลูกค้าผู้มีเกียรติ"',
    ],
    brand_promises: [
      'รับประกัน 3 ปี วัสดุ + 1 ปี งานติดตั้ง',
      'ทีมช่างประจำของร้าน ไม่ใช้ subcontract',
      'ติดเสร็จในวันเดียว',
    ],
    anti_positioning: [
      'ไม่ใช่แบรนด์ luxury กรุงเทพ',
      'ไม่ใช่ม่านราคาถูกที่สุด',
    ],
  },
  segments: [
    {
      name: 'พ่อบ้านลพบุรี (35-55)',
      linked_persona: 'family_man',
      jtbd_functional: 'ลดค่าไฟบ้าน + กันแสงให้ลูกๆ นอนกลางวัน',
      jtbd_emotional: 'รู้สึกว่าดูแลครอบครัวได้',
      jtbd_social: 'อวดเพื่อนบ้านว่าบ้านเย็นกว่า',
      top_objection: 'กลัวราคาแพงเกินไป + ม่านเสีย',
      winning_angle: 'เทียบค่าไฟต่อเดือน + รับประกัน 3 ปี',
      funnel_stage: 'warm',
      priority: 1,
    },
    {
      name: 'แม่บ้านชานเมือง (35-55)',
      linked_persona: 'housewife',
      jtbd_functional: 'กันแสง+ฝุ่น + ทำความสะอาดง่าย',
      jtbd_emotional: 'บ้านดูสะอาด เรียบร้อย น่าอยู่',
      jtbd_social: 'รูปบ้านที่พร้อมโพสต์ลง FB ตอนญาติมาเยี่ยม',
      top_objection: 'กลัวซักไม่ออก + กลัวสีไม่ตรง interior',
      winning_angle: 'before/after ภาพบ้านจริง + วัสดุซักได้',
      funnel_stage: 'warm',
      priority: 2,
    },
    {
      name: 'GenZ คอนโด/หอ (20-28)',
      linked_persona: 'genz',
      jtbd_functional: 'คุม mood ห้อง + nap session',
      jtbd_emotional: '"my room my vibe"',
      jtbd_social: 'IG/TikTok room tour ที่เพื่อนคอมเมนต์',
      top_objection: 'งบจำกัด + ติดเจ้าของหอไม่ให้ติด',
      winning_angle: 'aesthetic golden hour + budget tier ฿2,500-฿5,000',
      funnel_stage: 'cold',
      priority: 3,
    },
  ],
  competitors: [
    {
      name: 'ร้านม่าน A (ลพบุรี)',
      positioning: 'ราคาถูกที่สุดในจังหวัด · "ลด 50% ทั้งร้าน"',
      typical_offer: 'ลด 50% + ฟรีติดตั้ง',
      weakness: 'ไม่มีโชว์รูม · รีวิวน้อย · ไม่มีรับประกันเป็นลายลักษณ์',
    },
    {
      name: 'แบรนด์ B (กรุงเทพ ส่งต่างจังหวัด)',
      positioning: 'พรีเมียม นำเข้ายุโรป · "ม่านระดับโรงแรม 5 ดาว"',
      typical_offer: 'ราคาเริ่ม ฿3,500/ตรม. + รับประกัน 5 ปี',
      weakness: 'แพงเกินกลุ่มต่างจังหวัด · ส่งช้า · ไม่เข้าใจอากาศลพบุรี',
    },
  ],
  whitespace: [
    {
      opportunity: 'ไม่มีร้านไหนเล่นมุม "ลดค่าไฟต่อเดือน" เป็นตัวเลข',
      evidence: 'จาก 5 ad คู่แข่งล่าสุด ไม่มีใครพูด electricity savings',
      recommended_angle: 'คำนวณค่าไฟ before/after + แสดงเปรียบเทียบเดือน',
    },
    {
      opportunity: 'B2B small business (ร้านอาหาร โรงแรมบูทีค ออฟฟิศ) ไม่มีใครยิง',
      evidence: 'ทุก ad คู่แข่งพูดเฉพาะบ้านพักอาศัย',
      recommended_angle: 'campaign แยก B2B + ใบกำกับภาษี + บริการประเมินงานหลายห้อง',
    },
  ],
  campaign: {
    objective: 'lead_gen',
    offer_structure: 'ประเมินหน้างานฟรี + ผ่อน 0% 3 เดือน + ส่วนลด 20% (จำกัด 10 ครั้ง)',
    urgency: 'หมดเขต 31 พ.ค.',
    channel_mix: ['facebook_feed', 'facebook_reels', 'instagram_reels'],
  },
  benchmarks: [
    {
      channel: 'facebook_feed',
      ctr_pct: { p25: 0.8, p50: 1.6, p75: 2.4 },
      cpc_thb: { p25: 4, p50: 8, p75: 14 },
      cpm_thb: { p25: 40, p50: 80, p75: 140 },
      best_time_local: '19:00-22:00',
      hook_length_chars: { min: 40, max: 90 },
      notes: 'ลูกค้าหลักผ่าน FB Feed ตอนเย็น',
    },
    {
      channel: 'facebook_reels',
      ctr_pct: { p25: 1.2, p50: 2.4, p75: 3.6 },
      cpc_thb: { p25: 5, p50: 10, p75: 16 },
      cpm_thb: { p25: 60, p50: 120, p75: 200 },
      best_time_local: '12:00-13:00, 21:00-23:00',
      hook_length_chars: { min: 20, max: 50 },
      notes: 'hook 0.5s critical',
    },
    {
      channel: 'tiktok',
      ctr_pct: { p25: 1.5, p50: 3.0, p75: 5.0 },
      cpc_thb: { p25: 4, p50: 8, p75: 15 },
      cpm_thb: { p25: 30, p50: 60, p75: 120 },
      best_time_local: '21:00-24:00',
      hook_length_chars: { min: 15, max: 40 },
      notes: 'sound-on + vibe-first',
    },
  ],
  drafted_at: briefDraftedAt,
  source: 'ai_only',
  edited_fields: ['positioning.value_prop', 'segments[0].winning_angle'],
};

// ════════════════════════════════════════════════════════════════════
// Saved ads (3 demos)
// ════════════════════════════════════════════════════════════════════

const DEMO_SAVED_ADS: SavedAdLike[] = [
  {
    id: 'demo-ad-1',
    clientId: 'demo-client-1',
    style: 'จริงใจแก้ปัญหา',
    copy: `ค่าไฟแพง? ม่านลอนเทปผ้า blackout ลดอุณหภูมิ 4-6°C ในห้องนอน

✅ รับประกัน 3 ปี วัสดุ + 1 ปี งานติดตั้ง
✅ ทีมช่างประจำของร้าน ไม่ใช้ subcontract
✅ ติดเสร็จในวันเดียว
✅ พิเศษ! ผ่อน 0% 3 เดือน (เริ่ม ฿1,200/ตรม.)

ทักไลน์ @marnthara เพื่อประเมินหน้างานฟรี — ท่าศาลา-ลพบุรี`,
    visual_idea:
      'ภาพห้องนอน before/after — ซ้ายแสงแดดจ้า, ขวาผ้าม่านปิดแสงนวลๆ พร้อม overlay ตัวเลข "ลด 4-6°C"',
    evaluation: fullEvalA,
    outcome: 'used-good',
    performance: {
      reach: 18500,
      impressions: 22300,
      clicks: 412,
      saves: 38,
      shares: 11,
      engagement: 87,
      cost_thb: 3450,
      notes: 'รัน 5 วัน · เกิด lead ทักไลน์ 47 คน → ปิดยอด 6 หลัง',
      recorded_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
    },
  },
  {
    id: 'demo-ad-2',
    clientId: 'demo-client-2',
    style: 'GenZ-coded',
    copy: `POV: เปิดผ้าม่านครั้งแรกตอน 6 โมงเย็น 🌙

แสงนวลๆ ฉ่ำๆ ลั่นทั้งห้อง
ฟิน อยู่หมัด

ลด 4-6°C จริงๆ อ่ะ ไม่ได้พูดเล่น

ทักมาคุยก่อน @marnthara`,
    visual_idea: 'POV shot 9:16 · close-up มือเปิดม่าน · golden hour soft light · ฝุ่นในแสง · mood blue-orange',
    evaluation: fullEvalB,
  },
  {
    id: 'demo-ad-3',
    clientId: 'demo-client-3',
    style: 'พรีเมียม',
    copy: `Smart Curtain System สำหรับร้านอาหาร & โรงแรมบูทีค

ออกใบกำกับภาษีได้ · รับงานหลายห้อง · ทีมประจำของร้าน
รับประกัน 3 ปี · ราคาเริ่ม ฿1,200/ตรม.

ลูกค้าตัวอย่าง: คาเฟ่ในตัวเมืองลพบุรี · โรงแรมบูทีค 12 ห้องสิงห์บุรี

นัดหมายประเมิน LINE @marnthara`,
    visual_idea: 'ภาพ wide-angle ร้านอาหาร interior style minimal · ม่านลอนสีเทาดำ · lighting moody premium',
    evaluation: null,
    outcome: 'used-bad',
    performance: {
      reach: 4200,
      impressions: 5100,
      clicks: 18,
      cost_thb: 1280,
      notes: 'CTR 0.35% — ต่ำมาก · audience targeting แคบไป (B2B niche)',
      recorded_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 12).toISOString(),
    },
  },
];

// ════════════════════════════════════════════════════════════════════
// Customer quotes — replace defaults with realistic enabled quotes
// ════════════════════════════════════════════════════════════════════

const DEMO_QUOTES: CustomerQuote[] = [
  {
    id: 'demo-q-1',
    persona: 'family_man',
    quote:
      'ติดให้แล้วค่าไฟลดจริง เดือนละ 400-500 บาท คุ้มมาก ทีมงานสุภาพ ติดเสร็จในวันเดียว — ลพบุรีตอนนี้ 39°C ห้องเย็นกว่าก่อนเยอะ',
    context: 'พ่อบ้านลพบุรี · ติดม่าน 4 ห้อง · มิ.ย. 2025',
    enabled: true,
    isDefault: false,
  },
  {
    id: 'demo-q-2',
    persona: 'housewife',
    quote:
      'ตอนแรกกลัวซักไม่ออก ปรากฏเอาออกซักได้สบาย ฝุ่นลพบุรีเยอะแต่ม่านยังดูใหม่ ลูกแพ้ฝุ่นน้อยลงด้วย',
    context: 'แม่บ้านวังเหนือ · ใช้มา 8 เดือน',
    enabled: true,
    isDefault: false,
  },
  {
    id: 'demo-q-3',
    persona: 'businessman',
    quote:
      'ร้านกาแฟผมต้องการ vibe เฉพาะ ทีมเค้าเข้ามาเสนอ option หลายแบบ ไม่ฮาร์ดเซลล์ ออกใบกำกับภาษีเรียบร้อย ติดเสร็จก่อนเปิดร้าน',
    context: 'เจ้าของคาเฟ่ลพบุรี · 12 ที่นั่ง',
    enabled: true,
    isDefault: false,
  },
  {
    id: 'demo-q-4',
    persona: 'genz',
    quote: 'ปังมาก ฉ่ำ ห้องเปลี่ยน vibe ไปเลย เพื่อนมานอนเล่นบอกอยู่ยาว 🌙',
    context: 'นักศึกษาคอนโด ลพบุรี · 1 ห้องนอน',
    enabled: true,
    isDefault: false,
  },
];

// ════════════════════════════════════════════════════════════════════
// Apply
// ════════════════════════════════════════════════════════════════════

const KEYS = {
  savedAds: 'mtr_saved_ads',
  quotes: 'mtr_customer_quotes',
  briefs: 'mtr_strategy_briefs',
} as const;

export interface DemoBundleSummary {
  savedAds: number;
  quotes: number;
  briefs: number;
}

export const applyDemoBundle = (): DemoBundleSummary => {
  try {
    localStorage.setItem(KEYS.savedAds, JSON.stringify(DEMO_SAVED_ADS));
  } catch (err) {
    console.warn('[demo-data] failed to write savedAds', err);
  }
  try {
    localStorage.setItem(KEYS.quotes, JSON.stringify(DEMO_QUOTES));
  } catch (err) {
    console.warn('[demo-data] failed to write quotes', err);
  }
  try {
    localStorage.setItem(KEYS.briefs, JSON.stringify([DEMO_BRIEF]));
  } catch (err) {
    console.warn('[demo-data] failed to write briefs', err);
  }
  return {
    savedAds: DEMO_SAVED_ADS.length,
    quotes: DEMO_QUOTES.length,
    briefs: 1,
  };
};

export const clearDemoBundle = (): void => {
  try {
    localStorage.removeItem(KEYS.savedAds);
    localStorage.removeItem(KEYS.quotes);
    localStorage.removeItem(KEYS.briefs);
  } catch (err) {
    console.warn('[demo-data] clear failed', err);
  }
};

/** True when the saved-ads slot looks like the demo bundle (id prefix `demo-`). */
export const isDemoLoaded = (): boolean => {
  try {
    const raw = localStorage.getItem(KEYS.savedAds);
    if (!raw) return false;
    const parsed: unknown = JSON.parse(raw);
    return (
      Array.isArray(parsed) &&
      parsed.length > 0 &&
      typeof (parsed[0] as { id?: unknown }).id === 'string' &&
      ((parsed[0] as { id: string }).id.startsWith('demo-'))
    );
  } catch {
    return false;
  }
};

export const DEMO_DATA = {
  savedAds: DEMO_SAVED_ADS,
  brief: DEMO_BRIEF,
  quotes: DEMO_QUOTES,
} as const;
