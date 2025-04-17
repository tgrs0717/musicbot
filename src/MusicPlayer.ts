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
import { createReadStream, existsSync } from 'fs';
import { join } from 'path';
import * as play from 'ytdl-core';

export class MusicPlayer {
  private static readonly DEFAULT_TRACK = join(__dirname, '../music/001.mp3');

  private connection: VoiceConnection | null = null;
  private audioPlayer: AudioPlayer;
  private queue: string[] = [];
  private isPlaying = false;
  private isLooping = true;
  private currentTrack: string | null = null;

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
      return true;
    } catch (error) {
      console.error('Error joining voice channel:', error);
      return false;
    }
  }

  public addToQueue(source: string) {
    this.queue.push(source);
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
          // YouTube URLの場合
          const stream = await play.stream(source);
          resource = createAudioResource(stream.stream, {
            inputType: stream.type
          });
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
    if (this.queue.length === 0) return;

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
    this.queue = [];
    this.audioPlayer.stop();
    this.isPlaying = false;
    this.currentTrack = null;
  }

  public toggleLoop(): boolean {
    this.isLooping = !this.isLooping;
    return this.isLooping;
  }

  public isLoopEnabled(): boolean {
    return this.isLooping;
  }

  public disconnect() {
    this.stop();
    if (this.connection) {
      this.connection.destroy();
      this.connection = null;
    }
  }
}
