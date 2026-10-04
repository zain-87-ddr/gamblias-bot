import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  RoleSelectMenuBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  type ButtonInteraction,
  type ChatInputCommandInteraction,
  type Guild,
  type Role,
} from "discord.js";
import fs from "node:fs";
import path from "node:path";

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "permissions.json");

export const PERMISSIONS_ROLE_SELECT =
  "permissions_role_select";

export const PERMISSIONS_ACCESS_ROLE =
  "permissions_access_role";

export const PERMISSIONS_ACCESS_ROLE_SELECT =
  "permissions_access_role_select";

export const PERMISSIONS_CATEGORY_SELECT =
  "permissions_category_select";

export const PERMISSIONS_PERMISSION_SELECT =
  "permissions_permission_select";

export const PERMISSIONS_BACK =
  "permissions_back";

export const PERMISSIONS_CLOSE =
  "permissions_close";

export const PERMISSIONS_ENABLE_ALL =
  "permissions_enable_all";

export const PERMISSIONS_DISABLE_ALL =
  "permissions_disable_all";

export const PERMISSIONS_RESET =
  "permissions_reset";

export const PERMISSIONS_VIEW_ALL =
  "permissions_view_all";

type PermissionId =
  | "moderation.warn"
  | "moderation.unwarn"
  | "moderation.timeout"
  | "moderation.untimeout"
  | "moderation.ban"
  | "moderation.unban"
  | "moderation.clear"
  | "roles.give"
  | "roles.remove"
  | "roles.autorole"
  | "members.nickname"
  | "channels.lock"
  | "channels.unlock"
  | "management.say"
  | "management.tickets"
  | "management.logs"

  // Logs
  | "logs.ban"
  | "logs.timeout"
  | "logs.warn"
  | "logs.clear"
  | "logs.automod"
  | "logs.member"
  | "logs.message"
  | "logs.voice"
  | "logs.ticket"
  | "logs.channel"
  | "logs.nickname"
  | "logs.role"
  | "logs.manage";

type PermissionsData = {
  [guildId: string]: {
    accessRoleId?: string;

    roles: {
      [roleId: string]: {
        permissions: PermissionId[];
      };
    };
  };
};

const BOT_PERMISSIONS: Record<
  string,
  Record<string, string>
> = {
  moderation: {
    warn: "Warn",
    unwarn: "Unwarn",
    timeout: "Timeout",
    untimeout: "Untimeout",
    ban: "Ban",
    unban: "Unban",
    clear: "Clear",
  },

  roles: {
    give: "Give Role",
    remove: "Remove Role",
    autorole: "Auto Role",
  },

  members: {
    nickname: "Nickname",
  },

  channels: {
    lock: "Lock",
    unlock: "Unlock",
  },

  management: {
    say: "Say",
    tickets: "Tickets",
    logs: "Logs",
  },

  logs: {
    ban: "Ban Logs",
    timeout: "Timeout Logs",
    warn: "Warn Logs",
    clear: "Clear Logs",
    automod: "AutoMod Logs",
    member: "Member Logs",
    message: "Message Logs",
    voice: "Voice Logs",
    ticket: "Ticket Logs",
    channel: "Channel Logs",
    nickname: "Nickname Logs",
    role: "Role Logs",
    manage: "Manage Logs",
  },
};

let data: PermissionsData = {};

function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, {
      recursive: true,
    });
  }

  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(
      DATA_FILE,
      JSON.stringify({}, null, 2),
      "utf8",
    );
  }
}

function loadData() {
  try {
    ensureDataFile();

    const file = fs.readFileSync(
      DATA_FILE,
      "utf8",
    );

    data = file.trim()
      ? JSON.parse(file)
      : {};
  } catch (error) {
    console.error(
      "[Permissions] Could not load permissions:",
      error,
    );

    data = {};
  }
}

function saveData() {
  try {
    ensureDataFile();

    fs.writeFileSync(
      DATA_FILE,
      JSON.stringify(data, null, 2),
      "utf8",
    );
  } catch (error) {
    console.error(
      "[Permissions] Could not save permissions:",
      error,
    );
  }
}

