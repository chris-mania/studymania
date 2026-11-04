// Sets up / upgrades the database automatically the first time the app runs,
// so nobody has to run database commands by hand. Safe to run again and again.
const VERSION = 7;
const SCHEMA = [
 "CREATE TABLE IF NOT EXISTS users (\n  id TEXT PRIMARY KEY,\n  email TEXT NOT NULL UNIQUE,\n  username TEXT,                         \n  name TEXT,\n  pass_hash TEXT NOT NULL,\n  salt TEXT NOT NULL,\n  tz TEXT DEFAULT 'America/New_York',\n  remind_hour INTEGER DEFAULT 18,\n  daily_goal INTEGER DEFAULT 2,          \n  xp INTEGER DEFAULT 0,\n  streak INTEGER DEFAULT 0,\n  best_streak INTEGER DEFAULT 0,\n  last_study_day TEXT,                   \n  freezes INTEGER DEFAULT 0,             \n  lb_hidden INTEGER DEFAULT 0,           \n  last_nudge_day TEXT,\n  nudges_today INTEGER DEFAULT 0,                   \n  \n  sec_q1 TEXT, sec_a1 TEXT, sec_q2 TEXT, sec_a2 TEXT, sec_salt TEXT,\n  recover_fails INTEGER DEFAULT 0,\n  recover_lock_until INTEGER DEFAULT 0,\n  \n  reset_hash TEXT, reset_expires INTEGER DEFAULT 0,\n  created_at TEXT DEFAULT (datetime('now'))\n)",
 "CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username)",
 "CREATE TABLE IF NOT EXISTS sessions (\n  token_hash TEXT PRIMARY KEY,\n  user_id TEXT NOT NULL,\n  expires_at INTEGER NOT NULL\n)",
 "CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id)",
 "CREATE TABLE IF NOT EXISTS courses (\n  id TEXT PRIMARY KEY,\n  user_id TEXT NOT NULL,\n  name TEXT NOT NULL,\n  exam_date TEXT,                        \n  review_days INTEGER DEFAULT 3,         \n  finish_by TEXT,                        \n  as_you_go INTEGER DEFAULT 0,           \n  keep_up_days INTEGER DEFAULT 3,        \n  color INTEGER DEFAULT 0,\n  created_at TEXT DEFAULT (datetime('now'))\n)",
 "CREATE INDEX IF NOT EXISTS idx_courses_user ON courses(user_id)",
 "CREATE TABLE IF NOT EXISTS cards (\n  id TEXT PRIMARY KEY,\n  course_id TEXT NOT NULL,\n  user_id TEXT NOT NULL,\n  ord INTEGER NOT NULL,\n  added_day TEXT,                        \n  topic TEXT,\n  term TEXT NOT NULL,\n  full TEXT,\n  definition TEXT,                       \n  simple TEXT,                           \n  hook TEXT,\n  example TEXT,\n  answer TEXT,                           \n  traps TEXT,                            \n  confuse TEXT,\n  related TEXT,                          \n  formula TEXT,\n  question TEXT,\n  parts TEXT                             \n)",
 "CREATE INDEX IF NOT EXISTS idx_cards_course ON cards(course_id, ord)",
 "CREATE INDEX IF NOT EXISTS idx_cards_user ON cards(user_id)",
 "CREATE TABLE IF NOT EXISTS questions (\n  id TEXT PRIMARY KEY,\n  course_id TEXT NOT NULL,\n  user_id TEXT NOT NULL,\n  ord INTEGER NOT NULL,\n  added_day TEXT,\n  topic TEXT,\n  q TEXT NOT NULL,\n  choices TEXT NOT NULL,                 \n  answer INTEGER NOT NULL,               \n  why TEXT\n)",
 "CREATE INDEX IF NOT EXISTS idx_questions_course ON questions(course_id, ord)",
 "CREATE TABLE IF NOT EXISTS progress (\n  card_id TEXT PRIMARY KEY,\n  user_id TEXT NOT NULL,\n  course_id TEXT NOT NULL,\n  box INTEGER DEFAULT 0,                 \n  due TEXT,                              \n  learned_at TEXT,                       \n  right_count INTEGER DEFAULT 0,\n  wrong_count INTEGER DEFAULT 0\n)",
 "CREATE INDEX IF NOT EXISTS idx_progress_user ON progress(user_id, course_id)",
 "CREATE TABLE IF NOT EXISTS exams (\n  id TEXT PRIMARY KEY,\n  user_id TEXT NOT NULL,\n  course_id TEXT NOT NULL,\n  day TEXT NOT NULL,\n  score INTEGER NOT NULL,\n  total INTEGER NOT NULL\n)",
 "CREATE INDEX IF NOT EXISTS idx_exams_course ON exams(course_id, day)",
 "CREATE TABLE IF NOT EXISTS days (\n  user_id TEXT NOT NULL,\n  day TEXT NOT NULL,\n  xp INTEGER DEFAULT 0,\n  rounds INTEGER DEFAULT 0,\n  PRIMARY KEY (user_id, day)\n)",
 "CREATE INDEX IF NOT EXISTS idx_days_day ON days(day)",
 "CREATE TABLE IF NOT EXISTS push_subs (\n  endpoint TEXT PRIMARY KEY,\n  user_id TEXT NOT NULL,\n  p256dh TEXT,\n  auth TEXT,\n  created_at TEXT DEFAULT (datetime('now'))\n)",
 "CREATE INDEX IF NOT EXISTS idx_push_user ON push_subs(user_id)"
];
// Columns added after the first release. Each one is skipped if it already exists.
const UPGRADES = [
 "ALTER TABLE users ADD COLUMN username TEXT",
 "ALTER TABLE users ADD COLUMN freezes INTEGER DEFAULT 0",
 "ALTER TABLE users ADD COLUMN lb_hidden INTEGER DEFAULT 0",
 "ALTER TABLE users ADD COLUMN last_nudge_day TEXT",
 "ALTER TABLE users ADD COLUMN nudges_today INTEGER DEFAULT 0",
 "ALTER TABLE days ADD COLUMN lessons INTEGER DEFAULT 0",
 "ALTER TABLE days ADD COLUMN reviews INTEGER DEFAULT 0",
 "ALTER TABLE courses ADD COLUMN more_total INTEGER",
 "ALTER TABLE courses ADD COLUMN more_have INTEGER",
 "ALTER TABLE courses ADD COLUMN more_every TEXT",
 "ALTER TABLE courses ADD COLUMN more_share REAL",
 "ALTER TABLE courses ADD COLUMN notes_done INTEGER DEFAULT 0",
 "CREATE TABLE IF NOT EXISTS study_rounds (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, day TEXT NOT NULL)",
 "ALTER TABLE cards ADD COLUMN parts TEXT",
 "CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username)",
 "CREATE INDEX IF NOT EXISTS idx_days_day ON days(day)"
];

let ready = null;
export function ensureDb(env) {
  return (ready ||= (async () => {
    await env.DB.prepare("CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY, v TEXT)").run();
    const row = await env.DB.prepare("SELECT v FROM meta WHERE k = 'version'").first();
    if (row && +row.v >= VERSION) return;
    const run = async (sql) => { try { await env.DB.prepare(sql).run(); return true; } catch (e) { return false; } };
    // Tables first (new ones get created, existing ones are left alone), then the newer
    // columns, then everything once more so indexes on the new columns get made.
    for (const sql of SCHEMA) await run(sql);
    for (const sql of UPGRADES) await run(sql);
    const failed = [];
    for (const sql of SCHEMA) if (!(await run(sql))) failed.push(sql.slice(0, 60));
    if (failed.length) throw new Error("Database setup failed: " + failed.join(" | "));
    await env.DB.prepare("INSERT INTO meta (k, v) VALUES ('version', ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v").bind(String(VERSION)).run();
  })().catch((e) => { ready = null; throw e; }));
}
