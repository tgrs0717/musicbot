import { Client, Collection, GatewayIntentBits, Interaction, REST, Routes } from 'discord.js';
import * as fs from 'fs';
import * as path from 'path';
import 'dotenv/config';
import express from 'express';
import * as dotenv from 'dotenv';
import { registerPomodoroHandlers } from './text';
import { Command } from './types/Command'; // ← 型の読み込み

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
app.get('/', (_req, res) => {
  res.send('Hello from Render with Express + TypeScript!');
});
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// 拡張クライアントクラス
class ExtendedClient extends Client {
  commands: Collection<string, Command>;

  constructor(options: any) {
    super(options);
    this.commands = new Collection();
  }
}

// Discord クライアントの作成
const client = new ExtendedClient({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// スラッシュコマンド登録関数
async function registerSlashCommands(clientId: string, guildId: string) {
  const globalCommands: any[] = [];
  const guildCommands: any[] = [];

  const commandsPath = path.join(__dirname, 'commands');
  const commandFiles = fs
    .readdirSync(commandsPath)
    .filter(file => file.endsWith('.ts') || file.endsWith('.js'));

  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const commandModule = require(filePath);
    const exports = commandModule.default || commandModule;
    const commandArray = Array.isArray(exports) ? exports : [exports];

    for (const command of commandArray) {
      if (command.data && 'name' in command.data) {
        client.commands.set(command.data.name, command);

        if (command.guildOnly) {
          guildCommands.push(command.data.toJSON());
        } else {
          globalCommands.push(command.data.toJSON());
        }
      } else {
        console.warn(`⚠️ コマンド "${file}" に name または data がありません`);
      }
    }
  }

  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN!);

  try {
    if (guildCommands.length > 0) {
      console.log('📡 ギルドコマンドを登録中...');
      await rest.put(
        Routes.applicationGuildCommands(clientId, guildId),
        { body: [] });
      await rest.put(
        Routes.applicationGuildCommands(clientId, guildId),
        { body: guildCommands }
      );
      console.log('✅ ギルドコマンドの登録完了');
    }

    if (globalCommands.length > 0) {
      console.log('🌐 グローバルコマンドを登録中...');
      await rest.put(
        Routes.applicationCommands(clientId),
        { body: [] }
      );
      await rest.put(
        Routes.applicationCommands(clientId),
        { body: globalCommands }
      );
      console.log('✅ グローバルコマンドの登録完了');
    }
  } catch (error) {
    console.error('❌ スラッシュコマンドの登録エラー:', error);
  }
  console.log('コマンド一覧:');
for (const [name, command] of client.commands.entries()) {
  console.log(`- ${name}:`, typeof command.data?.toJSON === 'function' ? 'OK' : 'NG');
}
}

// イベント: Botログイン後
client.once('ready', () => {
  console.log(`✅ Botとしてログインしました: ${client.user?.tag}`);
});

// イベント: コマンド実行
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

// テキストメッセージハンドラー登録
registerPomodoroHandlers(client);

// Botログイン後にコマンドを登録
client.login(process.env.DISCORD_TOKEN).then(() => {
  registerSlashCommands(process.env.CLIENT_ID!, process.env.GUILD_ID!);
});
