import {
  EmbedBuilder,
  Events,
  PermissionFlagsBits,
  type Client,
  type Message,
} from "discord.js";

const CLEAR_COMMAND = ".مسح";
const DEFAULT_AMOUNT = 5;
const MAX_AMOUNT = 200;
const CONFIRMATION_DELETE_MS = 10_000;

async function handleClear(message: Message) {
  if (!message.guild || message.author.bot) {
    return;
  }

  const content = message.content.trim();

  if (
    content !== CLEAR_COMMAND &&
    !content.startsWith(`${CLEAR_COMMAND} `)
  ) {
    return;
  }

  if (
    !message.member?.permissions.has(
      PermissionFlagsBits.ManageMessages,
    )
  ) {
    return;
  }

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

  let deleted = 0;
  let targetUserId: string | undefined;
  let targetUserMention: string | undefined;

  // لو الأمر معمول Reply على شخص
  if (message.reference?.messageId) {
    const referencedMessage = await message.fetchReference();

    targetUserId = referencedMessage.author.id;
    targetUserMention = referencedMessage.author.toString();

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

        const selected = [
          ...targetMessages.values(),
        ].slice(0, remaining);

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
  } else {
    // مسح عادي
    let remaining = amount;

    while (remaining > 0) {
      const batchSize = Math.min(remaining, 100);

      const messages = await channel.messages.fetch({
        limit: batchSize + 1,
      });

      const messagesToDelete = messages.filter(
        (msg) => msg.id !== message.id,
      );

      if (messagesToDelete.size === 0) {
        break;
      }

      const selected = [
        ...messagesToDelete.values(),
      ].slice(0, batchSize);

      if ("bulkDelete" in channel) {
        await channel.bulkDelete(selected, true);
      }

      deleted += selected.length;
      remaining = amount - deleted;

      if (messages.size < batchSize) {
        break;
      }
    }
  }

  // نمسح أمر .مسح نفسه
  await message.delete().catch(() => {});

  if (deleted === 0) {
    return;
  }

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle("🧹 تم تنظيف المحادثة")
    .addFields(
      {
        name: "🛡️ بواسطة",
        value: message.author.toString(),
        inline: true,
      },
      {
        name: "🗑️ عدد الرسائل",
        value: `\`${deleted}\``,
        inline: true,
      },
    )
    .setTimestamp();

  if (targetUserId && targetUserMention) {
    embed.addFields({
      name: "👤 العضو",
      value: targetUserMention,
      inline: true,
    });
  }

  const confirmation = await channel.send({
    embeds: [embed],
  });

  setTimeout(() => {
    void confirmation.delete().catch(() => {});
  }, CONFIRMATION_DELETE_MS);
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
