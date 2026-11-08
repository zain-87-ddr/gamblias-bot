
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ModalBuilder,
  StringSelectMenuBuilder,
  TextInputBuilder,
  TextInputStyle,
  PermissionFlagsBits,
  SlashCommandBuilder,
  type ButtonInteraction,
  type ChatInputCommandInteraction,
  type ModalSubmitInteraction,
  type StringSelectMenuInteraction,
} from "discord.js";

import type { BotCommand } from "../types/command.js";
import {
  getEmbedStyle,
  saveEmbedStyle,
  type EmbedStyle,
  type EmbedTemplate,
} from "../embeds/store.js";

const TEMPLATES: { name: string; value: EmbedTemplate }[] = [
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

type EditorInteraction =
  | ButtonInteraction
  | StringSelectMenuInteraction
  | ModalSubmitInteraction;

const drafts = new Map<string, Draft>();

function validUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function buildPreview(style: EmbedStyle): EmbedBuilder {
  const embed = new EmbedBuilder();

  if (style.title !== undefined) {
    embed.setTitle(style.title || null);
  }

  if (style.description !== undefined) {
    embed.setDescription(style.description || null);
  }

  if (style.author !== undefined) {
    embed.setAuthor(
      style.author.name
        ? {
            name: style.author.name,
            ...(style.author.url ? { url: style.author.url } : {}),
            ...(style.author.iconURL
              ? { iconURL: style.author.iconURL }
              : {}),
          }
        : null,
    );
  }

  if (style.footer !== undefined) {
    embed.setFooter(
      style.footer.text
        ? {
            text: style.footer.text,
            ...(style.footer.iconURL
              ? { iconURL: style.footer.iconURL }
              : {}),
          }
        : null,
    );
  }

  if (style.image !== undefined) {
    embed.setImage(style.image || null);
  }

  if (style.thumbnail !== undefined) {
    embed.setThumbnail(style.thumbnail || null);
  }

  if (style.color !== undefined) {
    embed.setColor(style.color);
  }

  if (style.fields?.length) {
    embed.addFields(...style.fields);
  }

  if (
    !embed.data.title &&
    !embed.data.description &&
    !embed.data.fields?.length
  ) {
    embed.setDescription("Your embed preview will appear here.");
  }

  return embed;
}

function buildEditor(draftId: string, draft: Draft) {
  const templateMenu = new StringSelectMenuBuilder()
    .setCustomId(`embed_template:${draftId}`)
    .setPlaceholder("Choose the message to customize")
    .addOptions(
      TEMPLATES.map((item) => ({
        label: item.name,
        value: item.value,
        default: item.value === draft.template,
      })),
    );

  const row1 = new ActionRowBuilder<StringSelectMenuBuilder>()
    .addComponents(templateMenu);

  const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`embed_edit:title:${draftId}`)
      .setLabel("Title")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`embed_edit:description:${draftId}`)
      .setLabel("Description")
      .setStyle(ButtonStyle.Secondary),
  );

  const row3 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`embed_edit:author:${draftId}`)
      .setLabel("Author")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`embed_edit:footer:${draftId}`)
      .setLabel("Footer")
      .setStyle(ButtonStyle.Secondary),
  );

  const row4 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`embed_edit:image:${draftId}`)
      .setLabel("Image / GIF")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`embed_edit:thumbnail:${draftId}`)
      .setLabel("Thumbnail")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`embed_edit:color:${draftId}`)
      .setLabel("Color")
      .setStyle(ButtonStyle.Secondary),
  );

  const row5 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`embed_edit:field:${draftId}`)
      .setLabel("Add Field")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`embed_edit:inline:${draftId}`)
      .setLabel("Add Inline Field")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`embed_save:${draftId}`)
      .setLabel("Save")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`embed_cancel:${draftId}`)
      .setLabel("Cancel")
      .setStyle(ButtonStyle.Danger),
  );

  return {
    embeds: [buildPreview(draft.style)],
    components: [row1, row2, row3, row4, row5],
  };
}

function createInput(
  id: string,
  label: string,
  value?: string,
  style: TextInputStyle = TextInputStyle.Short,
  required = false,
  maxLength = 4000,
) {
  const input = new TextInputBuilder()
    .setCustomId(id)
    .setLabel(label)
    .setStyle(style)
    .setRequired(required)
    .setMaxLength(maxLength);

  if (value) {
    input.setValue(value);
  }

  return input;
}

