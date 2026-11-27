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
    id: "goblin", name: "Cram Goblin", color: "#4caf50",
    taunt: "All-nighter time! You'll never remember this!",
    svg: () => `<path d="M18 50 L2 34 L26 44 Z M102 50 L118 34 L94 44 Z" fill="#3e8f41"/>
      <path d="M60 30 C88 30 100 50 100 74 C100 100 84 114 60 114 C36 114 20 100 20 74 C20 50 32 30 60 30 Z" fill="#5cbf60"/>
      <path d="M40 30 L46 14 L52 30 Z M66 30 L74 12 L80 32 Z" fill="#3e8f41"/>
      ${eye(46, 62, 10, "#f2c94c")}${eye(74, 62, 10, "#f2c94c")}${brow(34, 50, 52, 56)}${brow(86, 50, 68, 56)}
      <path d="M36 84 Q60 108 84 84 Z" fill="${INK}"/><path d="M40 85 L46 92 L52 86 L58 93 L64 86 L70 93 L76 86 L80 86" fill="#fff"/>
      <rect x="86" y="94" width="22" height="16" rx="2" fill="#e2543e" transform="rotate(12 97 102)"/><rect x="90" y="96" width="14" height="12" fill="#f4ecdc" transform="rotate(12 97 102)"/>`,
  },
  {
    id: "fog", name: "Brain Fog", color: "#8a94a6",
    taunt: "Everything is getting... blurry... heh heh.",
    svg: () => `<path d="M28 96 C10 96 8 72 26 68 C22 46 46 36 58 48 C64 30 92 32 94 54 C112 54 116 80 100 92 C98 104 84 108 74 102 C66 112 44 112 40 102 C34 104 28 102 28 96 Z" fill="#a9b2c3"/>
      <path d="M34 92 C40 86 50 90 54 84 M66 88 C74 84 84 88 90 82" fill="none" stroke="#8a94a6" stroke-width="3"/>
      ${eye(48, 70, 9, "#4b98f7")}${eye(74, 70, 9, "#4b98f7")}${brow(38, 58, 54, 64)}${brow(84, 58, 68, 64)}
      <path d="M50 90 Q60 82 72 90" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>
      <path d="M44 106 L38 118 L46 116 L42 126" fill="none" stroke="#f2c94c" stroke-width="3.5" stroke-linejoin="round"/>`,
  },
  {
    id: "drake", name: "Deadline Drake", color: "#e2543e",
    taunt: "Tick tock! Your exam is coming!",
    svg: () => `<path d="M88 50 L116 30 L108 56 L118 60 L96 70 Z" fill="#b8402f"/><path d="M32 50 L4 30 L12 56 L2 60 L24 70 Z" fill="#b8402f"/>
      <path d="M60 34 C86 34 98 54 98 78 C98 100 82 114 60 114 C38 114 22 100 22 78 C22 54 34 34 60 34 Z" fill="#e2543e"/>
      <path d="M44 36 L40 18 L52 32 Z M76 36 L80 18 L68 32 Z" fill="#f2c94c"/>
      ${eye(48, 60, 9, "#f2c94c")}${eye(72, 60, 9, "#f2c94c")}${brow(38, 48, 54, 54)}${brow(82, 48, 66, 54)}
      <path d="M52 74 L56 70 M68 74 L64 70" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>
      <circle cx="60" cy="94" r="13" fill="#f4ecdc" stroke="${INK}" stroke-width="2.5"/><path d="M60 94 L60 86 M60 94 L66 97" stroke="${INK}" stroke-width="2.5" stroke-linecap="round"/>`,
  },
  {
    id: "specter", name: "Static Specter", color: "#45b7e6",
    taunt: "Bzzzt! I scramble everything you study!",
    svg: () => `<path d="M60 22 C90 22 100 48 100 72 L100 104 L90 96 L80 108 L70 96 L60 110 L50 96 L40 108 L30 96 L20 104 L20 72 C20 48 30 22 60 22 Z" fill="#7fd6ff" opacity=".92"/>
      <path d="M34 40 L42 52 L36 54 L46 66" fill="none" stroke="#fff" stroke-width="3" stroke-linejoin="round" opacity=".8"/>
      ${eye(48, 58, 10, "#8d5bd6")}${eye(72, 58, 10, "#8d5bd6")}${brow(38, 46, 54, 52)}${brow(82, 46, 66, 52)}
      <path d="M44 78 L50 74 L56 80 L62 74 L68 80 L74 74 L78 78" fill="none" stroke="${INK}" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"/>
      <path d="M100 50 L112 46 L106 56 L116 54" fill="none" stroke="#f2c94c" stroke-width="3" stroke-linejoin="round"/>`,
  },
];
export const bossSVG = (b, size) => `<svg viewBox="0 0 120 120" width="${size}" height="${size}" role="img" aria-label="${b.name}"><ellipse cx="60" cy="116" rx="38" ry="5" fill="#000" opacity=".35"/>${b.svg()}</svg>`;
