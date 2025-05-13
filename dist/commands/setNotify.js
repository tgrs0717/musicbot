"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// commands/setNotify.ts
const discord_js_1 = require("discord.js");
const text_1 = require("../text");
const firebase_1 = require("../firebase");
exports.default = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('pomodoro-set-notify')
        .setDescription('ポモドーロ通知のオン/オフを設定します')
        .addStringOption(option => option.setName('state')
        .setDescription('通知の状態')
        .setRequired(true)
        .addChoices({ name: 'on', value: 'on' }, { name: 'off', value: 'off' })),
    async execute(interaction) {
        const state = interaction.options.getString('state', true);
        const notifyEnabled = state === 'on';
        const userId = interaction.user.id;
        try {
            // Firestore に通知設定を保存
            await firebase_1.db.collection('user_settings').doc(userId).set({ notifyEnabled }, { merge: true });
            // 作業中か確認
            const sessionDoc = await firebase_1.db.collection('pomodoro_sessions').doc(userId).get();
            // 通知タイマーを停止（再設定のため常に止める）
            (0, text_1.stopNotifyTimer)(userId);
            // 作業中かつ通知ONなら再開
            if (sessionDoc.exists && notifyEnabled) {
                await (0, text_1.startNotifyTimer)(interaction.client, userId);
            }
            await interaction.reply({
                content: `通知を **${state.toUpperCase()}** に設定しました。`,
                ephemeral: true
            });
        }
        catch (error) {
            console.error('set-notify エラー:', error);
            await interaction.reply({
                content: '⚠️ 通知オンオフの設定中にエラーが発生しました。',
                ephemeral: true,
            });
        }
    }
};
