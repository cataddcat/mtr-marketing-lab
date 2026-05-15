/**
 * Niche keyword seeds for ม่านธารา (curtain shop, Lopburi).
 *
 * Google Trends RSS returns generic TH-wide top searches (politics, sport,
 * entertainment) that rarely intersect with the curtain/home-decor niche.
 * These seeds are used in two ways:
 *
 *  1. As an evergreen "domain context" block injected into the Judge prompt
 *     so the LLM knows what queries are perennially relevant to this business.
 *
 *  2. As a filter applied to Google's daily_top — when a generic trend
 *     happens to overlap with one of these terms, it gets highlighted in
 *     the TRENDS_TODAY block as a niche-relevant signal.
 *
 * Seeds are grouped semantically; LLM benefits from category structure when
 * reasoning about which signal to apply.
 */

export interface NicheCategory {
  readonly name: string;
  readonly hint: string;
  readonly terms: readonly string[];
}

export const NICHE_CATEGORIES: readonly NicheCategory[] = [
  {
    name: 'product',
    hint: 'ประเภทสินค้า',
    terms: [
      'ม่าน', 'ผ้าม่าน', 'ม่านลอนเทป', 'ม่านม้วน', 'ม่านพับ',
      'ม่านลูกฟูก', 'ม่านปรับแสง', 'มู่ลี่', 'มู่ลี่ไม้',
      'blackout', 'curtain', 'blind', 'shade', 'sheer',
    ],
  },
  {
    name: 'pain_point',
    hint: 'ปัญหาที่ลูกค้ามองหา',
    terms: [
      'กันแสง', 'กันร้อน', 'กันยูวี', 'ลดความร้อน',
      'ค่าไฟ', 'ค่าไฟแพง', 'แสงแดด', 'แดดส่อง',
      'ฝุ่น', 'pm2.5', 'แพ้ฝุ่น',
      'นอนไม่หลับ', 'เสียงรบกวน',
    ],
  },
  {
    name: 'lifestyle',
    hint: 'ไลฟ์สไตล์/aesthetic',
    terms: [
      'แต่งบ้าน', 'แต่งคอนโด', 'แต่งห้องนอน', 'แต่งห้องนั่งเล่น',
      'ตกแต่งภายใน', 'มินิมอล', 'aesthetic', 'minimal interior',
      'soft light', 'golden hour', 'mood ห้อง',
      'home decor', 'IKEA', 'index living',
    ],
  },
  {
    name: 'location_season',
    hint: 'พื้นที่/ฤดู',
    terms: [
      'ลพบุรี', 'สิงห์บุรี', 'อ่างทอง', 'อยุธยา',
      'หน้าร้อน', 'ฤดูร้อน', 'ฤดูฝน',
      'อากาศร้อน', 'แดดลพบุรี',
    ],
  },
  {
    name: 'service',
    hint: 'บริการ',
    terms: [
      'รับติดม่าน', 'ติดม่านราคา', 'วัดหน้างาน', 'ประเมินฟรี',
      'รับประกัน', 'ติดม่านคอนโด', 'ติดม่านบ้าน',
    ],
  },
];

export const NICHE_SEEDS: readonly string[] = NICHE_CATEGORIES.flatMap(c => c.terms);

/**
 * Find which of the supplied titles match any niche seed. Case-insensitive
 * substring match — designed for fuzzy capture of TH compound words.
 */
export function filterNicheTrends(
  titles: readonly string[],
  seeds: readonly string[] = NICHE_SEEDS,
): readonly string[] {
  const lowerSeeds = seeds.map(s => s.toLowerCase());
  return titles.filter(t => {
    const lower = t.toLowerCase();
    return lowerSeeds.some(s => lower.includes(s));
  });
}

/**
 * Build the evergreen niche context block injected into the Judge prompt.
 * Compact, category-grouped, suitable for any judge / generation call.
 */
export function buildNicheContextBlock(): string {
  const lines = NICHE_CATEGORIES.map(c => {
    const preview = c.terms.slice(0, 8).join(', ');
    const more = c.terms.length > 8 ? `, … (+${c.terms.length - 8})` : '';
    return `  • ${c.hint}: ${preview}${more}`;
  }).join('\n');

  return `\n<NICHE_CONTEXT business="curtain-shop-lopburi">
domain ของ "ม่านธารา" — คำที่ลูกค้ามักค้นหา/พูดถึง:
${lines}

โฆษณาที่ touch keyword ในกลุ่มเหล่านี้มักจับ search + audience ในหมวดได้ดีกว่า.
ใช้ block นี้เป็น domain reference, ไม่ใช่ข้อจำกัด.
</NICHE_CONTEXT>\n`;
}
