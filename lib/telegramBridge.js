/**
 * lib/telegramBridge.js
 *
 * Telegram front-end for SUKUNA MD — INFORMATIONAL ONLY.
 *
 * Pairing no longer happens through Telegram. All pairing-code
 * generation now lives in the web panel (see ./web/server.js and
 * ./web/public). This bot just answers /start, /menu, /help and
 * points people at the web panel + official channels.
 *
 * The bot uses long-polling (no webhook config required).
 */

const fs   = require('fs');
const path = require('path');

const config         = require('../config');
const sessionManager = require('./sessionManager');
const menu           = require('./telegramMenu');

let TelegramBot;
try {
    TelegramBot = require('node-telegram-bot-api');
} catch (e) {
    // Lazy require: handled inside start() so the rest of the app still boots.
}

// ───────────────────────────── helpers ─────────────────────────────────────
function activeSessionCount() {
    try {
        return [...sessionManager.sessions.values()]
            .filter(s => s.status === 'connected').length;
    } catch {
        return 0;
    }
}

function userDisplayName(from = {}) {
    return from.first_name || from.username || 'Friend';
}

function panelUrl() {
    // PANEL_URL env var lets you point Telegram users at your deployed
    // Render URL, e.g. https://your-app.onrender.com/panel/index.html
    const base = process.env.PANEL_URL || config.telegram?.panelUrl || '';
    return base;
}

async function sendMenu(bot, chatId, from) {
    const caption = menu.buildMenuCaption({
        userName: userDisplayName(from),
        sessions: activeSessionCount(),
        panelUrl: panelUrl()
    });

    const img = path.resolve(process.cwd(), config.telegram.menuImage || './assets/menuimage.jpg');
    const opts = {
        caption,
        parse_mode: 'HTML',
        reply_markup: menu.mainKeyboard(panelUrl())
    };

    try {
        if (fs.existsSync(img)) {
            await bot.sendPhoto(chatId, img, opts);
        } else {
            await bot.sendMessage(chatId, caption, {
                parse_mode: 'HTML',
                reply_markup: menu.mainKeyboard(panelUrl()),
                disable_web_page_preview: true
            });
        }
    } catch (e) {
        console.error('[TG] sendMenu failed:', e.message);
        try {
            await bot.sendMessage(chatId, caption, {
                parse_mode: 'HTML',
                reply_markup: menu.mainKeyboard(panelUrl()),
                disable_web_page_preview: true
            });
        } catch (_) {}
    }
}

async function sendHelp(bot, chatId) {
    await bot.sendMessage(chatId, menu.buildHelpCaption(), {
        parse_mode: 'HTML',
        disable_web_page_preview: true,
        reply_markup: menu.backKeyboard(panelUrl())
    });
}

// ───────────────────────────── bootstrap ──────────────────────────────────
function start() {
    const token = (config.telegram && config.telegram.token) || process.env.TELEGRAM_TOKEN || '';
    if (!token) {
        console.log('[TG] TELEGRAM_TOKEN not set — Telegram bridge disabled. Set config.telegram.token or env TELEGRAM_TOKEN to enable.');
        return null;
    }
    if (!TelegramBot) {
        console.log('[TG] node-telegram-bot-api is not installed. Run: npm install node-telegram-bot-api');
        return null;
    }

    const bot = new TelegramBot(token, { polling: true });

    bot.on('polling_error', (err) => {
        console.error('[TG] polling error:', err.message);
    });

    // /start, /menu
    bot.onText(/^\/(start|menu)(?:@\w+)?$/, async (msg) => {
        await sendMenu(bot, msg.chat.id, msg.from);
    });

    // /help
    bot.onText(/^\/help(?:@\w+)?$/, async (msg) => {
        await sendHelp(bot, msg.chat.id);
    });

    // Inline button callbacks
    bot.on('callback_query', async (q) => {
        const chatId = q.message?.chat?.id;
        const data = q.data;
        if (!chatId) return;
        try { await bot.answerCallbackQuery(q.id); } catch (_) {}

        switch (data) {
            case 'menu':
                await sendMenu(bot, chatId, q.from);
                break;
            case 'help':
                await sendHelp(bot, chatId);
                break;
            default:
                break;
        }
    });

    console.log('[TG] Telegram bridge online (informational mode — pairing happens on the web panel).');
    return bot;
}

module.exports = { start };