loadData();

function getGuildData(guildId: string) {
  if (!data[guildId]) {
    data[guildId] = {
      roles: {},
    };
  }

  return data[guildId];
}

function getAllPermissions(): {
  id: PermissionId;
  name: string;
}[] {
  const result: {
    id: PermissionId;
    name: string;
  }[] = [];

  for (const [
    category,
    permissions,
  ] of Object.entries(BOT_PERMISSIONS)) {
    for (const [
      key,
      name,
    ] of Object.entries(permissions)) {
      result.push({
        id: `${category}.${key}` as PermissionId,
        name,
      });
    }
  }

  return result;
}

function getCategoryPermissions(
  category: string,
) {
  return getAllPermissions().filter(
    (permission) =>
      permission.id.startsWith(
        `${category}.`,
      ),
  );
}

function getRolePermissions(
  guildId: string,
  roleId: string,
): PermissionId[] {
  return (
    getGuildData(guildId).roles[
      roleId
    ]?.permissions ?? []
  );
}

export function getPermissionAccessRoleId(
  guildId: string,
) {
  return getGuildData(guildId)
    .accessRoleId;
}

export function setPermissionAccessRole(
  guildId: string,
  roleId: string,
) {
  getGuildData(
    guildId,
  ).accessRoleId = roleId;

  saveData();
}

export function removePermissionAccessRole(
  guildId: string,
) {
  delete getGuildData(
    guildId,
  ).accessRoleId;

  saveData();
}

export function canUsePermissionsCommand(
  guild: Guild,
  member: any,
) {
  if (member.id === guild.ownerId) {
    return true;
  }

  const accessRoleId =
    getPermissionAccessRoleId(
      guild.id,
    );

  if (!accessRoleId) {
    return false;
  }

  return member.roles.cache.has(
    accessRoleId,
  );
}

export function hasBotPermission(
  guildId: string,
  member: any,
  permission: PermissionId,
) {
  if (
    member.id ===
    member.guild.ownerId
  ) {
    return true;
  }

  const guildData =
    getGuildData(guildId);

  for (const role of member.roles.cache.values()) {
    const roleData =
      guildData.roles[role.id];

    if (!roleData) {
      continue;
    }

    if (
      roleData.permissions.includes(
        permission,
      )
    ) {
      return true;
    }
  }

  return false;
}

/*
 * تحديد هل العضو يقدر يشوف نوع معين من اللوجز
 */
export function canViewLog(
  guildId: string,
  member: any,
  logType:
    | "ban"
    | "timeout"
    | "warn"
    | "clear"
    | "automod"
    | "member"
    | "message"
    | "voice"
    | "ticket"
    | "channel"
    | "nickname"
    | "role",
) {
  if (
    member.id ===
    member.guild.ownerId
  ) {
    return true;
  }

  return hasBotPermission(
    guildId,
    member,
    `logs.${logType}` as PermissionId,
  ) ||
    hasBotPermission(
      guildId,
      member,
      "logs.manage",
    );
}

/*
 * هل العضو من الرولات المسموح لها بإدارة اللوجز؟
 */
export function canManageLogs(
  guildId: string,
  member: any,
) {
  if (
    member.id ===
    member.guild.ownerId
  ) {
    return true;
  }

  return hasBotPermission(
    guildId,
    member,
    "logs.manage",
  );
}

function setRolePermission(
  guildId: string,
  roleId: string,
  permission: PermissionId,
  enabled: boolean,
) {
  const guildData =
    getGuildData(guildId);

  if (!guildData.roles[roleId]) {
    guildData.roles[roleId] = {
      permissions: [],
    };
  }

  const permissions =
    guildData.roles[roleId]
      .permissions;

  const index =
    permissions.indexOf(
      permission,
    );

  if (
    enabled &&
    index === -1
  ) {
    permissions.push(permission);
  }

  if (
    !enabled &&
    index !== -1
  ) {
    permissions.splice(index, 1);
  }

  saveData();
}

