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
// メンバーごとの「開始」時刻と元のメッセージを記録するマップ
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
    if (content.includes('終了') || content.includes('休憩')) {
        const startRecord = startTimes.get(message.author.id);
        if (!startRecord) {
            try {
                // DMで開始時刻が記録されていないことを通知
                await replyAndDelete(message, '開始時刻が記録されていません。');
            }
            catch (error) {
                console.error('DMの送信に失敗しました:', error);
            }
        }
        else {
            const endTime = new Date();
            const elapsedTime = Math.floor((endTime.getTime() - startRecord.startTime.getTime()) / 1000); // 経過時間を秒で計算
            // 経過時間を分と秒に変換
            const minutes = Math.floor(elapsedTime / 60);
            const seconds = elapsedTime % 60;
            try {
                // メッセージにリアクションを追加
                const reaction = await message.react('☑'); // 作業時間を記録した場合のリアクション
                // 5秒後にリアクションを外す
                setTimeout(async () => {
                    try {
                        await reaction.remove();
                    }
                    catch (error) {
                        console.error('リアクションの削除に失敗しました:', error);
                    }
                }, 3000);
                // DMで作業時間を通知
                await message.author.send(`お疲れ様です。作業時間: ${minutes}分${seconds}秒`);
            }
            catch (error) {
                console.error('リアクションの追加またはDMの送信に失敗しました:', error);
            }
            // 記録をリセット
            startTimes.delete(message.author.id);
        }
    }
    // 「開始」を含むメッセージを処理
    if (content.includes('開始') || content.includes('再開')) {
        // 既に「開始」が記録されている場合は無視
        if (startTimes.has(message.author.id)) {
            await replyAndDelete(message, '既に開始時刻が記録されています');
            return;
        }
        // 開始時刻と元のメッセージを記録
        startTimes.set(message.author.id, { startTime: new Date(), message });
        // メッセージにリアクションを追加
        try {
            const reaction = await message.react('✅'); // 好きな絵文字を指定
            // 5秒後にリアクションを外す
            setTimeout(async () => {
                try {
                    await reaction.remove();
                }
                catch (error) {
                    console.error('リアクションの削除に失敗しました:', error);
                }
            }, 3000);
        }
        catch (error) {
            console.error('リアクションの追加に失敗しました:', error);
        }
    }
});
// 毎朝5時に経過時間をリセットする処理
function scheduleDailyReset() {
    setInterval(async () => {
        const now = new Date();
        if (now.getHours() === 5 && now.getMinutes() === 0) {
            for (const [userId, { startTime, message }] of startTimes.entries()) {
                const endTime = new Date();
                const elapsedTime = Math.floor((endTime.getTime() - startTime.getTime()) / 1000); // 経過時間を秒で計算
                // 経過時間を分と秒に変換
                const minutes = Math.floor(elapsedTime / 60);
                const seconds = elapsedTime % 60;
                try {
                    await message.author.send(`お疲れ様です。作業時間: ${minutes}分${seconds}秒`);
                }
                catch (error) {
                    console.error(`ユーザー ${userId} へのDM送信に失敗しました:`, error);
                }
            }
            // 記録をリセット
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
