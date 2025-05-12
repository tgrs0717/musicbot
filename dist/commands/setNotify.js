"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// commands/setNotify.ts
const discord_js_1 = require("discord.js");
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
            await firebase_1.db.collection('user_settings').doc(userId).set({ notifyEnabled }, { merge: true });
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
