export type SelfTestRecipientResult =
  | { ok: true; email: string }
  | { ok: false; status: number; code: string; error: string };

/** A mailbox test may only email the authenticated user's own address. */
export function resolveSelfTestRecipient(
  input: unknown,
  authenticatedEmail: string | null | undefined,
): SelfTestRecipientResult {
  const expected = typeof authenticatedEmail === 'string'
    ? authenticatedEmail.trim().toLowerCase()
    : '';
  if (!expected) {
    return {
      ok: false,
      status: 403,
      code: 'SELF_TEST_EMAIL_UNAVAILABLE',
      error: 'Your signed-in account has no email address for a self-test',
    };
  }
  if (typeof input !== 'string') {
    return { ok: false, status: 400, code: 'TEST_RECIPIENT_REQUIRED', error: 'Your signed-in email is required' };
  }

  const email = input.trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, status: 400, code: 'TEST_RECIPIENT_REQUIRED', error: 'Invalid signed-in email address' };
  }
  if (email !== expected) {
    return {
      ok: false,
      status: 403,
      code: 'SELF_TEST_ONLY',
      error: 'Test emails can only be sent to your own signed-in email address',
    };
  }
  return { ok: true, email };
}
