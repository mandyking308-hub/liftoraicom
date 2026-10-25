import { describe, expect, it } from 'vitest';
import { parseApolloRetentionCsv, retentionCsv } from '../apolloRetention';
describe('Apollo retention CSV', () => {
  it('retains supplied identifiers and work email status', () => {
    expect(parseApolloRetentionCsv('Apollo Person_ID,First Name,Email,Email Status\np1,Test,test@example.org,verified')[0]).toMatchObject({ apollo_person_id: 'p1', email: 'test@example.org', email_status: 'verified', enriched_at: '' });
  });
  it('never matches first name alone', () => expect(() => parseApolloRetentionCsv('First Name\nTest')).toThrow('person ID'));
  it('rejects missing IDs atomically', () => expect(() => parseApolloRetentionCsv('apollo_person_id,email\n,test@example.org')).toThrow('person ID'));
  it('rejects duplicate Apollo IDs', () => expect(() => parseApolloRetentionCsv('apollo_person_id\np1\np1')).toThrow('Duplicate'));
  it('does not fabricate missing emails or enrichment time', () => expect(parseApolloRetentionCsv('apollo_person_id\np1')[0]).toMatchObject({ email: '', enriched_at: '' }));
  it('rejects malformed emails', () => expect(() => parseApolloRetentionCsv('apollo_person_id,email\np1,invalid')).toThrow('Invalid email'));
  it('escapes spreadsheet formulas and quotes while retaining multiline values', () => {
    expect(retentionCsv([{ id: '=CMD()', title: 'a\nb', company: '"name"', email: 'test@example.org' }])).toContain('"\'=CMD()"');
    expect(retentionCsv([{ title: 'a\nb' }])).toContain('"a\nb"');
  });
});