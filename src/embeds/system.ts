import {
  EmbedBuilder,
  Events,
  MessageFlags,
  TextChannel,
  TextDisplayBuilder,
  type Client,
} from "discord.js";

import {
  applyEmbedStyle,
} from "./store.ts";

import {
  renderEmbedContainer,
} from "./render.ts";

function createSystemEmbed(
  content: string,
  guildId?: string | null,
): EmbedBuilder {
  const safeContent =
    content.length > 3900
      ? `${content.slice(0, 3890)}...`
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

function getFlags(value: any): number {
  if (typeof value === "number") {
    return value;
  }

  if (
    value &&
    typeof value.bitfield === "number"
  ) {
    return value.bitfield;
  }

  return 0;
}

function convertToComponentsV2(
  payload: any,
  guildId?: string | null,
  convertContentOnly = true,
): any {
  if (typeof payload === "string") {
    if (!convertContentOnly) {
      return payload;
    }

    return {
      components: [
        renderEmbedContainer(
          createSystemEmbed(payload, guildId),
        ),
      ],
      flags: MessageFlags.IsComponentsV2,
    };
  }

  if (
    !payload ||
    typeof payload !== "object"
  ) {
    return payload;
  }

  const originalFlags = getFlags(
    payload.flags,
  );

  if (
    originalFlags & MessageFlags.IsComponentsV2
  ) {
    return payload;
  }

  const existingEmbeds = Array.isArray(
    payload.embeds,
  )
    ? payload.embeds
    : [];

  const content =
    typeof payload.content === "string"
      ? payload.content
      : "";

  if (
    existingEmbeds.length === 0 &&
    (!convertContentOnly || !content.trim())
  ) {
    return payload;
  }

  const embeds =
    existingEmbeds.length > 0
      ? existingEmbeds
      : [
          createSystemEmbed(
            content,
            guildId,
          ),
        ];

  const components: any[] = [];

  /*
   * لو الرسالة فيها محتوى وEmbed مع بعض،
   * نحافظ على المحتوى كنص مستقل.
   */
  if (
    existingEmbeds.length > 0 &&
    content.trim()
  ) {
    components.push(
      new TextDisplayBuilder().setContent(
        content,
      ),
    );
  }

  /*
   * تحويل كل Embed إلى Container V2.
   */
  for (const embed of embeds) {
    components.push(
      renderEmbedContainer(embed),
    );
  }

  /*
   * الحفاظ على الأزرار والقوائم الحالية.
   */
  if (Array.isArray(payload.components)) {
    components.push(
      ...payload.components,
    );
  }

  const flags =
    originalFlags |
    MessageFlags.IsComponentsV2 |
    (
      payload.ephemeral === true
        ? MessageFlags.Ephemeral
        : 0
    );

  const converted = {
    ...payload,
    components,
    flags,
  };

  delete converted.content;
  delete converted.embeds;
  delete converted.ephemeral;

  return converted;
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

let installed = false;

export function installEmbedPolicy(
  client: Client,
): void {
  if (installed) {
    return;
  }

  installed = true;

  /*
   * اعتراض channel.send
   * عشان رسائل الأنظمة اللي بتتبعت مباشرة
   * تتحول لنفس تصميم Components V2.
   */
  const textChannelPrototype =
    TextChannel.prototype as any;

  const originalChannelSend =
    textChannelPrototype.send;

  if (
    typeof originalChannelSend === "function"
  ) {
    textChannelPrototype.send = function (
      payload: any,
      ...args: any[]
    ) {
      return originalChannelSend.call(
        this,
        convertToComponentsV2(
          payload,
          this.guildId ?? this.guild?.id,
          false,
        ),
        ...args,
      );
    };
  }

  /*
   * اعتراض message.reply
   */
  client.on(
    Events.MessageCreate,
    (message) => {
      if (!message.guild) {
        return;
      }

      const originalReply =
        message.reply.bind(message);

      (message as any).reply = (
        payload: any,
        ...args: any[]
      ) => {
        return originalReply(
          convertToComponentsV2(
            payload,
            message.guildId,
            true,
          ),
          ...args,
        );
      };
    },
  );

  /*
   * اعتراض ردود الـInteractions
   */
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
            convertToComponentsV2(
              payload,
              interaction.guildId,
              true,
            ),
            ...args,
          );
        };
      }
    },
  );
}
