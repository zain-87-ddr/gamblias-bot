import {
  EmbedBuilder,
  Events,
  PermissionFlagsBits,
  type Client,
  type Message,
} from "discord.js";
import { ALLOWED_LINK_DOMAINS } from "./allowed-domains.js";

const LINK_PATTERN = /https?:\/\/[^\s<>()]+/gi;

function linkEmbed(message: Message) {
  return new EmbedBuilder()
    .setColor(0xf59e0b)
    .setTitle("🔗 تم حذف الرسالة")
    .addFields(
      { name: "👤 العضو", value: message.author.toString(), inline: true },
      { name: "📝 السبب", value: "إرسال روابط غير مسموح بها", inline: false },
    )
    .setThumbnail(message.author.displayAvatarURL({ extension: "png", size: 256 }))
    .setTimestamp();
}

function normalizeHostname(hostname: string) {
  return hostname.toLowerCase().replace(/^www\./, "");
}

function isAllowedDomain(hostname: string) {
  const normalizedHostname = normalizeHostname(hostname);
  return ALLOWED_LINK_DOMAINS.some((domain) => {
    const normalizedDomain = normalizeHostname(domain);
    return (
      normalizedHostname === normalizedDomain ||
      normalizedHostname.endsWith(`.${normalizedDomain}`)
    );
  });
}

function hasBlockedLink(content: string) {
  return [...content.matchAll(LINK_PATTERN)].some((match) => {
    const candidate = match[0].replace(/[.,!?;:]+$/, "");

    try {
      return !isAllowedDomain(new URL(candidate).hostname);
    } catch {
      return true;
    }
  });
}

async function handleLink(message: Message) {
  if (!message.guild || message.author.bot || !hasBlockedLink(message.content)) {
    return;
  }

  const botMember = message.guild.members.me ?? (await message.guild.members.fetchMe());
  const guildChannel = message.guild.channels.cache.get(message.channel.id);
  if (
    guildChannel &&
    botMember.permissionsIn(guildChannel).has(PermissionFlagsBits.ManageMessages)
  ) {
    try {
      await message.delete();
    } catch {
      // Continue with the warning if deletion is not permitted.
    }
  }
  if (!message.channel.isSendable()) {
    return;
  }

  await message.channel.send({
    embeds: [linkEmbed(message)],
  });
}

export function registerAntiLink(client: Client) {
  client.on(Events.MessageCreate, async (message) => {
    try {
      await handleLink(message);
    } catch (error) {
      console.error("Anti-link system error:", error);
    }
  });
}
