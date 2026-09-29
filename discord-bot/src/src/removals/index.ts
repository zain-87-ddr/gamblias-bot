import {
  EmbedBuilder,
  Events,
  PermissionFlagsBits,
  type Client,
  type GuildMember,
  type Message,
} from "discord.js";
import { sendTemporaryReply } from "../cleanup/index.js";
import { logModerationAction } from "../modlogs/index.js";
import { removeWarning } from "../warnings/store.js";

const UNWARN_COMMAND = "انورن";
const UNTIMEOUT_COMMAND = "انتايم";

type RemovalTarget = {
  target: GuildMember | null;
  reason: string;
};

async function reply(message: Message, content: string) {
  await sendTemporaryReply(message, content);
}

function isCommand(content: string, command: string) {
  return (
    content === command ||
    content.startsWith(`${command} `) ||
    content.startsWith(`${command}\n`)
  );
}

function unwarnEmbed(
  member: GuildMember,
  moderator: GuildMember,
  reason: string,
  count: number,
) {
  return new EmbedBuilder()
    .setColor(0x22c55e)
    .setTitle("⚠️ تم إزالة تحذير")
    .addFields(
      { name: "👤 العضو", value: member.toString(), inline: true },
      { name: "🛡️ بواسطة", value: moderator.toString(), inline: true },
      { name: "📝 السبب", value: reason.slice(0, 1024), inline: false },
      { name: "📊 التحذيرات الحالية", value: `${count}/3`, inline: true },
    )
    .setThumbnail(member.displayAvatarURL({ extension: "png", size: 256 }))
    .setTimestamp();
}

function noWarningsEmbed(member: GuildMember) {
  return new EmbedBuilder()
    .setColor(0x3b82f6)
    .setTitle("ℹ️ لا يوجد تحذيرات لإزالتها")
    .addFields({ name: "👤 العضو", value: member.toString(), inline: false })
    .setThumbnail(member.displayAvatarURL({ extension: "png", size: 256 }))
    .setTimestamp();
}

  function untimeoutEmbed(member: GuildMember, moderator: GuildMember) {
    return new EmbedBuilder()
      .setColor(0x22c55e)
      .setTitle("🔓 تم إزالة التايم أوت")
      .addFields(
        { name: "👤 العضو", value: member.toString(), inline: true },
        { name: "🛡️ بواسطة", value: moderator.toString(), inline: true },
      )
      .setThumbnail(member.displayAvatarURL({ extension: "png", size: 256 }))
      .setTimestamp();
  }
  return new EmbedBuilder()
    .setColor(0x22c55e)
    .setTitle("🔓 تم إزالة التايم أوت")
    .addFields(
      { name: "👤 العضو", value: member.toString(), inline: true },
      { name: "🛡️ بواسطة", value: moderator.toString(), inline: true },
      { name: "📝 السبب", value: reason.slice(0, 1024), inline: false },
    )
    .setThumbnail(member.displayAvatarURL({ extension: "png", size: 256 }))
    .setTimestamp();
}

function noTimeoutEmbed(member: GuildMember) {
  return new EmbedBuilder()
    .setColor(0x3b82f6)
    .setTitle("ℹ️ لا يوجد تايم أوت لإزالته")
    .addFields({ name: "👤 العضو", value: member.toString(), inline: false })
    .setThumbnail(member.displayAvatarURL({ extension: "png", size: 256 }))
    .setTimestamp();
}

async function resolveTarget(message: Message, input: string): Promise<RemovalTarget> {
  const guild = message.guild;
  if (!guild) {
    return { target: null, reason: input };
  }

  const mention = input.match(/^<@!?(\d+)>/);
  if (mention) {
    try {
      return {
        target: await guild.members.fetch(mention[1]),
        reason: input.slice(mention[0].length).trim(),
      };
    } catch {
      await reply(message, "لم يتم العثور على العضو المذكور في السيرفر.");
      return { target: null, reason: "" };
    }
  }

  if (message.reference?.messageId) {
    try {
      const referencedMessage = await message.fetchReference();
      return {
        target: await guild.members.fetch(referencedMessage.author.id),
        reason: input,
      };
    } catch {
      await reply(message, "لم يتم العثور على العضو صاحب الرسالة التي تم الرد عليها.");
      return { target: null, reason: "" };
    }
  }

  return { target: null, reason: input };
}

function canModeratorManage(moderator: GuildMember, target: GuildMember) {
  return (
    target.id !== moderator.id &&
    target.id !== moderator.guild.ownerId &&
    moderator.roles.highest.comparePositionTo(target.roles.highest) > 0
  );
}

