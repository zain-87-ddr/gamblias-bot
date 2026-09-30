import {
  EmbedBuilder,
  Events,
  PermissionFlagsBits,
  type Client,
  type GuildMember,
  type Message,
} from "discord.js";
import { MASS_MENTION_THRESHOLD } from "./mass-mention-config.js";

const MASS_MENTION_TIMEOUT_MS = 10 * 60 * 1000;
const messagesBeingHandled = new Set<string>();

function massMentionEmbed(member: GuildMember) {
  return new EmbedBuilder()
    .setColor(0xef4444)
    .setTitle("🚨 تم إعطاء تايم أوت بسبب المنشنات")
    .addFields(
      { name: "👤 العضو", value: member.toString(), inline: true },
      { name: "🛡️ الإجراء", value: "تايم أوت", inline: true },
      { name: "⏳ المدة", value: "10 دقائق", inline: true },
      {
        name: "📝 السبب",
        value: "عمل منشن لعدد كبير من الأعضاء",
        inline: false,
      },
    )
    .setThumbnail(member.displayAvatarURL({ extension: "png", size: 256 }))
    .setTimestamp();
}

async function handleMassMention(message: Message) {
  if (
    !message.guild ||
    !message.member ||
    message.author.bot ||
    messagesBeingHandled.has(message.id)
  ) {
    return;
  }

  const uniqueMentionCount = new Set(message.mentions.users.keys()).size;
  if (uniqueMentionCount < MASS_MENTION_THRESHOLD) {
    return;
  }

  messagesBeingHandled.add(message.id);
  try {
    if (
      message.member.id === message.guild.ownerId ||
      message.member.id === message.client.user?.id
    ) {
      return;
    }

    const botMember = message.guild.members.me ?? (await message.guild.members.fetchMe());
    if (
      !botMember.permissions.has(PermissionFlagsBits.ModerateMembers) ||
      botMember.roles.highest.comparePositionTo(message.member.roles.highest) <= 0
    ) {
      return;
    }

    const guildChannel = message.guild.channels.cache.get(message.channel.id);
    if (
      guildChannel &&
      botMember.permissionsIn(guildChannel).has(PermissionFlagsBits.ManageMessages)
    ) {
      try {
        await message.delete();
      } catch {
        // Continue with the timeout if the message cannot be deleted.
      }
    }

    await message.member.timeout(
      MASS_MENTION_TIMEOUT_MS,
      "عمل منشن لعدد كبير من الأعضاء",
    );

    if (!message.channel.isSendable()) {
      return;
    }

    await message.channel.send({
      embeds: [massMentionEmbed(message.member)],
    });
  } finally {
    messagesBeingHandled.delete(message.id);
  }
}

export function registerAntiMassMention(client: Client) {
  client.on(Events.MessageCreate, async (message) => {
    try {
      await handleMassMention(message);
    } catch (error) {
      console.error("Anti-mass mention system error:", error);
    }
  });
}
