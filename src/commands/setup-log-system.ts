import {
ChannelType,
PermissionFlagsBits,
SlashCommandBuilder,
type ChatInputCommandInteraction,
} from "discord.js";
import type { BotCommand } from "../types/command.ts";

export const setupLogSystemCommand: BotCommand = {
data: new SlashCommandBuilder()
.setName("setup-log-system")
.setDescription("Create the Gamblias log system"),

async execute(interaction: ChatInputCommandInteraction) {
if (!interaction.guild || !interaction.member) {
await interaction.reply({
content: "هذا الأمر يعمل داخل السيرفر فقط.",
ephemeral: true,
});
return;
}

if (
  !interaction.member.permissions.has(
    PermissionFlagsBits.Administrator,
  )
) {
  await interaction.reply({
    content: "لازم تكون Administrator لاستخدام هذا الأمر.",
    ephemeral: true,
  });
  return;
}
await interaction.deferReply({ ephemeral: true });
const guild = interaction.guild;
const existingCategory = guild.channels.cache.find(
  (channel) =>
    channel.type === ChannelType.GuildCategory &&
    channel.name === "GAMBLIAS LOGS",
);
const category =
  existingCategory ??
  (await guild.channels.create({
    name: "GAMBLIAS LOGS",
    type: ChannelType.GuildCategory,
  }));
const logChannels = [
  "ban-logs",
  "timeout-logs",
  "warn-logs",
  "clear-logs",
  "automod-logs",
  "member-logs",
];
let created = 0;
for (const name of logChannels) {
  const existingChannel = guild.channels.cache.find(
    (channel) =>
      channel.type === ChannelType.GuildText &&
      channel.name === name &&
      channel.parentId === category.id,
  );
  if (existingChannel) {
    continue;
  }
  await guild.channels.create({
    name,
    type: ChannelType.GuildText,
    parent: category.id,
  });
  created++;
}
await interaction.editReply(
  `تم إنشاء نظام اللوج بنجاح.\n\nCategory: \`GAMBLIAS LOGS\`\nالقنوات الجديدة: \`${created}\``,
);

},
};
