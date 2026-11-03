// Minimal Web Push sender for Cloudflare Workers.
// Sends an empty "tickle" push signed with VAPID. The service worker then
// fetches /api/nudge to build the notification text, so no payload encryption is needed.

const b64u = {
  enc(buf) {
    const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
    let s = "";
    for (const b of bytes) s += String.fromCharCode(b);
    return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  },
  encStr(str) {
    return b64u.enc(new TextEncoder().encode(str));
  },
};

let cachedKey = null;
async function signingKey(env) {
  if (cachedKey) return cachedKey;
  const jwk = JSON.parse(env.VAPID_PRIVATE_JWK);
  cachedKey = await crypto.subtle.importKey(
    "jwk",
    { kty: "EC", crv: "P-256", d: jwk.d, x: jwk.x, y: jwk.y, ext: true },
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );
  return cachedKey;
}

async function vapidJwt(env, audience) {
  const header = b64u.encStr(JSON.stringify({ typ: "JWT", alg: "ES256" }));
  const claims = b64u.encStr(
    JSON.stringify({
      aud: audience,
      exp: Math.floor(Date.now() / 1000) + 12 * 3600,
      sub: env.VAPID_SUBJECT || "mailto:admin@example.com",
    })
  );
  const unsigned = `${header}.${claims}`;
  const sig = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    await signingKey(env),
    new TextEncoder().encode(unsigned)
  );
  return `${unsigned}.${b64u.enc(sig)}`;
}

// Returns "ok", "gone" (subscription should be deleted) or "error".
export async function sendPush(env, endpoint) {
  if (!env.VAPID_PRIVATE_JWK || !env.VAPID_PUBLIC_KEY) return "error";
  try {
    const aud = new URL(endpoint).origin;
    const jwt = await vapidJwt(env, aud);
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        TTL: "43200",
        Urgency: "normal",
        Authorization: `vapid t=${jwt}, k=${env.VAPID_PUBLIC_KEY}`,
        "Content-Length": "0",
      },
    });
    if (res.status === 404 || res.status === 410) return "gone";
    return res.ok ? "ok" : "error";
  } catch (e) {
    return "error";
  }
}
