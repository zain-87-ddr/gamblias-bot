import {
  Client,
  Events,
  GatewayIntentBits,
  type ChatInputCommandInteraction,
} from "discord.js";
import { registerClearSystem } from "./clear/index.ts";
import { registerAutoCleanupSystem } from "./cleanup/index.ts";
import { registerAntiLink } from "./automod/anti-link.ts";
import { registerAntiMassMention } from "./automod/anti-mass-mention.ts";
import { registerAntiSpam } from "./automod/anti-spam.ts";
import { registerBanSystem } from "./bans/index.ts";
import { commands } from "./commands/index.ts";
import { getBotConfig } from "./config.ts";
import { registerRemovalSystem } from "./removals/index.ts";
import { registerTimeoutSystem } from "./timeouts/index.ts";
import { sendWelcomeMessage } from "./welcome.ts";
import { registerWarningSystem } from "./warnings/index.ts";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once(Events.ClientReady, (readyClient) => {
  console.info(`Ready! Logged in as ${readyClient.user.tag}`);
});

client.on(Events.GuildMemberAdd, async (member) => {
  console.log("guildMemberAdd FIRED", member.user.username);

  try {
    await sendWelcomeMessage(member.guild, member);
  } catch (error) {
    console.error(`Could not welcome ${member.user.tag} in ${member.guild.name}:`, error);
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) {
    return;
  }

  const command = commands.find(
    (registeredCommand) => registeredCommand.data.name === interaction.commandName,
  );

  if (!command) {
    return;
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(`Command failed: /${interaction.commandName}`, error);
    await replyWithError(interaction);
  }
});

registerWarningSystem(client);
registerTimeoutSystem(client);
registerRemovalSystem(client);
registerBanSystem(client);
registerAntiSpam(client);
registerClearSystem(client);
registerAntiLink(client);
registerAntiMassMention(client);
registerAutoCleanupSystem(client);

async function replyWithError(interaction: ChatInputCommandInteraction) {
  const message = "Something went wrong while running that command.";

  if (interaction.replied || interaction.deferred) {
    await interaction.followUp({ content: message, ephemeral: true });
    return;
  }

  await interaction.reply({ content: message, ephemeral: true });
}

async function shutdown(signal: string) {
  console.info(`Received ${signal}; shutting down.`);
  client.destroy();
  process.exit(0);
}

process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));

const { token } = getBotConfig();
await client.login(token);
