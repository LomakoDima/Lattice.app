import { runMigrations } from './migrate.js';
import { pool } from './pool.js';

runMigrations()
  .then(() => pool.end())
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
