import { describe, it, expect } from "vitest";
import { refreshIsSafe } from "../../../supabase/functions/_shared/emailRefresh";
const orig = { seq_number: 1, delay: 0, subject: "Hi {{first_name}}", body: "Hello {{first_name}}, a kinder school week. Learn more https://kindnesss.com. 1207 Delaware Ave. Unsubscribe here." };
describe("light AI rewording safety", () => {
  it("accepts a light rewording that keeps tags, links, address and opt-out", () => {
    expect(refreshIsSafe(orig, { subject: "Hello {{first_name}}", body: "Hi {{first_name}}, a kinder week at school. Find out more https://kindnesss.com. 1207 Delaware Ave. Unsubscribe here." }, /1207 Delaware/i)).toBe(true);
  });
  it("rejects a version that drops the unsubscribe line or address", () => {
    expect(refreshIsSafe(orig, { subject: "Hi {{first_name}}", body: "Hello {{first_name}}, a kinder school week for all. Learn more https://kindnesss.com. Thanks a lot." }, /1207 Delaware/i)).toBe(false);
  });
  it("rejects a version that loses a merge tag", () => {
    expect(refreshIsSafe(orig, { subject: "Hi there", body: "Hello friend, a kinder school week. Learn more https://kindnesss.com. 1207 Delaware Ave. Unsubscribe here." }, /1207 Delaware/i)).toBe(false);
  });
});
