
import {
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";

export type EmbedTemplate =
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

export type EmbedStyle = {
  title?: string;
  description?: string;
  footer?: string;
  image?: string;
  thumbnail?: string;
  color?: number;
};

type GuildStyles = Record<string, EmbedStyle>;
type Store = Record<string, GuildStyles>;

const FILE_PATH = resolve(process.cwd(), "data", "embed-settings.json");

function readStore(): Store {
  try {
    return JSON.parse(readFileSync(FILE_PATH, "utf8")) as Store;
  } catch {
    return {};
  }
}

function writeStore(store: Store): void {
  mkdirSync(dirname(FILE_PATH), { recursive: true });
  writeFileSync(FILE_PATH, JSON.stringify(store, null, 2), "utf8");
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
  const style = getEmbedStyle(guildId, template);

  if (!style) return embed;

  if (style.title !== undefined) {
    embed.setTitle(style.title || null);
  }

  if (style.description !== undefined) {
    embed.setDescription(style.description || null);
  }

  if (style.footer !== undefined) {
    embed.setFooter(style.footer ? { text: style.footer } : null);
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

  return embed;
}
