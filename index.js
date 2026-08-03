/**
 * Vercel serverless entry point.
 *
 * Wraps the existing Express app from web/server.js so the panel
 * (static pages + /api/* routes) can be served through Vercel's
 * Node runtime. All requests get routed here — see vercel.json.
 *
 * IMPORTANT — read before relying on this in production:
 * The bot itself (Baileys sockets + useMultiFileAuthState) keeps a
 * live WebSocket connection open and writes session credentials to
 * disk. Vercel functions are stateless, short-lived, and their
 * filesystem is read-only outside /tmp — so a session can pair here,
 * then vanish on the next cold start. Use this to host the panel UI
 * itself; run the actual bot process (index.js) somewhere with a
 * persistent filesystem and long-running process, e.g. Render,
 * Railway, or a small VPS.
 */

const { start } = require('../web/server');

module.exports = start();
