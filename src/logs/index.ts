import {
  EmbedBuilder,
  ChannelType,
  type Guild,
  type GuildTextBasedChannel,
} from "discord.js";

const LOG_CATEGORY_NAME = "GAMBLIAS LOGS";

const LOG_CHANNEL_NAMES = {
  ban: "ban-logs",
  timeout: "timeout-logs",
  warn: "warn-logs",
  clear: "clear-logs",
  automod: "automod-logs",
  member: "member-logs",
} as const;

async function getLogChannel(
  guild: Guild,
  channelName: string,
): Promise<GuildTextBasedChannel | null> {
  const category = guild.channels.cache.find(
    (channel) =>
      channel.type === ChannelType.GuildCategory &&
      channel.name === LOG_CATEGORY_NAME,
  );

  if (!category) {
    return null;
  }

  const channel = guild.channels.cache.find(
    (channel) =>
      channel.name === channelName &&
      channel.parentId === category.id &&
      channel.isTextBased(),
  );

  if (!channel || !channel.isSendable()) {
    return null;
  }

  return channel as GuildTextBasedChannel;
}

export async function sendBanLog(
  guild: Guild,
  memberName: string,
  memberMention: string,
  memberId: string,
  moderatorMention: string,
  reason: string,
) {
  const channel = await getLogChannel(
    guild,
    LOG_CHANNEL_NAMES.ban,
  );

  if (!channel) {
    return;
  }

  const embed = new EmbedBuilder()
    .setColor(0xef4444)
    .setTitle("🔨 تم حظر عضو")
    .addFields(
      {
        name: "👤 العضو",
        value: `${memberMention}\n${memberName}`,
        inline: true,
      },
      {
        name: "🛡️ بواسطة",
        value: moderatorMention,
        inline: true,
      },
      {
        name: "🆔 ID",
        value: `\`${memberId}\``,
        inline: false,
      },
      {
        name: "📝 السبب",
        value: reason.slice(0, 1024),
        inline: false,
      },
    )
    .setTimestamp();

  await channel.send({
    embeds: [embed],
  });
}

export async function sendTimeoutLog(
  guild: Guild,
  memberName: string,
  memberMention: string,
  memberId: string,
  moderatorMention: string,
  durationLabel: string,
  reason: string,
) {
  const channel = await getLogChannel(
    guild,
    LOG_CHANNEL_NAMES.timeout,
  );

  if (!channel) {
    return;
  }

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle("⏱️ تم إعطاء تايم أوت")
    .addFields(
      {
        name: "👤 العضو",
        value: `${memberMention}\n${memberName}`,
        inline: true,
      },
      {
        name: "🛡️ بواسطة",
        value: moderatorMention,
        inline: true,
      },
      {
        name: "⏳ المدة",
        value: durationLabel,
        inline: true,
      },
      {
        name: "🆔 ID",
        value: `\`${memberId}\``,
        inline: false,
      },
      {
        name: "📝 السبب",
        value: reason.slice(0, 1024),
        inline: false,
      },
    )
    .setTimestamp();

  await channel.send({
    embeds: [embed],
  });
}

export async function sendWarnLog(
  guild: Guild,
  memberName: string,
  memberMention: string,
  memberId: string,
  moderatorMention: string,
  reason: string,
  warningCount: number,
) {
  const channel = await getLogChannel(
    guild,
    LOG_CHANNEL_NAMES.warn,
  );

  if (!channel) {
    return;
  }

  const embed = new EmbedBuilder()
    .setColor(0xf59e0b)
    .setTitle("⚠️ تم تحذير عضو")
    .addFields(
      {
        name: "👤 العضو",
        value: `${memberMention}\n${memberName}`,
        inline: true,
      },
      {
        name: "🛡️ بواسطة",
        value: moderatorMention,
        inline: true,
      },
      {
        name: "🔢 التحذيرات",
        value: `${warningCount}/3`,
        inline: true,
      },
      {
        name: "🆔 ID",
        value: `\`${memberId}\``,
        inline: false,
      },
      {
        name: "📝 السبب",
        value: reason.slice(0, 1024),
        inline: false,
      },
    )
    .setTimestamp();

  await channel.send({
    embeds: [embed],
  });
}

