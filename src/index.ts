import {
  Client,
  Events,
  GatewayIntentBits,
  type ChatInputCommandInteraction,
} from "discord.js";
import { registerAutoCleanupSystem } from "./cleanup/index.js";
import { registerAntiLink } from "./automod/anti-link.js";
import { registerAntiMassMention } from "./automod/anti-mass-mention.js";
import { registerAntiSpam } from "./automod/anti-spam.js";
import { registerBanSystem } from "./bans/index.js";
import { commands } from "./commands/index.js";
import { getBotConfig } from "./config.js";
import { registerRemovalSystem } from "./removals/index.ts";
import { registerTimeoutSystem } from "./timeouts/index.js";
import { sendWelcomeMessage } from "./welcome.js";
import { registerWarningSystem } from "./warnings/index.js";

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
