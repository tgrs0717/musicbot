import { SlashCommandBuilder } from '@discordjs/builders';
import {
  ChatInputCommandInteraction,
  CacheType,
} from 'discord.js';
import * as fs from 'fs';
import * as path from 'path';
import { MusicPlayer } from '../MusicPlayer';
import { Command } from '../types/Command';

const musicPlayers: Map<string, MusicPlayer> = new Map();

const getOrCreatePlayer = async (interaction: ChatInputCommandInteraction<CacheType>) => {
  const member = await interaction.guild?.members.fetch(interaction.user.id);
  const voiceChannel = member?.voice.channel;
  if (!voiceChannel) return { error: 'no_voice_channel' };

  let player = musicPlayers.get(interaction.guildId!);
  if (!player) {
    player = new MusicPlayer();
    musicPlayers.set(interaction.guildId!, player);
  }
  const joined = await player.join(voiceChannel);
  if (!joined) return { error: 'join_failed' };
  return { player };
};

const handleError = async (interaction: ChatInputCommandInteraction<CacheType>, message: string) => {
  try {
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: message, ephemeral: true });
    } else if (interaction.deferred) {
      await interaction.editReply({ content: message });
    }
  } catch (error) {
    console.error('エラーレスポンスの送信に失敗:', error);
  }
};

function shuffleArray<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

