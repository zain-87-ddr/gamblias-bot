import { REST, Routes } from "discord.js";
import { commands } from "./commands/index.js";
import { getCommandDeploymentConfig } from "./config.js";

const { token, guildId } = getCommandDeploymentConfig();
const rest = new REST({ version: "10" }).setToken(token);

try {
  const currentUser = (await rest.get(Routes.user())) as { id: string };
  const route = guildId
    ? Routes.applicationGuildCommands(currentUser.id, guildId)
    : Routes.applicationCommands(currentUser.id);
  const scope = guildId ? `guild ${guildId}` : "all guilds";
  console.info(`Registering ${commands.length} command(s) for ${scope}...`);
  await rest.put(route, { body: commands.map((command) => command.data.toJSON()) });
  console.info("Command registration complete.");
} catch (error) {
  console.error("Command registration failed:", error);
  process.exitCode = 1;
}