/* Study Mania — app screens */
import { addDays, daysBetween, niceDate, buildLessons, planFor, pickThrowbacks, secondReminderHour } from "./shared.mjs";
import { localApi, hasGuestData, guestExport, clearGuest } from "./local.mjs";

// ---------- helpers ----------
const app = document.getElementById("app");
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pad = (n) => String(n).padStart(2, "0");
const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const daysUntil = (day) => daysBetween(todayStr(), day);
const tz = () => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return "America/New_York"; } };
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  del(k) { try { localStorage.removeItem(k); } catch {} },
};
const COLORS = 8;
const colorVar = (i) => `var(--c${(i || 0) % COLORS})`;
const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));

// Daily goal = lessons finished today. Once every lesson in every subject is learned,
// review rounds and practice exams count instead (there's nothing new left to learn).
function goalInfo() {
  const t = ME.today, goal = ME.user.daily_goal, lessonsLeft = ME.courses.some((c) => c.next);
  const did = lessonsLeft ? t.lessons || 0 : t.rounds || 0;
  return { goal, did, unit: lessonsLeft ? "lesson" : "round", done: did >= goal };
}
// "Skip review for today": reviews come back tomorrow.
const skipKey = () => "sm-skiprev-" + todayStr();
const reviewSkipped = (cid) => store.get(skipKey(), []).includes(cid);
const skipReview = (cid) => store.set(skipKey(), [...new Set([...store.get(skipKey(), []), cid])]);
const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const standalone = matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;

// ---------- light / dark ----------
const prefersDark = () => matchMedia("(prefers-color-scheme: dark)").matches;
const themeNow = () => document.documentElement.dataset.theme || (prefersDark() ? "dark" : "light");
function applyTheme(t) {
  if (t) document.documentElement.dataset.theme = t; else delete document.documentElement.dataset.theme;
  const meta = document.querySelector('meta[name="theme-color"]:not([media])') || Object.assign(document.head.appendChild(document.createElement("meta")), { name: "theme-color" });
  meta.content = themeNow() === "dark" ? "#14161c" : "#eef1f4";
}
function toggleTheme() { const next = themeNow() === "dark" ? "light" : "dark"; store.set("sm-theme", next); applyTheme(next); document.querySelectorAll(".theme-btn").forEach((b) => (b.innerHTML = themeIcon())); }
const themeIcon = () => (themeNow() === "dark" ? "☀️" : "🌙");
applyTheme(store.get("sm-theme", null));

function toast(msg, ms = 2800) {
  const t = $("toast");
  t.textContent = msg; t.hidden = false;
  clearTimeout(toast._t); toast._t = setTimeout(() => (t.hidden = true), ms);
}

let GUEST = store.get("sm-guest", false);
const PUBLIC_PATHS = ["/signup", "/login", "/logout", "/config", "/forgot", "/reset", "/recover/questions", "/recover/reset", "/leaderboard", "/username-check", "/import"];

async function api(path, opts = {}) {
  const method = opts.method || "GET";
  if (GUEST && !PUBLIC_PATHS.includes(path.split("?")[0])) return localApi(path, method, opts.body, todayStr());
  const sep = path.includes("?") ? "&" : "?";
  let res;
  try {
    res = await fetch(`/api${path}${sep}day=${todayStr()}`, {
      method, headers: opts.body ? { "content-type": "application/json" } : {},
      body: opts.body ? JSON.stringify(opts.body) : undefined, credentials: "same-origin",
    });
  } catch { throw Object.assign(new Error("No connection. Check your signal and try again."), { status: 0 }); }
  let data = {};
  try { data = await res.json(); } catch {}
  if (!res.ok) throw Object.assign(new Error(data.error || "Couldn't reach Study Mania. Try again."), { status: res.status });
  return data;
}
let CONFIG = null;
const config = async () => (CONFIG ||= await api("/config").catch(() => ({ email_reset: false, push: false })));

