import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { MusicPlayer } from '../MusicPlayer';
import * as fs from 'fs';
import * as path from 'path';

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
    new SlashCommandBuilder()
      .setName('play2')
      .setDescription('指定した曲を再生し、musicフォルダ内の.mp3をキューに追加します')
      .addStringOption(option =>
        option
          .setName('source')
          .setDescription('再生するファイル名またはURL（省略時は001.mp3）')
          .setRequired(false)
      ),
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
        await interaction.reply({content:'再生を開始します',ephemeral:true,});
        break;
      }

      case 'queue': {
        const player = await getOrCreatePlayer(interaction);
        if (!player) return;

        const source = MusicPlayer.resolveSource(interaction.options.getString('source'));
        player.addToQueue(source);
        await interaction.reply({content:'キューに追加しました',ephemeral:true,});
        break;
      }

      case 'skip': {
        const player = await getOrCreatePlayer(interaction);
        if (!player) return;

        player.playNext();
        await interaction.reply({content:'曲をスキップしました',ephemeral: true,}
        );
        break;
      }
      

      case 'stop': {
        const player = musicPlayers.get(interaction.guildId);
        if (player) {
          player.stop();
          await interaction.reply({content:'再生を停止しました。',ephemeral:true,});
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
            await interaction.reply({content:'キューには曲がありません。',ephemeral:true,});
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
          await interaction.reply({content: 'ボイスチャンネルから切断しました。', ephemeral: true,}

          );
        } else {
          await interaction.reply({ content: 'ボットはボイスチャンネルに参加していません。', ephemeral: true });
        }
        break;
      }

      case 'shuffle': {
        const player = musicPlayers.get(interaction.guildId);
        if (player) {
          player.shuffleQueue(); // キューをシャッフル
          await interaction.reply({content:'キューをランダムにシャッフルしました！',ephemeral:true,});
        } else {
          await interaction.reply({ content: '再生中の曲はありません。', ephemeral: true });
        }
        break;
        }

      case 'play2': {
        const player = await getOrCreatePlayer(interaction);
        if (!player) return;

        // 再生する曲を取得
        const source = MusicPlayer.resolveSource(interaction.options.getString('source'));
        await player.playImmediate(source);

        // musicフォルダ内の.mp3ファイルを取得してキューに追加
        const musicFolderPath = path.join(__dirname, '../../music');
        const files = fs.readdirSync(musicFolderPath).filter(file => file.endsWith('.mp3'));

        for (const file of files) {
          const filePath = path.join(musicFolderPath, file);
          player.addToQueue(filePath);
        }

        await interaction.reply({
          content: `再生を開始しました。musicフォルダ内の${files.length}曲をキューに追加しました。`,
          ephemeral: true,
        });
        break;
      }
    }
  },
};