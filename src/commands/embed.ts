
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
  type ButtonInteraction,
  type ChatInputCommandInteraction,
} from "discord.js";

import type { BotCommand } from "../types/command.js";
import {
  saveEmbedStyle,
  type EmbedStyle,
  type EmbedTemplate,
} from "../embeds/store.js";

const TEMPLATES: {
  name: string;
  value: EmbedTemplate;
}[] = [
  { name: "Warning", value: "warning" },
  { name: "Maximum Warnings", value: "max-warning" },
  { name: "Timeout", value: "timeout" },
  { name: "Untimeout", value: "untimeout" },
  { name: "Ban", value: "ban" },
  { name: "Unban", value: "unban" },
  { name: "Clear", value: "clear" },
  { name: "Role Add", value: "role-add" },
  { name: "Role Remove", value: "role-remove" },
  { name: "Lock", value: "lock" },
  { name: "Unlock", value: "unlock" },
  { name: "Nickname", value: "nickname" },
  { name: "Ticket Panel", value: "ticket-panel" },
  { name: "Ticket Open", value: "ticket-open" },
];

type Draft = {
  userId: string;
  guildId: string;
  template: EmbedTemplate;
  style: EmbedStyle;
};

const drafts = new Map<string, Draft>();

function validUrl(value: string | null): string | undefined {
  if (!value) return undefined;

  try {
    const url = new URL(value);

    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return undefined;
    }

    return value;
  } catch {
    return undefined;
  }
}

function buildPreview(style: EmbedStyle): EmbedBuilder {
  const embed = new EmbedBuilder();

  if (style.title) embed.setTitle(style.title);
  if (style.description) embed.setDescription(style.description);
  if (style.footer) embed.setFooter({ text: style.footer });
  if (style.image) embed.setImage(style.image);
  if (style.thumbnail) embed.setThumbnail(style.thumbnail);
  if (style.color !== undefined) embed.setColor(style.color);

  return embed;
}

export const embedCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("embed")
    .setDescription("Customize Gamblias embed messages.")
    .setDefaultMemberPermissions(
      PermissionFlagsBits.ManageGuild.toString(),
    )
    .addStringOption((option) =>
      option
        .setName("template")
        .setDescription("Choose the message you want to customize.")
        .setRequired(true)
        .addChoices(
          ...TEMPLATES.map((item) => ({
            name: item.name,
            value: item.value,
          })),
        ),
    )
    .addStringOption((option) =>
      option.setName("title").setDescription("Embed title").setMaxLength(256),
    )
    .addStringOption((option) =>
      option.setName("description").setDescription("Embed description").setMaxLength(4000),
    )
    .addStringOption((option) =>
      option.setName("footer").setDescription("Embed footer").setMaxLength(2048),
    )
    .addStringOption((option) =>
      option.setName("image").setDescription("Image or GIF URL"),
    )
    .addStringOption((option) =>
      option.setName("thumbnail").setDescription("Thumbnail image URL"),
    )
    .addStringOption((option) =>
      option.setName("color").setDescription("Hex color, e.g. #5865F2"),
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) {
      await interaction.reply({
        content: "This command can only be used inside a server.",
        ephemeral: true,
      });
      return;
    }

    if (
      !interaction.memberPermissions?.has(
        PermissionFlagsBits.ManageGuild,
      )
    ) {
      await interaction.reply({
        content: "You need Manage Server permission to use this command.",
        ephemeral: true,
      });
      return;
    }

    const template = interaction.options.getString(
      "template",
      true,
    ) as EmbedTemplate;

    const imageInput = interaction.options.getString("image");
    const thumbnailInput = interaction.options.getString("thumbnail");
    const colorInput = interaction.options.getString("color");

    const image = validUrl(imageInput);
    const thumbnail = validUrl(thumbnailInput);

    if (imageInput && !image) {
      await interaction.reply({
        content: "Invalid image URL. Use a valid HTTP or HTTPS URL.",
        ephemeral: true,
      });
      return;
    }

    if (thumbnailInput && !thumbnail) {
      await interaction.reply({
        content: "Invalid thumbnail URL. Use a valid HTTP or HTTPS URL.",
        ephemeral: true,
      });
      return;
    }

    let color: number | undefined;

    if (colorInput) {
      const normalized = colorInput.replace(/^#/, "");

      if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
        await interaction.reply({
          content: "Invalid color. Example: #5865F2",
          ephemeral: true,
        });
        return;
      }

      color = Number.parseInt(normalized, 16);
    }

    const style: EmbedStyle = {};

    const title = interaction.options.getString("title");
    const description = interaction.options.getString("description");
    const footer = interaction.options.getString("footer");

    if (title !== null) style.title = title;
    if (description !== null) style.description = description;
    if (footer !== null) style.footer = footer;
    if (image !== undefined) style.image = image;
    if (thumbnail !== undefined) style.thumbnail = thumbnail;
    if (color !== undefined) style.color = color;

    if (Object.keys(style).length === 0) {
      await interaction.reply({
        content: "Add at least one style option before previewing.",
        ephemeral: true,
      });
      return;
    }

    const draftId = `${interaction.id.slice(-12)}`;
    drafts.set(draftId, {
      userId: interaction.user.id,
      guildId: interaction.guild.id,
      template,
      style,
    });

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`embed_save:${draftId}`)
        .setLabel("Save")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`embed_cancel:${draftId}`)
        .setLabel("Cancel")
        .setStyle(ButtonStyle.Secondary),
    );

    await interaction.reply({
      content: `Preview — ${template}`,
      embeds: [buildPreview(style)],
      components: [row],
      ephemeral: true,
    });
  },
};

export async function handleEmbedButton(
  interaction: ButtonInteraction,
): Promise<boolean> {
  if (
    !interaction.customId.startsWith("embed_save:") &&
    !interaction.customId.startsWith("embed_cancel:")
  ) {
    return false;
  }

  const [action, draftId] = interaction.customId.split(":");
  const draft = drafts.get(draftId);

  if (!draft) {
    await interaction.reply({
      content: "This preview has expired. Run /embed again.",
      ephemeral: true,
    });
    return true;
  }

  if (draft.userId !== interaction.user.id) {
    await interaction.reply({
      content: "Only the person who created this preview can use these buttons.",
      ephemeral: true,
    });
    return true;
  }

  if (action === "embed_cancel") {
    drafts.delete(draftId);

    await interaction.update({
      content: "Preview cancelled.",
      embeds: [],
      components: [],
    });

    return true;
  }

  saveEmbedStyle(
    draft.guildId,
    draft.template,
    draft.style,
  );

  drafts.delete(draftId);

  await interaction.update({
    content: `Saved customization for **${draft.template}**.`,
    embeds: [],
    components: [],
  });

  return true;
}
