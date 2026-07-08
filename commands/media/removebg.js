/**
 * Remove Background — reply to an image or static sticker with .removebg
 * (alias .rmvbg) to get it back with the background stripped, via the
 * remove.bg API.
 *
 * Requires REMOVEBG_API_KEY to be set (see .env.example). Get a key at
 * https://www.remove.bg/api — never hardcode it in source.
 */
'use strict';

const axios = require('axios');
const FormData = require('form-data');
const sharp = require('sharp');
const { downloadMediaMessage } = require('@crysnovax/baileys');
const config = require('../../config');

let webp2png = null;
try {
    ({ webp2png } = require('../../utils/webp2mp4'));
} catch (_) {}

const REMOVEBG_ENDPOINT = 'https://api.remove.bg/v1.0/removebg';

async function removeBackground(imageBuffer, apiKey) {
    const form = new FormData();
    form.append('image_file', imageBuffer, { filename: 'image.jpg' });
    form.append('size', 'auto');

    const response = await axios.post(REMOVEBG_ENDPOINT, form, {
        headers: {
            ...form.getHeaders(),
            'X-Api-Key': apiKey,
        },
        responseType: 'arraybuffer',
        timeout: 60000,
        validateStatus: () => true,
    });

    if (response.status !== 200) {
        let detail = '';
        try {
            const parsed = JSON.parse(Buffer.from(response.data).toString('utf8'));
            detail = parsed?.errors?.[0]?.title || '';
        } catch (_) {}
        const err = new Error(detail || `remove.bg returned status ${response.status}`);
        err.status = response.status;
        throw err;
    }

    return Buffer.from(response.data);
}

module.exports = {
    name: 'removebg',
    aliases: ['rmvbg'],
    description: 'Remove the background from an image (reply to an image/sticker)',
    category: 'media',
    usage: '.removebg (reply to an image or sticker)',

    async execute({ sock, msg, from, reply }) {
        const apiKey = config.apiKeys?.removeBg;
        if (!apiKey) {
            return reply(
                '❌ Background removal is not configured.\n\n' +
                'Set REMOVEBG_API_KEY in your .env file with a key from https://www.remove.bg/api'
            );
        }

        const ctxInfo = msg.message?.extendedTextMessage?.contextInfo;
        const quotedMsg = ctxInfo?.quotedMessage;
        const isImage = !!quotedMsg?.imageMessage;
        const isSticker = !!quotedMsg?.stickerMessage;

        if (!quotedMsg || (!isImage && !isSticker)) {
            return reply(
                `🖼️ *Remove Background*\n\n` +
                `Reply to an *image* or *static sticker* with .removebg (or .rmvbg)\n` +
                `and I'll send it back with the background removed.`
            );
        }

        if (isSticker) {
            const stickerIsAnimated =
                quotedMsg.stickerMessage?.isAnimated ||
                quotedMsg.stickerMessage?.mimetype?.includes('animated');
            if (stickerIsAnimated) {
                return reply('❌ Animated stickers are not supported. Reply to a static image or sticker.');
            }
        }

        await sock.sendMessage(from, { react: { text: '⏳', key: msg.key } }).catch(() => {});

        try {
            const targetMessage = {
                key: {
                    remoteJid: from,
                    id: ctxInfo.stanzaId,
                    participant: ctxInfo.participant,
                },
                message: quotedMsg,
            };

            const mediaBuffer = await downloadMediaMessage(
                targetMessage,
                'buffer',
                {},
                { logger: undefined, reuploadRequest: sock.updateMediaMessage }
            );

            if (!mediaBuffer?.length) {
                await sock.sendMessage(from, { react: { text: '❌', key: msg.key } }).catch(() => {});
                return reply('❌ Failed to download that media. Please try again.');
            }

            // Normalize to JPEG (sticker webp -> png -> jpeg, or any image -> jpeg)
            let imageBuffer = mediaBuffer;
            if (isSticker) {
                try {
                    imageBuffer = webp2png
                        ? await webp2png(mediaBuffer)
                        : await sharp(mediaBuffer).png().toBuffer();
                } catch (err) {
                    console.error('[removebg:webp2png]', err.message);
                    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } }).catch(() => {});
                    return reply('❌ Failed to process that sticker. Try a regular image instead.');
                }
            }

            let jpegBuffer = imageBuffer;
            try {
                const meta = await sharp(imageBuffer).metadata();
                if (meta.format !== 'jpeg' && meta.format !== 'jpg') {
                    jpegBuffer = await sharp(imageBuffer).flatten({ background: '#ffffff' }).jpeg({ quality: 95 }).toBuffer();
                }
            } catch (err) {
                console.error('[removebg:normalize]', err.message);
                // fall through with original buffer — remove.bg accepts several formats
            }

            const resultBuffer = await removeBackground(jpegBuffer, apiKey);

            if (!resultBuffer?.length) {
                await sock.sendMessage(from, { react: { text: '❌', key: msg.key } }).catch(() => {});
                return reply('❌ remove.bg returned an empty result. Please try again.');
            }

            await sock.sendMessage(
                from,
                {
                    image: resultBuffer,
                    caption: '✅ *Background removed*',
                },
                { quoted: msg }
            );
            await sock.sendMessage(from, { react: { text: '✅', key: msg.key } }).catch(() => {});
        } catch (err) {
            console.error('[removebg]', err.message);
            await sock.sendMessage(from, { react: { text: '❌', key: msg.key } }).catch(() => {});

            if (err.status === 402) {
                return reply('❌ remove.bg API credits are exhausted. Top up at https://www.remove.bg/api');
            }
            if (err.status === 403) {
                return reply('❌ remove.bg rejected the API key. Check REMOVEBG_API_KEY in your .env file.');
            }
            if (err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT') {
                return reply('❌ Request timed out. Please try again.');
            }
            return reply(`❌ Failed to remove background: ${err.message || 'Unknown error'}`);
        }
    },
};
