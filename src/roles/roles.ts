import {
  EmbedBuilder,
  PermissionFlagsBits,
  type Client,
  type GuildMember,
  type Message,
  type Role,
} from "discord.js";

const ROLE_COMMAND = ".رول";

function findRole(message: Message, roleInput: string): Role | null {
  if (!message.guild) {
    return null;
  }

  const input = roleInput.trim();

  // لو ID
  const roleById = message.guild.roles.cache.get(input);

  if (roleById) {
    return roleById;
  }

  // لو Mention للرول
  const roleMentionMatch = input.match(/^<@&(\d+)>$/);

  if (roleMentionMatch) {
    const roleByMention = message.guild.roles.cache.get(
      roleMentionMatch[1],
    );

    if (roleByMention) {
      return roleByMention;
    }
  }

  // لو اسم الرول
  const roleByName = message.guild.roles.cache.find(
    (role) => role.name.toLowerCase() === input.toLowerCase(),
  );

  return roleByName ?? null;
}

function getTargetMember(message: Message): GuildMember | null {
  if (!message.guild) {
    return null;
  }

  // أولًا: لو الأمر فيه منشن لعضو
  const mentionedMember = message.mentions.members?.first();

  if (mentionedMember) {
    return mentionedMember;
  }

  // ثانيًا: لو الأمر Reply
  if (message.reference?.messageId) {
    const repliedMember = message.mentions.repliedUser
      ? message.guild.members.cache.get(
          message.mentions.repliedUser.id,
        )
      : null;

    if (repliedMember) {
      return repliedMember;
    }
  }

  return null;
}

function getRoleInput(
  message: Message,
  targetMember: GuildMember,
): string | null {
  let content = message.content
    .replace(ROLE_COMMAND, "")
    .trim();

  // لو فيه منشن للعضو، نشيله من النص
  if (targetMember) {
    content = content
      .replace(new RegExp(`<@!?${targetMember.id}>`, "g"), "")
      .trim();
  }

  // لو مفيش كلام بعد إزالة المنشن
  if (!content) {
    return null;
  }

  return content;
}

export function registerRoleSystem(client: Client) {
  client.on("messageCreate", async (message) => {
    try {
      if (message.author.bot) {
        return;
      }

      if (!message.guild) {
        return;
      }

      if (!message.content.toLowerCase().startsWith(ROLE_COMMAND)) {
        return;
      }

      if (
        !message.member?.permissions.has(
          PermissionFlagsBits.Administrator,
        )
      ) {
        await message.reply({
          content: "❌ لازم تكون Administrator عشان تستخدم الأمر ده.",
        });

        return;
      }

      const targetMember = getTargetMember(message);

      if (!targetMember) {
        await message.reply({
          content:
            "❌ لازم تعمل **منشن للعضو** أو تستخدم الأمر **Reply** على رسالة العضو.\n\n" +
            "مثال:\n" +
            "`.رول @العضو admin`\n\n" +
            "أو اعمل Reply على رسالة العضو واكتب:\n" +
            "`.رول admin`",
        });

        return;
      }

      const roleInput = getRoleInput(message, targetMember);

      if (!roleInput) {
        await message.reply({
          content:
            "❌ اكتب اسم الرول أو الـID بتاعها.\n\n" +
            "مثال:\n" +
            "`.رول @العضو admin`",
        });

        return;
      }

      const role = findRole(message, roleInput);

      if (!role) {
        await message.reply({
          content:
            `❌ مش لاقي رول باسم أو ID **${roleInput}**.\n\n` +
            "تأكد إنك كتبت اسم الرول أو الـID صح.",
        });

        return;
      }

      if (role.id === message.guild.id) {
        await message.reply({
          content: "❌ مينفعش تستخدم رول @everyone.",
        });

        return;
      }

      if (role.managed) {
        await message.reply({
          content:
            "❌ الرول دي Managed ومينفعش البوت يدّيها للأعضاء.",
        });

        return;
      }

      const botMember = message.guild.members.me;

      if (!botMember) {
        await message.reply({
          content: "❌ مش قادر أحدد صلاحيات البوت.",
        });

        return;
      }

      if (
        !botMember.permissions.has(
          PermissionFlagsBits.ManageRoles,
        )
      ) {
        await message.reply({
          content:
            "❌ البوت محتاج صلاحية **Manage Roles** عشان يقدر يدي الرولات.",
        });

        return;
      }

      if (role.position >= botMember.roles.highest.position) {
        await message.reply({
          content:
            "❌ مينفعش البوت يدي الرول دي لأنها أعلى من أو مساوية لأعلى رول عند البوت.",
        });

        return;
      }

      if (targetMember.roles.cache.has(role.id)) {
        await message.reply({
          content:
            `⚠️ ${targetMember} معاه رول ${role} بالفعل.`,
        });

        return;
      }

      await targetMember.roles.add(role);

      const embed = new EmbedBuilder()
        .setColor(0x57f287)
        .setTitle("🎭 تم إعطاء الرول")
        .setDescription(
          `👤 **العضو:** ${targetMember}\n` +
          `🎭 **الرول:** ${role}\n` +
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
          text: "Gamblias • Role System",
        });

      await message.reply({
        embeds: [embed],
      });
    } catch (error) {
      console.error("[RoleSystem] Error:", error);

      if (!message.replied) {
        await message.reply({
          content:
            "❌ حصل خطأ أثناء إعطاء الرول. راجع الـConsole.",
        });
      }
    }
  });
}
