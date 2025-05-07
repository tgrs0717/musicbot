"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const MusicPlayer_1 = require("../MusicPlayer");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
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
exports.default = {
    data: [
        new discord_js_1.SlashCommandBuilder()
            .setName('play')
            .setDescription('指定した曲を即座に再生します')
            .addStringOption(option => option.setName('source')
            .setDescription('再生するファイル名またはURL（省略時は001.mp3）')
            .setRequired(false)),
        new discord_js_1.SlashCommandBuilder()
            .setName('queue')
            .setDescription('指定した曲をキューに追加します')
            .addStringOption(option => option.setName('source')
            .setDescription('再生するファイル名またはURL（省略時は001.mp3）')
            .setRequired(false)),
        new discord_js_1.SlashCommandBuilder().setName('stop').setDescription('再生を停止します'),
        new discord_js_1.SlashCommandBuilder().setName('track_loop').setDescription('ループ再生を切り替えます'),
        new discord_js_1.SlashCommandBuilder().setName('disconnect').setDescription('ボットをボイスチャンネルから切断します'),
        new discord_js_1.SlashCommandBuilder().setName('skip').setDescription('次の曲を再生します'),
        new discord_js_1.SlashCommandBuilder().setName('queue_loop').setDescription('キューのループを切り替えます'),
        new discord_js_1.SlashCommandBuilder().setName('queuelist').setDescription('キューのリストを表示します'),
        new discord_js_1.SlashCommandBuilder().setName('shuffle').setDescription('キュー内の曲をランダムにシャッフルします'),
        new discord_js_1.SlashCommandBuilder()
            .setName('play_default')
            .setDescription('デフォルトのプレイリストを再生します')
            .addStringOption(option => option.setName('source')
            .setDescription('再生するファイル名またはURL（省略時は001.mp3）')
            .setRequired(false))
    ],
    async execute(interaction) {
        if (!interaction.guildId) {
            await interaction.reply({ content: 'このコマンドはサーバー内でのみ使用できます。', ephemeral: true });
            return;
        }
        const commandName = interaction.commandName;
        switch (commandName) {
            case 'play': {
                const { player, error } = await getOrCreatePlayer(interaction);
                if (error || !player)
                    return handleError(interaction, 'ボイスチャンネルに参加できませんでした。');
                const source = MusicPlayer_1.MusicPlayer.resolveSource(interaction.options.getString('source') || '001.mp3');
                player.playImmediate(source);
                return interaction.replied || interaction.deferred
                    ? interaction.editReply({ content: '再生を開始します' })
                    : interaction.reply({ content: '再生を開始します', ephemeral: true });
            }
            case 'queue': {
                const { player, error } = await getOrCreatePlayer(interaction);
                if (error || !player)
                    return handleError(interaction, 'ボイスチャンネルに参加できませんでした。');
                const source = MusicPlayer_1.MusicPlayer.resolveSource(interaction.options.getString('source') || '001.mp3');
                player.addToQueue(source);
                return interaction.replied || interaction.deferred
                    ? interaction.editReply({ content: 'キューに追加しました' })
                    : interaction.reply({ content: 'キューに追加しました', ephemeral: true });
            }
            case 'skip': {
                const { player, error } = await getOrCreatePlayer(interaction);
                if (error || !player)
                    return handleError(interaction, 'ボイスチャンネルに参加できませんでした。');
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
                if (error || !player)
                    return handleError(interaction, 'ボイスチャンネルに参加できませんでした。');
                const source = MusicPlayer_1.MusicPlayer.resolveSource(interaction.options.getString('source') || '001.mp3');
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