function canBotManage(botMember: GuildMember, target: GuildMember) {
  return (
    botMember.permissions.has(PermissionFlagsBits.ModerateMembers) &&
    botMember.roles.highest.comparePositionTo(target.roles.highest) > 0
  );
}

async function resolveAndValidateTarget(
  message: Message,
  input: string,
  action: "unwarn" | "untimeout",
) {
  const { target, reason } = await resolveTarget(message, input);
  if (!target) {
    await reply(message, "يرجى الرد على رسالة العضو أو ذكره بعد الأمر.");
    return null;
  }

  if (!canModeratorManage(message.member!, target)) {
    await reply(
      message,
      action === "unwarn"
        ? "🚫 لا يمكنك إزالة تحذير من شخص رتبته أعلى منك أو مساوية لرتبتك."
        : "🚫 لا يمكنك إزالة التايم من شخص رتبته أعلى منك أو مساوية لرتبتك.",
    );
    return null;
  }

  const botMember = message.guild!.members.me ?? (await message.guild!.members.fetchMe());
  if (
    target.id === message.client.user?.id ||
    !canBotManage(botMember, target)
  ) {
    await reply(message, "لا يستطيع البوت تنفيذ الإجراء على هذا العضو بسبب الصلاحيات.");
    return null;
  }

  return { target, reason };
}

async function handleUnwarn(message: Message) {
  if (!message.guild || !message.member || message.author.bot) {
    return;
  }

  const content = message.content.trim();
  if (!isCommand(content, UNWARN_COMMAND)) {
    return;
  }

  if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
    await reply(message, "ليس لديك الصلاحية اللازمة لاستخدام أمر إزالة التحذير.");
    return;
  }

  const input = content.slice(UNWARN_COMMAND.length).trim();
  const resolved = await resolveAndValidateTarget(message, input, "unwarn");
  if (!resolved) {
    return;
  }

  const reason = resolved.reason || "تم إزالة تحذير.";
  const channel = message.channel;
  if (!channel.isSendable()) {
    await reply(message, "لا يمكن إرسال رسالة إزالة التحذير في هذه القناة.");
    return;
  }

  const count = await removeWarning(message.guild.id, resolved.target.id);
  if (count > 0) {
    void logModerationAction(
      message.guild,
      resolved.target,
      message.member,
      "إزالة تحذير",
      reason,
    );
  }
  await channel.send({
    embeds: [
      count === 0
        ? noWarningsEmbed(resolved.target)
        : unwarnEmbed(resolved.target, message.member, reason, count),
    ],
  });
}

async function handleUntimeout(message: Message) {
  if (!message.guild || !message.member || message.author.bot) {
    return;
  }

  const content = message.content.trim();
  if (!isCommand(content, UNTIMEOUT_COMMAND)) {
    return;
  }

  if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
    await reply(message, "ليس لديك الصلاحية اللازمة لاستخدام أمر إزالة التايم.");
    return;
  }

  const input = content.slice(UNTIMEOUT_COMMAND.length).trim();
  const resolved = await resolveAndValidateTarget(message, input, "untimeout");
  if (!resolved) {
    return;
  }

  const channel = message.channel;
  if (!channel.isSendable()) {
    await reply(message, "لا يمكن إرسال رسالة إزالة التايم في هذه القناة.");
    return;
  }

  const isTimedOut =
    resolved.target.communicationDisabledUntilTimestamp !== null &&
    resolved.target.communicationDisabledUntilTimestamp > Date.now();
  if (!isTimedOut) {
    await channel.send({
      embeds: [noTimeoutEmbed(resolved.target)],
    });
    return;
  }

   await resolved.target.timeout(null, "إزالة التايم أوت");
}

export function registerRemovalSystem(client: Client) {
  client.on(Events.MessageCreate, async (message) => {
    try {
      await handleUnwarn(message);
      await handleUntimeout(message);
    } catch (error) {
      console.error("Removal system error:", error);
      if (message.guild && message.content.trim().startsWith(UNWARN_COMMAND)) {
        await reply(message, "حدث خطأ أثناء تنفيذ إزالة التحذير. يرجى المحاولة مرة أخرى.");
      } else if (message.guild && message.content.trim().startsWith(UNTIMEOUT_COMMAND)) {
        await reply(message, "حدث خطأ أثناء تنفيذ إزالة التايم. يرجى المحاولة مرة أخرى.");
      }
    }
  });
}