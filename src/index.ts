import { Client, Collection, Events, GatewayIntentBits, REST, Routes, Interaction } from 'discord.js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { initializeTextBot } from './text';
import express from 'express';

// Expressサーバーの設定
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

// Discordクライアントの拡張クラス
class ExtendedClient extends Client {
  commands: Collection<string, any>;

  constructor(options: any) {
    super(options);
    this.commands = new Collection();
  }
}

// Discordクライアントの作成
const client = new ExtendedClient({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
});

// コマンドファイルの読み込み
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs
  .readdirSync(commandsPath)
  .filter(file => file.endsWith('.ts') || file.endsWith('.js'));

  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const commandModule = require(filePath);
    const command = commandModule.default || commandModule;
  
    if (Array.isArray(command.data)) {
      for (const builder of command.data) {
        client.commands.set(builder.name, {
          ...command,
          data: builder,
        });
      }
    } else if ('data' in command && 'execute' in command) {
      client.commands.set(command.data.name, command);
    } else {
      console.warn(`⚠️ コマンドファイル "${file}" に data または execute が存在しません`);
    }
  }

// ボット起動時のログ
client.once('ready', () => {
  console.log(`✅ Botとしてログインしました: ${client.user?.tag}`);
});

// コマンド実行処理
client.on('interactionCreate', async (interaction: Interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) {
    console.error(`❌ 未登録のコマンド: ${interaction.commandName}`);
    return;
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(`❌ コマンド "${interaction.commandName}" 実行時にエラー発生:`, error);
    if (interaction.replied || interaction.deferred) {
      await interaction.editReply({
        content: '⚠️ コマンド実行中にエラーが発生しました。',
      });
    } else {
      await interaction.reply({
        content: '⚠️ コマンド実行中にエラーが発生しました。',
        ephemeral: true,
      });
    }
  }
});

// トークンでログイン
client.login(process.env.DISCORD_TOKEN);