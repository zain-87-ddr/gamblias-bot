import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Events,
  PermissionFlagsBits,
  type ButtonInteraction,
  type Client,
  type GuildMember,
} from "discord.js";

import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";

import { dirname, resolve } from "node:path";
import { randomUUID } from "node:crypto";

import { hasBotPermission } from "../permissions/permissions.ts";
import {
  addWarning,
  removeWarning,
} from "../warnings/store.ts";

type UndoKind =
  | "ban"
  | "unban"
  | "warn"
  | "warn-max"
  | "unwarn"
  | "timeout"
  | "untimeout"
  | "role-add"
  | "role-remove";

type UndoRecord = {
  id: string;
  kind: UndoKind;
  guildId: string;
  targetId: string;
  moderatorId: string;
  reason?: string;
  roleId?: string;
  previousTimeoutUntil?: number | null;
  warningRestoreCount?: number;
  createdAt: number;
  expiresAt: number;
  usedAt?: number;
};

type UndoStore = Record<string, UndoRecord>;

const FILE_PATH = resolve(
  process.cwd(),
  "data",
  "moderation-undo.json",
);

const UNDO_DURATION_MS = 24 * 60 * 60 * 1000;

const BUTTON_LABELS: Record<UndoKind, string> = {
  ban: "إلغاء البان",
  unban: "استرجاع البان",
  warn: "إلغاء التحذير",
  "warn-max": "التراجع عن التحذير والتايم",
  unwarn: "استرجاع التحذير",
  timeout: "إلغاء التايم",
  untimeout: "استرجاع التايم",
  "role-add": "سحب الرتبة",
  "role-remove": "استرجاع الرتبة",
};

const REQUIRED_PERMISSIONS = {
  ban: "moderation.unban",
  unban: "moderation.ban",
  warn: "moderation.unwarn",
  "warn-max": "moderation.unwarn",
  unwarn: "moderation.warn",
  timeout: "moderation.untimeout",
  untimeout: "moderation.timeout",
  "role-add": "roles.remove",
  "role-remove": "roles.give",
} as const;

function readStore(): UndoStore {
  try {
    if (!existsSync(FILE_PATH)) {
      return {};
    }

    const parsed = JSON.parse(
      readFileSync(FILE_PATH, "utf8"),
    );

    return parsed &&
      typeof parsed === "object" &&
      !Array.isArray(parsed)
      ? parsed as UndoStore
      : {};
  } catch (error) {
    console.error(
      "[Undo] Could not read undo store:",
      error,
    );

    return {};
  }
}

function writeStore(store: UndoStore): void {
  mkdirSync(dirname(FILE_PATH), {
    recursive: true,
  });

  writeFileSync(
    FILE_PATH,
    JSON.stringify(store, null, 2),
    "utf8",
  );
}

export function createUndoRow(
  data: Omit<
    UndoRecord,
    "id" | "createdAt" | "expiresAt" | "usedAt"
  >,
): ActionRowBuilder<ButtonBuilder> {
  const store = readStore();
  const id = randomUUID();
  const now = Date.now();

  store[id] = {
    ...data,
    id,
    createdAt: now,
    expiresAt: now + UNDO_DURATION_MS,
  };

  writeStore(store);

  const button = new ButtonBuilder()
    .setCustomId(`gamblias_undo:${id}`)
    .setLabel(BUTTON_LABELS[data.kind])
    .setEmoji("↩️")
    .setStyle(ButtonStyle.Danger);

  return new ActionRowBuilder<ButtonBuilder>()
    .addComponents(button);
}

async function replyError(
  interaction: ButtonInteraction,
  content: string,
) {
  await interaction.reply({
    content,
    ephemeral: true,
  });
}

async function restoreTimeout(
  target: GuildMember,
  previousTimeoutUntil?: number | null,
) {
  if (
    previousTimeoutUntil &&
    previousTimeoutUntil > Date.now()
  ) {
    await target.timeout(
      previousTimeoutUntil - Date.now(),
      "التراجع عن إجراء إشرافي",
    );

    return;
  }

  await target.timeout(
    null,
    "إلغاء إجراء التايم السابق",
  );
}