function enableAll(
  guildId: string,
  roleId: string,
) {
  getGuildData(guildId).roles[
    roleId
  ] = {
    permissions:
      getAllPermissions().map(
        (permission) =>
          permission.id,
      ),
  };

  saveData();
}

function disableAll(
  guildId: string,
  roleId: string,
) {
  getGuildData(guildId).roles[
    roleId
  ] = {
    permissions: [],
  };

  saveData();
}

function resetRole(
  guildId: string,
  roleId: string,
) {
  delete getGuildData(
    guildId,
  ).roles[roleId];

  saveData();
}

function buildMainPanel(
  guild: Guild,
  isOwner: boolean,
) {
  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle(
      "⚙️ Gamblias Permissions",
    )
    .setDescription(
      "Welcome to the Gamblias Permission Manager.\n\n" +
        "🎭 اختار الـRole اللي عايز تدير صلاحياتها داخل البوت.\n\n" +
        "كل التعديلات بتتحفظ تلقائيًا.",
    )
    .setFooter({
      text:
        "Gamblias • Permission Manager",
    });

  const roleMenu =
    new RoleSelectMenuBuilder()
      .setCustomId(
        PERMISSIONS_ROLE_SELECT,
      )
      .setPlaceholder(
        "🎭 Select a role",
      )
      .setMinValues(1)
      .setMaxValues(1);

  const rows: any[] = [
    new ActionRowBuilder<RoleSelectMenuBuilder>().addComponents(
      roleMenu,
    ),
  ];

  if (isOwner) {
    const accessButton =
      new ButtonBuilder()
        .setCustomId(
          PERMISSIONS_ACCESS_ROLE,
        )
        .setLabel(
          "Manage /permissions Access",
        )
        .setEmoji("👑")
        .setStyle(
          ButtonStyle.Secondary,
        );

    rows.push(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        accessButton,
      ),
    );
  }

  return {
    embeds: [embed],
    components: rows,
  };
}

