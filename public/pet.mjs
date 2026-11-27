// The Maniac pet, the shop and the ranks. Shared by the app, the server and guest mode.
// Everything here is plain data + functions that return SVG strings (no DOM), so the server can import it too.

// ---------- looks you're born with ----------
export const SPECIES = ["fuzz", "jelly", "sticker", "puff"];
export const SPECIES_NAME = { fuzz: "Fuzzball", jelly: "Jelly", sticker: "Sticker", puff: "Puff" };
export const SKINS = ["#7fd6bb", "#ffc94d", "#8bd8ff", "#e8e4ff", "#ffc6a8", "#f7e27a", "#c9b6ff", "#ffb3c7", "#a8e6a1", "#b5e3ff", "#f4b37a", "#d6f5c9"];
export const EYES = ["#8a5a2b", "#3a8f5c", "#4b6fd6", "#6b4bc4", "#c07a1c", "#2f6e8f", "#b03a5b", "#555b66"];
export const HAIR_COLORS = [
  ["black", "Black", "#2b2b33"], ["brown", "Brown", "#6b4423"], ["blonde", "Blonde", "#f2c94c"], ["red", "Red", "#c0392b"],
  ["ginger", "Ginger", "#f2994a"], ["pink", "Pink", "#ff7eb6"], ["purple", "Purple", "#8d5bd6"], ["blue", "Blue", "#4b98f7"],
  ["teal", "Teal", "#45d0c6"], ["mint", "Mint", "#4fae93"], ["white", "White", "#eef0f4"], ["orange", "Orange", "#ff7a2f"],
];
const hairHex = (id) => (HAIR_COLORS.find((h) => h[0] === id) || HAIR_COLORS[0])[2];
const SIGNATURE = { fuzz: "spiky", jelly: "swirl", sticker: "flame", puff: "wisps" };

// ---------- life stages (counted in days you COMPLETED your daily lessons) ----------
export const STAGES = [
  { id: "egg", name: "Egg", min: 0 }, { id: "baby", name: "Baby", min: 3 }, { id: "kid", name: "Kid", min: 7 },
  { id: "teen", name: "Teen", min: 30 }, { id: "adult", name: "Adult", min: 60 }, { id: "elder", name: "Wise elder", min: 180 },
];
export const stageOf = (days) => [...STAGES].reverse().find((s) => (days || 0) >= s.min);
export const nextStage = (days) => STAGES.find((s) => s.min > (days || 0)) || null;

// ---------- the shop ----------
// Hair color, skin and eyes are born traits: never sold or changed.
// slot: hair | top | glasses | hat | freeze. season: [startMonth, endMonth] (1-12). rank: tier index needed (free once reached). elder: unlocks at the elder stage.
// One price per kind of item (free rank jackets and the elder's wizard hat stay free).
export const SLOT_PRICE = { hair: 600, top: 800, hat: 700, glasses: 500 };
export const ITEMS = [
  // hairstyles
  ["spiky", "hair", "Spiky mop", 600], ["swirl", "hair", "Swirl", 600], ["flame", "hair", "Flame", 600], ["wisps", "hair", "Wisps", 600],
  ["buzz", "hair", "Buzz cut", 600], ["afro", "hair", "Afro", 600], ["long", "hair", "Long & straight", 600], ["ponytail", "hair", "Ponytail", 600],
  ["buns", "hair", "Space buns", 600], ["mohawk", "hair", "Mohawk", 600], ["swoop", "hair", "Side swoop", 600], ["braids", "hair", "Braids", 600],
  ["bowl", "hair", "Bowl cut", 600], ["bedhead", "hair", "Bedhead", 600], ["topknot", "hair", "Top knot", 600], ["wavy", "hair", "Wavy", 600],
  ["sprout", "hair", "Sprout curl", 600], ["curls", "hair", "Short curls", 600], ["zap", "hair", "Power spikes", 1000],
  // tops
  ["tee", "top", "Plain tee", 400], ["stripes", "top", "Striped tee", 400], ["tank", "top", "Tank top", 400], ["jersey", "top", "Sports jersey", 1000],
  ["hoodie", "top", "Hoodie", 1000], ["jean", "top", "Jean jacket", 1200], ["sweater", "top", "Heart sweater", 800], ["shirttie", "top", "Shirt & tie", 1000],
  ["dress", "top", "Dress", 1000], ["overalls", "top", "Overalls", 800], ["varsity", "top", "Varsity jacket", 1500], ["puffer", "top", "Puffer", 1200],
  ["labcoat", "top", "Lab coat", 1000], ["tux", "top", "Tux", 5000], ["raincoat", "top", "Raincoat", 800], ["flannel", "top", "Flannel", 800],
  // fighter gear (for Boss Battle)
  ["gi", "top", "Fighter gi", 800], ["armor", "top", "Battle plates", 1200],
  // rank jackets: one per rank tier, free (and only shown) once you reach it
  ...["Wood", "Bronze", "Silver", "Gold", "Platinum", "Emerald", "Sapphire", "Amethyst", "Diamond", "Ruby", "Obsidian", "Champion", "Study Maniac"]
    .map((n, t) => ["j-" + t, "top", n + " jacket", 0, { rank: t }]),
  // holidays
  ["turkey", "top", "Turkey sweater", 800, { season: [11, 11] }], ["pilgrim", "hat", "Pilgrim hat", 800, { season: [11, 11] }],
  ["ugly", "top", "Ugly holiday sweater", 800, { season: [12, 12] }], ["santa", "hat", "Santa hat", 800, { season: [12, 12] }], ["antlers", "hat", "Reindeer antlers", 600, { season: [12, 12] }],
  // glasses
  ["round", "glasses", "Round glasses", 400], ["square", "glasses", "Square frames", 400], ["shades", "glasses", "Sunglasses", 600], ["hearts", "glasses", "Heart glasses", 600],
  ["aviators", "glasses", "Aviators", 1000], ["goggles", "glasses", "Ski goggles", 800], ["monocle", "glasses", "Monocle", 1500], ["stars", "glasses", "Star glasses", 5000],
  // hats
  ["beanie", "hat", "Beanie", 800], ["cap", "hat", "Cap", 800], ["backcap", "hat", "Backwards cap", 800], ["party", "hat", "Party hat", 600],
  ["bucket", "hat", "Bucket hat", 1000], ["beret", "hat", "Beret", 1000], ["flowers", "hat", "Flower crown", 1000], ["headphones", "hat", "Headphones", 1200],
  ["cowboy", "hat", "Cowboy hat", 1500], ["headband", "hat", "Training headband", 800], ["tophat", "hat", "Top hat", 2500], ["crown", "hat", "Crown", 5000], ["wizard", "hat", "Wizard hat", 0, { elder: true }],
  // other
  ["freeze", "freeze", "Streak freeze", 750],
].map(([id, slot, name, price, extra]) => ({ id, slot, name, price: price > 0 && SLOT_PRICE[slot] ? SLOT_PRICE[slot] : price, ...(extra || {}) }));
export const item = (id) => ITEMS.find((x) => x.id === id) || null;
export const inSeason = (it, day) => { if (!it.season) return true; const m = +String(day).slice(5, 7); return m >= it.season[0] && m <= it.season[1]; };
export const FREEZE_MAX = 2;
export const STARTER_POINTS = 1000;

