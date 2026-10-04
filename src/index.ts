import {
  Client,
  Events,
  GatewayIntentBits,
  type ChatInputCommandInteraction,
} from "discord.js";

import { registerClearSystem } from "./clear/index.ts";
import { registerAutoCleanupSystem } from "./cleanup/index.ts";
import { registerAntiLink } from "./automod/anti-link.ts";
import { registerLockSystem } from "./lock/lock.ts";
import { registerNicknameSystem } from "./nickname/nickname.ts";
import { registerAntiMassMention } from "./automod/anti-mass-mention.ts";
import { registerAntiSpam } from "./automod/anti-spam.ts";
import { registerBanSystem } from "./bans/index.ts";
import { registerRoleSystem } from "./roles/roles.ts";
import { commands } from "./commands/index.ts";
import { getBotConfig } from "./config.ts";
import { registerSaySystem } from "./say/say.ts";

import {
  sendMemberJoinLog,
  sendMemberLeaveLog,
  sendMessageDeleteLog,
  sendMessageEditLog,
  sendVoiceJoinLog,
  sendVoiceLeaveLog,
  sendVoiceMoveLog,
  sendChannelLog,
} from "./logs/index.ts";

import { registerRemovalSystem } from "./removals/index.ts";
import { registerTimeoutSystem } from "./timeouts/index.ts";
import { sendWelcomeMessage } from "./welcome.ts";
import { registerWarningSystem } from "./warnings/index.ts";

import {
  giveAutoRole,
  giveAutoRoleToExistingMembers,
  setAutoRole,
} from "./autorole/autorole.ts";

import {
  handleTicketButton,
  handleTicketSelectMenu,
} from "./tickets/ticketInteractions.ts";

import {
  handlePermissionsInteraction,
  hasBotPermission,
} from "./permissions/permissions.ts";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

client.once(Events.ClientReady, (readyClient) => {
  console.info(`Ready! Logged in as ${readyClient.user.tag}`);
});

/*
 * =========================
 * Member Logs
 * =========================
 */

client.on(Events.GuildMemberAdd, async (member) => {
  console.log("guildMemberAdd FIRED", member.user.username);

  try {
    await giveAutoRole(member);

    await sendWelcomeMessage(member.guild, member);

    await sendMemberJoinLog(
      member.guild,
      member.user.username,
      member.toString(),
      member.id,
      member.user.createdAt,
      member.guild.memberCount,
    );
  } catch (error) {
    console.error(
      `Could not handle member join for ${member.user.tag} in ${member.guild.name}:`,
      error,
    );
  }
});

client.on(Events.GuildMemberRemove, async (member) => {
  try {
    await sendMemberLeaveLog(
      member.guild,
      member.user.username,
      member.id,
      member.guild.memberCount,
    );
  } catch (error) {
    console.error(
      `Could not handle member leave for ${member.user.tag} in ${member.guild.name}:`,
      error,
    );
  }
});

/*
 * =========================
 * Message Logs
 * =========================
 */

client.on(Events.MessageDelete, async (message) => {
  try {
    if (!message.guild) {
      return;
    }

    if (message.author?.bot) {
      return;
    }

    await sendMessageDeleteLog(
      message.guild,
      message,
    );
  } catch (error) {
    console.error("Message delete log error:", error);
  }
});

client.on(Events.MessageUpdate, async (oldMessage, newMessage) => {
  try {
    if (!newMessage.guild) {
      return;
    }

    if (newMessage.author?.bot) {
      return;
    }

    if (oldMessage.content === newMessage.content) {
      return;
    }

    await sendMessageEditLog(
      newMessage.guild,
      oldMessage,
      newMessage,
    );
  } catch (error) {
    console.error("Message edit log error:", error);
  }
});

/*
 * =========================
 * Voice Logs
 * =========================
 */

client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
  try {
    if (!newState.guild) {
      return;
    }

    if (newState.member?.user.bot) {
      return;
    }

    const memberMention =
      newState.member?.toString() ??
      oldState.member?.toString();

    const memberId =
      newState.member?.id ??
      oldState.member?.id;

    if (!memberMention || !memberId) {
      return;
    }

    if (!oldState.channelId && newState.channelId) {
      await sendVoiceJoinLog(
        newState.guild,
        memberMention,
        memberId,
        newState.channel?.name ?? "Unknown",
      );

      return;
    }

    if (oldState.channelId && !newState.channelId) {
      await sendVoiceLeaveLog(
        newState.guild,
        memberMention,
        memberId,
        oldState.channel?.name ?? "Unknown",
      );

      return;
    }

    if (
      oldState.channelId &&
      newState.channelId &&
      oldState.channelId !== newState.channelId
    ) {
      await sendVoiceMoveLog(
        newState.guild,
        memberMention,
        memberId,
        oldState.channel?.name ?? "Unknown",
        newState.channel?.name ?? "Unknown",
      );
    }
  } catch (error) {
    console.error("Voice log error:", error);
  }
});

