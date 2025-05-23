import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('question')
    .setDescription('匿名で質問を送信します。')
    .addStringOption(option =>
      option.setName('message').setDescription('質問を入力してください。').setRequired(true)
    ),
  guildOnly: true,
  async execute(interaction: ChatInputCommandInteraction) {   
    await interaction.deferReply({ ephemeral: true });

    try {
      const userMessage = interaction.options.getString('message');
      const formattedMessage = `【質問】${userMessage}`;
      if (interaction.channel?.isTextBased() && 'send' in interaction.channel) {
        await interaction.channel.send(formattedMessage || 'メッセージがありません');
      }
      await interaction.editReply({ content: `あなたが入力したメッセージ: "${formattedMessage}"` });
    } catch (error) {
      console.error('質問コマンドでエラー:', error);
      await interaction.editReply({ content: 'エラーが発生しました。' });
    }
  },
};
