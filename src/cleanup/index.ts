import {
  Events,
  type Client,
  type Message,
} from "discord.js";

const CLEANUP_DELAY_MS = 30_000;

export async function sendTemporaryReply(
  message: Message,
  content: string,
) {
  const reply = await message.reply({
    content,
  });

  setTimeout(() => {
    void reply.delete().catch(() => {});
  }, CLEANUP_DELAY_MS);

  return reply;
}

export function registerAutoCleanupSystem(client: Client) {
  client.on(Events.MessageCreate, async (message: Message) => {
    if (message.author.bot || !message.guild) {
      return;
    }

    // النظام الأساسي للـ cleanup هنا يقدر يتوسع لاحقًا.
    // حاليًا الردود المؤقتة يتم التعامل معها بواسطة sendTemporaryReply.
  });
}