// ---------- feel-good effects ----------
let audioCtx = null;
function chime(kind) {
  if (!store.get("sm-sound", true)) return;
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const notes = kind === "good" ? [660, 990] : kind === "win" ? [523, 659, 784, 1047] : [220, 180];
    notes.forEach((f, i) => {
      const o = audioCtx.createOscillator(), g = audioCtx.createGain(), t = audioCtx.currentTime + i * 0.09;
      o.type = kind === "bad" ? "triangle" : "sine"; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(kind === "bad" ? 0.06 : 0.09, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
      o.connect(g).connect(audioCtx.destination); o.start(t); o.stop(t + 0.3);
    });
  } catch {}
}
const buzz = (p) => { try { navigator.vibrate && navigator.vibrate(p); } catch {} };
function confetti(power = 1) {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const cv = $("fx"), ctx = cv.getContext("2d"), r = devicePixelRatio || 1;
  const W = (cv.width = innerWidth * r), H = (cv.height = innerHeight * r);
  const cs = getComputedStyle(document.documentElement);
  const cols = ["--accent", "--gold", "--flame", "--c1", "--c4"].map((v) => cs.getPropertyValue(v).trim());
  const parts = Array.from({ length: Math.round(120 * power) }, () => ({
    x: W / 2 + (Math.random() - 0.5) * W * 0.3, y: H * 0.42, vx: (Math.random() - 0.5) * 26 * r, vy: (-Math.random() * 26 - 10) * r,
    s: (6 + Math.random() * 8) * r, a: Math.random() * 6, va: (Math.random() - 0.5) * 0.4, c: cols[(Math.random() * cols.length) | 0],
  }));
  let f = 0;
  (function tick() {
    ctx.clearRect(0, 0, W, H);
    for (const p of parts) {
      p.vy += 0.9 * r; p.vx *= 0.985; p.x += p.vx; p.y += p.vy; p.a += p.va;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a); ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); ctx.restore();
    }
    if (++f < 150) requestAnimationFrame(tick); else ctx.clearRect(0, 0, W, H);
  })();
}
function countUp(el, to, ms = 900) {
  const s = performance.now();
  (function step(t) { const k = Math.min(1, (t - s) / ms); el.textContent = Math.round(to * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(step); })(s);
}

// ---------- state ----------
let ME = null;
const courseCache = {};
let MISSES = {}; // courseId -> card ids missed on the last practice exam

async function loadMe() { ME = await api("/me"); return ME; }
async function loadCourse(id) {
  const d = await api(`/courses/${id}`);
  d.lessons = buildLessons(d.cards);
  courseCache[id] = d;
  return d;
}
const isLearned = (d, k) => !!d.progress[k.id]?.learned_at;
const lessonDone = (d, l) => l.cards.every((k) => isLearned(d, k));
const examText = (c) => {
  if (!c.exam_date) return c.finish_by ? `Finish by ${niceDate(c.finish_by)}` : "";
  const n = daysUntil(c.exam_date);
  return n > 1 ? `Exam in ${n} days` : n === 1 ? "Exam tomorrow" : n === 0 ? "Exam today" : "Exam done";
};

// ---------- offline outbox (account mode) ----------
async function postStudy(body) {
  body.round_id ||= uid();
  try { return await api("/study", { method: "POST", body }); }
  catch (e) {
    if (GUEST || (e.status && e.status < 500)) throw e;
    const q = store.get("sm-outbox", []); q.push({ body, day: todayStr() }); store.set("sm-outbox", q);
    return null;
  }
}
async function flushOutbox() {
  if (GUEST) return;
  const q = store.get("sm-outbox", []);
  if (!q.length) return;
  const left = [];
  for (const it of q) {
    try { const r = await fetch(`/api/study?day=${it.day}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(it.body), credentials: "same-origin" }); if (r.status >= 500) throw 0; }
    catch { left.push(it); }
  }
  store.set("sm-outbox", left);
}

// ---------- router ----------
const routes = [];
const route = (re, fn, isPublic) => routes.push([re, fn, isPublic]);
let cleanupFns = [];
async function render() {
  const h = location.hash.slice(1) || "/";
  cleanupFns.forEach((f) => f()); cleanupFns = [];
  document.querySelectorAll(".sheet").forEach((s) => s.remove());
  window.scrollTo(0, 0);
  const r = routes.find(([re]) => re.test(h));
  if (!r) return go("/");
  if (!r[2] && !ME) {
    try { await loadMe(); }
    catch (e) { if (e.status === 401) return go("/welcome"); return offlineView(e); }
  }
  r[1](...h.match(r[0]).slice(1));
}
const go = (h) => { if (location.hash === "#" + h) render(); else location.hash = h; };
window.addEventListener("hashchange", render);
function offlineView(e) {
  app.innerHTML = `<div class="cele"><div class="big-emoji">📡</div><h2>Can't reach Study Mania</h2><p class="muted">${esc(e.message)}</p><button class="btn primary" id="retry">Try again</button></div>`;
  $("retry").onclick = render;
}
function sheet(html, { onClose, wide } = {}) {
  const el = document.createElement("div");
  el.className = "sheet"; el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true");
  el.innerHTML = `<div class="sheet-in">${html}</div>`;
  el.addEventListener("click", (e) => { if (e.target === el) { el.remove(); onClose && onClose(); } });
  document.body.appendChild(el);
  return el;
}

// ---------- welcome / sign in / create account ----------
const SAVE_NOTE_ACCOUNT = `<div class="notice ok"><b>✓ An account saves everything.</b> Use it on your phone and computer, and your progress follows you. If you study in a private or incognito window, you'll just need to sign in each time.</div>`;

function authView(mode, { upgrade } = {}) {
  const draw = () => {
    app.innerHTML = `
    ${upgrade ? `<div class="topbar"><a class="iconbtn" href="#/settings" aria-label="Back">‹</a><span></span></div>` : `
    <div class="hero">
      <span class="logo" role="img" aria-label="Study Mania"><img class="lg-light" src="/logo-light.png" alt=""><img class="lg-dark" src="/logo-dark.png" alt=""></span>
      <p class="muted">Turn your class notes into bite-size lessons. Do one or two a day, and walk into the exam already knowing it.</p>
      <p class="notice small" style="margin:0">📲 <b style="display:inline">Best on your phone.</b> After you sign up, add Study Mania to your home screen and turn on reminders. <a href="#" id="w-how" style="font-weight:700">How?</a></p>
    </div>
    <div class="how card">
      <div><i>1</i><p>Copy our prompt and paste it with your notes into any AI: ChatGPT, Claude, Gemini, Grok.</p></div>
      <div><i>2</i><p>Paste the AI's reply back here. It becomes lessons, quizzes and practice exams.</p></div>
      <div><i>3</i><p>Do a little each day, keep your streak, and ace the exam.</p></div>
    </div>`}
    <form class="stack" id="auth" style="margin-top:18px" novalidate>
      ${upgrade ? `<h1>Save your progress</h1><p class="muted">Create an account and everything you've done on this device moves into it.</p>` : `
      <div class="tabs" role="group" aria-label="Account">
        <button type="button" id="t-up" aria-pressed="${mode === "signup"}">Create account</button>
        <button type="button" id="t-in" aria-pressed="${mode === "login"}">Sign in</button>
      </div>`}
      ${mode === "signup" ? `
      <label class="field">Username<input id="f-user" autocomplete="username" autocapitalize="none" spellcheck="false" placeholder="studyking22" maxlength="20">
        <span class="small" id="f-user-msg" style="font-weight:400;color:var(--muted)">Shows on the leaderboard. You can sign in with it too.</span></label>
      <label class="field">First name <span class="muted small" style="font-weight:400">(optional)</span><input id="f-name" autocomplete="given-name" placeholder="Alex"></label>
      <label class="field">Email<input id="f-email" type="email" autocomplete="email" inputmode="email" required></label>` : `
      <label class="field">Username or email<input id="f-login" autocomplete="username" autocapitalize="none" spellcheck="false" required></label>`}
      <label class="field">Password<input id="f-pass" type="password" autocomplete="${mode === "signup" ? "new-password" : "current-password"}" minlength="8" required>
        ${mode === "signup" ? `<span class="muted small" style="font-weight:400">At least 8 characters.</span>` : ""}</label>
      <p class="err" id="f-err" hidden></p>
      <button class="btn primary block" id="f-go">${mode === "signup" ? "Create account" : "Sign in"}</button>
      ${mode === "login" ? `<a class="btn ghost" href="#/forgot">Forgot password?</a>` : ""}
      ${SAVE_NOTE_ACCOUNT}
    </form>
    ${upgrade ? "" : `<div class="or"><span>or</span></div>
    <button class="btn block" id="guest">Use without an account</button>
    <p class="muted small" style="text-align:center;margin-top:8px">Saves only on this device. You can make an account later.</p>
    <section class="more-apps" aria-labelledby="more-apps-h">
      <h2 id="more-apps-h">More apps by CBM Studios</h2>
      <a class="app-link" href="https://fantasymania.org/" target="_blank" rel="noopener"><img src="/icons/app-fantasy.png" alt="" width="44" height="44"><span><b>Fantasy Mania</b><small>Free fantasy football ratings, projections and trade help.</small></span><i>Open</i></a>
      <a class="app-link" href="https://retrobaseball.pages.dev/" target="_blank" rel="noopener"><img src="/icons/app-retro.png" alt="" width="44" height="44"><span><b>Retro Baseball</b><small>Play a retro baseball game.</small></span><i>Open</i></a>
    </section>`}`;
    if (!upgrade) {
      $("t-up").onclick = () => { mode = "signup"; draw(); };
      $("t-in").onclick = () => { mode = "login"; draw(); };
      $("guest").onclick = guestSheet;
      if ($("w-how")) $("w-how").onclick = (e) => { e.preventDefault(); homeScreenSheet(); };
    }
    $("auth").onsubmit = async (e) => {
      e.preventDefault();
      const btn = $("f-go"), er = $("f-err");
      btn.disabled = true; er.hidden = true;
      const wasGuest = GUEST, hadData = hasGuestData();
      try {
        GUEST = false; // talk to the server for this
        await api(mode === "signup" ? "/signup" : "/login", { method: "POST", body: mode === "signup"
          ? { email: $("f-email").value, username: $("f-user").value, password: $("f-pass").value, name: $("f-name").value, tz: tz() }
          : { login: $("f-login").value, password: $("f-pass").value, tz: tz() } });
        store.set("sm-guest", false);
        if (hadData && (upgrade || mode === "signup")) await importGuest();
        await loadMe();
        if (hadData && mode === "login") return offerImport();
        if (mode === "signup") return securitySheet(true, () => go(ME.courses.length ? "/" : "/add"));
        go(ME.courses.length ? "/" : "/add");
      } catch (x) { GUEST = wasGuest; er.textContent = x.message; er.hidden = false; btn.disabled = false; }
    };
    if ($("f-user")) wireUsernameCheck($("f-user"), $("f-user-msg"));
  };
  draw();
}

// Live "is this username free?" check while typing.
function wireUsernameCheck(input, msg, current) {
  let t;
  input.addEventListener("input", () => {
    clearTimeout(t);
    const v = input.value.trim().replace(/^@/, "").toLowerCase();
    if (!v || v === current) { msg.textContent = current ? "That's your username now." : "Shows on the leaderboard. You can sign in with it too."; msg.style.color = "var(--muted)"; return; }
    t = setTimeout(async () => {
      try {
        const r = await api(`/username-check?u=${encodeURIComponent(v)}`);
        msg.textContent = r.ok ? `✓ @${v} is free` : r.reason; msg.style.color = r.ok ? "var(--good)" : "var(--bad)";
      } catch {}
    }, 350);
  });
}

// Accounts made before usernames existed pick one the first time they open the app.
function usernameSheet(done) {
  const el = sheet(`<h2>Pick a username</h2><p class="muted">It shows on the leaderboard, and you can sign in with it instead of your email.</p>
    <label class="field">Username<input id="u-new" autocapitalize="none" spellcheck="false" maxlength="20" placeholder="studyking22"><span class="small" id="u-msg" style="font-weight:400;color:var(--muted)">3-20 letters, numbers, _ or .</span></label>
    <button class="btn primary block" id="u-save">Save username</button>`);
  wireUsernameCheck(el.querySelector("#u-new"), el.querySelector("#u-msg"));
  el.onclick = null; // can't skip by tapping outside
  el.querySelector("#u-save").onclick = async () => {
    try { const r = await api("/me", { method: "PATCH", body: { username: el.querySelector("#u-new").value } }); ME.user = { ...ME.user, ...r.user }; el.remove(); toast(`You're @${ME.user.username}.`); done && done(); }
    catch (e) { const m = el.querySelector("#u-msg"); m.textContent = e.message; m.style.color = "var(--bad)"; }
  };
}
route(/^\/welcome$/, () => authView("signup"), true);
route(/^\/join$/, () => authView("signup", { upgrade: true }), true);

function guestSheet() {
  const el = sheet(`<h2>Use it without an account</h2>
    <div class="scroll">
      <div class="notice warn"><b>Your progress saves only on this device, in this browser.</b> It won't show up on your other phone or computer.</div>
      <div class="notice"><b>🕶️ Don't use a private or incognito window.</b> Everything gets erased the moment you close it.</div>
      <div class="notice"><b>📲 Adding it to your home screen? Do that first.</b> Then always open Study Mania from the home screen icon. ${isIOS ? "On iPhone, the home screen app and Safari keep separate data, so anything you do in Safari won't be there." : "Stick to one place so your progress stays together."}</div>
      <div class="notice"><b>🧹 Clearing your browser history or site data deletes it.</b> Your phone can also clear it if storage gets full or you don't open it for weeks.</div>
      <div class="notice"><b>🔔 No daily reminders</b> without an account.</div>
      <div class="notice ok">You can create an account any time and keep everything you've done.</div>
    </div>
    <label class="checkrow"><input type="checkbox" id="g-ok"> I get it. This device only.</label>
    <button class="btn primary block" id="g-go" disabled>Start without an account</button>`);
  el.querySelector("#g-ok").onchange = (e) => (el.querySelector("#g-go").disabled = !e.target.checked);
  el.querySelector("#g-go").onclick = async () => {
    GUEST = true; store.set("sm-guest", true);
    try { await navigator.storage?.persist?.(); } catch {}
    el.remove(); await loadMe(); go(ME.courses.length ? "/" : "/add");
  };
}

async function importGuest() {
  const g = guestExport();
  const days = Object.entries(g.days || {}).map(([day, v]) => ({ day, ...v }));
  await api("/import", { method: "POST", body: { courses: g.courses, days, user: g.user } });
  clearGuest();
  toast("Your progress moved into your account.");
}
function offerImport() {
  const n = guestExport().courses.length;
  const el = sheet(`<h2>Bring your subjects over?</h2><p class="muted">This device has ${plural(n, "subject")} you made without an account. Add them to this account so they sync everywhere?</p>
    <button class="btn primary block" id="i-yes">Add them to my account</button><button class="btn block" id="i-no">Leave them on this device</button>`);
  el.querySelector("#i-yes").onclick = async () => { try { await importGuest(); await loadMe(); } catch (e) { toast(e.message); } el.remove(); go("/"); };
  el.querySelector("#i-no").onclick = () => { el.remove(); go("/"); };
}

// ---------- security questions ----------
const SEC_QUESTIONS = [
  "What was the name of your first pet?",
  "What is your mom's maiden name?",
  "What city were you born in?",
  "What was the name of your elementary school?",
  "What was your childhood best friend's first name?",
  "What street did you grow up on?",
  "What was the make and model of your first car?",
  "What is the middle name of your oldest sibling?",
  "What was the first concert you went to?",
  "What was your favorite teacher's last name?",
  "What was the name of your first stuffed animal?",
  "What was your first job?",
];
function securitySheet(afterSignup, done) {
  const opts = (sel) => SEC_QUESTIONS.map((q) => `<option ${q === sel ? "selected" : ""}>${esc(q)}</option>`).join("");
  const el = sheet(`<h2>${afterSignup ? "Set up password recovery" : "Security questions"}</h2>
    <p class="muted">If you ever forget your password, answering these lets you reset it. Pick answers your friends wouldn't know. Capital letters and spaces don't matter.</p>
    <div class="scroll">
      <label class="field">Question 1<select id="q1">${opts(SEC_QUESTIONS[0])}</select></label>
      <label class="field">Answer<input id="a1" autocomplete="off"></label>
      <label class="field">Question 2<select id="q2">${opts(SEC_QUESTIONS[5])}</select></label>
      <label class="field">Answer<input id="a2" autocomplete="off"></label>
      <p class="err" id="s-err" hidden></p>
    </div>
    <button class="btn primary block" id="s-save">Save</button>
    ${afterSignup ? `<button class="btn ghost" id="s-skip">Skip for now</button>` : ""}`, { onClose: done });
  const q = (s) => el.querySelector(s);
  q("#s-save").onclick = async () => {
    try {
      await api("/me/security", { method: "POST", body: { q1: q("#q1").value, a1: q("#a1").value, q2: q("#q2").value, a2: q("#a2").value } });
      ME.user.has_security = true; el.remove(); toast("Recovery questions saved."); done && done();
    } catch (e) { q("#s-err").textContent = e.message; q("#s-err").hidden = false; }
  };
  if (q("#s-skip")) q("#s-skip").onclick = () => { el.remove(); done && done(); };
}

// ---------- forgot password ----------
route(/^\/forgot$/, async () => {
  const cfg = await config();
  let email = "", qs = null;
  const draw = (msg) => {
    app.innerHTML = `<div class="topbar"><a class="iconbtn" href="#/welcome" aria-label="Back">‹</a><span></span></div>
    <div class="stack">
      <h1>Forgot your password?</h1>
      ${!qs ? `
        <label class="field">Your username or email<input id="r-email" autocapitalize="none" spellcheck="false" autocomplete="username" value="${esc(email)}"></label>
        <p class="err" id="r-err" ${msg ? "" : "hidden"}>${esc(msg || "")}</p>
        ${cfg.email_reset ? `<button class="btn primary block" id="r-mail">Email me a reset link</button>` : ""}
        <button class="btn ${cfg.email_reset ? "" : "primary"} block" id="r-qs">Answer my security questions</button>
        <p class="muted small">${cfg.email_reset ? "The link works for 30 minutes. Check your spam folder too." : ""}</p>` : `
        <p class="muted">Answer your security questions, then pick a new password.</p>
        <label class="field">${esc(qs[0])}<input id="r-a1" autocomplete="off"></label>
        <label class="field">${esc(qs[1])}<input id="r-a2" autocomplete="off"></label>
        <label class="field">New password<input id="r-pass" type="password" autocomplete="new-password" minlength="8"><span class="muted small" style="font-weight:400">At least 8 characters.</span></label>
        <p class="err" id="r-err" ${msg ? "" : "hidden"}>${esc(msg || "")}</p>
        <button class="btn primary block" id="r-save">Reset password</button>`}
    </div>`;
    const fail = (e) => { draw(e.message); };
    if (!qs) {
      if ($("r-mail")) $("r-mail").onclick = async () => {
        email = $("r-email").value.trim();
        try { await api("/forgot", { method: "POST", body: { login: email } }); app.querySelector(".stack").innerHTML = `<h1>Check your email</h1><p class="muted">If that account exists, a reset link is on its way to its email. It works for 30 minutes.</p><a class="btn block" href="#/welcome">Back to sign in</a>`; }
        catch (e) { fail(e); }
      };
      $("r-qs").onclick = async () => {
        email = $("r-email").value.trim();
        try { qs = (await api("/recover/questions", { method: "POST", body: { login: email } })).questions; draw(); }
        catch (e) { fail(e); }
      };
    } else {
      $("r-save").onclick = async () => {
        try {
          GUEST = false; store.set("sm-guest", false);
          await api("/recover/reset", { method: "POST", body: { login: email, answers: [$("r-a1").value, $("r-a2").value], password: $("r-pass").value } });
          await loadMe(); toast("Password reset. You're signed in."); go("/");
        } catch (e) { const a1 = $("r-a1").value, a2 = $("r-a2").value; draw(e.message); $("r-a1").value = a1; $("r-a2").value = a2; }
      };
    }
  };
  draw();
}, true);

route(/^\/reset\/([a-f0-9]+)$/, (token) => {
  app.innerHTML = `<div class="stack" style="padding-top:30px"><h1>Pick a new password</h1>
    <label class="field">New password<input id="n-pass" type="password" autocomplete="new-password" minlength="8"><span class="muted small" style="font-weight:400">At least 8 characters.</span></label>
    <p class="err" id="n-err" hidden></p><button class="btn primary block" id="n-go">Save new password</button></div>`;
  $("n-go").onclick = async () => {
    try { GUEST = false; store.set("sm-guest", false); await api("/reset", { method: "POST", body: { token, password: $("n-pass").value } }); await loadMe(); toast("Password changed. You're signed in."); go("/"); }
    catch (e) { $("n-err").textContent = e.message; $("n-err").hidden = false; }
  };
}, true);

// ---------- top bar + guest banner ----------
const LOGO = `<span class="logo" role="img" aria-label="Study Mania"><img class="lg-light" src="/logo-light.png" alt=""><img class="lg-dark" src="/logo-dark.png" alt=""></span>`;
function topbar(back, { stats = true } = {}) {
  const u = ME.user, lit = u.last_study_day === todayStr();
  return `<div class="topbar">
    ${back ? `<a class="iconbtn" href="#${back}" aria-label="Back">‹</a>` : LOGO}
    <div class="stats">
      ${stats ? `<span class="stat flame ${lit ? "" : "off"}" title="Day streak">🔥 ${u.streak}</span><span class="stat xp" title="Total XP">⚡ ${u.xp}</span>` : ""}
      <button class="iconbtn theme-btn" aria-label="Switch light or dark mode" title="Light / dark">${themeIcon()}</button>
      <a class="iconbtn" href="#/settings" aria-label="Settings">⚙︎</a>
    </div></div>`;
}
document.addEventListener("click", (e) => { if (e.target.closest(".theme-btn")) toggleTheme(); });
const guestBanner = () => GUEST ? `<div class="banner"><span>👤 No account: saved on this device only.</span><a href="#/join">Save it</a></div>` : "";

// ---------- setup: home screen + reminders ----------
const isMobile = isIOS || /android/i.test(navigator.userAgent);
let installPrompt = null;
window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); installPrompt = e; });
const homeDone = () => standalone || store.get("sm-homescreen-done", false);
const pushDone = () => !GUEST && store.get("sm-push-on", false) && "Notification" in window && Notification.permission === "granted";
function setupCard() {
  if (store.get("sm-setup-hidden", false) || (homeDone() && (pushDone() || GUEST))) return "";
  const step = (done, num, title, text, btn) => `<div class="setup-step ${done ? "done" : ""}"><span class="sn">${done ? "✓" : num}</span><div class="grow stack" style="gap:6px"><b>${title}</b>${done ? "" : `<span class="muted small">${text}</span><div>${btn}</div>`}</div></div>`;
  const lockedPush = isIOS && !standalone;
  return `<section class="card stack setup">
    <div class="spread"><h3>Finish setting up</h3><button class="btn ghost small" id="setup-hide" style="padding:4px 6px">Hide</button></div>
    ${step(homeDone(), 1, "Add it to your home screen", isMobile ? "Opens like a real app, full screen, one tap away." : "On your phone, go to <b style='color:var(--fg);display:inline'>studymania.app</b> and add it to your home screen.", `<button class="btn sm primary" id="setup-home">Show me how</button>`)}
    ${GUEST ? step(false, 2, "Turn on daily reminders", "Reminders need an account, so make one first. It's free.", `<a class="btn sm" href="#/join">Make account</a>`)
      : step(pushDone(), 2, "Turn on daily reminders", lockedPush ? "On iPhone this works once you open Study Mania from your home screen." : "<strong style='color:var(--fg)'>The most important setting.</strong> One nudge a day keeps your streak alive and keeps you from cramming.", lockedPush ? `<span class="pill">After step 1</span>` : `<button class="btn sm primary" id="setup-push">Turn on</button>`)}
  </section>`;
}
// Step-by-step "add to home screen" for each kind of phone. Opens on the right tab automatically.
const isSamsung = /SamsungBrowser/i.test(navigator.userAgent);
const isAndroid = /android/i.test(navigator.userAgent);
const isIOSChrome = isIOS && /CriOS/i.test(navigator.userAgent);
function homeScreenSheet() {
  let tab = isIOS ? "iphone" : isSamsung ? "samsung" : isAndroid ? "android" : "iphone";
  const guides = {
    iphone: `<ol class="howto">
        <li>Open <b>studymania.app</b> in <b>Safari</b>${isIOSChrome ? " (you're in Chrome right now, which works too: tap the <span class='kbd'>⬆︎</span> share icon at the top right)" : ""}.</li>
        <li>Tap the <b>Share</b> button <span class="kbd">⬆︎</span> (a square with an arrow, at the bottom). On newer iPhones, tap <span class="kbd">⋯</span> first, then <b>Share</b>.</li>
        <li>Scroll down and tap <b>Add to Home Screen</b> <span class="kbd">⊞</span>. If you see <b>Open as Web App</b>, leave it switched <b>on</b>.</li>
        <li>Tap <b>Add</b> at the top right.</li>
        <li>Open <b>Study Mania</b> from your home screen and sign in once there. That's where reminders work.</li></ol>`,
    samsung: `<ol class="howto">
        <li>Open <b>studymania.app</b> in <b>Samsung Internet</b>.</li>
        <li>Tap the <b>menu</b> button <span class="kbd">≡</span> at the bottom right.</li>
        <li>Tap <b>Add page to</b>, then <b>Home screen</b>. (Some versions show an <b>Install</b> <span class="kbd">⤓</span> icon in the address bar instead. Tap that.)</li>
        <li>Tap <b>Add</b>, then open <b>Study Mania</b> from your home screen.</li></ol>
        <div class="notice small">Using <b style="display:inline">Chrome</b> on your Samsung? Use the "Android / Chrome" tab.</div>`,
    android: `<ol class="howto">
        <li>Open <b>studymania.app</b> in <b>Chrome</b>.</li>
        <li>Tap <span class="kbd">⋮</span> at the top right.</li>
        <li>Tap <b>Install app</b> (or <b>Add to Home screen</b>), then <b>Install</b>.</li>
        <li>Open <b>Study Mania</b> from your home screen or app drawer.</li></ol>`,
  };
  let el;
  const draw = () => {
    const html = `<h2>Add Study Mania to your home screen</h2>
      ${!isMobile ? `<div class="notice small">You're on a computer. Do this on your <b style="display:inline">phone</b>: open <b style="display:inline">studymania.app</b> there. <button class="btn sm" id="hs-copy" style="margin-left:6px">Copy link</button></div>` : ""}
      ${installPrompt ? `<button class="btn primary block" id="hs-install">Install now (1 tap)</button>` : ""}
      <div class="tabs" role="group" aria-label="Phone type">${[["iphone", "iPhone"], ["samsung", "Samsung"], ["android", "Android / Chrome"]].map(([k, l]) => `<button type="button" data-tab="${k}" aria-pressed="${tab === k}">${l}</button>`).join("")}</div>
      <div class="scroll">${guides[tab]}</div>
      <button class="btn block" id="hs-done">I did it</button>`;
    if (!el) el = sheet(html); else el.querySelector(".sheet-in").innerHTML = html;
    el.querySelectorAll("[data-tab]").forEach((b) => (b.onclick = () => { tab = b.dataset.tab; draw(); }));
    if (el.querySelector("#hs-install")) el.querySelector("#hs-install").onclick = async () => { installPrompt.prompt(); const r = await installPrompt.userChoice; installPrompt = null; if (r.outcome === "accepted") { store.set("sm-homescreen-done", true); el.remove(); render(); } };
    if (el.querySelector("#hs-copy")) el.querySelector("#hs-copy").onclick = async (e) => { try { await navigator.clipboard.writeText("https://studymania.app"); e.target.textContent = "Copied ✓"; } catch { e.target.textContent = "studymania.app"; } };
    el.querySelector("#hs-done").onclick = () => { store.set("sm-homescreen-done", true); el.remove(); render(); };
  };
  draw();
}
function wireSetup() {
  if ($("setup-hide")) $("setup-hide").onclick = () => { store.set("sm-setup-hidden", true); render(); toast("You can turn reminders on anytime in Settings."); };
  if ($("setup-home")) $("setup-home").onclick = homeScreenSheet;
  if ($("setup-push")) $("setup-push").onclick = enablePush;
}

// ---------- home ----------
function upNext() {
  const cs = ME.courses.filter((c) => c.total).sort((a, b) => (a.exam_date || a.finish_by || "9999").localeCompare(b.exam_date || b.finish_by || "9999"));
  const f = (fn) => cs.find(fn);
  let c;
  if ((c = f((x) => x.due >= 3 && !reviewSkipped(x.id)))) return { c, k: "review", title: "Review", sub: `${Math.min(12, c.due)} words that are due · about ${Math.max(2, Math.round(Math.min(12, c.due) * 0.3))} min` };
  if ((c = f((x) => x.plan.todayLeft > 0 && x.next)) || (c = f((x) => x.due > 0 && !reviewSkipped(x.id))) || (c = f((x) => x.next))) {
    if (c.next && (c.plan.todayLeft > 0 || !c.due || reviewSkipped(c.id))) return { c, k: "next", title: `Lesson ${c.next.n} · ${c.next.topic}`, sub: `${plural(c.next.words, "new word")}${c.learned ? " + 3 throwbacks" : ""} · about ${c.next.words + 1} min` };
    return { c, k: "review", title: "Review", sub: `${plural(Math.min(12, c.due), "word")} due` };
  }
  if ((c = cs[0])) return c.plan.phase === "review" ? { c, k: "exam", title: "Practice exam", sub: "Final sweep: see what still needs work" } : { c, k: "quiz", title: "Practice quiz", sub: "10 quick questions on what you've learned" };
  return null;
}
const nextHref = (n) => (n.k === "exam" ? `/exam/${n.c.id}` : `/s/${n.c.id}/${n.k}`);
function startBest() { const n = upNext(); go(n ? nextHref(n) : "/add"); }

route(/^\/$/, () => {
  flushOutbox();
  const { user, courses, today } = ME;
  if (!GUEST && !user.username) setTimeout(() => usernameSheet(() => render()), 50);
  const G = goalInfo(), goal = G.goal, did = G.did, frac = Math.min(1, did / goal), C = 2 * Math.PI * 46;
  const lit = user.last_study_day === todayStr();
  const days = Array.from({ length: 7 }, (_, i) => addDays(todayStr(), i - 6));
  const hit = new Set(today.recent.filter((r) => r.rounds > 0).map((r) => r.day));
  const nx = upNext();
  const items = courses.filter((c) => c.total && c.id !== nx?.c.id).map((c) => ({ c, lessons: c.plan.todayLeft, due: reviewSkipped(c.id) ? 0 : c.due, review: c.plan.phase === "review" })).filter((x) => x.lessons || x.due || x.review);
  const gap = user.last_study_day ? daysBetween(user.last_study_day, todayStr()) : 0;
  const back = user.freeze_needed ? `<div class="notice">❄️ <b style="display:inline">You missed ${plural(user.freeze_needed, "day")}.</b> A streak freeze will save your ${user.streak}-day streak as soon as you finish a lesson today.</div>`
    : !user.streak && gap >= 2 && user.best_streak ? `<div class="notice">👋 <b style="display:inline">Welcome back.</b> Your streak reset, but your progress didn't. One lesson today gets you rolling again.</div>` : "";

  app.innerHTML = `${topbar(null, { stats: false })}${guestBanner()}
  <div class="stack">
    <section class="card hero-card">
      <div class="streak-ring ${frac >= 1 ? "done" : ""}" role="img" aria-label="${user.streak}-day streak. ${did} of ${goal} ${G.unit}s today.">
        <svg viewBox="0 0 104 104"><circle class="track" cx="52" cy="52" r="46" fill="none" stroke-width="8"/>
          <circle class="fill" cx="52" cy="52" r="46" fill="none" stroke-width="8" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C}"/></svg>
        <div class="hflame ${lit ? "lit" : ""}">🔥</div>
      </div>
      <div class="hero-text">
        <div class="streak-num">${user.streak}<span> day streak</span></div>
        <p class="${G.done ? "" : "muted"}" style="${G.done ? "color:var(--good);font-weight:700" : ""}">${G.done ? `✓ Daily goal done: ${did} of ${goal} ${G.unit}s` : `Daily goal: ${did} of ${goal} ${G.unit}s`}</p>
        <p class="muted small" style="margin-top:-4px">${G.done ? "Anything more today is a bonus." : lit ? `${plural(goal - did, G.unit)} to go. Your streak is safe for today.` : user.streak ? "Finish a lesson today to keep your streak." : "Finish a lesson to start a streak."}</p>
        <div class="row" style="gap:6px;flex-wrap:wrap"><span class="pill xp-pill">⚡ ${user.xp} XP</span>${user.freezes ? `<span class="pill" title="Streak freezes: each one covers a missed day">❄️ ${user.freezes}</span>` : ""}</div>
      </div>
      <div class="week">${days.map((d) => `<div class="dayc ${hit.has(d) ? "hit" : ""} ${d === todayStr() ? "now" : ""}"><i>${hit.has(d) ? "🔥" : ""}</i>${"SMTWTFS"[new Date(d + "T12:00").getDay()]}</div>`).join("")}</div>
    </section>
    ${back}
    ${courses.filter((c) => c.plan.more?.overdue).map((c) => `<div class="notice">📥 <b style="display:inline">New notes for ${esc(c.name)} yet?</b> Add them so your plan stays right. <a href="#/add/${c.id}" style="font-weight:700">Add notes</a> · <a href="#/c/${c.id}">That's everything</a></div>`).join("")}
    ${courses.reduce((a, c) => a + (c.plan.todayLeft || 0), 0) > 6 ? `<div class="notice warn"><b>Heads up: your subjects add up to ${courses.reduce((a, c) => a + (c.plan.todayLeft || 0), 0)} lessons today.</b> Exams close together? Start one earlier or add review days in its plan.</div>` : ""}
    ${setupCard()}
    ${nx ? `<a class="upnext" href="#${nextHref(nx)}" style="--sc:${colorVar(nx.c.color)}">
        <span class="kicker">Up next · ${esc(nx.c.name)}</span>
        <span class="un-title">${esc(nx.title)}</span>
        <span class="un-sub">${esc(nx.sub)}</span>
        <span class="btn primary block un-btn">${G.done ? "Bonus round" : did ? "Keep going" : "Start"}</span>
      </a>${nx.k === "review" ? `<button class="btn ghost small" id="skip-rev" style="margin-top:-6px">Skip review for today. Go to a lesson instead</button>` : ""}` : !courses.length ? `<a class="upnext" href="#/add"><span class="kicker">Get started</span><span class="un-title">Add your first subject</span><span class="un-sub">Paste your notes into any AI with our prompt. Takes about 2 minutes.</span><span class="btn primary block un-btn">Add a subject</span></a>` : ""}
    ${items.length ? `<section class="stack" style="gap:8px"><h3>Also today</h3>
      ${items.map((x) => `<a class="todo" href="#${x.lessons ? `/s/${x.c.id}/next` : x.due ? `/s/${x.c.id}/review` : `/exam/${x.c.id}`}" style="--sc:${colorVar(x.c.color)}">
        <span class="dot"></span><div class="grow"><b>${esc(x.c.name)}</b><span class="muted small">${[x.lessons ? plural(x.lessons, "lesson") : "", x.due ? `${x.due} to review` : "", x.review && !x.lessons && !x.due ? "Practice exam" : ""].filter(Boolean).join(" · ")}</span></div><span class="go-arrow">›</span></a>`).join("")}
    </section>` : ""}
    <section class="card stack lbprev" id="lbprev"><div class="spread"><h3>🏆 This week</h3><a class="small" href="#/leaderboard" style="font-weight:700">See all</a></div><p class="muted small">Loading…</p></section>
    ${courses.length ? `<h3 style="margin-top:4px">Your subjects</h3>` : ""}
    ${courses.map((c) => {
      const pct = c.total ? Math.round((c.learned / c.total) * 100) : 0;
      const n = c.exam_date ? daysUntil(c.exam_date) : null;
      return `<a class="subj" href="#/c/${c.id}" style="--sc:${colorVar(c.color)}">
        <div class="spread"><h3 class="grow">${esc(c.name)}</h3>${examText(c) ? `<span class="pill ${n !== null && n <= 7 ? "warn" : ""}">${examText(c)}</span>` : ""}</div>
        <div class="bar" role="img" aria-label="${pct}% learned"><i style="width:0" data-w="${pct}"></i></div>
        <div class="spread small muted"><span>${c.learned} of ${c.total} learned</span><span class="pill ${c.plan.cls}" style="white-space:normal;text-align:right">${esc(c.plan.label)}</span></div>
      </a>`;
    }).join("")}
    <a class="addsubj" href="#/add">+ Add a subject</a>
  </div>`;
  requestAnimationFrame(() => setTimeout(() => {
    const f = app.querySelector(".streak-ring .fill"); if (f) f.style.strokeDashoffset = C * (1 - frac);
    app.querySelectorAll(".bar i[data-w]").forEach((i) => (i.style.width = i.dataset.w + "%"));
  }, 60));
  wireSetup();
  if ($("skip-rev")) $("skip-rev").onclick = () => { skipReview(nx.c.id); toast("Review skipped for today. Those words come back tomorrow."); render(); };
  loadLeaderPreview();
});

async function loadLeaderPreview() {
  const box = $("lbprev"); if (!box) return;
  try {
    const r = await api("/leaderboard?board=week");
    if (!$("lbprev")) return;
    const medals = ["🥇", "🥈", "🥉"];
    box.innerHTML = `<div class="spread"><h3>🏆 This week</h3><a class="small" href="#/leaderboard" style="font-weight:700">See all</a></div>
      ${r.top.length ? r.top.slice(0, 3).map((p, i) => `<div class="lbrow ${p.me ? "me" : ""}"><span class="medal">${medals[i]}</span><b class="grow">@${esc(p.username)}</b><span class="lbscore">${p.score} XP</span></div>`).join("")
        : `<p class="muted small">No one's on the board yet this week. Finish a lesson to take first place.</p>`}
      <p class="small muted">${GUEST ? `<a href="#/join">Make an account</a> to get on the leaderboard.` : r.hidden ? "You're hidden from the leaderboard (change in Settings)." : r.me?.rank ? `You're <b style="color:var(--fg)">#${r.me.rank}</b> with ${r.me.score} XP this week.` : "Earn XP this week to get ranked."}</p>`;
  } catch { box.remove(); }
}

// ---------- leaderboard ----------
route(/^\/leaderboard$/, async () => {
  let board = "week";
  const draw = async () => {
    app.innerHTML = `${topbar("/")}<div class="stack"><h1>Leaderboard</h1>
      <div class="tabs" role="group" aria-label="Board"><button id="lb-week" aria-pressed="${board === "week"}">This week's XP</button><button id="lb-streak" aria-pressed="${board === "streak"}">Longest streak</button></div>
      <div id="lb-body" class="stack" style="gap:8px"><p class="muted">Loading…</p></div></div>`;
    $("lb-week").onclick = () => { board = "week"; draw(); };
    $("lb-streak").onclick = () => { board = "streak"; draw(); };
    try {
      const r = await api(`/leaderboard?board=${board}`);
      const unit = board === "week" ? "XP" : "days";
      $("lb-body").innerHTML = (r.top.length ? r.top.map((p) => `<div class="lbrow big ${p.me ? "me" : ""}"><span class="medal">${["🥇", "🥈", "🥉"][p.rank - 1] || `<span class="rk">${p.rank}</span>`}</span><b class="grow">@${esc(p.username)}${p.me ? " (you)" : ""}</b><span class="lbscore">${p.score} ${unit}</span></div>`).join("")
        : `<div class="card"><p class="muted">Nobody's on this board yet. Be the first.</p></div>`) +
        `<p class="muted small" style="margin-top:6px">${GUEST ? `<a href="#/join">Make an account</a> to join the leaderboard.` : r.hidden ? "You're hidden. Turn it back on in Settings." : r.me?.rank ? `You're #${r.me.rank} with ${r.me.score} ${unit}.` : board === "week" ? "Earn XP this week to get ranked." : "Start a streak to get ranked."} ${board === "week" ? "Resets every Monday." : ""} ${r.players === 1 ? "1 person" : r.players + " people"} on Study Mania.</p>`;
    } catch (e) { $("lb-body").innerHTML = `<p class="err">${esc(e.message)}</p>`; }
  };
  draw();
});

