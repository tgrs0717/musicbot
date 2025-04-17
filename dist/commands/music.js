"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.musicCommands = void 0;
const discord_js_1 = require("discord.js");
const MusicPlayer_1 = require("../MusicPlayer");
const musicPlayers = new Map();
const getOrCreatePlayer = async (interaction) => {
    const member = await interaction.guild?.members.fetch(interaction.user.id);
    const voiceChannel = member?.voice.channel;
    if (!voiceChannel) {
        await interaction.reply({ content: 'ボイスチャンネルに参加してから実行してください！', ephemeral: true });
        return null;
    }
    let player = musicPlayers.get(interaction.guildId);
    if (!player) {
        player = new MusicPlayer_1.MusicPlayer();
        musicPlayers.set(interaction.guildId, player);
    }
    const joined = await player.join(voiceChannel);
    if (!joined) {
        await interaction.reply({ content: 'ボイスチャンネルへの参加に失敗しました。', ephemeral: true });
        return null;
    }
    return player;
};
exports.musicCommands = {
    data: [
        new discord_js_1.SlashCommandBuilder()
            .setName('play')
            .setDescription('指定した曲を即座に再生します')
            .addStringOption(option => option
            .setName('source')
            .setDescription('再生するファイル名またはURL（省略時は001.mp3）')
            .setRequired(false)),
        new discord_js_1.SlashCommandBuilder()
            .setName('queue')
            .setDescription('指定した曲をキューに追加します')
            .addStringOption(option => option
            .setName('source')
            .setDescription('再生するファイル名またはURL（省略時は001.mp3）')
            .setRequired(false)),
        new discord_js_1.SlashCommandBuilder()
            .setName('stop')
            .setDescription('再生を停止します'),
        new discord_js_1.SlashCommandBuilder()
            .setName('loop')
            .setDescription('ループ再生を切り替えます'),
        new discord_js_1.SlashCommandBuilder()
            .setName('disconnect')
            .setDescription('ボットをボイスチャンネルから切断します'),
    ],
    async execute(interaction) {
        if (!interaction.guildId) {
            await interaction.reply({ content: 'このコマンドはサーバー内でのみ使用できます。', ephemeral: true });
            return;
        }
        switch (interaction.commandName) {
            case 'play': {
                const player = await getOrCreatePlayer(interaction);
                if (!player)
                    return;
                const source = MusicPlayer_1.MusicPlayer.resolveSource(interaction.options.getString('source'));
                await player.playImmediate(source);
                await interaction.reply('再生を開始します！');
                break;
            }
            case 'queue': {
                const player = await getOrCreatePlayer(interaction);
                if (!player)
                    return;
                const source = MusicPlayer_1.MusicPlayer.resolveSource(interaction.options.getString('source'));
                player.addToQueue(source);
                await interaction.reply('キューに追加しました！');
                break;
            }
            case 'stop': {
                const player = musicPlayers.get(interaction.guildId);
                if (player) {
                    player.stop();
                    await interaction.reply('再生を停止しました。');
                }
                else {
                    await interaction.reply({ content: '再生中の曲はありません。', ephemeral: true });
                }
                break;
            }
            case 'loop': {
                const player = musicPlayers.get(interaction.guildId);
                if (player) {
                    const isLooping = player.toggleLoop();
                    await interaction.reply(isLooping ? 'ループ再生を有効にしました。' : 'ループ再生を無効にしました。');
                }
                else {
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
                }
                else {
                    await interaction.reply({ content: 'ボットはボイスチャンネルに参加していません。', ephemeral: true });
                }
                break;
            }
        }
    }
};
