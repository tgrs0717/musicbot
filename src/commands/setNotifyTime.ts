import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction, CommandInteractionOptionResolver } from 'discord.js';
import { startNotifyTimer, stopNotifyTimer } from '../text';
import { db } from '../firebase';

const setPomodoroCommand = {
  data: new SlashCommandBuilder()
    .setName('pomodoro-set-time')
    .setDescription('ポモドーロの作業時間と休憩時間を設定します。')
    .addIntegerOption(option => 
      option.setName('work')
        .setDescription('作業時間（分単位）')
        .setRequired(true)
    )
    .addIntegerOption(option => 
      option.setName('break')
        .setDescription('休憩時間（分単位）')
        .setRequired(true)
    ),

  async execute(interaction: CommandInteraction, options: CommandInteractionOptionResolver) {
    const userId = interaction.user.id;

    const workDuration = interaction.options.get('work')?.value as number;
    const breakDuration = interaction.options.get('break')?.value as number;

    if (typeof workDuration !== 'number' || typeof breakDuration !== 'number') {
      await interaction.reply('❗作業時間と休憩時間を正しく指定してください。');
      return;
    }

    try {
      // 既存の通知タイマーを停止
      await stopNotifyTimer(userId);

      // Firestoreに設定を保存（mergeで他設定は保持）
      await db.collection('user_settings').doc(userId).set(
  {
    workDuration,
    breakDuration,
  },
  { merge: true }
);

// 現在作業中か確認
const sessionDoc = await db.collection('pomodoro_sessions').doc(userId).get();

// 通知設定を取得
const userSettings = (await db.collection('user_settings').doc(userId).get()).data();
const notifyEnabled = userSettings?.notifyEnabled ?? false;

// 通知タイマーを止める（常に）
await stopNotifyTimer(userId);

// 作業中かつ通知有効なら再開
if (sessionDoc.exists && notifyEnabled) {
  await startNotifyTimer(interaction.client, userId);
}


      // ユーザーへ返信
      await interaction.reply({
        content:`✅ ポモドーロを更新しました。\n- 作業: **${workDuration}分**\n- 休憩: **${breakDuration}分**`
      , ephemeral: true
    });
    } catch (error) {
      console.error('❌ ポモドーロ設定エラー:', error);
      await interaction.reply({
        content: '⚠️ ポモドーロ時間の設定に失敗しました。もう一度お試しください。'
      , ephemeral: true
      });
    }
  },
};

export default setPomodoroCommand;
