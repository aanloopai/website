// Task 12 (Plak C, onboarding): statische assertie op migrations/0017_onboarding.sql.
// Draait geen SQL — de migratie zelf blijft ongetest-in-D1 tot M-goedkeuring
// (Task 14). Dit test alleen dat het bestand de juiste tabel/kolommen bevat.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationPath = path.join(__dirname, '../migrations/0017_onboarding.sql');

describe('migrations/0017_onboarding.sql — onboarding_nudges', () => {
  it('bestaat en bevat CREATE TABLE IF NOT EXISTS onboarding_nudges', () => {
    const sql = readFileSync(migrationPath, 'utf-8');
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS onboarding_nudges/);
  });

  it('bevat alle vijf kolommen met de juiste namen', () => {
    const sql = readFileSync(migrationPath, 'utf-8');
    expect(sql).toMatch(/order_id\s+TEXT PRIMARY KEY/);
    expect(sql).toMatch(/customer_id\s+TEXT NOT NULL/);
    expect(sql).toMatch(/aantal\s+INTEGER NOT NULL DEFAULT 0/);
    expect(sql).toMatch(/laatst_genudged\s+INTEGER/);
    expect(sql).toMatch(/created_at\s+INTEGER NOT NULL/);
  });

  it('order_id is PRIMARY KEY en refereert service_orders', () => {
    const sql = readFileSync(migrationPath, 'utf-8');
    expect(sql).toMatch(/order_id\s+TEXT PRIMARY KEY REFERENCES service_orders\(id\)/);
  });
});
