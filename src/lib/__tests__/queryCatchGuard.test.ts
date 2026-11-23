import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

/**
 * Guard: the installed database client (postgrest-js v2) makes queries thenable
 * but no longer exposes `.catch()` / `.finally()` on the query builder.
 * Chaining `.catch()` directly onto a query therefore throws at runtime and the
 * page silently shows zeros (or blanks). Wrap in `Promise.resolve(...)` instead.
 */
const BUILD = /\b(supabase|\.from\(|\.rpc\(|\.select\(|\.insert\(|\.update\(|\.delete\(|\.upsert\(|\.eq\(|\.gte\(|\.order\(|\.limit\(|\.single\(|\.maybeSingle\()/;
const SAFE = /(Promise\.resolve|await |async |invoke\(|\}\)\(|\)\(\)|\.then\(|fetch\(|\.json\()/;

function sources(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) sources(p, acc);
    else if (/\.(ts|tsx)$/.test(entry)) acc.push(p);
  }
  return acc;
}

describe("database queries are never chained with .catch() directly", () => {
  it("no source file chains .catch() onto a query builder", () => {
    const offenders: string[] = [];
    for (const file of sources("src")) {
      const lines = readFileSync(file, "utf8").split("\n");
      lines.forEach((line, i) => {
        if (!line.includes(".catch(")) return;
        const ctx = lines.slice(Math.max(0, i - 14), i + 1).join("\n");
        if (BUILD.test(ctx) && !SAFE.test(ctx)) offenders.push(`${file}:${i + 1}`);
      });
    }
    expect(offenders).toEqual([]);
  });

  it("the client really does lack .catch on the query builder (assumption check)", async () => {
    const { PostgrestBuilder } = await import("@supabase/postgrest-js");
    expect(typeof (PostgrestBuilder.prototype as any).then).toBe("function");
    expect(typeof (PostgrestBuilder.prototype as any).catch).toBe("undefined");
  });
});
