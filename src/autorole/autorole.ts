import {
  type Guild,
  type Role,
  type GuildMember,
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

export async function giveAutoRole(member: GuildMember) {
  const roleId = autoRoleMap.get(member.guild.id);

  if (!roleId) return;

  const role = member.guild.roles.cache.get(roleId);

  if (!role) return;

  const botMember = member.guild.members.me;

  if (!botMember) return;

  if (role.position >= botMember.roles.highest.position) {
    console.error(
      `[AutoRole] Cannot give role "${role.name}" because it is higher than or equal to the bot's highest role.`,
    );
    return;
  }

  if (member.roles.cache.has(role.id)) return;

  try {
    await member.roles.add(role);
  } catch (error) {
    console.error(
      `[AutoRole] Could not give auto role to ${member.user.tag}:`,
      error,
    );
  }
}

/**
 * يعطي الـAuto Role لكل الأعضاء الموجودين حاليًا
 * اللي مش معاهم الرول بالفعل.
 */
export async function giveAutoRoleToExistingMembers(
  guild: Guild,
  role: Role,
) {
  const botMember = guild.members.me;

  if (!botMember) {
    console.error("[AutoRole] Could not find bot member.");
    return;
  }

  if (role.position >= botMember.roles.highest.position) {
    console.error(
      `[AutoRole] Cannot give role "${role.name}" because it is higher than or equal to the bot's highest role.`,
    );
    return;
  }

  try {
    const members = await guild.members.fetch();

    let addedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;

    for (const member of members.values()) {
      // البوت نفسه
      if (member.user.bot) {
        skippedCount++;
        continue;
      }

      // العضو معاه الرول بالفعل
      if (member.roles.cache.has(role.id)) {
        skippedCount++;
        continue;
      }

      // البوت مينفعش يدي رول لعضو أعلى منه
      if (
        member.roles.highest.position >=
        botMember.roles.highest.position
      ) {
        skippedCount++;
        continue;
      }

      try {
        await member.roles.add(role);
        addedCount++;
      } catch (error) {
        failedCount++;

        console.error(
          `[AutoRole] Could not give role "${role.name}" to ${member.user.tag}:`,
          error,
        );
      }
    }

    console.log(
      `[AutoRole] Existing members processed. Added: ${addedCount}, Skipped: ${skippedCount}, Failed: ${failedCount}`,
    );

    return {
      addedCount,
      skippedCount,
      failedCount,
    };
  } catch (error) {
    console.error(
      "[AutoRole] Could not fetch/process existing members:",
      error,
    );

    return null;
  }
}
