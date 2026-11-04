-- Study Mania database (Cloudflare D1 / SQLite)

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  username TEXT,                         -- lowercase, shown on the leaderboard; sign in with it or the email
  name TEXT,
  pass_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  tz TEXT DEFAULT 'America/New_York',
  remind_hour INTEGER DEFAULT 18,
  daily_goal INTEGER DEFAULT 2,          -- rounds per day for the daily ring
  xp INTEGER DEFAULT 0,
  streak INTEGER DEFAULT 0,
  best_streak INTEGER DEFAULT 0,
  last_study_day TEXT,                   -- YYYY-MM-DD in the user's own time zone
  freezes INTEGER DEFAULT 0,             -- streak freezes (earn 1 per 7-day streak, hold up to 2)
  lb_hidden INTEGER DEFAULT 0,           -- 1 = hide me from the leaderboard
  last_nudge_day TEXT,                   -- day the last reminder went out
  nudges_today INTEGER DEFAULT 0,        -- reminders sent that day (max 2)
  -- password recovery: security questions (answers stored hashed)
  sec_q1 TEXT, sec_a1 TEXT, sec_q2 TEXT, sec_a2 TEXT, sec_salt TEXT,
  recover_fails INTEGER DEFAULT 0,
  recover_lock_until INTEGER DEFAULT 0,
  -- password recovery: email link
  reset_hash TEXT, reset_expires INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

CREATE TABLE IF NOT EXISTS courses (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  exam_date TEXT,                        -- YYYY-MM-DD, optional
  review_days INTEGER DEFAULT 3,         -- stop new lessons this many days before the exam
  finish_by TEXT,                        -- used when there's no exam date: "finish in N days"
  as_you_go INTEGER DEFAULT 0,           -- 1 = notes get added chapter by chapter
  keep_up_days INTEGER DEFAULT 3,        -- learn each new batch within this many days
  color INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_courses_user ON courses(user_id);

CREATE TABLE IF NOT EXISTS cards (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  ord INTEGER NOT NULL,
  added_day TEXT,                        -- which batch of notes it came from
  topic TEXT,
  term TEXT NOT NULL,
  full TEXT,
  definition TEXT,                       -- textbook-style definition
  simple TEXT,                           -- plain words
  hook TEXT,
  example TEXT,
  answer TEXT,                           -- reworded correct answer for quizzes
  traps TEXT,                            -- JSON array of 3 near-miss wrong answers
  confuse TEXT,
  related TEXT,                          -- JSON array
  formula TEXT,
  question TEXT,
  parts TEXT                             -- JSON: pair cards (2-3 small look-alike terms in one card)
);
CREATE INDEX IF NOT EXISTS idx_cards_course ON cards(course_id, ord);
CREATE INDEX IF NOT EXISTS idx_cards_user ON cards(user_id);

-- Exam-style multiple choice questions the AI writes (used on the practice exam page)
CREATE TABLE IF NOT EXISTS questions (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  ord INTEGER NOT NULL,
  added_day TEXT,
  topic TEXT,
  q TEXT NOT NULL,
  choices TEXT NOT NULL,                 -- JSON array of 4
  answer INTEGER NOT NULL,               -- index into choices
  why TEXT
);
CREATE INDEX IF NOT EXISTS idx_questions_course ON questions(course_id, ord);

CREATE TABLE IF NOT EXISTS progress (
  card_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  course_id TEXT NOT NULL,
  box INTEGER DEFAULT 0,                 -- spaced-repetition level 0-5
  due TEXT,                              -- next review day
  learned_at TEXT,                       -- day it was first learned
  right_count INTEGER DEFAULT 0,
  wrong_count INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_progress_user ON progress(user_id, course_id);

CREATE TABLE IF NOT EXISTS exams (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  course_id TEXT NOT NULL,
  day TEXT NOT NULL,
  score INTEGER NOT NULL,
  total INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_exams_course ON exams(course_id, day);

CREATE TABLE IF NOT EXISTS days (
  user_id TEXT NOT NULL,
  day TEXT NOT NULL,
  xp INTEGER DEFAULT 0,
  rounds INTEGER DEFAULT 0,
  lessons INTEGER DEFAULT 0,              -- finished lessons (the daily goal)
  reviews INTEGER DEFAULT 0,              -- finished review rounds / practice exams
  PRIMARY KEY (user_id, day)
);

-- Every finished round has an id so a retried save can never count twice.
CREATE TABLE IF NOT EXISTS study_rounds (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, day TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS idx_days_day ON days(day);

CREATE TABLE IF NOT EXISTS push_subs (
  endpoint TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  p256dh TEXT,
  auth TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_push_user ON push_subs(user_id);
