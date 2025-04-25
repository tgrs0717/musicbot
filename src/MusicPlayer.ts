process.env.DEBUG = 'play-dl:*';

import {
  AudioPlayer,
  AudioPlayerStatus,
  AudioResource,
  createAudioPlayer,
  createAudioResource,
  joinVoiceChannel,
  VoiceConnection
} from '@discordjs/voice';
import { VoiceBasedChannel } from 'discord.js';
import { createReadStream, existsSync, readdirSync } from 'fs';
import { join } from 'path';
import * as play from 'play-dl';

play.setToken({
  youtube: {
    cookie: 'YOUR_YOUTUBE_COOKIE', // 必要に応じてYouTubeのクッキーを設定
  },
});

export class MusicPlayer {
  private static readonly DEFAULT_TRACK = join(__dirname, '../music/001.mp3');

  private connection: VoiceConnection | null = null;
  private audioPlayer: AudioPlayer;
  private queue: string[] = [];
  private queueBackup: string[] = []; // オリジナルのキューを保存
  private isPlaying = false;
  private isLooping = false;

  private currentTrack: string | null = null;

  private isTrackLooping = false; // 1曲のループ再生用
  private isQueueLooping = false; // キュー全体のループ再生用

  public static resolveSource(source: string | null): string {
    if (!source) {
      return MusicPlayer.DEFAULT_TRACK;
    }
    return source.startsWith('http') ? source : join(__dirname, '../music', source);
  }

  constructor() {
    this.audioPlayer = createAudioPlayer();
    
    this.audioPlayer.on(AudioPlayerStatus.Idle, () => {
      this.isPlaying = false;
      if (this.isLooping && this.currentTrack) {
        this.playAgain();
      } else {
        this.playNext();
      }
    });
  }

  public async join(channel: VoiceBasedChannel): Promise<boolean> {
    try {
      this.connection = joinVoiceChannel({
        channelId: channel.id,
        guildId: channel.guild.id,
        adapterCreator: channel.guild.voiceAdapterCreator,
      });
  
      this.connection.subscribe(this.audioPlayer);
  
      // ../music ディレクトリ内のすべての .mp3 ファイルを取得し、001.mp3 を除外
      const musicDir = join(__dirname, '../music');
      const files = readdirSync(musicDir)
        .filter(file => file.endsWith('.mp3') && file !== '001.mp3'); // 001.mp3 を除外
      files.forEach(file => this.addToQueue(join(musicDir, file)));
  
      // キューのループ再生をオンにする
      this.isQueueLooping = true;
  
      return true;
    } catch (error) {
      console.error('Error joining voice channel:', error);
      return false;
    }
  }

  public addToQueue(source: string) {
    this.queue.push(source);
    this.queueBackup.push(source); // バックアップにも追加
    if (!this.isPlaying) {
      this.playNext();
    }
  }

  public async playImmediate(source: string) {
    this.stop();
    this.currentTrack = source;
    await this.playTrack(source);
  }

  private async playTrack(source: string) {
    try {
      let resource: AudioResource;

      if (existsSync(source)) {
        // ローカルファイルの場合
        const stream = createReadStream(source);
        resource = createAudioResource(stream);
      } else if (source.startsWith('http')) {
        // URLの場合
        if (source.includes('youtube.com') || source.includes('youtu.be')) {
          try {
            const stream = await play.stream(source);
            resource = createAudioResource(stream.stream, {
              inputType: stream.type,
            });
          } catch (error) {
            console.error('YouTubeストリームの取得に失敗しました:', error);
            throw new Error('YouTubeストリームの取得に失敗しました');
          }
        } else {
          // その他のURLの場合は直接リソースとして使用
          resource = createAudioResource(source);
        }
      } else {
        throw new Error('Invalid source: ' + source);
      }
      
      this.audioPlayer.play(resource);
      this.isPlaying = true;
    } catch (error) {
      console.error('Error playing audio:', error);
      if (this.isLooping) {
        this.playAgain();
      } else {
        this.playNext();
      }
    }
  }

  public async playNext() {
    if (this.isTrackLooping && this.currentTrack) {
      // 1曲のループ再生
      await this.playTrack(this.currentTrack);
      return;
    }

    if (this.queue.length === 0) {
      if (this.isQueueLooping) {
        // キュー全体をループ再生する場合、シャッフルされた順序でリセット
        this.queue = [...this.queueBackup];
      } else {
        return;
      }
    }

    const source = this.queue.shift();
    if (!source) return;

    this.currentTrack = source;
    await this.playTrack(source);
  }

  private async playAgain() {
    if (!this.currentTrack) return;
    await this.playTrack(this.currentTrack);
  }

  public stop() {
    this.audioPlayer.stop(); // 再生を停止
    this.isPlaying = false; // 再生状態をリセット
    this.currentTrack = null; // 現在の曲をリセット
    this.queue = []; // キューをリセット
    this.queueBackup = []; // バックアップキューもリセット
  }

  public toggleLoop(): boolean {
    this.isLooping = !this.isLooping;
    return this.isLooping;
  }

  public toggleTrackLoop(): boolean {
    this.isTrackLooping = !this.isTrackLooping;
    return this.isTrackLooping;
  }

  public toggleQueueLoop(): boolean {
    this.isQueueLooping = !this.isQueueLooping;
    return this.isQueueLooping;
  }

  public isLoopEnabled(): boolean {
    return this.isLooping;
  }

  public isTrackLoopEnabled(): boolean {
    return this.isTrackLooping;
  }

  public isQueueLoopEnabled(): boolean {
    return this.isQueueLooping;
  }

  /**
   * 現在のキューを取得する
   * @returns 現在のキューの配列
   */
  public getQueue(): string[] {
    return [...this.queue]; // キューのコピーを返す
  }

  /**
   * キューをランダムにシャッフルする
   */
  public shuffleQueue(): void {
    for (let i = this.queue.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.queue[i], this.queue[j]] = [this.queue[j], this.queue[i]];
    }

    // シャッフルされた状態をバックアップキューにも反映
    this.queueBackup = [...this.queue];
  }

  public disconnect() {
    this.stop();
    if (this.connection) {
      this.connection.destroy();
      this.connection = null;
    }
  }
}
