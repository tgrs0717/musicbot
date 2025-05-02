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
exports.MusicPlayer = void 0;
process.env.DEBUG = 'play-dl:*';
const voice_1 = require("@discordjs/voice");
const fs_1 = require("fs");
const path_1 = require("path");
const play = __importStar(require("play-dl"));
play.setToken({
    youtube: {
        cookie: 'YOUR_YOUTUBE_COOKIE', // 必要に応じてYouTubeのクッキーを設定
    },
});
class MusicPlayer {
    static DEFAULT_TRACK = (0, path_1.join)(__dirname, '../music/001.mp3');
    connection = null;
    audioPlayer;
    queue = [];
    queueBackup = []; // オリジナルのキューを保存
    isPlaying = false;
    isLooping = false;
    currentTrack = null;
    isTrackLooping = false; // 1曲のループ再生用
    isQueueLooping = false; // キュー全体のループ再生用
    static resolveSource(source) {
        if (!source) {
            return MusicPlayer.DEFAULT_TRACK;
        }
        return source.startsWith('http') ? source : (0, path_1.join)(__dirname, '../music', source);
    }
    constructor() {
        this.audioPlayer = (0, voice_1.createAudioPlayer)();
        this.audioPlayer.on(voice_1.AudioPlayerStatus.Idle, () => {
            this.isPlaying = false;
            if (this.isLooping && this.currentTrack) {
                this.playAgain();
            }
            else {
                this.playNext();
            }
        });
    }
    async join(channel) {
        try {
            this.connection = (0, voice_1.joinVoiceChannel)({
                channelId: channel.id,
                guildId: channel.guild.id,
                adapterCreator: channel.guild.voiceAdapterCreator,
            });
            this.connection.subscribe(this.audioPlayer);
            // キューのループ再生をオンにする
            this.isQueueLooping = true;
            return true;
        }
        catch (error) {
            console.error('Error joining voice channel:', error);
            return false;
        }
    }
    addToQueue(source) {
        this.queue.push(source);
        this.queueBackup.push(source); // バックアップにも追加
        if (!this.isPlaying) {
            this.playNext();
        }
    }
    async playImmediate(source) {
        this.stop();
        this.currentTrack = source;
        await this.playTrack(source);
    }
    async playTrack(source) {
        try {
            let resource;
            if ((0, fs_1.existsSync)(source)) {
                // ローカルファイルの場合
                const stream = (0, fs_1.createReadStream)(source);
                resource = (0, voice_1.createAudioResource)(stream);
            }
            else if (source.startsWith('http')) {
                // URLの場合
                if (source.includes('youtube.com') || source.includes('youtu.be')) {
                    try {
                        const stream = await play.stream(source);
                        resource = (0, voice_1.createAudioResource)(stream.stream, {
                            inputType: stream.type,
                        });
                    }
                    catch (error) {
                        console.error('YouTubeストリームの取得に失敗しました:', error);
                        throw new Error('YouTubeストリームの取得に失敗しました');
                    }
                }
                else {
                    // その他のURLの場合は直接リソースとして使用
                    resource = (0, voice_1.createAudioResource)(source);
                }
            }
            else {
                throw new Error('Invalid source: ' + source);
            }
            this.audioPlayer.play(resource);
            this.isPlaying = true;
        }
        catch (error) {
            console.error('Error playing audio:', error);
            if (this.isLooping) {
                this.playAgain();
            }
            else {
                this.playNext();
            }
        }
    }
    async playNext() {
        if (this.isTrackLooping && this.currentTrack) {
            // 1曲のループ再生
            await this.playTrack(this.currentTrack);
            return;
        }
        if (this.queue.length === 0) {
            if (this.isQueueLooping) {
                // キュー全体をループ再生する場合、シャッフルされた順序でリセット
                this.queue = [...this.queueBackup];
            }
            else {
                return;
            }
        }
        const source = this.queue.shift();
        if (!source)
            return;
        this.currentTrack = source;
        await this.playTrack(source);
    }
    async playAgain() {
        if (!this.currentTrack)
            return;
        await this.playTrack(this.currentTrack);
    }
    stop() {
        this.audioPlayer.stop(); // 再生を停止
        this.isPlaying = false; // 再生状態をリセット
        this.currentTrack = null; // 現在の曲をリセット
        this.queue = []; // キューをリセット
        this.queueBackup = []; // バックアップキューもリセット
    }
    toggleLoop() {
        this.isLooping = !this.isLooping;
        return this.isLooping;
    }
    toggleTrackLoop() {
        this.isTrackLooping = !this.isTrackLooping;
        return this.isTrackLooping;
    }
    toggleQueueLoop() {
        this.isQueueLooping = !this.isQueueLooping;
        return this.isQueueLooping;
    }
    isLoopEnabled() {
        return this.isLooping;
    }
    isTrackLoopEnabled() {
        return this.isTrackLooping;
    }
    isQueueLoopEnabled() {
        return this.isQueueLooping;
    }
    /**
     * 現在のキューを取得する
     * @returns 現在のキューの配列
     */
    getQueue() {
        return [...this.queue]; // キューのコピーを返す
    }
    /**
     * キューをランダムにシャッフルする
     */
    shuffleQueue() {
        for (let i = this.queue.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.queue[i], this.queue[j]] = [this.queue[j], this.queue[i]];
        }
        // シャッフルされた状態をバックアップキューにも反映
        this.queueBackup = [...this.queue];
    }
    disconnect() {
        this.stop();
        if (this.connection) {
            this.connection.destroy();
            this.connection = null;
        }
    }
}
exports.MusicPlayer = MusicPlayer;
