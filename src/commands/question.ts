import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';

export const questionCommand = {
  data: new SlashCommandBuilder()
    .setName('question')
    .setDescription('匿名で質問を送信します。')
    .addStringOption(option =>
      option
        .setName('message')
        .setDescription('質問を入力してください。')
        .setRequired(true) // メッセージを必須に設定
    ),
  
  async execute(interaction: ChatInputCommandInteraction) {
    // ユーザーが入力したメッセージを取得
    const userMessage = interaction.options.getString('message');

    // メッセージの前に「【質問】」を追加
    const formattedMessage = `【質問】${userMessage}`;

    // ボットがメッセージを送信
    await interaction.reply({
      content: `あなたが入力したメッセージ: "${formattedMessage}"`,
      ephemeral: true, // 実行者のみに表示
    });

    // ボットが公開メッセージとして送信
    if (interaction.channel?.isTextBased() && 'send' in interaction.channel) {
      await interaction.channel.send(formattedMessage || 'メッセージがありません');
    }
  },
};