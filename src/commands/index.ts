import type { BotCommand } from "../types/command.js";

import { pingCommand } from "./ping.js";
import { testWelcomeCommand } from "./testwelcome.js";
import { setupLogSystemCommand } from "./setup-log-system.ts";
import { setupTicketsCommand } from "./setup-tickets.ts";
import { setupAutoRoleCommand } from "./setup-autorole.ts";
import { permissionsCommand } from "./permissions.ts";

export const commands: BotCommand[] = [
  pingCommand,
  testWelcomeCommand,
  setupLogSystemCommand,
  setupTicketsCommand,
  setupAutoRoleCommand,
  permissionsCommand,
];