function buildCategoryPanel(
  guild: Guild,
  role: Role,
) {
  const permissions =
    getRolePermissions(
      guild.id,
      role.id,
    );

  const total =
    getAllPermissions().length;

  const enabled =
    permissions.length;

  const disabled =
    total - enabled;

  const embed =
    new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(
        "⚙️ Gamblias Permissions",
      )
      .setDescription(
        `🎭 **Role:** ${role}\n\n` +
          `🟢 **Enabled:** ${enabled}\n` +
          `🔴 **Disabled:** ${disabled}\n` +
          `📊 **Total:** ${total}\n\n` +
          "اختار القسم اللي عايز تعدل صلاحياته.",
      )
      .setFooter({
        text:
          "Gamblias • Permission Manager",
      });

  const categoryMenu =
    new StringSelectMenuBuilder()
      .setCustomId(
        `${PERMISSIONS_CATEGORY_SELECT}:${role.id}`,
      )
      .setPlaceholder(
        "🔧 Select a category",
      )
      .addOptions(
        new StringSelectMenuOptionBuilder()
          .setLabel(
            "Moderation",
          )
          .setDescription(
            "Warnings, Timeout, Ban, Clear...",
          )
          .setEmoji("🛡️")
          .setValue(
            "moderation",
          ),

        new StringSelectMenuOptionBuilder()
          .setLabel("Roles")
          .setDescription(
            "Give Role, Remove Role, Auto Role",
          )
          .setEmoji("🎭")
          .setValue("roles"),

        new StringSelectMenuOptionBuilder()
          .setLabel("Members")
          .setDescription(
            "Nickname management",
          )
          .setEmoji("👤")
          .setValue(
            "members",
          ),

        new StringSelectMenuOptionBuilder()
          .setLabel(
            "Channels",
          )
          .setDescription(
            "Lock and Unlock",
          )
          .setEmoji("🔒")
          .setValue(
            "channels",
          ),

        new StringSelectMenuOptionBuilder()
          .setLabel(
            "Management",
          )
          .setDescription(
            "Say, Tickets, Logs",
          )
          .setEmoji("⚙️")
          .setValue(
            "management",
          ),

        new StringSelectMenuOptionBuilder()
          .setLabel(
            "Logs",
          )
          .setDescription(
            "Control access to every log channel",
          )
          .setEmoji("📋")
          .setValue(
            "logs",
          ),
      );

  const categoryRow =
    new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      categoryMenu,
    );

  const viewButton =
    new ButtonBuilder()
      .setCustomId(
        `${PERMISSIONS_VIEW_ALL}:${role.id}`,
      )
      .setLabel(
        "View All",
      )
      .setEmoji("📋")
      .setStyle(
        ButtonStyle.Primary,
      );

  const enableButton =
    new ButtonBuilder()
      .setCustomId(
        `${PERMISSIONS_ENABLE_ALL}:${role.id}`,
      )
      .setLabel(
        "Enable All",
      )
      .setEmoji("🟢")
      .setStyle(
        ButtonStyle.Success,
      );

  const disableButton =
    new ButtonBuilder()
      .setCustomId(
        `${PERMISSIONS_DISABLE_ALL}:${role.id}`,
      )
      .setLabel(
        "Disable All",
      )
      .setEmoji("🔴")
      .setStyle(
        ButtonStyle.Danger,
      );

  const actionRow =
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      viewButton,
      enableButton,
      disableButton,
    );

  const resetButton =
    new ButtonBuilder()
      .setCustomId(
        `${PERMISSIONS_RESET}:${role.id}`,
      )
      .setLabel("Reset")
      .setEmoji("🔄")
      .setStyle(
        ButtonStyle.Secondary,
      );

  const closeButton =
    new ButtonBuilder()
      .setCustomId(
        PERMISSIONS_CLOSE,
      )
      .setLabel("Close")
      .setEmoji("✖️")
      .setStyle(
        ButtonStyle.Danger,
      );

  const bottomRow =
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      resetButton,
      closeButton,
    );

  return {
    embeds: [embed],
    components: [
      categoryRow,
      actionRow,
      bottomRow,
    ],
  };
}

function buildPermissionPanel(
  guild: Guild,
  role: Role,
  category: string,
) {
  const permissions =
    getCategoryPermissions(
      category,
    );

  const enabled =
    getRolePermissions(
      guild.id,
      role.id,
    );

  const embed =
    new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(
        "⚙️ Permission Settings",
      )
      .setDescription(
        `🎭 **Role:** ${role}\n` +
          `📂 **Category:** ${category}\n\n` +
          "اختار Permission عشان تغير حالتها.\n\n" +
          "🟢 Enabled\n" +
          "🔴 Disabled",
      )
      .setFooter({
        text:
          "Gamblias • Permission Manager",
      });

  const menu =
    new StringSelectMenuBuilder()
      .setCustomId(
        `${PERMISSIONS_PERMISSION_SELECT}:${role.id}:${category}`,
      )
      .setPlaceholder(
        "🔧 Select a permission",
      )
      .setMinValues(1)
      .setMaxValues(1);

  for (
    const permission of permissions
  ) {
    const isEnabled =
      enabled.includes(
        permission.id,
      );

    menu.addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel(
          `${isEnabled ? "🟢" : "🔴"} ${permission.name}`,
        )
        .setDescription(
          isEnabled
            ? "Currently Enabled"
            : "Currently Disabled",
        )
        .setValue(
          permission.id,
        ),
    );
  }

  const menuRow =
    new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      menu,
    );

  const backButton =
    new ButtonBuilder()
      .setCustomId(
        `${PERMISSIONS_BACK}:${role.id}`,
      )
      .setLabel("Back")
      .setEmoji("↩️")
      .setStyle(
        ButtonStyle.Secondary,
      );

  const closeButton =
    new ButtonBuilder()
      .setCustomId(
        PERMISSIONS_CLOSE,
      )
      .setLabel("Close")
      .setEmoji("✖️")
      .setStyle(
        ButtonStyle.Danger,
      );

  const buttonRow =
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      backButton,
      closeButton,
    );

  return {
    embeds: [embed],
    components: [
      menuRow,
      buttonRow,
    ],
  };
}

