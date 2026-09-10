let pool;
let initialized;
async function postgres(sql, params) {
  if (!pool) {
    const { default: pg } = await import('pg');
    pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 3, idleTimeoutMillis: 10000, connectionTimeoutMillis: 10000 });
    pool.on('error', error => console.error('Idle database connection error:', error.message));
  }
  if (!initialized) {
    initialized = pool.query(`CREATE TABLE IF NOT EXISTS courses (
      id TEXT PRIMARY KEY, name TEXT NOT NULL CHECK(length(name) BETWEEN 1 AND 80),
      description TEXT NOT NULL DEFAULT '', color TEXT NOT NULL DEFAULT 'blue',
      created_at TEXT NOT NULL DEFAULT (to_char(current_timestamp AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))
    ); CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY, course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      title TEXT NOT NULL CHECK(length(title) BETWEEN 1 AND 300), done INTEGER NOT NULL DEFAULT 0 CHECK(done IN (0,1)),
      due_date TEXT, created_at TEXT NOT NULL DEFAULT (to_char(current_timestamp AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))
    ); CREATE INDEX IF NOT EXISTS idx_tasks_course_id ON tasks(course_id);`).catch(error => { initialized = undefined; throw error; });
  }
  await initialized;
  let index = 0;
  return (await pool.query(sql.replace(/\?/g, () => '$' + (++index)), params)).rows;
}
export async function query(sql, params = []) {
  if (process.env.DATABASE_URL) return postgres(sql, params);
  if (process.env.LOCAL_DATABASE === '1' && !process.env.VERCEL && !process.env.RENDER && process.env.NODE_ENV !== 'production') {
    const { DatabaseSync } = await import('node:sqlite');
    const { mkdirSync } = await import('node:fs');
    mkdirSync('.data', { recursive: true });
    const db = new DatabaseSync(process.env.TEST_DB || '.data/coursework.sqlite');
    try { db.exec('PRAGMA foreign_keys = ON'); return db.prepare(sql).all(...params); }
    finally { db.close(); }
  }
  const { CLOUDFLARE_ACCOUNT_ID: account, CLOUDFLARE_DATABASE_ID: database, CLOUDFLARE_API_TOKEN: token } = process.env;
  if (!account || !database || !token) throw new Error('Database is not configured');
  const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(account)}/d1/database/${encodeURIComponent(database)}/query`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ sql, params }), signal: AbortSignal.timeout(20000)
  });
  const data = await response.json();
  if (!response.ok || !data.success || !data.result?.[0]?.success) throw new Error('Database request failed');
  return data.result[0].results;
}
