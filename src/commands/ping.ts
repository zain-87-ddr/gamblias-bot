import { SlashCommandBuilder } from "discord.js";
import type { BotCommand } from "../types/command.js";

export const pingCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Check whether the bot is responding."),
  async execute(interaction) {
    await interaction.reply(`Pong! Gateway latency: ${interaction.client.ws.ping}ms`);
  },
};