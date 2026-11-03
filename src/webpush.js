// Web Push sender for Cloudflare (no libraries).
// - Signs each request with VAPID (RFC 8292).
// - Encrypts the message text into the notification itself (RFC 8291, aes128gcm),
//   which is what iPhones and every browser handle most reliably.

const enc = new TextEncoder();
const b64u = {
  enc(buf) {
    const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
    let s = "";
    for (const b of bytes) s += String.fromCharCode(b);
    return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  },
  dec(str) {
    const s = atob(String(str).replace(/-/g, "+").replace(/_/g, "/") + "===".slice((String(str).length + 3) % 4));
    return Uint8Array.from(s, (c) => c.charCodeAt(0));
  },
};
const concat = (...parts) => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
};
async function hmac(key, data) {
  const k = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", k, data));
}

// ---------- VAPID signature ----------
let cachedKey = null;
async function signingKey(env) {
  if (cachedKey) return cachedKey;
  const jwk = JSON.parse(env.VAPID_PRIVATE_JWK);
  cachedKey = await crypto.subtle.importKey("jwk", { kty: "EC", crv: "P-256", d: jwk.d, x: jwk.x, y: jwk.y, ext: true },
    { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  return cachedKey;
}
async function vapidJwt(env, audience) {
  const header = b64u.enc(enc.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const claims = b64u.enc(enc.encode(JSON.stringify({ aud: audience, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: env.VAPID_SUBJECT || "mailto:admin@example.com" })));
  const unsigned = `${header}.${claims}`;
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, await signingKey(env), enc.encode(unsigned));
  return `${unsigned}.${b64u.enc(sig)}`;
}

// ---------- message encryption (RFC 8291) ----------
// `fixed` is only used by the self-test to plug in the RFC's example keys.
export async function encryptPayload(plaintext, p256dhB64, authB64, fixed = {}) {
  const uaPublic = b64u.dec(p256dhB64), authSecret = b64u.dec(authB64);
  let asKeys;
  if (fixed.asPrivateJwk) {
    asKeys = { privateKey: await crypto.subtle.importKey("jwk", fixed.asPrivateJwk, { name: "ECDH", namedCurve: "P-256" }, false, ["deriveBits"]) };
    asKeys.publicRaw = b64u.dec(fixed.asPublic);
  } else {
    const kp = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
    asKeys = { privateKey: kp.privateKey, publicRaw: new Uint8Array(await crypto.subtle.exportKey("raw", kp.publicKey)) };
  }
  const uaKey = await crypto.subtle.importKey("raw", uaPublic, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const ecdhSecret = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: uaKey }, asKeys.privateKey, 256));
  const salt = fixed.salt ? b64u.dec(fixed.salt) : crypto.getRandomValues(new Uint8Array(16));

  const prkKey = await hmac(authSecret, ecdhSecret);
  const ikm = await hmac(prkKey, concat(enc.encode("WebPush: info\0"), uaPublic, asKeys.publicRaw, new Uint8Array([1])));
  const prk = await hmac(salt, ikm);
  const cek = (await hmac(prk, concat(enc.encode("Content-Encoding: aes128gcm\0"), new Uint8Array([1])))).slice(0, 16);
  const nonce = (await hmac(prk, concat(enc.encode("Content-Encoding: nonce\0"), new Uint8Array([1])))).slice(0, 12);

  const aesKey = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  const padded = concat(enc.encode(plaintext), new Uint8Array([2])); // 0x02 = last record
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, aesKey, padded));
  const rs = new Uint8Array([0, 0, 0x10, 0]); // record size 4096
  return concat(salt, rs, new Uint8Array([asKeys.publicRaw.length]), asKeys.publicRaw, cipher);
}

// Returns { result: "ok" | "gone" | "error", status, why }
export async function sendPush(env, sub, message) {
  if (!env.VAPID_PRIVATE_JWK) return { result: "error", why: "The server is missing its private notification key (VAPID_PRIVATE_JWK secret)." };
  if (!env.VAPID_PUBLIC_KEY) return { result: "error", why: "The server is missing its public notification key (VAPID_PUBLIC_KEY)." };
  try {
    const endpoint = typeof sub === "string" ? sub : sub.endpoint;
    const jwt = await vapidJwt(env, new URL(endpoint).origin);
    const headers = { TTL: "43200", Urgency: "high", Authorization: `vapid t=${jwt}, k=${env.VAPID_PUBLIC_KEY}` };
    let body = null;
    if (message && sub.p256dh && sub.auth) {
      body = await encryptPayload(JSON.stringify(message), sub.p256dh, sub.auth);
      headers["Content-Encoding"] = "aes128gcm";
      headers["Content-Type"] = "application/octet-stream";
    } else headers["Content-Length"] = "0";
    const res = await fetch(endpoint, { method: "POST", headers, body });
    if (res.status === 404 || res.status === 410) return { result: "gone", status: res.status };
    if (res.ok) return { result: "ok", status: res.status };
    let text = ""; try { text = (await res.text()).slice(0, 200); } catch {}
    return { result: "error", status: res.status, why: res.status === 403 ? "The notification key doesn't match the one this phone signed up with. Turn reminders off and on again." : `The push service said ${res.status}. ${text}` };
  } catch (e) {
    return { result: "error", why: String(e?.message || e).slice(0, 200) };
  }
}
