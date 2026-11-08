import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  Events,
  PermissionFlagsBits,
  type ButtonInteraction,
  type Client,
  type GuildMember,
  type Message,
  type Role,
} from "discord.js";

import { hasBotPermission } from "../permissions/permissions.ts";
import { sendRoleLog } from "../logs/index.ts";
import { applyEmbedStyle } from "../embeds/store.ts";

const ROLE_COMMAND = ".رول";
const UNROLE_COMMAND = ".انرول";
const REVOKE_ROLE_PREFIX = "role_revoke:";

function findRole(message: Message, roleInput: string): Role | null {
  if (!message.guild) return null;

  const input = roleInput.trim();

  const roleById = message.guild.roles.cache.get(input);
  if (roleById) return roleById;

  const roleMentionMatch = input.match(/^<@&(\d+)>$/);

  if (roleMentionMatch) {
    const roleByMention = message.guild.roles.cache.get(roleMentionMatch[1]);
    if (roleByMention) return roleByMention;
  }

  const roleByName = message.guild.roles.cache.find(
    (role) => role.name.toLowerCase() === input.toLowerCase(),
  );

  return roleByName ?? null;
}

function getTargetMember(message: Message): GuildMember | null {
  if (!message.guild) return null;

  const mentionedMember = message.mentions.members?.first();
  if (mentionedMember) return mentionedMember;

  if (message.reference?.messageId) {
    const repliedUser = message.mentions.repliedUser;

    if (repliedUser) {
      return message.guild.members.cache.get(repliedUser.id) ?? null;
    }
  }

  return null;
}

function getRoleInput(
  message: Message,
  targetMember: GuildMember,
  command: string,
): string | null {
  let content = message.content.slice(command.length).trim();

  content = content
    .replace(new RegExp(`<@!?${targetMember.id}>`, "g"), "")
    .trim();

  return content || null;
}

function buildRoleEmbed(
  guildId: string,
  template: "role-add" | "role-remove",
  targetMember: GuildMember,
  role: Role,
  moderator: GuildMember,
): EmbedBuilder {
  const isAdd = template === "role-add";

  return applyEmbedStyle(
    guildId,
    template,
    new EmbedBuilder()
      .setColor(isAdd ? 0x57f287 : 0xed4245)
      .setTitle(
        isAdd
          ? "🎭 تم إعطاء الرتبة"
          : "🗑️ تم إزالة الرتبة",
      )
      .setDescription(
        `👤 **العضو:** ${targetMember}\n` +
        `🎭 **الرتبة:** ${role}\n` +
        `🛡️ **بواسطة:** ${moderator}`,
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
      }),
    {
      member: targetMember.toString(),
      moderator: moderator.toString(),
      role: role.toString(),
    },
  );
}

