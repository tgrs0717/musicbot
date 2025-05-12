// commands/setNotify.ts
import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
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
      await db.collection('user_settings').doc(userId).set(
        { notifyEnabled },
        { merge: true }
      );
      await interaction.reply({
       content: `通知を **${state.toUpperCase()}** に設定しました。`, 
       ephemeral: true});
    } catch (error) {
      console.error('set-notify エラー:', error);
      await interaction.reply({
        content : '⚠️ 通知オンオフの設定中にエラーが発生しました。',
        ephemeral: true,
      }
      );
    }
  }
};
