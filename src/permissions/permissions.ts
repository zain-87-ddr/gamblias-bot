import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  PermissionFlagsBits,
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

export const PERMISSIONS_ROLE_SELECT = "permissions_role_select";
export const PERMISSIONS_ACCESS_ROLE = "permissions_access_role";

export const PERMISSIONS_CATEGORY_SELECT =
  "permissions_category_select";

export const PERMISSIONS_BACK = "permissions_back";
export const PERMISSIONS_CLOSE = "permissions_close";

export const BOT_PERMISSIONS = {
  moderation: {
    warn: "Warn",
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
} as const;

type PermissionId =
  | "moderation.warn"
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
  | "management.logs";

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

let data: PermissionsData = {};

function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
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

    const file = fs.readFileSync(DATA_FILE, "utf8");

    data = file.trim()
      ? JSON.parse(file)
      : {};
  } catch (error) {
    console.error(
      "[Permissions] Could not load permissions.json:",
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
      "[Permissions] Could not save permissions.json:",
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

export function getPermissionAccessRoleId(
  guildId: string,
) {
  return getGuildData(guildId).accessRoleId;
}

export function setPermissionAccessRole(
  guildId: string,
  roleId: string,
) {
  const guildData = getGuildData(guildId);

  guildData.accessRoleId = roleId;

  saveData();
}

export function removePermissionAccessRole(
  guildId: string,
) {
  const guildData = getGuildData(guildId);

  delete guildData.accessRoleId;

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
    getPermissionAccessRoleId(guild.id);

  if (!accessRoleId) {
    return false;
  }

  return member.roles.cache.has(accessRoleId);
}

export function hasBotPermission(
  guildId: string,
  member: any,
  permission: PermissionId,
) {
  if (member.id === member.guild.ownerId) {
    return true;
  }

  const guildData = getGuildData(guildId);

  for (const role of member.roles.cache.values()) {
    const roleData = guildData.roles[role.id];

    if (!roleData) continue;

    if (roleData.permissions.includes(permission)) {
      return true;
    }
  }

  return false;
}

function getAllPermissions(): {
  id: PermissionId;
  name: string;
}[] {
  return [
    ...Object.entries(BOT_PERMISSIONS.moderation).map(
      ([key, name]) => ({
        id: `moderation.${key}` as PermissionId,
        name,
      }),
    ),

    ...Object.entries(BOT_PERMISSIONS.roles).map(
      ([key, name]) => ({
        id: `roles.${key}` as PermissionId,
        name,
      }),
    ),

    ...Object.entries(BOT_PERMISSIONS.members).map(
      ([key, name]) => ({
        id: `members.${key}` as PermissionId,
        name,
      }),
    ),

    ...Object.entries(BOT_PERMISSIONS.channels).map(
      ([key, name]) => ({
        id: `channels.${key}` as PermissionId,
        name,
      }),
    ),

    ...Object.entries(BOT_PERMISSIONS.management).map(
      ([key, name]) => ({
        id: `management.${key}` as PermissionId,
        name,
      }),
    ),
  ];
}

function getCategoryPermissions(
  category: string,
) {
  return getAllPermissions().filter((permission) =>
    permission.id.startsWith(`${category}.`),
  );
}

function getRolePermissions(
  guildId: string,
  roleId: string,
): PermissionId[] {
  return (
    getGuildData(guildId).roles[roleId]?.permissions ??
    []
  );
}

function setRolePermission(
  guildId: string,
  roleId: string,
  permission: PermissionId,
  enabled: boolean,
) {
  const guildData = getGuildData(guildId);

  if (!guildData.roles[roleId]) {
    guildData.roles[roleId] = {
      permissions: [],
    };
  }

  const permissions =
    guildData.roles[roleId].permissions;

  const index = permissions.indexOf(permission);

  if (enabled && index === -1) {
    permissions.push(permission);
  }

  if (!enabled && index !== -1) {
    permissions.splice(index, 1);
  }

  saveData();
}

function buildMainPanel(
  guild: Guild,
  isOwner: boolean,
) {
  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle("⚙️ Gamblias Permissions")
    .setDescription(
      "Welcome to the Gamblias Permission Manager.\n\n" +
        "اختار الـRole اللي عايز تدير صلاحياتها داخل البوت.",
    )
    .setFooter({
      text: "Gamblias • Permission Manager",
    });

  const roleMenu = new RoleSelectMenuBuilder()
    .setCustomId(PERMISSIONS_ROLE_SELECT)
    .setPlaceholder("🎭 Select a role")
    .setMinValues(1)
    .setMaxValues(1);

  const rows = [
    new ActionRowBuilder<RoleSelectMenuBuilder>().addComponents(
      roleMenu,
    ),
  ];

  if (isOwner) {
    const accessButton = new ButtonBuilder()
      .setCustomId(PERMISSIONS_ACCESS_ROLE)
      .setLabel("Manage /permissions Access")
      .setEmoji("👑")
      .setStyle(ButtonStyle.Secondary);

    const row =
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        accessButton,
      );

    rows.push(row as any);
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
    getRolePermissions(guild.id, role.id);

  const enabledCount = permissions.length;

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle("⚙️ Gamblias Permissions")
    .setDescription(
      `🎭 **Role:** ${role}\n\n` +
        `🟢 **Enabled Permissions:** ${enabledCount}\n\n` +
        "اختار القسم اللي عايز تعدل صلاحياته.",
    )
    .setFooter({
      text: "Gamblias • Permission Manager",
    });

  const menu = new StringSelectMenuBuilder()
    .setCustomId(
      `${PERMISSIONS_CATEGORY_SELECT}:${role.id}`,
    )
    .setPlaceholder("🔧 Select a category")
    .addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel("Moderation")
        .setDescription(
          "Warnings, Timeout, Ban, Clear...",
        )
        .setEmoji("🛡️")
        .setValue("moderation"),

      new StringSelectMenuOptionBuilder()
        .setLabel("Roles")
        .setDescription(
          "Give Role, Remove Role, Auto Role",
        )
        .setEmoji("🎭")
        .setValue("roles"),

      new StringSelectMenuOptionBuilder()
        .setLabel("Members")
        .setDescription("Nickname management")
        .setEmoji("👤")
        .setValue("members"),

      new StringSelectMenuOptionBuilder()
        .setLabel("Channels")
        .setDescription("Lock and Unlock")
        .setEmoji("🔒")
        .setValue("channels"),

      new StringSelectMenuOptionBuilder()
        .setLabel("Management")
        .setDescription(
          "Say, Tickets, Logs",
        )
        .setEmoji("⚙️")
        .setValue("management"),
    );

  const row =
    new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      menu,
    );

  const closeButton = new ButtonBuilder()
    .setCustomId(PERMISSIONS_CLOSE)
    .setLabel("Close")
    .setEmoji("✖️")
    .setStyle(ButtonStyle.Danger);

  const closeRow =
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      closeButton,
    );

  return {
    embeds: [embed],
    components: [row, closeRow],
  };
}