// ---------- plan form (used when adding a subject and on the subject page) ----------
function planState(c) {
  const more = !!c.as_you_go && !c.notes_done;
  return {
    mode: c.exam_date ? "exam" : c.finish_by ? "days" : c.mode || "exam",
    exam_date: c.exam_date || addDays(todayStr(), 28),
    review_days: c.review_days ?? 3,
    finish_days: c.finish_by ? Math.max(1, daysBetween(todayStr(), c.finish_by) + 1) : 10,
    notes: c.notes || (more ? "more" : "all"),
    count: c.more_share && !c.more_total ? "unsure" : "count",
    have: c.more_have ?? "", total: c.more_total ?? "",
    share: c.more_share ?? 0.75, every: c.more_every || "week",
  };
}
function planToFields(s) {
  const more = s.notes === "more", counted = more && s.count === "count";
  return {
    exam_date: s.mode === "exam" ? s.exam_date : null,
    review_days: s.review_days,
    finish_by: s.mode === "days" ? addDays(todayStr(), Math.max(1, s.finish_days) - 1) : null,
    as_you_go: more ? 1 : 0, notes_done: more ? 0 : 1,
    more_have: counted ? +s.have : null, more_total: counted ? +s.total : null,
    more_share: more && !counted ? +s.share : null, more_every: more ? s.every : null,
  };
}
// Returns a message if something in the form doesn't add up, otherwise null.
function planProblem(s) {
  if (s.notes !== "more" || s.count !== "count") return null;
  const h = +s.have, t = +s.total;
  if (!h || !t) return 'Fill in how many you have and how many there are, or tap "Not sure".';
  if (h >= t) return 'If you have all of them, pick "Yes, all of them" instead.';
  return null;
}
function planFormHTML(s) {
  const seg = (name, vals, cur, fmt = (v) => v) => `<div class="seg wrap" role="group">${vals.map((v) => `<button type="button" data-${name}="${v}" aria-pressed="${String(cur) === String(v)}">${fmt(v)}</button>`).join("")}</div>`;
  const label = (t, sub) => `<span style="font-weight:700;font-size:15px">${t}</span>${sub ? `<span class="muted small" style="font-weight:400">${sub}</span>` : ""}`;
  return `<div class="planform stack">
    <div class="field">${label("When do you need to know it?")}
      ${seg("mode", ["exam", "days", "none"], s.mode, (v) => ({ exam: "Exam date", days: "Finish in…", none: "No deadline" }[v]))}</div>
    ${s.mode === "exam" ? `
      <label class="field">Exam date<input type="date" id="p-exam" value="${esc(s.exam_date)}" min="${todayStr()}"></label>
      <div class="field">${label("Review days before the exam", "No new lessons these days, just reviews and practice exams.")}
        ${seg("rev", [0, 1, 2, 3, 5, 7], s.review_days)}</div>` : ""}
    ${s.mode === "days" ? `
      <div class="field">${label("Finish all lessons in")}
        ${seg("fin", [5, 10, 15, 30], s.finish_days, (v) => v + " days")}
        <div class="row"><span class="muted small">or</span><input type="number" id="p-fin" min="1" max="365" value="${esc(s.finish_days)}" style="max-width:110px"><span class="muted small">days</span></div></div>` : ""}
    ${s.mode === "none" ? `<p class="muted small">Go lesson by lesson at your own pace. We'll show when you'll finish at 1 a day, and you can always do more.</p>` : ""}

    <div class="field">${label("Do you have all your notes for this?")}
      ${seg("notes", ["all", "more"], s.notes, (v) => (v === "all" ? "✅ Yes, all of them" : "⏳ Not yet, more are coming"))}</div>
    ${s.notes === "more" ? `<div class="morebox stack">
      <div class="field">${label("How much do you have so far?")}
        ${s.count === "count" ? `<div class="row" style="flex-wrap:wrap;gap:8px"><span>I have</span><input type="number" id="p-have" min="0" max="99" inputmode="numeric" value="${esc(s.have)}" placeholder="4" style="max-width:76px"><span>of</span><input type="number" id="p-total" min="1" max="99" inputmode="numeric" value="${esc(s.total)}" placeholder="5" style="max-width:76px"><span>lectures or chapters</span></div>
          <button type="button" class="btn ghost small" data-count="unsure" style="align-self:flex-start;padding:4px 0">Not sure how many?</button>`
        : `${seg("share", [0.5, 0.75, 0.9], s.share, (v) => ({ 0.5: "About half", 0.75: "Most of it", 0.9: "Almost all" }[v]))}
          <button type="button" class="btn ghost small" data-count="count" style="align-self:flex-start;padding:4px 0">I know the numbers</button>`}</div>
      <div class="field">${label("When do you usually get new notes?")}
        ${seg("every", ["class", "week", "unsure"], s.every, (v) => ({ class: "After every class", week: "Once a week", unsure: "Not sure" }[v]))}</div>
      <p class="small" id="p-err" style="color:var(--bad)" ${planProblem(s) ? "" : "hidden"}>${esc(planProblem(s) || "")}</p>
      <div class="notice small">No problem. Add what you have now. We'll guess how much is coming and spread it all out so there's no pile-up at the end. When you get the rest, tap <b style="display:inline">+ Add more notes</b> on this subject and your plan updates.</div>
    </div>` : ""}
    <p class="muted small">💡 Only paste notes for <b style="display:inline">this</b> exam. Tip: make one subject per exam (like "Consumer Behavior · Exam 2").</p>
  </div>`;
}
function wirePlanForm(root, s, redraw) {
  const on = (attr, fn) => root.querySelectorAll(`[data-${attr}]`).forEach((b) => (b.onclick = () => { fn(b.dataset[attr]); redraw(); }));
  on("mode", (v) => (s.mode = v));
  on("rev", (v) => (s.review_days = +v));
  on("fin", (v) => (s.finish_days = +v));
  on("notes", (v) => (s.notes = v));
  on("count", (v) => (s.count = v));
  on("share", (v) => (s.share = +v));
  on("every", (v) => (s.every = v));
  const ex = root.querySelector("#p-exam"); if (ex) ex.onchange = () => (s.exam_date = ex.value);
  const fin = root.querySelector("#p-fin"); if (fin) fin.onchange = () => { s.finish_days = Math.max(1, Math.min(365, +fin.value || 10)); redraw(); };
  const num = (id, key) => { const el = root.querySelector(id); if (el) el.oninput = () => { s[key] = el.value; const e = root.querySelector("#p-err"), m = planProblem(s); if (e) { e.textContent = m || ""; e.hidden = !m; } }; };
  num("#p-have", "have"); num("#p-total", "total");
}

