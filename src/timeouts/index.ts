import {
  EmbedBuilder,
  Events,
  PermissionFlagsBits,
  type Client,
  type GuildMember,
  type Message,
} from "discord.js";
import { sendTemporaryReply } from "../cleanup/index.js";
import { sendTimeoutLog } from "../logs/index.ts";
import { hasBotPermission } from "../permissions/permissions.ts";

const TIMEOUT_COMMAND = "تايم";
const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000;
const MAX_TIMEOUT_MS = 28 * 24 * 60 * 60 * 1000;

type TimeoutTarget = {
  target: GuildMember | null;
  reason: string;
  referencedMessage?: Message;
};

type ParsedDuration = {
  durationMs: number;
  label: string;
};

async function reply(message: Message, content: string) {
  await sendTemporaryReply(message, content);
}

function timeoutEmbed(
  member: GuildMember,
  moderator: GuildMember,
  durationLabel: string,
  reason: string,
) {
  return new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle("⏱️ تم إعطاء تايم أوت")
    .addFields(
      { name: "👤 العضو", value: member.toString(), inline: true },
      { name: "🛡️ بواسطة", value: moderator.toString(), inline: true },
      { name: "⏳ المدة", value: durationLabel, inline: true },
      { name: "📝 السبب", value: reason.slice(0, 1024), inline: false },
    )
    .setThumbnail(member.displayAvatarURL({ extension: "png", size: 256 }))
    .setTimestamp();
}

function formatDuration(value: number, unit: "m" | "h" | "d") {
  if (unit === "m") {
    return value === 1 ? "دقيقة واحدة" : `${value} دقائق`;
  }

  if (unit === "h") {
    return value === 1 ? "ساعة واحدة" : `${value} ساعات`;
  }

  return value === 1 ? "يوم واحد" : `${value} أيام`;
}

function parseDuration(input: string): ParsedDuration | null {
  const firstToken = input.split(/\s+/, 1)[0] ?? "";
  const durationMatch = firstToken.match(/^(\d+)([mhd])$/i);

  if (!durationMatch) {
    if (/^\d+\D+$/i.test(firstToken)) {
      return null;
    }

    return {
      durationMs: DEFAULT_TIMEOUT_MS,
      label: "5 دقائق",
    };
  }

  const value = Number(durationMatch[1]);
  const unit = durationMatch[2].toLowerCase() as "m" | "h" | "d";

  const multiplier =
    unit === "m"
      ? 60 * 1000
      : unit === "h"
        ? 60 * 60 * 1000
        : 24 * 60 * 60 * 1000;

  const durationMs = value * multiplier;

  if (
    !Number.isSafeInteger(durationMs) ||
    durationMs <= 0 ||
    durationMs > MAX_TIMEOUT_MS
  ) {
    return null;
  }

  return {
    durationMs,
    label: formatDuration(value, unit),
  };
}

async function resolveTarget(
  message: Message,
  input: string,
): Promise<TimeoutTarget> {
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
        target: await guild.members.fetch(referencedMessage.author.id),
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

async function handleTimeout(message: Message) {
  if (!message.guild || !message.member || message.author.bot) {
    return;
  }

  const content = message.content.trim();

  if (
    content !== TIMEOUT_COMMAND &&
    !content.startsWith(`${TIMEOUT_COMMAND} `) &&
    !content.startsWith(`${TIMEOUT_COMMAND}\n`)
  ) {
    return;
  }

  const moderator = message.member;

  if (
    !hasBotPermission(
      message.guild.id,
      moderator,
      "moderation.timeout",
    )
  ) {
    await reply(
      message,
      "❌ مش مسموح لك تستخدم Permission **Timeout**.",
    );
    return;
  }

  const input = content.slice(TIMEOUT_COMMAND.length).trim();

  const {
    target,
    reason: targetInput,
    referencedMessage,
  } = await resolveTarget(message, input);

  if (!target) {
    await reply(
      message,
      "يرجى الرد على رسالة العضو أو ذكره بعد الأمر.",
    );
    return;
  }

  const parsedDuration = parseDuration(targetInput);

  if (!parsedDuration) {
    await reply(
      message,
      "⏱️ مدة التايم غير صالحة. استخدم مدة مثل 5m أو 10m أو 30m أو 1h أو 1d، وبحد أقصى 28 يومًا.",
    );
    return;
  }

  const reasonInput = targetInput
    .replace(/^\d+[mhd](?:\s+|$)/i, "")
    .trim();

  if (!reasonInput) {
    await reply(message, "يرجى كتابة سبب التايم.");
    return;
  }

  if (
    target.id === moderator.id ||
    target.id === message.guild.ownerId ||
    moderator.roles.highest.comparePositionTo(target.roles.highest) <= 0
  ) {
    await reply(
      message,
      "🚫 لا يمكنك عمل تايم لشخص رتبته أعلى منك أو مساوية لرتبتك.",
    );
    return;
  }

  const botMember =
    message.guild.members.me ??
    (await message.guild.members.fetchMe());

  if (
    target.id === message.client.user?.id ||
    !botMember.permissions.has(PermissionFlagsBits.ModerateMembers) ||
    botMember.roles.highest.comparePositionTo(target.roles.highest) <= 0
  ) {
    await reply(
      message,
      "لا يستطيع البوت عمل تايم لهذا العضو بسبب الصلاحيات.",
    );
    return;
  }

  const channel = message.channel;

  if (!channel.isSendable()) {
    await reply(
      message,
      "لا يمكن إرسال رسالة التايم في هذه القناة.",
    );
    return;
  }

  if (referencedMessage) {
    try {
      await referencedMessage.delete();
    } catch {
      // Continue with the timeout if the original message cannot be deleted.
    }
  }

  await target.timeout(
    parsedDuration.durationMs,
    reasonInput.slice(0, 512),
  );

  await sendTimeoutLog(
    message.guild,
    target.user.username,
    target.toString(),
    target.id,
    moderator.toString(),
    parsedDuration.label,
    reasonInput,
  );

  await channel.send({
    embeds: [
      timeoutEmbed(
        target,
        moderator,
        parsedDuration.label,
        reasonInput,
      ),
    ],
  });
}

export function registerTimeoutSystem(client: Client) {
  client.on(Events.MessageCreate, async (message) => {
    try {
      await handleTimeout(message);
    } catch (error) {
      console.error("Timeout system error:", error);

      if (
        message.guild &&
        message.content.trim().startsWith(TIMEOUT_COMMAND)
      ) {
        await reply(
          message,
          "حدث خطأ أثناء تنفيذ التايم. يرجى المحاولة مرة أخرى.",
        );
      }
    }
  });
}
