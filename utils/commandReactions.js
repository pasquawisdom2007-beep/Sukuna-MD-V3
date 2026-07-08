/**
 * Command Reactions — every command gets its own emoji react, fired the
 * instant it's accepted and BEFORE the command's own output is delivered.
 *
 * Two layers:
 *   1. OVERRIDES — hand-picked emoji for the commands people actually type
 *      first (ping, menu, alive, economy/mod actions, etc.) so the react
 *      feels intentional, not random.
 *   2. CATEGORY_POOLS — every command not in OVERRIDES still gets a
 *      consistent, distinct-feeling emoji: a small hash of the command name
 *      picks an index into its category's pool, so two commands in the same
 *      category land on different emoji rather than all sharing one.
 *
 * getCommandReaction() is the only export sessionManager.js needs.
 */
'use strict';

const OVERRIDES = {
    // admin
    ping: '🏓', menu: '⛩️', alive: '💓', help: '📖', botstat: '📊',
    broadcast: '📢', ban: '🔨', kick: '🥾', kickall: '🥾', promote: '⬆️',
    demote: '⬇️', mute: '🔇', tagall: '📣', hidetag: '🫥', welcome: '👋',
    goodbye: '👋', rules: '📜', groupinfo: 'ℹ️', listadmins: '🛡️',
    antilink: '🔗', antibot: '🤖', antihijack: '🛡️', antipromote: '⬆️', antidemote: '⬇️', setdesign: '🎨',
    repo: '📦', owner: '👑',

    // owner
    private: '🔒', public: '🔓', restart: '🔄', mode: '⚙️', info: 'ℹ️',
    setbio: '📝', setname: '🪪', setprefix: '🔤', setmod: '🛡️',
    setsudo: '🔑', avatar: '🖼️', block: '🚫', blocklist: '📋',
    clearcache: '🧹', grouplist: '📋', retrieve: '🗃️',

    // media
    tiksearch: '🎵', tiktok: '🎵', tiktokgirl: '🎵', play: '▶️',
    youtube: '▶️', instagram: '📸', tgsticker: '🧩', sticker: '🧩',
    toimg: '🖼️', tovv: '👁️', ttp: '🔤', attp: '🔤', tts: '🔊',
    ttstalk: '🔊', movie: '🎬', anime: '🌸', animeinfo: '🌸',
    animesearch: '🌸', lyrics: '🎤', wallpaper: '🖼️', wallpaperanime: '🖼️',
    ss: '📸', emojimix: '🪄', xvideos: '🔞',

    // economy
    balance: '💰', daily: '🎁', work: '🛠️', beg: '🙏', rob: '🦹',
    heist: '💣', gamble: '🎲', slots: '🎰', roulette: '🎡', dice: 'edice'.length ? '🎲' : '🎲',
    lottery: '🎟️', mine: '⛏️', fish: '🎣', hunt: '🏹', crime: '🕵️',
    drugs: '💊', inventory: '🎒', shop: '🛒', buy: '🛍️', pay: '💸',
    deposit: '🏦', withdraw: '🏧', interest: '📈', invest: '📈',
    edice: '🎲',
    leaderboard: '🏆', profile: '🪪', richest: '👑', taxes: '🧾',
    travel: '✈️', occupation: '💼', login: '🔗', health: '❤️',
    petshop: '🐾', buypet: '🐾', mypets: '🐾', charactershop: '🎴',
    buychar: '🎴', mychars: '🎴', blackmarket: '🕴️', bmbuy: '🕴️',
    gift: '🎁', spin: '🎡',

    // moderation
    antidelete: '🗑️', antiedit: '✏️', antiforward: '↪️', antinsfw: '🔞',
    antispam: '🚯', antisticker: '🧩', antiurl: '🔗', antiviewonce: '👁️',
    warn: '⚠️', warnings: '⚠️', blacklist: '⛔', unblacklist: '✅',
    lock: '🔒', unlock: '🔓', nocall: '📵', muteuser: '🔇',
    unmuteuser: '🔊', mutesticker: '🔇', unmutesticker: '🔊',

    // fun (the most-spammed ones)
    '8ball': '🎱', meme: '😂', joke: '😂', dadjoke: '😂', roast: '🔥',
    compliment: '🥰', insult: '💢', hug: '🤗', kiss: '😘', slap: '✋',
    pat: '🫳', poke: '👉', ship: '💞', truth: '😳', dare: '😈',
    coin: '🪙', flip: '🔄', quote: '💬', fact: '🧠', riddle: '🧩',

    // utility
    calc: '🧮', math: '🧮', weather: '⛅', qrcode: '🔳', qr: '🔳',
    translate: '🌐', time: '🕒', timezone: '🕒', uptime: '⏱️',
    uptime2: '⏱️', password: '🔐', uuid: '🆔', age: '🎂',
    remind: '⏰', calendar: '📅', shorturl: '🔗', shorten: '🔗',

    // ai
    gpt: '🧠', generate: '🎨', imagine: '🎨', editimage: '🖌️',
    define: '📖', wiki: '📚', currency: '💱', pasqua: '👹',
};

// One emoji-per-command fallback pool for each category. Every command NOT
// explicitly listed above still lands on something distinct and on-theme.
const CATEGORY_POOLS = {
    admin:      ['🛡️', '⚙️', '📋', '🔧', '🗂️', '📌'],
    ai:         ['🧠', '✨', '🔮', '🤖', '💡'],
    economy:    ['💰', '🪙', '📦', '🎲', '🛠️', '🧧'],
    fun:        ['🎉', '😆', '🎭', '🎈', '🪅', '🌀'],
    general:    ['📡', '📨', '🔧', '🌐', '📋'],
    group:      ['👥', '📌', '🗓️', '📋', '🔔'],
    media:      ['🎬', '🖼️', '🎶', '📥', '🎞️'],
    moderation: ['🛡️', '🚧', '🔏', '🧹'],
    owner:      ['👑', '🔧', '🗝️', '⚙️'],
    textmaker:  ['🖋️', '🎨', '🪄', '✍️'],
    unicode:    ['🔤', '🔡'],
    utility:    ['🧰', '🔢', '📐', '🛠️', '📊'],
    '18plus':   ['🔞'],
};

const DEFAULT_POOL = ['✨', '⚡', '🔹', '🌀'];

// Tiny deterministic string hash — same command name always picks the same
// pool index, so reactions stay consistent run-to-run instead of random.
function hashStr(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
        h = (h * 31 + str.charCodeAt(i)) >>> 0;
    }
    return h;
}

/**
 * Returns the emoji a given command should react with, BEFORE it runs.
 * @param {string} commandName  lowercase command name (no prefix/aliases)
 * @param {string} [category]   the command's category, for pool fallback
 */
function getCommandReaction(commandName, category) {
    const name = String(commandName || '').toLowerCase();
    if (OVERRIDES[name]) return OVERRIDES[name];

    const pool = CATEGORY_POOLS[category] || DEFAULT_POOL;
    const idx  = hashStr(name) % pool.length;
    return pool[idx];
}

module.exports = { getCommandReaction, OVERRIDES, CATEGORY_POOLS };
