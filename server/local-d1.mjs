import { DatabaseSync } from 'node:sqlite';

/** D1-compatible adapter for local development and integration tests. */
export function createLocalD1(filename = ':memory:') {
  const database = new DatabaseSync(filename);
  database.exec('PRAGMA foreign_keys = ON');

  function metadata(changes = 0, lastRowId = 0) {
    return { duration: 0, changes: Number(changes), last_row_id: Number(lastRowId) };
  }

  function prepare(sql, parameters = []) {
    return {
      bind(...values) {
        return prepare(sql, values);
      },
      async first(column) {
        const row = database.prepare(sql).get(...parameters);
        if (!row) return null;
        return column === undefined ? { ...row } : row[column];
      },
      async all() {
        const results = database.prepare(sql).all(...parameters).map(row => ({ ...row }));
        return { success: true, results, meta: metadata() };
      },
      async run() {
        const { changes, lastInsertRowid } = database.prepare(sql).run(...parameters);
        return { success: true, results: [], meta: metadata(changes, lastInsertRowid) };
      },
      // Batch execution must be synchronous inside the transaction; public methods
      // intentionally retain D1's asynchronous interface.
      executeBatch() {
        const statement = database.prepare(sql);
        if (statement.columns().length) {
          const results = statement.all(...parameters).map(row => ({ ...row }));
          const state = database.prepare('SELECT changes() AS changes, last_insert_rowid() AS lastRowId').get();
          return { success: true, results, meta: metadata(state.changes, state.lastRowId) };
        }
        const { changes, lastInsertRowid } = statement.run(...parameters);
        return { success: true, results: [], meta: metadata(changes, lastInsertRowid) };
      },
    };
  }

  return {
    prepare,
    async batch(statements) {
      database.exec('BEGIN');
      try {
        const results = statements.map(statement => statement.executeBatch());
        database.exec('COMMIT');
        return results;
      } catch (error) {
        database.exec('ROLLBACK');
        throw error;
      }
    },
    async exec(sql) {
      database.exec(sql);
      return { count: 1, duration: 0 };
    },
    close() {
      database.close();
    },
  };
}