function buildAllPermissionsPanel(
  guild: Guild,
  role: Role,
) {
  const permissions =
    getAllPermissions();

  const enabled =
    getRolePermissions(
      guild.id,
      role.id,
    );

  const lines: string[] = [];

  for (
    const permission of permissions
  ) {
    const state =
      enabled.includes(
        permission.id,
      )
        ? "🟢"
        : "🔴";

    lines.push(
      `${state} **${permission.name}**`,
    );
  }

  const embed =
    new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(
        "📋 All Gamblias Permissions",
      )
      .setDescription(
        `🎭 **Role:** ${role}\n\n` +
          lines.join("\n"),
      )
      .setFooter({
        text:
          "🟢 Enabled • 🔴 Disabled",
      });

  const backButton =
    new ButtonBuilder()
      .setCustomId(
        `${PERMISSIONS_BACK}:${role.id}`,
      )
      .setLabel("Back")
      .setEmoji("↩️")
      .setStyle(
        ButtonStyle.Secondary,
      );

  const closeButton =
    new ButtonBuilder()
      .setCustomId(
        PERMISSIONS_CLOSE,
      )
      .setLabel("Close")
      .setEmoji("✖️")
      .setStyle(
        ButtonStyle.Danger,
      );

  const row =
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      backButton,
      closeButton,
    );

  return {
    embeds: [embed],
    components: [row],
  };
}

export async function openPermissionsPanel(
  interaction: ChatInputCommandInteraction,
) {
  const guild =
    interaction.guild;

  if (!guild) {
    await interaction.reply({
      content:
        "❌ الأمر ده لازم يتستخدم داخل السيرفر.",
      ephemeral: true,
    });

    return;
  }

  const member =
    interaction.member as any;

  if (
    !canUsePermissionsCommand(
      guild,
      member,
    )
  ) {
    await interaction.reply({
      content:
        "❌ مش مسموح لك تستخدم Permission Manager.",
      ephemeral: true,
    });

    return;
  }

  const isOwner =
    interaction.user.id ===
    guild.ownerId;

  await interaction.reply({
    ...buildMainPanel(
      guild,
      isOwner,
    ),
    ephemeral: true,
  });
}

