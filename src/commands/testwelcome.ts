import { SlashCommandBuilder } from "discord.js";
import type { BotCommand } from "../types/command.js";
import { sendWelcomeMessage } from "../welcome.js";

export const testWelcomeCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("testwelcome")
    .setDescription("Test the welcome message for yourself."),
  async execute(interaction) {
    const guildId = interaction.guildId;

    if (!guildId) {
      await interaction.reply({
        content: "This command can only be used in a server.",
        ephemeral: true,
      });
      return;
    }

    const guild = await interaction.client.guilds.fetch(guildId);
    const member = await guild.members.fetch(interaction.user.id);

    try {
      await sendWelcomeMessage(guild, member);
      await interaction.reply({
        content: "Test welcome message sent.",
        ephemeral: true,
      });
    } catch (error) {
      console.error(
        `Could not send test welcome for ${member.user.tag} in ${guild.name}:`,
        error,
      );
      await interaction.reply({
        content: "Could not send the test welcome message.",
        ephemeral: true,
      });
    }
  },
};