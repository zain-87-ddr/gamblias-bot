import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const SPAM_WINDOW_MS = 10 * 1000;
export const SPAM_MESSAGE_THRESHOLD = 6;
export const SPAM_HANDLED_COOLDOWN_MS = 10 * 60 * 1000;

export type SpamMessageRecord = {
  channelId: string;
  messageId: string;
  sentAt: number;
};

type SpamMemberState = {
  messages: SpamMessageRecord[];
  handledUntil?: number;
};

type SpamStore = Record<string, Record<string, SpamMemberState>>;

type StoreUpdate<T> = {
  result: T;
  changed: boolean;
};

const dataPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../data/automod-spam.json",
);

let storePromise: Promise<SpamStore> | undefined;
let operationQueue = Promise.resolve();
let storeNeedsPersistence = false;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isMessageRecord(value: unknown): value is SpamMessageRecord {
  return (
    isRecord(value) &&
    typeof value.channelId === "string" &&
    typeof value.messageId === "string" &&
    typeof value.sentAt === "number" &&
    Number.isFinite(value.sentAt)
  );
}

async function loadStore(): Promise<SpamStore> {
  try {
    const content = await readFile(dataPath, "utf8");
    const parsed: unknown = JSON.parse(content);

    if (!isRecord(parsed)) {
      throw new Error(`Spam store must contain a JSON object: ${dataPath}`);
    }

    const store: SpamStore = {};
    for (const [guildId, rawGuildState] of Object.entries(parsed)) {
      if (!isRecord(rawGuildState)) {
        throw new Error(`Spam store contains an invalid guild entry: ${guildId}`);
      }

      const guildState: Record<string, SpamMemberState> = {};
      for (const [memberId, rawMemberState] of Object.entries(rawGuildState)) {
        if (
          !isRecord(rawMemberState) ||
          !Array.isArray(rawMemberState.messages) ||
          !rawMemberState.messages.every(isMessageRecord) ||
          (rawMemberState.handledUntil !== undefined &&
            (typeof rawMemberState.handledUntil !== "number" ||
              !Number.isFinite(rawMemberState.handledUntil)))
        ) {
          throw new Error(`Spam store contains an invalid member entry: ${guildId}/${memberId}`);
        }

        guildState[memberId] = {
          messages: rawMemberState.messages,
          ...(rawMemberState.handledUntil === undefined
            ? {}
            : { handledUntil: rawMemberState.handledUntil }),
        };
      }

      store[guildId] = guildState;
    }

    return store;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return {};
    }

    throw error;
  }
}

async function getStore() {
  storePromise ??= loadStore();
  return storePromise;
}

function pruneStore(store: SpamStore, now: number) {
  let changed = false;

  for (const [guildId, guildState] of Object.entries(store)) {
    for (const [memberId, memberState] of Object.entries(guildState)) {
      const recentMessages = memberState.messages.filter(
        (message) => message.sentAt > now - SPAM_WINDOW_MS,
      );

      if (recentMessages.length !== memberState.messages.length) {
        memberState.messages = recentMessages;
        changed = true;
      }

      if (memberState.handledUntil !== undefined && memberState.handledUntil <= now) {
        delete memberState.handledUntil;
        changed = true;
      }

      if (memberState.messages.length === 0 && memberState.handledUntil === undefined) {
        delete guildState[memberId];
        changed = true;
      }
    }

    if (Object.keys(guildState).length === 0) {
      delete store[guildId];
      changed = true;
    }
  }

  return changed;
}

async function persistStore(store: SpamStore) {
  await mkdir(dirname(dataPath), { recursive: true });
  const temporaryPath = `${dataPath}.${process.pid}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(store, null, 2)}\n`, "utf8");
  await rename(temporaryPath, dataPath);
}

function updateStore<T>(
  updater: (store: SpamStore, now: number) => StoreUpdate<T>,
) {
  const operation = operationQueue.then(async () => {
    const store = await getStore();
    const update = updater(store, Date.now());

    if (update.changed || storeNeedsPersistence) {
      await persistStore(store);
      storeNeedsPersistence = false;
    }

    return update.result;
  });

  operationQueue = operation.then(
    () => undefined,
    () => undefined,
  );

  return operation;
}

export async function initializeSpamStore() {
  await updateStore((store, now) => ({
    result: undefined,
    changed: pruneStore(store, now),
  }));
}

export function recordSpamMessage(
  guildId: string,
  memberId: string,
  message: SpamMessageRecord,
) {
  return updateStore((store, now) => {
    const changedByPrune = pruneStore(store, now);
    const guildState = (store[guildId] ??= {});
    const memberState = (guildState[memberId] ??= { messages: [] });

    if (memberState.handledUntil !== undefined && memberState.handledUntil > now) {
      return {
        result: { triggered: false, messages: [] },
        changed: changedByPrune,
      };
    }

    memberState.messages.push(message);
    if (memberState.messages.length < SPAM_MESSAGE_THRESHOLD) {
      return {
        result: { triggered: false, messages: [] },
        changed: true,
      };
    }

    const messages = [...memberState.messages];
    memberState.messages = [];
    memberState.handledUntil = now + SPAM_HANDLED_COOLDOWN_MS;

    return {
      result: { triggered: true, messages },
      changed: true,
    };
  });
}