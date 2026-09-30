import type { BotCommand } from "../types/command.js";
import { pingCommand } from "./ping.js";
import { testWelcomeCommand } from "./testwelcome.js";

export const commands: BotCommand[] = [pingCommand, testWelcomeCommand];