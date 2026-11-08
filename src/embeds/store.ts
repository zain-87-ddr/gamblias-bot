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

export type EmbedVariables = Record<
  string,
  string | number | null | undefined
>;

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

export function replaceEmbedVariables(
  value: string,
  variables: EmbedVariables = {},
): string {
  return value.replace(
    /\{([a-zA-Z0-9_]+)\}/g,
    (match, key: string) => {
      const replacement = variables[key];

      return replacement === undefined ||
        replacement === null
        ? match
        : String(replacement);
    },
  );
}

export function applyEmbedStyle(
  guildId: string,
  template: EmbedTemplate,
  embed: import("discord.js").EmbedBuilder,
  variables: EmbedVariables = {},
): import("discord.js").EmbedBuilder {
  const style = getEmbedStyle(
    guildId,
    template,
  );

  if (!style) {
    return embed;
  }

  /*
   * Title:
   * لو فيه تصميم مخصص، نستبدل العنوان القديم.
   */
  if (style.title !== undefined) {
    embed.setTitle(
      replaceEmbedVariables(
        style.title,
        variables,
      ) || null,
    );
  }

  /*
   * Description:
   * الوصف المخصص يستبدل الوصف الافتراضي بالكامل.
   * مش بنضيفه فوق الوصف القديم.
   */
  if (style.description !== undefined) {
    embed.setDescription(
      replaceEmbedVariables(
        style.description,
        variables,
      ) || null,
    );
  }

  /*
   * Author
   */
  if (style.author !== undefined) {
    embed.setAuthor(
      style.author.name
        ? {
            name: replaceEmbedVariables(
              style.author.name,
              variables,
            ),
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

  /*
   * Footer
   */
  if (style.footer !== undefined) {
    embed.setFooter(
      style.footer.text
        ? {
            text: replaceEmbedVariables(
              style.footer.text,
              variables,
            ),
            ...(style.footer.iconURL
              ? { iconURL: style.footer.iconURL }
              : {}),
          }
        : null,
    );
  }

  /*
   * Image
   */
  if (style.image !== undefined) {
    embed.setImage(
      style.image || null,
    );
  }

  /*
   * Thumbnail
   */
  if (style.thumbnail !== undefined) {
    embed.setThumbnail(
      style.thumbnail || null,
    );
  }

  /*
   * Color
   */
  if (style.color !== undefined) {
    embed.setColor(style.color);
  }

  /*
   * Fields:
   * نستبدل الحقول القديمة بالكامل.
   * حتى لو المصفوفة فاضية، ده معناه مسح كل الحقول.
   */
  if (style.fields !== undefined) {
    embed.setFields(
      ...style.fields.map((field) => ({
        name: replaceEmbedVariables(
          field.name,
          variables,
        ),
        value: replaceEmbedVariables(
          field.value,
          variables,
        ),
        inline: field.inline,
      })),
    );
  }

  return embed;
}
