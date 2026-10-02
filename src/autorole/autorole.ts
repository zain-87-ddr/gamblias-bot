import {
  type Guild,
  type Role,
} from "discord.js";

const autoRoleMap = new Map<string, string>();

export function setAutoRole(guild: Guild, role: Role) {
  autoRoleMap.set(guild.id, role.id);
}

export function removeAutoRole(guild: Guild) {
  autoRoleMap.delete(guild.id);
}

export function getAutoRoleId(guild: Guild) {
  return autoRoleMap.get(guild.id);
}

export async function giveAutoRole(member: import("discord.js").GuildMember) {
  const roleId = autoRoleMap.get(member.guild.id);

  if (!roleId) return;

  const role = member.guild.roles.cache.get(roleId);

  if (!role) return;

  if (role.position >= member.guild.members.me!.roles.highest.position) {
    console.error(
      `[AutoRole] Cannot give role "${role.name}" because it is higher than or equal to the bot's highest role.`,
    );
    return;
  }

  try {
    await member.roles.add(role);
  } catch (error) {
    console.error("[AutoRole] Could not give auto role:", error);
  }
}
