// Cloudflare Pages Function: every /api/* request goes to the Study Mania API.
import worker from "../../src/worker.js";
export const onRequest = (ctx) => worker.fetch(ctx.request, ctx.env, ctx);
