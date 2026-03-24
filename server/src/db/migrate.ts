import { readFile, readdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from './pool.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function runMigrations(): Promise<void> {
  const dbDir = join(__dirname, '../../db');
  const names = (await readdir(dbDir)).filter((f) => f.endsWith('.sql')).sort();
  if (names.length === 0) {
    console.log('No SQL migrations found.');
    return;
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const name of names) {
      const sql = await readFile(join(dbDir, name), 'utf-8');
      await client.query(sql);
      console.log(`Migration applied: ${name}`);
    }
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}
