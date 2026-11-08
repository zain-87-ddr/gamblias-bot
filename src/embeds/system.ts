import {
  EmbedBuilder,
  Events,
  type Client,
} from "discord.js";

import {
  applyEmbedStyle,
} from "./store.ts";

function createSystemEmbed(
  content: string,
  guildId?: string | null,
) {
  const safeContent =
    content.length > 4096
      ? `${content.slice(0, 4090)}...`
      : content;

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle("Gamblias")
    .setDescription(safeContent)
    .setTimestamp();

  if (!guildId) {
    return embed;
  }

  return applyEmbedStyle(
    guildId,
    "system",
    embed,
    {
      content: safeContent,
    },
  );
}

function convertToEmbedPayload(
  payload: any,
  guildId?: string | null,
) {
  if (typeof payload === "string") {
    return {
      embeds: [
        createSystemEmbed(payload, guildId),
      ],
    };
  }

  if (
    !payload ||
    typeof payload !== "object" ||
    typeof payload.content !== "string" ||
    !payload.content.trim()
  ) {
    return payload;
  }

  const existingEmbeds = Array.isArray(
    payload.embeds,
  )
    ? payload.embeds
    : [];

  /*
   * لو الرسالة فيها Embed بالفعل:
   * نحافظ عليها وعلى النص كما هما.
   * ممنوع إضافة System Embed فوقها.
   */
  if (existingEmbeds.length > 0) {
    return payload;
  }

  return {
    ...payload,
    content: undefined,
    embeds: [
      createSystemEmbed(
        payload.content,
        guildId,
      ),
    ],
  };
}

function isEmbedStudioInteraction(
  interaction: any,
): boolean {
  if (
    typeof interaction.isChatInputCommand ===
      "function" &&
    interaction.isChatInputCommand() &&
    interaction.commandName === "embed"
  ) {
    return true;
  }

  return (
    typeof interaction.customId === "string" &&
    interaction.customId.startsWith("embed_")
  );
}

export function installEmbedPolicy(
  client: Client,
) {
  client.on(
    Events.MessageCreate,
    (message) => {
      if (
        message.author.bot ||
        !message.guild
      ) {
        return;
      }

      const originalReply =
        message.reply.bind(message);

      (message as any).reply = (
        payload: any,
        ...args: any[]
      ) => {
        return originalReply(
          convertToEmbedPayload(
            payload,
            message.guildId,
          ),
          ...args,
        );
      };
    },
  );

  client.on(
    Events.InteractionCreate,
    (interaction) => {
      if (
        isEmbedStudioInteraction(interaction)
      ) {
        return;
      }

      const methods = [
        "reply",
        "followUp",
        "editReply",
        "update",
      ] as const;

      for (const method of methods) {
        const original =
          (interaction as any)[method];

        if (typeof original !== "function") {
          continue;
        }

        const boundOriginal =
          original.bind(interaction);

        (interaction as any)[method] = (
          payload: any,
          ...args: any[]
        ) => {
          return boundOriginal(
            convertToEmbedPayload(
              payload,
              interaction.guildId,
            ),
            ...args,
          );
        };
      }
    },
  );
}
