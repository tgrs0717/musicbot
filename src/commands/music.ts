import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { MusicPlayer } from '../MusicPlayer';

const musicPlayers = new Map<string, MusicPlayer>();

const getOrCreatePlayer = async (interaction: ChatInputCommandInteraction): Promise<MusicPlayer | null> => {
  const member = await interaction.guild?.members.fetch(interaction.user.id);
  const voiceChannel = member?.voice.channel;

  if (!voiceChannel) {
    await interaction.reply({ content: 'ボイスチャンネルに参加してから実行してください！', ephemeral: true });
    return null;
  }

  let player = musicPlayers.get(interaction.guildId!);
  if (!player) {
    player = new MusicPlayer();
    musicPlayers.set(interaction.guildId!, player);
  }

  const joined = await player.join(voiceChannel);
  if (!joined) {
    await interaction.reply({ content: 'ボイスチャンネルへの参加に失敗しました。', ephemeral: true });
    return null;
  }

  return player;
};

export const musicCommands = {
  data: [
    new SlashCommandBuilder()
      .setName('play')
      .setDescription('指定した曲を即座に再生します')
      .addStringOption(option =>
        option
          .setName('source')
          .setDescription('再生するファイル名またはURL（省略時は001.mp3）')
          .setRequired(false)
      ),
    new SlashCommandBuilder()
      .setName('queue')
      .setDescription('指定した曲をキューに追加します')
      .addStringOption(option =>
        option
          .setName('source')
          .setDescription('再生するファイル名またはURL（省略時は001.mp3）')
          .setRequired(false)
      ),
    new SlashCommandBuilder()
      .setName('stop')
      .setDescription('再生を停止します'),
    new SlashCommandBuilder()
      .setName('track_loop')
      .setDescription('ループ再生を切り替えます'),
    new SlashCommandBuilder()
      .setName('disconnect')
      .setDescription('ボットをボイスチャンネルから切断します'),
    new SlashCommandBuilder()
      .setName('skip')
      .setDescription('次の曲を再生します'),
    new SlashCommandBuilder()
      .setName('queue_loop')
      .setDescription('キューのループを切り替えます'),
    new SlashCommandBuilder()
      .setName('queuelist')
      .setDescription('キューのリストを表示します'),
    new SlashCommandBuilder()
      .setName('shuffle')
      .setDescription('キュー内の曲をランダムにシャッフルします'),
  ],

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guildId) {
      await interaction.reply({ content: 'このコマンドはサーバー内でのみ使用できます。', ephemeral: true });
      return;
    }

    switch (interaction.commandName) {
      case 'play': {
        const player = await getOrCreatePlayer(interaction);
        if (!player) return;

        const source = MusicPlayer.resolveSource(interaction.options.getString('source'));
        await player.playImmediate(source);
        await interaction.reply('再生を開始します！');
        break;
      }

      case 'queue': {
        const player = await getOrCreatePlayer(interaction);
        if (!player) return;

        const source = MusicPlayer.resolveSource(interaction.options.getString('source'));
        player.addToQueue(source);
        await interaction.reply('キューに追加しました！');
        break;
      }

      case 'skip': {
        const player = await getOrCreatePlayer(interaction);
        if (!player) return;

        player.playNext();
        await interaction.reply('次の曲を再生します！');
        break;
      }
      

      case 'stop': {
        const player = musicPlayers.get(interaction.guildId);
        if (player) {
          player.stop();
          await interaction.reply('再生を停止しました。');
        } else {
          await interaction.reply({ content: '再生中の曲はありません。', ephemeral: true });
        }
        break;
      }

      case 'track_loop': {
        const player = musicPlayers.get(interaction.guildId);
        if (player) {
          const isLooping = player.toggleTrackLoop();
          await interaction.reply(
            isLooping ? 'ループ再生を有効にしました。' : 'ループ再生を無効にしました。'
          );
        } else {
          await interaction.reply({ content: '再生中の曲はありません。', ephemeral: true });
        }
        break;
      }

      case 'queue_loop': {
        const player = musicPlayers.get(interaction.guildId);
        if (player) {
          const isLooping = player.toggleQueueLoop();
          await interaction.reply(
            isLooping ? 'ループ再生を有効にしました。' : 'ループ再生を無効にしました。'
          );
        } else {
          await interaction.reply({ content: '再生中の曲はありません。', ephemeral: true });
        }
        break;
      }

      case 'queuelist': {
        const player = musicPlayers.get(interaction.guildId);
        if (player) {
          const queue = player.getQueue(); // 現在のキューを取得
          if (queue.length === 0) {
            await interaction.reply('キューには曲がありません。');
          } else {
            const queueList = queue.map((track, index) => `${index + 1}. ${track}`).join('\n');
            await interaction.reply(`現在のキュー:\n${queueList}`);
          }
        } else {
          await interaction.reply({ content: '再生中の曲はありません。', ephemeral: true });
        }
        break;
      }

      case 'disconnect': {
        const player = musicPlayers.get(interaction.guildId);
        if (player) {
          player.disconnect();
          musicPlayers.delete(interaction.guildId);
          await interaction.reply('ボイスチャンネルから切断しました。');
        } else {
          await interaction.reply({ content: 'ボットはボイスチャンネルに参加していません。', ephemeral: true });
        }
        break;
      }

      case 'shuffle': {
        const player = musicPlayers.get(interaction.guildId);
        if (player) {
          player.shuffleQueue(); // キューをシャッフル
          await interaction.reply('キューをランダムにシャッフルしました！');
        } else {
          await interaction.reply({ content: '再生中の曲はありません。', ephemeral: true });
        }
        break;
        }
      }
    }
}