"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const MusicPlayer_1 = require("../MusicPlayer");
const musicPlayers = new Map();
const getOrCreatePlayer = async (interaction) => {
    const member = await interaction.guild?.members.fetch(interaction.user.id);
    const voiceChannel = member?.voice.channel;
    if (!voiceChannel)
        return { error: 'no_voice_channel' };
    let player = musicPlayers.get(interaction.guildId);
    if (!player) {
        player = new MusicPlayer_1.MusicPlayer();
        musicPlayers.set(interaction.guildId, player);
    }
    const joined = await player.join(voiceChannel);
    if (!joined)
        return { error: 'join_failed' };
    return { player };
};
const handleError = async (interaction, message) => {
    try {
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: message, ephemeral: true });
        }
        else if (interaction.deferred) {
            await interaction.editReply({ content: message });
        }
    }
    catch (error) {
        console.error('エラーレスポンスの送信に失敗:', error);
    }
};
const commands = [
    {
        data: new discord_js_1.SlashCommandBuilder()
            .setName('play')
            .setDescription('指定した曲を即座に再生します')
            .addStringOption(option => option.setName('source')
            .setDescription('再生するファイル名またはURL（省略時は001.mp3）')
            .setRequired(false)),
        async execute(interaction) {
            const { player, error } = await getOrCreatePlayer(interaction);
            if (error || !player)
                return handleError(interaction, 'ボイスチャンネルに参加できませんでした。');
            const source = MusicPlayer_1.MusicPlayer.resolveSource(interaction.options.getString('source') || '001.mp3');
            player.playImmediate(source);
            await interaction.reply({ content: '再生を開始します', ephemeral: true });
        },
    },
    {
        data: new discord_js_1.SlashCommandBuilder()
            .setName('queue')
            .setDescription('指定した曲をキューに追加します')
            .addStringOption(option => option.setName('source')
            .setDescription('再生するファイル名またはURL（省略時は001.mp3）')
            .setRequired(false)),
        async execute(interaction) {
            const { player, error } = await getOrCreatePlayer(interaction);
            if (error || !player)
                return handleError(interaction, 'ボイスチャンネルに参加できませんでした。');
            const source = MusicPlayer_1.MusicPlayer.resolveSource(interaction.options.getString('source') || '001.mp3');
            player.addToQueue(source);
            await interaction.reply({ content: 'キューに追加しました', ephemeral: true });
        },
    },
    {
        data: new discord_js_1.SlashCommandBuilder()
            .setName('stop')
            .setDescription('再生を停止し、キューをクリアします'),
        async execute(interaction) {
            const player = musicPlayers.get(interaction.guildId);
            if (!player)
                return handleError(interaction, '再生中の音楽はありません。');
            player.stop();
            await interaction.reply({ content: '再生を停止し、キューをクリアしました', ephemeral: true });
        },
    },
    {
        data: new discord_js_1.SlashCommandBuilder()
            .setName('skip')
            .setDescription('現在の曲をスキップします'),
        async execute(interaction) {
            const player = musicPlayers.get(interaction.guildId);
            if (!player)
                return handleError(interaction, '再生中の音楽はありません。');
            player.playNext();
            await interaction.reply({ content: '曲をスキップしました', ephemeral: true });
        },
    },
    {
        data: new discord_js_1.SlashCommandBuilder()
            .setName('shuffle')
            .setDescription('キュー内の曲をシャッフルします'),
        async execute(interaction) {
            const player = musicPlayers.get(interaction.guildId);
            if (!player)
                return handleError(interaction, '再生中の音楽はありません。');
            player.shuffleQueue();
            await interaction.reply({ content: 'キューをシャッフルしました', ephemeral: true });
        },
    },
    {
        data: new discord_js_1.SlashCommandBuilder()
            .setName('disconnect')
            .setDescription('ボイスチャンネルから退出します'),
        async execute(interaction) {
            const player = musicPlayers.get(interaction.guildId);
            if (!player)
                return handleError(interaction, 'Botはボイスチャンネルに接続していません。');
            player.disconnect();
            musicPlayers.delete(interaction.guildId);
            await interaction.reply({ content: 'ボイスチャンネルから退出しました', ephemeral: true });
        },
    },
];
exports.default = commands;
