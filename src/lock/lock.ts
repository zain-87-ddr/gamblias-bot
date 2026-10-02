import {
  EmbedBuilder,
  PermissionFlagsBits,
  type Client,
  type Message,
  type TextChannel,
} from "discord.js";

export function registerLockSystem(client: Client) {
  client.on("messageCreate", async (message) => {
    try {
      if (message.author.bot) return;
      if (!message.guild) return;
      if (!message.channel.isTextBased()) return;

      const content = message.content.trim();

      if (content !== "قفل" && content !== "فتح") {
        return;
      }

      // لازم يكون عنده Manage Channels
      if (
        !message.member?.permissions.has(
          PermissionFlagsBits.ManageChannels,
        )
      ) {
        await message.reply({
          content:
            "❌ لازم تكون إداري وعندك صلاحية **Manage Channels** عشان تستخدم الأمر ده.",
        });

        return;
      }

      const channel = message.channel;

      if (channel.type !== 0) {
        await message.reply({
          content:
            "❌ الأمر ده يشتغل في القنوات النصية فقط.",
        });

        return;
      }

      const everyoneRole = message.guild.roles.everyone;

      if (content === "قفل") {
        await (channel as TextChannel).permissionOverwrites.edit(
          everyoneRole,
          {
            SendMessages: false,
          },
        );

        const embed = new EmbedBuilder()
          .setColor(0xed4245)
          .setTitle("🔒 تم قفل القناة")
          .setDescription(
            `📍 **القناة:** ${channel}\n` +
            `🛡️ **بواسطة:** ${message.member}`,
          )
          .setTimestamp()
          .setFooter({
            text: "Gamblias • Lock System",
          });

        await message.reply({
          embeds: [embed],
        });

        return;
      }

      await (channel as TextChannel).permissionOverwrites.edit(
        everyoneRole,
        {
          SendMessages: null,
        },
      );

      const embed = new EmbedBuilder()
        .setColor(0x57f287)
        .setTitle("🔓 تم فتح القناة")
        .setDescription(
          `📍 **القناة:** ${channel}\n` +
          `🛡️ **بواسطة:** ${message.member}`,
        )
        .setTimestamp()
        .setFooter({
          text: "Gamblias • Lock System",
        });

      await message.reply({
        embeds: [embed],
      });
    } catch (error) {
      console.error("[LockSystem] Error:", error);

      if (!message.replied) {
        await message.reply({
          content:
            "❌ حصل خطأ أثناء قفل أو فتح القناة.",
        });
      }
    }
  });
}