export async function sendMaxWarningLog(
  guild: Guild,
  memberName: string,
  memberMention: string,
  memberId: string,
  moderatorMention: string,
) {
  const channel = await getLogChannel(
    guild,
    LOG_CHANNEL_NAMES.warn,
  );

  if (!channel) {
    return;
  }

  const embed = new EmbedBuilder()
    .setColor(0xef4444)
    .setTitle("🚨 تم الوصول إلى الحد الأقصى للتحذيرات")
    .addFields(
      {
        name: "👤 العضو",
        value: `${memberMention}\n${memberName}`,
        inline: true,
      },
      {
        name: "🛡️ بواسطة",
        value: moderatorMention,
        inline: true,
      },
      {
        name: "🔢 التحذيرات",
        value: "3/3",
        inline: true,
      },
      {
        name: "🆔 ID",
        value: `\`${memberId}\``,
        inline: false,
      },
      {
        name: "⏱️ الإجراء",
        value: "كتم لمدة 30 دقيقة",
        inline: false,
      },
    )
    .setTimestamp();

  await channel.send({
    embeds: [embed],
  });
}

export async function sendClearLog(
  guild: Guild,
  moderatorMention: string,
  deletedCount: number,
  channelMention: string,
  targetMemberMention?: string,
) {
  const channel = await getLogChannel(
    guild,
    LOG_CHANNEL_NAMES.clear,
  );

  if (!channel) {
    return;
  }

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle("🧹 تم تنظيف المحادثة")
    .addFields(
      {
        name: "🛡️ بواسطة",
        value: moderatorMention,
        inline: true,
      },
      {
        name: "🗑️ عدد الرسائل",
        value: `\`${deletedCount}\``,
        inline: true,
      },
      {
        name: "📍 القناة",
        value: channelMention,
        inline: true,
      },
    )
    .setTimestamp();

  if (targetMemberMention) {
    embed.addFields({
      name: "👤 العضو",
      value: targetMemberMention,
      inline: true,
    });
  }

  await channel.send({
    embeds: [embed],
  });
}

export async function sendAutoModLog(
  guild: Guild,
  memberMention: string,
  system: string,
  action: string,
  details: string,
  channelMention: string,
) {
  const channel = await getLogChannel(
    guild,
    LOG_CHANNEL_NAMES.automod,
  );

  if (!channel) {
    return;
  }

  const embed = new EmbedBuilder()
    .setColor(0x8b5cf6)
    .setTitle("🤖 AutoMod — تم اتخاذ إجراء")
    .addFields(
      {
        name: "👤 العضو",
        value: memberMention,
        inline: true,
      },
      {
        name: "🛡️ النظام",
        value: system,
        inline: true,
      },
      {
        name: "⚡ الإجراء",
        value: action,
        inline: true,
      },
      {
        name: "📝 التفاصيل",
        value: details.slice(0, 1024),
        inline: false,
      },
      {
        name: "📍 القناة",
        value: channelMention,
        inline: true,
      },
    )
    .setTimestamp();

  await channel.send({
    embeds: [embed],
  });
}

export async function sendMemberJoinLog(
  guild: Guild,
  memberName: string,
  memberMention: string,
  memberId: string,
  accountCreatedAt: Date,
  memberCount: number,
) {
  const channel = await getLogChannel(
    guild,
    LOG_CHANNEL_NAMES.member,
  );

  if (!channel) {
    return;
  }

  const embed = new EmbedBuilder()
    .setColor(0x22c55e)
    .setTitle("🟢 انضم عضو جديد")
    .addFields(
      {
        name: "👤 العضو",
        value: `${memberMention}\n${memberName}`,
        inline: true,
      },
      {
        name: "🆔 ID",
        value: `\`${memberId}\``,
        inline: true,
      },
      {
        name: "📅 إنشاء الحساب",
        value: `<t:${Math.floor(accountCreatedAt.getTime() / 1000)}:F>`,
        inline: false,
      },
      {
        name: "👥 عدد الأعضاء",
        value: `\`${memberCount}\``,
        inline: true,
      },
    )
    .setTimestamp();

  await channel.send({
    embeds: [embed],
  });
}

export async function sendMemberLeaveLog(
  guild: Guild,
  memberName: string,
  memberId: string,
  memberCount: number,
) {
  const channel = await getLogChannel(
    guild,
    LOG_CHANNEL_NAMES.member,
  );

  if (!channel) {
    return;
  }

  const embed = new EmbedBuilder()
    .setColor(0xef4444)
    .setTitle("🔴 غادر عضو السيرفر")
    .addFields(
      {
        name: "👤 العضو",
        value: memberName,
        inline: true,
      },
      {
        name: "🆔 ID",
        value: `\`${memberId}\``,
        inline: true,
      },
      {
        name: "👥 عدد الأعضاء",
        value: `\`${memberCount}\``,
        inline: true,
      },
    )
    .setTimestamp();

  await channel.send({
    embeds: [embed],
  });
}
