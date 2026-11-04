// Study Mania API (Cloudflare Worker + D1)
import { sendPush } from "./webpush.js";
import { ensureDb } from "./migrate.js";
import { addDays, daysBetween, isDay, nextReview, summarize, cleanCard, cleanQuestion, weekStart, secondReminderHour, mergeMissed } from "../public/shared.mjs";

const SESSION_DAYS = 60;
const MAX_CARDS_PER_COURSE = 800;
const RECOVER_MAX_FAILS = 5;

// ---------- helpers ----------
const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers },
  });
const err = (msg, status = 400) => json({ error: msg }, status);

const enc = new TextEncoder();
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
const sha256 = async (s) => hex(await crypto.subtle.digest("SHA-256", enc.encode(s)));
const randHex = (n) => hex(crypto.getRandomValues(new Uint8Array(n)));
const str = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");

async function pbkdf2(secret, saltHex) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), "PBKDF2", false, ["deriveBits"]);
  const salt = new Uint8Array(saltHex.match(/../g).map((h) => parseInt(h, 16)));
  return hex(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: 100000 }, key, 256));
}
// Security answers ignore case, spaces and punctuation ("Mr. Fluffy" = "mr fluffy").
const normAnswer = (a) => String(a || "").toLowerCase().normalize("NFKD").replace(/[^a-z0-9]/g, "");
function safeEqual(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

function localNow(tz) {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23" }).formatToParts(new Date());
    const g = (t) => parts.find((p) => p.type === t).value;
    return { day: `${g("year")}-${g("month")}-${g("day")}`, hour: parseInt(g("hour"), 10) };
  } catch {
    const d = new Date();
    return { day: d.toISOString().slice(0, 10), hour: d.getUTCHours() };
  }
}

