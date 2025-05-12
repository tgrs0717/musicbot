"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerPomodoroHandlers = registerPomodoroHandlers;
exports.startNotifyTimer = startNotifyTimer;
exports.stopNotifyTimer = stopNotifyTimer;
const firebase_1 = require("./firebase");
const TARGET_CHANNEL_ID = process.env.TARGET_CHANNEL_ID;
const notifyTimers = new Map();
const restartTimers = new Map();
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
function registerPomodoroHandlers(client) {
    client.on('messageCreate', async (message) => {
        if (message.channel.id !== TARGET_CHANNEL_ID)
            return;
        if (message.author.bot)
            return;
        const content = message.content;
        if (content.includes('終了') || content.includes('休憩') || content.includes('中断')) {
            let doc;
            try {
                doc = await firebase_1.db.collection('pomodoro_sessions').doc(message.author.id).get();
            }
            catch (error) {
                console.error('❌ Firebase からのデータ取得に失敗:', error);
                await replyAndDelete(message, 'Firebase からデータを取得できませんでした。');
                return;
            }
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
            stopNotifyTimer(message.author.id);
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
        if (content.includes('開始') || content.includes('再開')) {
            const existing = await firebase_1.db.collection('pomodoro_sessions').doc(message.author.id).get();
            if (existing.exists) {
                await replyAndDelete(message, '既に開始時刻が記録されています');
                return;
            }
            try {
                await firebase_1.db.collection('pomodoro_sessions').doc(message.author.id).set({
                    startTime: new Date().toISOString(),
                    channelId: message.channel.id,
                });
                console.log(`✅ Firebase 書き込み成功: ${message.author.id}`);
            }
            catch (error) {
                console.error('❌ Firebase 書き込み失敗:', error);
            }
            startNotifyTimer(client, message.author.id);
            try {
                const reaction = await message.react('✅');
                setTimeout(() => reaction.remove().catch(console.error), 3000);
            }
            catch (error) {
                console.error('リアクションの追加に失敗:', error);
            }
        }
    });
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
                    console.error(`ユーザー ${doc.id} へのDM送信に失敗:`, error);
                }
                await doc.ref.delete();
            }
            console.log('✅ 作業時間リセット完了:', jst.toISOString());
        }
    }, 60000);
}
async function startNotifyTimer(client, userId) {
    const doc = await firebase_1.db.collection('user_settings').doc(userId).get();
    const settings = doc.data() || {};
    const intervalMin = settings.workDuration ?? 25;
    const breakMin = settings.breakDuration ?? 5;
    const enabled = settings.notifyEnabled ?? true;
    if (!enabled)
        return;
    // 🔁 既存タイマーのクリア
    if (notifyTimers.has(userId)) {
        clearTimeout(notifyTimers.get(userId));
        notifyTimers.delete(userId);
    }
    if (restartTimers.has(userId)) {
        clearTimeout(restartTimers.get(userId));
        restartTimers.delete(userId);
    }
    try {
        const user = await client.users.fetch(userId);
        await user.send(`ポモドーロを開始しました。${intervalMin}分後に通知します。`);
    }
    catch (err) {
        console.error(`ユーザー ${userId} への開始通知に失敗しました:`, err);
    }
    const cycle = async () => {
        try {
            const user = await client.users.fetch(userId);
            await user.send(` ${intervalMin}分が経過しました。小休憩（${breakMin}分）を取りましょう。`);
        }
        catch (err) {
            console.error(`ユーザー ${userId} への通知に失敗しました:`, err);
        }
        notifyTimers.delete(userId);
        // 休憩後の再スタートを予約（※ restartTimers に登録）
        const restartTimer = setTimeout(() => {
            console.log(`🔁 ユーザー ${userId} の休憩が終了。作業通知を再開します。`);
            restartTimers.delete(userId);
            startNotifyTimer(client, userId);
        }, breakMin * 60 * 1000);
        restartTimers.set(userId, restartTimer);
    };
    const timer = setTimeout(() => {
        cycle();
    }, intervalMin * 60 * 1000);
    notifyTimers.set(userId, timer);
}
function stopNotifyTimer(userId) {
    const timer = notifyTimers.get(userId);
    if (timer) {
        clearTimeout(timer);
        notifyTimers.delete(userId);
    }
    const restart = restartTimers.get(userId);
    if (restart) {
        clearTimeout(restart);
        restartTimers.delete(userId);
    }
    console.log(`⛔ ユーザー ${userId} のポモドーロ通知を完全に停止しました。`);
}
