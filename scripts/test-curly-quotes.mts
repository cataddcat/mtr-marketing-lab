import { extractJson } from '../src/lib/json-extract';
import { AdEvaluationSchema } from '../src/lib/schemas';

// The exact LLM response that broke in the field. Note line 14:
//   {"channel": "facebook_feed’, ‘score": 8}
// with U+2019 (right single curly) and U+2018 (left single curly) used
// where JSON requires straight ASCII " (U+0022).
const broken = `{
  "panel_verdict": "ตรงใจพ่อบ้าน",
  "trends_used": [],
  "structure": {
    "hook_score": 8,
    "hook_critique": "ตรงประเด็นเรื่องความร้อน",
    "body_score": 7,
    "body_critique": "ขาดรายละเอียดวัสดุ",
    "cta_score": 9,
    "cta_critique": "ชัดเจนและดึงดูด"
  },
  "channel_fit": {
    "ranked": [
      {"channel": "facebook_feed’, ‘score": 8},
      {"channel": "facebook_reels", "score": 7},
      {"channel": "tiktok", "score": 6}
    ],
    "best": "facebook_feed",
    "reasoning": "โฆษณาเน้นข้อความและภาพชัดเจน"
  },
  "personas": [
    {"id": "family_man", "scroll_stop_score": 9, "focused_score": 8, "memory_score": 7, "confidence": "high", "verdict": "ดึงดูด", "suggestion": "เพิ่มรายละเอียดวัสดุ"},
    {"id": "housewife", "scroll_stop_score": 7, "focused_score": 6, "memory_score": 5, "confidence": "med", "verdict": "ดูได้", "suggestion": "เพิ่มภาพ"},
    {"id": "price_hunter", "scroll_stop_score": 6, "focused_score": 5, "memory_score": 4, "confidence": "low", "verdict": "ไม่แน่ใจ", "suggestion": "เพิ่มราคา"}
  ],
  "average_score": 6.4
}`;

try {
  const result = extractJson(broken, {
    schema: AdEvaluationSchema,
    kind: 'object',
  });
  console.log('PASS · extracted', result.personas.length, 'personas');
  console.log('PASS · channel_fit.best =', result.channel_fit.best);
  console.log('PASS · ranked[0] =', JSON.stringify(result.channel_fit.ranked[0]));
} catch (err) {
  console.log('FAIL ·', err instanceof Error ? err.message : String(err));
  process.exit(1);
}
