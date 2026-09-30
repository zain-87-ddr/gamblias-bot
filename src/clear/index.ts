import {
  Events,
  PermissionFlagsBits,
  type Client,
  type Message,
} from "discord.js";

const CLEAR_COMMAND = ".مسح";
const DEFAULT_AMOUNT = 5;
const MAX_AMOUNT = 200;

async function handleClear(message: Message) {
  if (!message.guild || message.author.bot) {
    return;
  }

  const content = message.content.trim();

  // لازم الأمر يبدأ بالنقطة
  if (
    content !== CLEAR_COMMAND &&
    !content.startsWith(`${CLEAR_COMMAND} `)
  ) {
    return;
  }

  // صلاحية العضو
  if (
    !message.member?.permissions.has(
      PermissionFlagsBits.ManageMessages,
    )
  ) {
    return;
  }

  // صلاحية البوت
  const botMember =
    message.guild.members.me ??
    (await message.guild.members.fetchMe());

  if (
    !botMember.permissions.has(
      PermissionFlagsBits.ManageMessages,
    )
  ) {
    return;
  }

  const input = content.slice(CLEAR_COMMAND.length).trim();

  let amount = DEFAULT_AMOUNT;

  if (input) {
    const parsedAmount = Number(input);

    if (
      !Number.isInteger(parsedAmount) ||
      parsedAmount < 1 ||
      parsedAmount > MAX_AMOUNT
    ) {
      return;
    }

    amount = parsedAmount;
  }

  const channel = message.channel;

  if (!channel.isTextBased() || !("messages" in channel)) {
    return;
  }

  // لو الأمر معمول Reply على رسالة شخص
  if (message.reference?.messageId) {
    const referencedMessage = await message.fetchReference();
    const targetUserId = referencedMessage.author.id;

    let deleted = 0;
    let lastMessageId: string | undefined;

    while (deleted < amount) {
      const messages = await channel.messages.fetch({
        limit: 100,
        ...(lastMessageId ? { before: lastMessageId } : {}),
      });

      if (messages.size === 0) {
        break;
      }

      const targetMessages = messages.filter(
        (msg) =>
          msg.author.id === targetUserId &&
          msg.id !== message.id,
      );

      if (targetMessages.size > 0) {
        const remaining = amount - deleted;
        const selected = [...targetMessages.values()].slice(
          0,
          remaining,
        );

        if ("bulkDelete" in channel) {
          await channel.bulkDelete(selected, true);
        }

        deleted += selected.length;
      }

      lastMessageId = messages.last()?.id;

      if (!lastMessageId || messages.size < 100) {
        break;
      }
    }

    await message.delete().catch(() => {});
    return;
  }

  // مسح عادي بدون Reply
  let remaining = amount;

  while (remaining > 0) {
    const batchSize = Math.min(remaining, 100);

    const messages = await channel.messages.fetch({
      limit: batchSize,
    });

    const messagesToDelete = messages.filter(
      (msg) => msg.id !== message.id,
    );

    if (messagesToDelete.size === 0) {
      break;
    }

    if ("bulkDelete" in channel) {
      await channel.bulkDelete(messagesToDelete, true);
    }

    remaining -= messagesToDelete.size;

    if (messages.size < batchSize) {
      break;
    }
  }
}

export function registerClearSystem(client: Client) {
  client.on(Events.MessageCreate, async (message) => {
    try {
      await handleClear(message);
    } catch (error) {
      console.error("Clear system error:", error);
    }
  });
}