/*
 * =========================
 * Channel Logs
 * =========================
 */

client.on(Events.ChannelCreate, async (channel) => {
  try {
    if (!channel.guild) {
      return;
    }

    await sendChannelLog(
      channel.guild,
      "تم إنشاء قناة",
      `<#${channel.id}>`,
      undefined,
      channel.name,
    );
  } catch (error) {
    console.error(
      "Channel create log error:",
      error,
    );
  }
});

client.on(Events.ChannelDelete, async (channel) => {
  try {
    if (!channel.guild) {
      return;
    }

    await sendChannelLog(
      channel.guild,
      "تم حذف قناة",
      `#${channel.name}`,
      channel.name,
    );
  } catch (error) {
    console.error(
      "Channel delete log error:",
      error,
    );
  }
});

client.on(
  Events.ChannelUpdate,
  async (oldChannel, newChannel) => {
    try {
      if (!newChannel.guild) {
        return;
      }

      /*
       * تغيير اسم القناة
       */

      if (oldChannel.name !== newChannel.name) {
        await sendChannelLog(
          newChannel.guild,
          "تم تغيير اسم قناة",
          `<#${newChannel.id}>`,
          oldChannel.name ?? "بدون اسم",
          newChannel.name,
        );
      }

      /*
       * تغيير الـCategory
       */

      if (
        oldChannel.parentId !==
        newChannel.parentId
      ) {
        const oldParent =
          oldChannel.parent?.name ??
          "بدون تصنيف";

        const newParent =
          newChannel.parent?.name ??
          "بدون تصنيف";

        await sendChannelLog(
          newChannel.guild,
          "تم تغيير تصنيف قناة",
          `<#${newChannel.id}>`,
          oldParent,
          newParent,
        );
      }
    } catch (error) {
      console.error(
        "Channel update log error:",
        error,
      );
    }
  },
);

/*
 * =========================
 * Interactions
 * =========================
 */

