import {
  EmbedBuilder,
  ChannelType,
  type Guild,
  type GuildTextBasedChannel,
  type Message,
} from "discord.js";

const LOG_CATEGORY_NAME = "GAMBLIAS LOGS";

const LOG_CHANNEL_NAMES = {
  ban: "ban",
  timeout: "timeout",
  warn: "warn",
  clear: "clear",
  automod: "automod",
  member: "member",
  message: "message",
  voice: "vc",
  ticket: "ticket",
  channel: "channel",
  nickname: "nickname",
  role: "role",
} as const;

async function getLogChannel(
  guild: Guild,
  channelName: string,
): Promise<GuildTextBasedChannel | null> {
  try {
    /*
     * نعمل Fetch للقنوات من Discord مباشرة
     * بدل الاعتماد على الـCache فقط.
     */

    const channels =
      await guild.channels.fetch();

    const category =
      channels.find(
        (channel) =>
          channel?.type ===
            ChannelType.GuildCategory &&
          channel.name ===
            LOG_CATEGORY_NAME,
      );

    if (!category) {
      console.error(
        `[Logs] Category "${LOG_CATEGORY_NAME}" not found in ${guild.name}`,
      );

      return null;
    }

    const channel =
      channels.find(
        (channel) =>
          channel?.type ===
            ChannelType.GuildText &&
          channel.name === channelName &&
          channel.parentId === category.id,
      );

    if (!channel) {
      console.error(
        `[Logs] Channel "${channelName}" not found inside "${LOG_CATEGORY_NAME}"`,
      );

      return null;
    }

    if (!channel.isTextBased()) {
      return null;
    }

    if (!channel.isSendable()) {
      console.error(
        `[Logs] Channel "${channelName}" is not sendable`,
      );

      return null;
    }

    return channel as GuildTextBasedChannel;
  } catch (error) {
    console.error(
      `[Logs] Failed to get log channel "${channelName}":`,
      error,
    );

    return null;
  }
}

/* =========================
   Ban
   ========================= */

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

  if (!channel) return;

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

/* =========================
   Timeout
   ========================= */

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

  if (!channel) return;

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

/* =========================
   Warn
   ========================= */

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

  if (!channel) return;

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

  if (!channel) return;

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

/* =========================
   Clear
   ========================= */

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

  if (!channel) return;

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

/* =========================
   AutoMod
   ========================= */

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

  if (!channel) return;

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

/* =========================
   Member
   ========================= */

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

  if (!channel) return;

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

  if (!channel) return;

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

/* =========================
   Message
   ========================= */

export async function sendMessageDeleteLog(
  guild: Guild,
  message: Message,
) {
  const channel = await getLogChannel(
    guild,
    LOG_CHANNEL_NAMES.message,
  );

  if (!channel) return;

  const content =
    message.content.trim() ||
    "لا يوجد محتوى نصي";

  const embed = new EmbedBuilder()
    .setColor(0xef4444)
    .setTitle("🗑️ تم حذف رسالة")
    .addFields(
      {
        name: "👤 العضو",
        value: `${message.author.toString()}\n${message.author.username}`,
        inline: true,
      },
      {
        name: "📍 القناة",
        value: message.channel.toString(),
        inline: true,
      },
      {
        name: "🆔 Message ID",
        value: `\`${message.id}\``,
        inline: false,
      },
      {
        name: "💬 محتوى الرسالة",
        value: content.slice(0, 1024),
        inline: false,
      },
    )
    .setTimestamp();

  await channel.send({
    embeds: [embed],
  });
}

