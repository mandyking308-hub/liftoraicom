import { describe, it, expect } from 'vitest';
import Papa from 'papaparse';
import { APOLLO_EXPORT_HEADERS, parseApolloIntelligenceCsv, chunkRows } from '../apolloIntelligence';

const H = [...APOLLO_EXPORT_HEADERS];
const row = (o: Record<string, string>) => H.map(h => o[h] ?? '');
const csv = (rows: string[][], header = H) => Papa.unparse([header, ...rows]);

describe('Apollo intelligence CSV (synthetic)', () => {
  it('recognises all 75 exact Apollo headers', () => {
    expect(H).toHaveLength(75);
    const p = parseApolloIntelligenceCsv(csv([row({ 'Apollo Contact Id': 'a1', Email: 'x@example.test' })]));
    expect(p.missingHeaders).toEqual([]);
    expect(p.extraHeaders).toEqual([]);
  });
  it('keeps blank-primary rows and secondary/tertiary emails losslessly', () => {
    const p = parseApolloIntelligenceCsv(csv([
      row({ 'Apollo Contact Id': 'a1', Email: 'x@example.test' }),
      row({ 'Apollo Contact Id': 'a2', 'Secondary Email': 's@example.test', 'Tertiary Email': 't@example.test', Title: '  Head ' }),
    ]));
    expect(p.blankPrimary).toBe(1);
    expect(p.withPrimary).toBe(1);
    expect(p.rows[1].raw['Secondary Email']).toBe('s@example.test');
    expect(p.rows[1].raw['Title']).toBe('  Head ');
    expect(Object.keys(p.rows[1].raw)).toHaveLength(75);
  });
  it('flags NeonCandy list membership, missing and duplicate IDs', () => {
    const p = parseApolloIntelligenceCsv(csv([
      row({ 'Apollo Contact Id': 'a1', Lists: 'Kindnesss; NeonCandy UK' }),
      row({ 'Apollo Contact Id': 'a1' }), row({}),
    ]));
    expect(p.neonCandyLists).toBe(1);
    expect(p.duplicateContactIds).toBe(1);
    expect(p.missingContactId).toBe(1);
  });
  it('rejects files without Apollo Contact Id or with ragged rows', () => {
    expect(() => parseApolloIntelligenceCsv('First Name,Email\nA,a@b.co')).toThrow(/Apollo Contact Id/);
    expect(() => parseApolloIntelligenceCsv('Apollo Contact Id,Email\na1')).toThrow();
  });
  it('splits 7,046 rows into 36 chunks of at most 200', () => {
    const c = chunkRows(Array.from({ length: 7046 }, (_, i) => i));
    expect(c).toHaveLength(36);
    expect(c.flat()).toHaveLength(7046);
    expect(Math.max(...c.map(x => x.length))).toBe(200);
  });
});
