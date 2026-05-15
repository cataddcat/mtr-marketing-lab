import * as v from 'valibot';
import { PersonaIdSchema, type PersonaId } from './schemas';

/**
 * Real customer voices (testimonials, post-install feedback, FB comments)
 * the user has collected. Injected into the Judge prompt as a tone & language
 * reference per persona — closes the gap between LLM stereotype and ground truth.
 */

export const CustomerQuoteSchema = v.object({
  id: v.pipe(v.string(), v.minLength(1)),
  persona: PersonaIdSchema,
  quote: v.pipe(v.string(), v.maxLength(400)),
  context: v.pipe(v.string(), v.maxLength(120)),
  enabled: v.boolean(),
  isDefault: v.boolean(),
});

export const CustomerQuotesSchema = v.array(CustomerQuoteSchema);
export type CustomerQuote = v.InferOutput<typeof CustomerQuoteSchema>;

// 1 illustrative sample per persona — all disabled by default.
// User must explicitly enable + replace with real quote text.
export const DEFAULT_QUOTES: readonly CustomerQuote[] = [
  {
    id: 'sample-family',
    persona: 'family_man',
    quote: 'ติดให้แล้วค่าไฟลดจริง เดือนละ 400-500 บาท คุ้มมาก ทีมงานสุภาพ ติดเสร็จในวันเดียว',
    context: 'ตัวอย่าง — แทนที่ด้วยคำคอมเมนต์จริงจากลูกค้า',
    enabled: false,
    isDefault: true,
  },
  {
    id: 'sample-housewife',
    persona: 'housewife',
    quote: 'ลูกแพ้ฝุ่น ก่อนหน้านี้เปิดหน้าต่างไม่ได้ ติดม่านนี้แล้วสบายขึ้น ผ้าหนา ฝุ่นไม่ผ่าน',
    context: 'ตัวอย่าง — แทนที่ด้วยคำคอมเมนต์จริงจากลูกค้า',
    enabled: false,
    isDefault: true,
  },
  {
    id: 'sample-business',
    persona: 'businessman',
    quote: 'รับงาน 3 ห้องของ café หน้าวัด ทำเสร็จใน 5 วัน ใบกำกับภาษีออกครบ ทีมงานเป็นมืออาชีพ',
    context: 'ตัวอย่าง — แทนที่ด้วยคำคอมเมนต์จริงจากลูกค้า',
    enabled: false,
    isDefault: true,
  },
  {
    id: 'sample-genz',
    persona: 'genz',
    quote: 'ติดในคอนโด studio ลพบุรี เปลี่ยน vibe ห้องไปเลย ตอนเช้า light นวลๆ ฉ่ำมากก',
    context: 'ตัวอย่าง — แทนที่ด้วยคำคอมเมนต์จริงจากลูกค้า',
    enabled: false,
    isDefault: true,
  },
];

export const PERSONA_PROMPT_LABEL: Record<PersonaId, string> = {
  family_man: 'พ่อบ้าน',
  housewife: 'แม่บ้าน',
  businessman: 'เจ้าของธุรกิจ',
  genz: 'GenZ',
};

export function formatQuotesForPrompt(
  quotes: readonly CustomerQuote[],
): string {
  const active = quotes.filter(q => q.enabled && q.quote.trim().length > 0);
  if (active.length === 0) return '';

  const byPersona: Record<PersonaId, CustomerQuote[]> = {
    family_man: [],
    housewife: [],
    businessman: [],
    genz: [],
  };
  for (const q of active) byPersona[q.persona].push(q);

  const sections: string[] = [];
  for (const pid of ['family_man', 'housewife', 'businessman', 'genz'] as const) {
    const qs = byPersona[pid];
    if (qs.length === 0) continue;
    const lines = qs
      .map(q => `  - "${q.quote.trim()}"${q.context.trim() ? ` (${q.context.trim()})` : ''}`)
      .join('\n');
    sections.push(
      `<REAL_VOICES persona="${pid}" label="${PERSONA_PROMPT_LABEL[pid]}">\n${lines}\n</REAL_VOICES>`,
    );
  }

  if (sections.length === 0) return '';

  return `\n═══ เสียงลูกค้าจริง — ใช้เป็น tone & ภาษา reference (สำคัญกว่า persona stereotype) ═══
${sections.join('\n')}
หมายเหตุ: เสียงเหล่านี้คือคำพูดจริงของลูกค้าในอดีต — ใช้เป็นแบบของภาษา การห่วง และมุมมอง.
ห้ามอ้างอิงตรงๆ ในคำตอบ (ห้าม quote ออกมา), แต่ให้ใช้เป็นเข็มทิศของแต่ละ persona.\n`;
}

export function hashQuotes(quotes: readonly CustomerQuote[]): string {
  return quotes
    .filter(q => q.enabled && q.quote.trim().length > 0)
    .map(q => `${q.id}:${q.quote.length}`)
    .join('|');
}