export async function sendMessageEditLog(
  guild: Guild,
  oldMessage: Message,
  newMessage: Message,
) {
  const channel = await getLogChannel(
    guild,
    LOG_CHANNEL_NAMES.message,
  );

  if (!channel) return;

  const oldContent =
    oldMessage.content.trim() ||
    "لا يوجد محتوى نصي";

  const newContent =
    newMessage.content.trim() ||
    "لا يوجد محتوى نصي";

  const embed = new EmbedBuilder()
    .setColor(0xf59e0b)
    .setTitle("✏️ تم تعديل رسالة")
    .addFields(
      {
        name: "👤 العضو",
        value: `${newMessage.author.toString()}\n${newMessage.author.username}`,
        inline: true,
      },
      {
        name: "📍 القناة",
        value: newMessage.channel.toString(),
        inline: true,
      },
      {
        name: "🆔 Message ID",
        value: `\`${newMessage.id}\``,
        inline: false,
      },
      {
        name: "📄 قبل التعديل",
        value: oldContent.slice(0, 1024),
        inline: false,
      },
      {
        name: "📝 بعد التعديل",
        value: newContent.slice(0, 1024),
        inline: false,
      },
    )
    .setTimestamp();

  await channel.send({
    embeds: [embed],
  });
}

/* =========================
   VC
   ========================= */

export async function sendVoiceJoinLog(
  guild: Guild,
  memberMention: string,
  memberId: string,
  channelName: string,
) {
  const channel = await getLogChannel(
    guild,
    LOG_CHANNEL_NAMES.voice,
  );

  if (!channel) return;

  const embed = new EmbedBuilder()
    .setColor(0x22c55e)
    .setTitle("🟢 دخل Voice")
    .addFields(
      {
        name: "👤 العضو",
        value: memberMention,
        inline: true,
      },
      {
        name: "🆔 ID",
        value: `\`${memberId}\``,
        inline: true,
      },
      {
        name: "🎙️ القناة",
        value: channelName,
        inline: false,
      },
    )
    .setTimestamp();

  await channel.send({
    embeds: [embed],
  });
}

export async function sendVoiceLeaveLog(
  guild: Guild,
  memberMention: string,
  memberId: string,
  channelName: string,
) {
  const channel = await getLogChannel(
    guild,
    LOG_CHANNEL_NAMES.voice,
  );

  if (!channel) return;

  const embed = new EmbedBuilder()
    .setColor(0xef4444)
    .setTitle("🔴 خرج من Voice")
    .addFields(
      {
        name: "👤 العضو",
        value: memberMention,
        inline: true,
      },
      {
        name: "🆔 ID",
        value: `\`${memberId}\``,
        inline: true,
      },
      {
        name: "🎙️ القناة",
        value: channelName,
        inline: false,
      },
    )
    .setTimestamp();

  await channel.send({
    embeds: [embed],
  });
}

export async function sendVoiceMoveLog(
  guild: Guild,
  memberMention: string,
  memberId: string,
  oldChannelName: string,
  newChannelName: string,
) {
  const channel = await getLogChannel(
    guild,
    LOG_CHANNEL_NAMES.voice,
  );

  if (!channel) return;

  const embed = new EmbedBuilder()
    .setColor(0xf59e0b)
    .setTitle("🔄 تم نقل عضو في Voice")
    .addFields(
      {
        name: "👤 العضو",
        value: memberMention,
        inline: true,
      },
      {
        name: "🆔 ID",
        value: `\`${memberId}\``,
        inline: true,
      },
      {
        name: "📤 من",
        value: oldChannelName,
        inline: true,
      },
      {
        name: "📥 إلى",
        value: newChannelName,
        inline: true,
      },
    )
    .setTimestamp();

  await channel.send({
    embeds: [embed],
  });
}

export async function sendVoiceDisconnectLog(
  guild: Guild,
  memberMention: string,
  memberId: string,
  channelName: string,
) {
  const channel = await getLogChannel(
    guild,
    LOG_CHANNEL_NAMES.voice,
  );

  if (!channel) return;

  const embed = new EmbedBuilder()
    .setColor(0xef4444)
    .setTitle("🔌 تم فصل العضو من Voice")
    .addFields(
      {
        name: "👤 العضو",
        value: memberMention,
        inline: true,
      },
      {
        name: "🆔 ID",
        value: `\`${memberId}\``,
        inline: true,
      },
      {
        name: "🎙️ القناة",
        value: channelName,
        inline: false,
      },
    )
    .setTimestamp();

  await channel.send({
    embeds: [embed],
  });
}

/* =========================
   Ticket
   ========================= */

