import { Client, Events, GatewayIntentBits, REST, Routes } from 'discord.js';
import * as dotenv from 'dotenv';
import { musicCommands } from './commands/music';
import { initializeTextBot } from './text';

// Load environment variables
dotenv.config();

// Discordボットのトークン
const BOT_TOKEN = 'MTM2MjMyMDA0MzM0NTU4MDA0Mg.Gow-4Q.H6zVG1FAm8PAZxykK6AUZLyqXDXV4ErDlrq4Ns';

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
      { body: musicCommands.data },
    );

    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error(error);
  }
});

// Handle interactions
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  
  try {
    await musicCommands.execute(interaction);
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
