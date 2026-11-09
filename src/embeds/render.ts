import {
  ContainerBuilder,
  EmbedBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  SectionBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  TextDisplayBuilder,
  ThumbnailBuilder,
  type APIEmbed,
} from "discord.js";

import {
  DEFAULT_EMBED_SEPARATORS,
  type EmbedSeparatorPosition,
} from "./store.ts";

type RenderableEmbed = EmbedBuilder | APIEmbed;

type EmbedWithSeparators = EmbedBuilder & {
  __gambliasSeparators?: EmbedSeparatorPosition[];
};

function getEmbedData(
  embed: RenderableEmbed,
): APIEmbed {
  return embed instanceof EmbedBuilder
    ? embed.toJSON()
    : embed;
}

function createSeparator(): SeparatorBuilder {
  return new SeparatorBuilder()
    .setDivider(true)
    .setSpacing(SeparatorSpacingSize.Small);
}

function hasSeparator(
  positions: EmbedSeparatorPosition[],
  position: EmbedSeparatorPosition,
): boolean {
  return positions.includes(position);
}

export function renderEmbedContainer(
  embed: RenderableEmbed,
  customSeparators?: EmbedSeparatorPosition[],
): ContainerBuilder {
  const data = getEmbedData(embed);

  const attachedSeparators =
    embed instanceof EmbedBuilder
      ? (embed as EmbedWithSeparators).__gambliasSeparators
      : undefined;

  const separators =
    customSeparators ??
    attachedSeparators ??
    DEFAULT_EMBED_SEPARATORS;

  const container = new ContainerBuilder();

  if (typeof data.color === "number") {
    container.setAccentColor(data.color);
  }

  const addSeparator = (
    position: EmbedSeparatorPosition,
  ) => {
    if (hasSeparator(separators, position)) {
      container.addSeparatorComponents(
        createSeparator(),
      );
    }
  };

  addSeparator("top");

  /*
   * Author
   */

  if (data.author?.name) {
    const authorName = data.author.url
      ? `[${data.author.name}](${data.author.url})`
      : data.author.name;

    const authorDisplay =
      new TextDisplayBuilder().setContent(
        `**${authorName}**`,
      );

    if (data.author.icon_url) {
      const section = new SectionBuilder()
        .addTextDisplayComponents(
          authorDisplay,
        )
        .setThumbnailAccessory(
          new ThumbnailBuilder()
            .setURL(data.author.icon_url)
            .setDescription(data.author.name),
        );

      container.addSectionComponents(section);
    } else {
      container.addTextDisplayComponents(
        authorDisplay,
      );
    }
  }

  addSeparator("after-author");

  /*
   * Title
   */

  let thumbnailUsed = false;

  if (data.title) {
    const title = data.url
      ? `[${data.title}](${data.url})`
      : data.title;

    const titleDisplay =
      new TextDisplayBuilder().setContent(
        `# ${title}`,
      );

    if (data.thumbnail?.url) {
      container.addSectionComponents(
        new SectionBuilder()
          .addTextDisplayComponents(
            titleDisplay,
          )
          .setThumbnailAccessory(
            new ThumbnailBuilder()
              .setURL(data.thumbnail.url)
              .setDescription(data.title),
          ),
      );

      thumbnailUsed = true;
    } else {
      container.addTextDisplayComponents(
        titleDisplay,
      );
    }
  }

  addSeparator("after-title");

  /*
   * Description
   */

  if (data.description) {
    const descriptionDisplay =
      new TextDisplayBuilder().setContent(
        data.description,
      );

    if (
      !data.title &&
      data.thumbnail?.url &&
      !thumbnailUsed
    ) {
      container.addSectionComponents(
        new SectionBuilder()
          .addTextDisplayComponents(
            descriptionDisplay,
          )
          .setThumbnailAccessory(
            new ThumbnailBuilder()
              .setURL(data.thumbnail.url)
              .setDescription("Embed thumbnail"),
          ),
      );

      thumbnailUsed = true;
    } else {
      container.addTextDisplayComponents(
        descriptionDisplay,
      );
    }
  }

  addSeparator("after-description");

  /*
   * Thumbnail without title or description
   */

  if (
    data.thumbnail?.url &&
    !thumbnailUsed
  ) {
    container.addMediaGalleryComponents(
      new MediaGalleryBuilder().addItems(
        new MediaGalleryItemBuilder()
          .setURL(data.thumbnail.url)
          .setDescription("Embed thumbnail"),
      ),
    );
  }

  /*
   * Fields
   */

  const fields = data.fields ?? [];
  let inlineFields: string[] = [];

  const flushInlineFields = () => {
    if (inlineFields.length === 0) {
      return;
    }

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        inlineFields.join("\n\n"),
      ),
    );

    inlineFields = [];
  };

  for (let index = 0; index < fields.length; index++) {
    const field = fields[index];

    const fieldText =
      `**${field.name}**\n${field.value}`;

    if (field.inline) {
      inlineFields.push(fieldText);
    } else {
      flushInlineFields();

      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          fieldText,
        ),
      );
    }

    if (
      hasSeparator(separators, "between-fields") &&
      index < fields.length - 1
    ) {
      flushInlineFields();
      container.addSeparatorComponents(
        createSeparator(),
      );
    }
  }

  flushInlineFields();

  if (fields.length > 0) {
    addSeparator("after-fields");
  }

  /*
   * Main image / GIF
   */

  if (data.image?.url) {
    container.addMediaGalleryComponents(
      new MediaGalleryBuilder().addItems(
        new MediaGalleryItemBuilder()
          .setURL(data.image.url)
          .setDescription(
            data.title ?? "Embed image",
          ),
      ),
    );
  }

  /*
   * Footer and timestamp
   */

  addSeparator("before-footer");

  const footerParts: string[] = [];

  if (data.footer?.text) {
    footerParts.push(data.footer.text);
  }

  if (data.timestamp) {
    const timestamp = Math.floor(
      new Date(data.timestamp).getTime() / 1000,
    );

    if (Number.isFinite(timestamp)) {
      footerParts.push(
        `<t:${timestamp}:F>`,
      );
    }
  }

  if (footerParts.length > 0) {
    const footerDisplay =
      new TextDisplayBuilder().setContent(
        `-# ${footerParts.join(" • ")}`,
      );

    if (data.footer?.icon_url) {
      container.addSectionComponents(
        new SectionBuilder()
          .addTextDisplayComponents(
            footerDisplay,
          )
          .setThumbnailAccessory(
            new ThumbnailBuilder()
              .setURL(data.footer.icon_url)
              .setDescription(
                data.footer.text || "Footer icon",
              ),
          ),
      );
    } else {
      container.addTextDisplayComponents(
        footerDisplay,
      );
    }
  }

  addSeparator("bottom");

  /*
   * Empty preview fallback
   */

  if (container.components.length === 0) {
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        "Your embed preview will appear here.",
      ),
    );
  }

  return container;
}
