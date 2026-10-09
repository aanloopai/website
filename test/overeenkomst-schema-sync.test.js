// Guard: the lazy runtime schema must stay identical to the migration.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { SCHEMA_STATEMENTS } from '../src/lib/overeenkomst-schema.js';

const norm = (sql) => sql.replace(/\s+/g, ' ').trim();

const migration = readFileSync(new URL('../migrations/0024_overeenkomsten.sql', import.meta.url), 'utf8')
  .replace(/--[^\n]*/g, '');
const fromMigration = migration.split(';').map(norm).filter((s) => /^CREATE (TABLE|INDEX)/i.test(s));
const fromRuntime = SCHEMA_STATEMENTS.map(norm).filter((s) => /^CREATE (TABLE|INDEX)/i.test(s));

describe('overeenkomst schema sync', () => {
  it('migration has statements to compare', () => {
    expect(fromMigration.length).toBeGreaterThan(10);
  });
  it('every migration CREATE statement is in SCHEMA_STATEMENTS', () => {
    for (const s of fromMigration) expect(fromRuntime, s.slice(0, 70)).toContain(s);
  });
  it('every SCHEMA_STATEMENTS CREATE statement is in the migration', () => {
    for (const s of fromRuntime) expect(fromMigration, s.slice(0, 70)).toContain(s);
  });
});