const commands: Command[] = [
  {
    data: new SlashCommandBuilder()
      .setName('play')
      .setDescription('指定した曲を即座に再生します')
      .addStringOption(option =>
        option.setName('source')
          .setDescription('再生するファイル名またはURL（省略時は001.mp3）')
          .setRequired(false),
          ) as SlashCommandBuilder,
    guildOnly: true,
    async execute(interaction) {
      const { player, error } = await getOrCreatePlayer(interaction);
      if (error || !player) return handleError(interaction, 'ボイスチャンネルに参加できませんでした。');
      const source = MusicPlayer.resolveSource(interaction.options.getString('source') || '001.mp3');
      player.playImmediate(source);
      await interaction.reply({ content: '再生を開始します', ephemeral: true });
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName('play_default')
      .setDescription('デフォルトのプレイリストを再生します')
      .addStringOption(option =>
        option.setName('source')
          .setDescription('再生するファイル名またはURL（省略時は001.mp3）')
          .setRequired(false),
          ) as SlashCommandBuilder,
    guildOnly: true,
    async execute(interaction) {
      const { player, error } = await getOrCreatePlayer(interaction);
      if (error || !player) return handleError(interaction, 'ボイスチャンネルに参加できませんでした。');
      const source = MusicPlayer.resolveSource(interaction.options.getString('source') || '001.mp3');
      player.playImmediate(source);

        const musicFolderPath = path.join(__dirname, '../../music');
        const files = fs.readdirSync(musicFolderPath).filter(file => file.endsWith('.mp3'));
        for (const file of files) {
          const filePath = path.join(musicFolderPath, file);
          player.addToQueue(filePath);
        }

        const message = `再生を開始しました。musicフォルダ内の${files.length}曲をキューに追加しました。`;
        return interaction.replied || interaction.deferred
          ? interaction.editReply({ content: message })
          : interaction.reply({ content: message, ephemeral: true });
  },
},
{
  data: new SlashCommandBuilder()
  .setName('queue_loop')
  .setDescription('キューのループを切り替えます') as SlashCommandBuilder,
  guildOnly: true,
  async execute(interaction)  {
  if (!interaction.guildId) {
    return handleError(interaction, 'このコマンドはサーバー内でのみ使用できます。');
  }
    const player = musicPlayers.get(interaction.guildId);
        if (player) {
          const isLooping = player.toggleQueueLoop();
          const message = isLooping ? 'キューのループ再生を有効にしました。' : 'キューのループ再生を無効にしました。';
          return interaction.replied || interaction.deferred
            ? interaction.editReply({ content: message })
            : interaction.reply({ content: message, ephemeral: true });
        }
        return handleError(interaction, '再生中の曲はありません。');
      }
},
{ 
  data: new SlashCommandBuilder()
  .setName('track_loop')
  .setDescription('ループ再生を切り替えます') as SlashCommandBuilder,
  guildOnly: true,
  async execute(interaction) {
    if (!interaction.guildId) {
      return handleError(interaction, 'このコマンドはサーバー内でのみ使用できます。');
    }
    const player = musicPlayers.get(interaction.guildId);
        if (player) {
          const isLooping = player.toggleTrackLoop();
          const message = isLooping ? 'ループ再生を有効にしました。' : 'ループ再生を無効にしました。';
          return interaction.replied || interaction.deferred
            ? interaction.editReply({ content: message })
            : interaction.reply({ content: message, ephemeral: true });
        }
        return handleError(interaction, '再生中の曲はありません。');
      }
},

{
  data: new SlashCommandBuilder()
  .setName('queuelist')
  .setDescription('キューのリストを表示します'
    ) as SlashCommandBuilder,
  guildOnly: true,
  async execute(interaction) {
  if (!interaction.guildId) {
    return handleError(interaction, 'このコマンドはサーバー内でのみ使用できます。');
  }

  const player = musicPlayers.get(interaction.guildId);
  if (player) {
    const queue = player.getQueue();
    const message = queue.length
      ? `現在のキュー:\n${queue.map((track, i) => `${i + 1}. ${track}`).join('\n')}`
      : 'キューには曲がありません。';

    if (interaction.replied || interaction.deferred) {
      await interaction.editReply({ content: message });
    } else {
      await interaction.reply({ content: message, ephemeral: true });
    }
    return;
  }

  return handleError(interaction, '再生中の曲はありません。');
}
},
  
  {
    data: new SlashCommandBuilder()
      .setName('queue')
      .setDescription('指定した曲をキューに追加します')
      .addStringOption(option =>
        option.setName('source')
          .setDescription('再生するファイル名またはURL（省略時は001.mp3）')
          .setRequired(false),
          ) as SlashCommandBuilder,
    guildOnly: true,
    async execute(interaction) {
      const { player, error } = await getOrCreatePlayer(interaction);
      if (error || !player) return handleError(interaction, 'ボイスチャンネルに参加できませんでした。');
      const source = MusicPlayer.resolveSource(interaction.options.getString('source') || '001.mp3');
      player.addToQueue(source);
      await interaction.reply({ content: 'キューに追加しました', ephemeral: true });
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName('stop')
      .setDescription('再生を停止し、キューをクリアします'),
    guildOnly: true,
    async execute(interaction) {
      const player = musicPlayers.get(interaction.guildId!);
      if (!player) return handleError(interaction, '再生中の音楽はありません。');
      player.stop();
      await interaction.reply({ content: '再生を停止し、キューをクリアしました', ephemeral: true });
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName('skip')
      .setDescription('現在の曲をスキップします'),
    guildOnly: true,
    async execute(interaction) {
      const player = musicPlayers.get(interaction.guildId!);
      if (!player) return handleError(interaction, '再生中の音楽はありません。');
      player.playNext();
      await interaction.reply({ content: '曲をスキップしました', ephemeral: true });
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName('shuffle')
      .setDescription('キュー内の曲をシャッフルします'),
      guildOnly: true,
    async execute(interaction) {
      const player = musicPlayers.get(interaction.guildId!);
      if (!player) return handleError(interaction, '再生中の音楽はありません。');
      player.shuffleQueue();
      await interaction.reply({ content: 'キューをシャッフルしました', ephemeral: true });
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName('disconnect')
      .setDescription('ボイスチャンネルから退出します'),
    guildOnly: true,
    async execute(interaction) {
      const player = musicPlayers.get(interaction.guildId!);
      if (!player) return handleError(interaction, 'Botはボイスチャンネルに接続していません。');
      player.disconnect();
      musicPlayers.delete(interaction.guildId!);
      await interaction.reply({ content: 'ボイスチャンネルから退出しました', ephemeral: true });
    },
  },
];

export default commands;
