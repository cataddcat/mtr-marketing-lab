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

import type { StrategyBrief } from './strategy-brief';
import type { AdEvaluation, CommunitySim, ParsedAdIdea } from './schemas';
import type { PerformanceMetrics } from './performance';
import type { BrandFact } from './brand-facts';
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

// ════════════════════════════════════════════════════════════════════
// Community simulation results (Track E.M2)
// Pre-baked MiroFish outputs attached to each demo ad — lets the user
// inspect the CommunitySimulationPanel UI end-to-end without spinning
// up the MiroFish backend. Numbers chosen to contrast the two ads:
//   A = utility/family ad → high trust, mid virality
//   B = GenZ aesthetic ad → high virality, lower trust
// ════════════════════════════════════════════════════════════════════

const SIM_RUN_AT_A = new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(); // 3 days ago
const SIM_RUN_AT_B = new Date(Date.now() - 1000 * 60 * 60 * 36).toISOString();     // 36h ago

const DEMO_COMMUNITY_SIM_A: CommunitySim = {
  sim_id: 'demo-sim-A-warmfamily',
  project_id: 'demo-mirofish-marnthara',
  run_at: SIM_RUN_AT_A,
  config: { agent_count: 24, rounds: 12 },
  sentiment: { positive: 62, neutral: 25, negative: 13 },
  click_intent: 67,
  trust_score: 4.3,
  virality_signal: 28,
  top_objections: [
    {
      text: 'ราคาเริ่ม ฿1,200/ตรม. รวม 4 ห้องก็ยัง ฿20,000+ — เกินงบครอบครัว',
      count: 5,
    },
    {
      text: 'ทีมประเมินเข้าวันธรรมดาไม่ได้ ทำงานเช้า-เย็น เสาร์-อาทิตย์ติดประชุม',
      count: 4,
    },
    {
      text: 'ยังไม่เห็นบ้านลพบุรีจริงๆ before/after พร้อมตัวเลขค่าไฟ',
      count: 3,
    },
    {
      text: 'บ้านเช่า เจ้าของหอไม่อนุญาตเจาะติด — มีแบบไม่เจาะไหม',
      count: 2,
    },
    {
      text: 'รับประกัน 3 ปี ดี แต่งานติดตั้งแค่ 1 ปี กลัวรอยรั่วของผนัง',
      count: 2,
    },
  ],
  representative_quotes: [
    {
      persona: 'พ่อบ้านบ้านโพธิ์ · กำลังตัดสินใจ · LINE group ครอบครัว',
      text: 'ค่าไฟผมเดือนละ 3,500 บาท ถ้าลดได้จริง 4-6°C น่าจะคุ้มผ่อน 3 เดือน — จะคุยกับภรรยาแล้วนัดประเมินสุดสัปดาห์นี้',
      stance: 'positive',
    },
    {
      persona: 'แม่บ้านเขาพระงาม · มีลูกเล็ก 2 คน',
      text: 'ลูกๆ นอนกลางวัน ห้องร้อนทุกบ่าย รับประกัน 3 ปีก็ดี แต่อยากเห็นภาพห้องนอนคนอื่นจริงๆ ที่ไม่ใช่ภาพ stock — น่าจะกดทักเลย',
      stance: 'positive',
    },
    {
      persona: 'พ่อบ้านท่าหิน · เทียบหลายเจ้า',
      text: 'ผ่อน 0% ดี แต่ ฿1,200 คูณ 4 ห้องก็ ฿20,000+ ขอเก็บไว้ก่อน หาเปรียบกับร้านในเมือง — ถ้าเห็นรีวิวลูกค้าคงตัดสินใจง่ายขึ้น',
      stance: 'neutral',
    },
    {
      persona: 'เจ้าของคาเฟ่ลพบุรี · คิดอยู่',
      text: 'ส่วนใหญ่พูดเรื่องห้องนอน แต่ร้านผมขนาด 60 ตรม. สไตล์มินิมอล — ทำแยก B2B + ออกใบกำกับภาษีได้ไหม? ขอข้อมูลเพิ่ม',
      stance: 'neutral',
    },
    {
      persona: 'แม่บ้านเช่าหอ · บ้านเช่า',
      text: 'อยู่หอเช่าเจ้าของไม่ให้เจาะติด แล้วก็ของเค้าก็เป็นแบบเจาะรูที่ฝา — มีรุ่นไม่เจาะหรือคลิปแขวนไหม จะได้เรียก',
      stance: 'negative',
    },
    {
      persona: 'GenZ คอนโด · ไม่ใช่กลุ่มเป้าหมาย',
      text: 'ดูเหมือนโฆษณาสำหรับพ่อๆ แม่ๆ ไม่ใช่ห้องผม tone ทางการเกินไป — มีรุ่นที่เป็น aesthetic vibe-first บ้างไหม',
      stance: 'negative',
    },
  ],
  responses_total: 24,
};

