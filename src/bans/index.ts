import {
  EmbedBuilder,
  Events,
  PermissionFlagsBits,
  type Client,
  type GuildMember,
  type Message,
} from "discord.js";
import { sendTemporaryReply } from "../cleanup/index.ts";
import { sendBanLog } from "../logs/index.ts";
import { hasBotPermission } from "../permissions/permissions.ts";

const BAN_COMMAND = "بان";
const UNBAN_COMMAND = "انبان";
const USER_ID_PATTERN = /^\d{17,20}$/;

type BanTarget = {
  target: GuildMember | null;
  reason: string;
  referencedMessage?: Message;
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

function banEmbed(
  member: GuildMember,
  moderator: GuildMember,
  reason: string,
) {
  return new EmbedBuilder()
    .setColor(0xef4444)
    .setTitle("🔨 تم حظر العضو")
    .addFields(
      { name: "👤 العضو", value: member.toString(), inline: true },
      { name: "🛡️ بواسطة", value: moderator.toString(), inline: true },
      {
        name: "📝 السبب",
        value: reason.slice(0, 1024),
        inline: false,
      },
    )
    .setThumbnail(
      member.displayAvatarURL({
        extension: "png",
        size: 256,
      }),
    )
    .setTimestamp();
}

function unbanEmbed(
  username: string,
  userId: string,
  moderator: GuildMember,
) {
  return new EmbedBuilder()
    .setColor(0x22c55e)
    .setTitle("🔓 تم إلغاء حظر العضو")
    .addFields(
      {
        name: "👤 العضو",
        value: `${username}\n${userId}`,
        inline: true,
      },
      {
        name: "🛡️ بواسطة",
        value: moderator.toString(),
        inline: true,
      },
    )
    .setTimestamp();
}

async function resolveBanTarget(
  message: Message,
  input: string,
): Promise<BanTarget> {
  const guild = message.guild;

  if (!guild) {
    return {
      target: null,
      reason: input,
    };
  }

  const mention = input.match(/^<@!?(\d+)>/);

  if (mention) {
    try {
      return {
        target: await guild.members.fetch(mention[1]),
        reason: input.slice(mention[0].length).trim(),
      };
    } catch {
      await reply(
        message,
        "لم يتم العثور على العضو المذكور في السيرفر.",
      );

      return {
        target: null,
        reason: "",
      };
    }
  }

  if (message.reference?.messageId) {
    try {
      const referencedMessage = await message.fetchReference();

      return {
        target: await guild.members.fetch(
          referencedMessage.author.id,
        ),
        reason: input,
        referencedMessage,
      };
    } catch {
      await reply(
        message,
        "لم يتم العثور على العضو صاحب الرسالة التي تم الرد عليها.",
      );

      return {
        target: null,
        reason: "",
      };
    }
  }

  return {
    target: null,
    reason: input,
  };
}

async function handleBan(message: Message) {
  if (
    !message.guild ||
    !message.member ||
    message.author.bot
  ) {
    return;
  }

  const content = message.content.trim();

  if (!isCommand(content, BAN_COMMAND)) {
    return;
  }

  const moderator = message.member;

  if (
    !hasBotPermission(
      message.guild.id,
      moderator,
      "moderation.ban",
    )
  ) {
    await reply(
      message,
      "❌ مش مسموح لك تستخدم Permission **Ban**.",
    );
    return;
  }

  const input = content
    .slice(BAN_COMMAND.length)
    .trim();

  const {
    target,
    reason,
    referencedMessage,
  } = await resolveBanTarget(
    message,
    input,
  );

  if (!target) {
    await reply(
      message,
      "يرجى الرد على رسالة العضو أو ذكره بعد الأمر.",
    );
    return;
  }

  if (!reason) {
    await reply(
      message,
      "⚠️ يجب كتابة سبب البان\n\n📝 مثال:\nبان @member السبب",
    );
    return;
  }

  if (
    target.id === moderator.id ||
    target.id === message.guild.ownerId ||
    moderator.roles.highest.comparePositionTo(
      target.roles.highest,
    ) <= 0
  ) {
    await reply(
      message,
      "🚫 لا يمكنك عمل بان لشخص رتبته أعلى منك أو مساوية لرتبتك.",
    );
    return;
  }

  const botMember =
    message.guild.members.me ??
    (await message.guild.members.fetchMe());

  if (
    target.id === message.client.user?.id ||
    !botMember.permissions.has(
      PermissionFlagsBits.BanMembers,
    ) ||
    botMember.roles.highest.comparePositionTo(
      target.roles.highest,
    ) <= 0
  ) {
    await reply(
      message,
      "لا يستطيع البوت تنفيذ البان على هذا العضو بسبب الصلاحيات.",
    );
    return;
  }

  const channel = message.channel;

  if (!channel.isSendable()) {
    await reply(
      message,
      "لا يمكن إرسال رسالة البان في هذه القناة.",
    );
    return;
  }

  if (referencedMessage) {
    try {
      await referencedMessage.delete();
    } catch {
      // Continue with the ban if the original message cannot be deleted.
    }
  }

  await target.ban({
    reason: reason.slice(0, 512),
  });

  await sendBanLog(
    message.guild,
    target.user.username,
    target.toString(),
    target.id,
    moderator.toString(),
    reason,
  );

  await channel.send({
    content: target.toString(),
    embeds: [
      banEmbed(
        target,
        moderator,
        reason,
      ),
    ],
  });
}

async function handleUnban(message: Message) {
  if (
    !message.guild ||
    !message.member ||
    message.author.bot
  ) {
    return;
  }

  const content = message.content.trim();

  if (!isCommand(content, UNBAN_COMMAND)) {
    return;
  }

  const moderator = message.member;

  if (
    !hasBotPermission(
      message.guild.id,
      moderator,
      "moderation.unban",
    )
  ) {
    await reply(
      message,
      "❌ مش مسموح لك تستخدم Permission **Unban**.",
    );
    return;
  }

  const input = content
    .slice(UNBAN_COMMAND.length)
    .trim();

  const userId =
    input.split(/\s+/, 1)[0] ?? "";

  if (!userId) {
    await reply(
      message,
      "⚠️ يجب كتابة معرف المستخدم.\n\n📝 مثال:\nانبان USER_ID",
    );
    return;
  }

  if (!USER_ID_PATTERN.test(userId)) {
    await reply(
      message,
      "⚠️ معرف المستخدم غير صالح. يرجى إدخال Discord ID صحيح.",
    );
    return;
  }

  const botMember =
    message.guild.members.me ??
    (await message.guild.members.fetchMe());

  if (
    !botMember.permissions.has(
      PermissionFlagsBits.BanMembers,
    )
  ) {
    await reply(
      message,
      "لا يستطيع البوت إلغاء البان بسبب عدم امتلاكه صلاحية **Ban Members**.",
    );
    return;
  }

  const channel = message.channel;

  if (!channel.isSendable()) {
    await reply(
      message,
      "لا يمكن إرسال رسالة إلغاء البان في هذه القناة.",
    );
    return;
  }

  let ban;

  try {
    ban = await message.guild.bans.fetch(userId);
  } catch {
    await reply(
      message,
      "ℹ️ العضو غير محظور حاليًا",
    );
    return;
  }

  await message.guild.bans.remove(
    userId,
    "إلغاء الحظر",
  );

  await channel.send({
    embeds: [
      unbanEmbed(
        ban.user.username,
        userId,
        moderator,
      ),
    ],
  });
}

export function registerBanSystem(client: Client) {
  client.on(
    Events.MessageCreate,
    async (message) => {
      try {
        await handleBan(message);
        await handleUnban(message);
      } catch (error) {
        console.error(
          "Ban system error:",
          error,
        );

        if (
          message.guild &&
          message.content
            .trim()
            .startsWith(BAN_COMMAND)
        ) {
          await reply(
            message,
            "حدث خطأ أثناء تنفيذ البان. يرجى المحاولة مرة أخرى.",
          );
        } else if (
          message.guild &&
          message.content
            .trim()
            .startsWith(UNBAN_COMMAND)
        ) {
          await reply(
            message,
            "حدث خطأ أثناء تنفيذ إلغاء البان. يرجى المحاولة مرة أخرى.",
          );
        }
      }
    },
  );
}
