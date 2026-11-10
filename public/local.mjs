// No-account mode: the same API as the server, but everything lives in this browser.
import { addDays, daysBetween, isDay, nextReview, summarize, cleanCard, cleanQuestion, mergeMissed } from "./shared.mjs";

const KEY = "sm-guest-data";
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
function load() {
  try { const d = JSON.parse(localStorage.getItem(KEY) || "null"); if (d) return d; } catch {}
  return { user: { id: "guest", name: "", xp: 0, streak: 0, best_streak: 0, last_study_day: null, daily_goal: 2, remind_hour: 18 }, courses: [], days: {} };
}
function save(d) {
  try { localStorage.setItem(KEY, JSON.stringify(d)); }
  catch { throw Object.assign(new Error("This device is out of storage space for Study Mania. Create an account to keep going."), { status: 507 }); }
}
export const hasGuestData = () => { try { return !!JSON.parse(localStorage.getItem(KEY) || "null")?.courses?.length; } catch { return false; } };
export const guestExport = () => load();
export const clearGuest = () => { try { localStorage.removeItem(KEY); } catch {} };

const fail = (msg, status = 400) => { throw Object.assign(new Error(msg), { status }); };
function streakState(u, day) {
  const streak = u.streak || 0;
  if (!u.last_study_day || u.last_study_day === day || u.last_study_day === addDays(day, -1)) return { streak, protectedBy: 0 };
  const missed = daysBetween(u.last_study_day, day) - 1;
  return missed <= (u.freezes || 0) ? { streak, protectedBy: missed } : { streak: 0, protectedBy: 0 };
}
function pubUser(u, day) {
  const st = streakState(u, day);
  return { ...u, streak: st.streak, freezes: u.freezes || 0, freeze_needed: st.protectedBy, guest: true, email: null, username: null, has_security: false };
}
function todayInfo(d, day) {
  const recent = Object.entries(d.days).filter(([k]) => k > addDays(day, -28)).sort().map(([k, v]) => ({ day: k, ...v }));
  const t = d.days[day] || {};
  return { xp: t.xp || 0, rounds: t.rounds || 0, lessons: t.lessons || 0, reviews: t.reviews || 0, recent };
}
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
function addContent(c, cards, questions, day) {
  const have = new Set(c.cards.map((k) => k.term.toLowerCase()));
  let skipped = 0;
  const nc = (Array.isArray(cards) ? cards : []).map(cleanCard).filter(Boolean)
    .filter((k) => { const t = k.term.toLowerCase(); if (have.has(t)) { skipped++; return false; } have.add(t); return true; })
    .slice(0, Math.max(0, 800 - c.cards.length)).map((k) => ({ ...k, id: uid(), added_day: day }));
  const nq = (Array.isArray(questions) ? questions : []).map(cleanQuestion).filter(Boolean).map((q) => ({ ...q, id: uid(), added_day: day }));
  c.cards.push(...nc); c.questions.push(...nq);
  return { added: nc.length, skipped, questions: nq.length };
}

