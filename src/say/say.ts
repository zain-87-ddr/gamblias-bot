import {
  PermissionFlagsBits,
  type Client,
  type Message,
} from "discord.js";

import { hasBotPermission } from "../permissions/permissions.ts";

const SAY_COMMAND = "ساي";

export function registerSaySystem(client: Client) {
  client.on("messageCreate", async (message: Message) => {
    try {
      if (message.author.bot) return;
      if (!message.guild) return;
      if (!message.channel.isTextBased()) return;

      const content = message.content.trim();

      if (!content.startsWith(SAY_COMMAND)) {
        return;
      }

      const nextCharacter = content.charAt(
        SAY_COMMAND.length,
      );

      if (
        nextCharacter &&
        !/\s/.test(nextCharacter)
      ) {
        return;
      }

      if (!message.member) {
        return;
      }

      if (
        !hasBotPermission(
          message.guild.id,
          message.member,
          "management.say",
        )
      ) {
        await message.reply({
          content:
            "❌ مش مسموح لك تستخدم Permission **Say**.",
        });

        return;
      }

      const text = content
        .slice(SAY_COMMAND.length)
        .trim();

      if (!text) {
        await message.reply({
          content:
            "❌ اكتب الرسالة اللي عايز البوت يقولها.\n\nمثال:\n`ساي أهلاً بيكم في السيرفر ❤️`",
        });

        return;
      }

      if (text.length > 2000) {
        await message.reply({
          content:
            "❌ الرسالة طويلة جدًا. الحد الأقصى 2000 حرف.",
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
          PermissionFlagsBits.ManageMessages,
        )
      ) {
        await message.reply({
          content:
            "❌ البوت محتاج صلاحية **Manage Messages** عشان يمسح أمر ساي.",
        });

        return;
      }

      await message.delete();

      await message.channel.send({
        content: text,
        allowedMentions: {
          parse: [],
        },
      });
    } catch (error) {
      console.error("[SaySystem] Error:", error);
    }
  });
}
