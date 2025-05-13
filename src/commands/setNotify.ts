// commands/setNotify.ts
import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { startNotifyTimer, stopNotifyTimer } from '../text';
import { db } from '../firebase';

export default {
  data: new SlashCommandBuilder()
    .setName('pomodoro-set-notify')
    .setDescription('ポモドーロ通知のオン/オフを設定します')
    .addStringOption(option =>
      option.setName('state')
        .setDescription('通知の状態')
        .setRequired(true)
        .addChoices(
          { name: 'on', value: 'on' },
          { name: 'off', value: 'off' },
        )
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const state = interaction.options.getString('state', true);
    const notifyEnabled = state === 'on';
    const userId = interaction.user.id;

    try {
      // Firestore に通知設定を保存
      await db.collection('user_settings').doc(userId).set(
        { notifyEnabled },
        { merge: true }
      );

      // 作業中か確認
      const sessionDoc = await db.collection('pomodoro_sessions').doc(userId).get();

      // 通知タイマーを停止（再設定のため常に止める）
      stopNotifyTimer(userId);

      // 作業中かつ通知ONなら再開
      if (sessionDoc.exists && notifyEnabled) {
        await startNotifyTimer(interaction.client, userId);
      }

      await interaction.reply({
        content: `通知を **${state.toUpperCase()}** に設定しました。`, 
        ephemeral: true
      });
      
    } catch (error) {
      console.error('set-notify エラー:', error);
      await interaction.reply({
        content : '⚠️ 通知オンオフの設定中にエラーが発生しました。',
        ephemeral: true,
      });
    }
  }
};
