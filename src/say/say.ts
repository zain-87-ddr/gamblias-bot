import {
  PermissionFlagsBits,
  type Client,
  type Message,
} from "discord.js";

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

      if (
        !message.member?.permissions.has(
          PermissionFlagsBits.ManageMessages,
        )
      ) {
        await message.reply({
          content:
            "❌ لازم تكون إداري وعندك صلاحية **Manage Messages** عشان تستخدم الأمر ده.",
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

      if (
        !message.guild.members.me?.permissions.has(
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