const DEMO_COMMUNITY_SIM_B: CommunitySim = {
  sim_id: 'demo-sim-B-genzpov',
  project_id: 'demo-mirofish-marnthara',
  run_at: SIM_RUN_AT_B,
  config: { agent_count: 24, rounds: 12 },
  sentiment: { positive: 54, neutral: 21, negative: 25 },
  click_intent: 52,
  trust_score: 3.2,
  virality_signal: 76,
  top_objections: [
    {
      text: 'ไม่บอกราคาเลย เปิดมาสวยแต่ไม่รู้กี่บาท ขอเลยทันที',
      count: 6,
    },
    {
      text: 'ดูเหมือน Pinterest post ไม่ใช่โฆษณา ไม่รู้กำลังขายอะไรกันแน่',
      count: 5,
    },
    {
      text: '"ทักมาคุยก่อน" CTA หลวมเกิน ไม่ specific ว่าทักไปแล้วได้อะไร',
      count: 3,
    },
    {
      text: 'POV นี้ส่งให้แม่ดูไม่ได้ พ่อแม่ไม่เข้าใจภาษาวัยรุ่น',
      count: 2,
    },
    {
      text: 'อยากเห็นว่าจริงม่านลด 4-6°C ยังไง มีคนวัดอุณหภูมิจริงไหม',
      count: 2,
    },
  ],
  representative_quotes: [
    {
      persona: 'GenZ นักศึกษา · จะแชร์ LINE group เพื่อน',
      text: 'ฉ่ำมาก save แล้วส่งกลุ่มเพื่อนทันที — golden hour กับห้องนอน soft light คือ aesthetic เป๊ะ แต่งบจำกัด ขอรอเซลโลด',
      stance: 'positive',
    },
    {
      persona: 'GenZ คอนโด · จะแชร์ IG story',
      text: 'เพิ่งย้ายเข้าคอนโด ห้องเปลือยมาก โฆษณานี้ทำให้อยากแต่งห้องเลย — ขอข้อมูล DM แล้วค่อยตัดสินใจ ถ้าราคาโอเค',
      stance: 'positive',
    },
    {
      persona: 'แม่บ้านชานเมือง · ลูกสาวอยากได้',
      text: 'สวยจริง ลูกสาวเห็นแล้วบอกอยากได้แบบนี้ในห้อง — แต่ไม่บอกราคา ก็กลัวว่าแพง ไม่กล้าทักไป',
      stance: 'neutral',
    },
    {
      persona: 'พ่อบ้านชนบท · ดูซ้ำสองรอบ',
      text: 'POV คืออะไร ภาษาวัยรุ่นไม่ค่อยเข้าใจ — แต่ visual ก็คือผ้าม่านนะ ผมไม่ใช่กลุ่มหรอก แต่จะส่งให้ลูกสาวดู',
      stance: 'neutral',
    },
    {
      persona: 'นักศึกษาบ้านเช่า · รอเก็บเงิน 3 เดือน',
      text: 'save ไว้ใน collection "ห้องที่อยากแต่ง" ถ้าจะติดต้องรออีก 3-4 เดือน — น่าจะกลับมาดูทีหลัง',
      stance: 'neutral',
    },
    {
      persona: 'เจ้าของออฟฟิศ · ไม่ใช่กลุ่มเป้าหมาย',
      text: 'ไม่ใช่ลูกค้ากลุ่มนี้แน่ ออฟฟิศต้องการม่านกัน UV + ใบกำกับภาษี ไม่ใช่ vibe shot — รอ ad ตัวอื่น',
      stance: 'negative',
    },
  ],
  responses_total: 24,
};

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
  },
  community_sim: DEMO_COMMUNITY_SIM_A,
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
  community_sim: DEMO_COMMUNITY_SIM_B,
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
// Brand facts — realistic overrides for the demo bundle
// Overrides the placeholder phone in DEFAULT_BRAND_FACTS and adds two
// custom facts (portfolio + cooling test) so the Judge / ad generator
// has richer ground truth to anchor copy.
// ════════════════════════════════════════════════════════════════════

