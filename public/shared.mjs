// Logic shared by the server (Worker), the no-account mode (browser) and the app screens.

export const INTERVALS = [1, 1, 2, 4, 8, 16]; // days until next review, by level

// ---------- dates (YYYY-MM-DD strings) ----------
const pad = (n) => String(n).padStart(2, "0");
export const isDay = (s) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
export function addDays(day, n) {
  const d = new Date(day + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}
export const daysBetween = (a, b) => Math.round((new Date(b + "T12:00:00Z") - new Date(a + "T12:00:00Z")) / 864e5);
export function niceDate(day) {
  try { return new Date(day + "T12:00:00Z").toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" }); }
  catch { return day; }
}

// ---------- spaced repetition ----------
// With an exam date, nothing is allowed to "wait" past the exam: every learned word
// comes back during the last few days before it (the final sweep), spread over 3 days.
export function nextReview(prevBox, ok, mode, day, examDate) {
  const box = mode === "learn" ? (ok ? 1 : 0) : ok ? Math.min(5, (prevBox ?? 0) + 1) : 0;
  let due = addDays(day, INTERVALS[box]);
  if (isDay(examDate) && day < examDate) {
    const sweep = addDays(examDate, -1 - (box % 3));
    if (due > sweep) due = sweep > day ? sweep : addDays(day, 1);
  }
  return { box, due };
}

// Monday of the week a day falls in (for the weekly leaderboard).
export function weekStart(day) {
  const dow = new Date(day + "T12:00:00Z").getUTCDay(); // 0 = Sunday
  return addDays(day, -((dow + 6) % 7));
}

// Older words to sprinkle into a lesson: overdue and missed words first, then weak ones,
// plus one word you already know well so nothing gets forgotten.
export function pickThrowbacks(cards, progress, excludeIds, today, n = 3) {
  const pool = cards.filter((c) => progress[c.id]?.learned_at && !excludeIds.has(c.id));
  if (!pool.length) return [];
  const score = (c) => {
    const p = progress[c.id];
    return (p.due && p.due <= today ? 0 : 10) + (p.box || 0) * 2 - Math.min(6, p.wrong_count || 0) + Math.random() * 1.5;
  };
  const sorted = [...pool].sort((a, b) => score(a) - score(b));
  const out = sorted.slice(0, Math.max(0, n - 1));
  const strong = pool.filter((c) => (progress[c.id].box || 0) >= 3 && !out.includes(c));
  const extra = strong.length ? strong[(Math.random() * strong.length) | 0] : sorted[n - 1];
  if (extra && !out.includes(extra)) out.push(extra);
  return out.slice(0, n);
}

export const MAX_LESSONS_PER_DAY = 4;

// Second reminder: 6 hours after the first, but never past midnight.
// If 6 hours would run into tomorrow, halve the gap (3, then 2, then 1). Returns null if there's no room.
export function secondReminderHour(first) {
  let gap = 6;
  while (first + gap > 23 && gap > 1) gap = Math.ceil(gap / 2);
  return first + gap <= 23 ? first + gap : null;
}

// ---------- lessons ----------
// Cards are grouped by (batch of notes, topic), in order, then split into lessons of up to 5.
export function buildLessons(cards) {
  const keys = [], groups = {};
  for (const c of cards) {
    const k = (c.added_day || "") + "|" + (c.topic || "General");
    if (!groups[k]) { groups[k] = []; keys.push(k); }
    groups[k].push(c);
  }
  const lessons = [];
  for (const k of keys) {
    const ws = groups[k], n = Math.ceil(ws.length / 5), size = Math.ceil(ws.length / n);
    for (let i = 0; i < n; i++) lessons.push({ topic: ws[0].topic || "General", batch: ws[0].added_day || "", part: n > 1 ? i + 1 : 0, cards: ws.slice(i * size, (i + 1) * size) });
  }
  lessons.forEach((l, i) => (l.n = i + 1));
  return lessons;
}

// ---------- the daily plan ----------
// progress: { cardId: { learned_at, ... } }
// "More notes are coming": guess how much is still missing and when it should arrive.
export const CADENCE_DAYS = { class: 3, week: 7, unsure: 7 };
export function moreNotesInfo(course, lessons, today) {
  if (!course.as_you_go || course.notes_done) return null;
  const have = +course.more_have || 0, total = +course.more_total || 0;
  if (have > 0 && total > 0 && total <= have) return null; // everything is in
  const lastBatch = lessons.reduce((m, l) => (l.batch && l.batch > m ? l.batch : m), "") || today;
  const every = CADENCE_DAYS[course.more_every] || 7;
  let missing = null, future;
  if (have > 0 && total > have) { missing = total - have; future = Math.round((lessons.length / have) * missing); }
  else { const share = Math.min(0.95, Math.max(0.2, +course.more_share || 0.75)); future = Math.round(lessons.length * (1 / share - 1)); }
  const next = addDays(lastBatch, every);
  return { future: Math.max(1, future), missing, have, total, next, overdue: today > next, every };
}

export function planFor(course, lessons, progress, today) {
  const learned = (c) => !!progress[c.id]?.learned_at;
  const done = (l) => l.cards.every(learned);
  const doneToday = (l) => done(l) && l.cards.some((c) => progress[c.id].learned_at === today);
  const left = lessons.filter((l) => !done(l));
  const todayDone = lessons.filter(doneToday).length;
  // Work from the state at the start of today so the number doesn't jump around after each lesson.
  const startLeft = left.concat(lessons.filter(doneToday));
  const out = { total: lessons.length, left: left.length, todayDone, perDay: 0, todayLeft: 0, phase: "learn", label: "", cls: "acc", finishOn: null };
  const more = moreNotesInfo(course, lessons, today);
  out.more = more;
  const avgWords = lessons.length ? lessons.reduce((a, l) => a + l.cards.length, 0) / lessons.length : 5;
  const amount = (n) => `${n} lesson${n > 1 ? "s" : ""} (~${Math.max(1, Math.round(n * avgWords))} words)`;
  const nextNote = more ? (more.overdue ? " · got your new notes yet?" : ` · more notes ~${niceDate(more.next)}`) : "";

  const exam = isDay(course.exam_date) ? course.exam_date : null;
  const reviewDays = Math.max(0, course.review_days ?? 3);
  let deadline = null; // last day for new lessons (inclusive)

  if (exam) {
    const toExam = daysBetween(today, exam);
    if (toExam < 0) return { ...out, phase: "over", label: "Exam is over", cls: "" };
    deadline = addDays(exam, -reviewDays - 1);
    if (daysBetween(today, deadline) < 0) {
      // Inside the review window.
      out.phase = "review";
      out.perDay = Math.min(startLeft.length, MAX_LESSONS_PER_DAY); out.todayLeft = Math.max(0, out.perDay - todayDone);
      out.label = left.length ? `Final sweep, but ${left.length} lesson${left.length > 1 ? "s" : ""} still to learn` : `Final sweep · ${toExam === 0 ? "exam today" : toExam + " day" + (toExam > 1 ? "s" : "") + " to go"}`;
      out.cls = left.length ? "warn" : "ok";
      return out;
    }
  } else if (isDay(course.finish_by)) {
    deadline = course.finish_by;
  }

  if (!startLeft.length && more) return { ...out, phase: "waiting", label: more.overdue ? "Caught up 🎉 Got your new notes yet?" : `Caught up on everything you have 🎉 More notes expected ~${niceDate(more.next)}`, cls: "ok" };
  if (!startLeft.length) return { ...out, phase: exam ? "review" : "done", label: exam ? "All lessons learned · review until the exam" : "All lessons learned", cls: "ok" };

  if (!deadline) {
    // No deadline: go at your own pace, show when you'd finish at 1 a day.
    out.perDay = 1;
    out.finishOn = addDays(today, startLeft.length - 1);
    out.label = more ? `1 lesson a day at your own pace${nextNote}` : `At 1 lesson a day you finish ${niceDate(out.finishOn)}`;
    out.cls = "";
  } else {
    // Spread what you have AND the notes still coming evenly over the days left,
    // so there's never a pile-up at the end. The guess is replaced by real numbers once they're pasted.
    const avail = Math.max(1, daysBetween(today, deadline) + 1);
    const work = startLeft.length + (more ? more.future : 0);
    const need = Math.ceil(work / avail);
    out.perDay = Math.min(need, MAX_LESSONS_PER_DAY, startLeft.length); // can't do lessons that don't exist yet
    out.finishOn = more ? null : addDays(today, Math.ceil(startLeft.length / out.perDay) - 1);
    if (need > MAX_LESSONS_PER_DAY) {
      out.label = more ? `Behind: ${MAX_LESSONS_PER_DAY} a day is the max${nextNote}` : `Behind: ${MAX_LESSONS_PER_DAY} a day gets you done ${niceDate(out.finishOn)}`;
      out.cls = "warn";
    } else {
      out.label = more ? `${amount(out.perDay)} a day${nextNote}` : `${amount(out.perDay)} a day · done ${niceDate(out.finishOn)}${exam && reviewDays ? `, then ${reviewDays} review day${reviewDays > 1 ? "s" : ""}` : ""}`;
      out.cls = more?.overdue ? "warn" : "acc";
    }
  }
  out.todayLeft = Math.max(0, out.perDay - todayDone);
  return out;
}

// Summary used on the home screen.
export function summarize(course, cards, progress, today) {
  const lessons = buildLessons(cards);
  const p = planFor(course, lessons, progress, today);
  let learned = 0, due = 0, strong = 0;
  for (const c of cards) {
    const pr = progress[c.id];
    if (pr?.learned_at) { learned++; if (pr.due && pr.due <= today) due++; }
    if ((pr?.box || 0) >= 2) strong++;
  }
  return {
    id: course.id, name: course.name, color: course.color || 0, exam_date: course.exam_date || null,
    review_days: course.review_days ?? 3, finish_by: course.finish_by || null, as_you_go: course.as_you_go ? 1 : 0, keep_up_days: course.keep_up_days ?? 3,
    more_total: course.more_total ?? null, more_have: course.more_have ?? null, more_every: course.more_every || null, more_share: course.more_share ?? null, notes_done: course.notes_done ? 1 : 0,
    total: cards.length, learned, due, strong, lessons: lessons.length, plan: p,
    next: (() => { const l = lessons.find((x) => !x.cards.every((c) => progress[c.id]?.learned_at)); return l ? { n: l.n, topic: l.topic, words: l.cards.length } : null; })(),
  };
}

// ---------- cleaning what the AI sent ----------
const str = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : typeof v === "number" ? String(v) : "");
export function cleanCard(c) {
  if (!c || typeof c !== "object") return null;
  const term = str(c.term, 140);
  const simple = str(c.simple, 500) || str(c.answer, 500) || str(c.definition, 500);
  if (!term || !simple) return null;
  const arr = (a, n, max) => (Array.isArray(a) ? a.map((t) => str(t, max)).filter(Boolean).slice(0, n) : []);
  return {
    topic: str(c.topic, 80) || "General", term, full: str(c.full, 160), definition: str(c.definition, 700), simple,
    hook: str(c.hook, 400), example: str(c.example, 700), answer: str(c.answer, 500) || simple,
    traps: arr(c.traps, 3, 500), confuse: str(c.confuse, 400), related: arr(c.related, 6, 100),
    formula: str(c.formula, 240), question: str(c.question, 300),
    // "pair" card: 2-3 small look-alike terms learned together
    parts: Array.isArray(c.parts) ? c.parts.filter((p) => p && p.term).slice(0, 3).map((p) => ({ term: str(p.term, 100), simple: str(p.simple || p.definition, 300), example: str(p.example, 400), scenario: str(p.scenario, 400) })) : [],
  };
}
export function cleanQuestion(q) {
  if (!q || typeof q !== "object") return null;
  const text = str(q.question || q.q, 600);
  const choices = Array.isArray(q.choices) ? q.choices.map((t) => str(t, 400)).filter(Boolean).slice(0, 5) : [];
  if (!text || choices.length < 2) return null;
  let answer = -1;
  if (typeof q.answer === "number") answer = q.answer;
  else if (typeof q.answer === "string") {
    const a = q.answer.trim().toLowerCase();
    answer = choices.findIndex((c) => c.toLowerCase() === a);
    if (answer < 0 && /^[a-e]$/i.test(a)) answer = a.charCodeAt(0) - 97;
    if (answer < 0) answer = choices.findIndex((c) => c.toLowerCase().includes(a) || a.includes(c.toLowerCase()));
  }
  if (answer < 0 || answer >= choices.length) return null;
  return { topic: str(q.topic, 80) || "General", q: text, choices, answer, why: str(q.why, 500) };
}
