import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type ButtonInteraction,
  type GuildMember,
  type StringSelectMenuInteraction,
  type UserSelectMenuInteraction,
} from "discord.js";

import { hasBotPermission } from "../permissions/permissions.ts";
import { sendTicketLog } from "../logs/index.ts";

import {
  TICKET_PANEL_BUTTON,
  TICKET_TYPE_MENU,
  TICKET_CLAIM_BUTTON,
  TICKET_ADD_MEMBER_BUTTON,
  TICKET_CLOSE_BUTTON,
  TICKET_ADD_MEMBER_MENU,
  createAddMemberMenu,
  createTicketTypeMenu,
  createTicket,
} from "./ticket.js";

const TICKET_TYPES: Record<string, string> = {
  complaint: "📢 شكوى",
  staff_application: "🛡️ تقديم إدارة",
  suggestion: "💡 اقتراح",
  girls_verification: "👩 توثيق بنات",
  inquiry: "❓ استفسار",
};

function hasTicketPermission(member: GuildMember) {
  return hasBotPermission(
    member.guild.id,
    member,
    "management.tickets",
  );
}

export async function handleTicketButton(
  interaction: ButtonInteraction,
) {
  if (!interaction.guild) return;

  if (interaction.customId === TICKET_PANEL_BUTTON) {
    await interaction.reply({
      content: "🎫 اختار نوع التكت من القائمة بالأسفل.",
      components: [createTicketTypeMenu()],
      ephemeral: true,
    });

    return;
  }

  if (
    !hasTicketPermission(
      interaction.member as GuildMember,
    )
  ) {
    await interaction.reply({
      content:
        "❌ مش مسموح لك تستخدم Permission **Tickets**.",
      ephemeral: true,
    });

    return;
  }

  if (interaction.customId === TICKET_CLAIM_BUTTON) {
    const channel = interaction.channel;

    if (!channel || !channel.isTextBased()) return;

    await interaction.update({
      content: `🙋 **تم استلام التكت بواسطة ${interaction.user}.**`,
      components: [
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId(TICKET_CLAIM_BUTTON)
            .setLabel("تم استلام التكت")
            .setEmoji("🙋")
            .setStyle(ButtonStyle.Success)
            .setDisabled(true),

          new ButtonBuilder()
            .setCustomId(TICKET_ADD_MEMBER_BUTTON)
            .setLabel("إضافة عضو")
            .setEmoji("➕")
            .setStyle(ButtonStyle.Secondary),

          new ButtonBuilder()
            .setCustomId(TICKET_CLOSE_BUTTON)
            .setLabel("قفل التكت")
            .setEmoji("🔒")
            .setStyle(ButtonStyle.Danger),
        ),
      ],
    });

    await sendTicketLog(
      interaction.guild,
      "تم استلام تكت",
      `${channel}`,
      undefined,
      interaction.user.toString(),
    );

    return;
  }

  if (interaction.customId === TICKET_ADD_MEMBER_BUTTON) {
    await interaction.reply({
      content: "👤 اختار العضو اللي عايز تضيفه للتكت.",
      components: [createAddMemberMenu()],
      ephemeral: true,
    });

    return;
  }

  if (interaction.customId === TICKET_CLOSE_BUTTON) {
    const channel = interaction.channel;

    if (!channel || !channel.isTextBased()) return;

    const confirmButton = new ButtonBuilder()
      .setCustomId("ticket_close_confirm")
      .setLabel("تأكيد الإغلاق")
      .setEmoji("✅")
      .setStyle(ButtonStyle.Danger);

    const cancelButton = new ButtonBuilder()
      .setCustomId("ticket_close_cancel")
      .setLabel("إلغاء")
      .setEmoji("❌")
      .setStyle(ButtonStyle.Secondary);

    const row =
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        confirmButton,
        cancelButton,
      );

    await interaction.reply({
      content: "🔒 هل أنت متأكد من قفل التكت؟",
      components: [row],
      ephemeral: true,
    });

    return;
  }

  if (interaction.customId === "ticket_close_cancel") {
    await interaction.update({
      content: "❌ تم إلغاء قفل التكت.",
      components: [],
    });

    return;
  }

  if (interaction.customId === "ticket_close_confirm") {
    const channel = interaction.channel;

    if (!channel || !channel.isTextBased()) return;

    // نسجل قبل حذف القناة
    await sendTicketLog(
      interaction.guild,
      "تم قفل تكت",
      `#${channel.name} (\`${channel.id}\`)`,
      undefined,
      interaction.user.toString(),
    );

    await interaction.update({
      content: "🔒 جاري قفل التكت...",
      components: [],
    });

    setTimeout(async () => {
      try {
        await channel.delete("Ticket closed");
      } catch (error) {
        console.error(
          "Could not delete ticket:",
          error,
        );
      }
    }, 3000);
  }
}

export async function handleTicketSelectMenu(
  interaction:
    | StringSelectMenuInteraction
    | UserSelectMenuInteraction,
) {
  if (!interaction.guild) return;

  if (interaction.customId === TICKET_TYPE_MENU) {
    const selectedType = interaction.values[0];
    const ticketTypeName = TICKET_TYPES[selectedType];

    if (!ticketTypeName) {
      await interaction.reply({
        content: "❌ نوع التكت غير معروف.",
        ephemeral: true,
      });

      return;
    }

    const member =
      await interaction.guild.members.fetch(
        interaction.user.id,
      );

    try {
      const ticket = await createTicket(
        interaction.guild,
        member,
        selectedType,
        ticketTypeName,
      );

      await interaction.update({
        content: `✅ تم إنشاء التكت: ${ticket}`,
        components: [],
      });
    } catch (error) {
      console.error(
        "Could not create ticket:",
        error,
      );

      await interaction.update({
        content:
          "❌ حصل خطأ أثناء إنشاء التكت.",
        components: [],
      });
    }

    return;
  }

  if (
    interaction.customId === TICKET_ADD_MEMBER_MENU
  ) {
    if (
      !hasTicketPermission(
        interaction.member as GuildMember,
      )
    ) {
      await interaction.update({
        content:
          "❌ مش مسموح لك تستخدم Permission **Tickets**.",
        components: [],
      });

      return;
    }

    const channel = interaction.channel;

    if (!channel || !channel.isTextBased()) {
      await interaction.update({
        content:
          "❌ مش قادر أوصل للتكت.",
        components: [],
      });

      return;
    }

    const userId = interaction.values[0];

    try {
      await channel.permissionOverwrites.create(
        userId,
        {
          ViewChannel: true,
          SendMessages: true,
          ReadMessageHistory: true,
        },
      );

      await interaction.update({
        content:
          `✅ تم إضافة <@${userId}> للتكت.`,
        components: [],
      });

      await channel.send(
        `➕ تم إضافة <@${userId}> للتكت بواسطة ${interaction.user}.`,
      );

      await sendTicketLog(
        interaction.guild,
        "تم إضافة عضو للتكت",
        `${channel}`,
        `<@${userId}>`,
        interaction.user.toString(),
      );
    } catch (error) {
      console.error(
        "Could not add member to ticket:",
        error,
      );

      await interaction.update({
        content:
          "❌ حصل خطأ أثناء إضافة العضو.",
        components: [],
      });
    }
  }
}
