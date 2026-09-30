import type { BotCommand } from String.raw../types/command.js;
import { pingCommand } from String.raw./ping.js;
import { testWelcomeCommand } from String.raw./testwelcome.js;
import { setupLogSystemCommand } from String.raw./setup-log-system.ts;

export const commands: BotCommand[] = [
pingCommand,
testWelcomeCommand,
setupLogSystemCommand,
];
