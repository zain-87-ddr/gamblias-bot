import type {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
} from "discord.js";

export type BotCommand = {
  data: SlashCommandBuilder;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
};