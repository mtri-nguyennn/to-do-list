PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS courses (
 id TEXT PRIMARY KEY,
 name TEXT NOT NULL CHECK(length(name) BETWEEN 1 AND 80),
 description TEXT NOT NULL DEFAULT '',
 color TEXT NOT NULL DEFAULT 'blue',
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE IF NOT EXISTS tasks (
 id TEXT PRIMARY KEY,
 course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
 title TEXT NOT NULL CHECK(length(title) BETWEEN 1 AND 300),
 done INTEGER NOT NULL DEFAULT 0 CHECK(done IN (0,1)),
 due_date TEXT,
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_tasks_course_id ON tasks(course_id);
