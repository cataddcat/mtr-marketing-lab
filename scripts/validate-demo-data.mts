import * as v from 'valibot';
import { CommunitySimSchema, AdEvaluationSchema } from '../src/lib/schemas';
import { BrandFactsSchema } from '../src/lib/brand-facts';
import { DEMO_DATA } from '../src/lib/demo-data';

type Check = readonly [name: string, schema: v.GenericSchema, data: unknown];

const checks: Check[] = [
  ['communitySim adA', CommunitySimSchema, DEMO_DATA.communitySim.adA],
  ['communitySim adB', CommunitySimSchema, DEMO_DATA.communitySim.adB],
  ['brandFacts', BrandFactsSchema, DEMO_DATA.brandFacts],
];

DEMO_DATA.savedAds.forEach((ad, i) => {
  if (ad.evaluation) {
    checks.push([`savedAd[${i}].evaluation`, AdEvaluationSchema, ad.evaluation]);
  }
});

let pass = 0;
let fail = 0;
for (const [name, schema, data] of checks) {
  const r = v.safeParse(schema, data);
  if (r.success) {
    console.log('PASS', name);
    pass++;
  } else {
    console.log('FAIL', name);
    r.issues.slice(0, 5).forEach(i =>
      console.log(
        '  ->',
        i.message,
        'at',
        (i.path ?? []).map(p => String((p as { key?: unknown }).key ?? '')).join('.'),
      ),
    );
    fail++;
  }
}

console.log(`\n${pass} pass, ${fail} fail`);
process.exit(fail > 0 ? 1 : 0);