function buildPermissionPanel(
  guild: Guild,
  role: Role,
  category: string,
) {
  const permissions =
    getCategoryPermissions(category);

  const enabled =
    getRolePermissions(guild.id, role.id);

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle("⚙️ Permission Settings")
    .setDescription(
      `🎭 **Role:** ${role}\n` +
        `📂 **Category:** ${category}\n\n` +
        "اختار Permission عشان تغير حالتها.\n\n" +
        "🟢 Enabled\n" +
        "🔴 Disabled",
    )
    .setFooter({
      text: "Gamblias • Permission Manager",
    });

  const menu = new StringSelectMenuBuilder()
    .setCustomId(
      `permissions_toggle:${role.id}:${category}`,
    )
    .setPlaceholder("🔧 Select a permission")
    .setMinValues(1)
    .setMaxValues(1);

  for (const permission of permissions) {
    const isEnabled = enabled.includes(
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
        .setValue(permission.id),
    );
  }

  const menuRow =
    new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      menu,
    );

  const backButton = new ButtonBuilder()
    .setCustomId(
      `${PERMISSIONS_BACK}:${role.id}`,
    )
    .setLabel("Back")
    .setEmoji("↩️")
    .setStyle(ButtonStyle.Secondary);

  const closeButton = new ButtonBuilder()
    .setCustomId(PERMISSIONS_CLOSE)
    .setLabel("Close")
    .setEmoji("✖️")
    .setStyle(ButtonStyle.Danger);

  const buttonRow =
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      backButton,
      closeButton,
    );

  return {
    embeds: [embed],
    components: [menuRow, buttonRow],
  };
}

export async function openPermissionsPanel(
  interaction: ChatInputCommandInteraction,
) {
  const guild = interaction.guild;

  if (!guild) {
    await interaction.reply({
      content:
        "❌ الأمر ده لازم يتستخدم داخل السيرفر.",
      ephemeral: true,
    });

    return;
  }

  const member = interaction.member as any;

  if (!canUsePermissionsCommand(guild, member)) {
    await interaction.reply({
      content:
        "❌ مش مسموح لك تستخدم Permission Manager.",
      ephemeral: true,
    });

    return;
  }

  const isOwner =
    interaction.user.id === guild.ownerId;

  await interaction.reply({
    ...buildMainPanel(guild, isOwner),
    ephemeral: true,
  });
}

