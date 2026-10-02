import {
  Client,
  Events,
  GatewayIntentBits,
  type ChatInputCommandInteraction,
} from "discord.js";

import { registerClearSystem } from "./clear/index.ts";
import { registerAutoCleanupSystem } from "./cleanup/index.ts";
import { registerAntiLink } from "./automod/anti-link.ts";
import { registerAntiMassMention } from "./automod/anti-mass-mention.ts";
import { registerAntiSpam } from "./automod/anti-spam.ts";
import { registerBanSystem } from "./bans/index.ts";
import { commands } from "./commands/index.ts";
import { getBotConfig } from "./config.ts";

import {
  sendMemberJoinLog,
  sendMemberLeaveLog,
  sendMessageDeleteLog,
  sendMessageEditLog,
  sendVoiceJoinLog,
  sendVoiceLeaveLog,
  sendVoiceMoveLog,
} from "./logs/index.ts";

import { registerRemovalSystem } from "./removals/index.ts";
import { registerTimeoutSystem } from "./timeouts/index.ts";
import { sendWelcomeMessage } from "./welcome.ts";
import { registerWarningSystem } from "./warnings/index.ts";

import { giveAutoRole } from "./autorole/autorole.ts";

import {
  handleTicketButton,
  handleTicketSelectMenu,
} from "./tickets/ticketInteractions.ts";

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

client.on(Events.InteractionCreate, async (interaction) => {
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

    if (ticketButtons.includes(interaction.customId)) {
      try {
        await handleTicketButton(interaction);
      } catch (error) {
        console.error("Ticket button error:", error);

        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({
            content: "❌ حصل خطأ أثناء تنفيذ العملية.",
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
    if (interaction.customId === "ticket_type_menu") {
      try {
        await handleTicketSelectMenu(interaction);
      } catch (error) {
        console.error("Ticket type menu error:", error);

        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({
            content: "❌ حصل خطأ أثناء إنشاء التكت.",
            ephemeral: true,
          });
        }
      }

      return;
    }
  }

  if (interaction.isUserSelectMenu()) {
    if (interaction.customId === "ticket_add_member_menu") {
      try {
        await handleTicketSelectMenu(interaction);
      } catch (error) {
        console.error("Ticket add member menu error:", error);

        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({
            content: "❌ حصل خطأ أثناء إضافة العضو.",
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
    if (interaction.customId === "autorole_select") {
      if (!interaction.guild) {
        await interaction.reply({
          content: "❌ الأمر ده لازم يتستخدم داخل السيرفر.",
          ephemeral: true,
        });
        return;
      }

      if (
        !interaction.memberPermissions?.has(
          "Administrator",
        )
      ) {
        await interaction.reply({
          content: "❌ لازم تكون Administrator لاستخدام الإعداد ده.",
          ephemeral: true,
        });
        return;
      }

      const roleId = interaction.values[0];
      const role = interaction.guild.roles.cache.get(roleId);

      if (!role) {
        await interaction.update({
          content: "❌ مش قادر ألاقي الرول دي.",
          components: [],
        });
        return;
      }

      const botMember = interaction.guild.members.me;

      if (!botMember) {
        await interaction.update({
          content: "❌ مش قادر أحدد صلاحيات البوت.",
          components: [],
        });
        return;
      }

      if (role.id === interaction.guild.id) {
        await interaction.update({
          content: "❌ مينفعش تستخدم @everyone كـAuto Role.",
          components: [],
        });
        return;
      }

      if (role.managed) {
        await interaction.update({
          content: "❌ الرول دي Managed ومينفعش البوت يديها للأعضاء.",
          components: [],
        });
        return;
      }

      if (role.position >= botMember.roles.highest.position) {
        await interaction.update({
          content:
            "❌ البوت مينفعش يدي الرول دي لأن الرول أعلى من أو مساوية لأعلى رول عند البوت.",
          components: [],
        });
        return;
      }

      const { setAutoRole } = await import(
        "./autorole/autorole.ts"
      );

      setAutoRole(interaction.guild, role);

      await interaction.update({
        content: `✅ تم تحديد ${role} كـ **Auto Role**.\n\nأي عضو جديد يدخل السيرفر هيتم إعطاؤه الرول تلقائيًا.`,
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
      registeredCommand.data.name === interaction.commandName,
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

registerWarningSystem(client);
registerTimeoutSystem(client);
registerRemovalSystem(client);
registerBanSystem(client);
registerAntiSpam(client);
registerClearSystem(client);
registerAntiLink(client);
registerAntiMassMention(client);
registerAutoCleanupSystem(client);

async function replyWithError(
  interaction: ChatInputCommandInteraction,
) {
  const message =
    "Something went wrong while running that command.";

  if (interaction.replied || interaction.deferred) {
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
  console.info(`Received ${signal}; shutting down.`);

  client.destroy();

  process.exit(0);
}

process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));

const { token } = getBotConfig();

await client.login(token);
