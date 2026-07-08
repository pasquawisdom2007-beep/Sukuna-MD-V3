#!/usr/bin/env node
// Load .env if present (no hard dependency)
try { require('dotenv').config(); } catch {}

/**
 * SUKUNA MD v4 — Telegram Bridge
 *
 * Users no longer pair through the console. Instead, they message the
 * Telegram bot, request a pair code, and link their WhatsApp number with
 * it. The existing WhatsApp engine then handles all in-chat commands.
 *
 * Steps on boot:
 *   1. Load every command module.
 *   2. Restore any sessions already persisted in ./sessions/.
 *   3. Start the Telegram bridge (long-polling).
 */

const chalk          = require('chalk');
const commandLoader  = require('./utils/commandLoader');
const config         = require('./config');
const sessionManager = require('./lib/sessionManager');
const telegramBridge = require('./lib/telegramBridge');

console.log(chalk.red(`
╔════════════════════════════════════════════════════════════════╗
║                    SUKUNA MD v${(config.version || '4.0.0').padEnd(6)}                        ║
║                  Telegram → WhatsApp Bridge Bot                ║
╚════════════════════════════════════════════════════════════════╝
`));

async function main() {
    console.log(chalk.yellow('[SYSTEM] Loading commands...'));
    commandLoader.loadCommands();
    console.log(chalk.green('[SYSTEM] Commands loaded!'));

    console.log(chalk.yellow('[SYSTEM] Restoring existing WhatsApp sessions...'));
    await sessionManager.loadExistingSessions();
    const active = (sessionManager.sessions && sessionManager.sessions.size) || 0;
    console.log(chalk.green(`[SYSTEM] ${active} session(s) restored.`));

    console.log(chalk.yellow('[SYSTEM] Starting Telegram bridge...'));
    const bot = telegramBridge.start();
    if (!bot) {
        console.log(chalk.red('[SYSTEM] Telegram bridge did not start. Set TELEGRAM_TOKEN (env or config.telegram.token) and restart.'));
    }

    console.log(chalk.yellow('[SYSTEM] Starting web pairing panel...'));
    try {
        const webServer = require('./web/server');
        const PORT = process.env.PORT || 3000;
        const app  = webServer.start();
        app.listen(PORT, () => console.log(chalk.green(`[SYSTEM] Web panel live on port ${PORT} (/panel/index.html)`)));
    } catch (err) {
        console.log(chalk.red('[SYSTEM] Web panel failed to start:'), err.message);
    }

    console.log(chalk.green('\n[SYSTEM] SUKUNA MD is running. Press Ctrl+C to stop.\n'));
}

main().catch((err) => {
    console.error(chalk.red('[ERROR] Fatal startup error:'), err.message);
    process.exit(1);
});

process.on('uncaughtException', (err) => {
    console.error(chalk.red('[ERROR] Uncaught Exception:'), err.message);
});
process.on('unhandledRejection', (reason) => {
    console.error(chalk.red('[ERROR] Unhandled Rejection:'), reason);
});
process.on('SIGINT',  () => { console.log(chalk.red('\n[SYSTEM] Shutting down...')); process.exit(0); });
process.on('SIGTERM', () => { console.log(chalk.red('\n[SYSTEM] Shutting down...')); process.exit(0); });
