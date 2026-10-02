import {
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";

import type { BotCommand } from "../types/command.js";
import { sendTicketPanel } from "../tickets/ticket.ts";

export const setupTicketsCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("setup-tickets")
    .setDescription("Send the Ticket System panel.")
    .setDefaultMemberPermissions(
      PermissionFlagsBits.Administrator.toString(),
    ),

  async execute(interaction) {
    if (!interaction.guild) {
      await interaction.reply({
        content: "❌ الأمر ده لازم يتستخدم داخل السيرفر.",
        ephemeral: true,
      });
      return;
    }

    if (!interaction.channel?.isTextBased()) {
      await interaction.reply({
        content: "❌ مش قادر أرسل الـTicket System في القناة دي.",
        ephemeral: true,
      });
      return;
    }

    try {
      await sendTicketPanel(interaction.channel);

      await interaction.reply({
        content: "✅ تم إرسال Ticket System بنجاح.",
        ephemeral: true,
      });
    } catch (error) {
      console.error("Could not setup ticket system:", error);

      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: "❌ حصل خطأ أثناء إرسال Ticket System.",
          ephemeral: true,
        });
      }
    }
  },
};
