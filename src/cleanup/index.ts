import type { Message } from "discord.js";

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
