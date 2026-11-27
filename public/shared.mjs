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
// Tricky words (missed at least once, ever) never get the longest gaps: they top out at 4 days.
export const TRICKY_MAX_BOX = 3;
export const isTricky = (p) => (p?.wrong_count || 0) > 0;
export function nextReview(prevBox, ok, mode, day, examDate, tricky = false) {
  const top = tricky || !ok ? TRICKY_MAX_BOX : 5;
  const box = mode === "learn" ? (ok ? 1 : 0) : ok ? Math.min(top, (prevBox ?? 0) + 1) : 0;
  let due = addDays(day, INTERVALS[box]);
  if (isDay(examDate) && day < examDate) {
    const sweep = addDays(examDate, -1 - (box % 3));
    if (due > sweep) due = sweep > day ? sweep : addDays(day, 1);
  }
  return { box, due };
}

// ---------- "Know it" score: how well you know each word, 0 to 10 ----------
// Built from: right vs wrong (recent answers count more), how many times and over how many
// days you've been tested (one right answer the day you learn it can't be a 10), whether the
// LAST answer was wrong (then it's 4 at most), and how long since you last saw it (it slowly
// fades, faster for newer words). Answer speed is never used.
// hist = last 20 answers, oldest first, "1" right / "0" wrong. last_seen = day of the last answer.
export const HIST_MAX = 20;
export const addHist = (hist, ok) => (String(hist || "") + (ok ? "1" : "0")).slice(-HIST_MAX);
export function mastery(p, today) {
  if (!p?.learned_at) return null;
  let hist = String(p.hist || "").replace(/[^01]/g, "");
  const right = p.right_count || 0, wrong = p.wrong_count || 0;
  let acc, n, lastWrong;
  if (hist) {
    let sw = 0, so = 0;
    for (let i = hist.length - 1, w = 1; i >= 0; i--, w *= 0.85) { sw += w; if (hist[i] === "1") so += w; }
    acc = so / sw; n = Math.max(hist.length, Math.min(right + wrong, 40)); lastWrong = hist.endsWith("0");
  } else {
    // Older words saved before the score existed: use the totals.
    n = right + wrong;
    acc = n ? right / n : (p.box || 0) >= 1 ? 1 : 0.5;
    n = Math.max(n, 1); lastWrong = wrong > 0 && (p.box || 0) === 0;
  }
  // Answers spread over more days count for more than many answers in one sitting.
  const span = p.learned_at && today ? Math.max(0, daysBetween(p.learned_at, p.last_seen || today)) : 0;
  const nEff = Math.min(n, 2 + 1.5 * span);
  const sure = 1 - Math.pow(0.5, nEff / 1.5);
  let s = 5 + (10 * acc - 5) * sure;
  if (lastWrong) s = Math.min(s, 4);
  // Fading: past its normal review gap, the score drops a little each day you don't see it.
  const seen = p.last_seen || (p.due && isDay(p.due) ? addDays(p.due, -INTERVALS[Math.min(5, p.box || 0)]) : p.learned_at);
  if (today && isDay(seen)) {
    const gap = INTERVALS[Math.min(5, p.box || 0)], away = daysBetween(seen, today);
    if (away > gap) s -= Math.min(5, (2 * (away - gap)) / (gap + 2));
  }
  return Math.max(0, Math.min(10, Math.round(s * 10) / 10));
}
export const masteryLevel = (m) => (m == null ? null : m >= 8.5 ? "mastered" : m >= 6.5 ? "good" : m >= 3.5 ? "getting" : "shaky");
export const LEVEL_NAMES = { mastered: "Mastered", good: "Good", getting: "Getting there", shaky: "Shaky" };
export const lastSeen = (p) => p?.last_seen || null;
// Time to see this word again? The weaker it is, the sooner: 1 day for shaky words up to ~12 days for mastered ones.
export function retestGap(m) { return m == null ? 0 : m < 4 ? 1 : m < 6 ? 2 : m < 7.5 ? 3 : m < 8.5 ? 5 : m < 9.5 ? 8 : 12; }
export function needsRetest(p, today) {
  if (!p?.learned_at) return false;
  const seen = p.last_seen || p.learned_at;
  return daysBetween(seen, today) >= retestGap(mastery(p, today));
}
// How much a word needs practice right now (lower = needs it more). Used to order everything.
export function needScore(p, today) {
  const m = mastery(p, today);
  if (m == null) return 20;
  const seen = p.last_seen || p.learned_at, away = isDay(seen) ? daysBetween(seen, today) : 0;
  return m - Math.min(4, away / Math.max(1, retestGap(m))) + (p.due && p.due <= today ? -1 : 0);
}
// After an answer: a weak word comes back sooner than its normal review date.
export function pullDue(due, m, day) {
  const cap = m == null ? null : m <= 4 ? addDays(day, 1) : m <= 6 ? addDays(day, 2) : m <= 7.5 ? addDays(day, 4) : null;
  return cap && (!due || cap < due) ? cap : due;
}

