// Makes a new key pair for push notifications.
// Run: node scripts/gen-vapid.mjs
// It writes the public key into wrangler.toml and reminders.toml for you,
// and prints the private key to paste into the two "secret put" commands.
import fs from "node:fs";
const kp = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
const raw = new Uint8Array(await crypto.subtle.exportKey("raw", kp.publicKey));
const jwk = await crypto.subtle.exportKey("jwk", kp.privateKey);
const pub = Buffer.from(raw).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
for (const f of ["wrangler.toml", "reminders.toml"]) {
  if (!fs.existsSync(f)) continue;
  fs.writeFileSync(f, fs.readFileSync(f, "utf8").replace(/VAPID_PUBLIC_KEY = ".*"/, `VAPID_PUBLIC_KEY = "${pub}"`));
  console.log(`✓ Saved the public key into ${f}`);
}
console.log("\nYour PRIVATE key (copy this whole line, including the { }):\n");
console.log(JSON.stringify({ d: jwk.d, x: jwk.x, y: jwk.y }));
console.log("\nPaste it when these ask for a value:\n  npx wrangler pages secret put VAPID_PRIVATE_JWK --project-name studymania\n  npx wrangler secret put VAPID_PRIVATE_JWK -c reminders.toml\n");
