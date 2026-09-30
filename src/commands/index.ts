import type { BotCommand } from "../types/command.js";
import { pingCommand } from "./ping.js";
import { testWelcomeCommand } from "./testwelcome.js";
import { setupLogSystemCommand } from "./setup-log-system.ts";

export const commands: BotCommand[] = [
pingCommand,
testWelcomeCommand,
setupLogSystemCommand,
];