// ---------- ranks ("badges"): based on all the XP you've ever earned, never goes down ----------
// Paced so the top rank takes about a school year of steady studying (~400 XP on a normal day,
// with summer and winter breaks off). Each tier is a bigger climb than the last.
export const TIERS = [
  ["Wood", "#8a5a34", 0], ["Bronze", "#d08a4a", 2000], ["Silver", "#c3cbd6", 6000], ["Gold", "#f2c94c", 13000],
  ["Platinum", "#8fe0db", 21000], ["Emerald", "#2fcf7a", 30000], ["Sapphire", "#4a8bf0", 40000], ["Amethyst", "#a56be0", 51000],
  ["Diamond", "#b9f2ff", 63000], ["Ruby", "#ff3d7f", 76000], ["Obsidian", "#6d6a8a", 90000], ["Champion", "#ff9f1a", 105000],
];
export const TOP_XP = 120000;
export function rankOf(xp) {
  xp = Math.max(0, xp || 0);
  if (xp >= TOP_XP) return { idx: 36, tier: 12, level: 0, name: "Study Maniac", tierName: "Study Maniac", color: "#ff6a3d", min: TOP_XP, next: null };
  let t = TIERS.length - 1; while (TIERS[t][2] > xp) t--;
  const lo = TIERS[t][2], hi = t + 1 < TIERS.length ? TIERS[t + 1][2] : TOP_XP, step = (hi - lo) / 3;
  const level = Math.min(3, Math.floor((xp - lo) / step) + 1), min = Math.round(lo + step * (level - 1)), next = level < 3 ? Math.round(lo + step * level) : hi;
  return { idx: t * 3 + level - 1, tier: t, level, name: `${TIERS[t][0]} ${"I".repeat(level).replace("III", "III")}`, tierName: TIERS[t][0], color: TIERS[t][1], min, next };
}
export const allRanks = () => {
  const out = [];
  TIERS.forEach(([n, c, lo], t) => { const hi = t + 1 < TIERS.length ? TIERS[t + 1][2] : TOP_XP; for (let l = 1; l <= 3; l++) out.push(rankOf(Math.ceil(lo + ((hi - lo) / 3) * (l - 1)))); });
  out.push(rankOf(TOP_XP));
  return out;
};

// ---------- a new pet ----------
const pick = (arr, r) => arr[Math.floor(r() * arr.length) % arr.length];
export function newPet(day, r = Math.random) {
  const species = pick(SPECIES, r);
  const hair = r() < 0.5 ? SIGNATURE[species] : pick(ITEMS.filter((x) => x.slot === "hair").map((x) => x.id), r);
  const color = pick(HAIR_COLORS, r)[0];
  return { v: 1, claimed: day, name: "", species, skin: pick(SKINS, r), eye: pick(EYES, r), hair, color, days: 0, lastGrow: null, owned: [hair], wear: { top: null, glasses: null, hat: null } };
}
// What a user has unlocked without buying: rank jackets, the elder wizard hat, and what they were born with.
export function owns(pet, xp, id) {
  const it = item(id); if (!it || !pet) return false;
  if (it.rank != null) return rankOf(xp).tier >= it.rank; // tier 12 = Study Maniac
  if (it.elder) return stageOf(pet.days).id === "elder";
  return (pet.owned || []).includes(id);
}
// Clean up a pet object that came from storage.
// Tops you can recolor in the locker room: two parts each, picked from a set palette.
export const TINTABLE = {
  gi: { a: ["Gi", "#d8432f"], b: ["Belt & undershirt", "#23252e"] },
  armor: { a: ["Plates", "#c9d3e3"], b: ["Suit underneath", "#5b6b86"] },
};
export const TINT_COLORS = ["#d8432f", "#ff8a1f", "#f2c94c", "#2bb673", "#1f8a5c", "#45d0c6", "#4b98f7", "#2c3e75", "#8d5bd6", "#ff7eb6", "#f4f6fa", "#c9d3e3", "#5b6b86", "#23252e"];
const tintOf = (p, id) => { const d = TINTABLE[id]; if (!d) return null; const t = p?.tints?.[id] || {}; return { a: TINT_COLORS.includes(t.a) ? t.a : d.a[1], b: TINT_COLORS.includes(t.b) ? t.b : d.b[1] }; };
export function cleanPet(p) {
  if (!p || typeof p !== "object" || !p.claimed) return null;
  const okId = (id, slot) => (item(id)?.slot === slot ? id : null);
  return {
    v: 1, claimed: String(p.claimed).slice(0, 10), name: String(p.name || "").replace(/[<>]/g, "").trim().slice(0, 20),
    species: SPECIES.includes(p.species) ? p.species : "fuzz", skin: SKINS.includes(p.skin) ? p.skin : SKINS[0], eye: EYES.includes(p.eye) ? p.eye : EYES[0],
    hair: okId(p.hair, "hair") || "spiky", color: HAIR_COLORS.some((h) => h[0] === p.color) ? p.color : "black", days: Math.max(0, Math.min(5000, parseInt(p.days, 10) || 0)),
    lastGrow: p.lastGrow ? String(p.lastGrow).slice(0, 10) : null, owned: [...new Set((Array.isArray(p.owned) ? p.owned : []).filter((id) => item(id)))].slice(0, 200),
    wear: { top: okId(p.wear?.top, "top"), glasses: okId(p.wear?.glasses, "glasses"), hat: okId(p.wear?.hat, "hat") },
    tints: Object.fromEntries(Object.keys(TINTABLE).filter((k) => p.tints?.[k]).map((k) => [k, tintOf(p, k)])),
  };
}

// Pet edits and shop purchases. Shared rules: only wear what you own.
export function petEdit(pet, b, xp) {
  if (typeof b.name === "string") pet.name = b.name.replace(/[<>]/g, "").trim().slice(0, 20);
  for (const slot of ["hair"]) if (b[slot] !== undefined) {
    if (!owns(pet, xp, b[slot]) || item(b[slot]).slot !== slot) return { error: "You don't own that yet." };
    pet[slot] = b[slot];
  }
  if (b.wear) for (const slot of ["top", "glasses", "hat"]) if (b.wear[slot] !== undefined) {
    const id = b.wear[slot];
    if (id === null) pet.wear[slot] = null;
    else if (item(id)?.slot === slot && owns(pet, xp, id)) pet.wear[slot] = id;
    else return { error: "You don't own that yet." };
  }
  if (b.tint && typeof b.tint === "object") {
    const { id, a, b: bb } = b.tint;
    if (!TINTABLE[id] || !owns(pet, xp, id)) return { error: "You don't own that yet." };
    if (!TINT_COLORS.includes(a) || !TINT_COLORS.includes(bb)) return { error: "Pick a color from the list." };
    pet.tints = { ...(pet.tints || {}), [id]: { a, b: bb } };
  }
  return {};
}
export function shopBuy(pet, w, id, day) {
  const it = item(id);
  if (!it || it.price <= 0) return { error: "That can't be bought." };
  if (!inSeason(it, day)) return { error: "That one's only in the shop during its holiday." };
  if (it.slot === "freeze") {
    if (w.freezes >= FREEZE_MAX) return { error: `You can hold ${FREEZE_MAX} streak freezes at most.` };
    if (w.points < it.price) return { error: "Not enough points yet." };
    return { points: w.points - it.price, freezes: w.freezes + 1 };
  }
  if (!pet) return { error: "Claim your egg first." };
  if (owns(pet, w.xp, id)) return { error: "You already have that." };
  if (w.points < it.price) return { error: "Not enough points yet." };
  pet.owned.push(id);
  return { points: w.points - it.price, freezes: w.freezes };
}