export async function localApi(path, method, body, day) {
  const d = load();
  const b = body || {};

  if (path === "/me" && method === "GET") {
    return { user: pubUser(d.user, day), courses: d.courses.map((c) => summarize(c, c.cards, c.progress, day)), today: todayInfo(d, day) };
  }
  if (path === "/me" && method === "PATCH") {
    if (b.name !== undefined) d.user.name = String(b.name).slice(0, 60);
    if (b.daily_goal !== undefined) d.user.daily_goal = Math.min(10, Math.max(1, parseInt(b.daily_goal, 10) || 2));
    save(d); return { user: pubUser(d.user, day) };
  }
  if (path === "/courses" && method === "POST") {
    if (!String(b.name || "").trim()) fail("Give the subject a name.");
    const c = { id: uid(), name: String(b.name).trim().slice(0, 80), color: (parseInt(b.color, 10) || 0) % 8, ...planFields(b), cards: [], questions: [], progress: {}, exams: [], created_at: day };
    const r = addContent(c, b.cards, b.questions, day);
    d.courses.push(c); save(d); return { id: c.id, ...r };
  }
  const m = path.match(/^\/courses\/([\w-]+)(\/[\w-]+)?$/);
  if (m) {
    const c = d.courses.find((x) => x.id === m[1]);
    if (!c) fail("That subject wasn't found.", 404);
    const sub = m[2] || "";
    if (!sub && method === "GET") {
      const { cards, questions, progress, exams, ...course } = c;
      return { course, cards, questions, progress, exams: [...exams].reverse().slice(0, 10) };
    }
    if (!sub && method === "PATCH") { Object.assign(c, planFields(b, c)); if (b.name) c.name = String(b.name).slice(0, 80); save(d); return { ok: true }; }
    if (!sub && method === "DELETE") { d.courses = d.courses.filter((x) => x !== c); save(d); return { ok: true }; }
    if (sub === "/cards" && method === "POST") { const r = addContent(c, b.cards, b.questions, day); save(d); return r; }
    if (sub === "/missed" && method === "POST") {
      const ids = new Set(c.cards.map((k) => k.id));
      c.missed = mergeMissed(c.missed, (b.add || []).filter((x) => ids.has(String(x))), b.remove).filter((x) => ids.has(x));
      save(d); return { missed: c.missed };
    }
    if (sub === "/known" && method === "POST") {
      for (const id of b.card_ids || []) {
        if (b.known) { const p = c.progress[id]; c.progress[id] = p?.learned_at ? { ...p, box: Math.max(p.box || 0, 2) } : { box: 2, due: addDays(day, 2), learned_at: addDays(day, -1) }; }
        else delete c.progress[id];
      }
      save(d); return { ok: true };
    }
  }
  if (path === "/study" && method === "POST") {
    const c = d.courses.find((x) => x.id === b.course_id);
    if (!c) fail("That subject wasn't found.", 404);
    d.rounds ||= [];
    if (b.round_id && d.rounds.includes(b.round_id)) return { user: pubUser(d.user, day), today: todayInfo(d, day), duplicate: true };
    if (b.round_id) { d.rounds.push(b.round_id); if (d.rounds.length > 300) d.rounds = d.rounds.slice(-300); }
    for (const r of b.results || []) {
      if (!c.cards.some((k) => k.id === r.card_id)) continue;
      const prev = c.progress[r.card_id];
      const nr = nextReview(prev?.box, !!r.ok, r.mode === "learn" ? "learn" : "review", day, c.exam_date, (prev?.wrong_count || 0) > 0);
      c.progress[r.card_id] = { box: nr.box, due: nr.due, learned_at: prev?.learned_at || day, wrong_count: (prev?.wrong_count || 0) + (r.ok ? 0 : 1) };
    }
    if (b.exam?.total > 0) c.exams.push({ day, score: b.exam.score, total: b.exam.total });
    const xp = Math.min(800, Math.max(0, parseInt(b.xp, 10) || 0));
    const u = d.user, counts = b.counts !== false;
    let usedFreeze = 0, earnedFreeze = false;
    u.xp = (u.xp || 0) + xp;
    if (counts && u.last_study_day !== day) {
      const st = streakState(u, day);
      if (st.protectedBy) { usedFreeze = st.protectedBy; u.freezes = (u.freezes || 0) - usedFreeze; u.streak = (u.streak || 0) + 1; }
      else u.streak = st.streak ? (u.streak || 0) + 1 : 1;
      if (u.streak % 7 === 0 && (u.freezes || 0) < 2) { u.freezes = (u.freezes || 0) + 1; earnedFreeze = true; }
      u.best_streak = Math.max(u.best_streak || 0, u.streak); u.last_study_day = day;
    }
    const t = d.days[day] || {}, isLesson = counts && b.kind === "lesson";
    d.days[day] = { xp: (t.xp || 0) + xp, rounds: (t.rounds || 0) + (counts ? 1 : 0), lessons: (t.lessons || 0) + (isLesson ? 1 : 0), reviews: (t.reviews || 0) + (counts && !isLesson ? 1 : 0) };
    save(d); return { user: pubUser(u, day), today: todayInfo(d, day), used_freeze: usedFreeze, earned_freeze: earnedFreeze };
  }
  if (path.startsWith("/push")) fail("Daily reminders need an account. Create one in Settings.");
  if (path === "/logout") return { ok: true };
  fail("That isn't available without an account.", 404);
}
