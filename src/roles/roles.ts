import {
  EmbedBuilder,
  PermissionFlagsBits,
  type Client,
  type GuildMember,
  type Message,
  type Role,
} from "discord.js";
import { hasBotPermission } from "../permissions/permissions.ts";

const ROLE_COMMAND = ".رول";
const UNROLE_COMMAND = ".انرول";

function findRole(message: Message, roleInput: string): Role | null {
  if (!message.guild) {
    return null;
  }

  const input = roleInput.trim();

  // Role ID
  const roleById = message.guild.roles.cache.get(input);

  if (roleById) {
    return roleById;
  }

  // Role Mention
  const roleMentionMatch = input.match(/^<@&(\d+)>$/);

  if (roleMentionMatch) {
    const roleByMention = message.guild.roles.cache.get(
      roleMentionMatch[1],
    );

    if (roleByMention) {
      return roleByMention;
    }
  }

  // Role Name
  const roleByName = message.guild.roles.cache.find(
    (role) =>
      role.name.toLowerCase() === input.toLowerCase(),
  );

  return roleByName ?? null;
}

function getTargetMember(
  message: Message,
): GuildMember | null {
  if (!message.guild) {
    return null;
  }

  // بالمنشن
  const mentionedMember = message.mentions.members?.first();

  if (mentionedMember) {
    return mentionedMember;
  }

  // بالـReply
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

function getRoleInput(
  message: Message,
  targetMember: GuildMember,
  command: string,
): string | null {
  let content = message.content
    .slice(command.length)
    .trim();

  // إزالة منشن العضو من الكلام
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

async function handleRoleCommand(
  message: Message,
  command: string,
  action: "add" | "remove",
) {
  if (message.author.bot) {
    return;
  }

  if (!message.guild || !message.member) {
    return;
  }

  if (
    !message.content
      .toLowerCase()
      .startsWith(command.toLowerCase())
  ) {
    return;
  }

  const permission =
    action === "add"
      ? "roles.give"
      : "roles.remove";

  const permissionName =
    action === "add"
      ? "Give Role"
      : "Remove Role";

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

  const targetMember = getTargetMember(message);

  if (!targetMember) {
    await message.reply({
      content:
        "❌ لازم تعمل **منشن للعضو** أو تستخدم الأمر **Reply** على رسالة العضو.\n\n" +
        `مثال:\n\`${command} @العضو admin\`\n\n` +
        `أو اعمل Reply على رسالة العضو واكتب:\n\`${command} admin\``,
    });

    return;
  }

  const roleInput = getRoleInput(
    message,
    targetMember,
    command,
  );

  if (!roleInput) {
    await message.reply({
      content:
        `❌ اكتب اسم الرول أو الـID بتاعها.\n\n` +
        `مثال:\n\`${command} @العضو admin\``,
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
        "❌ الرول دي Managed ومينفعش البوت يتعامل معاها.",
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
        "❌ البوت محتاج صلاحية **Manage Roles** عشان يقدر يتعامل مع الرولات.",
    });

    return;
  }

  if (role.position >= botMember.roles.highest.position) {
    await message.reply({
      content:
        "❌ مينفعش البوت يتعامل مع الرول دي لأنها أعلى من أو مساوية لأعلى رول عند البوت.",
    });

    return;
  }

  if (action === "add") {
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

    return;
  }

  if (!targetMember.roles.cache.has(role.id)) {
    await message.reply({
      content:
        `⚠️ ${targetMember} مش معاه رول ${role} أصلًا.`,
    });

    return;
  }

  await targetMember.roles.remove(role);

  const embed = new EmbedBuilder()
    .setColor(0xed4245)
    .setTitle("🗑️ تم إزالة الرول")
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
}

export function registerRoleSystem(client: Client) {
  client.on("messageCreate", async (message) => {
    try {
      if (
        message.content
          .toLowerCase()
          .startsWith(ROLE_COMMAND.toLowerCase())
      ) {
        await handleRoleCommand(
          message,
          ROLE_COMMAND,
          "add",
        );

        return;
      }

      if (
        message.content
          .toLowerCase()
          .startsWith(UNROLE_COMMAND.toLowerCase())
      ) {
        await handleRoleCommand(
          message,
          UNROLE_COMMAND,
          "remove",
        );

        return;
      }
    } catch (error) {
      console.error("[RoleSystem] Error:", error);

      if (!message.replied) {
        await message.reply({
          content:
            "❌ حصل خطأ أثناء تنفيذ أمر الرول.",
        });
      }
    }
  });
}