function createModal(
  draftId: string,
  action: string,
  title: string,
  inputs: TextInputBuilder[],
) {
  const modal = new ModalBuilder()
    .setCustomId(`embed_modal:${action}:${draftId}`)
    .setTitle(title);

  for (const input of inputs) {
    modal.addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(input),
    );
  }

  return modal;
}

export const embedCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("embed")
    .setDescription("Open the Gamblias embed editor.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild.toString()),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) {
      await interaction.reply({
        content: "This command can only be used inside a server.",
        ephemeral: true,
      });
      return;
    }

    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
      await interaction.reply({
        content: "You need Manage Server permission to use this command.",
        ephemeral: true,
      });
      return;
    }

    const draftId = interaction.id.slice(-12);
    const template: EmbedTemplate = "warning";

    const draft: Draft = {
      userId: interaction.user.id,
      guildId: interaction.guild.id,
      template,
      style: structuredClone(
        getEmbedStyle(interaction.guild.id, template) ?? {},
      ),
    };

    drafts.set(draftId, draft);

    await interaction.reply({
      content:
        "**Gamblias — Embed Studio**\nChoose a message, then use the buttons to customize its embed. The preview updates automatically.",
      ...buildEditor(draftId, draft),
      ephemeral: true,
    });
  },
};

