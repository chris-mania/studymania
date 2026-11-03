-- Upgrade for a database that was set up with the earlier version.
-- Run once:  npx wrangler d1 execute studymania --remote --file=migrations/0003_usernames_leaderboard.sql
ALTER TABLE users ADD COLUMN username TEXT;
ALTER TABLE users ADD COLUMN freezes INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN lb_hidden INTEGER DEFAULT 0;
ALTER TABLE cards ADD COLUMN parts TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_days_day ON days(day);
