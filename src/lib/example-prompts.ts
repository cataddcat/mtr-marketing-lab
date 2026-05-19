/**
 * Ready-to-use mockup examples for the marketing-lab Generator panel.
 * Curated for ม่านธารา (curtain shop, Lopburi). Reusable across input fields
 * and a future "shuffle / inspire me" affordance.
 *
 * The first entry of each list mirrors the bundled demo data (DEMO_BRIEF
 * + DEMO_SAVED_ADS in src/lib/demo-data.ts) so "load demo → click example"
 * fills every panel with a coherent campaign end-to-end.
 */

export const PRODUCT_EXAMPLES: readonly string[] = [
  // ── Demo canonical product (matches DEMO_BRIEF.product_summary) ──
  'ม่านลอนเทปผ้า Blackout เกรดโรงแรม (hotel grade) กันแสง 99% กันร้อน 4-6°C',
  // ── Variations users can try ──
  'ม่านม้วน (Roller Blind) ระบายแสง',
  'ม่านพับ (Roman Shade) ผ้าลินิน',
  'ม่านปรับแสง (Zebra Blind)',
  'ม่านลูกฟูก (Honeycomb Shade) กันความร้อน',
  'ม่านลายไม้เลื่อน (Vertical Blind)',
  'ผ้าม่าน 2 ชั้น (Sheer + Blackout)',
  'ม่านอัตโนมัติพร้อมรีโมท (Smart Curtain)',
  'มู่ลี่ไม้แท้ / PVC สำหรับห้องน้ำ',
  'บริการซัก-รีดผ้าม่าน + ติดตั้งซ้ำ ฟรี',
];

export const COMPETITOR_EXAMPLES: readonly string[] = [
  // ── Demo canonical competitor #1 — "ร้านม่าน A (ลพบุรี)" cheap-segment local rival ──
  `🔥 ลด 50% ทั้งร้าน! ม่านทุกแบบ ทุกสไตล์
ฟรีติดตั้ง · ฟรีวัดหน้างาน · ไม่มีค่าบริการ
รับงานทั่วลพบุรี-สระบุรี-สิงห์บุรี
ราคาถูกที่สุดในจังหวัด รับประกัน!!!
ทักไลน์ @maan-cheap ทันที จำกัด 20 คนแรก`,

  // ── Demo canonical competitor #2 — "แบรนด์ B (กรุงเทพ)" premium nationwide ──
  `ม่านระดับโรงแรม 5 ดาว · นำเข้ายุโรป
สำหรับบ้านพรีเมียม คอนโดหรู สปา
ราคาเริ่ม ฿3,500/ตรม. · รับประกัน 5 ปีเต็ม
ออกแบบโดยทีมดีไซเนอร์อิตาเลียน
ส่งทั่วประเทศ · โชว์รูม Sukhumvit 39
นัดประเมิน 02-XXX-XXXX`,

  // ── Other variations for testing ──
  `ม่านอัตโนมัติ Smart Home สั่งงานผ่านมือถือ
เชื่อมต่อ Alexa / Google Home
ไฮเทคที่สุดในไทย ลดสูงสุด 40%
รับติดทั่วประเทศ`,

  `✨ ติดม่านด่วน 24 ชม. ทั่วกรุงเทพ-ปริมณฑล ✨
รับประกันงาน 5 ปีเต็ม ผ้านำเข้าเกาหลี
ลด 50% สมาชิกใหม่!!!`,

  `ม่านหลุยส์ Vintage Glamour สไตล์ยุโรป
สำหรับบ้านหรู โรงแรม สปา
ออกแบบฟรี · ติดตั้งโดยช่างอิตาเลียน`,
];

export const PROMO_EXAMPLES: readonly string[] = [
  // ── Demo canonical promo (matches DEMO_BRIEF.promo_summary + campaign.offer_structure) ──
  'ประเมินหน้างานฟรี + ผ่อน 0% 3 เดือน · ลพบุรี-สิงห์บุรี-อ่างทอง · ภายใน 31 พ.ค.',
  // ── Variations users can try ──
  'ประเมินหน้างานฟรี ท่าศาลา-ลพบุรี (รัศมี 80 กม.)',
  'ลด 15% เฉพาะเดือนนี้ + แถมรางทอง',
  'ผ่อน 0% นาน 3 เดือน ทุกบัตรเครดิต',
  'ติดตั้งภายใน 7 วัน หลังวัดหน้างาน',
  'รับประกันงาน 1 ปี + วัสดุ 3 ปี เปลี่ยนใหม่ทั้งชิ้น',
  'ผ้านำเข้า ทนแดดลพบุรี 8-10 ปี ไม่ซีด ไม่ขาด',
  'ซื้อ 2 ห้องลด 10% · ซื้อ 3 ห้องลด 15%',
  'ฟรีค่าจัดส่ง + ติดตั้ง ในรัศมี 50 กม.',
  'ผ้าตัวอย่าง 200+ ลาย เลือกถึงหน้าบ้าน',
  'บริการเปลี่ยนผ้าม่านเก่า ให้ใหม่ทั้งห้อง (re-cover)',
];
