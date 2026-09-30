import { EmbedBuilder, type Guild, type GuildMember } from "discord.js";

export const WELCOME_CHANNEL_ID = "1554179439624196247";

function createWelcomeEmbed(guild: Guild, member: GuildMember) {
  const joinedAt = member.joinedTimestamp
    ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>`
    : "Unavailable";

  return new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle(`Welcome to ${guild.name}!`)
    .setDescription(`Welcome ${member}! We’re glad to have you here.`)
    .setThumbnail(member.displayAvatarURL({ extension: "png", size: 256 }))
    .addFields(
      {
        name: "Username",
        value: member.user.username,
        inline: true,
      },
      {
        name: "Member",
        value: `#${guild.memberCount}`,
        inline: true,
      },
      {
        name: "Joined",
        value: joinedAt,
        inline: false,
      },
    )
    .setFooter({ text: `Member ID: ${member.id}` })
    .setTimestamp();
}

export async function sendWelcomeMessage(guild: Guild, member: GuildMember) {
  const channel = await guild.channels.fetch(WELCOME_CHANNEL_ID);

  if (!channel || !channel.isTextBased()) {
    throw new Error(
      `Welcome channel ${WELCOME_CHANNEL_ID} is missing or cannot receive messages in ${guild.name}.`,
    );
  }

  await channel.send({ embeds: [createWelcomeEmbed(guild, member)] });
}