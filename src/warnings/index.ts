import {
  EmbedBuilder,
  Events,
  PermissionFlagsBits,
  type Client,
  type GuildMember,
  type Message,
} from "discord.js";

import { sendTemporaryReply } from "../cleanup/index.ts";
import {
  sendMaxWarningLog,
  sendWarnLog,
} from "../logs/index.ts";
import { hasBotPermission } from "../permissions/permissions.ts";
import { applyEmbedStyle } from "../embeds/store.ts";
import { createUndoRow } from "../moderation/undo.ts";

import {
  addWarning,
  initializeWarningStore,
  resetWarnings,
} from "./store.ts";

const WARNING_COMMAND = "ورن";
const MAX_WARNINGS = 3;
const TIMEOUT_DURATION_MS = 30 * 60 * 1000;

function warningEmbed(
  member: GuildMember,
  moderator: GuildMember,
  reason: string,
  count: number,
) {
  return new EmbedBuilder()
    .setColor(0xf59e0b)
    .setTitle("⚠️ تم تحذيرك")
    .addFields(
      { name: "👤 العضو", value: member.toString(), inline: true },
      { name: "🛡️ بواسطة", value: moderator.toString(), inline: true },
      { name: "📝 السبب", value: reason.slice(0, 1024), inline: false },
      {
        name: "🔢 عدد التحذيرات",
        value: `${count}/${MAX_WARNINGS}`,
        inline: true,
      },
    )
    .setDescription(
      "يرجى الالتزام بقوانين السيرفر لتجنب الإجراءات القادمة.",
    )
    .setThumbnail(
      member.displayAvatarURL({
        extension: "png",
        size: 256,
      }),
    )
    .setTimestamp();
}

