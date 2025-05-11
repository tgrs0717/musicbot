"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeTextBot = initializeTextBot;
const discord_js_1 = require("discord.js");
const firebase_1 = require("./firebase");
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
const client = new discord_js_1.Client({
    intents: [
        discord_js_1.GatewayIntentBits.Guilds,
        discord_js_1.GatewayIntentBits.GuildMessages,
        discord_js_1.GatewayIntentBits.MessageContent,
    ],
});
const TARGET_CHANNEL_ID = '1358033487462010900';
client.on('messageCreate', async (message) => {
    if (message.channel.id !== TARGET_CHANNEL_ID)
        return;
    if (message.author.bot)
        return;
    const content = message.content;
    // 終了メッセージ処理
    if (content.includes('終了') || content.includes('休憩') || content.includes('中断')) {
        const doc = await firebase_1.db.collection('pomodoro_sessions').doc(message.author.id).get();
        if (!doc.exists) {
            await replyAndDelete(message, '開始時刻が記録されていません。');
            return;
        }
        const data = doc.data();
        const startTime = new Date(data.startTime);
        const endTime = new Date();
        const elapsed = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        try {
            const reaction = await message.react('☑');
            setTimeout(() => reaction.remove().catch(console.error), 3000);
            await message.author.send(`お疲れ様です。作業時間: ${minutes}分${seconds}秒`);
        }
        catch (error) {
            console.error('リアクションまたはDM送信に失敗:', error);
        }
        await firebase_1.db.collection('pomodoro_sessions').doc(message.author.id).delete();
    }
    // 開始メッセージ処理
    if (content.includes('開始') || content.includes('再開')) {
        const existing = await firebase_1.db.collection('pomodoro_sessions').doc(message.author.id).get();
        if (existing.exists) {
            await replyAndDelete(message, '既に開始時刻が記録されています');
            return;
        }
        await firebase_1.db.collection('pomodoro_sessions').doc(message.author.id).set({
            startTime: new Date().toISOString(),
            channelId: message.channel.id,
        });
        try {
            const reaction = await message.react('✅');
            setTimeout(() => reaction.remove().catch(console.error), 3000);
        }
        catch (error) {
            console.error('リアクションの追加に失敗:', error);
        }
    }
});
// 毎朝5時に全ユーザーのセッションを処理してリセット
function scheduleDailyReset() {
    setInterval(async () => {
        const now = new Date();
        const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
        if (jst.getHours() === 5 && jst.getMinutes() === 0) {
            const snapshot = await firebase_1.db.collection('pomodoro_sessions').get();
            for (const doc of snapshot.docs) {
                const data = doc.data();
                const startTime = new Date(data.startTime);
                const elapsed = Math.floor((Date.now() - startTime.getTime()) / 1000);
                const minutes = Math.floor(elapsed / 60);
                const seconds = elapsed % 60;
                try {
                    const user = await client.users.fetch(doc.id);
                    await user.send(`お疲れ様です。作業時間: ${minutes}分${seconds}秒`);
                }
                catch (error) {
                    console.error(`ユーザー ${doc.id} へのDM失敗:`, error);
                }
                await doc.ref.delete();
            }
            console.log('作業時間をリセットしました:', jst.toISOString());
        }
    }, 60000);
}
scheduleDailyReset();
function initializeTextBot(token) {
    client.login(token).catch(console.error);
}
