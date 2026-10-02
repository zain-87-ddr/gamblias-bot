import { EmbedBuilder, type Guild, type GuildMember } from "discord.js";

export const WELCOME_CHANNEL_ID = "1554179439624196247";

function createWelcomeEmbed(guild: Guild, member: GuildMember) {
  const accountCreated = `<t:${Math.floor(member.user.createdTimestamp / 1000)}:F>`;

  const joinedAt = member.joinedTimestamp
    ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>`
    : "غير متوفر";

  return new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle("👋 Welcome")
    .setDescription(
      `**👤 العضو**\n${member}\n\n` +
        `**🔢 رقم العضو**\n#${guild.memberCount}\n\n` +
        `**📅 تاريخ إنشاء الحساب**\n${accountCreated}\n\n` +
        `**🚪 تاريخ دخوله السيرفر**\n${joinedAt}`,
    )
    .setThumbnail(member.displayAvatarURL({ extension: "png", size: 256 }))
    .setFooter({ text: `🖼️ صورة العضو • ${member.user.username}` })
    .setTimestamp();
}

export async function sendWelcomeMessage(
  guild: Guild,
  member: GuildMember,
) {
  const channel = await guild.channels.fetch(WELCOME_CHANNEL_ID);

  if (!channel || !channel.isTextBased()) {
    throw new Error(
      `Welcome channel ${WELCOME_CHANNEL_ID} is missing or cannot receive messages in ${guild.name}.`,
    );
  }

  const accountCreated = `<t:${Math.floor(member.user.createdTimestamp / 1000)}:F>`;

  const joinedAt = member.joinedTimestamp
    ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>`
    : "غير متوفر";

  await channel.send({
    content:
      `👋 **Welcome ${member}**\n\n` +
      `أنت العضو رقم **#${guild.memberCount}** في **${guild.name}**.\n\n` +
      `📅 إنشاء الحساب: ${accountCreated}\n` +
      `🚪 دخول السيرفر: ${joinedAt}\n\n` +
      `استمتع بوقتك.`,
    embeds: [createWelcomeEmbed(guild, member)],
  });
}