// ======================================================================================
// Drawing. Everything is drawn in a 120x120 box. Returns SVG markup.
// ======================================================================================
let uid = 0;
const shade = (hex, f) => { const n = parseInt(hex.slice(1), 16), c = (s) => Math.max(0, Math.min(255, Math.round(((n >> s) & 255) * f))); return `#${((c(16) << 16) | (c(8) << 8) | c(0)).toString(16).padStart(6, "0")}`; };
const INK = "#14161c";
// Where the face sits on each body.
const GEO = {
  fuzz: { top: 42, eyeY: 72, ex: [47, 73], mouthY: 89, cheekY: 87, neck: 97 },
  jelly: { top: 34, eyeY: 74, ex: [48, 72], mouthY: 92, cheekY: 90, neck: 99 },
  sticker: { top: 44, eyeY: 72, ex: [48, 72], mouthY: 92, cheekY: 86, neck: 99 },
  puff: { top: 36, eyeY: 68, ex: [48, 72], mouthY: 84, cheekY: 82, neck: 93 },
};
function bodySVG(sp, skin) {
  if (sp === "jelly") return `<path d="M60 34 C84 34 94 70 96 96 Q96 110 82 110 L38 110 Q24 110 24 96 C26 70 36 34 60 34 Z" fill="${skin}"/><ellipse cx="42" cy="58" rx="5" ry="10" fill="#fff" opacity=".45" transform="rotate(20 42 58)"/>`;
  if (sp === "sticker") return `<path d="M28 62 Q28 44 46 44 L74 44 Q92 44 92 62 L92 92 Q92 110 74 110 L46 110 Q28 110 28 92 Z" fill="${skin}" stroke="${INK}" stroke-width="4"/>`;
  if (sp === "puff") return `<g fill="${skin}"><circle cx="60" cy="66" r="32"/><circle cx="34" cy="76" r="18"/><circle cx="86" cy="76" r="18"/><circle cx="44" cy="94" r="14"/><circle cx="76" cy="94" r="14"/><circle cx="60" cy="98" r="14"/></g>`;
  return `<ellipse cx="45" cy="108" rx="10" ry="5" fill="${shade(skin, 0.75)}"/><ellipse cx="75" cy="108" rx="10" ry="5" fill="${shade(skin, 0.75)}"/><ellipse cx="60" cy="76" rx="38" ry="34" fill="${skin}"/>`;
}
function eyesSVG(sp, g, eye, mood, elder) {
  const [a, b] = g.ex, y = g.eyeY, st = sp === "sticker" ? ` stroke="${INK}" stroke-width="3"` : "";
  if (mood === "happy") return [a, b].map((x) => `<path d="M${x - 9} ${y + 2} Q${x} ${y - 9} ${x + 9} ${y + 2}" fill="none" stroke="${INK}" stroke-width="3.5" stroke-linecap="round"/>`).join("");
  if (mood === "sleep") return [a, b].map((x) => `<path d="M${x - 8} ${y} Q${x} ${y + 5} ${x + 8} ${y}" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`).join("");
  if (mood === "yikes") return [a, b].map((x) => `<circle cx="${x}" cy="${y + 1}" r="11" fill="#fff"${st}/><circle cx="${x}" cy="${y + 2}" r="3.5" fill="${eye}"/><circle cx="${x}" cy="${y + 2}" r="1.6" fill="${INK}"/>`).join("");
  const r = elder ? 9 : 10;
  return `<g class="p-blink">${[a, b].map((x) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff"${st}/><circle cx="${x + 1}" cy="${y + 1}" r="${r * 0.6}" fill="${eye}"/><circle cx="${x + 1}" cy="${y + 1}" r="${r * 0.3}" fill="${INK}"/><circle cx="${x + 3}" cy="${y - 2}" r="1.6" fill="#fff"/>`).join("")}</g>`;
}
function mouthSVG(g, mood) {
  const y = g.mouthY;
  if (mood === "happy") return `<path d="M47 ${y - 4} Q60 ${y + 18} 73 ${y - 4} Z" fill="${INK}"/><path d="M53 ${y + 5} Q60 ${y + 10} 67 ${y + 5} Q60 ${y + 14} 53 ${y + 5} Z" fill="#ff7eb6"/>`;
  if (mood === "yikes") return `<path d="M48 ${y + 4} Q52 ${y} 56 ${y + 4} Q60 ${y + 8} 64 ${y + 4} Q68 ${y} 72 ${y + 4}" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`;
  if (mood === "sleep") return `<ellipse cx="60" cy="${y + 3}" rx="3" ry="3.5" fill="${INK}"/>`;
  return `<path d="M52 ${y} Q60 ${y + 7} 68 ${y}" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`;
}

// Hair: drawn for a head whose top is at y=42, then moved to each body. back = behind the body, front = over the forehead.
// long = still shows under a hat.
function hairParts(id, c, sp) {
  const d = shade(c, 0.8);
  switch (id) {
    case "spiky": return { back: `<path d="M26 60 L28 24 L40 46 L44 8 L55 40 L63 4 L70 40 L82 10 L84 44 L98 24 L94 62 Z" fill="${c}"/>`, front: `<path d="M30 56 L40 46 L46 56 L56 44 L62 56 L72 44 L78 56 L88 48 L90 58 Q60 42 30 56 Z" fill="${c}"/>` };
    case "swirl": return { back: `<g fill="none" stroke="${c}" stroke-width="6" stroke-linecap="round"><path d="M60 44 C58 22 80 20 78 34 C76 44 64 40 68 32"/><path d="M46 48 C36 32 24 40 32 48"/><path d="M74 48 C84 32 98 38 90 48"/></g>`, front: "" };
    case "flame": return { back: `<g class="p-flick"><path d="M32 ${sp === "sticker" ? 52 : 58} C26 32 40 24 40 10 C50 20 52 28 54 32 C56 20 64 12 64 2 C76 14 80 26 78 36 C84 30 88 22 88 16 C98 30 96 44 90 ${sp === "sticker" ? 54 : 60} Z" fill="${c}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/><path d="M42 52 C40 42 46 36 46 28 C52 34 56 40 58 44 C60 36 64 30 66 24 C72 34 76 42 76 52 Z" fill="${shade(c, 1.35)}"/></g>`, front: "" };
    case "wisps": return { back: `<g class="p-wisp" fill="none" stroke="${c}" stroke-width="5" stroke-linecap="round"><path d="M44 44 C38 30 48 22 42 12"/><path d="M58 40 C58 26 66 22 62 10"/><path d="M72 44 C78 32 70 24 80 16"/><path d="M34 52 C24 44 26 34 18 30"/><path d="M86 52 C96 44 94 34 102 32"/></g>`, front: "" };
    case "buzz": return { back: "", front: `<path d="M24 64 Q24 42 60 42 Q96 42 96 64 Q88 52 60 51 Q32 52 24 64 Z" fill="${c}" opacity=".85"/>` };
    case "afro": return { long: true, back: `<g fill="${c}"><circle cx="30" cy="54" r="18"/><circle cx="42" cy="34" r="20"/><circle cx="62" cy="26" r="21"/><circle cx="80" cy="34" r="20"/><circle cx="92" cy="54" r="18"/><circle cx="60" cy="46" r="20"/></g>`, front: `<path d="M26 60 Q34 48 46 54 Q52 46 60 52 Q68 46 74 54 Q86 48 94 60 Q90 46 60 44 Q30 46 26 60 Z" fill="${c}"/>` };
    case "long": return { long: true, back: `<path d="M16 112 L16 66 Q16 32 60 32 Q104 32 104 66 L104 112 Z" fill="${c}"/>`, front: `<path d="M22 66 Q22 38 60 38 Q98 38 98 66 Q84 54 60 56 Q36 54 22 66 Z" fill="${c}"/>` };
    case "ponytail": return { long: true, back: `<path d="M86 46 Q116 50 110 98 Q104 78 90 66 Z" fill="${c}"/>`, front: `<path d="M24 62 Q26 40 60 40 Q94 40 96 62 Q78 50 60 52 Q42 50 24 62 Z" fill="${c}"/><circle cx="92" cy="50" r="4" fill="#f2c94c"/>` };
    case "buns": return { long: true, back: `<circle cx="32" cy="38" r="13" fill="${c}"/><circle cx="88" cy="38" r="13" fill="${c}"/>`, front: `<path d="M24 62 Q26 40 60 40 Q94 40 96 62 Q78 50 60 52 Q42 50 24 62 Z" fill="${c}"/>` };
    case "zap": return { back: `<path d="M24 62 L22 30 L36 44 L34 6 L50 36 L58 -2 L66 34 L80 4 L80 40 L96 18 L96 62 Z" fill="${c}"/><path d="M36 44 L34 18 L46 38 Z M58 10 L62 30 L54 30 Z M80 16 L82 36 L74 34 Z" fill="${shade(c, 1.3)}"/>`, front: `<path d="M30 58 L36 42 L44 54 L52 38 L60 52 L68 38 L76 54 L84 42 L90 58 Q60 44 30 58 Z" fill="${c}"/>` };
    case "mohawk": return { back: `<path d="M50 52 L46 10 L56 22 L60 0 L66 20 L74 6 L70 52 Z" fill="${c}"/>`, front: `<path d="M52 52 L54 42 L66 42 L68 52 Z" fill="${c}"/>` };
    case "swoop": return { back: "", front: `<path d="M22 66 Q22 28 70 30 Q104 34 98 64 Q90 46 70 46 Q46 46 34 64 Q30 60 22 66 Z" fill="${c}"/><path d="M70 30 Q90 18 102 30 Q88 26 80 34 Z" fill="${c}"/>` };
    case "braids": return { long: true, back: `<g fill="${c}"><circle cx="22" cy="64" r="7"/><circle cx="20" cy="76" r="7"/><circle cx="20" cy="88" r="7"/><circle cx="21" cy="100" r="6"/><circle cx="98" cy="64" r="7"/><circle cx="100" cy="76" r="7"/><circle cx="100" cy="88" r="7"/><circle cx="99" cy="100" r="6"/></g><circle cx="21" cy="108" r="3.5" fill="#ff7eb6"/><circle cx="99" cy="108" r="3.5" fill="#ff7eb6"/>`, front: `<path d="M22 64 Q24 40 60 40 Q96 40 98 64 Q80 50 60 52 Q40 50 22 64 Z" fill="${c}"/>` };
    case "bowl": return { back: "", front: `<path d="M20 64 Q20 34 60 34 Q100 34 100 64 Z" fill="${c}"/>` };
    case "bedhead": return { back: `<g fill="none" stroke="${c}" stroke-width="7" stroke-linecap="round"><path d="M34 50 Q24 34 34 22"/><path d="M46 44 Q46 26 58 18"/><path d="M62 42 Q70 24 64 10"/><path d="M76 46 Q88 30 98 34"/><path d="M86 54 Q104 50 106 62"/><path d="M28 58 Q12 54 12 42"/></g>`, front: `<path d="M26 60 Q30 44 60 42 Q90 44 94 60 Q80 50 66 54 Q56 48 44 54 Q34 52 26 60 Z" fill="${c}"/>` };
    case "topknot": return { back: `<circle cx="60" cy="28" r="12" fill="${c}"/>`, front: `<path d="M24 62 Q26 40 60 40 Q94 40 96 62 Q78 50 60 52 Q42 50 24 62 Z" fill="${c}"/><rect x="52" y="37" width="16" height="5" rx="2.5" fill="${d}"/>` };
    case "wavy": return { long: true, back: `<path d="M18 98 Q12 88 18 80 Q12 70 18 62 Q16 34 60 32 Q104 34 102 62 Q108 70 102 80 Q108 88 102 98 Z" fill="${c}"/>`, front: `<path d="M22 64 Q24 38 60 38 Q96 38 98 64 Q90 52 76 56 Q68 48 60 54 Q52 48 44 56 Q30 52 22 64 Z" fill="${c}"/>` };
    case "sprout": return { back: "", front: `<path d="M60 44 C58 22 80 18 78 32 C76 42 64 38 68 30" fill="none" stroke="${c}" stroke-width="6" stroke-linecap="round"/>` };
    case "curls": return { back: "", front: `<g fill="${c}"><circle cx="30" cy="56" r="8"/><circle cx="40" cy="46" r="9"/><circle cx="53" cy="41" r="9"/><circle cx="67" cy="41" r="9"/><circle cx="80" cy="46" r="9"/><circle cx="90" cy="56" r="8"/></g>` };
    default: return { back: "", front: "" };
  }
}
// Tops: drawn for a neckline at y=88 and squashed down to each body's neckline so the face is never covered.
function topSVG(id, gid, tint) {
  const S = (fill) => `<path d="M25 88 Q60 96 95 88 C92 102 78 110 60 110 C42 110 28 102 25 88 Z" fill="${fill}"/>`;
  const shine = (c1, c2) => `<defs><linearGradient id="g${gid}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset=".5" stop-color="#fff"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs>`;
  // Rank jackets: shiny metal bomber. Open V front over a dark shirt, popped collar, sleeves, gold zipper, star patch, light sweep + twinkles.
  const jacket = (base) => {
    const c1 = shade(base, 1.12), c2 = shade(base, 0.72), hi = shade(base, 1.5), dk = shade(base, 0.5);
    const L = "M22 84 L46 83 L56 100 L56 113 L44 113 C32 110 23 102 22 84 Z", R = "M98 84 L74 83 L64 100 L64 113 L76 113 C88 110 97 102 98 84 Z";
    return `<defs><linearGradient id="g${gid}" x1="0" y1="0" x2=".45" y2="1"><stop offset="0" stop-color="${hi}"/><stop offset=".25" stop-color="${c1}"/><stop offset=".4" stop-color="#fff"/><stop offset=".52" stop-color="${c1}"/><stop offset=".78" stop-color="${c2}"/><stop offset="1" stop-color="${dk}"/></linearGradient>
      <linearGradient id="s${gid}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${hi}"/><stop offset=".5" stop-color="${c1}"/><stop offset="1" stop-color="${dk}"/></linearGradient>
      <clipPath id="cj${gid}"><path d="${L} ${R}"/></clipPath></defs>
      <path d="M44 86 L76 86 L64 113 L56 113 Z" fill="#23252e"/>
      <path d="M22 86 Q14 96 13 108 Q18 112 24 108 Q25 98 30 92 Z" fill="url(#s${gid})" stroke="${dk}" stroke-width="1.3" stroke-linejoin="round"/>
      <path d="M98 86 Q106 96 107 108 Q102 112 96 108 Q95 98 90 92 Z" fill="url(#s${gid})" stroke="${dk}" stroke-width="1.3" stroke-linejoin="round"/>
      <path d="${L}" fill="url(#g${gid})" stroke="${dk}" stroke-width="1.3" stroke-linejoin="round"/><path d="${R}" fill="url(#g${gid})" stroke="${dk}" stroke-width="1.3" stroke-linejoin="round"/>
      <path d="M46 83 L39 79 L52 93 Z M74 83 L81 79 L68 93 Z" fill="${hi}" stroke="${dk}" stroke-width="1.1" stroke-linejoin="round"/>
      <path d="M24 108 Q34 112 44 112 M96 108 Q86 112 76 112" fill="none" stroke="${dk}" stroke-width="2.5" stroke-linecap="round"/>
      <path d="M56 100 L56 113 M64 100 L64 113" stroke="#f6e7a8" stroke-width="1.6"/>
      <path d="M36 92 L37.6 95.6 L41.5 96 L38.6 98.6 L39.4 102.4 L36 100.4 L32.6 102.4 L33.4 98.6 L30.5 96 L34.4 95.6 Z" fill="#fff" stroke="${dk}" stroke-width="1"/>
      <g clip-path="url(#cj${gid})"><path class="p-sheen" d="M26 80 L38 80 L26 116 L14 116 Z" fill="#fff" opacity=".75"/></g>
      <path class="p-spark" d="M90 84 L91.4 88 L95.4 89.4 L91.4 90.8 L90 94.8 L88.6 90.8 L84.6 89.4 L88.6 88 Z" fill="#fff"/><path class="p-spark" style="animation-delay:.5s" d="M28 104 L29 107 L32 108 L29 109 L28 112 L27 109 L24 108 L27 107 Z" fill="#fff"/>`;
  };
  if (/^j-\d+$/.test(id)) { const t = +id.slice(2); return jacket(t >= 12 ? "#ff6a3d" : TIERS[t][1]); }
  switch (id) {
    case "tee": return S("#4b98f7") + `<path d="M50 92 Q60 98 70 92" fill="none" stroke="#3a7fd6" stroke-width="2.5"/>`;
    case "stripes": return S("#fff") + `<path d="M27 96 Q60 103 93 96 M33 104 Q60 110 87 104" fill="none" stroke="#2c3e75" stroke-width="4"/>`;
    case "tank": return `<path d="M34 92 Q60 100 86 92 C84 104 74 110 60 110 C46 110 36 104 34 92 Z" fill="#e2543e"/><path d="M38 93 L40 86 M82 93 L80 86" stroke="#e2543e" stroke-width="5" stroke-linecap="round"/>`;
    case "jersey": return S("#e2543e") + `<path d="M50 90 L60 99 L70 90" fill="none" stroke="#fff" stroke-width="3"/><text x="60" y="108" text-anchor="middle" font-family="Fredoka,sans-serif" font-weight="700" font-size="11" fill="#fff">23</text>`;
    case "hoodie": return S("#8d5bd6") + `<path d="M28 88 Q60 100 92 88" fill="none" stroke="#6f45bd" stroke-width="5"/><path d="M54 95 L53 104 M66 95 L67 104" stroke="#fff" stroke-width="2" stroke-linecap="round"/><path d="M46 102 L74 102 L72 109 L48 109 Z" fill="#6f45bd"/>`;
    case "jean": return S("#3f6fb0") + `<path d="M52 92 L68 92 L66 110 L54 110 Z" fill="#fff"/><path d="M44 88 L52 92 L50 100 Z M76 88 L68 92 L70 100 Z" fill="#2f5a94"/><rect x="34" y="98" width="10" height="6" rx="1" fill="none" stroke="#f2c94c" stroke-width="1.5"/><rect x="76" y="98" width="10" height="6" rx="1" fill="none" stroke="#f2c94c" stroke-width="1.5"/>`;
    case "sweater": return S("#ff9f5a") + `<path d="M27 90 Q60 99 93 90" fill="none" stroke="#e0803c" stroke-width="4"/><path d="M60 107 L53 100 Q50 96 54 94 Q57 93 60 97 Q63 93 66 94 Q70 96 67 100 Z" fill="#e2543e"/>`;
    case "shirttie": return S("#f4f6fa") + `<path d="M48 88 L58 94 L52 98 Z M72 88 L62 94 L68 98 Z" fill="#dfe3ea"/><path d="M57 94 L63 94 L64 98 L62 110 L58 110 L56 98 Z" fill="#e2543e"/>`;
    case "dress": return `<path d="M28 88 Q60 96 92 88 L104 114 Q60 120 16 114 Z" fill="#ff7eb6"/><path d="M30 96 Q60 103 90 96" fill="none" stroke="#d94f8e" stroke-width="4"/><circle cx="40" cy="106" r="2" fill="#fff"/><circle cx="60" cy="110" r="2" fill="#fff"/><circle cx="80" cy="106" r="2" fill="#fff"/>`;
    case "overalls": return S("#f4f6fa") + `<path d="M44 96 L76 96 L80 108 Q60 114 40 108 Z" fill="#3f6fb0"/><path d="M44 96 L38 88 M76 96 L82 88" stroke="#3f6fb0" stroke-width="4" stroke-linecap="round"/>`;
    case "varsity": return S("#2c3e75") + `<path d="M27 89 Q60 98 93 89" fill="none" stroke="#f4ead7" stroke-width="3.5"/><path d="M60 94 L60 110" stroke="#f4ead7" stroke-width="2"/><text x="44" y="106" text-anchor="middle" font-family="Fredoka,sans-serif" font-weight="700" font-size="11" fill="#f4ead7">S</text>`;
    case "puffer": return `<path d="M22 86 Q60 94 98 86 C96 104 80 112 60 112 C40 112 24 104 22 86 Z" fill="#45d0c6"/><path d="M24 96 Q60 104 96 96 M30 104 Q60 111 90 104" fill="none" stroke="#2fa79e" stroke-width="2.5"/><path d="M60 92 L60 112" stroke="#2fa79e" stroke-width="2.5"/>`;
    case "labcoat": return S("#f4f6fa") + `<path d="M52 92 L60 106 L68 92 Z" fill="#4b98f7"/><path d="M46 88 L56 94 L52 104 Z M74 88 L64 94 L68 104 Z" fill="#dfe3ea"/><rect x="74" y="98" width="10" height="7" rx="1" fill="#dfe3ea"/>`;
    case "tux": return S("#23252e") + `<path d="M50 92 L60 110 L70 92 Q60 96 50 92 Z" fill="#fff"/><path d="M52 92 L60 96 L52 100 Z M68 92 L60 96 L68 100 Z" fill="${INK}"/>`;
    case "raincoat": return `<path d="M24 87 Q60 95 96 87 C94 104 80 112 60 112 C40 112 26 104 24 87 Z" fill="#f2c94c"/><path d="M60 92 L60 112" stroke="#d9a925" stroke-width="2.5"/>`;
    case "gi": { const a = tint?.a || "#d8432f", b = tint?.b || "#23252e", hi = shade(a, 1.3);
      return S(a) + `<path d="M52 89 L60 98 L68 89 Z" fill="${b}"/><path d="M44 88 L60 103 M76 88 L62 101" fill="none" stroke="${hi}" stroke-width="3" stroke-linecap="round"/><path d="M28 100 Q60 107 92 100 L92 105 Q60 112 28 105 Z" fill="${b}"/><path d="M60 104 L55 112 M60 104 L66 112" stroke="${b}" stroke-width="3" stroke-linecap="round"/><circle cx="60" cy="104" r="2.6" fill="${b}"/>`; }
    case "armor": { const a = tint?.a || "#c9d3e3", b = tint?.b || "#5b6b86", dk = shade(a, 0.45);
      return S(b) + `<path d="M40 90 Q60 98 80 90 L78 106 Q60 112 42 106 Z" fill="${a}" stroke="${dk}" stroke-width="2"/><path d="M60 92 L60 108" stroke="${dk}" stroke-width="1.5"/><path d="M20 86 Q24 78 36 82 L40 92 Q28 96 20 86 Z M100 86 Q96 78 84 82 L80 92 Q92 96 100 86 Z" fill="${shade(a, 0.85)}" stroke="${dk}" stroke-width="2"/>`; }
    case "flannel": return S("#c0392b") + `<path d="M38 92 L38 106 M50 94 L50 110 M70 94 L70 110 M82 92 L82 106 M28 98 Q60 106 92 98 M34 105 Q60 112 86 105" fill="none" stroke="#7a1f16" stroke-width="2.5"/>`;
    case "turkey": return S("#a0522d") + `<g transform="translate(60 102)"><path d="M-9 0 Q-12 -10 -4 -10 M9 0 Q12 -10 4 -10 M0 -2 Q0 -14 0 -12" stroke="#e2543e" stroke-width="4" stroke-linecap="round" fill="none"/><circle r="5" fill="#6b3a1f"/><circle cx="1.5" cy="-1" r="1" fill="#fff"/></g>`;
    case "ugly": return S("#2e8b57") + `<path d="M27 92 L35 98 L43 92 L51 98 L59 92 L67 98 L75 92 L83 98 L93 92" fill="none" stroke="#fff" stroke-width="2.5"/><circle cx="40" cy="104" r="2.5" fill="#e2543e"/><circle cx="60" cy="106" r="2.5" fill="#f2c94c"/><circle cx="80" cy="104" r="2.5" fill="#e2543e"/>`;
    default: return "";
  }
}
function glassesSVG(id) { // drawn for eyes at (47,64) and (73,64)
  const arms = (c, w = 3) => `<path d="M35 61 L23 58 M85 61 L97 58" stroke="${c}" stroke-width="${w}" stroke-linecap="round"/>`;
  switch (id) {
    case "round": return `<circle cx="47" cy="64" r="11" fill="none" stroke="${INK}" stroke-width="3"/><circle cx="73" cy="64" r="11" fill="none" stroke="${INK}" stroke-width="3"/><path d="M58 63 L62 63" stroke="${INK}" stroke-width="3"/>` + arms(INK);
    case "square": return `<rect x="35" y="54" width="23" height="19" rx="3" fill="none" stroke="${INK}" stroke-width="4"/><rect x="62" y="54" width="23" height="19" rx="3" fill="none" stroke="${INK}" stroke-width="4"/><path d="M58 60 L62 60" stroke="${INK}" stroke-width="4"/>` + arms(INK, 3.5);
    case "shades": return `<path d="M34 56 L58 56 L56 70 Q46 76 36 70 Z" fill="${INK}"/><path d="M62 56 L86 56 L84 70 Q74 76 64 70 Z" fill="${INK}"/><path d="M58 58 L62 58" stroke="${INK}" stroke-width="3"/><path d="M40 60 L46 60 M66 60 L72 60" stroke="#fff" stroke-width="2.5" stroke-linecap="round" opacity=".7"/>` + arms(INK);
    case "hearts": return `<path d="M47 77 L35 64 Q31 56 38 53 Q44 51 47 57 Q50 51 56 53 Q63 56 59 64 Z" fill="#ff7eb6" opacity=".55" stroke="#e2548f" stroke-width="3"/><path d="M73 77 L61 64 Q57 56 64 53 Q70 51 73 57 Q76 51 82 53 Q89 56 85 64 Z" fill="#ff7eb6" opacity=".55" stroke="#e2548f" stroke-width="3"/><path d="M58 60 L62 60" stroke="#e2548f" stroke-width="3"/>` + arms("#e2548f");
    case "stars": return `<path d="M47 50 L51 59 L60 60 L53 66 L55 76 L47 71 L39 76 L41 66 L34 60 L43 59 Z" fill="#f2c94c" opacity=".55" stroke="#d9a925" stroke-width="2.5" stroke-linejoin="round"/><path d="M73 50 L77 59 L86 60 L79 66 L81 76 L73 71 L65 76 L67 66 L60 60 L69 59 Z" fill="#f2c94c" opacity=".55" stroke="#d9a925" stroke-width="2.5" stroke-linejoin="round"/>` + arms("#d9a925", 2.5);
    case "aviators": return `<path d="M34 56 L57 56 Q58 72 46 74 Q34 72 34 56 Z" fill="#c07a1c" opacity=".85" stroke="#c9a14a" stroke-width="2.5"/><path d="M63 56 L86 56 Q86 72 74 74 Q62 72 63 56 Z" fill="#c07a1c" opacity=".85" stroke="#c9a14a" stroke-width="2.5"/><path d="M57 57 Q60 54 63 57" fill="none" stroke="#c9a14a" stroke-width="2.5"/>` + arms("#c9a14a", 2.5);
    case "goggles": return `<path d="M20 64 L100 64" stroke="#e2543e" stroke-width="7"/><rect x="32" y="54" width="56" height="22" rx="11" fill="#8bd8ff" stroke="${INK}" stroke-width="3"/><path d="M40 60 L54 60" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".8"/>`;
    case "monocle": return `<circle cx="73" cy="64" r="12" fill="#fff" opacity=".2" stroke="#c9a14a" stroke-width="3"/><path d="M84 70 Q92 86 86 100" fill="none" stroke="#c9a14a" stroke-width="1.5" stroke-dasharray="2 2"/>`;
    case "elder": return `<circle cx="47" cy="65" r="11" fill="none" stroke="#c9a14a" stroke-width="2.5"/><circle cx="73" cy="65" r="11" fill="none" stroke="#c9a14a" stroke-width="2.5"/><path d="M58 64 L62 64" stroke="#c9a14a" stroke-width="2.5"/>` + arms("#c9a14a", 2.5);
    default: return "";
  }
}
function hatSVG(id) { // drawn for a head top at y=42
  switch (id) {
    case "beanie": return `<path d="M22 56 Q22 24 60 24 Q98 24 98 56 Z" fill="#e2543e"/><rect x="20" y="50" width="80" height="10" rx="5" fill="#b8402f"/><circle cx="60" cy="20" r="7" fill="#fff"/>`;
    case "headband": return `<path d="M24 50 Q60 40 96 50 L96 58 Q60 48 24 58 Z" fill="#d8432f"/><rect x="52" y="44" width="16" height="9" rx="2" fill="#c9d3e3" stroke="#3b465a" stroke-width="1.5"/><path d="M96 52 Q108 56 112 66 M96 56 Q106 62 106 74" fill="none" stroke="#d8432f" stroke-width="4" stroke-linecap="round"/>`;
    case "cap": return `<path d="M26 54 Q28 26 60 26 Q92 26 94 54 Z" fill="#4b98f7"/><path d="M22 54 Q60 68 98 54 L98 52 Q60 60 22 52 Z" fill="#2c66b0"/><circle cx="60" cy="27" r="3.5" fill="#2c66b0"/>`;
    case "backcap": return `<path d="M28 50 L4 44 Q4 52 26 56 Z" fill="#1f8a5c"/><path d="M26 54 Q28 26 60 26 Q92 26 94 54 Z" fill="#2bb673"/><path d="M52 46 Q60 42 68 46" fill="none" stroke="#1f8a5c" stroke-width="3"/>`;
    case "bucket": return `<path d="M32 50 Q34 24 60 24 Q86 24 88 50 Z" fill="#c9b27a"/><path d="M14 56 Q60 42 106 56 Q60 66 14 56 Z" fill="#b39a5e"/>`;
    case "cowboy": return `<path d="M38 48 Q34 18 50 20 Q60 28 70 20 Q86 18 82 48 Z" fill="#a0703c"/><path d="M38 42 L82 42 L82 48 L38 48 Z" fill="#6b4423"/><path d="M6 42 Q30 56 60 52 Q90 56 114 42 Q104 62 60 62 Q16 62 6 42 Z" fill="#8a5a2b"/>`;
    case "tophat": return `<rect x="40" y="6" width="40" height="40" rx="3" fill="#23252e"/><rect x="40" y="34" width="40" height="7" fill="#8d5bd6"/><ellipse cx="60" cy="47" rx="30" ry="5" fill="#23252e"/>`;
    case "party": return `<path d="M44 48 L62 8 L78 46 Z" fill="#ff7eb6"/><path d="M50 34 L72 32 M46 42 L76 40 M55 22 L67 21" stroke="#f2c94c" stroke-width="3"/><circle cx="62" cy="8" r="5" fill="#f2c94c"/>`;
    case "crown": return `<path d="M38 46 L36 20 L48 32 L60 14 L72 32 L84 20 L82 46 Z" fill="#f2c94c" stroke="#d9a925" stroke-width="2" stroke-linejoin="round"/><circle cx="60" cy="36" r="4" fill="#e2543e"/><circle cx="46" cy="40" r="2.5" fill="#4b98f7"/><circle cx="74" cy="40" r="2.5" fill="#4b98f7"/>`;
    case "headphones": return `<path d="M22 70 Q20 26 60 26 Q100 26 98 70" fill="none" stroke="#23252e" stroke-width="6"/><rect x="14" y="62" width="14" height="22" rx="6" fill="#e2543e"/><rect x="92" y="62" width="14" height="22" rx="6" fill="#e2543e"/>`;
    case "flowers": return `<path d="M26 52 Q60 38 94 52" fill="none" stroke="#4fae93" stroke-width="3"/><g fill="#ff7eb6"><circle cx="30" cy="50" r="6"/><circle cx="60" cy="42" r="7"/><circle cx="90" cy="50" r="6"/></g><g fill="#f2c94c"><circle cx="45" cy="45" r="5"/><circle cx="75" cy="45" r="5"/></g>`;
    case "wizard": return `<path d="M34 52 Q50 32 58 0 Q66 12 86 6 Q72 20 86 52 Z" fill="#3d2f7a"/><path d="M14 54 Q60 42 106 54 Q60 64 14 54 Z" fill="#2c2160"/><path d="M62 22 L64 27 L69 27 L65 30 L66 35 L62 32 L58 35 L59 30 L55 27 L60 27 Z" fill="#f2c94c"/>`;
    case "beret": return `<ellipse cx="56" cy="42" rx="34" ry="12" fill="#8d5bd6" transform="rotate(-10 56 42)"/><path d="M56 30 L58 24" stroke="#8d5bd6" stroke-width="4" stroke-linecap="round"/>`;
    case "pilgrim": return `<rect x="40" y="14" width="40" height="32" rx="2" fill="#2b2b33"/><rect x="40" y="32" width="40" height="7" fill="#6b4423"/><rect x="54" y="31" width="12" height="9" fill="none" stroke="#f2c94c" stroke-width="2.5"/><ellipse cx="60" cy="47" rx="32" ry="5" fill="#2b2b33"/>`;
    case "santa": return `<path d="M24 54 Q30 22 64 22 Q90 24 100 50 Q92 36 80 40 Q86 46 96 54 Z" fill="#e2543e"/><rect x="20" y="48" width="80" height="11" rx="5.5" fill="#fff"/><circle cx="100" cy="52" r="7" fill="#fff"/>`;
    case "antlers": return `<path d="M42 46 L36 22 M36 30 L28 24 M38 36 L30 34 M78 46 L84 22 M84 30 L92 24 M82 36 L90 34" stroke="#8a5a2b" stroke-width="5" stroke-linecap="round" fill="none"/>`;
    default: return "";
  }
}
// The egg cracks a bit more each study day: day 0 smooth, day 1 a small crack, day 2 big cracks + a chip. It hatches on day 3.
function eggSVG(days) {
  const k = Math.max(0, Math.min(2, days || 0)), c1 = "#f2c94c", c2 = "#9cc8f5";
  const crack1 = `<path d="M60 16 L56 26 L63 32 L57 40" fill="none" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/>`;
  const crack2 = `<path d="M30 58 L40 62 L36 70 L46 74 L42 82" fill="none" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"/><path d="M90 60 L80 66 L86 72 L77 78" fill="none" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"/><path d="M57 40 L64 46 L60 52" fill="none" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/><path d="M64 20 L72 24 L68 30 Z" fill="#14161c" opacity=".85"/>`;
  return `<g class="p-wob${k === 2 ? " p-eggjig" : ""}"><path d="M60 14 C84 14 98 56 98 78 C98 100 82 112 60 112 C38 112 22 100 22 78 C22 56 36 14 60 14 Z" fill="#f4ead7"/>
    <circle cx="44" cy="60" r="7" fill="${c1}"/><circle cx="74" cy="46" r="5" fill="${c2}"/><circle cx="78" cy="86" r="8" fill="${c1}"/><circle cx="46" cy="96" r="5" fill="${c2}"/>
    ${k >= 1 ? crack1 : ""}${k >= 2 ? crack2 : ""}</g>`;
}

