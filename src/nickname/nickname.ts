import {
  EmbedBuilder,
  PermissionFlagsBits,
  type Client,
  type GuildMember,
  type Message,
} from "discord.js";

import { hasBotPermission } from "../permissions/permissions.ts";

const NICKNAME_COMMAND = "n";

function getTargetMember(message: Message): GuildMember | null {
  if (!message.guild) {
    return null;
  }

  // لو فيه منشن للعضو
  const mentionedMember = message.mentions.members?.first();

  if (mentionedMember) {
    return mentionedMember;
  }

  // لو الأمر Reply على رسالة العضو
  if (message.reference?.messageId) {
    const repliedUser = message.mentions.repliedUser;

    if (repliedUser) {
      return (
        message.guild.members.cache.get(repliedUser.id) ??
        null
      );
    }
  }

  return null;
}

function getNickname(
  message: Message,
  targetMember: GuildMember,
): string | null {
  let content = message.content.slice(1).trim();

  // إزالة منشن العضو
  content = content
    .replace(
      new RegExp(`<@!?${targetMember.id}>`, "g"),
      "",
    )
    .trim();

  if (!content) {
    return null;
  }

  return content;
}

export function registerNicknameSystem(client: Client) {
  client.on("messageCreate", async (message) => {
    try {
      if (message.author.bot) {
        return;
      }

      if (!message.guild || !message.member) {
        return;
      }

      const content = message.content.trim();

      // لازم الأمر يكون n في بداية الرسالة
      if (
        !content.toLowerCase().startsWith(NICKNAME_COMMAND)
      ) {
        return;
      }

      // منع كلمات تبدأ بـ n مثل name
      const nextCharacter = content.charAt(1);

      if (
        nextCharacter &&
        !/\s|<|@/.test(nextCharacter)
      ) {
        return;
      }

      // Gamblias Permission
      if (
        !hasBotPermission(
          message.guild.id,
          message.member,
          "members.nickname",
        )
      ) {
        await message.reply({
          content:
            "❌ مش مسموح لك تستخدم Permission **Nickname**.",
        });

        return;
      }

      const targetMember = getTargetMember(message);

      if (!targetMember) {
        await message.reply({
          content:
            "❌ لازم تعمل **منشن للعضو** أو تعمل **Reply** على رسالته.\n\n" +
            "مثال:\n" +
            "`n @العضو الاسم الجديد`\n\n" +
            "أو Reply:\n" +
            "`n الاسم الجديد`",
        });

        return;
      }

      const nickname = getNickname(
        message,
        targetMember,
      );

      if (!nickname) {
        await message.reply({
          content:
            "❌ اكتب النيم الجديد بعد منشن العضو.\n\n" +
            "مثال:\n" +
            "`n @العضو الاسم الجديد`",
        });

        return;
      }

      if (nickname.length > 32) {
        await message.reply({
          content:
            "❌ النيم مينفعش يكون أطول من **32 حرف**.",
        });

        return;
      }

      const botMember = message.guild.members.me;

      if (!botMember) {
        await message.reply({
          content:
            "❌ مش قادر أحدد صلاحيات البوت.",
        });

        return;
      }

      // صلاحية البوت نفسه
      if (
        !botMember.permissions.has(
          PermissionFlagsBits.ManageNicknames,
        )
      ) {
        await message.reply({
          content:
            "❌ البوت محتاج صلاحية **Manage Nicknames** عشان يقدر يغير النيم.",
        });

        return;
      }

      // مينفعش البوت يغير نيم نفسه أو عضو أعلى منه
      if (
        targetMember.id === botMember.id ||
        targetMember.roles.highest.position >=
          botMember.roles.highest.position
      ) {
        await message.reply({
          content:
            "❌ مينفعش البوت يغير نيم العضو ده لأن رتبته أعلى من أو مساوية لأعلى رتبة عند البوت.",
        });

        return;
      }

      const oldNickname =
        targetMember.nickname ?? targetMember.user.username;

      await targetMember.setNickname(
        nickname,
        `Changed by ${message.author.tag}`,
      );

      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle("✏️ تم تغيير النيم")
        .setDescription(
          `👤 **العضو:** ${targetMember}\n` +
          `📝 **النيم القديم:** ${oldNickname}\n` +
          `✨ **النيم الجديد:** ${nickname}\n` +
          `🛡️ **بواسطة:** ${message.member}`,
        )
        .setThumbnail(
          targetMember.displayAvatarURL({
            extension: "png",
            size: 256,
          }),
        )
        .setTimestamp()
        .setFooter({
          text: "Gamblias • Nickname System",
        });

      await message.reply({
        embeds: [embed],
      });
    } catch (error) {
      console.error("[NicknameSystem] Error:", error);

      if (!message.replied) {
        await message.reply({
          content:
            "❌ حصل خطأ أثناء تغيير النيم.",
        });
      }
    }
  });
}
