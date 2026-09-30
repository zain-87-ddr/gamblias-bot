import {
EmbedBuilder,
type Guild,
type GuildTextBasedChannel,
} from “discord.js”;

const LOG_CATEGORY_NAME = “GAMBLIAS LOGS”;

const LOG_CHANNEL_NAMES = {
ban: “ban-logs”,
timeout: “timeout-logs”,
warn: “warn-logs”,
clear: “clear-logs”,
automod: “automod-logs”,
member: “member-logs”,
} as const;

async function getLogChannel(
guild: Guild,
channelName: string,
): Promise<GuildTextBasedChannel | null> {
const category = guild.channels.cache.find(
(channel) =>
channel.type === 4 &&
channel.name === LOG_CATEGORY_NAME,
);

if (!category) {
return null;
}

const channel = guild.channels.cache.find(
(channel) =>
channel.name === channelName &&
channel.parentId === category.id &&
channel.isTextBased(),
);

if (!channel || !channel.isSendable()) {
return null;
}

return channel as GuildTextBasedChannel;
}

export async function sendBanLog(
guild: Guild,
memberName: string,
memberMention: string,
memberId: string,
moderatorMention: string,
reason: string,
) {
const channel = await getLogChannel(
guild,
LOG_CHANNEL_NAMES.ban,
);

if (!channel) {
return;
}

const embed = new EmbedBuilder()
.setColor(0xef4444)
.setTitle(“🔨 تم حظر عضو”)
.addFields(
{
name: “👤 العضو”,
value: ${memberMention}\n${memberName},
inline: true,
},
{
name: “🛡️ بواسطة”,
value: moderatorMention,
inline: true,
},
{
name: “🆔 ID”,
value: \${memberId}``,
inline: false,
},
{
name: “📝 السبب”,
value: reason.slice(0, 1024),
inline: false,
},
)
.setTimestamp();

await channel.send({
embeds: [embed],
});
}