async function handleRoleCommand(
  message: Message,
  command: string,
  action: "add" | "remove",
) {
  if (message.author.bot) return;
  if (!message.guild || !message.member) return;

  if (!message.content.toLowerCase().startsWith(command.toLowerCase())) {
    return;
  }

  const permission = action === "add" ? "roles.give" : "roles.remove";
  const permissionName = action === "add" ? "Give Role" : "Remove Role";

  if (!hasBotPermission(message.guild.id, message.member, permission)) {
    await message.reply({
      content: `❌ مش مسموح لك تستخدم Permission **${permissionName}**.`,
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

  const roleInput = getRoleInput(message, targetMember, command);

  if (!roleInput) {
    await message.reply({
      content:
        `❌ اكتب اسم الرتبة أو الـID بتاعها.\n\n` +
        `مثال:\n\`${command} @العضو admin\``,
    });
    return;
  }

  const role = findRole(message, roleInput);

  if (!role) {
    await message.reply({
      content:
        `❌ مش لاقي رتبة باسم أو ID **${roleInput}**.\n\n` +
        "تأكد إنك كتبت اسم الرتبة أو الـID صح.",
    });
    return;
  }

  if (role.id === message.guild.id) {
    await message.reply({
      content: "❌ مينفعش تستخدم رتبة @everyone.",
    });
    return;
  }

  if (role.managed) {
    await message.reply({
      content: "❌ الرتبة دي Managed ومينفعش البوت يتعامل معاها.",
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

  if (!botMember.permissions.has(PermissionFlagsBits.ManageRoles)) {
    await message.reply({
      content:
        "❌ البوت محتاج صلاحية **Manage Roles** عشان يقدر يتعامل مع الرتب.",
    });
    return;
  }

  if (role.position >= botMember.roles.highest.position) {
    await message.reply({
      content:
        "❌ مينفعش البوت يتعامل مع الرتبة دي لأنها أعلى من أو مساوية لأعلى رتبة عند البوت.",
    });
    return;
  }

  if (action === "add") {
    if (targetMember.roles.cache.has(role.id)) {
      await message.reply({
        content: `⚠️ ${targetMember} معاه رتبة ${role} بالفعل.`,
      });
      return;
    }

    await targetMember.roles.add(role);

    await sendRoleLog(
      message.guild,
      "تم إعطاء رتبة",
      role.toString(),
      targetMember.toString(),
      message.member.toString(),
    );

    const embed = buildRoleEmbed(
      message.guild.id,
      "role-add",
      targetMember,
      role,
      message.member,
    );

    const revokeButton = new ButtonBuilder()
      .setCustomId(
        `${REVOKE_ROLE_PREFIX}${targetMember.id}:${role.id}:${message.author.id}`,
      )
      .setLabel("سحب الرتبة")
      .setEmoji("↩️")
      .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(revokeButton);

    await message.reply({
      embeds: [embed],
      components: [row],
    });

    return;
  }

  if (!targetMember.roles.cache.has(role.id)) {
    await message.reply({
      content: `⚠️ ${targetMember} مش معاه رتبة ${role} أصلًا.`,
    });
    return;
  }

  await targetMember.roles.remove(role);

  await sendRoleLog(
    message.guild,
    "تم إزالة رتبة",
    role.toString(),
    targetMember.toString(),
    message.member.toString(),
  );

  const embed = buildRoleEmbed(
    message.guild.id,
    "role-remove",
    targetMember,
    role,
    message.member,
  );

  await message.reply({
    embeds: [embed],
  });
}

async function handleRevokeRoleButton(
  interaction: ButtonInteraction,
) {
  if (!interaction.guild) {
    await interaction.reply({
      content: "❌ الزر ده لازم يتستخدم داخل السيرفر.",
      ephemeral: true,
    });
    return;
  }

  const parts = interaction.customId
    .slice(REVOKE_ROLE_PREFIX.length)
    .split(":");

  const [memberId, roleId, originalModeratorId] = parts;

  if (!memberId || !roleId || !originalModeratorId) {
    await interaction.reply({
      content: "❌ بيانات الزر غير صحيحة.",
      ephemeral: true,
    });
    return;
  }

  const isOwner = interaction.user.id === interaction.guild.ownerId;
  const isOriginalModerator = interaction.user.id === originalModeratorId;

  if (!isOwner && !isOriginalModerator) {
    await interaction.reply({
      content: "❌ الزر ده متاح للشخص اللي أعطى الرتبة أو Owner السيرفر فقط.",
      ephemeral: true,
    });
    return;
  }

  const member = await interaction.guild.members
    .fetch(interaction.user.id)
    .catch(() => null);

  if (!member) {
    await interaction.reply({
      content: "❌ مش قادر أحدد صلاحياتك.",
      ephemeral: true,
    });
    return;
  }

  if (!hasBotPermission(interaction.guild.id, member, "roles.remove")) {
    await interaction.reply({
      content: "❌ محتاج Permission **Remove Role** عشان تسحب الرتبة.",
      ephemeral: true,
    });
    return;
  }

  const targetMember = await interaction.guild.members
    .fetch(memberId)
    .catch(() => null);

  if (!targetMember) {
    await interaction.reply({
      content: "❌ العضو ده مش موجود في السيرفر.",
      ephemeral: true,
    });
    return;
  }

  const role = await interaction.guild.roles
    .fetch(roleId)
    .catch(() => null);

  if (!role) {
    await interaction.reply({
      content: "❌ الرتبة دي مش موجودة أو تم حذفها.",
      ephemeral: true,
    });
    return;
  }

  const botMember = interaction.guild.members.me;

  if (!botMember || !botMember.permissions.has(PermissionFlagsBits.ManageRoles)) {
    await interaction.reply({
      content: "❌ البوت محتاج صلاحية Manage Roles.",
      ephemeral: true,
    });
    return;
  }

  if (role.managed || role.position >= botMember.roles.highest.position) {
    await interaction.reply({
      content: "❌ البوت مش قادر يتعامل مع الرتبة دي بسبب ترتيب الرتب.",
      ephemeral: true,
    });
    return;
  }

  if (!targetMember.roles.cache.has(role.id)) {
    await interaction.update({
      content: "⚠️ الرتبة دي مش موجودة عند العضو بالفعل.",
      embeds: [],
      components: [],
    });
    return;
  }

  await interaction.deferUpdate();

  await targetMember.roles.remove(role);

  await sendRoleLog(
    interaction.guild,
    "تم سحب رتبة",
    role.toString(),
    targetMember.toString(),
    member.toString(),
  );

  const embed = new EmbedBuilder()
    .setColor(0xed4245)
    .setTitle("↩️ تم سحب الرتبة")
    .setDescription(
      `👤 **العضو:** ${targetMember}\n` +
      `🎭 **الرتبة:** ${role}\n` +
      `🛡️ **بواسطة:** ${member}`,
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

  await interaction.message.edit({
    embeds: [embed],
    components: [],
  });
}

export function registerRoleSystem(client: Client) {
  client.on(Events.MessageCreate, async (message) => {
    try {
      if (message.content.toLowerCase().startsWith(ROLE_COMMAND.toLowerCase())) {
        await handleRoleCommand(message, ROLE_COMMAND, "add");
        return;
      }

      if (message.content.toLowerCase().startsWith(UNROLE_COMMAND.toLowerCase())) {
        await handleRoleCommand(message, UNROLE_COMMAND, "remove");
        return;
      }
    } catch (error) {
      console.error("[RoleSystem] Error:", error);

      if (!message.replied) {
        await message.reply({
          content: "❌ حصل خطأ أثناء تنفيذ أمر الرتبة.",
        });
      }
    }
  });

  client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isButton()) return;
    if (!interaction.customId.startsWith(REVOKE_ROLE_PREFIX)) return;

    try {
      await handleRevokeRoleButton(interaction);
    } catch (error) {
      console.error("[RoleSystem] Revoke button error:", error);

      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: "❌ حصل خطأ أثناء سحب الرتبة.",
          ephemeral: true,
        });
      }
    }
  });
}
