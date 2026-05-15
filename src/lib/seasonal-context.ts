/**
 * Builds a one-line temporal/seasonal context for Lopburi, Thailand,
 * injected into both generation and judge prompts so the LLM can reason
 * about season, weather, school calendar, and major festivals.
 */

const THAI_MONTHS: readonly string[] = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];

const THAI_DAYS: readonly string[] = [
  'อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์',
];

const seasonOf = (month: number): string => {
  if (month >= 3 && month <= 5) return 'ฤดูร้อน';
  if (month >= 6 && month <= 10) return 'ฤดูฝน';
  return 'ฤดูหนาว';
};

const lopburiHintOf = (month: number): string => {
  if (month >= 3 && month <= 5) {
    return 'ลพบุรีร้อนจัด เฉลี่ย 36-39°C แสงแดดแรงผ่านหน้าต่าง — ลูกค้ามองหา blackout/กันความร้อน';
  }
  if (month >= 6 && month <= 10) {
    return 'ลพบุรีฝนตกบ่อย ความชื้นสูง — ระวังคำพูดเรื่องการติดตั้งกลางแจ้ง';
  }
  return 'ลพบุรีอากาศเย็น/แห้ง แดดเช้าสบาย — ลูกค้าเน้น decor + รับแขกช่วงปลายปี';
};

const calendarHintOf = (month: number, day: number): string | null => {
  if (month === 4 && day >= 10 && day <= 17) return 'ช่วงสงกรานต์ (วันหยุดยาว ลูกค้าอยู่บ้านนาน)';
  if (month === 5 && day >= 10 && day <= 25) return 'ใกล้เปิดเทอม (พ่อแม่ปรับปรุงห้องนอน/ห้องเรียนเด็ก)';
  if (month === 10 || (month === 11 && day <= 15)) return 'ช่วงสอบ + ลอยกระทง (ห้องเด็กต้องการสมาธิ + decor festival)';
  if (month === 12) return 'ช่วงปีใหม่ (รับแขก ตกแต่งบ้าน เปิด AC บ่อย)';
  if (month === 2 || (month === 3 && day <= 10)) return 'ปิดเทอมยาว + ตรุษจีน (ทำความสะอาดบ้าน เปลี่ยนของ)';
  if (month === 7) return 'ช่วงเข้าพรรษา (ลูกค้าลงทุนปรับปรุงบ้าน)';
  return null;
};

export const getSeasonalContext = (now: Date = new Date()): string => {
  const day = now.getDate();
  const monthIdx = now.getMonth();
  const month = monthIdx + 1;
  const year = now.getFullYear() + 543; // พ.ศ.
  const dayName = THAI_DAYS[now.getDay()];
  const monthName = THAI_MONTHS[monthIdx];

  const dateStr = `วัน${dayName}ที่ ${day} ${monthName} ${year}`;
  const season = seasonOf(month);
  const hint = lopburiHintOf(month);
  const calendar = calendarHintOf(month, day);

  return calendar
    ? `${dateStr} — ${season} · ${hint} · ${calendar}`
    : `${dateStr} — ${season} · ${hint}`;
};

export const buildTimeContextBlock = (now?: Date): string =>
  `\n<TIME_CONTEXT>\n${getSeasonalContext(now)}\n</TIME_CONTEXT>\n`;
