"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// commands/notifyStatus.ts
const discord_js_1 = require("discord.js");
const firebase_1 = require("../firebase");
exports.default = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('pomodoro-status')
        .setDescription('現在のポモドーロ通知設定を表示します'),
    async execute(interaction) {
        const userId = interaction.user.id;
        try {
            const doc = await firebase_1.db.collection('user_settings').doc(userId).get();
            const data = doc.exists ? doc.data() : null;
            const workDuration = data?.workDuration ?? '25';
            const breakDuration = data?.breakDuration ?? '5';
            const enabled = data?.notifyEnabled === true ? 'ON' : 'OFF';
            await interaction.reply({
                content: `🔧 通知設定:\n- 状態: **${enabled}**\n- 作業時間: **${workDuration}分**\n- 休憩時間 **${breakDuration}分**`,
                ephemeral: true
            });
        }
        catch (error) {
            console.error('notify-status エラー:', error);
            await interaction.reply({
                content: '⚠️ 設定の取得中にエラーが発生しました。',
                ephemeral: true
            });
        }
    }
};
