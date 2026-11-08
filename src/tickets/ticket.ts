import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  EmbedBuilder,
  PermissionFlagsBits,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  UserSelectMenuBuilder,
  type Guild,
  type GuildMember,
  type TextChannel,
} from "discord.js";

import { sendTicketLog } from "../logs/index.ts";
import { applyEmbedStyle } from "../embeds/store.ts";

export const TICKET_PANEL_BUTTON = "ticket_select_type";
export const TICKET_TYPE_MENU = "ticket_type_menu";

export const TICKET_CLAIM_BUTTON = "ticket_claim";
export const TICKET_ADD_MEMBER_BUTTON = "ticket_add_member";
export const TICKET_CLOSE_BUTTON = "ticket_close";

export const TICKET_ADD_MEMBER_MENU = "ticket_add_member_menu";

const TICKET_CATEGORY_ID = "";
const TICKET_STAFF_ROLE_ID = "";

export async function sendTicketPanel(channel: TextChannel) {
  const embed = applyEmbedStyle(
    channel.guild.id,
    "ticket-panel",
    new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle("🎫 Ticket System")
      .setDescription(
        "قبل ما تفتح تذكرة، اختار النوع المناسب لمشكلتك عشان نقدر نساعدك بشكل أسرع.\n\n" +
          "### 📢 شكوى\n" +
          "لو عندك شكوى على عضو أو موقف حصل داخل السيرفر وتحتاج تدخل الإدارة.\n\n" +
          "### 🛡️ تقديم إدارة\n" +
          "لو حابب تقدم على رتبة إدارية أو تنضم لفريق الإدارة.\n\n" +
          "### 💡 اقتراح\n" +
          "عندك فكرة أو اقتراح لتطوير السيرفر أو إضافة حاجة جديدة؟ شاركنا بيها هنا.\n\n" +
          "### 👩 توثيق بنات\n" +
          "لو محتاجة توثيق حسابك كعضوة، افتحي تذكرة من النوع ده وسيتم توجيهك للخطوات المطلوبة.\n\n" +
          "### ❓ استفسار\n" +
          "لو عندك أي سؤال أو محتاج تعرف حاجة بخصوص السيرفر، افتح تذكرة من النوع ده.\n\n" +
          "> 🎫 **اختار نوع التكت من الزر الموجود بالأسفل.**\n" +
          "> ⚠️ من فضلك افتح تذكرة واحدة فقط للموضوع الواحد.",
      )
      .setFooter({ text: "Gamblias • Ticket System" }),
    {
      server: channel.guild.name,
    },
  );

  const button = new ButtonBuilder()
    .setCustomId(TICKET_PANEL_BUTTON)
    .setLabel("اختيار نوع التكت")
    .setEmoji("🎫")
    .setStyle(ButtonStyle.Primary);

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(button);

  await channel.send({
    embeds: [embed],
    components: [row],
  });
}

export function createTicketTypeMenu() {
  const menu = new StringSelectMenuBuilder()
    .setCustomId(TICKET_TYPE_MENU)
    .setPlaceholder("🎫 اختر نوع التكت")
    .addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel("شكوى")
        .setDescription("تقديم شكوى على عضو أو موقف داخل السيرفر")
        .setEmoji("📢")
        .setValue("complaint"),

      new StringSelectMenuOptionBuilder()
        .setLabel("تقديم إدارة")
        .setDescription("التقديم على رتبة أو فريق الإدارة")
        .setEmoji("🛡️")
        .setValue("staff_application"),

      new StringSelectMenuOptionBuilder()
        .setLabel("اقتراح")
        .setDescription("اقتراح لتطوير السيرفر أو إضافة شيء جديد")
        .setEmoji("💡")
        .setValue("suggestion"),

      new StringSelectMenuOptionBuilder()
        .setLabel("توثيق بنات")
        .setDescription("فتح تذكرة لتوثيق الحساب كعضوة")
        .setEmoji("👩")
        .setValue("girls_verification"),

      new StringSelectMenuOptionBuilder()
        .setLabel("استفسار")
        .setDescription("أي سؤال أو استفسار بخصوص السيرفر")
        .setEmoji("❓")
        .setValue("inquiry"),
    );

  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu);
}