export async function handleEmbedInteraction(
  interaction: EditorInteraction,
): Promise<boolean> {
  const customId = interaction.customId;

  if (!customId.startsWith("embed_")) {
    return false;
  }

  const parts = customId.split(":");
  const prefix = parts[0];

  let draftId: string | undefined;

  if (prefix === "embed_template") {
    draftId = parts[1];
  } else if (prefix === "embed_edit" || prefix === "embed_modal") {
    draftId = parts[2];
  } else if (prefix === "embed_save" || prefix === "embed_cancel") {
    draftId = parts[1];
  } else {
    return false;
  }

  if (!draftId) {
    return false;
  }

  const draft = drafts.get(draftId);

  if (!draft) {
    await interaction.reply({
      content: "This editor has expired. Run /embed again.",
      ephemeral: true,
    });
    return true;
  }

  if (draft.userId !== interaction.user.id) {
    await interaction.reply({
      content: "Only the person who opened this editor can use it.",
      ephemeral: true,
    });
    return true;
  }

  if (interaction.isStringSelectMenu()) {
    if (prefix !== "embed_template") {
      return false;
    }

    const template = interaction.values[0] as EmbedTemplate;

    if (!TEMPLATES.some((item) => item.value === template)) {
      await interaction.reply({
        content: "Unknown embed template.",
        ephemeral: true,
      });
      return true;
    }

    draft.template = template;
    draft.style = structuredClone(
      getEmbedStyle(draft.guildId, template) ?? {},
    );

    await interaction.update({
      content: `**Gamblias — Embed Studio**\nEditing: **${template}**`,
      ...buildEditor(draftId, draft),
    });

    return true;
  }

  if (interaction.isButton()) {
    if (prefix === "embed_save") {
      saveEmbedStyle(draft.guildId, draft.template, draft.style);
      drafts.delete(draftId);

      await interaction.update({
        content: `Saved the embed design for **${draft.template}**.`,
        embeds: [],
        components: [],
      });

      return true;
    }

    if (prefix === "embed_cancel") {
      drafts.delete(draftId);

      await interaction.update({
        content: "Embed editor closed. No changes were saved.",
        embeds: [],
        components: [],
      });

      return true;
    }

    if (prefix !== "embed_edit") {
      return false;
    }

    const editAction = parts[1];

    const modal = (() => {
      switch (editAction) {
        case "title":
          return createModal(draftId, "title", "Edit Title", [
            createInput(
              "value",
              "Title",
              draft.style.title,
              TextInputStyle.Short,
              false,
              256,
            ),
          ]);

        case "description":
          return createModal(draftId, "description", "Edit Description", [
            createInput(
              "value",
              "Description",
              draft.style.description,
              TextInputStyle.Paragraph,
              false,
              4000,
            ),
          ]);

        case "author":
          return createModal(draftId, "author", "Edit Author", [
            createInput("name", "Author name", draft.style.author?.name, TextInputStyle.Short, false, 256),
            createInput("url", "Author URL (optional)", draft.style.author?.url, TextInputStyle.Short, false, 500),
            createInput("icon", "Author icon URL (optional)", draft.style.author?.iconURL, TextInputStyle.Short, false, 500),
          ]);

        case "footer":
          return createModal(draftId, "footer", "Edit Footer", [
            createInput("text", "Footer text", draft.style.footer?.text, TextInputStyle.Short, false, 2048),
            createInput("icon", "Footer icon URL (optional)", draft.style.footer?.iconURL, TextInputStyle.Short, false, 500),
          ]);

        case "image":
        case "thumbnail":
          return createModal(
            draftId,
            editAction,
            editAction === "image" ? "Edit Image / GIF" : "Edit Thumbnail",
            [
              createInput(
                "url",
                "Image URL (leave empty to remove)",
                editAction === "image"
                  ? draft.style.image
                  : draft.style.thumbnail,
                TextInputStyle.Short,
                false,
                500,
              ),
            ],
          );

        case "color":
          return createModal(draftId, "color", "Edit Embed Color", [
            createInput(
              "value",
              "Hex color, e.g. #5865F2",
              draft.style.color === undefined
                ? ""
                : `#${draft.style.color.toString(16).padStart(6, "0")}`,
              TextInputStyle.Short,
              false,
              7,
            ),
          ]);

        case "field":
        case "inline":
          return createModal(
            draftId,
            editAction,
            editAction === "inline" ? "Add Inline Field" : "Add Field",
            [
              createInput("name", "Field name", undefined, TextInputStyle.Short, true, 256),
              createInput("value", "Field value", undefined, TextInputStyle.Paragraph, true, 1024),
            ],
          );

        default:
          return null;
      }
    })();

    if (!modal) {
      return false;
    }

    await interaction.showModal(modal);
    return true;
  }

  if (interaction.isModalSubmit()) {
    if (prefix !== "embed_modal") {
      return false;
    }

    const modalAction = parts[1];
    const get = (id: string) =>
      interaction.fields.getTextInputValue(id).trim();

    switch (modalAction) {
      case "title":
        draft.style.title = get("value");
        break;

      case "description":
        draft.style.description = get("value");
        break;

      case "author": {
        const name = get("name");
        const url = get("url");
        const iconURL = get("icon");

        if ((url && !validUrl(url)) || (iconURL && !validUrl(iconURL))) {
          await interaction.reply({
            content: "Author URLs must be valid HTTP or HTTPS links.",
            ephemeral: true,
          });
          return true;
        }

        draft.style.author = {
          name,
          ...(url ? { url } : {}),
          ...(iconURL ? { iconURL } : {}),
        };
        break;
      }

      case "footer": {
        const text = get("text");
        const iconURL = get("icon");

        if (iconURL && !validUrl(iconURL)) {
          await interaction.reply({
            content: "Footer icon must be a valid HTTP or HTTPS URL.",
            ephemeral: true,
          });
          return true;
        }

        draft.style.footer = {
          text,
          ...(iconURL ? { iconURL } : {}),
        };
        break;
      }

      case "image":
      case "thumbnail": {
        const url = get("url");

        if (url && !validUrl(url)) {
          await interaction.reply({
            content: "Use a valid HTTP or HTTPS image URL.",
            ephemeral: true,
          });
          return true;
        }

        if (modalAction === "image") {
          draft.style.image = url;
        } else {
          draft.style.thumbnail = url;
        }
        break;
      }

      case "color": {
        const value = get("value");

        if (value) {
          const normalized = value.replace(/^#/, "");

          if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
            await interaction.reply({
              content: "Invalid color. Example: #5865F2",
              ephemeral: true,
            });
            return true;
          }

          draft.style.color = Number.parseInt(normalized, 16);
        } else {
          delete draft.style.color;
        }
        break;
      }

      case "field":
      case "inline": {
        const name = get("name");
        const value = get("value");

        draft.style.fields ??= [];

        if (draft.style.fields.length >= 25) {
          await interaction.reply({
            content: "Discord allows a maximum of 25 fields in one embed.",
            ephemeral: true,
          });
          return true;
        }

        draft.style.fields.push({
          name,
          value,
          inline: modalAction === "inline",
        });
        break;
      }

      default:
        return false;
    }

    await interaction.update({
      content: `**Gamblias — Embed Studio**\nEditing: **${draft.template}**`,
      ...buildEditor(draftId, draft),
    });

    return true;
  }

  return false;
}