export async function handlePermissionsInteraction(
  interaction:
    | any
    | ButtonInteraction,
) {
  if (!interaction.guild) {
    return;
  }

  const guild =
    interaction.guild;

  const member =
    interaction.member as any;

  if (
    !canUsePermissionsCommand(
      guild,
      member,
    )
  ) {
    if (
      !interaction.replied &&
      !interaction.deferred
    ) {
      await interaction.reply({
        content:
          "❌ مش مسموح لك تستخدم Permission Manager.",
        ephemeral: true,
      });
    }

    return;
  }

  if (
    interaction.isRoleSelectMenu?.() &&
    interaction.customId ===
      PERMISSIONS_ROLE_SELECT
  ) {
    const roleId =
      interaction.values[0];

    const role =
      guild.roles.cache.get(
        roleId,
      );

    if (!role) {
      await interaction.update({
        content:
          "❌ الرول دي مش موجودة.",
        embeds: [],
        components: [],
      });

      return;
    }

    await interaction.update(
      buildCategoryPanel(
        guild,
        role,
      ),
    );

    return;
  }

  if (
    interaction.isButton?.() &&
    interaction.customId ===
      PERMISSIONS_ACCESS_ROLE
  ) {
    if (
      interaction.user.id !==
      guild.ownerId
    ) {
      await interaction.reply({
        content:
          "❌ Owner السيرفر فقط يقدر يعدل مين يستخدم /permissions.",
        ephemeral: true,
      });

      return;
    }

    const menu =
      new RoleSelectMenuBuilder()
        .setCustomId(
          PERMISSIONS_ACCESS_ROLE_SELECT,
        )
        .setPlaceholder(
          "👑 Select the role allowed to use /permissions",
        )
        .setMinValues(1)
        .setMaxValues(1);

    const row =
      new ActionRowBuilder<RoleSelectMenuBuilder>().addComponents(
        menu,
      );

    const currentRoleId =
      getPermissionAccessRoleId(
        guild.id,
      );

    const currentRole =
      currentRoleId
        ? guild.roles.cache.get(
            currentRoleId,
          )
        : null;

    const embed =
      new EmbedBuilder()
        .setColor(0xf1c40f)
        .setTitle(
          "👑 Permission Manager Access",
        )
        .setDescription(
          "اختار الـRole اللي مسموح لها تستخدم `/permissions`.\n\n" +
            `📌 **Current Access:** ${
              currentRole
                ? currentRole
                : "None"
            }\n\n` +
            "👑 Owner السيرفر يفضل عنده الوصول دائمًا.",
        );

    const removeButton =
      new ButtonBuilder()
        .setCustomId(
          "permissions_remove_access",
        )
        .setLabel(
          "Remove Access Role",
        )
        .setEmoji("🗑️")
        .setStyle(
          ButtonStyle.Danger,
        );

    const closeButton =
      new ButtonBuilder()
        .setCustomId(
          PERMISSIONS_CLOSE,
        )
        .setLabel("Cancel")
        .setStyle(
          ButtonStyle.Secondary,
        );

    const buttonRow =
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        removeButton,
        closeButton,
      );

    await interaction.update({
      embeds: [embed],
      components: [
        row,
        buttonRow,
      ],
    });

    return;
  }

  if (
    interaction.isRoleSelectMenu?.() &&
    interaction.customId ===
      PERMISSIONS_ACCESS_ROLE_SELECT
  ) {
    if (
      interaction.user.id !==
      guild.ownerId
    ) {
      await interaction.reply({
        content:
          "❌ Owner السيرفر فقط يقدر يعمل ده.",
        ephemeral: true,
      });

      return;
    }

    const roleId =
      interaction.values[0];

    const role =
      guild.roles.cache.get(
        roleId,
      );

    if (!role) {
      await interaction.reply({
        content:
          "❌ الرول دي مش موجودة.",
        ephemeral: true,
      });

      return;
    }

    if (
      role.id === guild.id ||
      role.managed
    ) {
      await interaction.reply({
        content:
          "❌ مينفعش تختار @everyone أو Managed Role.",
        ephemeral: true,
      });

      return;
    }

    setPermissionAccessRole(
      guild.id,
      role.id,
    );

    await interaction.update(
      buildMainPanel(
        guild,
        true,
      ),
    );

    return;
  }

  if (
    interaction.isButton?.() &&
    interaction.customId ===
      "permissions_remove_access"
  ) {
    if (
      interaction.user.id !==
      guild.ownerId
    ) {
      await interaction.reply({
        content:
          "❌ Owner السيرفر فقط يقدر يعمل ده.",
        ephemeral: true,
      });

      return;
    }

    removePermissionAccessRole(
      guild.id,
    );

    await interaction.update(
      buildMainPanel(
        guild,
        true,
      ),
    );

    return;
  }

  if (
    interaction.isStringSelectMenu?.() &&
    interaction.customId.startsWith(
      `${PERMISSIONS_CATEGORY_SELECT}:`,
    )
  ) {
    const roleId =
      interaction.customId.split(
        ":",
      )[1];

    const role =
      guild.roles.cache.get(
        roleId,
      );

    if (!role) {
      await interaction.update({
        content:
          "❌ الرول دي مش موجودة.",
        embeds: [],
        components: [],
      });

      return;
    }

    const category =
      interaction.values[0];

    await interaction.update(
      buildPermissionPanel(
        guild,
        role,
        category,
      ),
    );

    return;
  }

  if (
    interaction.isStringSelectMenu?.() &&
    interaction.customId.startsWith(
      `${PERMISSIONS_PERMISSION_SELECT}:`,
    )
  ) {
    const parts =
      interaction.customId.split(
        ":",
      );

    const roleId =
      parts[1];

    const category =
      parts[2];

    const role =
      guild.roles.cache.get(
        roleId,
      );

    if (!role) {
      await interaction.update({
        content:
          "❌ الرول دي مش موجودة.",
        embeds: [],
        components: [],
      });

      return;
    }

    const permission =
      interaction.values[0] as PermissionId;

    const current =
      getRolePermissions(
        guild.id,
        role.id,
      ).includes(
        permission,
      );

    setRolePermission(
      guild.id,
      role.id,
      permission,
      !current,
    );

    await interaction.update(
      buildPermissionPanel(
        guild,
        role,
        category,
      ),
    );

    return;
  }

  if (
    interaction.isButton?.() &&
    interaction.customId.startsWith(
      `${PERMISSIONS_VIEW_ALL}:`,
    )
  ) {
    const roleId =
      interaction.customId.split(
        ":",
      )[1];

    const role =
      guild.roles.cache.get(
        roleId,
      );

    if (!role) {
      await interaction.reply({
        content:
          "❌ الرول دي مش موجودة.",
        ephemeral: true,
      });

      return;
    }

    await interaction.update(
      buildAllPermissionsPanel(
        guild,
        role,
      ),
    );

    return;
  }

  if (
    interaction.isButton?.() &&
    interaction.customId.startsWith(
      `${PERMISSIONS_ENABLE_ALL}:`,
    )
  ) {
    const roleId =
      interaction.customId.split(
        ":",
      )[1];

    const role =
      guild.roles.cache.get(
        roleId,
      );

    if (!role) {
      await interaction.reply({
        content:
          "❌ الرول دي مش موجودة.",
        ephemeral: true,
      });

      return;
    }

    enableAll(
      guild.id,
      role.id,
    );

    await interaction.update(
      buildCategoryPanel(
        guild,
        role,
      ),
    );

    return;
  }

  if (
    interaction.isButton?.() &&
    interaction.customId.startsWith(
      `${PERMISSIONS_DISABLE_ALL}:`,
    )
  ) {
    const roleId =
      interaction.customId.split(
        ":",
      )[1];

    const role =
      guild.roles.cache.get(
        roleId,
      );

    if (!role) {
      await interaction.reply({
        content:
          "❌ الرول دي مش موجودة.",
        ephemeral: true,
      });

      return;
    }

    disableAll(
      guild.id,
      role.id,
    );

    await interaction.update(
      buildCategoryPanel(
        guild,
        role,
      ),
    );

    return;
  }

  if (
    interaction.isButton?.() &&
    interaction.customId.startsWith(
      `${PERMISSIONS_RESET}:`,
    )
  ) {
    const roleId =
      interaction.customId.split(
        ":",
      )[1];

    const role =
      guild.roles.cache.get(
        roleId,
      );

    if (!role) {
      await interaction.reply({
        content:
          "❌ الرول دي مش موجودة.",
        ephemeral: true,
      });

      return;
    }

    resetRole(
      guild.id,
      role.id,
    );

    await interaction.update(
      buildCategoryPanel(
        guild,
        role,
      ),
    );

    return;
  }

  if (
    interaction.isButton?.() &&
    interaction.customId.startsWith(
      `${PERMISSIONS_BACK}:`,
    )
  ) {
    const roleId =
      interaction.customId.split(
        ":",
      )[1];

    const role =
      guild.roles.cache.get(
        roleId,
      );

    if (!role) {
      await interaction.update({
        content:
          "❌ الرول دي مش موجودة.",
        embeds: [],
        components: [],
      });

      return;
    }

    await interaction.update(
      buildCategoryPanel(
        guild,
        role,
      ),
    );

    return;
  }

  if (
    interaction.isButton?.() &&
    interaction.customId ===
      PERMISSIONS_CLOSE
  ) {
    await interaction.update({
      content:
        "✅ تم إغلاق Permission Manager.",
      embeds: [],
      components: [],
    });

    return;
  }
}
