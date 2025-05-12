"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const builders_1 = require("@discordjs/builders");
const text_1 = require("../text");
const firebase_1 = require("../firebase");
const setPomodoroCommand = {
    data: new builders_1.SlashCommandBuilder()
        .setName('pomodoro-set-time')
        .setDescription('ポモドーロの作業時間と休憩時間を設定します。')
        .addIntegerOption(option => option.setName('work_duration')
        .setDescription('作業時間（分単位）')
        .setRequired(true))
        .addIntegerOption(option => option.setName('break_duration')
        .setDescription('休憩時間（分単位）')
        .setRequired(true)),
    async execute(interaction, options) {
        const userId = interaction.user.id;
        const workDuration = interaction.options.get('work_duration')?.value;
        const breakDuration = interaction.options.get('break_duration')?.value;
        if (typeof workDuration !== 'number' || typeof breakDuration !== 'number') {
            await interaction.reply('❗作業時間と休憩時間を正しく指定してください。');
            return;
        }
        try {
            // 既存の通知タイマーを停止
            await (0, text_1.stopNotifyTimer)(userId);
            // Firestoreに設定を保存（mergeで他設定は保持）
            await firebase_1.db.collection('user_settings').doc(userId).set({
                workDuration,
                breakDuration,
            }, { merge: true });
            // 新しい設定でタイマー再スタート
            await (0, text_1.startNotifyTimer)(interaction.client, userId);
            // ユーザーへ返信
            await interaction.reply({
                content: `✅ ポモドーロを更新しました。\n- 作業: **${workDuration}分**\n- 休憩: **${breakDuration}分**`,
                ephemeral: true
            });
        }
        catch (error) {
            console.error('❌ ポモドーロ設定エラー:', error);
            await interaction.reply({
                content: '⚠️ ポモドーロ時間の設定に失敗しました。もう一度お試しください。',
                ephemeral: true
            });
        }
    },
};
exports.default = setPomodoroCommand;