// The whole pet. opts: stage ("egg"|"baby"|...|"elder", default from days), mood ("idle"|"happy"|"yikes"|"sleep"), size (px), anim (bool), adult (force grown look for previews), wear (override)
// Where the mouth sits inside the 120x120 box (for props like a snack), as percentages.
export function mouthAt(p, wear = p?.wear) {
  const st = stageOf(p.days).id, g = GEO[p.species] || GEO.fuzz, lift = wear?.top ? g.neck - 88 : 0;
  const k = { baby: 0.6, kid: 0.74, teen: 0.88 }[st] || 1, y = 114 - (114 - (g.mouthY - lift)) * k;
  return { x: 50, y: (y / 120) * 100, k };
}
export function petSVG(p, opts = {}) {
  const size = opts.size || 120, anim = opts.anim !== false;
  if (!p) return "";
  const stage = opts.stage || (opts.adult ? "adult" : stageOf(p.days).id);
  const id = ++uid;
  const label = `${p.name || "Your Maniac"}${stage === "egg" ? " (egg)" : ""}`;
  const shadow = `<ellipse cx="60" cy="116" rx="${stage === "baby" ? 20 : 30}" ry="4" fill="#000" opacity=".25"/>`;
  if (stage === "egg") return `<svg class="pet ${anim ? "" : "still"}" viewBox="0 0 120 120" width="${size}" height="${size}" role="img" aria-label="${esc(label)}">${shadow}${eggSVG(opts.days ?? p.days)}</svg>`;
  const sp = p.species, mood = opts.mood || "idle", elder = stage === "elder";
  const wear = { ...(p.wear || {}), ...(opts.wear || {}) };
  // Wearing a top lifts the face a little so the shirt has room (the face itself never changes).
  const lift = wear.top ? GEO[sp].neck - 88 : 0, g = { ...GEO[sp], eyeY: GEO[sp].eyeY - lift, mouthY: GEO[sp].mouthY - lift, cheekY: GEO[sp].cheekY - lift };
  const hairColor = elder ? "#e3e7ee" : hairHex(p.color);
  const hat = wear.hat, hp = hairParts(mood === "yikes" && p.hair === "wisps" ? "wisps" : p.hair, hairColor, sp);
  const hideHair = hat && !hp.long; // short hair tucks under a hat
  const dy = g.top - 42, mv = (s) => (s && dy ? `<g transform="translate(0 ${dy})">${s}</g>` : s || "");
  const eyeDy = g.eyeY - 64;
  const glassesId = wear.glasses || (elder ? "elder" : null);
  // Puff is wider and lumpier than the others, so its tops are drawn a bit wider and taller to cover it.
  const topRaw = wear.top ? topSVG(wear.top, id, tintOf(p, wear.top)) : "";
  const top = topRaw && sp === "puff"
    ? `<defs><clipPath id="pc${id}"><circle cx="60" cy="66" r="32"/><circle cx="34" cy="76" r="18"/><circle cx="86" cy="76" r="18"/><circle cx="44" cy="94" r="14"/><circle cx="76" cy="94" r="14"/><circle cx="60" cy="98" r="14"/><rect x="0" y="0" width="120" height="0"/></clipPath></defs><g clip-path="url(#pc${id})" style="transform-box:view-box"><g transform="translate(60 86) scale(1.45 1.4) translate(-60 -86)" style="transform-box:view-box">${topRaw}</g></g>`
    : topRaw;
  const elderBits = elder ? `<path d="M${g.ex[0] - 13} ${g.eyeY - 12} Q${g.ex[0]} ${g.eyeY - 20} ${g.ex[0] + 11} ${g.eyeY - 10}" fill="none" stroke="#e3e7ee" stroke-width="5" stroke-linecap="round"/><path d="M${g.ex[1] - 11} ${g.eyeY - 10} Q${g.ex[1]} ${g.eyeY - 20} ${g.ex[1] + 13} ${g.eyeY - 12}" fill="none" stroke="#e3e7ee" stroke-width="5" stroke-linecap="round"/>${mood === "idle" ? `<path d="M45 ${g.mouthY + 3} Q52 ${g.mouthY - 5} 60 ${g.mouthY + 1} Q68 ${g.mouthY - 5} 75 ${g.mouthY + 3} Q68 ${g.mouthY + 9} 60 ${g.mouthY + 5} Q52 ${g.mouthY + 9} 45 ${g.mouthY + 3} Z" fill="#e3e7ee"/>` : ""}` : "";
  const blank = !!opts.faceless; // the grey stand-in in the shop: no face at all
  const cheeks = blank || mood === "sleep" || sp === "sticker" ? "" : `<ellipse cx="${g.ex[0] - 12}" cy="${g.cheekY}" rx="6" ry="3.5" fill="#ff7eb6" opacity=".45"/><ellipse cx="${g.ex[1] + 12}" cy="${g.cheekY}" rx="6" ry="3.5" fill="#ff7eb6" opacity=".45"/>`;
  // Hurt marks from Falling Words (game only): 1 = a bruise, 2 = + a bandage, 3 = knocked out (dizzy stars).
  const hurt = opts.hurt || 0;
  const hurtBits = !hurt ? "" : `<ellipse cx="${g.ex[1] + 10}" cy="${g.cheekY + 2}" rx="7" ry="5" fill="#7b3fa8" opacity=".75"/><ellipse cx="${g.ex[1] + 9}" cy="${g.cheekY + 1}" rx="3.5" ry="2.5" fill="#c084fc" opacity=".8"/>`
    + (hurt >= 2 ? `<g transform="translate(${g.ex[0] - 4} ${g.eyeY - 15}) rotate(-28)"><rect x="-14" y="-5" width="28" height="10" rx="5" fill="#f3d2a8" stroke="${INK}" stroke-width="1.6"/><rect x="-5" y="-5" width="10" height="10" fill="#e9b98a"/><circle cx="-2" cy="-2" r=".9" fill="${INK}" opacity=".5"/><circle cx="2" cy="2" r=".9" fill="${INK}" opacity=".5"/><circle cx="2" cy="-2" r=".9" fill="${INK}" opacity=".5"/><circle cx="-2" cy="2" r=".9" fill="${INK}" opacity=".5"/></g>` : "")
    + (hurt >= 3 ? `<g class="p-dizzy" style="transform-origin:60px ${g.top - 4}px">${[0, 120, 240].map((a) => `<path transform="rotate(${a} 60 ${g.top - 4}) translate(0 -2)" d="M82 ${g.top - 6} L84 ${g.top - 1} L89 ${g.top} L84 ${g.top + 1} L82 ${g.top + 6} L80 ${g.top + 1} L75 ${g.top} L80 ${g.top - 1} Z" fill="#f2c94c"/>`).join("")}</g>` : "");
  const inner = `${hideHair ? "" : mv(hp.back)}${bodySVG(sp, p.skin)}${top}${cheeks}${blank ? "" : eyesSVG(sp, g, p.eye, mood, elder)}${blank || (elder && mood === "idle") ? "" : mouthSVG(g, mood)}${blank ? "" : elderBits}${hideHair ? "" : mv(hp.front)}
    ${glassesId && mood !== "sleep" ? `<g transform="translate(${(g.ex[0] - 47)} ${eyeDy})">${glassesSVG(glassesId)}</g>` : ""}${hat ? mv(hatSVG(hat)) : ""}${hurtBits}`;
  const scale = { baby: 0.6, kid: 0.74, teen: 0.88 }[stage] || 1;
  const moveCls = mood === "happy" ? "p-jump" : mood === "yikes" ? "p-shiver" : mood === "sleep" ? "p-breathe" : `p-${sp}${elder ? " p-slow" : ""}`;
  const extras = (mood === "yikes" ? `<path class="p-drop" d="M98 46 Q104 56 98 60 Q92 56 98 46 Z" fill="#9cc8f5"/>` : "")
    + (mood === "happy" ? `<path class="p-spark" d="M12 30 L15 37 L22 40 L15 43 L12 50 L9 43 L2 40 L9 37 Z" fill="#f2c94c"/><path class="p-spark" style="animation-delay:.4s" d="M106 24 L108 29 L113 31 L108 33 L106 38 L104 33 L99 31 L104 29 Z" fill="#f2c94c"/>` : "")
    + (mood === "sleep" ? `<text class="p-zzz" x="92" y="40" font-family="Fredoka,sans-serif" font-weight="700" font-size="16" fill="#9cc8f5">z</text><text class="p-zzz" style="animation-delay:1s" x="100" y="26" font-family="Fredoka,sans-serif" font-weight="700" font-size="12" fill="#9cc8f5">z</text>` : "")
    + (elder ? `<path d="M106 114 L106 78 Q106 68 98 70" fill="none" stroke="#a0703c" stroke-width="4" stroke-linecap="round"/>` : "");
  return `<svg class="pet ${anim ? "" : "still"}" viewBox="0 0 120 120" width="${size}" height="${size}" role="img" aria-label="${esc(label)}">${shadow}${extras}<g transform="translate(60 114) scale(${scale}) translate(-60 -114)"><g class="${moveCls}">${inner}</g></g></svg>`;
}
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

