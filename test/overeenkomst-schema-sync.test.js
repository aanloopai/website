// Guard: the lazy runtime schema must stay identical to the migration.
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { SCHEMA_STATEMENTS, SCHEMA_ALTERS } from '../src/lib/overeenkomst-schema.js';

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

  it('every ALTER in migrations 0026+ is in SCHEMA_ALTERS (and vice versa)', () => {
    const files = readdirSync(new URL('../migrations/', import.meta.url))
      .filter((f) => /^\d{4}_/.test(f) && Number(f.slice(0, 4)) >= 26);
    const alters = files.flatMap((f) => readFileSync(new URL(`../migrations/${f}`, import.meta.url), 'utf8')
      .replace(/--[^\n]*/g, '').split(';').map(norm).filter((q) => /^ALTER TABLE/i.test(q)));
    expect(alters.length).toBeGreaterThan(0);
    for (const q of alters) expect(SCHEMA_ALTERS.map(norm), q).toContain(q);
    for (const q of SCHEMA_ALTERS.map(norm)) expect(alters, q).toContain(q);
  });
});
