import * as v from 'valibot';

export const BrandFactSchema = v.object({
  id: v.pipe(v.string(), v.minLength(1)),
  label: v.pipe(v.string(), v.minLength(1), v.maxLength(60)),
  value: v.pipe(v.string(), v.maxLength(400)),
  enabled: v.boolean(),
  isDefault: v.boolean(),
});

export const BrandFactsSchema = v.array(BrandFactSchema);

export type BrandFact = v.InferOutput<typeof BrandFactSchema>;

export const DEFAULT_BRAND_FACTS: readonly BrandFact[] = [
  {
    id: 'warranty',
    label: 'การรับประกัน',
    value: '3 ปี (วัสดุ) + 1 ปี (งานติดตั้ง)',
    enabled: true,
    isDefault: true,
  },
  {
    id: 'service_area',
    label: 'พื้นที่บริการ',
    value: 'ลพบุรี · สิงห์บุรี · อ่างทอง · อยุธยา (รัศมี ~80 กม.)',
    enabled: true,
    isDefault: true,
  },
  {
    id: 'price_start',
    label: 'ราคาเริ่มต้น',
    value: 'เริ่มต้น ฿1,200/ตรม. (สอบถามหน้างานฟรี)',
    enabled: true,
    isDefault: true,
  },
  {
    id: 'free_quote',
    label: 'การประเมินหน้างาน',
    value: 'นัดประเมินฟรี ไม่บังคับซื้อ',
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
    value: '086-XXX-XXXX',
    enabled: false,
    isDefault: true,
  },
  {
    id: 'hours',
    label: 'เวลาทำการ',
    value: '09:00-21:00 ทุกวัน',
    enabled: true,
    isDefault: true,
  },
  {
    id: 'material',
    label: 'จุดเด่นวัสดุ',
    value: 'ผ้านำเข้า ทนแดดลพบุรี 8-10 ปี',
    enabled: true,
    isDefault: true,
  },
  {
    id: 'install_team',
    label: 'ทีมติดตั้ง',
    value: 'ช่างประจำของร้าน (ไม่ใช้ subcontract)',
    enabled: true,
    isDefault: true,
  },
  {
    id: 'payment',
    label: 'การชำระเงิน',
    value: 'เงินสด · โอน · บัตรเครดิต · ผ่อน 0% 3 เดือน',
    enabled: true,
    isDefault: true,
  },
];

export const formatBrandFactsForPrompt = (
  facts: readonly BrandFact[],
): string => {
  const active = facts.filter(f => f.enabled && f.value.trim().length > 0);
  if (active.length === 0) return '';
  return `\n<BRAND_FACTS>
ข้อเท็จจริงเฉพาะของร้าน (ใช้อ้างอิงในโฆษณาเมื่อเหมาะสม ห้ามแต่งตัวเลข/รายละเอียดเพิ่ม):
${active.map(f => `• ${f.label}: ${f.value}`).join('\n')}
</BRAND_FACTS>\n`;
};

export const hashBrandFacts = (facts: readonly BrandFact[]): string =>
  facts
    .filter(f => f.enabled)
    .map(f => `${f.id}=${f.value}`)
    .join('|');

/**
 * Detects if a value looks like an unfilled placeholder (e.g. "086-XXX-XXXX",
 * "???"). Used to warn users before they generate ads with bogus data.
 */
const PLACEHOLDER_RE = /X{2,}|\?{2,}|<[^>]+>/i;

export const looksLikePlaceholder = (value: string): boolean =>
  PLACEHOLDER_RE.test(value);

export const findPlaceholderFacts = (
  facts: readonly BrandFact[],
): readonly BrandFact[] =>
  facts.filter(f => f.enabled && looksLikePlaceholder(f.value));
