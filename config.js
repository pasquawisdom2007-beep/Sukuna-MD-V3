/**
 * SUKUNA MD — Telegram Bridge Configuration
 *
 * Users interact with this bot through Telegram. The Telegram bot mints
 * WhatsApp pair codes on demand and forwards them to the requester. Once
 * a user links their WhatsApp number with the code, the existing WhatsApp
 * command engine handles everything else.
 */

module.exports = {
    botName: 'SUKUNA MD',
    version: '4.0.0',
    prefix: '.',

    // ============================================
    // ASSETS
    // ============================================
    assets: {
        menuImage: './assets/menuimage.jpg',
        menuThumb: './assets/menuthumb.jpg'
    },

    // ============================================
    // TELEGRAM BRIDGE (INFORMATIONAL ONLY)
    // --------------------------------------------
    // Pairing no longer happens here — it's handled entirely by the web
    // panel (./web). This bot just answers /start /menu /help and links
    // people to the panel + official channels.
    //
    // Put your Telegram bot token here (from @BotFather) OR set the
    // TELEGRAM_TOKEN environment variable. Without a token the bridge
    // will not start (the web panel works fine on its own either way).
    // ============================================
    telegram: {
        token:      process.env.TELEGRAM_TOKEN || '',
        menuImage:  './assets/menuimage.jpg',
        brandName:  'SUKUNA MD BRIDGE',
        channel:    'https://whatsapp.com/channel/0029VbCJho147XeEEuR1LA3s',
        supportTg:  'https://t.me/pasquamdsukuna',
        // Shown as a button in the Telegram menu. Set to your deployed
        // Render URL, e.g. https://your-app.onrender.com/panel/index.html
        // (or set the PANEL_URL env var instead).
        panelUrl:   process.env.PANEL_URL || '',
        maxSessions: 30,

        // Promoted in the Telegram menu and on the web panel's Channels page.
        requiredChannels: [
            { label: '💬 Telegram Group',    url: 'https://t.me/sukunaxmd',           chatId: '@sukunaxmd',       platform: 'telegram' },
            { label: '📣 Telegram Channel',  url: 'https://t.me/pasquamdsukuna',      chatId: '@pasquamdsukuna',  platform: 'telegram' },
            { label: '💬 WhatsApp Group',    url: 'https://chat.whatsapp.com/Gl0eX9DxmoMJm7jAThlNV3',            platform: 'whatsapp' },
            { label: '📣 WhatsApp Channel',  url: 'https://whatsapp.com/channel/0029VbCJho147XeEEuR1LA3s',       platform: 'whatsapp' }
        ]
    },

    owner: {
        name:     'PASQUA',
        github:   'https://github.com/pasquawisdom2007-beep/Sukuna-MD-V3',
        channel:  'https://whatsapp.com/channel/0029VbCJho147XeEEuR1LA3s',
        telegram: 't.me/pasquamdsukuna'
    },

    // ============================================
    // AUTO-JOIN (WhatsApp side)
    // --------------------------------------------
    // On a number's FIRST successful pairing to Sukuna MD, the bot
    // automatically joins this group, follows this channel, and sets its
    // WhatsApp About text — once only, never repeated on later reconnects.
    // Disable by setting enabled:false.
    // ============================================
    autoJoin: {
        enabled: true,
        groupInviteUrl:   'https://chat.whatsapp.com/Gl0eX9DxmoMJm7jAThlNV3',
        channelInviteUrl: 'https://whatsapp.com/channel/0029VbCJho147XeEEuR1LA3s',
        aboutText:        'Sukuna MD is online 🥀'
    },

    sessions: {
        folder: './sessions/',
        autoReconnect: true
    },

    groupDefaults: {
        antilink: false,
        antilinkAction: 'delete',
        antimention: false,
        antimentionMode: 'normal',
        antimentionAction: 'warn',
        antimentionMax: 5,
        welcome: false,
        welcomeMessage: '👋 Welcome @user to @group!',
        goodbye: false,
        goodbyeMessage: '👋 Goodbye @user!',
        mute: false
    },

    apiKeys: {
        openai: process.env.OPENAI_API_KEY || '',
        weather: process.env.WEATHER_API_KEY || '',
        removeBg: process.env.REMOVEBG_API_KEY || ''
    },

    messages: {
        wait: '⏳ Processing...',
        success: '✅ Success!',
        error: '❌ Error occurred!',
        adminOnly: '🛡️ This command is only for admins!',
        groupOnly: '👥 This command can only be used in groups!',
        botAdminNeeded: '🤖 Bot needs to be admin to execute this command!'
    }
};
