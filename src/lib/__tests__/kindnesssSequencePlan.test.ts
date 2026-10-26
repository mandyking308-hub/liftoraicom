import { describe, it, expect } from 'vitest';
import { KINDNESSS_STEP_DAYS, stepDelays, validateSequence } from '../kindnesss/sequencePlan';

const body = (t: string) => `Hi ${t} %signature% %unsubscribe-text%`;
const good = [
  { step: 1, subject: 'Intro', body: body('intro'), wait_days: 0 },
  { step: 2, subject: '', body: body('differentiation'), wait_days: 7 },
  { step: 3, subject: '', body: body('reporting'), wait_days: 7 },
  { step: 4, subject: '', body: body('pilot'), wait_days: 7 },
  { step: 5, subject: '', body: body('this is my final note'), wait_days: 7 },
];

describe('Kindnesss five-touch plan', () => {
  it('is five touches on days 0, 7, 14, 21, 28', () => {
    expect([...KINDNESSS_STEP_DAYS]).toEqual([0, 7, 14, 21, 28]);
    expect(stepDelays()).toEqual([0, 7, 7, 7, 7]);
  });
  it('accepts a valid five-step sequence', () => expect(validateSequence(good)).toEqual({ ok: true, problems: [] }));
  it('rejects the old four-step sequence', () => expect(validateSequence(good.slice(0, 4)).problems).toContain('expected_5_steps_got_4'));
  it('rejects closing language before the final step', () => {
    const bad = good.map((s, i) => (i === 3 ? { ...s, body: body("One last thought. I won't keep following up") } : s));
    expect(validateSequence(bad).problems).toContain('step_4_has_closing_language');
  });
  it('requires the final step to be a clear close', () => {
    const bad = good.map((s, i) => (i === 4 ? { ...s, body: body('more info') } : s));
    expect(validateSequence(bad).problems).toContain('final_step_not_a_clear_close');
  });
});
