import {
  PermissionFlagsBits,
  RoleSelectMenuBuilder,
  ActionRowBuilder,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";

import type { BotCommand } from "../types/command.js";

export const setupAutoRoleCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("setup-autorole")
    .setDescription("Set the automatic role for new members.")
    .setDefaultMemberPermissions(
      PermissionFlagsBits.Administrator.toString(),
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) {
      await interaction.reply({
        content: "❌ الأمر ده لازم يتستخدم داخل السيرفر.",
        ephemeral: true,
      });
      return;
    }

    if (
      !interaction.memberPermissions?.has(
        PermissionFlagsBits.Administrator,
      )
    ) {
      await interaction.reply({
        content: "❌ لازم تكون Administrator لاستخدام الأمر ده.",
        ephemeral: true,
      });
      return;
    }

    const menu = new RoleSelectMenuBuilder()
      .setCustomId("autorole_select")
      .setPlaceholder("🎭 اختار الرول اللي هتكون Auto Role");

    const row = new ActionRowBuilder<RoleSelectMenuBuilder>().addComponents(
      menu,
    );

    await interaction.reply({
      content:
        "⚙️ **إعداد Auto Role**\n\nاختار الرول اللي عايز البوت يديها تلقائيًا لأي عضو جديد يدخل السيرفر.",
      components: [row],
      ephemeral: true,
    });
  },
};