function cookieFor(token, url, maxAge) {
  const secure = url.protocol === "https:" ? "; Secure" : "";
  return `sm_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}
function readCookie(req, name) {
  const m = (req.headers.get("cookie") || "").match(new RegExp("(?:^|;\\s*)" + name + "=([^;]+)"));
  return m ? m[1] : null;
}
async function currentUser(req, env) {
  const token = readCookie(req, "sm_session");
  if (!token) return null;
  return (await env.DB.prepare("SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ?")
    .bind(await sha256(token), Date.now()).first()) || null;
}
async function startSession(env, userId, url) {
  const token = randHex(32);
  await env.DB.prepare("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)")
    .bind(await sha256(token), userId, Date.now() + SESSION_DAYS * 864e5).run();
  return cookieFor(token, url, SESSION_DAYS * 86400);
}
const getUser = (env, id) => env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(id).first();
// Usernames: 3-20 letters, numbers, _ or . (stored lowercase)
const cleanUsername = (u) => String(u || "").trim().replace(/^@/, "").toLowerCase();
const usernameProblem = (u) => !/^[a-z0-9_.]{3,20}$/.test(u) ? "Usernames are 3-20 letters, numbers, _ or ." : /^[._]|[._]$/.test(u) ? "Usernames can't start or end with _ or ." : null;
// Sign in / recover with either an email or a username.
const findByLogin = (env, login) => {
  const v = String(login || "").trim().toLowerCase();
  return v.includes("@") && !v.startsWith("@") ? env.DB.prepare("SELECT * FROM users WHERE email = ?").bind(v).first()
    : env.DB.prepare("SELECT * FROM users WHERE username = ?").bind(cleanUsername(v)).first();
};
// Is the streak still alive today? A missed day can be covered by a streak freeze.
function streakState(u, day) {
  const streak = u.streak || 0;
  if (!day || !u.last_study_day || u.last_study_day === day || u.last_study_day === addDays(day, -1)) return { streak, protectedBy: 0 };
  const missed = daysBetween(u.last_study_day, day) - 1;
  return missed <= (u.freezes || 0) ? { streak, protectedBy: missed } : { streak: 0, protectedBy: 0 };
}

function publicUser(u, day) {
  const st = streakState(u, day);
  return {
    id: u.id, email: u.email, username: u.username || null, name: u.name, tz: u.tz, remind_hour: u.remind_hour, daily_goal: u.daily_goal,
    xp: u.xp, streak: st.streak, freezes: u.freezes || 0, freeze_needed: st.protectedBy, best_streak: u.best_streak,
    last_study_day: u.last_study_day, has_security: !!u.sec_q1, lb_hidden: !!u.lb_hidden,
  };
}

async function runBatch(env, stmts) {
  for (let i = 0; i < stmts.length; i += 50) await env.DB.batch(stmts.slice(i, i + 50));
}

async function insertContent(env, courseId, userId, rawCards, rawQuestions, day) {
  const start = await env.DB.prepare("SELECT COALESCE(MAX(ord), -1) + 1 AS n, COUNT(*) AS c FROM cards WHERE course_id = ?").bind(courseId).first();
  const room = MAX_CARDS_PER_COURSE - (start.c || 0);
  const keepDay = (raw, clean) => { if (clean && isDay(raw.added_day)) clean.added_day = raw.added_day; return clean; };
  // Skip words this subject already has (overlapping slides pasted twice).
  const have = new Set((await env.DB.prepare("SELECT lower(term) AS t FROM cards WHERE course_id = ?").bind(courseId).all()).results.map((r) => r.t));
  let skipped = 0;
  const cards = (Array.isArray(rawCards) ? rawCards : []).map((r) => keepDay(r, cleanCard(r))).filter(Boolean)
    .filter((c) => { const k = c.term.toLowerCase(); if (have.has(k)) { skipped++; return false; } have.add(k); return true; })
    .slice(0, Math.max(0, room));
  const qs = (Array.isArray(rawQuestions) ? rawQuestions : []).map((r) => keepDay(r, cleanQuestion(r))).filter(Boolean).slice(0, 400);
  const cardStmt = env.DB.prepare(
    `INSERT INTO cards (id, course_id, user_id, ord, added_day, topic, term, full, definition, simple, hook, example, answer, traps, confuse, related, formula, question, parts)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const qStart = await env.DB.prepare("SELECT COALESCE(MAX(ord), -1) + 1 AS n FROM questions WHERE course_id = ?").bind(courseId).first();
  const qStmt = env.DB.prepare("INSERT INTO questions (id, course_id, user_id, ord, added_day, topic, q, choices, answer, why) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
  const ids = [];
  const stmts = cards.map((c, i) => {
    const id = crypto.randomUUID(); ids.push(id);
    return cardStmt.bind(id, courseId, userId, start.n + i, c.added_day || day, c.topic, c.term, c.full, c.definition, c.simple, c.hook, c.example,
      c.answer, JSON.stringify(c.traps), c.confuse, JSON.stringify(c.related), c.formula, c.question, c.parts?.length ? JSON.stringify(c.parts) : null);
  }).concat(qs.map((q, i) => qStmt.bind(crypto.randomUUID(), courseId, userId, qStart.n + i, q.added_day || day, q.topic, q.q, JSON.stringify(q.choices), q.answer, q.why)));
  await runBatch(env, stmts);
  return { added: cards.length, skipped, questions: qs.length, ids };
}

const ownCourse = (env, id, userId) => env.DB.prepare("SELECT * FROM courses WHERE id = ? AND user_id = ?").bind(id, userId).first();

async function courseSummaries(env, userId, day) {
  const courses = (await env.DB.prepare("SELECT * FROM courses WHERE user_id = ? ORDER BY COALESCE(exam_date, finish_by, '9999'), created_at").bind(userId).all()).results;
  const cards = (await env.DB.prepare("SELECT id, course_id, topic, added_day FROM cards WHERE user_id = ? ORDER BY course_id, ord").bind(userId).all()).results;
  const prog = (await env.DB.prepare("SELECT card_id, box, due, learned_at FROM progress WHERE user_id = ?").bind(userId).all()).results;
  const progress = Object.fromEntries(prog.map((p) => [p.card_id, p]));
  return courses.map((c) => summarize(c, cards.filter((k) => k.course_id === c.id), progress, day));
}

async function today(env, userId, day) {
  const row = await env.DB.prepare("SELECT xp, rounds, lessons, reviews FROM days WHERE user_id = ? AND day = ?").bind(userId, day).first();
  const { results } = await env.DB.prepare("SELECT day, xp, rounds FROM days WHERE user_id = ? AND day > ? ORDER BY day").bind(userId, addDays(day, -28)).all();
  return { xp: row?.xp || 0, rounds: row?.rounds || 0, lessons: row?.lessons || 0, reviews: row?.reviews || 0, recent: results };
}

const readBody = async (req) => { try { return await req.json(); } catch { return {}; } };

function planFields(b, course = {}) {
  const int = (v, lo, hi, d) => { const n = parseInt(v, 10); return isNaN(n) ? d : Math.min(hi, Math.max(lo, n)); };
  const opt = (k, f) => (b[k] === null ? null : b[k] !== undefined ? f(b[k]) : course[k] ?? null);
  return {
    exam_date: b.exam_date === null ? null : isDay(b.exam_date) ? b.exam_date : course.exam_date ?? null,
    review_days: b.review_days !== undefined ? int(b.review_days, 0, 30, 3) : course.review_days ?? 3,
    finish_by: b.finish_by === null ? null : isDay(b.finish_by) ? b.finish_by : course.finish_by ?? null,
    as_you_go: b.as_you_go !== undefined ? (b.as_you_go ? 1 : 0) : course.as_you_go ?? 0,
    keep_up_days: b.keep_up_days !== undefined ? int(b.keep_up_days, 1, 30, 3) : course.keep_up_days ?? 3,
    more_total: opt("more_total", (v) => int(v, 1, 99, null)),
    more_have: opt("more_have", (v) => int(v, 0, 99, null)),
    more_every: opt("more_every", (v) => (["class", "week", "unsure"].includes(v) ? v : "unsure")),
    more_share: opt("more_share", (v) => Math.min(0.95, Math.max(0.2, +v || 0.75))),
    notes_done: b.notes_done !== undefined ? (b.notes_done ? 1 : 0) : course.notes_done ?? 0,
  };
}

async function sendResetEmail(env, to, link) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({
      from: env.EMAIL_FROM || "Study Mania <onboarding@resend.dev>",
      to: [to],
      subject: "Reset your Study Mania password",
      text: `Someone asked to reset the password for your Study Mania account.\n\nReset it here (the link works for 30 minutes):\n${link}\n\nIf this wasn't you, ignore this email. Your password won't change.`,
      html: `<p>Someone asked to reset the password for your Study Mania account.</p><p><a href="${link}" style="display:inline-block;background:#2f9a7e;color:#fff;padding:12px 18px;border-radius:10px;text-decoration:none;font-weight:bold">Reset my password</a></p><p>The link works for 30 minutes. If this wasn't you, ignore this email. Your password won't change.</p>`,
    }),
  });
  return res.ok;
}