client.on(Events.InteractionCreate, async (interaction) => {
  /*
   * =========================
   * Permissions Manager
   * =========================
   */

  if (
    interaction.isRoleSelectMenu() ||
    interaction.isStringSelectMenu() ||
    interaction.isButton()
  ) {
    if (
      interaction.customId.startsWith("permissions_") ||
      interaction.customId.startsWith("permissions:")
    ) {
      try {
        await handlePermissionsInteraction(interaction);
      } catch (error) {
        console.error(
          "Permissions interaction error:",
          error,
        );

        if (
          !interaction.replied &&
          !interaction.deferred
        ) {
          await interaction.reply({
            content:
              "❌ حصل خطأ أثناء استخدام Permission Manager.",
            ephemeral: true,
          });
        }
      }

      return;
    }
  }

  /*
   * =========================
   * Ticket Buttons
   * =========================
   */

  if (interaction.isButton()) {
    const ticketButtons = [
      "ticket_select_type",
      "ticket_claim",
      "ticket_add_member",
      "ticket_close",
      "ticket_close_confirm",
      "ticket_close_cancel",
    ];

    if (
      ticketButtons.includes(
        interaction.customId,
      )
    ) {
      try {
        await handleTicketButton(interaction);
      } catch (error) {
        console.error(
          "Ticket button error:",
          error,
        );

        if (
          !interaction.replied &&
          !interaction.deferred
        ) {
          await interaction.reply({
            content:
              "❌ حصل خطأ أثناء تنفيذ العملية.",
            ephemeral: true,
          });
        }
      }

      return;
    }
  }

  /*
   * =========================
   * Ticket Select Menus
   * =========================
   */

  if (interaction.isStringSelectMenu()) {
    if (
      interaction.customId ===
      "ticket_type_menu"
    ) {
      try {
        await handleTicketSelectMenu(
          interaction,
        );
      } catch (error) {
        console.error(
          "Ticket type menu error:",
          error,
        );

        if (
          !interaction.replied &&
          !interaction.deferred
        ) {
          await interaction.reply({
            content:
              "❌ حصل خطأ أثناء إنشاء التكت.",
            ephemeral: true,
          });
        }
      }

      return;
    }
  }

  if (interaction.isUserSelectMenu()) {
    if (
      interaction.customId ===
      "ticket_add_member_menu"
    ) {
      try {
        await handleTicketSelectMenu(
          interaction,
        );
      } catch (error) {
        console.error(
          "Ticket add member menu error:",
          error,
        );

        if (
          !interaction.replied &&
          !interaction.deferred
        ) {
          await interaction.reply({
            content:
              "❌ حصل خطأ أثناء إضافة العضو.",
            ephemeral: true,
          });
        }
      }

      return;
    }
  }

  /*
   * =========================
   * Auto Role Select Menu
   * =========================
   */

  if (interaction.isRoleSelectMenu()) {
    if (
      interaction.customId ===
      "autorole_select"
    ) {
      if (!interaction.guild) {
        await interaction.reply({
          content:
            "❌ الأمر ده لازم يتستخدم داخل السيرفر.",
          ephemeral: true,
        });

        return;
      }

      if (!interaction.member) {
        await interaction.reply({
          content:
            "❌ مش قادر أحدد العضو.",
          ephemeral: true,
        });

        return;
      }

      if (
        !hasBotPermission(
          interaction.guild.id,
          interaction.member,
          "roles.autorole",
        )
      ) {
        await interaction.reply({
          content:
            "❌ مش مسموح لك تستخدم Permission **Auto Role**.",
          ephemeral: true,
        });

        return;
      }

      const roleId =
        interaction.values[0];

      const role =
        interaction.guild.roles.cache.get(
          roleId,
        );

      if (!role) {
        await interaction.update({
          content:
            "❌ مش قادر ألاقي الرول دي.",
          components: [],
        });

        return;
      }

      const botMember =
        interaction.guild.members.me;

      if (!botMember) {
        await interaction.update({
          content:
            "❌ مش قادر أحدد صلاحيات البوت.",
          components: [],
        });

        return;
      }

      if (
        role.id ===
        interaction.guild.id
      ) {
        await interaction.update({
          content:
            "❌ مينفعش تستخدم @everyone كـAuto Role.",
          components: [],
        });

        return;
      }

      if (role.managed) {
        await interaction.update({
          content:
            "❌ الرول دي Managed ومينفعش البوت يديها للأعضاء.",
          components: [],
        });

        return;
      }

      if (
        role.position >=
        botMember.roles.highest.position
      ) {
        await interaction.update({
          content:
            "❌ البوت مينفعش يدي الرول دي لأن الرول أعلى من أو مساوية لأعلى رول عند البوت.",
          components: [],
        });

        return;
      }

      /*
       * حفظ الـAuto Role
       */

      setAutoRole(
        interaction.guild,
        role,
      );

      /*
       * إعطاء الرول لكل الأعضاء الموجودين حاليًا
       */

      await interaction.update({
        content:
          `⏳ جاري إعطاء ${role} كـ **Auto Role** للأعضاء الموجودين حاليًا...\n\n` +
          "ممكن العملية تاخد شوية وقت لو السيرفر فيه أعضاء كتير.",
        components: [],
      });

      const result =
        await giveAutoRoleToExistingMembers(
          interaction.guild,
          role,
        );

      if (!result) {
        await interaction.editReply({
          content:
            `❌ حصل خطأ أثناء إعطاء ${role} للأعضاء الموجودين.\n\n` +
            "الـAuto Role اتحدد، والأعضاء الجدد هياخدوه تلقائيًا.",
          components: [],
        });

        return;
      }

      await interaction.editReply({
        content:
          `✅ تم تحديد ${role} كـ **Auto Role**.\n\n` +
          `👥 تم إعطاء الرول لـ **${result.addedCount}** عضو موجود حاليًا.\n` +
          `⏭️ تم تخطي **${result.skippedCount}** عضو لأن الرول موجودة عندهم بالفعل أو لا يمكن إعطاؤها.\n` +
          `❌ فشل إعطاء الرول لـ **${result.failedCount}** عضو.\n\n` +
          "👤 أي عضو جديد يدخل السيرفر هياخد الرول تلقائيًا.",
        components: [],
      });

      return;
    }
  }

  /*
   * =========================
   * Slash Commands
   * =========================
   */

  if (!interaction.isChatInputCommand()) {
    return;
  }

  const command = commands.find(
    (registeredCommand) =>
      registeredCommand.data.name ===
      interaction.commandName,
  );

  if (!command) {
    return;
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(
      `Command failed: /${interaction.commandName}`,
      error,
    );

    await replyWithError(interaction);
  }
});

/*
 * =========================
 * Systems
 * =========================
 */

registerWarningSystem(client);
registerTimeoutSystem(client);
registerRemovalSystem(client);
registerNicknameSystem(client);
registerBanSystem(client);
registerSaySystem(client);
registerAntiSpam(client);
registerLockSystem(client);
registerClearSystem(client);
registerRoleSystem(client);
registerAntiLink(client);
registerAntiMassMention(client);
registerAutoCleanupSystem(client);

async function replyWithError(
  interaction: ChatInputCommandInteraction,
) {
  const message =
    "Something went wrong while running that command.";

  if (
    interaction.replied ||
    interaction.deferred
  ) {
    await interaction.followUp({
      content: message,
      ephemeral: true,
    });

    return;
  }

  await interaction.reply({
    content: message,
    ephemeral: true,
  });
}

async function shutdown(signal: string) {
  console.info(
    `Received ${signal}; shutting down.`,
  );

  client.destroy();

  process.exit(0);
}

process.once("SIGINT", () =>
  void shutdown("SIGINT"),
);

process.once("SIGTERM", () =>
  void shutdown("SIGTERM"),
);

const { token } = getBotConfig();

await client.login(token);