export async function sendTicketLog(
  guild: Guild,
  action: string,
  ticketChannel: string,
  userMention?: string,
  moderatorMention?: string,
  details?: string,
) {
  const channel = await getLogChannel(
    guild,
    LOG_CHANNEL_NAMES.ticket,
  );

  if (!channel) return;

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle(`🎫 ${action}`)
    .addFields({
      name: "🎫 التكت",
      value: ticketChannel,
      inline: true,
    })
    .setTimestamp();

  if (userMention) {
    embed.addFields({
      name: "👤 العضو",
      value: userMention,
      inline: true,
    });
  }

  if (moderatorMention) {
    embed.addFields({
      name: "🛡️ بواسطة",
      value: moderatorMention,
      inline: true,
    });
  }

  if (details) {
    embed.addFields({
      name: "📝 التفاصيل",
      value: details.slice(0, 1024),
      inline: false,
    });
  }

  await channel.send({
    embeds: [embed],
  });
}

/* =========================
   Channel
   ========================= */

export async function sendChannelLog(
  guild: Guild,
  action: string,
  channelMention: string,
  oldValue?: string,
  newValue?: string,
  moderatorMention?: string,
) {
  const channel = await getLogChannel(
    guild,
    LOG_CHANNEL_NAMES.channel,
  );

  if (!channel) return;

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle(`📢 ${action}`)
    .addFields({
      name: "📍 القناة",
      value: channelMention,
      inline: true,
    })
    .setTimestamp();

  if (oldValue !== undefined) {
    embed.addFields({
      name: "📄 القديم",
      value: oldValue.slice(0, 1024),
      inline: true,
    });
  }

  if (newValue !== undefined) {
    embed.addFields({
      name: "📝 الجديد",
      value: newValue.slice(0, 1024),
      inline: true,
    });
  }

  if (moderatorMention) {
    embed.addFields({
      name: "🛡️ بواسطة",
      value: moderatorMention,
      inline: false,
    });
  }

  await channel.send({
    embeds: [embed],
  });
}

/* =========================
   Nickname
   ========================= */

export async function sendNicknameLog(
  guild: Guild,
  memberMention: string,
  oldNickname: string,
  newNickname: string,
  moderatorMention?: string,
) {
  const channel = await getLogChannel(
    guild,
    LOG_CHANNEL_NAMES.nickname,
  );

  if (!channel) return;

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle("✏️ تم تغيير Nickname")
    .addFields(
      {
        name: "👤 العضو",
        value: memberMention,
        inline: true,
      },
      {
        name: "📄 القديم",
        value: oldNickname,
        inline: true,
      },
      {
        name: "📝 الجديد",
        value: newNickname,
        inline: true,
      },
    )
    .setTimestamp();

  if (moderatorMention) {
    embed.addFields({
      name: "🛡️ بواسطة",
      value: moderatorMention,
      inline: false,
    });
  }

  await channel.send({
    embeds: [embed],
  });
}

/* =========================
   Role
   ========================= */

export async function sendRoleLog(
  guild: Guild,
  action: string,
  roleMention: string,
  memberMention?: string,
  moderatorMention?: string,
  oldValue?: string,
  newValue?: string,
) {
  const channel = await getLogChannel(
    guild,
    LOG_CHANNEL_NAMES.role,
  );

  if (!channel) return;

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle(`🎭 ${action}`)
    .addFields({
      name: "🎭 الرول",
      value: roleMention,
      inline: true,
    })
    .setTimestamp();

  if (memberMention) {
    embed.addFields({
      name: "👤 العضو",
      value: memberMention,
      inline: true,
    });
  }

  if (moderatorMention) {
    embed.addFields({
      name: "🛡️ بواسطة",
      value: moderatorMention,
      inline: true,
    });
  }

  if (oldValue !== undefined) {
    embed.addFields({
      name: "📄 القديم",
      value: oldValue.slice(0, 1024),
      inline: true,
    });
  }

  if (newValue !== undefined) {
    embed.addFields({
      name: "📝 الجديد",
      value: newValue.slice(0, 1024),
      inline: true,
    });
  }

  await channel.send({
    embeds: [embed],
  });
}
