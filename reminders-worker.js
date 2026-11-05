// Study Mania reminder timer. Paste this into a new Cloudflare Worker and give it a Cron Trigger of */15 * * * *
// Every 15 minutes it pings Study Mania, which sends each person's reminders at their chosen time.
// (GitHub's scheduled runs are only a backup: GitHub often runs them hours late.)
export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(
      fetch("https://studymania.app/api/cron", { method: "POST" })
        .catch(() => fetch("https://studymania.pages.dev/api/cron", { method: "POST" }))
    );
  },
  async fetch() {
    return new Response("Study Mania reminders are running.");
  },
};
