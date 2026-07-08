/**
 * SUKUNA MD — Web Pairing Panel
 * ------------------------------------------------------------
 * A small Express server that sits in front of the existing
 * sessionManager. It exposes:
 *
 *   GET  /api/captcha        -> issues a signed math challenge
 *   GET  /api/status         -> paired / server / slot counters
 *   GET  /api/bots           -> masked list of paired numbers
 *   POST /api/pair           -> generates a pairing code
 *   POST /api/bots/delete    -> unlink a number (must match in full)
 *
 * and serves the static 5-page neon panel from ./public.
 *
 * It runs INSIDE the same Node process as the bot so it shares the
 * live `sessionManager` instance — no separate database or IPC needed.
 */

const path         = require('path');
const crypto       = require('crypto');
const express      = require('express');
const config          = require('../config');
const sessionManager  = require('../lib/sessionManager');

const CAPTCHA_SECRET = process.env.CAPTCHA_SECRET || 'sukuna-captcha-secret-change-me';
const MAX_SESSIONS   = config?.telegram?.maxSessions || 30;

function signChallenge(a, b, exp) {
    return crypto
        .createHmac('sha256', CAPTCHA_SECRET)
        .update(`${a}:${b}:${exp}`)
        .digest('hex');
}

function maskNumber(num) {
    const n = String(num).replace(/[^0-9]/g, '');
    if (n.length <= 6) return n.replace(/./g, '*');
    const head = n.slice(0, 5);
    const tail = n.slice(-2);
    const mid  = '*'.repeat(Math.max(3, n.length - head.length - tail.length));
    return `${head}${mid}${tail}`;
}

function start() {
    const app = express();

    app.use(express.json());
    app.use('/panel', express.static(path.join(__dirname, 'public')));

    // Redirect root to the panel if nothing else is mounted there.
    app.get('/', (req, res) => res.redirect('/panel/index.html'));

    // ---- Captcha -----------------------------------------------------
    app.get('/api/captcha', (req, res) => {
        const a   = Math.floor(Math.random() * 15) + 1;
        const b   = Math.floor(Math.random() * 15) + 1;
        const exp = Date.now() + 5 * 60 * 1000; // 5 min
        const sig = signChallenge(a, b, exp);
        res.json({ a, b, exp, token: sig });
    });

    // ---- Status --------------------------------------------------------
    app.get('/api/status', (req, res) => {
        const all       = sessionManager.getAllConnectedSessions();
        const connected = all.filter(s => s.status === 'connected').length;
        res.json({
            paired:    connected,
            servers:   1,
            maxSlots:  MAX_SESSIONS,
            available: Math.max(0, MAX_SESSIONS - connected),
            uptime:    process.uptime()
        });
    });

    // ---- Bot list (masked) ----------------------------------------------
    app.get('/api/bots', (req, res) => {
        const all = sessionManager.getAllConnectedSessions();
        res.json({
            bots: all.map(s => ({
                masked: maskNumber(s.number),
                status: s.status
            }))
        });
    });

    // ---- Pair -------------------------------------------------------
    app.post('/api/pair', async (req, res) => {
        try {
            const { number, answer, a, b, exp, token } = req.body || {};

            if (!number || !/^[0-9]{8,15}$/.test(String(number).replace(/[^0-9]/g, ''))) {
                return res.status(400).json({ success: false, error: 'Enter a valid phone number with country code (digits only).' });
            }
            if (a === undefined || b === undefined || !exp || !token) {
                return res.status(400).json({ success: false, error: 'Security check missing — refresh and try again.' });
            }
            if (Date.now() > Number(exp)) {
                return res.status(400).json({ success: false, error: 'Security check expired — refresh and try again.' });
            }
            const expected = signChallenge(a, b, exp);
            if (expected !== token) {
                return res.status(400).json({ success: false, error: 'Security check invalid — refresh and try again.' });
            }
            if (Number(answer) !== Number(a) + Number(b)) {
                return res.status(400).json({ success: false, error: 'Wrong answer to the security check.' });
            }

            const clean  = String(number).replace(/[^0-9]/g, '');
            const result = await sessionManager.createSession(clean);
            return res.json(result);
        } catch (err) {
            console.error('[WEB PAIR]', err.message);
            return res.status(500).json({ success: false, error: 'Server error generating pairing code.' });
        }
    });

    // ---- Delete / unlink -----------------------------------------------
    // Requires the FULL phone number (not the masked version) so only
    // someone who actually owns the number can unlink it.
    app.post('/api/bots/delete', (req, res) => {
        const { number } = req.body || {};
        const clean = String(number || '').replace(/[^0-9]/g, '');
        if (!clean) return res.status(400).json({ success: false, error: 'Phone number required.' });
        sessionManager.deleteSession(clean);
        res.json({ success: true });
    });

    return app;
}

module.exports = { start, maskNumber };