export async function handlePermissionsInteraction(
  interaction:
    | any
    | ButtonInteraction,
) {
  if (!interaction.guild) return;

  const guild = interaction.guild;
  const member = interaction.member as any;

  if (!canUsePermissionsCommand(guild, member)) {
    if (!interaction.replied && !interaction.deferred) {
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
    interaction.customId === PERMISSIONS_ROLE_SELECT
  ) {
    const roleId = interaction.values[0];
    const role = guild.roles.cache.get(roleId);

    if (!role) {
      await interaction.update({
        content: "❌ الرول دي مش موجودة.",
        embeds: [],
        components: [],
      });

      return;
    }

    await interaction.update({
      ...buildCategoryPanel(guild, role),
    });

    return;
  }

  if (
    interaction.isButton?.() &&
    interaction.customId === PERMISSIONS_ACCESS_ROLE
  ) {
    if (interaction.user.id !== guild.ownerId) {
      await interaction.reply({
        content:
          "❌ Owner السيرفر فقط يقدر يعدل مين يستخدم /permissions.",
        ephemeral: true,
      });

      return;
    }

    const menu = new RoleSelectMenuBuilder()
      .setCustomId(
        "permissions_access_role_select",
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

    const backButton = new ButtonBuilder()
      .setCustomId(PERMISSIONS_CLOSE)
      .setLabel("Cancel")
      .setStyle(ButtonStyle.Secondary);

    const buttonRow =
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        backButton,
      );

    const embed = new EmbedBuilder()
      .setColor(0xf1c40f)
      .setTitle("👑 Permission Manager Access")
      .setDescription(
        "اختار الـRole اللي مسموح لها تستخدم `/permissions`.\n\n" +
          "👑 Owner السيرفر يفضل عنده الوصول حتى لو مفيش Role متخصصة.",
      );

    await interaction.update({
      embeds: [embed],
      components: [row, buttonRow],
    });

    return;
  }

  if (
    interaction.isRoleSelectMenu?.() &&
    interaction.customId ===
      "permissions_access_role_select"
  ) {
    if (interaction.user.id !== guild.ownerId) {
      await interaction.reply({
        content:
          "❌ Owner السيرفر فقط يقدر يعمل ده.",
        ephemeral: true,
      });

      return;
    }

    const roleId = interaction.values[0];
    const role = guild.roles.cache.get(roleId);

    if (!role) {
      await interaction.reply({
        content: "❌ الرول دي مش موجودة.",
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

    await interaction.update({
      ...buildMainPanel(guild, true),
    });

    return;
  }

  if (
    interaction.isStringSelectMenu?.() &&
    interaction.customId.startsWith(
      `${PERMISSIONS_CATEGORY_SELECT}:`,
    )
  ) {
    const roleId =
      interaction.customId.split(":")[1];

    const role = guild.roles.cache.get(roleId);

    if (!role) {
      await interaction.update({
        content: "❌ الرول دي مش موجودة.",
        embeds: [],
        components: [],
      });

      return;
    }

    const category =
      interaction.values[0];

    await interaction.update({
      ...buildPermissionPanel(
        guild,
        role,
        category,
      ),
    });

    return;
  }

  if (
    interaction.isStringSelectMenu?.() &&
    interaction.customId.startsWith(
      "permissions_toggle:",
    )
  ) {
    const parts =
      interaction.customId.split(":");

    const roleId = parts[1];
    const category = parts[2];

    const role = guild.roles.cache.get(roleId);

    if (!role) {
      await interaction.update({
        content: "❌ الرول دي مش موجودة.",
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
      ).includes(permission);

    setRolePermission(
      guild.id,
      role.id,
      permission,
      !current,
    );

    await interaction.update({
      ...buildPermissionPanel(
        guild,
        role,
        category,
      ),
    });

    return;
  }

  if (
    interaction.isButton?.() &&
    interaction.customId.startsWith(
      `${PERMISSIONS_BACK}:`,
    )
  ) {
    const roleId =
      interaction.customId.split(":")[1];

    const role = guild.roles.cache.get(roleId);

    if (!role) {
      await interaction.update({
        content: "❌ الرول دي مش موجودة.",
        embeds: [],
        components: [],
      });

      return;
    }

    await interaction.update({
      ...buildCategoryPanel(guild, role),
    });

    return;
  }

  if (
    interaction.isButton?.() &&
    interaction.customId === PERMISSIONS_CLOSE
  ) {
    await interaction.update({
      content: "✅ تم إغلاق Permission Manager.",
      embeds: [],
      components: [],
    });
  }
}
