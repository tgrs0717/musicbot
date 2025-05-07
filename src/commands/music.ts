import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  CacheType,
} from 'discord.js';
import { MusicPlayer } from '../MusicPlayer';
import * as fs from 'fs';
import * as path from 'path';

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

export default {
  data: [
    new SlashCommandBuilder()
      .setName('play')
      .setDescription('指定した曲を即座に再生します')
      .addStringOption(option =>
        option.setName('source')
          .setDescription('再生するファイル名またはURL（省略時は001.mp3）')
          .setRequired(false)
      ),
    new SlashCommandBuilder()
      .setName('queue')
      .setDescription('指定した曲をキューに追加します')
      .addStringOption(option =>
        option.setName('source')
          .setDescription('再生するファイル名またはURL（省略時は001.mp3）')
          .setRequired(false)
      ),
    new SlashCommandBuilder().setName('stop').setDescription('再生を停止します'),
    new SlashCommandBuilder().setName('track_loop').setDescription('ループ再生を切り替えます'),
    new SlashCommandBuilder().setName('disconnect').setDescription('ボットをボイスチャンネルから切断します'),
    new SlashCommandBuilder().setName('skip').setDescription('次の曲を再生します'),
    new SlashCommandBuilder().setName('queue_loop').setDescription('キューのループを切り替えます'),
    new SlashCommandBuilder().setName('queuelist').setDescription('キューのリストを表示します'),
    new SlashCommandBuilder().setName('shuffle').setDescription('キュー内の曲をランダムにシャッフルします'),
    new SlashCommandBuilder()
      .setName('play_default')
      .setDescription('デフォルトのプレイリストを再生します')
      .addStringOption(option =>
        option.setName('source')
          .setDescription('再生するファイル名またはURL（省略時は001.mp3）')
          .setRequired(false)
      )
  ],

  async execute(interaction: ChatInputCommandInteraction<CacheType>) {
    if (!interaction.guildId) {
      await interaction.reply({ content: 'このコマンドはサーバー内でのみ使用できます。', ephemeral: true });
      return;
    }

    const commandName = interaction.commandName;

    switch (commandName) {
      case 'play': {
        const { player, error } = await getOrCreatePlayer(interaction);
        if (error || !player) return handleError(interaction, 'ボイスチャンネルに参加できませんでした。');

        const source = MusicPlayer.resolveSource(interaction.options.getString('source') || '001.mp3');
        player.playImmediate(source);

        return interaction.replied || interaction.deferred
          ? interaction.editReply({ content: '再生を開始します' })
          : interaction.reply({ content: '再生を開始します', ephemeral: true });
      }

      case 'queue': {
        const { player, error } = await getOrCreatePlayer(interaction);
        if (error || !player) return handleError(interaction, 'ボイスチャンネルに参加できませんでした。');

        const source = MusicPlayer.resolveSource(interaction.options.getString('source') || '001.mp3');
        player.addToQueue(source);

        return interaction.replied || interaction.deferred
          ? interaction.editReply({ content: 'キューに追加しました' })
          : interaction.reply({ content: 'キューに追加しました', ephemeral: true });
      }

      case 'skip': {
        const { player, error } = await getOrCreatePlayer(interaction);
        if (error || !player) return handleError(interaction, 'ボイスチャンネルに参加できませんでした。');

        player.playNext();

        return interaction.replied || interaction.deferred
          ? interaction.editReply({ content: '曲をスキップしました' })
          : interaction.reply({ content: '曲をスキップしました', ephemeral: true });
      }

      case 'stop': {
        const player = musicPlayers.get(interaction.guildId);
        if (player) {
          player.stop();
          return interaction.replied || interaction.deferred
            ? interaction.editReply({ content: '再生を停止しました。' })
            : interaction.reply({ content: '再生を停止しました。', ephemeral: true });
        }
        return handleError(interaction, '再生中の曲はありません。');
      }

      case 'track_loop': {
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

      case 'queue_loop': {
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

      case 'queuelist': {
        const player = musicPlayers.get(interaction.guildId);
        if (player) {
          const queue = player.getQueue();
          const message = queue.length
            ? `現在のキュー:\n${queue.map((track, i) => `${i + 1}. ${track}`).join('\n')}`
            : 'キューには曲がありません。';

          return interaction.replied || interaction.deferred
            ? interaction.editReply({ content: message })
            : interaction.reply({ content: message, ephemeral: true });
        }
        return handleError(interaction, '再生中の曲はありません。');
      }

      case 'disconnect': {
        const player = musicPlayers.get(interaction.guildId);
        if (player) {
          player.disconnect();
          musicPlayers.delete(interaction.guildId);
          return interaction.replied || interaction.deferred
            ? interaction.editReply({ content: 'ボイスチャンネルから切断しました。' })
            : interaction.reply({ content: 'ボイスチャンネルから切断しました。', ephemeral: true });
        }
        return handleError(interaction, 'ボットはボイスチャンネルに参加していません。');
      }

      case 'shuffle': {
        const player = musicPlayers.get(interaction.guildId);
        if (player) {
          player.shuffleQueue();
          return interaction.replied || interaction.deferred
            ? interaction.editReply({ content: 'キューをランダムにシャッフルしました！' })
            : interaction.reply({ content: 'キューをランダムにシャッフルしました！', ephemeral: true });
        }
        return handleError(interaction, '再生中の曲はありません。');
      }

      case 'play_default': {
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
      }
    }
  }
};