export function createTicketButtons() {
  const claimButton = new ButtonBuilder()
    .setCustomId(TICKET_CLAIM_BUTTON)
    .setLabel("استلام التكت")
    .setEmoji("🙋")
    .setStyle(ButtonStyle.Primary);

  const addMemberButton = new ButtonBuilder()
    .setCustomId(TICKET_ADD_MEMBER_BUTTON)
    .setLabel("إضافة عضو")
    .setEmoji("➕")
    .setStyle(ButtonStyle.Secondary);

  const closeButton = new ButtonBuilder()
    .setCustomId(TICKET_CLOSE_BUTTON)
    .setLabel("قفل التكت")
    .setEmoji("🔒")
    .setStyle(ButtonStyle.Danger);

  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    claimButton,
    addMemberButton,
    closeButton,
  );
}

export function createAddMemberMenu() {
  const menu = new UserSelectMenuBuilder()
    .setCustomId(TICKET_ADD_MEMBER_MENU)
    .setPlaceholder("👤 اختر العضو الذي تريد إضافته للتكت")
    .setMinValues(1)
    .setMaxValues(1);

  return new ActionRowBuilder<UserSelectMenuBuilder>().addComponents(menu);
}

export async function createTicket(
  guild: Guild,
  member: GuildMember,
  ticketType: string,
  ticketTypeName: string,
) {
  const existingTicket = guild.channels.cache.find(
    (channel) =>
      channel.type === ChannelType.GuildText &&
      channel.topic?.includes(`ticket-owner:${member.id}`),
  );

  if (existingTicket) {
    return existingTicket;
  }

  const channelName = `ticket-${member.user.username
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, "")
    .slice(0, 20)}`;

  const permissionOverwrites = [
    {
      id: guild.roles.everyone.id,
      deny: [PermissionFlagsBits.ViewChannel],
    },
    {
      id: member.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
      ],
    },
    {
      id: guild.members.me!.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.ManageChannels,
        PermissionFlagsBits.ManageMessages,
      ],
    },
  ];

  if (TICKET_STAFF_ROLE_ID) {
    permissionOverwrites.push({
      id: TICKET_STAFF_ROLE_ID,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
      ],
    });
  }

  const channel = await guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    parent: TICKET_CATEGORY_ID || undefined,
    topic: `ticket-owner:${member.id} ticket-type:${ticketType}`,
    permissionOverwrites,
  });

  const embed = applyEmbedStyle(
    guild.id,
    "ticket-open",
    new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(`🎫 ${ticketTypeName}`)
      .setDescription(
        `**👤 صاحب التكت:** ${member}\n` +
          `**📂 نوع التكت:** ${ticketTypeName}\n\n` +
          "اكتب مشكلتك أو طلبك بالتفصيل، وسيقوم أحد أفراد الإدارة بمساعدتك.\n\n" +
          "🙋 يمكن لأحد أفراد الإدارة استلام التكت.\n" +
          "➕ يمكن للإدارة إضافة عضو آخر للتكت عند الحاجة.\n" +
          "🔒 يمكن للإدارة قفل التكت بعد انتهاء الموضوع.",
      )
      .setThumbnail(
        member.displayAvatarURL({
          extension: "png",
          size: 256,
        }),
      )
      .setTimestamp(),
    {
      member: member.toString(),
      ticket: ticketTypeName,
      channel: channel.toString(),
    },
  );

  await channel.send({
    content: `${member}`,
    embeds: [embed],
    components: [createTicketButtons()],
  });

  await sendTicketLog(
    guild,
    "تم إنشاء تكت",
    `${channel} (\`${channel.id}\`)`,
    member.toString(),
    undefined,
    `النوع: ${ticketTypeName}`,
  );

  return channel;
}
