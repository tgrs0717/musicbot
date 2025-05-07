import { Client, Events, GatewayIntentBits, REST, Routes, GuildMemberRoleManager } from 'discord.js';
import * as dotenv from 'dotenv';
import { questionCommand } from './commands/question';
import { musicCommands } from './commands/music';
import { initializeTextBot } from './text';
import express from 'express';


const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (_req, res) => {
  res.send('Hello from Render with Express + TypeScript!');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Load environment variables
dotenv.config();

// Discordボットのトークン
const BOT_TOKEN = process.env.DISCORD_TOKEN;
if (!BOT_TOKEN) {
  throw new Error('BOT_TOKEN is not defined in the environment variables.');
}

// text.ts の初期化
initializeTextBot(BOT_TOKEN);

console.log('Bot is running...');

// Create a new client instance
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,  // 音声機能に必要
  ],
});

// When the client is ready, run this code (only once)
client.once(Events.ClientReady, async (readyClient) => {
  console.log(`Ready! Logged in as ${readyClient.user.tag}`);

  // Register slash commands
  const rest = new REST().setToken(process.env.DISCORD_TOKEN!);
  try {
    console.log('Started refreshing application (/) commands.');

    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID!),
      { body: [...musicCommands.data, questionCommand.data] }, // questionCommand を追加
    );

    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error(error);
  }
});

// Handle interactions
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  // 特定のロールIDを指定
  const allowedRoleId = '1366729241504383026'; // 使用を許可するロールのID

  // ユーザーが特定のロールを持っているか確認
  const member = interaction.member;
  if (member && 'roles' in member && member.roles instanceof GuildMemberRoleManager && !member.roles.cache.has(allowedRoleId)) {
    await interaction.reply({
      content: 'Sorry!このコマンドを使用する権限がありません。',
      ephemeral: true,
    });
    return;
  }

  try {
    // deferReply を先に呼ぶことで5秒制限を回避
    await interaction.deferReply({ ephemeral: true });

    await musicCommands.execute(interaction);

    // もし execute() 側で応答していないなら、ここで editReply してもよい
    // await interaction.editReply({ content: '処理が完了しました。' });
} catch (error) {
    console.error(error);
    if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: 'コマンドの実行中にエラーが発生しました。', ephemeral: true });
    } else {
        await interaction.reply({ content: 'コマンドの実行中にエラーが発生しました。', ephemeral: true });
    }
}

});

// Log in to Discord with your client's token
client.login(process.env.DISCORD_TOKEN);