// ---------- add a subject ----------
function parseReply(text) {
  let t = String(text || "").trim();
  if (!t) throw new Error("Paste the AI's reply first.");
  t = t.replace(/```(?:json)?/gi, "").replace(/[“”]/g, '"');
  const blocks = [];
  let depth = 0, start = -1, inStr = false, escp = false;
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (inStr) { if (escp) escp = false; else if (ch === "\\") escp = true; else if (ch === '"') inStr = false; continue; }
    if (ch === '"') inStr = true;
    else if (ch === "{") { if (depth === 0) start = i; depth++; }
    else if (ch === "}") { depth--; if (depth === 0 && start >= 0) { blocks.push(t.slice(start, i + 1)); start = -1; } }
  }
  if (!blocks.length) throw new Error("That doesn't look like the AI's card list. Copy its whole reply, including the { } brackets.");
  let subject = "", cards = [], questions = [];
  for (const b of blocks) {
    let o;
    try { o = JSON.parse(b.replace(/,\s*([}\]])/g, "$1")); }
    catch { throw new Error('The reply got cut off or has a typo. Ask the AI: "Send that JSON again, complete." Then paste it.'); }
    if (Array.isArray(o.cards)) cards = cards.concat(o.cards);
    if (Array.isArray(o.questions)) questions = questions.concat(o.questions);
    if (!o.cards && o.term) cards.push(o);
    subject = subject || o.subject || "";
  }
  cards = cards.filter((c) => c && c.term && (c.simple || c.answer || c.definition));
  if (!cards.length) throw new Error("No cards found in that reply. Copy the whole code block the AI made.");
  return { subject, cards, questions };
}

route(/^\/add(?:\/([\w-]+))?$/, (addTo) => {
  const existing = addTo ? ME.courses.find((c) => c.id === addTo) : null;
  const S = { step: existing ? 2 : 1, name: "", color: ME.courses.length % COLORS, parsed: null, raw: "", plan: planState({}), addN: 1, last: false };
  const draw = () => {
    const stepBar = `<div class="steps">${[1, 2, 3].map((i) => `<i class="${i <= S.step ? "on" : ""}"></i>`).join("")}</div>`;
    let body = "";
    if (S.step === 1) body = `
      <h1>New subject</h1>
      <label class="field">What class or exam is it?<input id="a-name" value="${esc(S.name)}" placeholder="e.g. Supply Chain Midterm" maxlength="80"></label>
      ${planFormHTML(S.plan)}
      <div class="field" style="font-weight:700;font-size:15px">Color<div class="swatches">${Array.from({ length: COLORS }, (_, i) => `<button type="button" class="sw" aria-label="Color ${i + 1}" aria-pressed="${S.color === i}" data-c="${i}" style="background:${colorVar(i)}"></button>`).join("")}</div></div>
      <button class="btn primary block" id="a-next">Next</button>
      <button class="btn ghost" id="a-sample">Or try a sample subject first</button>`;
    if (S.step === 2) body = `
      <h1>${existing ? `Add notes to ${esc(existing.name)}` : "Turn your notes into lessons"}</h1>
      <div class="card stack">
        <p><b>1.</b> Copy the Study Mania prompt.</p>
        <button class="btn primary block" id="a-copy">Copy prompt</button>
        <p><b>2.</b> Open any AI. Paste the prompt, then paste your notes right after it (or attach your slides or PDF) and send.</p>
        <div class="ais">
          <a class="btn sm" href="https://chatgpt.com/" target="_blank" rel="noopener">ChatGPT</a>
          <a class="btn sm" href="https://claude.ai/new" target="_blank" rel="noopener">Claude</a>
          <a class="btn sm" href="https://gemini.google.com/app" target="_blank" rel="noopener">Gemini</a>
          <a class="btn sm" href="https://grok.com/" target="_blank" rel="noopener">Grok</a>
        </div>
        <p class="muted small">Lots of notes? The AI sends them in parts. Say NEXT, and paste all the parts together in the next step. Only have this week's chapters? That's fine. Add the next ones whenever you get them.</p>
      </div>
      <button class="btn block" id="a-next">I have the reply</button>
      ${existing ? "" : `<button class="btn ghost" id="a-back">Back</button>`}`;
    if (S.step === 3) body = `
      <h1>Paste the AI's reply</h1>
      <label class="field">Reply<textarea id="a-paste" placeholder="Paste everything the AI sent back, including the { } brackets. Got several parts? Paste them all here."></textarea></label>
      <p class="err" id="a-err" hidden></p>
      ${S.parsed ? `<div class="card stack"><div class="spread"><h3>${plural(S.parsed.cards.length, "card")} · ${plural(S.parsed.questions.length, "exam question")}</h3><span class="pill ok">Looks good</span></div>
        <p class="muted small">${[...new Set(S.parsed.cards.map((c) => c.topic || "General"))].map(esc).join(" · ")}</p>
        <div class="preview">${S.parsed.cards.slice(0, 40).map((c) => `<div><b>${esc(c.term)}</b>: ${esc(c.simple || c.answer)}</div>`).join("")}</div></div>
        ${existing && existing.as_you_go && !existing.notes_done ? `<div class="card stack">
          ${existing.more_total ? `<div class="field"><span style="font-weight:700;font-size:15px">How many lectures or chapters is this?</span>
            <div class="seg wrap">${[1, 2, 3, 4].map((n) => `<button type="button" data-addn="${n}" aria-pressed="${S.addN === n}">${n}</button>`).join("")}</div>
            <span class="muted small">You'll have ${Math.min(existing.more_total, (existing.more_have || 0) + S.addN)} of ${existing.more_total}.</span></div>` : ""}
          <label class="checkrow"><input type="checkbox" id="a-last" ${S.last ? "checked" : ""}> This is the last of it. I have everything now.</label></div>` : ""}
        <button class="btn primary block" id="a-save">${existing ? "Add to " + esc(existing.name) : "Create subject"}</button>` : `<button class="btn primary block" id="a-check">Check reply</button>`}
      <button class="btn ghost" id="a-back">Back</button>`;
    app.innerHTML = `${topbar(existing ? "/c/" + existing.id : "/")}<div class="stack">${stepBar}${body}</div>`;
    if (S.step === 1) {
      const keepName = () => (S.name = $("a-name").value);
      wirePlanForm(app, S.plan, () => { keepName(); const y = scrollY; draw(); scrollTo(0, y); });
      app.querySelectorAll(".sw").forEach((b) => (b.onclick = () => { keepName(); S.color = +b.dataset.c; draw(); }));
      $("a-next").onclick = () => { keepName(); S.name = S.name.trim(); if (!S.name) { $("a-name").focus(); return toast("Give it a name first."); } const pr = planProblem(S.plan); if (pr) return toast(pr); S.step = 2; draw(); };
      $("a-sample").onclick = async () => {
        try {
          const s = await (await fetch("/sample.json")).json();
          const r = await api("/courses", { method: "POST", body: { name: s.subject, color: S.color, exam_date: addDays(todayStr(), 14), review_days: 3, cards: s.cards, questions: s.questions } });
          await loadMe(); go(`/c/${r.id}`);
        } catch (e) { toast(e.message); }
      };
    }
    if (S.step === 2) {
      $("a-copy").onclick = async () => {
        try { await navigator.clipboard.writeText(window.STUDY_PROMPT); toast("Prompt copied. Now paste it into your AI."); $("a-copy").textContent = "Copied ✓"; }
        catch { promptSheet(); }
      };
      $("a-next").onclick = () => { S.step = 3; draw(); };
      if ($("a-back")) $("a-back").onclick = () => { S.step = 1; draw(); };
    }
    if (S.step === 3) {
      const ta = $("a-paste"); ta.value = S.raw;
      ta.oninput = () => { S.raw = ta.value; if (S.parsed) { S.parsed = null; draw(); $("a-paste").focus(); } };
      $("a-back").onclick = () => { S.step = 2; S.parsed = null; draw(); };
      if ($("a-check")) $("a-check").onclick = () => {
        try { S.raw = ta.value; S.parsed = parseReply(ta.value); draw(); }
        catch (e) { $("a-err").textContent = e.message; $("a-err").hidden = false; }
      };
      app.querySelectorAll("[data-addn]").forEach((b) => (b.onclick = () => { S.addN = +b.dataset.addn; const raw = $("a-paste").value; draw(); $("a-paste").value = raw; }));
      if ($("a-last")) $("a-last").onchange = (e) => (S.last = e.target.checked);
      if ($("a-save")) $("a-save").onclick = async () => {
        $("a-save").disabled = true;
        try {
          let id;
          if (existing) {
            const r = await api(`/courses/${existing.id}/cards`, { method: "POST", body: { cards: S.parsed.cards, questions: S.parsed.questions } }); id = existing.id;
            if (existing.as_you_go && !existing.notes_done) {
              const have = existing.more_total ? Math.min(existing.more_total, (existing.more_have || 0) + S.addN) : null;
              const done = S.last || (have && have >= existing.more_total);
              const share = existing.more_total ? null : Math.min(0.95, (existing.more_share || 0.75) + (1 - (existing.more_share || 0.75)) / 2);
              await api(`/courses/${id}`, { method: "PATCH", body: { more_have: have, notes_done: done ? 1 : 0, ...(share ? { more_share: share } : {}) } });
            }
            toast(r.skipped ? `Added ${plural(r.added, "new word")}. ${r.skipped} ${r.skipped === 1 ? "was" : "were"} already here, so we skipped ${r.skipped === 1 ? "it" : "them"}.` : `Added ${plural(r.added, "new word")}.`, 4500);
          }
          else { const r = await api("/courses", { method: "POST", body: { name: S.name || S.parsed.subject || "My subject", color: S.color, ...planToFields(S.plan), cards: S.parsed.cards, questions: S.parsed.questions } }); id = r.id; }
          await loadMe(); go(`/c/${id}`);
        } catch (e) { toast(e.message); $("a-save").disabled = false; }
      };
    }
  };
  draw();
});

function promptSheet() {
  const el = sheet(`<h2>Copy this prompt</h2><p class="muted">Press and hold to select it all, then copy.</p>
    <textarea readonly style="flex:1;min-height:260px">${esc(window.STUDY_PROMPT)}</textarea><button class="btn primary block">Done</button>`);
  el.querySelector("button").onclick = () => el.remove();
  el.querySelector("textarea").select();
}

// ---------- subject page ----------
route(/^\/c\/([\w-]+)$/, async (id) => {
  let d;
  try { d = await loadCourse(id); } catch (e) { toast(e.message); return go("/"); }
  const c = d.course;
  const draw = () => {
    const T = todayStr(), p = planFor(c, d.lessons, d.progress, T);
    const left = d.lessons.filter((l) => !lessonDone(d, l)), nextL = left[0];
    const learned = d.cards.filter((k) => isLearned(d, k)).length;
    const strong = d.cards.filter((k) => (d.progress[k.id]?.box || 0) >= 2).length;
    const due = d.cards.filter((k) => isLearned(d, k) && d.progress[k.id].due <= T).length;
    const batches = [...new Set(d.cards.map((k) => k.added_day))].length;
    app.innerHTML = `${topbar("/")}${guestBanner()}
    <div class="stack" style="--sc:${colorVar(c.color)}">
      <div class="stack" style="gap:8px"><h1>${esc(c.name)}</h1>${examText(c) ? `<div><span class="pill">${examText(c)}</span></div>` : ""}</div>
      ${p.more ? `<div class="card stack morecard ${p.more.overdue ? "due" : ""}">
        <div><div class="kicker">${p.more.overdue ? "📥 Got your new notes yet?" : "⏳ More notes coming"}</div>
          <p style="margin-top:4px">${p.more.total ? `You have <b>${p.more.have} of ${p.more.total}</b> lectures or chapters.` : "You have some of your notes so far."} ${p.more.overdue ? "They were expected around " + niceDate(p.more.next) + "." : "Next ones expected around <b>" + niceDate(p.more.next) + "</b>."}</p>
          <p class="muted small">Your plan already saves room for about ${plural(p.more.future, "lesson")} still coming.</p></div>
        <div class="row"><a class="btn primary grow" href="#/add/${c.id}">+ Add notes</a><button class="btn grow" id="c-alldone">That's everything</button></div>
      </div>` : ""}
      <div class="card stack">
        <div class="spread"><div class="grow"><div class="kicker">Your plan</div><p style="margin-top:2px"><b>${esc(p.label)}</b></p>
          ${p.todayLeft ? `<p class="muted small">Today: ${plural(p.todayLeft, "lesson")} left${p.todayDone ? ` (${p.todayDone} done ✓)` : ""}</p>` : p.todayDone ? `<p class="small" style="color:var(--good)">Today's lessons done ✓ Extra lessons put you ahead.</p>` : ""}</div>
          <button class="btn sm" id="c-plan">Change</button></div>
        <div class="bar"><i class="strong" style="width:${(strong / d.cards.length) * 100 || 0}%;z-index:1"></i><i style="width:${(learned / d.cards.length) * 100 || 0}%"></i></div>
        <div class="spread small"><span><b>${learned}</b> <span class="muted">of ${d.cards.length} learned</span></span><span><b>${strong}</b> <span class="muted">locked in</span></span></div>
        ${nextL ? `<button class="btn primary block" id="c-next">${p.todayLeft ? "Start" : "Get ahead with"} lesson ${nextL.n}</button>` : ""}
        <div class="row">
          <button class="btn grow" id="c-review" ${due ? "" : "disabled"}>Review${due ? ` (${due})` : ""}</button>
          <button class="btn grow" id="c-exam">Practice exam</button>
        </div>
        ${d.exams.length ? `<p class="muted small">Practice exams: ${d.exams.slice(0, 4).map((e) => `<b style="color:var(--fg)">${Math.round((e.score / e.total) * 100)}%</b> ${niceDate(e.day).replace(/^\w+, /, "")}`).join(" · ")}</p>` : ""}
      </div>
      <h3>Lessons</h3>
      ${d.lessons.map((l, i) => {
        const newBatch = batches > 1 && (i === 0 || d.lessons[i - 1].batch !== l.batch);
        return `${newBatch ? `<div class="kicker" style="color:var(--muted);margin-top:4px">Added ${niceDate(l.batch)}</div>` : ""}
        <div class="lesson ${lessonDone(d, l) ? "done" : ""} ${l === nextL ? "next" : ""}">
          <span class="num">${lessonDone(d, l) ? "✓" : l.n}</span>
          <button class="go" data-n="${l.n}"><b>${esc(l.topic)}${l.part ? ` <span class="muted" style="display:inline;font-weight:400">part ${l.part}</span>` : ""}</b><span>${l.cards.map((k) => esc(k.term)).join(" · ")}</span></button>
          <button class="chk" role="checkbox" aria-checked="${lessonDone(d, l)}" aria-label="Mark lesson ${l.n} as already studied" data-n="${l.n}">✓</button>
        </div>`;
      }).join("")}
      <div class="card stack" style="margin-top:8px">
        <a class="btn primary block" href="#/add/${c.id}">+ Add more notes</a>
        <p class="muted small">Got the next chapters? Add them here. They join this subject and your plan updates.</p>
        <button class="btn ghost" id="c-mark">Mark lessons I already know</button>
        <button class="btn ghost danger" id="c-del">Delete this subject</button>
      </div>
    </div>`;
    if ($("c-next")) $("c-next").onclick = () => go(`/s/${id}/lesson/${nextL.n}`);
    $("c-review").onclick = () => go(`/s/${id}/review`);
    $("c-exam").onclick = () => go(`/exam/${id}`);
    $("c-plan").onclick = () => planSheet(c, draw);
    if ($("c-alldone")) $("c-alldone").onclick = async () => {
      try { await api(`/courses/${id}`, { method: "PATCH", body: { notes_done: 1 } }); c.notes_done = 1; await loadMe(); toast("Got it. Your plan now uses just what you have."); draw(); } catch (e) { toast(e.message); }
    };
    $("c-mark").onclick = () => markSheet(d, draw);
    app.querySelectorAll(".lesson .go").forEach((b) => (b.onclick = () => go(`/s/${id}/lesson/${b.dataset.n}`)));
    app.querySelectorAll(".chk").forEach((b) => (b.onclick = async () => {
      const l = d.lessons[b.dataset.n - 1];
      try { await setKnown(d, l.cards, !lessonDone(d, l)); } catch (e) { toast(e.message); }
      draw();
    }));
    let armed = false;
    $("c-del").onclick = async () => {
      if (!armed) { armed = true; $("c-del").textContent = "Tap again to delete for good"; setTimeout(() => { armed = false; if ($("c-del")) $("c-del").textContent = "Delete this subject"; }, 3000); return; }
      await api(`/courses/${id}`, { method: "DELETE" }); await loadMe(); go("/");
    };
  };
  draw();
});

function planSheet(c, after) {
  const s = planState(c);
  let el;
  const drawSheet = () => {
    const top = el?.querySelector(".scroll")?.scrollTop || 0;
    const html = `<h2>Your plan</h2><div class="scroll">${planFormHTML(s)}</div><button class="btn primary block" id="pl-save">Save plan</button>`;
    if (!el) el = sheet(html); else el.querySelector(".sheet-in").innerHTML = html;
    el.querySelector(".scroll").scrollTop = top;
    wirePlanForm(el, s, drawSheet);
    el.querySelector("#pl-save").onclick = async () => {
      const pr = planProblem(s); if (pr) return toast(pr);
      const f = planToFields(s);
      try { await api(`/courses/${c.id}`, { method: "PATCH", body: f }); Object.assign(c, f); await loadMe(); toast("Plan saved."); } catch (e) { toast(e.message); }
      el.remove(); after();
    };
  };
  drawSheet();
}

async function setKnown(d, cards, known) {
  const ids = cards.map((k) => k.id);
  await api(`/courses/${d.course.id}/known`, { method: "POST", body: { card_ids: ids, known } });
  const y = addDays(todayStr(), -1);
  ids.forEach((cid) => { if (known) d.progress[cid] = d.progress[cid]?.learned_at ? d.progress[cid] : { box: 2, due: addDays(todayStr(), 2), learned_at: y }; else delete d.progress[cid]; });
  loadMe().catch(() => {});
}

function markSheet(d, after, first) {
  const sel = new Set(d.lessons.filter((l) => lessonDone(d, l)).map((l) => l.n)), was = new Set(sel);
  let el;
  const draw = () => {
    const top = el?.querySelector(".scroll")?.scrollTop || 0;
    const html = `<h2>${first ? "Have you started studying this?" : "What have you already studied?"}</h2>
      <p class="muted">Tap each lesson you already know. It gets checked off, and its words still come back in reviews.</p>
      <div class="scroll">${d.lessons.map((l) => `<button class="pick" role="checkbox" aria-checked="${sel.has(l.n)}" data-n="${l.n}"><span class="bx">✓</span><span class="grow"><b>${l.n}. ${esc(l.topic)}${l.part ? ` (part ${l.part})` : ""}</b><small>${l.cards.map((k) => esc(k.term)).join(" · ")}</small></span></button>`).join("")}</div>
      <div class="row"><button class="btn grow" id="m-all">${sel.size === d.lessons.length ? "Clear all" : "Select all"}</button><button class="btn primary grow" id="m-save">${first && !sel.size ? "I'm new to this" : "Save"}</button></div>`;
    if (!el) el = sheet(html); else el.querySelector(".sheet-in").innerHTML = html;
    el.querySelector(".scroll").scrollTop = top;
    el.querySelectorAll(".pick").forEach((b) => (b.onclick = () => { const n = +b.dataset.n; sel.has(n) ? sel.delete(n) : sel.add(n); draw(); }));
    el.querySelector("#m-all").onclick = () => { if (sel.size === d.lessons.length) sel.clear(); else d.lessons.forEach((l) => sel.add(l.n)); draw(); };
    el.querySelector("#m-save").onclick = async () => {
      el.querySelector("#m-save").disabled = true;
      const on = d.lessons.filter((l) => sel.has(l.n) && !was.has(l.n)).flatMap((l) => l.cards);
      const off = d.lessons.filter((l) => !sel.has(l.n) && was.has(l.n)).flatMap((l) => l.cards);
      try { if (on.length) await setKnown(d, on, true); if (off.length) await setKnown(d, off, false); } catch (e) { toast(e.message); }
      el.remove(); after();
    };
  };
  draw();
}

// ---------- questions ----------
function cardView(k) {
  const pair = k.parts?.length >= 2;
  return `<div class="qbody">
    <div><div class="term">${esc(k.term)}</div>${k.full ? `<div class="full">${esc(k.full)}</div>` : ""}${pair ? `<div class="full">${k.parts.length} look-alike terms, learned together</div>` : ""}</div>
    ${pair ? `<div class="pair">${k.parts.map((p) => `<div class="pair-part"><b>${esc(p.term)}</b><p>${esc(p.simple)}</p>${p.example ? `<p class="small muted">${esc(p.example)}</p>` : ""}</div>`).join("")}</div>`
      : `<p class="simple">${esc(k.simple)}</p>`}
    ${k.definition ? `<div class="info"><div class="lbl">Textbook definition</div>${esc(k.definition)}</div>` : ""}
    ${k.formula ? `<div class="formula">${esc(k.formula)}</div>` : ""}
    ${k.example && !pair ? `<div class="info ex"><div class="lbl">Real-world example</div>${esc(k.example)}</div>` : ""}
    ${k.hook ? `<div class="info hook"><div class="lbl">Remember it</div>${esc(k.hook)}</div>` : ""}
    ${k.confuse ? `<div class="info vs"><div class="lbl">Don't mix up</div>${esc(k.confuse)}</div>` : ""}
    ${k.related?.length ? `<div><div class="kicker" style="color:var(--muted);margin-bottom:8px">Goes with</div><div class="chips">${k.related.map((r) => `<span>${esc(r)}</span>`).join("")}</div></div>` : ""}
  </div>`;
}
// Only words you've already been taught can show up as answer choices.
// d.seen = ids of cards learned before + the cards in the lesson you're doing now.
const seenCards = (d) => d.cards.filter((x) => !d.seen || d.seen.has(x.id));
function siblings(d, k, n, field) {
  const pool = seenCards(d).filter((x) => x.id !== k.id && !x.question);
  const same = shuffle(pool.filter((x) => x.topic === k.topic)), rest = shuffle(pool.filter((x) => x.topic !== k.topic));
  const out = [], seen = new Set([String(k[field] || "").toLowerCase()]);
  for (const x of same.concat(rest)) { const v = x[field]; if (v && !seen.has(v.toLowerCase())) { seen.add(v.toLowerCase()); out.push(v); } if (out.length >= n) break; }
  return out;
}
// A trap that is the name of a word you haven't learned yet gets swapped for one you have.
function safeTraps(d, k) {
  const norm = (t) => String(t || "").trim().toLowerCase();
  const unseenNames = new Set(d.cards.filter((x) => d.seen && !d.seen.has(x.id)).flatMap((x) => [x.term, ...(x.parts || []).map((p) => p.term)]).map(norm));
  const ownNames = new Set([k.term, ...(k.parts || []).map((p) => p.term)].map(norm));
  let traps = (k.traps || []).filter(Boolean).filter((t) => !unseenNames.has(norm(t)) || ownNames.has(norm(t))).slice(0, 3);
  const answerIsName = d.cards.some((x) => norm(x.term) === norm(k.answer) || (x.parts || []).some((p) => norm(p.term) === norm(k.answer)));
  if (traps.length < 3) traps = traps.concat(siblings(d, k, 3 - traps.length, answerIsName ? "term" : "answer").filter((t) => norm(t) !== norm(k.answer) && !traps.includes(t)));
  return traps;
}
function meaningQ(d, k) {
  return { k, topic: k.topic, html: k.question ? esc(k.question) : `What does <b>${esc(k.term)}</b> mean?${k.full ? `<span class="sub">${esc(k.full)}</span>` : ""}`, opts: shuffle([k.answer, ...safeTraps(d, k)]), ans: k.answer };
}
function termQ(d, k) {
  if (k.question) return meaningQ(d, k);
  const others = siblings(d, k, 3, "term");
  if (others.length < 1) return meaningQ(d, k); // not enough learned words yet for a "which term" question
  return { k, topic: k.topic, html: `Which term fits?<span class="sub">${esc(k.answer)}</span>`, opts: shuffle([k.term, ...others]), ans: k.term };
}
function tfQ(d, k) {
  if (k.question) return meaningQ(d, k);
  const truth = Math.random() < 0.5 || !(k.traps || []).length;
  const stmt = truth ? k.answer : k.traps[(Math.random() * k.traps.length) | 0];
  return { k, topic: k.topic, html: `True or false?<span class="sub"><b>${esc(k.term)}</b>: ${esc(stmt)}</span>`, opts: ["True", "False"], ans: truth ? "True" : "False", why: `${k.term}: ${k.simple}` };
}
const aiQ = (q) => ({ topic: q.topic, html: esc(q.q), opts: shuffle([...q.choices]), ans: q.choices[q.answer], why: q.why });
const COUNTS_AT = 0.8; // a quit round counts toward the streak once it's 80% done

// ---------- lessons + reviews ----------
route(/^\/s\/([\w-]+)\/(next|review|quiz|lesson|misses)(?:\/(\d+))?$/, async (id, kind, num) => {
  let d;
  try { d = await loadCourse(id); } catch (e) { toast(e.message); return go("/"); }
  const T = todayStr();
  const byId = Object.fromEntries(d.cards.map((k) => [k.id, k]));
  d.seen = new Set(d.cards.filter((k) => isLearned(d, k)).map((k) => k.id));
  const lessonOf = {}; d.lessons.forEach((l) => l.cards.forEach((k) => (lessonOf[k.id] = l.n)));
  let steps = [], lesson = null;
  const mode = kind === "lesson" || kind === "next" ? "learn" : "review";
  if (kind === "next") lesson = d.lessons.find((l) => !lessonDone(d, l));
  if (kind === "lesson") lesson = d.lessons[+num - 1];
  if (mode === "learn") {
    if (!lesson) { toast("All lessons are learned. Here's a review."); return go(`/s/${id}/review`); }
    lesson.cards.forEach((k) => d.seen.add(k.id));
    lesson.cards.forEach((k) => steps.push({ t: "teach", k }, { t: "check", k }));
    shuffle([...lesson.cards]).forEach((k) => steps.push({ t: "recap", k }));
    // Throwbacks: older words sprinkled in, missed and overdue ones first.
    pickThrowbacks(d.cards, d.progress, new Set(lesson.cards.map((k) => k.id)), T, 3).forEach((k, j) => steps.push({ t: j % 2 ? "recap" : "check", k, tb: true }));
  } else {
    let pool;
    if (kind === "misses") pool = d.cards.filter((k) => (MISSES[id] || []).includes(k.id));
    else {
      pool = d.cards.filter((k) => isLearned(d, k));
      if (kind === "review") pool = pool.filter((k) => d.progress[k.id].due <= T).sort((a, b) => d.progress[a.id].due.localeCompare(d.progress[b.id].due));
      else pool = shuffle(pool).sort((a, b) => (d.progress[a.id].box || 0) - (d.progress[b.id].box || 0));
      pool = pool.slice(0, kind === "review" ? 12 : 10);
    }
    if (!pool.length) { toast(kind === "review" ? "Nothing due yet. Nice." : "Learn a lesson first."); return go(`/c/${id}`); }
    if (kind === "misses") pool.forEach((k) => { d.seen.add(k.id); steps.push({ t: "teach", k, again: true }); });
    shuffle(pool).forEach((k, i) => steps.push({ t: i % 2 ? "recap" : "check", k }));
  }

  // Round state. Lessons are saved on this device so you can pick up where you left off.
  const KEY = mode === "learn" ? `sm-sess-${id}-${lesson.n}` : null;
  let S = { i: 0, results: {}, tbResults: {}, missed: [], xp: 0, xpSent: 0, sent: [], counted: false, combo: 0, best: 0, right: 0, asked: 0 };
  const persist = () => KEY && store.set(KEY, { ...S, day: T, steps: steps.map((st) => ({ t: st.t, id: st.k.id, again: !!st.again, retry: !!st.retry, tb: !!st.tb })) });
  const saved = KEY && store.get(KEY, null);
  const usable = saved && saved.steps?.every((st) => byId[st.id]) && daysBetween(saved.day, T) <= 7 && saved.i > 0 && saved.i < saved.steps.length;

  // Results not yet sent to the server (so quitting then finishing never double-counts).
  function pending() {
    const out = [];
    for (const [cid, ok] of Object.entries(S.results)) if (!S.sent.includes(cid)) out.push({ card_id: cid, ok, mode });
    for (const [cid, ok] of Object.entries(S.tbResults)) if (!S.sent.includes("tb:" + cid)) out.push({ card_id: cid, ok, mode: "review", tb: true });
    return out;
  }
  const markSent = (list) => list.forEach((r) => S.sent.push(r.tb ? "tb:" + r.card_id : r.card_id));

  function frame(inner, label) {
    const pct = Math.round((S.i / steps.length) * 100);
    app.innerHTML = `<div class="sess">
      <div class="sesstop"><button class="iconbtn" id="x" aria-label="Save and quit">✕</button>
        <div class="bar" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><i style="width:${pct}%"></i></div>
        <span class="combo">${S.combo >= 3 ? `🔥${S.combo}` : ""}</span></div>
      ${label ? `<div class="kicker">${label}</div>` : ""}${inner}</div>`;
    window.scrollTo(0, 0); // every new question starts at the top, progress bar in view
    $("x").onclick = quit;
  }
  async function quit() {
    if (S.i === 0) return go(`/c/${id}`);
    const list = pending(), frac = S.i / steps.length, counts = frac >= COUNTS_AT && !S.counted;
    const xp = S.xp - S.xpSent;
    if (list.length || xp || counts) {
      try { await postStudy({ course_id: id, kind: mode === "learn" ? "lesson" : "review", results: list.map(({ tb, ...r }) => r), xp, counts }); markSent(list); S.xpSent = S.xp; if (counts) S.counted = true; } catch (e) { toast(e.message); }
    }
    persist();
    await loadMe().catch(() => {});
    toast(counts ? "Saved. That counts for today's streak ✓" : mode === "learn" ? "Saved. Pick up where you left off anytime." : "Saved what you answered.");
    go(`/c/${id}`);
  }
  function next() {
    persist();
    if (S.i >= steps.length) return finish();
    const st = steps[S.i];
    if (st.t === "teach") {
      frame(`${cardView(st.k)}<div class="footbtn"><button class="btn primary block" id="n">${st.again ? "Got it, test me" : "Test me"}</button></div>`,
        st.again ? "One more look" : `New word · ${esc(lesson.topic)}`);
      $("n").onclick = () => { S.i++; next(); };
      return;
    }
    const q = st.t === "check" ? meaningQ(d, st.k) : termQ(d, st.k);
    const label = st.tb ? `Throwback · from Lesson ${lessonOf[st.k.id]}` : mode === "learn" ? (st.t === "check" ? "Quick check" : "Recap") : kind === "review" ? "Review" : kind === "misses" ? "Fix your misses" : "Practice";
    frame(`<div class="qbody"><p class="prompt">${q.html}</p>
      <div class="opts">${q.opts.map((o, j) => `<button class="opt" data-j="${j}"><span class="k">${"ABCD"[j]}</span><span>${esc(o)}</span></button>`).join("")}</div>
      <button class="btn ghost idk" id="idk">I don't know</button></div><div id="fb"></div>`, label);
    let done = false;
    app.querySelectorAll(".opt").forEach((b) => (b.onclick = () => { if (!done) { done = true; answer(q, st, b); } }));
    $("idk").onclick = () => { if (!done) { done = true; answer(q, st, null); } };
  }
  function answer(q, st, btn) {
    S.asked++;
    const idk = !btn; // "I don't know" counts as wrong, so the word gets re-taught and comes back
    const ok = !idk && q.opts[btn.dataset.j] === q.ans, k = st.k;
    const first = !st.retry && !(k.id in (st.tb ? S.tbResults : S.results));
    app.querySelectorAll(".opt").forEach((x) => { if (q.opts[x.dataset.j] === q.ans) x.classList.add("right"); else if (x !== btn) x.classList.add("dim"); x.disabled = true; });
    if (!ok && btn) btn.classList.add("wrong");
    if ($("idk")) $("idk").disabled = true;
    if (ok) { S.combo++; S.best = Math.max(S.best, S.combo); S.right++; S.xp += first ? 10 : 5; chime("good"); buzz(15); }
    else { S.combo = 0; if (!idk) { chime("bad"); buzz([30, 40, 30]); } if (!S.missed.includes(k.id)) S.missed.push(k.id); }
    if (st.tb) { if (!(k.id in S.tbResults)) S.tbResults[k.id] = ok; }
    else if (mode === "learn" && st.t === "recap" && !(k.id in S.results)) S.results[k.id] = ok && !S.missed.includes(k.id);
    else if (mode === "review" && !(k.id in S.results)) S.results[k.id] = ok;
    if (!ok) {
      if (mode === "learn" && !st.tb) steps.splice(Math.min(S.i + 3, steps.length), 0, { t: "teach", k, again: true }, { t: st.t, k, retry: true });
      else steps.push({ t: st.t === "check" ? "recap" : "check", k, retry: true, tb: st.tb });
    }
    const praise = S.combo >= 5 ? `${S.combo} in a row!` : ["Nice!", "Correct!", "You got it!", "Yes!"][(Math.random() * 4) | 0];
    $("fb").innerHTML = `<div class="feedback ${ok ? "ok" : "no"}"><h3>${ok ? praise : idk ? "No problem. Here it is" : "Not quite"}</h3>
      ${ok ? (k.hook ? `<p class="small">${esc(k.hook)}</p>` : "") : `<p><b>${esc(k.term)}</b>: ${esc(k.simple)}</p>${k.confuse ? `<p class="small">${esc(k.confuse)}</p>` : ""}<p class="small muted">It'll come back in a moment.</p>`}
      <button class="btn ${ok ? "good" : "bad"} block" id="cont">Continue</button></div>`;
    // The panel is pinned to the bottom of the screen, so nothing scrolls. Leave room under the answers for it.
    const c = $("cont"), fb = app.querySelector(".feedback"); c.focus({ preventScroll: true });
    app.querySelector(".sess").style.paddingBottom = fb.offsetHeight + 16 + "px";
    c.onclick = () => { S.i++; next(); };
  }
  async function finish() {
    S.xp += (mode === "learn" ? 20 : 0) + (S.asked && S.right === S.asked ? 10 : 0);
    const accuracy = S.asked ? Math.round((S.right / S.asked) * 100) : 100;
    let list = pending().filter((r) => kind !== "misses" || isLearned(d, { id: r.card_id }));
    if (mode === "learn") lesson.cards.forEach((k) => { if (!(k.id in S.results) && !S.sent.includes(k.id)) list.push({ card_id: k.id, ok: false, mode }); });
    if (kind === "misses") delete MISSES[id];
    if (KEY) store.del(KEY);
    const tbCount = Object.keys(S.tbResults).length;
    const r = await saveRound({ course_id: id, kind: mode === "learn" ? "lesson" : "review", results: list.map(({ tb, ...x }) => x), xp: S.xp - S.xpSent, counts: !S.counted });
    celebrate(r, {
      xp: S.xp, accuracy, best: S.best,
      text: mode === "learn" ? `You learned ${plural(lesson.cards.length, "new word")} in ${esc(lesson.topic)}${tbCount ? ` and refreshed ${plural(tbCount, "older one")}` : ""}.` : `${S.right} of ${S.asked} right.`,
      title: mode === "learn" ? "Lesson complete!" : "Round complete!",
    });
  }

  if (usable) {
    const el = sheet(`<h2>Pick up where you left off?</h2><p class="muted">You got ${Math.round((saved.i / saved.steps.length) * 100)}% through Lesson ${lesson.n}: ${esc(lesson.topic)}.</p>
      <button class="btn primary block" id="rs-go">Continue</button><button class="btn block" id="rs-new">Start over</button>`);
    el.querySelector("#rs-go").onclick = () => {
      el.remove();
      const { steps: ss, day, ...rest } = saved;
      S = { ...S, ...rest };
      steps = ss.map((st) => ({ t: st.t, k: byId[st.id], again: st.again, retry: st.retry, tb: st.tb }));
      next();
    };
    el.querySelector("#rs-new").onclick = () => { el.remove(); store.del(KEY); next(); };
  } else next();
});

async function saveRound(body) {
  const T = todayStr(), g0 = goalInfo(), before = { goalDone: g0.done, lit: ME.user.last_study_day === T };
  let saved = null;
  try { saved = await postStudy(body); } catch (e) { toast(e.message); }
  if (saved) { ME.user = { ...ME.user, ...saved.user }; ME.today = saved.today; }
  else if (!GUEST) {
    ME.user.xp += body.xp;
    if (body.counts !== false) {
      ME.today.rounds++; if (body.kind === "lesson") ME.today.lessons = (ME.today.lessons || 0) + 1; else ME.today.reviews = (ME.today.reviews || 0) + 1;
      if (!before.lit) { ME.user.streak = (ME.user.streak || 0) + 1; ME.user.last_study_day = T; }
    }
    toast("Saved on this phone. It'll sync when you're back online.");
  }
  try { await loadMe(); } catch {}
  return { ...before, used_freeze: saved?.used_freeze || 0, earned_freeze: !!saved?.earned_freeze };
}
function celebrate(before, { xp, accuracy, best, text, title }) {
  const G = goalInfo(), goalHit = !before.goalDone && G.done, streakUp = !before.lit && ME.user.last_study_day === todayStr();
  const emoji = goalHit ? "🏆" : streakUp ? "🔥" : accuracy === 100 ? "🎯" : "⭐";
  const head = goalHit ? "Daily goal complete!" : streakUp ? `${ME.user.streak}-day streak!` : title;
  const extra = before.used_freeze ? `<div class="notice">❄️ A streak freeze covered the day you missed. Your streak is safe.</div>` : before.earned_freeze ? `<div class="notice ok">❄️ <b style="display:inline">You earned a streak freeze!</b> It'll save your streak if you ever miss a day.</div>` : "";
  const due = ME.courses.reduce((a, c) => a + (reviewSkipped(c.id) ? 0 : c.due), 0), reviewed = (ME.today.reviews || 0) > 0;
  app.innerHTML = `<div class="sess"><div class="cele">
    <div class="big-emoji">${emoji}</div><h1>${head}</h1>
    <p class="muted">${text} ${best >= 3 ? `Best run: ${best} in a row.` : ""}</p>
    <div class="tiles"><div class="tile xp"><b id="xpn">0</b><span>XP</span></div><div class="tile fl"><b>${ME.user.streak}</b><span>Streak</span></div><div class="tile acc"><b>${accuracy}%</b><span>Correct</span></div></div>
    ${extra}
    <div class="todaybox">
      <div class="${G.done ? "ok" : ""}"><span>${G.done ? "✅" : "⬜"}</span><b>Daily goal</b><span class="grow"></span>${Math.min(G.did, G.goal)} of ${plural(G.goal, G.unit)}${G.did > G.goal ? ` <span class="pill acc">+${G.did - G.goal} bonus</span>` : ""}</div>
      <div class="${reviewed || !due ? "ok" : ""}"><span>${reviewed ? "✅" : due ? "⬜" : "✅"}</span><b>Reviews</b><span class="grow"></span>${reviewed ? "Done today" : due ? `${due} words waiting` : "Nothing due"}</div>
    </div>
    <p class="muted small">${G.done ? "Today's goal is done. Anything more is a bonus that puts you ahead." : `${plural(G.goal - G.did, "more " + G.unit)} to hit today's goal.`}</p>
  </div><div class="footbtn stack"><button class="btn primary block" id="more">${G.done ? "Do a bonus round" : `Next ${G.unit} (${G.goal - G.did} to go)`}</button><a class="btn block" href="#/">Done for now</a></div></div>`;
  countUp($("xpn"), xp); chime("win"); buzz([20, 60, 20, 60, 40]); confetti(goalHit || streakUp ? 1.6 : 0.8);
  $("more").onclick = () => startBest();
}

// ---------- practice exam ----------
route(/^\/exam\/([\w-]+)$/, async (id) => {
  let d;
  try { d = await loadCourse(id); } catch (e) { toast(e.message); return go("/"); }
  const learnedTopics = new Set(d.cards.filter((k) => isLearned(d, k)).map((k) => k.topic));
  const topics = [...new Set(d.cards.map((k) => k.topic))];
  const S = { count: 20, from: learnedTopics.size ? "learned" : "all", timer: false, topics: new Set(topics) };
  const poolFor = () => {
    const okTopic = (t) => S.topics.has(t) && (S.from === "all" || learnedTopics.has(t));
    return { cards: d.cards.filter((k) => okTopic(k.topic) && (S.from === "all" || isLearned(d, k))), qs: d.questions.filter((q) => okTopic(q.topic)) };
  };
  const setup = () => {
    const p = poolFor(), avail = p.cards.length + p.qs.length;
    const seg = (name, vals, cur, fmt = (v) => v) => `<div class="seg wrap">${vals.map((v) => `<button type="button" data-${name}="${v}" aria-pressed="${String(cur) === String(v)}">${fmt(v)}</button>`).join("")}</div>`;
    app.innerHTML = `${topbar("/c/" + id)}<div class="stack">
      <h1>Practice exam</h1><p class="muted">Like the real thing: no hints until the end. Then you see your score, your weak topics, and every miss explained.</p>
      <div class="card stack">
        <div class="field" style="font-weight:700;font-size:15px">Questions${seg("n", [10, 20, 30, 50], S.count)}</div>
        <div class="field" style="font-weight:700;font-size:15px">Cover${seg("from", ["learned", "all"], S.from, (v) => (v === "learned" ? "What I've learned" : "Everything"))}</div>
        <div class="field" style="font-weight:700;font-size:15px">Timer${seg("timer", ["off", "on"], S.timer ? "on" : "off", (v) => (v === "on" ? "1 min / question" : "Off"))}</div>
        <details><summary class="small" style="font-weight:700;cursor:pointer">Topics (${S.topics.size} of ${topics.length})</summary>
          <div class="stack" style="gap:6px;margin-top:10px">${topics.map((t) => `<label class="checkrow"><input type="checkbox" data-topic="${esc(t)}" ${S.topics.has(t) ? "checked" : ""}> ${esc(t)}</label>`).join("")}</div></details>
        <p class="muted small">${avail ? `${avail} possible questions${d.questions.length ? `, including ${p.qs.length} exam-style ones from your AI` : ""}.` : "Learn a lesson first, or switch to Everything."}</p>
        <button class="btn primary block" id="e-go" ${avail ? "" : "disabled"}>Start exam</button>
      </div></div>`;
    app.querySelectorAll("[data-n]").forEach((b) => (b.onclick = () => { S.count = +b.dataset.n; setup(); }));
    app.querySelectorAll("[data-from]").forEach((b) => (b.onclick = () => { S.from = b.dataset.from; setup(); }));
    app.querySelectorAll("[data-timer]").forEach((b) => (b.onclick = () => { S.timer = b.dataset.timer === "on"; setup(); }));
    app.querySelectorAll("[data-topic]").forEach((b) => (b.onchange = () => { b.checked ? S.topics.add(b.dataset.topic) : S.topics.delete(b.dataset.topic); const o = app.querySelector("details").open; setup(); app.querySelector("details").open = o; }));
    $("e-go").onclick = () => run(p);
  };
  const run = (p) => {
    const n = Math.min(S.count, p.cards.length + p.qs.length);
    const ai = shuffle([...p.qs]).slice(0, Math.min(p.qs.length, Math.ceil(n * 0.5))).map(aiQ);
    d.seen = S.from === "all" ? null : new Set(d.cards.filter((k) => isLearned(d, k)).map((k) => k.id));
    const cardQs = shuffle([...p.cards]).slice(0, n - ai.length).map((k, j) => [meaningQ, termQ, tfQ][j % 3](d, k));
    const qs = shuffle(ai.concat(cardQs)), answers = new Array(qs.length).fill(null);
    const endAt = S.timer ? Date.now() + qs.length * 60e3 : 0;
    let i = 0, timerId = null;
    const tick = () => {
      const el = $("timer"); if (!el) return;
      const ms = endAt - Date.now();
      if (ms <= 0) { clearInterval(timerId); return done(); }
      el.textContent = `${Math.floor(ms / 60e3)}:${pad(Math.floor((ms % 60e3) / 1000))}`;
    };
    if (endAt) { timerId = setInterval(tick, 1000); cleanupFns.push(() => clearInterval(timerId)); }
    const show = () => {
      window.scrollTo(0, 0);
      const q = qs[i];
      app.innerHTML = `<div class="sess">
        <div class="sesstop"><button class="iconbtn" id="x" aria-label="Quit">✕</button><div class="bar"><i style="width:${(i / qs.length) * 100}%"></i></div>
          <span class="combo" id="timer" style="color:var(--muted)">${endAt ? "" : `${i + 1}/${qs.length}`}</span></div>
        <div class="kicker">Question ${i + 1} of ${qs.length} · ${esc(q.topic || "")}</div>
        <div class="qbody"><p class="prompt">${q.html}</p>
        <div class="opts">${q.opts.map((o, j) => `<button class="opt ${answers[i] === j ? "sel" : ""}" data-j="${j}"><span class="k">${"ABCDE"[j]}</span><span>${esc(o)}</span></button>`).join("")}</div></div>
        <button class="btn ghost idk ${answers[i] === -1 ? "on" : ""}" id="e-idk">I don't know</button>
        <div class="footbtn row">${i ? `<button class="btn" id="prev" aria-label="Previous question">◀</button>` : ""}<button class="btn primary grow" id="nx" ${answers[i] === null ? "disabled" : ""}>${i === qs.length - 1 ? "Finish exam" : "Next"}</button></div></div>`;
      if (endAt) tick();
      let armed = false;
      $("x").onclick = () => { if (armed) { clearInterval(timerId); return go(`/c/${id}`); } armed = true; toast("Tap ✕ again to quit the exam."); };
      app.querySelectorAll(".opt").forEach((b) => (b.onclick = () => { answers[i] = +b.dataset.j; app.querySelectorAll(".opt").forEach((x) => x.classList.toggle("sel", x === b)); $("e-idk").classList.remove("on"); $("nx").disabled = false; buzz(8); }));
      $("e-idk").onclick = () => { answers[i] = -1; app.querySelectorAll(".opt").forEach((x) => x.classList.remove("sel")); $("e-idk").classList.add("on"); $("nx").disabled = false; };
      if ($("prev")) $("prev").onclick = () => { i--; show(); };
      $("nx").onclick = () => { if (i < qs.length - 1) { i++; show(); } else done(); };
    };
    const done = async () => {
      clearInterval(timerId);
      const graded = qs.map((q, j) => ({ q, pick: answers[j] >= 0 ? answers[j] : null, ok: answers[j] >= 0 && q.opts[answers[j]] === q.ans }));
      const score = graded.filter((g) => g.ok).length, pct = Math.round((score / qs.length) * 100);
      const byTopic = {};
      graded.forEach((g) => { const t = g.q.topic || "General"; byTopic[t] ||= { r: 0, n: 0 }; byTopic[t].n++; if (g.ok) byTopic[t].r++; });
      const missCards = [...new Set(graded.filter((g) => !g.ok && g.q.k).map((g) => g.q.k.id))];
      MISSES[id] = missCards;
      const before = await saveRound({ course_id: id, kind: "exam", xp: score * 5 + (pct === 100 ? 20 : 0), exam: { score, total: qs.length },
        results: missCards.filter((cid) => isLearned(d, { id: cid })).map((card_id) => ({ card_id, ok: false, mode: "review" })) });
      const goalHit = !before.goalDone && goalInfo().done;
      const verdict = pct >= 90 ? "You're ready. 🎯" : pct >= 80 ? "Looking strong." : pct >= 70 ? "Getting there." : "Good practice. Study the misses.";
      app.innerHTML = `${topbar("/c/" + id)}<div class="stack">
        <div class="cele" style="padding:10px 0"><div class="big-emoji">${pct >= 80 ? "🏆" : pct >= 60 ? "📈" : "💪"}</div><h1>${pct}%</h1><p class="muted">${score} of ${qs.length} right. ${verdict}${goalHit ? " Daily goal done!" : ""}</p></div>
        <div class="card stack"><h3>By topic</h3>${Object.entries(byTopic).sort((a, b) => a[1].r / a[1].n - b[1].r / b[1].n).map(([t, v]) => {
          const tp = Math.round((v.r / v.n) * 100);
          return `<div class="stack" style="gap:4px"><div class="spread small"><span>${esc(t)}</span><b style="color:${tp >= 80 ? "var(--good)" : tp >= 60 ? "var(--gold)" : "var(--bad)"}">${v.r}/${v.n}</b></div><div class="bar" style="height:8px"><i style="width:${tp}%;background:${tp >= 80 ? "var(--good)" : tp >= 60 ? "var(--gold)" : "var(--bad)"}"></i></div></div>`;
        }).join("")}</div>
        ${missCards.length ? `<button class="btn primary block" id="r-miss">Study the ${missCards.length === 1 ? "word" : missCards.length + " words"} you missed</button>` : ""}
        ${graded.some((g) => !g.ok) ? `<h3>What you missed</h3>${graded.filter((g) => !g.ok).map((g) => `<div class="card stack" style="gap:8px">
          <p class="prompt" style="font-size:18px">${g.q.html}</p>
          ${g.pick !== null ? `<p class="small" style="color:var(--bad)">✗ You said: ${esc(g.q.opts[g.pick])}</p>` : `<p class="small muted">You said you didn't know</p>`}
          <p class="small" style="color:var(--good)">✓ ${esc(g.q.ans)}</p>
          ${g.q.why || g.q.k ? `<p class="small muted">${esc(g.q.why || (g.q.k.term + ": " + g.q.k.simple))}</p>` : ""}</div>`).join("")}` : ""}
        <div class="row"><button class="btn grow" id="r-again">Retake</button><a class="btn grow" href="#/c/${id}">Done</a></div>
      </div>`;
      chime("win"); confetti(pct >= 80 ? 1.4 : 0.6);
      if ($("r-miss")) $("r-miss").onclick = () => go(`/s/${id}/misses`);
      $("r-again").onclick = setup;
    };
    show();
  };
  setup();
});

// ---------- settings ----------
route(/^\/settings$/, async () => {
  const u = ME.user;
  const hours = Array.from({ length: 24 }, (_, h) => `<option value="${h}" ${h === u.remind_hour ? "selected" : ""}>${((h + 11) % 12) + 1}:00 ${h < 12 ? "AM" : "PM"}</option>`).join("");
  app.innerHTML = `${topbar("/")}<div class="stack">
    <h1>Settings</h1>
    ${GUEST ? `<div class="card stack">
      <h3>👤 You're using it without an account</h3>
      <div class="notice warn">Everything is saved only in this browser on this device.</div>
      <div class="notice">Don't use a private or incognito window, and don't clear your browsing data, or it's gone.${isIOS ? " On iPhone, the home screen app and Safari keep separate data, so stick to one." : ""}</div>
      <a class="btn primary block" href="#/join">Create an account and keep everything</a>
      <a class="btn block" href="#/welcome" id="s-signin">I already have an account</a>
    </div>` : ""}
    <div class="card">
      ${GUEST ? "" : `<div class="setrow"><span>Username</span><div style="max-width:60%;text-align:right"><input id="s-user" value="${esc(u.username || "")}" autocapitalize="none" spellcheck="false" maxlength="20"><span class="small" id="s-user-msg" style="display:block;color:var(--muted)"></span></div></div>`}
      <div class="setrow"><span>Name</span><input id="s-name" value="${esc(u.name || "")}" style="max-width:55%"></div>
      <div class="setrow"><span>Look</span><div class="seg" role="group" aria-label="Light or dark">${[["light", "Light"], ["dark", "Dark"]].map(([v, l]) => `<button data-th="${v}" aria-pressed="${themeNow() === v}">${l}</button>`).join("")}</div></div>
      <div class="setrow"><span>Daily goal<br><span class="muted small">lessons a day</span></span><div class="seg" role="group" aria-label="Lessons per day">${[1, 2, 3, 5].map((n) => `<button data-g="${n}" aria-pressed="${u.daily_goal === n}">${n}</button>`).join("")}</div></div>
      ${GUEST ? "" : `<div class="setrow"><span>Reminder time</span><select id="s-hour" aria-label="Reminder time">${hours}</select></div>`}
      ${GUEST ? "" : `<div class="setrow"><span>Show me on the leaderboard</span><div class="seg"><button id="s-lb" aria-pressed="${!u.lb_hidden}">${u.lb_hidden ? "Hidden" : "Shown"}</button></div></div>`}
      <div class="setrow"><span>Sounds</span><div class="seg"><button id="s-snd" aria-pressed="${store.get("sm-sound", true)}">${store.get("sm-sound", true) ? "On" : "Off"}</button></div></div>
    </div>
    ${GUEST ? "" : `<div class="card stack"><h3>Daily reminders</h3><p class="muted small" id="n-status">Checking…</p>
      <button class="btn primary block" id="n-on" hidden>Turn on reminders</button><button class="btn block" id="n-test" hidden>Send a test reminder</button></div>
    <div class="card stack"><h3>Password recovery</h3>
      <p class="muted small">${u.has_security ? "✓ Security questions are set. You can use them if you forget your password." : "Set security questions so you can reset your password if you forget it."}</p>
      <button class="btn block" id="s-sec">${u.has_security ? "Change security questions" : "Set up security questions"}</button></div>`}
    <div class="card stack"><h3>Put it on your home screen</h3>
      <p class="muted small">Opens like a real app at <b style="color:var(--fg)">studymania.app</b>. ${GUEST ? "Without an account, do this first and always open it from the icon." : isIOS ? "On iPhone, reminders only work from the home screen app. You'll sign in once there." : ""}</p>
      <button class="btn block" id="s-home">Show me how (iPhone, Samsung, Android)</button></div>
    <div class="card stack">
      ${GUEST ? `<button class="btn ghost danger" id="s-wipe">Erase everything on this device</button>` : `
      <p class="muted small">Signed in as @${esc(u.username || "")} (${esc(u.email)}). Best streak: ${plural(u.best_streak || 0, "day")}. Streak freezes: ${u.freezes || 0} of 2. You earn one every 7 days in a row.</p>
      <button class="btn block" id="s-out">Sign out</button><button class="btn ghost danger" id="s-del">Delete my account</button>`}
    </div></div>`;
  const patch = async (body) => { try { const r = await api("/me", { method: "PATCH", body }); ME.user = { ...ME.user, ...r.user }; toast("Saved."); } catch (e) { toast(e.message); } };
  $("s-name").onchange = (e) => patch({ name: e.target.value });
  if ($("s-user")) { wireUsernameCheck($("s-user"), $("s-user-msg"), u.username); $("s-user").onchange = (e) => patch({ username: e.target.value }); }
  if ($("s-lb")) $("s-lb").onclick = async (e) => { const hide = !ME.user.lb_hidden; await patch({ lb_hidden: hide }); e.target.textContent = hide ? "Hidden" : "Shown"; e.target.setAttribute("aria-pressed", !hide); };
  app.querySelectorAll("[data-th]").forEach((b) => (b.onclick = () => { store.set("sm-theme", b.dataset.th); applyTheme(b.dataset.th); render(); }));
  if ($("s-hour")) $("s-hour").onchange = async (e) => { await patch({ remind_hour: +e.target.value, tz: tz() }); pushUI(); };
  app.querySelectorAll("[data-g]").forEach((b) => (b.onclick = async () => { await patch({ daily_goal: +b.dataset.g }); app.querySelectorAll("[data-g]").forEach((x) => x.setAttribute("aria-pressed", x === b)); }));
  $("s-snd").onclick = (e) => { const v = !store.get("sm-sound", true); store.set("sm-sound", v); e.target.textContent = v ? "On" : "Off"; e.target.setAttribute("aria-pressed", v); if (v) chime("good"); };
  if ($("s-signin")) $("s-signin").onclick = (e) => { e.preventDefault(); GUEST = false; store.set("sm-guest", false); ME = null; authView("login"); };
  if ($("s-home")) $("s-home").onclick = homeScreenSheet;
  if ($("s-sec")) $("s-sec").onclick = () => securitySheet(false, () => render());
  const twice = (btn, label, fn) => { let armed = false; btn.onclick = async () => { if (!armed) { armed = true; btn.textContent = label; return; } await fn(); }; };
  if ($("s-wipe")) twice($("s-wipe"), "Tap again to erase everything", async () => { clearGuest(); GUEST = false; store.set("sm-guest", false); ME = null; go("/welcome"); });
  if ($("s-out")) $("s-out").onclick = async () => { await api("/logout", { method: "POST" }).catch(() => {}); ME = null; go("/welcome"); };
  if ($("s-del")) twice($("s-del"), "Tap again to delete everything", async () => { await api("/account", { method: "DELETE" }); ME = null; go("/welcome"); });
  if (!GUEST) pushUI();
});

async function pushUI() {
  const st = $("n-status"), on = $("n-on"), test = $("n-test");
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    st.textContent = isIOS && !standalone ? "Add Study Mania to your home screen first, then open it from there to turn on reminders." : "This browser can't do reminders. Try Chrome, or Safari from the home screen.";
    return;
  }
  const reg = await navigator.serviceWorker.ready, sub = await reg.pushManager.getSubscription();
  if (sub && Notification.permission === "granted") store.set("sm-push-on", true);
  if (sub && Notification.permission === "granted") {
    const h = +$("s-hour").value, h2 = secondReminderHour(h), fmt = (x) => `${((x + 11) % 12) + 1}:00 ${x < 12 ? "AM" : "PM"}`;
    st.textContent = `On. On days you haven't studied yet, you'll get a nudge at ${fmt(h)}${h2 !== null ? `, and one more at ${fmt(h2)} if you still haven't` : ""}.`;
    test.hidden = false;
  }
  else if (Notification.permission === "denied") st.textContent = "Notifications are blocked for Study Mania. Turn them on in your phone's settings, then come back.";
  else { st.textContent = "Get one nudge a day so you don't break your streak."; on.hidden = false; }
  on.onclick = enablePush;
  test.onclick = async () => {
    test.disabled = true;
    try { const r = await api("/push/test", { method: "POST" }); toast(r.sent ? "Sent! It should pop up in a few seconds." : r.why || "Couldn't send. Turn reminders off and on again.", 6000); }
    catch (e) { toast(e.message); }
    test.disabled = false;
  };
}
async function enablePush() {
  try {
    const { key } = await api("/push/key");
    if (!key) return toast("Reminders aren't set up on the server yet.");
    if ((await Notification.requestPermission()) !== "granted") return toast("No problem. You can turn reminders on later.");
    const reg = await navigator.serviceWorker.ready, raw = atob(key.replace(/-/g, "+").replace(/_/g, "/"));
    const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: Uint8Array.from(raw, (c) => c.charCodeAt(0)) });
    await api("/push/subscribe", { method: "POST", body: sub.toJSON() });
    store.set("sm-push-on", true);
    await api("/me", { method: "PATCH", body: { tz: tz() } });
    toast("Reminders on."); render();
  } catch (e) { toast(e.message || "Couldn't turn on reminders."); }
}

// ---------- boot ----------
// Study Mania lives at studymania.app now. The old address forwards there,
// except for no-account users, whose progress is stored on the old address.
if (location.hostname === "studymania.pages.dev") {
  if (!hasGuestData()) { location.replace("https://studymania.app/" + location.hash); }
  else setTimeout(() => toast("Study Mania moved to studymania.app. Make an account in Settings to take your progress with you.", 8000), 1500);
}
// Offline support + automatic updates: check for a new version on open and whenever the app comes back
// to the screen. When one is ready, reload into it (but never in the middle of a lesson or exam).
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" }).then((reg) => {
    reg.update().catch(() => {});
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") reg.update().catch(() => {}); });
  }).catch(() => {});
  let hadController = !!navigator.serviceWorker.controller, pendingReload = false;
  const safeToReload = () => !/^#\/(s|exam|add)\//.test(location.hash) && !/^#\/add$/.test(location.hash);
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!hadController) { hadController = true; return; } // first install, nothing to refresh
    if (safeToReload()) location.reload(); else pendingReload = true;
  });
  window.addEventListener("hashchange", () => { if (pendingReload && safeToReload()) location.reload(); });
}
window.addEventListener("online", flushOutbox);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && ME && (location.hash === "" || location.hash === "#/")) loadMe().then(render).catch(() => {});
});
render();
