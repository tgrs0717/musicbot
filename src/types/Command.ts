import { SlashCommandBuilder, ChatInputCommandInteraction, Message, InteractionResponse } from 'discord.js';

export interface Command {
  data: SlashCommandBuilder;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void | Message<boolean> | InteractionResponse<boolean>>;
  guildOnly?: boolean;
}