"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeTextBot = initializeTextBot;
const discord_js_1 = require("discord.js");
/**
 * メッセージにリプライし、指定した時間後に削除する
 * @param message 元のメッセージ
 * @param content リプライの内容
 * @param delay 削除までの時間（ミリ秒）
 */
async function replyAndDelete(message, content, delay = 10000) {
    try {
        const replyMessage = await message.reply(content);
        setTimeout(async () => {
            try {
                await replyMessage.delete();
            }
            catch (error) {
                console.error('メッセージの削除に失敗しました:', error);
            }
        }, delay);
    }
    catch (error) {
        console.error('リプライの送信に失敗しました:', error);
    }
}
// Discordクライアントの初期化
const client = new discord_js_1.Client({
    intents: [
        discord_js_1.GatewayIntentBits.Guilds,
        discord_js_1.GatewayIntentBits.GuildMessages,
        discord_js_1.GatewayIntentBits.MessageContent,
    ],
});
// 特定のチャンネルIDを設定
const TARGET_CHANNEL_ID = '1358033487462010900'; // チャンネルIDを指定
// メンバーごとの「開始」時刻を記録するマップ
const startTimes = new Map();
client.on('messageCreate', async (message) => {
    // 指定したチャンネル以外では無視
    if (message.channel.id !== TARGET_CHANNEL_ID)
        return;
    // ボットのメッセージは無視
    if (message.author.bot)
        return;
    const content = message.content;
    // 「終了」を含むメッセージを処理
    if (content.includes('終了')) {
        const startTime = startTimes.get(message.author.id);
        if (!startTime) {
            await replyAndDelete(message, '開始時刻が記録されていません。');
        }
        else {
            const endTime = new Date();
            const elapsedTime = Math.floor((endTime.getTime() - startTime.getTime()) / 1000); // 経過時間を秒で計算
            // 経過時間を分と秒に変換
            const minutes = Math.floor(elapsedTime / 60);
            const seconds = elapsedTime % 60;
            // 「作業時間」のリプライを1分後に削除
            await message.reply(`作業時間: ${minutes}分${seconds}秒`);
            // 記録をリセット
            startTimes.delete(message.author.id);
        }
    }
    // 「開始」を含むメッセージを処理
    if (content.includes('開始')) {
        // 既に「開始」が記録されている場合は無視
        if (startTimes.has(message.author.id)) {
            await replyAndDelete(message, '既に開始時刻が記録されています！');
            return;
        }
        startTimes.set(message.author.id, new Date());
        await replyAndDelete(message, '開始時刻を記録しました！');
    }
});
// 毎朝5時に経過時間をリセットする処理
function scheduleDailyReset() {
    setInterval(() => {
        const now = new Date();
        if (now.getHours() === 5 && now.getMinutes() === 0) {
            startTimes.clear();
            console.log('作業時間をリセットしました:', now.toISOString());
        }
    }, 60000); // 1分ごとにチェック
}
// スケジュールを開始
scheduleDailyReset();
// 初期化関数をエクスポート
function initializeTextBot(token) {
    client.login(token).catch(console.error);
}
