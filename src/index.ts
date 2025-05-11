import { Client, Collection, GatewayIntentBits, Interaction } from 'discord.js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import express from 'express';
import { registerPomodoroHandlers } from './text'; // <- 修正ポイント

// Expressサーバーの設定
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (_req, res) => {
  res.send('Hello from Render with Express + TypeScript!');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// 環境変数の読み込み
dotenv.config();
const BOT_TOKEN = process.env.DISCORD_TOKEN;
if (!BOT_TOKEN) throw new Error('BOT_TOKEN is not defined in environment variables.');

// 拡張クライアント定義
class ExtendedClient extends Client {
  commands: Collection<string, any>;
  constructor(options: any) {
    super(options);
    this.commands = new Collection();
  }
}

// クライアント作成（IntentにMessageContent追加）
const client = new ExtendedClient({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

// コマンド読み込み
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.ts') || file.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const commandModule = require(filePath);
  const command = commandModule.default || commandModule;

  if (Array.isArray(command.data)) {
    for (const builder of command.data) {
      client.commands.set(builder.name, { ...command, data: builder });
    }
  } else if ('data' in command && 'execute' in command) {
    client.commands.set(command.data.name, command);
  } else {
    console.warn(`⚠️ コマンドファイル "${file}" に data または execute が存在しません`);
  }
}

// コマンド処理
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
      await interaction.editReply({ content: '⚠️ コマンド実行中にエラーが発生しました。' });
    } else {
      await interaction.reply({ content: '⚠️ コマンド実行中にエラーが発生しました。', ephemeral: true });
    }
  }
});

// テキスト処理の登録（Clientを渡すだけ）
registerPomodoroHandlers(client);

// 起動ログ
client.once('ready', () => {
  console.log(`✅ Botとしてログインしました: ${client.user?.tag}`);
});

client.login(BOT_TOKEN);
