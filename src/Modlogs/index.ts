import {
  ChannelType,
  EmbedBuilder,
  Events,
  PermissionFlagsBits,
  type Client,
  type Guild,
  type GuildMember,
  type PartialGuildMember,
  type TextChannel,
  type User,
} from "discord.js";

const MOD_LOG_CHANNEL_NAME = "「📋」・mod-logs";
const channelInitialization = new Map<string, Promise<TextChannel | null>>();

type Mentionable = GuildMember | PartialGuildMember | User;

function mention(value: Mentionable) {
  return value.toString();
}

function timeField() {
  return `<t:${Math.floor(Date.now() / 1000)}:F>`;
}

function findLogChannel(guild: Guild) {
  const channel = guild.channels.cache.find(
    (candidate) =>
      candidate.type === ChannelType.GuildText &&
      candidate.name === MOD_LOG_CHANNEL_NAME,
  );

  return channel?.type === ChannelType.GuildText
    ? (channel as TextChannel)
    : null;
}

async function createOrFindLogChannel(guild: Guild): Promise<TextChannel | null> {
  const existing = findLogChannel(guild);
  if (existing) {
    return existing;
  }

  const botMember = guild.members.me ?? (await guild.members.fetchMe());
  if (!botMember.permissions.has(PermissionFlagsBits.ManageChannels)) {
    console.warn(`Cannot create mod log channel in ${guild.name}: missing Manage Channels.`);
    return null;
  }

  try {
    return await guild.channels.create({
      name: MOD_LOG_CHANNEL_NAME,
      type: ChannelType.GuildText,
      reason: "إنشاء قناة سجلات الإشراف",
    });
  } catch (error) {
    console.error(`Could not create mod log channel in ${guild.name}:`, error);
    return null;
  }
}

async function ensureLogChannel(guild: Guild) {
  const currentInitialization = channelInitialization.get(guild.id);
  if (currentInitialization) {
    return currentInitialization;
  }

  const initialization = createOrFindLogChannel(guild);
  channelInitialization.set(guild.id, initialization);
  try {
    return await initialization;
  } finally {
    channelInitialization.delete(guild.id);
  }
}

async function sendLog(guild: Guild, embed: EmbedBuilder) {
  try {
    const channel = await ensureLogChannel(guild);
    if (!channel) {
      return;
    }

    await channel.send({ embeds: [embed] });
  } catch (error) {
    console.error(`Could not send mod log in ${guild.name}:`, error);
  }
}

export async function logModerationAction(
  guild: Guild,
  member: Mentionable,
  moderator: Mentionable,
  action: string,
  reason: string,
) {
  await sendLog(
    guild,
    new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle("📋 إجراء إداري")
      .addFields(
        { name: "👤 العضو", value: mention(member), inline: true },
        { name: "🛡️ بواسطة", value: mention(moderator), inline: true },
        { name: "⚙️ الإجراء", value: action, inline: false },
        { name: "📝 السبب", value: reason.slice(0, 1024), inline: false },
        { name: "⏰ الوقت", value: timeField(), inline: false },
      )
      .setTimestamp(),
  );
}

export async function logAutomaticAction(
  guild: Guild,
  member: Mentionable,
  system: string,
  reason: string,
) {
  await sendLog(
    guild,
    new EmbedBuilder()
      .setColor(0xf59e0b)
      .setTitle("🤖 إجراء تلقائي")
      .addFields(
        { name: "👤 العضو", value: mention(member), inline: true },
        { name: "⚙️ النظام", value: system, inline: true },
        { name: "📝 السبب", value: reason.slice(0, 1024), inline: false },
        { name: "⏰ الوقت", value: timeField(), inline: false },
      )
      .setTimestamp(),
  );
}

async function logMemberEvent(
  guild: Guild,
  member: Mentionable,
  title: string,
  emoji: string,
) {
  const userId = "user" in member ? member.user.id : member.id;
  await sendLog(
    guild,
    new EmbedBuilder()
      .setColor(0x64748b)
      .setTitle(`${emoji} ${title}`)
      .addFields(
        { name: "👤 العضو", value: mention(member), inline: true },
        { name: "🆔 ID", value: userId, inline: true },
        { name: "⏰ الوقت", value: timeField(), inline: false },
      )
      .setTimestamp(),
  );
}

export function logMemberJoin(member: GuildMember) {
  return logMemberEvent(member.guild, member, "دخول عضو", "📥");
}

export function logMemberLeave(member: PartialGuildMember) {
  return logMemberEvent(member.guild, member, "خروج عضو", "📤");
}

export function registerModLogsSystem(client: Client) {
  client.once(Events.ClientReady, (readyClient) => {
    for (const guild of readyClient.guilds.cache.values()) {
      void ensureLogChannel(guild);
    }
  });

  client.on(Events.GuildCreate, (guild) => {
    void ensureLogChannel(guild);
  });

  client.on(Events.GuildMemberAdd, (member) => {
    void logMemberJoin(member);
  });

  client.on(Events.GuildMemberRemove, (member) => {
    void logMemberLeave(member);
  });
}
// Mod logs system
