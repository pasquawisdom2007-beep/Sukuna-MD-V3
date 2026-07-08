/**
 * AntiDemote Command — Sukuna MD admin protection
 * Usage: .antidemote on | off | status
 *
 * Guards ONLY unauthorized demotions (independent of .antihijack, which
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
    name: 'antidemote',
    aliases: ['antidemo'],
    description: 'Auto-reverse unauthorized demotions only',
    category: 'admin',

    async execute({ msg, reply, args, from, isGroup }) {
        if (!isGroup) return reply('⛧ ' + boldItalic('Group only') + ' ⛧');

        const action = (args[0] || '').toLowerCase();
        const group  = database.getGroup(from);
        const on = !!group.antidemote;

        const card = (title, body) =>
            `╭─❒ ◈ ${boldItalic('SUKUNA · AntiDemote')} ❒\n` +
            `│ ⛧ ${title}\n` +
            `├──────────────⛧\n` +
            body.split('\n').map(l => `│ ${l}`).join('\n') + `\n` +
            `╰────────────⛧`;

        if (!['on', 'off', 'status'].includes(action)) {
            return reply(card(
                boldItalic('Usage'),
                `Status   : ${on ? 'ON ✅' : 'OFF ❌'}\n` +
                `Toggle   : .antidemote on | off\n` +
                `Inspect  : .antidemote status\n\n` +
                `Reverses any unauthorized\n` +
                `demote in <1s, restoring the\n` +
                `victim's admin rank, and\n` +
                `demotes the offender.\n` +
                `Bot must be admin.\n\n` +
                `Tip: use .antihijack for both\n` +
                `promote + demote protection.`
            ));
        }

        if (action === 'status') {
            return reply(card(
                boldItalic('Status'),
                on
                    ? `Active ✅\nUnauthorized demotes get\nreversed instantly.`
                    : `Inactive ❌\nEnable with .antidemote on`
            ));
        }

        if (action === 'on') {
            database.setGroup(from, 'antidemote', true);
            return reply(card(
                boldItalic('Activated'),
                `Protection : ON ✅\nDirection  : Demote only\nReaction   : <1s\nRetries    : 3 × 400ms\nLoop guard : enabled\n\nBot must be admin.`
            ));
        }

        // off
        database.setGroup(from, 'antidemote', false);
        return reply(card(
            boldItalic('Deactivated'),
            `Protection : OFF ❌\nDemotions are no longer\nguarded by Sukuna.`
        ));
    }
};