async function setPassword(env, userId, password) {
  const salt = randHex(16);
  await env.DB.batch([
    env.DB.prepare("UPDATE users SET pass_hash = ?, salt = ?, reset_hash = NULL, reset_expires = 0, recover_fails = 0, recover_lock_until = 0 WHERE id = ?")
      .bind(await pbkdf2(password, salt), salt, userId),
    env.DB.prepare("DELETE FROM sessions WHERE user_id = ?").bind(userId), // sign out everywhere else
  ]);
}

// ---------- routes ----------
async function api(req, env, url) {
  const path = url.pathname.replace(/^\/api/, "");
  const method = req.method;
  const qday = isDay(url.searchParams.get("day")) ? url.searchParams.get("day") : null;

  // Hourly ping from the little reminders Worker. Safe to call any time:
  // each person gets at most one reminder a day, only at their chosen hour.
  if (path === "/cron") { await sendReminders(env); return json({ ok: true }); }

  if (path === "/config" && method === "GET") return json({ email_reset: !!env.RESEND_API_KEY, push: !!env.VAPID_PUBLIC_KEY });

  if (path === "/signup" && method === "POST") {
    const b = await readBody(req);
    const email = str(b.email, 200).toLowerCase();
    const password = typeof b.password === "string" ? b.password : "";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return err("Enter a valid email address.");
    if (password.length < 8) return err("Use at least 8 characters for your password.");
    const username = cleanUsername(b.username);
    const uProblem = usernameProblem(username);
    if (uProblem) return err(uProblem);
    if (await env.DB.prepare("SELECT id FROM users WHERE email = ?").bind(email).first()) return err("There's already an account with that email. Sign in instead.", 409);
    if (await env.DB.prepare("SELECT id FROM users WHERE username = ?").bind(username).first()) return err("That username is taken. Try another.", 409);
    const id = crypto.randomUUID(), salt = randHex(16);
    await env.DB.prepare("INSERT INTO users (id, email, username, name, pass_hash, salt, tz) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .bind(id, email, username, str(b.name, 60) || null, await pbkdf2(password, salt), salt, str(b.tz, 60) || "America/New_York").run();
    return json({ user: publicUser(await getUser(env, id), qday) }, 200, { "set-cookie": await startSession(env, id, url) });
  }

  if (path === "/username-check" && method === "GET") {
    const u = cleanUsername(url.searchParams.get("u"));
    const problem = usernameProblem(u);
    if (problem) return json({ ok: false, reason: problem });
    const taken = await env.DB.prepare("SELECT id FROM users WHERE username = ?").bind(u).first();
    return json({ ok: !taken, reason: taken ? "That username is taken." : null });
  }

  if (path === "/leaderboard" && method === "GET") {
    const board = url.searchParams.get("board") === "streak" ? "streak" : "week";
    const d = qday || new Date().toISOString().slice(0, 10);
    const me = await currentUser(req, env);
    let rows, mine = null;
    if (board === "week") {
      const since = weekStart(d);
      rows = (await env.DB.prepare(
        `SELECT u.id, u.username, u.streak, SUM(x.xp) AS score FROM days x JOIN users u ON u.id = x.user_id
         WHERE x.day >= ? AND u.username IS NOT NULL AND COALESCE(u.lb_hidden, 0) = 0
         GROUP BY u.id HAVING score > 0 ORDER BY score DESC, u.streak DESC LIMIT 10`).bind(since).all()).results;
      if (me) {
        const s = (await env.DB.prepare("SELECT COALESCE(SUM(xp), 0) AS score FROM days WHERE user_id = ? AND day >= ?").bind(me.id, since).first()).score;
        const ahead = (await env.DB.prepare(
          `SELECT COUNT(*) AS n FROM (SELECT x.user_id, SUM(x.xp) AS t FROM days x JOIN users u ON u.id = x.user_id
           WHERE x.day >= ? AND u.username IS NOT NULL AND COALESCE(u.lb_hidden, 0) = 0 AND u.id != ? GROUP BY x.user_id HAVING t > ?)`).bind(since, me.id, s).first()).n;
        mine = { score: s, rank: s > 0 ? ahead + 1 : null };
      }
    } else {
      const alive = addDays(d, -1);
      rows = (await env.DB.prepare(
        `SELECT id, username, streak AS score FROM users WHERE username IS NOT NULL AND COALESCE(lb_hidden, 0) = 0
         AND streak > 0 AND last_study_day >= ? ORDER BY streak DESC, xp DESC LIMIT 10`).bind(alive).all()).results;
      if (me) {
        const s = streakState(me, d).streak;
        const ahead = (await env.DB.prepare(
          "SELECT COUNT(*) AS n FROM users WHERE username IS NOT NULL AND COALESCE(lb_hidden, 0) = 0 AND last_study_day >= ? AND streak > ? AND id != ?").bind(alive, s, me.id).first()).n;
        mine = { score: s, rank: s > 0 ? ahead + 1 : null };
      }
    }
    const players = (await env.DB.prepare("SELECT COUNT(*) AS n FROM users WHERE username IS NOT NULL").first()).n;
    return json({ board, top: rows.map((r, i) => ({ rank: i + 1, username: r.username, score: r.score, me: me?.id === r.id })), me: mine, hidden: !!me?.lb_hidden, players });
  }

  if (path === "/login" && method === "POST") {
    const b = await readBody(req);
    const u = await findByLogin(env, b.login ?? b.email);
    const ok = u && safeEqual(await pbkdf2(String(b.password || ""), u.salt), u.pass_hash);
    if (!ok) return err("That username or email and password don't match. Check them and try again, or tap Forgot password.", 401);
    if (b.tz) await env.DB.prepare("UPDATE users SET tz = ? WHERE id = ?").bind(str(b.tz, 60), u.id).run();
    return json({ user: publicUser(u, qday) }, 200, { "set-cookie": await startSession(env, u.id, url) });
  }

  if (path === "/logout" && method === "POST") {
    const token = readCookie(req, "sm_session");
    if (token) await env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(await sha256(token)).run();
    return json({ ok: true }, 200, { "set-cookie": cookieFor("", url, 0) });
  }

  // ----- forgot password: email link -----
  if (path === "/forgot" && method === "POST") {
    if (!env.RESEND_API_KEY) return err("Email reset isn't set up. Use your security questions instead.", 400);
    const b = await readBody(req);
    const u = await findByLogin(env, b.login ?? b.email);
    if (u && !(u.reset_expires > Date.now() + 25 * 60e3)) { // at most one email every 5 minutes
      const token = randHex(24);
      await env.DB.prepare("UPDATE users SET reset_hash = ?, reset_expires = ? WHERE id = ?").bind(await sha256(token), Date.now() + 30 * 60e3, u.id).run();
      await sendResetEmail(env, u.email, `${url.origin}/#/reset/${token}`);
    }
    return json({ ok: true }); // same answer either way, so nobody can test which emails have accounts
  }
  if (path === "/reset" && method === "POST") {
    const b = await readBody(req);
    if (typeof b.password !== "string" || b.password.length < 8) return err("Use at least 8 characters for your new password.");
    const u = await env.DB.prepare("SELECT * FROM users WHERE reset_hash = ? AND reset_expires > ?").bind(await sha256(String(b.token || "")), Date.now()).first();
    if (!u) return err("That reset link has expired or was already used. Ask for a new one.", 400);
    await setPassword(env, u.id, b.password);
    return json({ user: publicUser(u, qday) }, 200, { "set-cookie": await startSession(env, u.id, url) });
  }

  // ----- forgot password: security questions -----
  if (path === "/recover/questions" && method === "POST") {
    const b = await readBody(req);
    const u = await findByLogin(env, b.login ?? b.email);
    if (!u) return err("There's no account with that username or email.", 404);
    if (!u.sec_q1) return err("This account didn't set up security questions.", 400);
    return json({ questions: [u.sec_q1, u.sec_q2] });
  }
  if (path === "/recover/reset" && method === "POST") {
    const b = await readBody(req);
    const u = await findByLogin(env, b.login ?? b.email);
    if (!u || !u.sec_q1) return err("That account can't be recovered with questions.", 400);
    if (u.recover_lock_until > Date.now()) {
      const mins = Math.ceil((u.recover_lock_until - Date.now()) / 60e3);
      return err(`Too many wrong tries. Wait ${mins} minute${mins > 1 ? "s" : ""} and try again.`, 429);
    }
    if (typeof b.password !== "string" || b.password.length < 8) return err("Use at least 8 characters for your new password.");
    const a = Array.isArray(b.answers) ? b.answers : [];
    const ok = safeEqual(await pbkdf2(normAnswer(a[0]), u.sec_salt), u.sec_a1) & safeEqual(await pbkdf2(normAnswer(a[1]), u.sec_salt), u.sec_a2);
    if (!ok) {
      const fails = (u.recover_fails || 0) + 1;
      const lock = fails >= RECOVER_MAX_FAILS ? Date.now() + 60 * 60e3 : 0;
      await env.DB.prepare("UPDATE users SET recover_fails = ?, recover_lock_until = ? WHERE id = ?").bind(lock ? 0 : fails, lock, u.id).run();
      return err(lock ? "Too many wrong tries. Recovery is locked for 1 hour." : `Those answers don't match. ${RECOVER_MAX_FAILS - fails} tr${RECOVER_MAX_FAILS - fails === 1 ? "y" : "ies"} left.`, 401);
    }
    await setPassword(env, u.id, b.password);
    return json({ user: publicUser(u, qday) }, 200, { "set-cookie": await startSession(env, u.id, url) });
  }

  // Everything below needs a signed-in user.
  const user = await currentUser(req, env);
  if (!user) return err("Sign in to continue.", 401);
  const day = qday || localNow(user.tz).day;

  if (path === "/me" && method === "GET") {
    return json({ user: publicUser(user, day), courses: await courseSummaries(env, user.id, day), today: await today(env, user.id, day) });
  }
  if (path === "/me" && method === "PATCH") {
    const b = await readBody(req);
    const goal = Math.min(10, Math.max(1, parseInt(b.daily_goal ?? user.daily_goal, 10) || 2));
    const hour = parseInt(b.remind_hour ?? user.remind_hour, 10);
    let username = user.username;
    if (b.username !== undefined && cleanUsername(b.username) !== user.username) {
      username = cleanUsername(b.username);
      const problem = usernameProblem(username);
      if (problem) return err(problem);
      if (await env.DB.prepare("SELECT id FROM users WHERE username = ? AND id != ?").bind(username, user.id).first()) return err("That username is taken. Try another.", 409);
    }
    await env.DB.prepare("UPDATE users SET name = ?, tz = ?, remind_hour = ?, daily_goal = ?, username = ?, lb_hidden = ? WHERE id = ?")
      .bind(b.name !== undefined ? str(b.name, 60) : user.name, b.tz ? str(b.tz, 60) : user.tz, isNaN(hour) ? user.remind_hour : Math.min(23, Math.max(0, hour)), goal,
        username, b.lb_hidden !== undefined ? (b.lb_hidden ? 1 : 0) : user.lb_hidden || 0, user.id).run();
    return json({ user: publicUser(await getUser(env, user.id), day) });
  }
  if (path === "/me/security" && method === "POST") {
    const b = await readBody(req);
    const q1 = str(b.q1, 120), q2 = str(b.q2, 120);
    if (!q1 || !q2 || q1 === q2) return err("Pick two different questions.");
    if (normAnswer(b.a1).length < 2 || normAnswer(b.a2).length < 2) return err("Answer both questions.");
    const salt = randHex(16);
    await env.DB.prepare("UPDATE users SET sec_q1 = ?, sec_a1 = ?, sec_q2 = ?, sec_a2 = ?, sec_salt = ?, recover_fails = 0 WHERE id = ?")
      .bind(q1, await pbkdf2(normAnswer(b.a1), salt), q2, await pbkdf2(normAnswer(b.a2), salt), salt, user.id).run();
    return json({ ok: true });
  }

  if (path === "/courses" && method === "POST") {
    const b = await readBody(req);
    const name = str(b.name, 80);
    if (!name) return err("Give the subject a name.");
    const count = await env.DB.prepare("SELECT COUNT(*) AS n FROM courses WHERE user_id = ?").bind(user.id).first();
    if (count.n >= 30) return err("You've hit the 30-subject limit. Delete an old one first.");
    const id = crypto.randomUUID(), p = planFields(b);
    await env.DB.prepare("INSERT INTO courses (id, user_id, name, exam_date, review_days, finish_by, as_you_go, keep_up_days, color, more_total, more_have, more_every, more_share, notes_done) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .bind(id, user.id, name, p.exam_date, p.review_days, p.finish_by, p.as_you_go, p.keep_up_days, (parseInt(b.color, 10) || 0) % 8, p.more_total, p.more_have, p.more_every, p.more_share, p.notes_done).run();
    const r = await insertContent(env, id, user.id, b.cards, b.questions, day);
    return json({ id, ...r });
  }

  // Bring a guest's on-device data into their new account.
  if (path === "/import" && method === "POST") {
    const b = await readBody(req);
    const courses = Array.isArray(b.courses) ? b.courses.slice(0, 30) : [];
    for (const c of courses) {
      const id = crypto.randomUUID(), p = planFields(c);
      await env.DB.prepare("INSERT INTO courses (id, user_id, name, exam_date, review_days, finish_by, as_you_go, keep_up_days, color, more_total, more_have, more_every, more_share, notes_done) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
        .bind(id, user.id, str(c.name, 80) || "My subject", p.exam_date, p.review_days, p.finish_by, p.as_you_go, p.keep_up_days, (parseInt(c.color, 10) || 0) % 8, p.more_total, p.more_have, p.more_every, p.more_share, p.notes_done).run();
      const cards = Array.isArray(c.cards) ? c.cards : [];
      const r = await insertContent(env, id, user.id, cards, c.questions, day);
      const stmts = [];
      cards.forEach((k, i) => {
        const pr = c.progress?.[k.id];
        if (!pr || !r.ids[i]) return;
        stmts.push(env.DB.prepare("INSERT INTO progress (card_id, user_id, course_id, box, due, learned_at) VALUES (?, ?, ?, ?, ?, ?)")
          .bind(r.ids[i], user.id, id, Math.min(5, Math.max(0, parseInt(pr.box, 10) || 0)), isDay(pr.due) ? pr.due : day, isDay(pr.learned_at) ? pr.learned_at : null));
      });
      (Array.isArray(c.exams) ? c.exams.slice(0, 100) : []).forEach((e) => {
        if (isDay(e.day)) stmts.push(env.DB.prepare("INSERT INTO exams (id, user_id, course_id, day, score, total) VALUES (?, ?, ?, ?, ?, ?)")
          .bind(crypto.randomUUID(), user.id, id, e.day, parseInt(e.score, 10) || 0, parseInt(e.total, 10) || 0));
      });
      await runBatch(env, stmts);
    }
    const days = Array.isArray(b.days) ? b.days.slice(0, 400) : [];
    await runBatch(env, days.filter((d) => isDay(d.day)).map((d) =>
      env.DB.prepare("INSERT INTO days (user_id, day, xp, rounds) VALUES (?, ?, ?, ?) ON CONFLICT(user_id, day) DO UPDATE SET xp = xp + excluded.xp, rounds = rounds + excluded.rounds")
        .bind(user.id, d.day, parseInt(d.xp, 10) || 0, parseInt(d.rounds, 10) || 0)));
    const gu = b.user || {};
    const gStreak = parseInt(gu.streak, 10) || 0;
    await env.DB.prepare(`UPDATE users SET xp = xp + ?, best_streak = MAX(best_streak, ?, ?),
        streak = CASE WHEN COALESCE(last_study_day, '') < ? THEN ? ELSE streak END,
        last_study_day = CASE WHEN COALESCE(last_study_day, '') < ? THEN ? ELSE last_study_day END WHERE id = ?`)
      .bind(Math.min(1e6, parseInt(gu.xp, 10) || 0), parseInt(gu.best_streak, 10) || 0, gStreak,
        isDay(gu.last_study_day) ? gu.last_study_day : "", gStreak, isDay(gu.last_study_day) ? gu.last_study_day : "", isDay(gu.last_study_day) ? gu.last_study_day : null, user.id).run();
    return json({ ok: true, courses: courses.length });
  }

  const m = path.match(/^\/courses\/([\w-]+)(\/[\w-]+)?$/);
  if (m) {
    const course = await ownCourse(env, m[1], user.id);
    if (!course) return err("That subject wasn't found.", 404);
    const sub = m[2] || "";

    if (!sub && method === "GET") {
      const cards = (await env.DB.prepare("SELECT * FROM cards WHERE course_id = ? ORDER BY ord").bind(course.id).all()).results
        .map((c) => ({ ...c, traps: JSON.parse(c.traps || "[]"), related: JSON.parse(c.related || "[]"), parts: JSON.parse(c.parts || "[]") }));
      const questions = (await env.DB.prepare("SELECT id, topic, q, choices, answer, why, added_day FROM questions WHERE course_id = ? ORDER BY ord").bind(course.id).all()).results
        .map((q) => ({ ...q, choices: JSON.parse(q.choices || "[]") }));
      const prog = (await env.DB.prepare("SELECT card_id, box, due, learned_at, wrong_count FROM progress WHERE course_id = ?").bind(course.id).all()).results;
      const exams = (await env.DB.prepare("SELECT day, score, total FROM exams WHERE course_id = ? ORDER BY day DESC, rowid DESC LIMIT 10").bind(course.id).all()).results;
      return json({ course, cards, questions, exams, progress: Object.fromEntries(prog.map((p) => [p.card_id, p])) });
    }
    if (!sub && method === "PATCH") {
      const b = await readBody(req), p = planFields(b, course);
      await env.DB.prepare("UPDATE courses SET name = ?, exam_date = ?, review_days = ?, finish_by = ?, as_you_go = ?, keep_up_days = ?, color = ?, more_total = ?, more_have = ?, more_every = ?, more_share = ?, notes_done = ? WHERE id = ?")
        .bind(str(b.name, 80) || course.name, p.exam_date, p.review_days, p.finish_by, p.as_you_go, p.keep_up_days,
          b.color !== undefined ? (parseInt(b.color, 10) || 0) % 8 : course.color, p.more_total, p.more_have, p.more_every, p.more_share, p.notes_done, course.id).run();
      return json({ ok: true });
    }
    if (!sub && method === "DELETE") {
      await env.DB.batch(["progress", "cards", "questions", "exams"].map((t) => env.DB.prepare(`DELETE FROM ${t} WHERE course_id = ?`).bind(course.id))
        .concat(env.DB.prepare("DELETE FROM courses WHERE id = ?").bind(course.id)));
      return json({ ok: true });
    }
    if (sub === "/missed" && method === "POST") {
      // Words you got wrong in this subject (cram, speed round, practice exam). Merged here so two devices don't overwrite each other.
      const b = await readBody(req), ids = new Set((await env.DB.prepare("SELECT id FROM cards WHERE course_id = ?").bind(course.id).all()).results.map((r) => r.id));
      const list = mergeMissed(course.missed, (b.add || []).filter((x) => ids.has(String(x))), b.remove).filter((x) => ids.has(x));
      await env.DB.prepare("UPDATE courses SET missed = ? WHERE id = ?").bind(JSON.stringify(list), course.id).run();
      return json({ missed: list });
    }
    if (sub === "/cards" && method === "POST") {
      const b = await readBody(req);
      return json(await insertContent(env, course.id, user.id, b.cards, b.questions, day));
    }
    if (sub === "/known" && method === "POST") {
      // Check lessons off as "already studied" (or undo). Counts as learned before today.
      const b = await readBody(req);
      const ids = Array.isArray(b.card_ids) ? b.card_ids.slice(0, 800).map(String) : [];
      await runBatch(env, ids.map((cid) => b.known
        ? env.DB.prepare(`INSERT INTO progress (card_id, user_id, course_id, box, due, learned_at)
             SELECT id, ?, ?, 2, ?, ? FROM cards WHERE id = ? AND course_id = ?
             ON CONFLICT(card_id) DO UPDATE SET learned_at = COALESCE(learned_at, excluded.learned_at), box = MAX(box, 2)`)
            .bind(user.id, course.id, addDays(day, 2), addDays(day, -1), cid, course.id)
        : env.DB.prepare("DELETE FROM progress WHERE card_id = ? AND course_id = ?").bind(cid, course.id)));
      return json({ ok: true });
    }
  }

  if (path === "/study" && method === "POST") {
    // Save one finished lesson, review round or practice exam.
    const b = await readBody(req);
    const course = await ownCourse(env, String(b.course_id || ""), user.id);
    if (!course) return err("That subject wasn't found.", 404);
    // Each save carries an id. If the same save arrives twice (bad signal, retry), count it once.
    const rid = str(b.round_id, 80);
    if (rid) {
      const seen = await env.DB.prepare("SELECT id FROM study_rounds WHERE id = ?").bind(user.id + ":" + rid).first();
      if (seen) return json({ user: publicUser(user, day), today: await today(env, user.id, day), duplicate: true });
      await env.DB.prepare("INSERT INTO study_rounds (id, user_id, day) VALUES (?, ?, ?)").bind(user.id + ":" + rid, user.id, day).run();
    }
    const results = Array.isArray(b.results) ? b.results.slice(0, 300) : [];
    const stmts = [];
    for (const r of results) {
      const cid = String(r.card_id || "");
      const prev = await env.DB.prepare("SELECT box FROM progress WHERE card_id = ? AND course_id = ?").bind(cid, course.id).first();
      const nr = nextReview(prev?.box, !!r.ok, r.mode === "learn" ? "learn" : "review", day, course.exam_date);
      stmts.push(env.DB.prepare(
        `INSERT INTO progress (card_id, user_id, course_id, box, due, learned_at, right_count, wrong_count)
         SELECT id, ?, ?, ?, ?, ?, ?, ? FROM cards WHERE id = ? AND course_id = ?
         ON CONFLICT(card_id) DO UPDATE SET box = excluded.box, due = excluded.due, learned_at = COALESCE(learned_at, excluded.learned_at),
           right_count = right_count + excluded.right_count, wrong_count = wrong_count + excluded.wrong_count`
      ).bind(user.id, course.id, nr.box, nr.due, day, r.ok ? 1 : 0, r.ok ? 0 : 1, cid, course.id));
    }
    if (b.exam && Number.isFinite(+b.exam.total) && +b.exam.total > 0) {
      stmts.push(env.DB.prepare("INSERT INTO exams (id, user_id, course_id, day, score, total) VALUES (?, ?, ?, ?, ?, ?)")
        .bind(crypto.randomUUID(), user.id, course.id, day, Math.max(0, parseInt(b.exam.score, 10) || 0), Math.min(500, parseInt(b.exam.total, 10))));
    }
    const xp = Math.min(800, Math.max(0, parseInt(b.xp, 10) || 0));
    // A round only counts toward the streak and daily goal if it was finished (or 80% done).
    const counts = b.counts !== false;
    let streak = user.streak || 0, freezes = user.freezes || 0, usedFreeze = 0, earnedFreeze = false;
    if (counts && user.last_study_day !== day) {
      const st = streakState(user, day);
      if (st.protectedBy) { usedFreeze = st.protectedBy; freezes -= usedFreeze; streak += 1; }
      else streak = st.streak ? streak + 1 : 1;
      if (streak % 7 === 0 && freezes < 2) { freezes += 1; earnedFreeze = true; }
    }
    const isLesson = counts && b.kind === "lesson", isReview = counts && !isLesson;
    stmts.push(env.DB.prepare(`INSERT INTO days (user_id, day, xp, rounds, lessons, reviews) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(user_id, day) DO UPDATE SET
        xp = xp + excluded.xp, rounds = rounds + excluded.rounds, lessons = lessons + excluded.lessons, reviews = reviews + excluded.reviews`)
      .bind(user.id, day, xp, counts ? 1 : 0, isLesson ? 1 : 0, isReview ? 1 : 0));
    if (counts) stmts.push(env.DB.prepare("UPDATE users SET xp = xp + ?, streak = ?, freezes = ?, best_streak = MAX(best_streak, ?), last_study_day = ? WHERE id = ?").bind(xp, streak, freezes, streak, day, user.id));
    else stmts.push(env.DB.prepare("UPDATE users SET xp = xp + ? WHERE id = ?").bind(xp, user.id));
    await runBatch(env, stmts);
    return json({ user: publicUser(await getUser(env, user.id), day), today: await today(env, user.id, day), used_freeze: usedFreeze, earned_freeze: earnedFreeze });
  }

  if (path === "/nudge" && method === "GET") return json(await nudgeFor(env, user, day));


  if (path === "/push/key" && method === "GET") return json({ key: env.VAPID_PUBLIC_KEY || null });
  if (path === "/push/subscribe" && method === "POST") {
    const b = await readBody(req);
    if (!b.endpoint || !/^https:\/\//.test(b.endpoint)) return err("That notification subscription isn't valid.");
    await env.DB.prepare("INSERT INTO push_subs (endpoint, user_id, p256dh, auth) VALUES (?, ?, ?, ?) ON CONFLICT(endpoint) DO UPDATE SET user_id = excluded.user_id")
      .bind(String(b.endpoint).slice(0, 1000), user.id, str(b.keys?.p256dh, 200), str(b.keys?.auth, 100)).run();
    return json({ ok: true });
  }
  if (path === "/push/unsubscribe" && method === "POST") {
    const b = await readBody(req);
    await env.DB.prepare("DELETE FROM push_subs WHERE endpoint = ? AND user_id = ?").bind(String(b.endpoint || ""), user.id).run();
    return json({ ok: true });
  }
  if (path === "/push/test" && method === "POST") {
    const { results } = await env.DB.prepare("SELECT endpoint, p256dh, auth FROM push_subs WHERE user_id = ?").bind(user.id).all();
    if (!results.length) return json({ sent: 0, devices: 0, why: "This account has no phone signed up for reminders yet. Tap Turn on reminders first." });
    const msg = { ...(await nudgeFor(env, user, day)), title: "✅ Reminders are working" };
    let sent = 0, why = null;
    for (const s of results) {
      const r = await sendPush(env, s, msg);
      if (r.result === "ok") sent++;
      else if (r.result === "gone") await env.DB.prepare("DELETE FROM push_subs WHERE endpoint = ?").bind(s.endpoint).run();
      else why = r.why;
    }
    return json({ sent, devices: results.length, why: sent ? null : why || "That phone's reminder sign-up expired. Turn reminders off and on again." });
  }

  if (path === "/account" && method === "DELETE") {
    await env.DB.batch(["progress", "cards", "questions", "exams", "courses", "days", "push_subs", "sessions"]
      .map((t) => env.DB.prepare(`DELETE FROM ${t} WHERE user_id = ?`).bind(user.id))
      .concat(env.DB.prepare("DELETE FROM users WHERE id = ?").bind(user.id)));
    return json({ ok: true }, 200, { "set-cookie": cookieFor("", url, 0) });
  }

  return err("Not found.", 404);
}

// Hourly: nudge everyone whose reminder hour it is and who hasn't studied today.
// The reminder text: streak, today's plan, exam countdown.
async function nudgeFor(env, user, day) {
  const courses = await courseSummaries(env, user.id, day);
  const pu = publicUser(user, day);
  const due = courses.reduce((a, c) => a + c.due, 0);
  const lessons = courses.reduce((a, c) => a + (c.plan.todayLeft || 0), 0);
  const soon = courses.filter((c) => c.exam_date && c.exam_date >= day).sort((a, b) => a.exam_date.localeCompare(b.exam_date))[0];
  let body = [lessons ? `${lessons} lesson${lessons > 1 ? "s" : ""} planned today.` : "", due ? `${due} words ready to review.` : ""].filter(Boolean).join(" ") || "Take a quick lap through your words.";
  // Once, the day after new notes were expected: ask if they came.
  const late = courses.find((c) => c.plan.more && day === addDays(c.plan.more.next, 1));
  if (late) body += ` New notes for ${late.name} yet? Add them so your plan stays right.`;
  if (soon) { const n = daysBetween(day, soon.exam_date); body += ` ${n === 0 ? "Your " + soon.name + " exam is today!" : n + " day" + (n === 1 ? "" : "s") + " until " + soon.name + "."}`; }
  return { title: pu.streak ? `🔥 Keep your ${pu.streak}-day streak going` : "📚 Time for today's study", body };
}

// Hourly: up to 2 nudges a day, only on days you haven't studied yet.
// 1st at your chosen hour, 2nd ("are you sure?") 6 hours later (less if that would pass midnight).
export async function sendReminders(env) {
  const { results } = await env.DB.prepare(
    "SELECT DISTINCT u.id, u.tz, u.remind_hour, u.last_study_day, u.last_nudge_day, u.nudges_today FROM users u JOIN push_subs p ON p.user_id = u.id").all();
  for (const u of results) {
    const now = localNow(u.tz || "America/New_York");
    if (u.last_study_day === now.day) continue;
    const sentToday = u.last_nudge_day === now.day ? u.nudges_today || 0 : 0;
    const second = secondReminderHour(u.remind_hour);
    let which = 0;
    if (sentToday === 0 && now.hour === u.remind_hour) which = 1;
    else if (sentToday === 1 && second !== null && now.hour === second) which = 2;
    if (!which) continue;
    await env.DB.prepare("UPDATE users SET last_nudge_day = ?, nudges_today = ? WHERE id = ?").bind(now.day, which, u.id).run();
    const full = await getUser(env, u.id);
    const msg = await nudgeFor(env, full, now.day);
    if (which === 2) {
      const streak = publicUser(full, now.day).streak;
      msg.title = streak ? `⏰ Your ${streak}-day streak ends at midnight` : "⏰ Still time to study today";
      msg.body = "Are you sure you want to skip today? One lesson takes about 5 minutes. " + msg.body;
    }
    const subs = (await env.DB.prepare("SELECT endpoint, p256dh, auth FROM push_subs WHERE user_id = ?").bind(u.id).all()).results;
    for (const sub of subs) {
      const r = await sendPush(env, sub, msg);
      if (r.result === "gone") await env.DB.prepare("DELETE FROM push_subs WHERE endpoint = ?").bind(sub.endpoint).run();
    }
  }
  await env.DB.prepare("DELETE FROM sessions WHERE expires_at < ?").bind(Date.now()).run();
}

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    if (url.pathname.startsWith("/api/")) {
      if (req.method !== "GET") {
        const origin = req.headers.get("origin");
        if (origin && origin !== url.origin) return err("Request blocked.", 403);
      }
      try { await ensureDb(env); return await api(req, env, url); }
      catch (e) { console.error(e); return err("Something went wrong on our end. Try again in a moment.", 500); }
    }
    return env.ASSETS.fetch(req);
  },
  async scheduled(event, env, ctx) { ctx.waitUntil(ensureDb(env).then(() => sendReminders(env))); },
};
