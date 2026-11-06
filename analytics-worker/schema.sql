CREATE TABLE IF NOT EXISTS students (
  student_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  cohort TEXT NOT NULL,
  first_seen INTEGER NOT NULL,
  last_seen INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS roster (
  student_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  cohort TEXT NOT NULL,
  imported_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS roster_cohort_idx ON roster(cohort);
CREATE TABLE IF NOT EXISTS teacher_accounts (
  employee_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS teacher_sessions (
  id TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL REFERENCES teacher_accounts(employee_id),
  token_hash TEXT NOT NULL,
  started_at INTEGER NOT NULL,
  last_seen INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS teacher_sessions_employee_idx ON teacher_sessions(employee_id);
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES students(student_id),
  token_hash TEXT NOT NULL,
  started_at INTEGER NOT NULL,
  last_seen INTEGER NOT NULL,
  active_seconds INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS sessions_student_idx ON sessions(student_id);
CREATE TABLE IF NOT EXISTS page_activity (
  session_id TEXT NOT NULL REFERENCES sessions(id),
  page TEXT NOT NULL,
  first_seen INTEGER NOT NULL,
  last_seen INTEGER NOT NULL,
  active_seconds INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY(session_id,page)
);
CREATE TABLE IF NOT EXISTS submissions (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES students(student_id),
  page TEXT NOT NULL,
  object_key TEXT NOT NULL,
  result_json TEXT NOT NULL,
  submitted_at INTEGER NOT NULL,
  viewed_at INTEGER
);
CREATE INDEX IF NOT EXISTS submissions_student_page_idx ON submissions(student_id,page,submitted_at DESC);
CREATE INDEX IF NOT EXISTS submissions_time_idx ON submissions(submitted_at);
