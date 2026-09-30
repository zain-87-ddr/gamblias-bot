# Discord Bot Starter

A small Node.js bot built with `discord.js`. It uses slash commands and keeps command definitions separate from the bot lifecycle so new systems can be added without turning `src/index.ts` into a monolith.

## Setup

1. Create a Discord application in the [Discord Developer Portal](https://discord.com/developers/applications).
2. Add a bot user and copy its token into the Replit Secret `DISCORD_BOT_TOKEN`.
3. In the application’s **Bot** settings, enable the **Server Members Intent** and **Message Content Intent** under **Privileged Gateway Intents**.
4. Optionally set `DISCORD_GUILD_ID` to a development server ID. Guild commands update immediately; global commands can take longer to appear.
5. Invite the bot with the `bot` and `applications.commands` scopes. The bot needs permission to view and send messages in channel `1554179439624196247`, plus **Moderate Members** for the warning timeout.

For local development, copy `.env.example` to `.env` and fill in the values. Never commit `.env` or a bot token.

## Commands

```bash
# Register slash commands. Uses DISCORD_GUILD_ID when set.
pnpm --filter @workspace/discord-bot run deploy-commands

# Run with file watching
pnpm --filter @workspace/discord-bot run dev

# Run once
pnpm --filter @workspace/discord-bot run start

# Check TypeScript
pnpm --filter @workspace/discord-bot run typecheck
```

The starter includes one command: `/ping`.

When a member joins, the bot sends a welcome embed to channel `1554179439624196247`. The embed includes the member’s mention, username, avatar, current member count, and join time. `/testwelcome` uses the same welcome message path for the command user.

The warning command is `ورن`. Moderators can use `ورن السبب` while replying to a member’s message, or `ورن @member السبب`. Warning counts are stored in `data/warnings.json` and survive bot restarts. The third warning applies a 30-minute timeout.

## Add a command

Create a file in `src/commands/`, implement the `BotCommand` shape, and add it to the `commands` array in `src/commands/index.ts`. Register the updated command list, then restart the bot.

Keep larger systems in their own folders under `src/` and let `src/index.ts` stay focused on client setup, event routing, and lifecycle handling.