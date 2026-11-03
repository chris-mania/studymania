// Tiny separate Worker that sends the daily reminders (Pages can't run on a schedule by itself).
import { sendReminders } from "./worker.js";
export default {
  async scheduled(event, env, ctx) { ctx.waitUntil(sendReminders(env)); },
  async fetch() { return new Response("Study Mania reminders are running.", { headers: { "content-type": "text/plain" } }); },
};
