import {
  PermissionFlagsBits,
  RoleSelectMenuBuilder,
  ActionRowBuilder,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";

import type { BotCommand } from "../types/command.js";
import { hasBotPermission } from "../permissions/permissions.ts";

export const setupAutoRoleCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("autorole")
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

    if (!interaction.member) {
      await interaction.reply({
        content: "❌ مش قادر أحدد العضو.",
        ephemeral: true,
      });

      return;
    }

    const member = interaction.member;

    if (
      !hasBotPermission(
        interaction.guild.id,
        member,
        "roles.autorole",
      )
    ) {
      await interaction.reply({
        content:
          "❌ مش مسموح لك تستخدم Permission **Auto Role**.",
        ephemeral: true,
      });

      return;
    }

    const menu = new RoleSelectMenuBuilder()
      .setCustomId("autorole_select")
      .setPlaceholder("🎭 اختار الرول اللي هتكون Auto Role");

    const row =
      new ActionRowBuilder<RoleSelectMenuBuilder>().addComponents(
        menu,
      );

    await interaction.reply({
      content:
        "⚙️ **إعداد Auto Role**\n\n" +
        "اختار الرول اللي عايز البوت يديها تلقائيًا لأي عضو جديد يدخل السيرفر.",
      components: [row],
      ephemeral: true,
    });
  },
};
