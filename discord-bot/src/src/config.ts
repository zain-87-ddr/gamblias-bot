export type BotConfig = {
  token: string;
};

export type CommandDeploymentConfig = BotConfig & {
  guildId?: string;
};

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function getBotConfig(): BotConfig {
  return {
    token: requireEnv("DISCORD_BOT_TOKEN"),
  };
}

export function getCommandDeploymentConfig(): CommandDeploymentConfig {
  return {
    token: requireEnv("DISCORD_BOT_TOKEN"),
    guildId: process.env.DISCORD_GUILD_ID?.trim() || undefined,
  };
}