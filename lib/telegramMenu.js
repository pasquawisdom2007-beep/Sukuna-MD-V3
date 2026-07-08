/**
 * lib/telegramMenu.js
 *
 * Pure helpers that render HTML captions and keyboards for the Telegram
 * bridge. Pairing now happens exclusively through the web panel — this
 * bot is informational only (status, help, links to the panel/channels).
 *
 * All output is Telegram-flavoured HTML (parse_mode: 'HTML'). Only the
 * tags <b>, <i>, <u>, <code>, <pre>, <a> are safe. Escape all dynamic
 * values before interpolation.
 */

const config = require('../config');

function esc(v) {
    return String(v ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function uptimeStr() {
    const s = Math.floor(process.uptime());
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h}h ${m}m ${sec}s`;
}

function nowStr() {
    const d = new Date();
    return `${d.toLocaleDateString('en-GB')} · ${d.toLocaleTimeString('en-US', { hour12: true })}`;
}

/**
 * Main menu caption. Bordered ASCII frame, brand, status, action hints.
 * @param {object} ctx
 * @param {string} ctx.userName  display name of the Telegram user
 * @param {number} ctx.sessions  active WhatsApp sessions count
 * @param {string} ctx.panelUrl  URL of the web pairing panel
 */
function buildMenuCaption({ userName = 'Friend', sessions = 0, panelUrl = '' } = {}) {
    const brand = esc(config.telegram?.brandName || 'SUKUNA MD BRIDGE');
    const owner = esc(config.owner?.name || 'PASQUA');
    const ver   = esc(config.version);
    const pf    = esc(config.prefix);

    return (
`╔══════════════════════════════╗
   👑  <b>${brand}</b>
╚══════════════════════════════╝

👋 Hello <b>${esc(userName)}</b> — welcome!

┏━━━ <b>STATUS</b> ━━━
┃ ⚡  bot      : <b>online</b>
┃ 🧬  version  : <code>v${ver}</code>
┃ 👤  owner    : ${owner}
┃ 🧷  prefix   : <code>${pf}</code>
┃ 📲  sessions : <b>${sessions}</b> active
┃ ⏱  uptime   : ${esc(uptimeStr())}
┃ 🗓  time     : ${esc(nowStr())}
┗━━━━━━━━━━━━━━━━━━━━

<b>Pairing has moved to the web panel.</b>
Tap <b>🌐 Open Web Panel</b> below to deploy
and manage your WhatsApp bot with a
pairing code — no Telegram commands needed.
${panelUrl ? `\n🔗 ${esc(panelUrl)}\n` : ''}
<i>powered by ${owner} · sukuna-md</i>`
    );
}

function buildHelpCaption() {
    return (
`╔══════════════════════════════╗
   ❓  <b>HELP</b>
╚══════════════════════════════╝

<b>Telegram commands</b>
• <code>/start</code> or <code>/menu</code> — show the menu
• <code>/help</code> — this screen

<b>Where do I pair my bot?</b>
Pairing codes are generated on the web
panel now, not through Telegram. Tap
<b>🌐 Open Web Panel</b> on the menu, enter
your WhatsApp number, solve the security
check, and you'll get a pairing code
instantly.

<i>Need help? ${esc(config.telegram?.supportTg || '')}</i>`
    );
}

function joinChannelRows() {
    const ch = (config.telegram && config.telegram.requiredChannels) || [];
    const rows = [];
    for (let i = 0; i < ch.length; i += 2) {
        const row = [{ text: ch[i].label, url: ch[i].url }];
        if (ch[i + 1]) row.push({ text: ch[i + 1].label, url: ch[i + 1].url });
        rows.push(row);
    }
    return rows;
}

function mainKeyboard(panelUrl) {
    const rows = [];
    if (panelUrl) rows.push([{ text: '🌐 Open Web Panel', url: panelUrl }]);
    rows.push(...joinChannelRows());
    rows.push([
        { text: '❓ Help', callback_data: 'help' },
        { text: '🔄 Menu', callback_data: 'menu' }
    ]);
    return { inline_keyboard: rows };
}

function backKeyboard(panelUrl) {
    const rows = [];
    if (panelUrl) rows.push([{ text: '🌐 Open Web Panel', url: panelUrl }]);
    rows.push([{ text: '⬅️ Back to menu', callback_data: 'menu' }]);
    return { inline_keyboard: rows };
}

module.exports = {
    esc,
    buildMenuCaption,
    buildHelpCaption,
    mainKeyboard,
    backKeyboard,
    joinChannelRows
};