// Game best scores, saved on the class so they follow your account. Higher is better in every game.
export const GAME_KINDS = ["fall", "match", "sort", "tf", "boss"];
const LOWER_BETTER = {};
export function parseBest(json) { try { const o = JSON.parse(json || "{}"); return o && typeof o === "object" ? o : {}; } catch { return {}; } }
export function mergeBest(json, kind, score) {
  const o = parseBest(json), n = Number(score);
  if (!GAME_KINDS.includes(kind) || !Number.isFinite(n) || n < 0 || n > 1e6) return o;
  const prev = o[kind];
  if (prev == null || (LOWER_BETTER[kind] ? n < prev : n > prev)) o[kind] = Math.round(n * 10) / 10;
  return o;
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
  // Lowest "Know it" score + longest since you saw it first.
  const score = (c) => needScore(progress[c.id], today) - (isTricky(progress[c.id]) ? 0.5 : 0) + Math.random() * 1.2;
  const sorted = [...pool].sort((a, b) => score(a) - score(b));
  const out = sorted.slice(0, Math.max(0, n - 1));
  // Plus one word you know well that you haven't seen in the longest time, so nothing is forgotten.
  const seen = (c) => progress[c.id].last_seen || progress[c.id].learned_at || "";
  const strong = pool.filter((c) => (mastery(progress[c.id], today) ?? 0) >= 6.5 && !out.includes(c)).sort((a, b) => seen(a).localeCompare(seen(b)));
  const extra = strong.length ? strong[0] : sorted[n - 1];
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
export function buildLessons(cards, big = null) {
  const keys = [], groups = {};
  for (const c of cards) {
    const k = (c.added_day || "") + "|" + (c.topic || "General");
    if (!groups[k]) { groups[k] = []; keys.push(k); }
    groups[k].push(c);
  }
  const lessons = [];
  for (const k of keys) {
    const ws = groups[k];
    // Catching up after a missed day: words you haven't learned yet go in bigger lessons (big.size words).
    const parts = big ? [[ws.filter(big.isOld), 5], [ws.filter((c) => !big.isOld(c)), big.size]] : [[ws, 5]];
    const chunks = [];
    for (const [list, max] of parts) {
      if (!list.length) continue;
      // Normal: lessons of at most 5. Catch-up: about `max` words each, never more than 10.
      let n = max === 5 ? Math.ceil(list.length / 5) : Math.max(1, Math.round(list.length / max));
      while (Math.ceil(list.length / n) > Math.max(5, CATCHUP_MAX_WORDS)) n++;
      const size = Math.ceil(list.length / n);
      for (let i = 0; i < n; i++) chunks.push(list.slice(i * size, (i + 1) * size));
    }
    chunks.forEach((cs, i) => lessons.push({ topic: ws[0].topic || "General", batch: ws[0].added_day || "", part: chunks.length > 1 ? i + 1 : 0, cards: cs }));
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
// Lessons + today's plan. Missed a day? Keep the same number of lessons a day you were doing,
// and put the missed words into your next lessons instead (a few extra words each, max 9).
export const CATCHUP_MAX_WORDS = 10;
// Lots of time and only a few lessons left (and no more notes coming)? Make the lessons you haven't
// started smaller (down to 3 words) so they spread across the days before the exam instead of
// finishing weeks early. Words you've already learned keep their lessons.
function stretched(course, cards, progress, today, lessons, plan) {
  if (plan.phase !== "learn" || plan.more || plan.perDay !== 1 || !plan.left) return null;
  const exam = isDay(course.exam_date) ? course.exam_date : null;
  const deadline = exam ? addDays(exam, -Math.max(0, course.review_days ?? 3) - 1) : isDay(course.finish_by) ? course.finish_by : null;
  if (!deadline) return null;
  const avail = daysBetween(today, deadline) + 1, startLeft = plan.left + plan.todayDone;
  if (avail <= startLeft + 1) return null; // already fills the time
  const isOld = (c) => !!progress[c.id]?.learned_at && progress[c.id].learned_at < today;
  const wordsLeft = cards.filter((c) => !isOld(c)).length;
  const size = Math.max(3, Math.min(5, Math.ceil(wordsLeft / avail)));
  if (size >= 5) return null;
  const small = buildLessons(cards, { size, isOld });
  const sp = planFor(course, small, progress, today);
  if (sp.total <= lessons.length) return null;
  return { lessons: small, plan: { ...sp, stretch: size } };
}
export function lessonsAndPlan(course, cards, progress, today) {
  const r = catchUpPlan(course, cards, progress, today);
  return (!r.plan.catchup && stretched(course, cards, progress, today, r.lessons, r.plan)) || r;
}
function catchUpPlan(course, cards, progress, today) {
  let lessons = buildLessons(cards), plan = planFor(course, lessons, progress, today);
  if (plan.phase !== "learn" || !plan.left) return { lessons, plan };
  const studied = Object.values(progress).map((p) => p?.learned_at).filter((d) => d && d < today);
  if (!studied.length) return { lessons, plan };
  const last = studied.reduce((a, b) => (b > a ? b : a));
  if (daysBetween(last, today) < 2) return { lessons, plan }; // didn't miss a day
  // The pace you were on the last day you studied this class.
  const before = {}; for (const [id, p] of Object.entries(progress)) if (p?.learned_at && p.learned_at < last) before[id] = p;
  const pace = planFor(course, buildLessons(cards), before, last).perDay || 1;
  if (plan.perDay <= pace) return { lessons, plan };
  const isOld = (c) => !!progress[c.id]?.learned_at && progress[c.id].learned_at < today;
  const wordsLeft = cards.filter((c) => !isOld(c)).length;
  const startLeftLessons = Math.round(plan.left + plan.todayDone);
  const target = Math.max(1, Math.ceil((startLeftLessons * pace) / plan.perDay));
  const size = Math.min(CATCHUP_MAX_WORDS, Math.max(6, Math.ceil(wordsLeft / target)));
  const bigLessons = buildLessons(cards, { size, isOld });
  const bigPlan = planFor(course, bigLessons, progress, today);
  if (bigPlan.perDay >= plan.perDay) return { lessons, plan }; // didn't help
  bigPlan.catchup = { extra: size - 5, pace: bigPlan.perDay };
  bigPlan.label = `Catching up: ${bigPlan.perDay} lesson${bigPlan.perDay > 1 ? "s" : ""} a day with a few extra words · ${bigPlan.label.replace(/^\d+ lessons? \(~\d+ words\) a day · /, "")}`;
  return { lessons: bigLessons, plan: bigPlan };
}

export function summarize(course, cards, progress, today) {
  let { lessons, plan: p } = lessonsAndPlan(course, cards, progress, today);
  // A finished class: keeps its words (for cram, games, practice exams) but has no more daily lessons or reviews.
  if (course.archived) p = { ...p, perDay: 0, todayLeft: 0, todayDone: 0, phase: "finished", more: null, label: "Finished · no daily lessons. Cram or test yourself anytime" };
  let learned = 0, due = 0, strong = 0, tricky = 0, retest = 0;
  const know = { mastered: 0, good: 0, getting: 0, shaky: 0 };
  for (const c of cards) {
    const pr = progress[c.id];
    if (pr?.learned_at) { learned++; if (pr.due && pr.due <= today) due++; else if (needsRetest(pr, today)) retest++; know[masteryLevel(mastery(pr, today))]++; }
    if ((pr?.box || 0) >= 2) strong++;
    if (isTricky(pr)) tricky++;
  }
  return {
    id: course.id, name: course.name, color: course.color || 0, exam_date: course.exam_date || null,
    review_days: course.review_days ?? 3, finish_by: course.finish_by || null, as_you_go: course.as_you_go ? 1 : 0, keep_up_days: course.keep_up_days ?? 3,
    missed: mergeMissed(course.missed, [], []).filter((id) => cards.some((k) => k.id === id)).length,
    more_total: course.more_total ?? null, more_have: course.more_have ?? null, more_every: course.more_every || null, more_share: course.more_share ?? null, notes_done: course.notes_done ? 1 : 0,
    archived: course.archived ? 1 : 0,
    total: cards.length, learned, due: course.archived ? 0 : due, retest: course.archived ? 0 : retest, strong, tricky, know, lessons: lessons.length, plan: p,
    next: course.archived ? null : (() => { const l = lessons.find((x) => !x.cards.every((c) => progress[c.id]?.learned_at)); return l ? { n: l.n, topic: l.topic, words: l.cards.length } : null; })(),
  };
}

// ---------- cleaning what the AI sent ----------
const str = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : typeof v === "number" ? String(v) : "");
// Missed-words list for ONE subject: add new misses, drop ones you got right. Newest first, max 500.
export function mergeMissed(list, add, remove) {
  let cur = list;
  if (typeof cur === "string") { try { cur = JSON.parse(cur); } catch { cur = []; } }
  if (!Array.isArray(cur)) cur = [];
  const rm = new Set((Array.isArray(remove) ? remove : []).map(String));
  const ad = (Array.isArray(add) ? add : []).map(String).filter((x) => !rm.has(x));
  return [...new Set([...ad, ...cur.map(String)])].filter((x) => !rm.has(x)).slice(0, 500);
}
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
    formula: str(c.formula, 240), question: str(c.question, 300), scenario: str(c.scenario, 500),
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
