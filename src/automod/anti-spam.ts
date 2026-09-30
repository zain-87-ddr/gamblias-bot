import {
  EmbedBuilder,
  Events,
  PermissionFlagsBits,
  type Client,
  type GuildMember,
  type Message,
} from "discord.js";
import { logAutomaticAction } from "../modlogs/index.js";
import {
  initializeSpamStore,
  recordSpamMessage,
  type SpamMessageRecord,
} from "./spam-store.js";

const SPAM_TIMEOUT_MS = 10 * 60 * 1000;

function spamEmbed(member: GuildMember) {
  return new EmbedBuilder()
    .setColor(0xef4444)
    .setTitle("🚨 تم إعطاء تايم أوت بسبب السبام")
    .addFields(
      { name: "👤 العضو", value: member.toString(), inline: true },
      { name: "🛡️ الإجراء", value: "تايم أوت", inline: true },
      { name: "⏳ المدة", value: "10 دقائق", inline: true },
      { name: "📝 السبب", value: "إرسال رسائل بشكل متكرر", inline: false },
    )
    .setThumbnail(member.displayAvatarURL({ extension: "png", size: 256 }))
    .setTimestamp();
}

async function deleteSpamMessages(message: Message, records: SpamMessageRecord[]) {
  for (const record of records) {
    try {
      if (record.messageId === message.id) {
        await message.delete();
        continue;
      }

      const channel = await message.client.channels.fetch(record.channelId);
      if (!channel?.isTextBased() || !("messages" in channel)) {
        continue;
      }

      const spamMessage = await channel.messages.fetch(record.messageId);
      await spamMessage.delete();
    } catch {
      // Deletion is best effort; timeout handling continues.
    }
  }
}

async function handleSpam(message: Message) {
  if (!message.guild || !message.member || message.author.bot) {
    return;
  }

  const botMember = message.guild.members.me ?? (await message.guild.members.fetchMe());
  if (
    message.member.id === message.guild.ownerId ||
    message.member.permissions.has(PermissionFlagsBits.ModerateMembers) ||
    !botMember.permissions.has(PermissionFlagsBits.ModerateMembers) ||
    botMember.roles.highest.comparePositionTo(message.member.roles.highest) <= 0
  ) {
    return;
  }

  const detection = await recordSpamMessage(
    message.guild.id,
    message.member.id,
    {
      channelId: message.channel.id,
      messageId: message.id,
      sentAt: Date.now(),
    },
  );
  if (!detection.triggered) {
    return;
  }

  const guildChannel = message.guild.channels.cache.get(message.channel.id);
  if (
    guildChannel &&
    botMember.permissionsIn(guildChannel).has(PermissionFlagsBits.ManageMessages)
  ) {
    await deleteSpamMessages(message, detection.messages);
  }

  await message.member.timeout(SPAM_TIMEOUT_MS, "إرسال رسائل بشكل متكرر");
  void logAutomaticAction(
    message.guild,
    message.member,
    "مكافحة السبام",
    "إرسال رسائل بشكل متكرر",
  );

  if (!message.channel.isSendable()) {
    return;
  }

  await message.channel.send({
    embeds: [spamEmbed(message.member)],
  });
}

export function registerAntiSpam(client: Client) {
  void initializeSpamStore().catch((error) => {
    console.error("Could not initialize spam store:", error);
  });

  client.on(Events.MessageCreate, async (message) => {
    try {
      await handleSpam(message);
    } catch (error) {
      console.error("Anti-spam system error:", error);
    }
  });
}