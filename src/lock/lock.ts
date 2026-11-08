
import {
  EmbedBuilder,
  PermissionFlagsBits,
  type Client,
  type TextChannel,
} from "discord.js";

import { hasBotPermission } from "../permissions/permissions.ts";
import { applyEmbedStyle } from "../embeds/store.ts";

export function registerLockSystem(client: Client) {
  client.on("messageCreate", async (message) => {
    try {
      if (message.author.bot) return;
      if (!message.guild) return;
      if (!message.channel.isTextBased()) return;

      const content = message.content.trim();

      if (content !== "قفل" && content !== "فتح") {
        return;
      }

      if (!message.member) {
        return;
      }

      const permission =
        content === "قفل"
          ? "channels.lock"
          : "channels.unlock";

      const permissionName =
        content === "قفل"
          ? "Lock"
          : "Unlock";

      if (
        !hasBotPermission(
          message.guild.id,
          message.member,
          permission,
        )
      ) {
        await message.reply({
          content:
            `❌ مش مسموح لك تستخدم Permission **${permissionName}**.`,
        });

        return;
      }

      const channel = message.channel;

      if (channel.type !== 0) {
        await message.reply({
          content:
            "❌ الأمر ده يشتغل في القنوات النصية فقط.",
        });

        return;
      }

      const botMember = message.guild.members.me;

      if (!botMember) {
        await message.reply({
          content:
            "❌ مش قادر أحدد البوت داخل السيرفر.",
        });

        return;
      }

      if (
        !botMember.permissions.has(
          PermissionFlagsBits.ManageChannels,
        )
      ) {
        await message.reply({
          content:
            "❌ البوت محتاج صلاحية **Manage Channels** عشان يقدر يقفل أو يفتح القناة.",
        });

        return;
      }

      const everyoneRole = message.guild.roles.everyone;

      if (content === "قفل") {
        await (channel as TextChannel).permissionOverwrites.edit(
          everyoneRole,
          {
            SendMessages: false,
          },
        );

        const embed = new EmbedBuilder()
          .setColor(0xed4245)
          .setTitle("🔒 تم قفل القناة")
          .setDescription(
            `📍 **القناة:** ${channel}\n` +
            `🛡️ **بواسطة:** ${message.member}`,
          )
          .setTimestamp()
          .setFooter({
            text: "Gamblias • Lock System",
          });

        const styledEmbed = applyEmbedStyle(
          message.guild.id,
          "lock",
          embed,
        );

        await message.reply({
          embeds: [styledEmbed],
        });

        return;
      }

      await (channel as TextChannel).permissionOverwrites.edit(
        everyoneRole,
        {
          SendMessages: null,
        },
      );

      const embed = new EmbedBuilder()
        .setColor(0x57f287)
        .setTitle("🔓 تم فتح القناة")
        .setDescription(
          `📍 **القناة:** ${channel}\n` +
          `🛡️ **بواسطة:** ${message.member}`,
        )
        .setTimestamp()
        .setFooter({
          text: "Gamblias • Lock System",
        });

      const styledEmbed = applyEmbedStyle(
        message.guild.id,
        "unlock",
        embed,
      );

      await message.reply({
        embeds: [styledEmbed],
      });
    } catch (error) {
      console.error("[LockSystem] Error:", error);

      if (!message.replied) {
        await message.reply({
          content:
            "❌ حصل خطأ أثناء قفل أو فتح القناة.",
        });
      }
    }
  });
}
