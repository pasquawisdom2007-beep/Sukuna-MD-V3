/**
 * AntiPromote Command — Sukuna MD admin protection
 * Usage: .antipromote on | off | status
 *
 * Guards ONLY unauthorized promotions (independent of .antihijack, which
 * guards both directions at once). Robust + fast: cached group metadata,
 * combined single-call reversal, per-jid loop guard, owner/sudo allowlist.
 * The actual reversal logic lives in lib/sessionManager.js → _handleAntiHijack(),
 * which is shared by antihijack / antipromote / antidemote.
 */

const database = require('../../utils/database');

function boldItalic(str) {
    const upperBase = 0x1D63C, lowerBase = 0x1D656;
    let out = '';
    for (const ch of str) {
        const c = ch.codePointAt(0);
        if (c >= 0x41 && c <= 0x5A) out += String.fromCodePoint(upperBase + (c - 0x41));
        else if (c >= 0x61 && c <= 0x7A) out += String.fromCodePoint(lowerBase + (c - 0x61));
        else out += ch;
    }
    return out;
}

module.exports = {
    name: 'antipromote',
    aliases: ['antipromo'],
    description: 'Auto-reverse unauthorized promotions only',
    category: 'admin',

    async execute({ msg, reply, args, from, isGroup }) {
        if (!isGroup) return reply('⛧ ' + boldItalic('Group only') + ' ⛧');

        const action = (args[0] || '').toLowerCase();
        const group  = database.getGroup(from);
        const on = !!group.antipromote;

        const card = (title, body) =>
            `╭─❒ ◈ ${boldItalic('SUKUNA · AntiPromote')} ❒\n` +
            `│ ⛧ ${title}\n` +
            `├──────────────⛧\n` +
            body.split('\n').map(l => `│ ${l}`).join('\n') + `\n` +
            `╰────────────⛧`;

        if (!['on', 'off', 'status'].includes(action)) {
            return reply(card(
                boldItalic('Usage'),
                `Status   : ${on ? 'ON ✅' : 'OFF ❌'}\n` +
                `Toggle   : .antipromote on | off\n` +
                `Inspect  : .antipromote status\n\n` +
                `Reverses any unauthorized\n` +
                `promote in <1s and demotes\n` +
                `the offender.\n` +
                `Bot must be admin.\n\n` +
                `Tip: use .antihijack for both\n` +
                `promote + demote protection.`
            ));
        }

        if (action === 'status') {
            return reply(card(
                boldItalic('Status'),
                on
                    ? `Active ✅\nUnauthorized promotes get\nreversed instantly.`
                    : `Inactive ❌\nEnable with .antipromote on`
            ));
        }

        if (action === 'on') {
            database.setGroup(from, 'antipromote', true);
            return reply(card(
                boldItalic('Activated'),
                `Protection : ON ✅\nDirection  : Promote only\nReaction   : <1s\nRetries    : 3 × 400ms\nLoop guard : enabled\n\nBot must be admin.`
            ));
        }

        // off
        database.setGroup(from, 'antipromote', false);
        return reply(card(
            boldItalic('Deactivated'),
            `Protection : OFF ❌\nPromotions are no longer\nguarded by Sukuna.`
        ));
    }
};