const DEMO_BRAND_FACTS: BrandFact[] = [
  {
    id: 'warranty',
    label: 'การรับประกัน',
    value: '3 ปี (วัสดุ) + 1 ปี (งานติดตั้ง) · เปลี่ยนเทปอัตโนมัติฟรีตลอดอายุ',
    enabled: true,
    isDefault: true,
  },
  {
    id: 'service_area',
    label: 'พื้นที่บริการ',
    value: 'ลพบุรี · สิงห์บุรี · อ่างทอง · อยุธยา (รัศมี ~80 กม. ไม่มีค่าเดินทาง)',
    enabled: true,
    isDefault: true,
  },
  {
    id: 'price_start',
    label: 'ราคาเริ่มต้น',
    value: 'เริ่มต้น ฿1,200/ตรม. (ผ้า blackout เกรดโรงแรม) · ประเมินหน้างานฟรี',
    enabled: true,
    isDefault: true,
  },
  {
    id: 'free_quote',
    label: 'การประเมินหน้างาน',
    value: 'นัดประเมินฟรี ไม่บังคับซื้อ · ส่งใบเสนอราคาภายใน 24 ชม.',
    enabled: true,
    isDefault: true,
  },
  {
    id: 'line_id',
    label: 'LINE',
    value: '@marnthara',
    enabled: true,
    isDefault: true,
  },
  {
    id: 'phone',
    label: 'โทรศัพท์',
    value: '081-234-5678 (คุณก้อย ผู้จัดการร้าน)',
    enabled: true,
    isDefault: true,
  },
  {
    id: 'hours',
    label: 'เวลาทำการ',
    value: '09:00-21:00 ทุกวัน (ไม่หยุด นักขัตฤกษ์เปิดปกติ)',
    enabled: true,
    isDefault: true,
  },
  {
    id: 'material',
    label: 'จุดเด่นวัสดุ',
    value: 'ผ้านำเข้าเกาหลี ทนแดดลพบุรี 8-10 ปี · กันแสง 99% · ป้องกัน UV',
    enabled: true,
    isDefault: true,
  },
  {
    id: 'install_team',
    label: 'ทีมติดตั้ง',
    value: 'ช่างประจำของร้าน 4 คน (ไม่ใช้ subcontract) · ติดเสร็จในวันเดียว',
    enabled: true,
    isDefault: true,
  },
  {
    id: 'payment',
    label: 'การชำระเงิน',
    value: 'เงินสด · โอน · บัตรเครดิต · ผ่อน 0% 3 เดือน (ไม่มีค่าธรรมเนียม)',
    enabled: true,
    isDefault: true,
  },
  {
    id: 'demo-portfolio',
    label: 'ผลงานล่าสุด',
    value: 'โรงแรมบูทีค 12 ห้อง สิงห์บุรี · คาเฟ่ Yard Lopburi · บ้านเดี่ยวหมู่บ้าน Casa De Lopburi 50+ หลัง',
    enabled: true,
    isDefault: false,
  },
  {
    id: 'demo-cooling',
    label: 'ผลทดสอบเย็น',
    value: 'วัดด้วย thermometer ลพบุรี เม.ย. 2025 — ลด 4-6°C ในห้องนอน แสงแดด direct 14:00-16:00',
    enabled: true,
    isDefault: false,
  },
];

// ════════════════════════════════════════════════════════════════════
// Apply
// ════════════════════════════════════════════════════════════════════

const KEYS = {
  savedAds: 'mtr_saved_ads',
  briefs: 'mtr_strategy_briefs',
  brandFacts: 'mtr_brand_facts',
} as const;

// Legacy localStorage key — wiped on demo apply/clear so old browsers
// don't keep stale customer-quotes data after the feature was removed.
const LEGACY_KEYS_TO_PURGE = ['mtr_customer_quotes'] as const;

export interface DemoBundleSummary {
  savedAds: number;
  briefs: number;
  brandFacts: number;
}

export const applyDemoBundle = (): DemoBundleSummary => {
  try {
    localStorage.setItem(KEYS.savedAds, JSON.stringify(DEMO_SAVED_ADS));
  } catch (err) {
    console.warn('[demo-data] failed to write savedAds', err);
  }
  try {
    localStorage.setItem(KEYS.briefs, JSON.stringify([DEMO_BRIEF]));
  } catch (err) {
    console.warn('[demo-data] failed to write briefs', err);
  }
  try {
    localStorage.setItem(KEYS.brandFacts, JSON.stringify(DEMO_BRAND_FACTS));
  } catch (err) {
    console.warn('[demo-data] failed to write brandFacts', err);
  }
  // Wipe legacy keys we no longer use.
  for (const k of LEGACY_KEYS_TO_PURGE) {
    try { localStorage.removeItem(k); } catch { /* ignore */ }
  }
  return {
    savedAds: DEMO_SAVED_ADS.length,
    briefs: 1,
    brandFacts: DEMO_BRAND_FACTS.length,
  };
};

export const clearDemoBundle = (): void => {
  try {
    localStorage.removeItem(KEYS.savedAds);
    localStorage.removeItem(KEYS.briefs);
    localStorage.removeItem(KEYS.brandFacts);
    for (const k of LEGACY_KEYS_TO_PURGE) localStorage.removeItem(k);
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
  brandFacts: DEMO_BRAND_FACTS,
  communitySim: { adA: DEMO_COMMUNITY_SIM_A, adB: DEMO_COMMUNITY_SIM_B },
} as const;
