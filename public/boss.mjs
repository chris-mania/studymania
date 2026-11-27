// Boss Battle villains. All original designs, drawn in a 120x120 box, facing left (toward your Maniac).
const INK = "#14161c";
const eye = (cx, cy, r, iris) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#fff"/><circle cx="${cx - r * 0.3}" cy="${cy + 1}" r="${r * 0.55}" fill="${iris}"/><circle cx="${cx - r * 0.35}" cy="${cy + 1}" r="${r * 0.25}" fill="${INK}"/>`;
const brow = (x1, y1, x2, y2) => `<path d="M${x1} ${y1} L${x2} ${y2}" stroke="${INK}" stroke-width="4.5" stroke-linecap="round"/>`;
const teeth = (x, y, w) => `<path d="M${x} ${y} Q${x + w / 2} ${y + 16} ${x + w} ${y} Z" fill="${INK}"/><path d="M${x + 3} ${y + 1} L${x + w * 0.25} ${y + 6} L${x + w * 0.4} ${y + 2} L${x + w * 0.55} ${y + 7} L${x + w * 0.7} ${y + 2} L${x + w - 3} ${y + 1}" fill="#fff"/>`;

export const BOSSES = [
  {
    id: "forgetter", name: "The Forgetter", color: "#7b3fa8",
    taunt: "I'll wipe those words right out of your head!",
    svg: () => `<path d="M30 38 L22 14 L42 30 Z" fill="#e9e3d6"/><path d="M90 38 L98 14 L78 30 Z" fill="#e9e3d6"/>
      <path d="M60 26 C92 26 108 56 106 84 C104 104 86 114 60 114 C34 114 16 104 14 84 C12 56 28 26 60 26 Z" fill="#7b3fa8"/>
      <path d="M24 70 C30 60 38 74 46 64 C54 74 66 60 74 70 C82 60 90 74 98 66" fill="none" stroke="#5a2a80" stroke-width="3"/>
      <rect x="28" y="80" width="18" height="9" rx="2" fill="#f4ecdc" transform="rotate(-10 37 84)"/><rect x="74" y="84" width="18" height="9" rx="2" fill="#f4ecdc" transform="rotate(8 83 88)"/>
      ${eye(60, 56, 17, "#e23b5a")}${brow(40, 44, 54, 50)}${brow(80, 44, 66, 50)}${teeth(42, 92, 36)}`,
  },
  {
    id: "goblin", name: "Cram Goblin", color: "#4caf50", attack: "throw", shot: "F-",
    taunt: "All-nighter time! You'll never remember this!",
    svg: () => `<path d="M18 50 L2 34 L26 44 Z M102 50 L118 34 L94 44 Z" fill="#3e8f41"/>
      <path d="M60 30 C88 30 100 50 100 74 C100 100 84 114 60 114 C36 114 20 100 20 74 C20 50 32 30 60 30 Z" fill="#5cbf60"/>
      <path d="M40 30 L46 14 L52 30 Z M66 30 L74 12 L80 32 Z" fill="#3e8f41"/>
      ${eye(46, 62, 10, "#f2c94c")}${eye(74, 62, 10, "#f2c94c")}${brow(34, 50, 52, 56)}${brow(86, 50, 68, 56)}
      <path d="M36 84 Q60 108 84 84 Z" fill="${INK}"/><path d="M40 85 L46 92 L52 86 L58 93 L64 86 L70 93 L76 86 L80 86" fill="#fff"/>
      <rect x="86" y="94" width="22" height="16" rx="2" fill="#e2543e" transform="rotate(12 97 102)"/><rect x="90" y="96" width="14" height="12" fill="#f4ecdc" transform="rotate(12 97 102)"/>`,
  },
  {
    id: "fog", name: "Brain Fog", color: "#8a94a6", attack: "zap",
    taunt: "Everything is getting... blurry... heh heh.",
    svg: () => `<path d="M28 96 C10 96 8 72 26 68 C22 46 46 36 58 48 C64 30 92 32 94 54 C112 54 116 80 100 92 C98 104 84 108 74 102 C66 112 44 112 40 102 C34 104 28 102 28 96 Z" fill="#a9b2c3"/>
      <path d="M34 92 C40 86 50 90 54 84 M66 88 C74 84 84 88 90 82" fill="none" stroke="#8a94a6" stroke-width="3"/>
      ${eye(48, 70, 9, "#4b98f7")}${eye(74, 70, 9, "#4b98f7")}${brow(38, 58, 54, 64)}${brow(84, 58, 68, 64)}
      <path d="M50 90 Q60 82 72 90" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>
      <path d="M44 106 L38 118 L46 116 L42 126" fill="none" stroke="#f2c94c" stroke-width="3.5" stroke-linejoin="round"/>`,
  },
  {
    id: "drake", name: "Deadline Drake", color: "#e2543e", attack: "pound",
    taunt: "Tick tock! Your exam is coming!",
    svg: () => `<path d="M88 50 L116 30 L108 56 L118 60 L96 70 Z" fill="#b8402f"/><path d="M32 50 L4 30 L12 56 L2 60 L24 70 Z" fill="#b8402f"/>
      <path d="M60 34 C86 34 98 54 98 78 C98 100 82 114 60 114 C38 114 22 100 22 78 C22 54 34 34 60 34 Z" fill="#e2543e"/>
      <path d="M44 36 L40 18 L52 32 Z M76 36 L80 18 L68 32 Z" fill="#f2c94c"/>
      ${eye(48, 60, 9, "#f2c94c")}${eye(72, 60, 9, "#f2c94c")}${brow(38, 48, 54, 54)}${brow(82, 48, 66, 54)}
      <path d="M52 74 L56 70 M68 74 L64 70" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>
      <circle cx="60" cy="94" r="13" fill="#f4ecdc" stroke="${INK}" stroke-width="2.5"/><path d="M60 94 L60 86 M60 94 L66 97" stroke="${INK}" stroke-width="2.5" stroke-linecap="round"/>`,
  },
  {
    id: "specter", name: "Static Specter", color: "#45b7e6", attack: "spin",
    taunt: "Bzzzt! I scramble everything you study!",
    svg: () => `<path d="M60 22 C90 22 100 48 100 72 L100 104 L90 96 L80 108 L70 96 L60 110 L50 96 L40 108 L30 96 L20 104 L20 72 C20 48 30 22 60 22 Z" fill="#7fd6ff" opacity=".92"/>
      <path d="M34 40 L42 52 L36 54 L46 66" fill="none" stroke="#fff" stroke-width="3" stroke-linejoin="round" opacity=".8"/>
      ${eye(48, 58, 10, "#8d5bd6")}${eye(72, 58, 10, "#8d5bd6")}${brow(38, 46, 54, 52)}${brow(82, 46, 66, 52)}
      <path d="M44 78 L50 74 L56 80 L62 74 L68 80 L74 74 L78 78" fill="none" stroke="${INK}" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"/>
      <path d="M100 50 L112 46 L106 56 L116 54" fill="none" stroke="#f2c94c" stroke-width="3" stroke-linejoin="round"/>`,
  },
];
// More bosses. Each one attacks its own way (attack: slam | throw | zap | pound | spin).
BOSSES.push(
  { id: "slug", name: "Snooze Slug", color: "#5b8def", attack: "throw", shot: "z",
    taunt: "Just five more minutes... forever.",
    svg: () => `<path d="M14 108 C14 80 30 60 50 60 C58 40 92 36 100 62 C112 70 112 100 104 108 Z" fill="#7aa7ff"/><path d="M50 60 C54 44 70 34 86 40 L96 22 L102 46 Z" fill="#3f6fb0"/><circle cx="96" cy="20" r="6" fill="#f4f6fa"/>
      ${eye(70, 72, 9, "#2c3e75").replace(/r="9" fill="#fff"/, 'r="9" fill="#fff"')}<path d="M60 70 Q70 64 80 70" stroke="${INK}" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M84 70 Q94 64 104 70" stroke="${INK}" stroke-width="4" fill="none" stroke-linecap="round"/>
      <path d="M72 90 Q80 96 92 90" fill="none" stroke="${INK}" stroke-width="3.5" stroke-linecap="round"/><path d="M90 92 Q92 100 88 104" fill="none" stroke="#bfe0ff" stroke-width="3" stroke-linecap="round"/>` },
  { id: "popquiz", name: "Pop Quiz", color: "#f2c94c", attack: "throw", shot: "?",
    taunt: "Surprise! Pencils down... NOW!",
    svg: () => `<path d="M30 20 L84 20 L96 32 L96 112 L30 112 Z" fill="#fff6c2" stroke="${INK}" stroke-width="3"/><path d="M84 20 L84 32 L96 32" fill="#e9dca0" stroke="${INK}" stroke-width="3"/>
      <path d="M38 40 H86 M38 50 H80" stroke="#c9b27a" stroke-width="3"/>${eye(50, 70, 9, "#e2543e")}${eye(76, 70, 9, "#e2543e")}${brow(40, 58, 56, 64)}${brow(86, 58, 70, 64)}
      ${teeth(46, 88, 34)}<text x="100" y="20" font-family="Fredoka,sans-serif" font-weight="700" font-size="26" fill="#e2543e">?</text>` },
  { id: "scroller", name: "Doom Scroller", color: "#8d5bd6", attack: "zap",
    taunt: "One more video. Then one more. Then one more...",
    svg: () => `<rect x="30" y="14" width="60" height="100" rx="12" fill="${INK}"/><rect x="35" y="22" width="50" height="80" rx="4" fill="#8d5bd6"/><rect x="52" y="17" width="16" height="3" rx="1.5" fill="#333"/>
      ${eye(48, 50, 9, "#ff7eb6")}${eye(72, 50, 9, "#ff7eb6")}${brow(38, 38, 54, 44)}${brow(82, 38, 66, 44)}<path d="M44 74 Q60 90 76 74 Z" fill="${INK}"/>
      <path d="M40 92 H80" stroke="#fff" stroke-width="3" opacity=".5"/><path d="M18 60 L8 54 M102 60 L112 54 M18 74 L6 76 M102 74 L114 76" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>` },
  { id: "procrast", name: "Procrasti-Bot", color: "#ff8a1f", attack: "slam",
    taunt: "Why do it now when you can panic later?",
    svg: () => `<rect x="24" y="36" width="72" height="66" rx="14" fill="#ff8a1f"/><rect x="34" y="104" width="14" height="10" rx="3" fill="#5b6b86"/><rect x="72" y="104" width="14" height="10" rx="3" fill="#5b6b86"/>
      <path d="M60 36 L60 20" stroke="#5b6b86" stroke-width="4"/><circle cx="60" cy="16" r="6" fill="#e2543e"/><rect x="34" y="46" width="52" height="24" rx="8" fill="${INK}"/>
      <rect x="40" y="52" width="14" height="10" rx="3" fill="#7fd6ff"/><rect x="66" y="52" width="14" height="10" rx="3" fill="#7fd6ff"/>
      <circle cx="60" cy="86" r="10" fill="#f4ecdc" stroke="${INK}" stroke-width="2.5"/><path d="M60 86 L60 79 M60 86 L65 89" stroke="${INK}" stroke-width="2.5" stroke-linecap="round"/>` },
  { id: "golem", name: "Gloom Golem", color: "#8a94a6", attack: "pound",
    taunt: "Feeling heavy? That's me. On your brain.",
    svg: () => `<path d="M22 112 L18 64 L34 34 L64 24 L92 36 L104 66 L98 112 Z" fill="#7d8597" stroke="#5a6170" stroke-width="3" stroke-linejoin="round"/>
      <path d="M40 50 L52 58 M78 52 L88 46 M30 88 L42 84 M80 92 L94 90" stroke="#5a6170" stroke-width="3" stroke-linecap="round"/>
      ${eye(48, 64, 8, "#45d0c6")}${eye(72, 64, 8, "#45d0c6")}${brow(38, 54, 54, 58)}${brow(82, 54, 66, 58)}<path d="M46 86 L74 86" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>` },
  { id: "hornet", name: "Hype Hornet", color: "#f2c94c", attack: "spin",
    taunt: "Bzz bzz! Distraction incoming!",
    svg: () => `<ellipse cx="40" cy="40" rx="20" ry="12" fill="#cfe9ff" opacity=".85" transform="rotate(-30 40 40)"/><ellipse cx="80" cy="40" rx="20" ry="12" fill="#cfe9ff" opacity=".85" transform="rotate(30 80 40)"/>
      <ellipse cx="60" cy="76" rx="34" ry="32" fill="#f2c94c"/><path d="M28 70 Q60 80 92 70 M30 88 Q60 98 90 88" stroke="${INK}" stroke-width="8" fill="none"/>
      ${eye(48, 58, 8, "#e2543e")}${eye(72, 58, 8, "#e2543e")}${brow(38, 48, 54, 52)}${brow(82, 48, 66, 52)}<path d="M60 108 L56 118 L64 118 Z" fill="${INK}"/>
      <path d="M50 30 Q46 18 40 16 M70 30 Q74 18 80 16" stroke="${INK}" stroke-width="3" fill="none" stroke-linecap="round"/>` },
  { id: "kraken", name: "Couch Kraken", color: "#2bb673", attack: "slam",
    taunt: "Stay on the couch with me... forever...",
    svg: () => `<path d="M24 100 C10 104 10 116 22 114 M40 104 C34 116 44 120 48 112 M72 104 C76 118 88 116 84 108 M96 100 C110 104 112 116 98 114" fill="none" stroke="#2bb673" stroke-width="9" stroke-linecap="round"/>
      <path d="M60 20 C92 20 100 50 98 76 C96 100 80 108 60 108 C40 108 24 100 22 76 C20 50 28 20 60 20 Z" fill="#2bb673"/>
      <circle cx="40" cy="40" r="4" fill="#1f8a5c"/><circle cx="82" cy="36" r="5" fill="#1f8a5c"/>${eye(48, 62, 10, "#f2c94c")}${eye(74, 62, 10, "#f2c94c")}${brow(36, 50, 54, 56)}${brow(86, 50, 68, 56)}
      <path d="M48 86 Q60 80 72 86" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>` },
  { id: "blank", name: "Blank Page", color: "#f4f6fa", attack: "zap",
    taunt: "What was the answer again? Exactly. Nothing.",
    svg: () => `<path d="M28 16 L92 16 L92 104 L82 96 L72 108 L60 96 L48 108 L38 96 L28 104 Z" fill="#f4f6fa" stroke="#c9d3e3" stroke-width="3"/>
      ${eye(48, 52, 9, "#5b6b86")}${eye(72, 52, 9, "#5b6b86")}${brow(38, 40, 54, 46)}${brow(82, 40, 66, 46)}<ellipse cx="60" cy="76" rx="9" ry="7" fill="${INK}"/>
      <rect x="92" y="60" width="22" height="12" rx="3" fill="#ff7eb6" transform="rotate(-30 103 66)"/>` },
);
// Big bosses: rare (same odds as any other boss), tougher, with a warning screen. All original designs.
BOSSES.push(
  { id: "sugar", name: "Sugar Crash", color: "#ff7eb6", big: true, attack: "throw",
    taunt: "Have a snack... and then CRASH! Hahaha!",
    svg: () => `<path d="M30 70 L90 70 L82 114 L38 114 Z" fill="#8d5bd6"/><path d="M38 70 L44 114 M52 70 L55 114 M66 70 L65 114 M80 70 L76 114" stroke="#b48bf0" stroke-width="4"/>
      <path d="M20 72 C14 46 34 24 60 24 C86 24 106 46 100 72 C96 80 90 74 86 82 C82 90 78 78 72 86 C66 94 62 80 56 88 C50 96 46 80 40 86 C34 92 30 78 26 82 C22 84 20 78 20 72 Z" fill="#ff7eb6"/>
      <circle cx="60" cy="18" r="8" fill="#e2543e"/><path d="M60 10 Q64 2 70 4" stroke="#2bb673" stroke-width="3" fill="none" stroke-linecap="round"/>
      <path d="M30 40 L34 37 M44 30 L48 32 M74 30 L77 34 M88 42 L92 40 M38 58 L42 60 M82 58 L86 56" stroke="#fff" stroke-width="3" stroke-linecap="round"/><path d="M52 36 L56 34 M66 44 L70 46" stroke="#4b98f7" stroke-width="3" stroke-linecap="round"/>
      ${eye(46, 56, 9, "#e2543e")}${eye(74, 56, 9, "#e2543e")}${brow(36, 44, 54, 50)}${brow(84, 44, 66, 50)}${teeth(44, 70, 32)}` },
  { id: "freeze", name: "Brain Freeze", color: "#7fd6ff", big: true, attack: "zap",
    taunt: "Your mind goes blank... and COLD.",
    svg: () => `<path d="M20 30 L100 26 L104 108 L16 110 Z" fill="#cfeeff" stroke="#7fd6ff" stroke-width="4" stroke-linejoin="round"/>
      <path d="M20 30 L30 22 L44 28 L54 18 L66 26 L80 16 L90 26 L100 26" fill="#e9f8ff" stroke="#7fd6ff" stroke-width="3" stroke-linejoin="round"/>
      <path d="M28 46 L40 58 L34 70 M88 80 L78 92 L84 102" stroke="#9fdcff" stroke-width="3" fill="none"/>
      ${eye(44, 56, 10, "#00a3ff")}${eye(76, 56, 10, "#00a3ff")}${brow(32, 42, 54, 50)}${brow(88, 42, 66, 50)}
      <path d="M38 80 L82 80 L76 86 L72 98 L68 86 L62 100 L58 86 L52 98 L48 86 L44 94 Z" fill="#14161c"/><path d="M40 80 L80 80" stroke="#fff" stroke-width="3"/>` },
  { id: "mantis", name: "Exam Mantis", color: "#2bb673", big: true, attack: "slam",
    taunt: "Fill in the bubbles... or get SLICED!",
    svg: () => `<path d="M42 30 Q36 10 26 6 M78 30 Q84 10 94 6" stroke="#1f8a5c" stroke-width="4" fill="none" stroke-linecap="round"/>
      <path d="M8 60 L30 74 L22 92 M112 60 L90 74 L98 92" stroke="#1f8a5c" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M4 56 L14 40 L18 62 Z M116 56 L106 40 L102 62 Z" fill="#f2c94c" stroke="#14161c" stroke-width="2"/>
      <path d="M60 24 C84 24 92 44 90 70 C88 98 76 114 60 114 C44 114 32 98 30 70 C28 44 36 24 60 24 Z" fill="#2bb673"/>
      <ellipse cx="42" cy="48" rx="13" ry="16" fill="#14161c"/><ellipse cx="78" cy="48" rx="13" ry="16" fill="#14161c"/><ellipse cx="38" cy="43" rx="4" ry="5" fill="#fff"/><ellipse cx="74" cy="43" rx="4" ry="5" fill="#fff"/>
      ${brow(30, 32, 52, 40)}${brow(90, 32, 68, 40)}
      <rect x="44" y="76" width="32" height="30" rx="4" fill="#f4f6fa"/><g fill="none" stroke="#5b6b86" stroke-width="1.5"><circle cx="51" cy="83" r="3"/><circle cx="60" cy="83" r="3"/><circle cx="69" cy="83" r="3"/><circle cx="51" cy="92" r="3"/><circle cx="69" cy="92" r="3"/><circle cx="60" cy="100" r="3"/></g><circle cx="60" cy="92" r="3" fill="#14161c"/><circle cx="51" cy="100" r="3" fill="#14161c"/>
      <path d="M50 66 L54 70 L58 66 L62 70 L66 66 L70 70" stroke="#14161c" stroke-width="3" fill="none" stroke-linejoin="round"/>` },
);
BOSSES.forEach((b) => { b.attack = b.attack || "slam"; });
// Every boss has its own thing it throws or fires at you.
const PROJ = {
  forgetter: `<rect x="2" y="7" width="22" height="10" rx="3" fill="#ff7eb6" stroke="#14161c" stroke-width="1.5"/><rect x="16" y="7" width="8" height="10" fill="#f4ecdc"/>`,
  goblin: `<rect x="3" y="4" width="20" height="16" rx="2" fill="#e2543e" stroke="#14161c" stroke-width="1.5"/><rect x="6" y="6" width="14" height="12" fill="#f4ecdc"/><text x="13" y="16" text-anchor="middle" font-family="Fredoka,sans-serif" font-weight="700" font-size="9" fill="#e2543e">F-</text>`,
  fog: `<path d="M4 16 C2 10 8 6 12 9 C14 3 22 4 22 10 C27 10 27 18 22 18 L6 18 Z" fill="#a9b2c3"/><path d="M10 18 L7 24 L11 23 L9 28" stroke="#f2c94c" stroke-width="2" fill="none"/>`,
  drake: `<path d="M13 2 C20 9 22 14 19 20 C17 24 9 24 7 20 C4 14 9 10 13 2 Z" fill="#ff8a1f"/><path d="M13 10 C17 14 17 18 14 21 C12 22 10 20 10 18 C10 15 12 13 13 10 Z" fill="#ffe36e"/>`,
  specter: `<path d="M2 12 L8 6 L10 12 L16 4 L18 12 L24 8 L20 16 L14 14 L12 20 L8 14 Z" fill="#7fd6ff" stroke="#fff" stroke-width="1.5"/>`,
  slug: `<text x="13" y="20" text-anchor="middle" font-family="Fredoka,sans-serif" font-weight="700" font-size="20" fill="#bfe0ff" stroke="#14161c" stroke-width="1">z</text>`,
  popquiz: `<path d="M3 3 L19 3 L23 7 L23 23 L3 23 Z" fill="#fff6c2" stroke="#14161c" stroke-width="1.5"/><text x="13" y="19" text-anchor="middle" font-family="Fredoka,sans-serif" font-weight="700" font-size="14" fill="#e2543e">?</text>`,
  scroller: `<rect x="2" y="6" width="22" height="14" rx="7" fill="#e2543e"/><text x="13" y="17" text-anchor="middle" font-family="Fredoka,sans-serif" font-weight="700" font-size="11" fill="#fff">99+</text>`,
  procrast: `<circle cx="13" cy="14" r="9" fill="#f4ecdc" stroke="#14161c" stroke-width="2"/><path d="M13 14 L13 8 M13 14 L17 16" stroke="#14161c" stroke-width="2" stroke-linecap="round"/><circle cx="6" cy="5" r="3" fill="#e2543e"/><circle cx="20" cy="5" r="3" fill="#e2543e"/>`,
  golem: `<path d="M4 18 L6 8 L14 4 L22 9 L23 19 L13 23 Z" fill="#7d8597" stroke="#5a6170" stroke-width="2"/>`,
  hornet: `<path d="M2 13 L18 8 L24 13 L18 18 Z" fill="#14161c"/><path d="M8 11 L8 15 M12 10 L12 16" stroke="#f2c94c" stroke-width="2"/>`,
  kraken: `<path d="M2 20 C6 6 18 4 22 10 C24 14 20 18 16 14" stroke="#2bb673" stroke-width="5" fill="none" stroke-linecap="round"/>`,
  blank: `<rect x="1" y="8" width="24" height="10" rx="3" fill="#ff7eb6" transform="rotate(-20 13 13)"/>`,
  sugar: `<circle cx="13" cy="13" r="10" fill="#ff7eb6"/><path d="M8 9 L10 8 M15 7 L17 8 M18 14 L19 16 M7 15 L9 16" stroke="#fff" stroke-width="2" stroke-linecap="round"/><path d="M13 23 Q11 27 13 29" stroke="#ff7eb6" stroke-width="3" fill="none"/>`,
  freeze: `<path d="M13 1 L13 25 M2 7 L24 19 M2 19 L24 7" stroke="#7fd6ff" stroke-width="3" stroke-linecap="round"/><circle cx="13" cy="13" r="3" fill="#fff"/>`,
  mantis: `<circle cx="13" cy="13" r="9" fill="#8bd795" opacity=".6"/><circle cx="13" cy="13" r="5" fill="#d6f5c9"/>`,
};
export const projSVG = (b) => `<svg viewBox="0 0 26 30" width="30" height="30" aria-hidden="true">${PROJ[b.id] || PROJ.golem}</svg>`;
// Fight stages, picked at random: background art for the arena.
export const STAGES = [
  { id: "city", name: "Sunset City" }, { id: "dojo", name: "Old Dojo" }, { id: "library", name: "Midnight Library" },
  { id: "volcano", name: "Volcano Rim" }, { id: "space", name: "Space Station" }, { id: "roof", name: "Rainy Rooftop" },
];
export const bossSVG = (b, size) => `<svg viewBox="0 0 120 120" width="${size}" height="${size}" role="img" aria-label="${b.name}"><ellipse cx="60" cy="116" rx="38" ry="5" fill="#000" opacity=".35"/>${b.svg()}</svg>`;