export async function handleUndoInteraction(
  interaction: ButtonInteraction,
): Promise<boolean> {
  if (
    !interaction.customId.startsWith(
      "gamblias_undo:",
    )
  ) {
    return false;
  }

  if (!interaction.guild) {
    await replyError(
      interaction,
      "❌ الزر ده لازم يتستخدم داخل السيرفر.",
    );

    return true;
  }

  const id = interaction.customId.slice(
    "gamblias_undo:".length,
  );

  const store = readStore();
  const record = store[id];

  if (!record) {
    await replyError(
      interaction,
      "❌ بيانات التراجع مش موجودة أو انتهت صلاحيتها.",
    );

    return true;
  }

  if (record.guildId !== interaction.guild.id) {
    await replyError(
      interaction,
      "❌ الزر ده مش تابع للسيرفر الحالي.",
    );

    return true;
  }

  if (record.usedAt) {
    await replyError(
      interaction,
      "⚠️ تم استخدام زر التراجع ده بالفعل.",
    );

    return true;
  }

  if (record.expiresAt <= Date.now()) {
    await replyError(
      interaction,
      "⌛ انتهت صلاحية زر التراجع. مدة الصلاحية 24 ساعة.",
    );

    return true;
  }

  const isOwner =
    interaction.user.id === interaction.guild.ownerId;

  const isOriginalModerator =
    interaction.user.id === record.moderatorId;

  if (!isOwner && !isOriginalModerator) {
    await replyError(
      interaction,
      "❌ الزر متاح للمشرف اللي نفّذ الإجراء أو Owner السيرفر فقط.",
    );

    return true;
  }

  const moderator = await interaction.guild.members
    .fetch(interaction.user.id)
    .catch(() => null);

  if (!moderator) {
    await replyError(
      interaction,
      "❌ مش قادر أحدد صلاحياتك داخل السيرفر.",
    );

    return true;
  }

  const requiredPermission =
    REQUIRED_PERMISSIONS[record.kind];

  if (
    !hasBotPermission(
      interaction.guild.id,
      moderator,
      requiredPermission,
    )
  ) {
    await replyError(
      interaction,
      `❌ محتاج Permission **${requiredPermission}** عشان تتراجع عن الإجراء.`,
    );

    return true;
  }

  const botMember =
    interaction.guild.members.me ??
    await interaction.guild.members.fetchMe();

  try {
    /*
     * Ban / Unban
     */

    if (record.kind === "ban") {
      if (
        !botMember.permissions.has(
          PermissionFlagsBits.BanMembers,
        )
      ) {
        await replyError(
          interaction,
          "❌ البوت محتاج صلاحية Ban Members.",
        );

        return true;
      }

      await interaction.guild.bans.remove(
        record.targetId,
        "التراجع عن البان من زر Gamblias",
      );
    } else if (record.kind === "unban") {
      if (
        !botMember.permissions.has(
          PermissionFlagsBits.BanMembers,
        )
      ) {
        await replyError(
          interaction,
          "❌ البوت محتاج صلاحية Ban Members.",
        );

        return true;
      }

      await interaction.guild.members.ban(
        record.targetId,
        {
          reason:
            "استرجاع البان من زر التراجع في Gamblias",
        },
      );
    } else {
      const target = await interaction.guild.members
        .fetch(record.targetId)
        .catch(() => null);

      if (!target) {
        await replyError(
          interaction,
          "❌ العضو مش موجود داخل السيرفر حاليًا.",
        );

        return true;
      }

      /*
       * Warning
       */

      if (record.kind === "warn") {
        await removeWarning(
          record.guildId,
          record.targetId,
        );
      } else if (record.kind === "warn-max") {
        await restoreTimeout(
          target,
          record.previousTimeoutUntil,
        );

        const count =
          record.warningRestoreCount ?? 2;

        for (let i = 0; i < count; i++) {
          await addWarning(
            record.guildId,
            record.targetId,
          );
        }
      } else if (record.kind === "unwarn") {
        await addWarning(
          record.guildId,
          record.targetId,
        );
      }

      /*
       * Timeout
       */

      else if (
        record.kind === "timeout" ||
        record.kind === "untimeout"
      ) {
        if (
          !botMember.permissions.has(
            PermissionFlagsBits.ModerateMembers,
          ) ||
          botMember.roles.highest.comparePositionTo(
            target.roles.highest,
          ) <= 0
        ) {
          await replyError(
            interaction,
            "❌ البوت مش قادر يعدّل التايم بسبب الصلاحيات أو ترتيب الرتب.",
          );

          return true;
        }

        await restoreTimeout(
          target,
          record.previousTimeoutUntil,
        );
      }

      /*
       * Role Add / Remove
       */

      else if (
        record.kind === "role-add" ||
        record.kind === "role-remove"
      ) {
        if (
          !record.roleId ||
          !botMember.permissions.has(
            PermissionFlagsBits.ManageRoles,
          )
        ) {
          await replyError(
            interaction,
            "❌ البوت محتاج صلاحية Manage Roles.",
          );

          return true;
        }

        const role = await interaction.guild.roles
          .fetch(record.roleId)
          .catch(() => null);

        if (!role) {
          await replyError(
            interaction,
            "❌ الرتبة اتحذفت أو مش موجودة.",
          );

          return true;
        }

        if (
          role.managed ||
          role.position >=
            botMember.roles.highest.position
        ) {
          await replyError(
            interaction,
            "❌ البوت مش قادر يتعامل مع الرتبة بسبب ترتيب الرتب.",
          );

          return true;
        }

        if (record.kind === "role-add") {
          if (target.roles.cache.has(role.id)) {
            await target.roles.remove(
              role,
              "التراجع عن إعطاء الرتبة",
            );
          }
        } else {
          if (!target.roles.cache.has(role.id)) {
            await target.roles.add(
              role,
              "استرجاع الرتبة بعد إزالتها",
            );
          }
        }
      }
    }

    /*
     * Mark as used only after the reversal succeeds.
     */

    record.usedAt = Date.now();
    store[id] = record;
    writeStore(store);

    await interaction.reply({
      content:
        `✅ تم التراجع عن الإجراء بنجاح.\n` +
        `👤 العضو: <@${record.targetId}>`,
      ephemeral: true,
    });

    return true;
  } catch (error) {
    console.error(
      "[Undo] Could not reverse action:",
      error,
    );

    await replyError(
      interaction,
      "❌ مقدرتش أتراجع عن الإجراء. اتأكد إن صلاحيات البوت وترتيب الرتب يسمحوا بكده.",
    );

    return true;
  }
}

export function registerUndoSystem(
  client: Client,
): void {
  client.on(
    Events.InteractionCreate,
    async (interaction) => {
      if (!interaction.isButton()) {
        return;
      }

      try {
        await handleUndoInteraction(interaction);
      } catch (error) {
        console.error(
          "[Undo] Button handler error:",
          error,
        );

        if (
          !interaction.replied &&
          !interaction.deferred
        ) {
          await interaction.reply({
            content:
              "❌ حصل خطأ أثناء التراجع عن الإجراء.",
            ephemeral: true,
          });
        }
      }
    },
  );
}
