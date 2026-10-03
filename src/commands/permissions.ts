import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";

import type { BotCommand } from "../types/command.js";
import { openPermissionsPanel } from "../permissions/permissions.ts";

export const permissionsCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("permissions")
    .setDescription("Manage Gamblias permissions."),

  async execute(
    interaction: ChatInputCommandInteraction,
  ) {
    await openPermissionsPanel(interaction);
  },
};