// Rank emblem: a metal medal. Beveled octagon rim, shiny face, a faceted star.
// Higher tiers add wings (Gold+), longer wings (Emerald+), top/bottom spikes (Sapphire+), gems (Diamond+) and a glow.
const oct = (cx, cy, r) => Array.from({ length: 8 }, (_, i) => { const a = (Math.PI / 4) * i + Math.PI / 8; return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`; }).join(" ");
function starFacets(cx, cy, n, ro, ri, light, dark) {
  let out = "";
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (2 * Math.PI / n) * i, a1 = a - Math.PI / n, a2 = a + Math.PI / n;
    const P = (ang, r) => `${(cx + r * Math.cos(ang)).toFixed(1)} ${(cy + r * Math.sin(ang)).toFixed(1)}`;
    out += `<path d="M${cx} ${cy} L${P(a1, ri)} L${P(a, ro)} Z" fill="${light}"/><path d="M${cx} ${cy} L${P(a, ro)} L${P(a2, ri)} Z" fill="${dark}"/>`;
  }
  return out;
}
export function emblemSVG(r, size = 28, { anim = true } = {}) {
  const id = ++uid, t = r.tier, top = t >= 12, c = r.color;
  const hi = shade(c, 1.55), lt = shade(c, 1.25), dk = shade(c, 0.6), deep = shade(c, 0.38);
  const metal = (gid) => `<linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${hi}"/><stop offset=".45" stop-color="${c}"/><stop offset=".55" stop-color="${dk}"/><stop offset="1" stop-color="${lt}"/></linearGradient>`;
  const wingL = t >= 3 ? (t >= 5 ? `<path d="M30 36 L3 28 L7 40 L30 44 Z"/><path d="M30 46 L1 44 L6 56 L30 55 Z"/><path d="M31 56 L7 61 L13 70 L33 63 Z"/>` : `<path d="M30 38 L7 32 L11 43 L30 46 Z"/><path d="M30 49 L9 48 L13 58 L31 57 Z"/>`) : "";
  const wings = wingL ? `<g fill="url(#m${id})" stroke="${deep}" stroke-width="1.2" stroke-linejoin="round">${wingL}<g transform="translate(100 0) scale(-1 1)">${wingL}</g></g>` : "";
  const spikes = t >= 6 ? `<path d="M50 0 L56 20 L50 17 L44 20 Z M50 100 L56 80 L50 83 L44 80 Z" fill="url(#m${id})" stroke="${deep}" stroke-width="1.2" stroke-linejoin="round"/>` : "";
  const gems = t >= 8 ? [[50, 20], [50, 80], [21, 50], [79, 50]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3.2" fill="${top ? "#ff3d3d" : "#fff"}" stroke="${deep}" stroke-width="1"/><circle cx="${x - 1}" cy="${y - 1}" r="1" fill="#fff"/>`).join("") : "";
  const points = t < 1 ? 4 : t < 3 ? 5 : 8;
  const center = top
    ? `<path d="M50 30 C42 42 37 48 37 57 A13 13 0 0 0 63 57 C63 48 57 45 55 37 C52 44 49 45 50 30 Z" fill="#fff4d6" stroke="${deep}" stroke-width="1.2"/><path d="M50 46 C46 52 44 55 44 59 A6 6 0 0 0 56 59 C56 55 53 52 50 46 Z" fill="#ffb02e"/>`
    : starFacets(50, 50, points, 19, 7.5, hi, dk) + `<circle cx="50" cy="50" r="3" fill="${hi}"/>`;
  const pips = r.level ? Array.from({ length: r.level }, (_, i) => ((x) => `<path d="M${x} 71 L${x + 3.5} 75 L${x} 79 L${x - 3.5} 75 Z" fill="${hi}" stroke="${deep}" stroke-width="1"/>`)(50 + (i - (r.level - 1) / 2) * 9)).join("") : "";
  return `<svg class="emblem ${anim ? "" : "still"}" viewBox="0 0 100 100" width="${size}" height="${size}" role="img" aria-label="${esc(r.name)} rank">
    <defs>${metal("m" + id)}<radialGradient id="f${id}" cx=".4" cy=".35" r=".75"><stop offset="0" stop-color="${hi}"/><stop offset=".6" stop-color="${c}"/><stop offset="1" stop-color="${dk}"/></radialGradient>
      <clipPath id="c${id}"><polygon points="${oct(50, 50, 32)}"/></clipPath></defs>
    ${t >= 6 ? `<circle cx="50" cy="50" r="44" fill="${c}" opacity=".25" class="em-glow"/>` : ""}
    ${spikes}${wings}
    <polygon points="${oct(50, 50, 32)}" fill="url(#m${id})" stroke="${deep}" stroke-width="1.5" stroke-linejoin="round"/>
    <polygon points="${oct(50, 50, 26)}" fill="url(#f${id})" stroke="${deep}" stroke-width="1.2" stroke-linejoin="round"/>
    <polygon points="${oct(50, 50, 24)}" fill="none" stroke="${hi}" stroke-width=".8" opacity=".7"/>
    ${center}${pips}${gems}
    <g clip-path="url(#c${id})"><rect class="em-shine" x="-60" y="-10" width="18" height="130" fill="#fff" opacity=".45" transform="rotate(20)"/></g>
    ${t >= 9 ? `<path class="p-spark" d="M86 8 L88 14 L94 16 L88 18 L86 24 L84 18 L78 16 L84 14 Z" fill="#fff"/>` : ""}
  </svg>`;
}
