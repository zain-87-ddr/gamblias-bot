import {
  Events,
  type Client,
  type Message,
  type PartialMessage,
} from "discord.js";
import { TEMPORARY_MESSAGE_DELETE_DELAY_MS } from "./config.js";

const scheduledMessageIds = new Set<string>();

export function scheduleTemporaryDeletion(message: Message) {
  if (scheduledMessageIds.has(message.id)) {
    return;
  }

  scheduledMessageIds.add(message.id);
  setTimeout(() => {
    void message.delete().catch(() => undefined).finally(() => {
      scheduledMessageIds.delete(message.id);
    });
  }, TEMPORARY_MESSAGE_DELETE_DELAY_MS);
}

export async function sendTemporaryReply(message: Message, content: string) {
  const sentMessage = await message.reply({ content });
  scheduleTemporaryDeletion(sentMessage);
  return sentMessage;
}

export function registerAutoCleanupSystem(client: Client) {
  client.on(Events.MessageDelete, (message: Message | PartialMessage) => {
    scheduledMessageIds.delete(message.id);
  });
}