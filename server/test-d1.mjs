import { createLocalD1 } from './local-d1.mjs';

/** Execute the worker's actual SQL against an isolated SQLite database. */
export function createTestD1(schema = '') {
  const database = createLocalD1();
  if (schema) database.exec(schema);
  return database;
}
