// Paste this into a new Cloudflare Worker (see SETUP.md, step 6).
// Every hour it pings Study Mania, which sends each person's daily reminder at their chosen time.
export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(fetch("https://studymania.pages.dev/api/cron", { method: "POST" }));
  },
  async fetch() {
    return new Response("Study Mania reminders are running.");
  },
};
