import {
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";

import {
  dirname,
  resolve,
} from "node:path";

export type EmbedTemplate =
  | "system"
  | "warning"
  | "max-warning"
  | "timeout"
  | "untimeout"
  | "ban"
  | "unban"
  | "clear"
  | "role-add"
  | "role-remove"
  | "lock"
  | "unlock"
  | "nickname"
  | "ticket-panel"
  | "ticket-open";

export type EmbedFieldStyle = {
  name: string;
  value: string;
  inline: boolean;
};

export type EmbedStyle = {
  title?: string;
  description?: string;

  author?: {
    name: string;
    url?: string;
    iconURL?: string;
  };

  footer?: {
    text: string;
    iconURL?: string;
  };

  image?: string;
  thumbnail?: string;
  color?: number;
  fields?: EmbedFieldStyle[];
};

type GuildStyles = Record<string, EmbedStyle>;
type Store = Record<string, GuildStyles>;

const FILE_PATH = resolve(
  process.cwd(),
  "data",
  "embed-settings.json",
);

function readStore(): Store {
  try {
    return JSON.parse(
      readFileSync(FILE_PATH, "utf8"),
    ) as Store;
  } catch {
    return {};
  }
}

function writeStore(store: Store): void {
  mkdirSync(dirname(FILE_PATH), {
    recursive: true,
  });

  writeFileSync(
    FILE_PATH,
    JSON.stringify(store, null, 2),
    "utf8",
  );
}

export function getEmbedStyle(
  guildId: string,
  template: EmbedTemplate,
): EmbedStyle | undefined {
  return readStore()[guildId]?.[template];
}

export function saveEmbedStyle(
  guildId: string,
  template: EmbedTemplate,
  style: EmbedStyle,
): void {
  const store = readStore();

  store[guildId] ??= {};
  store[guildId][template] = style;

  writeStore(store);
}

export function applyEmbedStyle(
  guildId: string,
  template: EmbedTemplate,
  embed: import("discord.js").EmbedBuilder,
): import("discord.js").EmbedBuilder {
  const style = getEmbedStyle(
    guildId,
    template,
  );

  if (!style) {
    return embed;
  }

  if (style.title !== undefined) {
    embed.setTitle(
      style.title || null,
    );
  }

  /*
   * الوصف المخصص يضاف قبل الوصف الأصلي.
   * كده بيانات العضو والسبب والمدة لا تختفي
   * لما نغير تصميم الإيمبد.
   */
  if (style.description !== undefined) {
    const originalDescription =
      embed.data.description ?? "";

    if (style.description.trim()) {
      const combinedDescription = [
        style.description.trim(),
        originalDescription.trim(),
      ]
        .filter(Boolean)
        .join("\n\n");

      embed.setDescription(
        combinedDescription || null,
      );
    }
  }

  if (style.author !== undefined) {
    embed.setAuthor(
      style.author.name
        ? {
            name: style.author.name,
            ...(style.author.url
              ? { url: style.author.url }
              : {}),
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
    embed.setImage(
      style.image || null,
    );
  }

  if (style.thumbnail !== undefined) {
    embed.setThumbnail(
      style.thumbnail || null,
    );
  }

  if (style.color !== undefined) {
    embed.setColor(style.color);
  }

  if (style.fields?.length) {
    const currentFields =
      embed.data.fields?.length ?? 0;

    const remainingFields =
      Math.max(0, 25 - currentFields);

    if (remainingFields > 0) {
      embed.addFields(
        ...style.fields.slice(
          0,
          remainingFields,
        ),
      );
    }
  }

  return embed;
}