function maximumWarningsEmbed(
  member: GuildMember,
  moderator: GuildMember,
) {
  return new EmbedBuilder()
    .setColor(0xef4444)
    .setTitle("🚨 تم الوصول إلى الحد الأقصى من التحذيرات")
    .addFields(
      { name: "👤 العضو", value: member.toString(), inline: true },
      { name: "🛡️ بواسطة", value: moderator.toString(), inline: true },
      { name: "🔢 التحذيرات", value: "3/3", inline: true },
      {
        name: "⏳ الإجراء",
        value: "تايم أوت لمدة 30 دقيقة",
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

async function reply(
  message: Message,
  content: string,
) {
  await sendTemporaryReply(message, content);
}

async function resolveTarget(
  message: Message,
  remainder: string,
) {
  const guild = message.guild;

  if (!guild) {
    return {
      target: null,
      reason: remainder,
    };
  }

  const mention = remainder.match(/^<@!?(\d+)>/);

  if (mention) {
    const reason = remainder
      .slice(mention[0].length)
      .trim();

    try {
      return {
        target: await guild.members.fetch(mention[1]),
        reason,
      };
    } catch {
      await reply(
        message,
        "لم يتم العثور على العضو المذكور في السيرفر.",
      );

      return {
        target: null,
        reason,
      };
    }
  }

  if (message.reference?.messageId) {
    try {
      const referencedMessage =
        await message.fetchReference();

      return {
        target: await guild.members.fetch(
          referencedMessage.author.id,
        ),
        reason: remainder,
        referencedMessage,
      };
    } catch {
      await reply(
        message,
        "لم يتم العثور على العضو صاحب الرسالة التي تم الرد عليها.",
      );

      return {
        target: null,
        reason: remainder,
      };
    }
  }

  return {
    target: null,
    reason: remainder,
  };
}

function canModerate(
  moderator: GuildMember,
  target: GuildMember,
) {
  if (
    target.id === moderator.id ||
    target.id === moderator.guild.ownerId
  ) {
    return false;
  }

  return (
    moderator.roles.highest.comparePositionTo(
      target.roles.highest,
    ) > 0
  );
}

async function handleWarning(
  message: Message,
) {
  if (
    !message.guild ||
    !message.member ||
    message.author.bot
  ) {
    return;
  }

  const content = message.content.trim();

  if (
    content !== WARNING_COMMAND &&
    !content.startsWith(`${WARNING_COMMAND} `) &&
    !content.startsWith(`${WARNING_COMMAND}\n`)
  ) {
    return;
  }

  const moderator = message.member;

  if (
    !hasBotPermission(
      message.guild.id,
      moderator,
      "moderation.warn",
    )
  ) {
    await reply(
      message,
      "❌ مش مسموح لك تستخدم Permission **Warn**.",
    );

    return;
  }

  const remainder = content
    .slice(WARNING_COMMAND.length)
    .trim();

  const {
    target,
    reason,
    referencedMessage,
  } = await resolveTarget(
    message,
    remainder,
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
      "يرجى كتابة سبب التحذير.",
    );

    return;
  }

  if (!canModerate(moderator, target)) {
    await reply(
      message,
      "🚫 لا يمكنك تحذير شخص رتبته أعلى منك أو مساوية لرتبتك.",
    );

    return;
  }

  const botMember =
    message.guild.members.me ??
    (await message.guild.members.fetchMe());

  if (
    target.id === message.client.user?.id ||
    target.id === message.guild.ownerId ||
    !botMember.permissions.has(
      PermissionFlagsBits.ModerateMembers,
    ) ||
    botMember.roles.highest.comparePositionTo(
      target.roles.highest,
    ) <= 0
  ) {
    await reply(
      message,
      "لا يستطيع البوت اتخاذ إجراء على هذا العضو بسبب الصلاحيات.",
    );

    return;
  }

  const channel = message.channel;

  if (!channel.isSendable()) {
    await reply(
      message,
      "لا يمكن إرسال رسائل التحذير في هذه القناة.",
    );

    return;
  }

  if (referencedMessage) {
    try {
      await referencedMessage.delete();
    } catch {
      // Continue if the referenced message cannot be deleted.
    }
  }

  const count = await addWarning(
    message.guild.id,
    target.id,
  );

  if (count === MAX_WARNINGS) {
    const previousTimeoutUntil =
      target.communicationDisabledUntilTimestamp;

    await target.timeout(
      TIMEOUT_DURATION_MS,
      "الوصول إلى ثلاثة تحذيرات",
    );

    await sendMaxWarningLog(
      message.guild,
      target.user.username,
      target.toString(),
      target.id,
      moderator.toString(),
    );

    await resetWarnings(
      message.guild.id,
      target.id,
    );

    const embed = applyEmbedStyle(
      message.guild.id,
      "max-warning",
      maximumWarningsEmbed(
        target,
        moderator,
      ),
      {
        member: target.toString(),
        moderator: moderator.toString(),
        reason,
        count: `${count}/${MAX_WARNINGS}`,
      },
    );

    const undoRow = createUndoRow({
      kind: "warn-max",
      guildId: message.guild.id,
      targetId: target.id,
      moderatorId: moderator.id,
      reason,
      previousTimeoutUntil,
      warningRestoreCount: 2,
    });

    await channel.send({
      content: target.toString(),
      embeds: [embed],
      components: [undoRow],
    });

    return;
  }

  await sendWarnLog(
    message.guild,
    target.user.username,
    target.toString(),
    target.id,
    moderator.toString(),
    reason,
    count,
  );

  const embed = applyEmbedStyle(
    message.guild.id,
    "warning",
    warningEmbed(
      target,
      moderator,
      reason,
      count,
    ),
    {
      member: target.toString(),
      moderator: moderator.toString(),
      reason,
      count: `${count}/${MAX_WARNINGS}`,
    },
  );

  const undoRow = createUndoRow({
    kind: "warn",
    guildId: message.guild.id,
    targetId: target.id,
    moderatorId: moderator.id,
    reason,
  });

  await channel.send({
    content: target.toString(),
    embeds: [embed],
    components: [undoRow],
  });
}

export function registerWarningSystem(
  client: Client,
) {
  void initializeWarningStore().catch((error) => {
    console.error(
      "Could not initialize warning store:",
      error,
    );
  });

  client.on(
    Events.MessageCreate,
    async (message) => {
      try {
        await handleWarning(message);
      } catch (error) {
        console.error(
          "Warning system error:",
          error,
        );

        if (
          message.guild &&
          message.content
            .trim()
            .startsWith(WARNING_COMMAND)
        ) {
          await reply(
            message,
            "حدث خطأ أثناء تنفيذ التحذير. يرجى المحاولة مرة أخرى.",
          );
        }
      }
    },
  );
}
