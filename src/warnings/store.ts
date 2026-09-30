import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

type StoredWarning = {
  issuedAt: number;
};

type WarningStore = Record<string, Record<string, StoredWarning[]>>;

type StoreUpdate<T> = {
  result: T;
  changed: boolean;
};

export const WARNING_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

const dataPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../data/warnings.json",
);

let storePromise: Promise<WarningStore> | undefined;
let operationQueue = Promise.resolve();
let storeNeedsPersistence = false;
let expirationTimer: NodeJS.Timeout | undefined;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

async function loadStore(): Promise<WarningStore> {
  try {
    const content = await readFile(dataPath, "utf8");
    const parsed: unknown = JSON.parse(content);

    if (!isRecord(parsed)) {
      throw new Error(`Warning store must contain a JSON object: ${dataPath}`);
    }

    const now = Date.now();
    const store: WarningStore = {};

    for (const [guildId, rawGuildWarnings] of Object.entries(parsed)) {
      if (!isRecord(rawGuildWarnings)) {
        throw new Error(`Warning store contains an invalid guild entry: ${guildId}`);
      }

      const guildWarnings: Record<string, StoredWarning[]> = {};
      for (const [memberId, rawWarnings] of Object.entries(rawGuildWarnings)) {
        if (typeof rawWarnings === "number") {
          if (!Number.isInteger(rawWarnings) || rawWarnings < 0) {
            throw new Error(`Warning store contains an invalid count for ${guildId}/${memberId}`);
          }

          guildWarnings[memberId] = Array.from(
            { length: rawWarnings },
            () => ({ issuedAt: now }),
          );
          storeNeedsPersistence = true;
          continue;
        }

        if (!Array.isArray(rawWarnings)) {
          throw new Error(`Warning store contains invalid warnings for ${guildId}/${memberId}`);
        }

        guildWarnings[memberId] = rawWarnings.map((rawWarning) => {
          if (
            !isRecord(rawWarning) ||
            typeof rawWarning.issuedAt !== "number" ||
            !Number.isFinite(rawWarning.issuedAt) ||
            rawWarning.issuedAt < 0
          ) {
            throw new Error(`Warning store contains an invalid warning for ${guildId}/${memberId}`);
          }

          return { issuedAt: rawWarning.issuedAt };
        });
      }

      store[guildId] = guildWarnings;
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

function removeExpiredWarnings(store: WarningStore, now: number) {
  let changed = false;

  for (const [guildId, guildWarnings] of Object.entries(store)) {
    for (const [memberId, warnings] of Object.entries(guildWarnings)) {
      const activeWarnings = warnings.filter(
        (warning) => warning.issuedAt + WARNING_DURATION_MS > now,
      );

      if (activeWarnings.length === warnings.length) {
        continue;
      }

      changed = true;
      if (activeWarnings.length === 0) {
        delete guildWarnings[memberId];
      } else {
        guildWarnings[memberId] = activeWarnings;
      }
    }

    if (Object.keys(guildWarnings).length === 0) {
      delete store[guildId];
    }
  }

  return changed;
}

function scheduleNextExpiration(store: WarningStore) {
  if (expirationTimer) {
    clearTimeout(expirationTimer);
    expirationTimer = undefined;
  }

  let nextExpiration = Number.POSITIVE_INFINITY;
  for (const guildWarnings of Object.values(store)) {
    for (const warnings of Object.values(guildWarnings)) {
      for (const warning of warnings) {
        nextExpiration = Math.min(
          nextExpiration,
          warning.issuedAt + WARNING_DURATION_MS,
        );
      }
    }
  }

  if (!Number.isFinite(nextExpiration)) {
    return;
  }

  expirationTimer = setTimeout(() => {
    expirationTimer = undefined;
    void expireWarnings().catch((error) => {
      console.error("Warning expiration failed:", error);
    });
  }, Math.max(0, nextExpiration - Date.now()));
  expirationTimer.unref();
}

async function persistStore(store: WarningStore) {
  await mkdir(dirname(dataPath), { recursive: true });
  const temporaryPath = `${dataPath}.${process.pid}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(store, null, 2)}\n`, "utf8");
  await rename(temporaryPath, dataPath);
}

function updateStore<T>(
  updater: (store: WarningStore, now: number) => StoreUpdate<T>,
) {
  const operation = operationQueue.then(async () => {
    const store = await getStore();
    const update = updater(store, Date.now());

    if (update.changed || storeNeedsPersistence) {
      await persistStore(store);
      storeNeedsPersistence = false;
    }

    scheduleNextExpiration(store);
    return update.result;
  });

  operationQueue = operation.then(
    () => undefined,
    () => undefined,
  );

  return operation;
}

export async function initializeWarningStore() {
  await updateStore((store, now) => ({
    result: undefined,
    changed: removeExpiredWarnings(store, now),
  }));
}

export function addWarning(guildId: string, memberId: string) {
  return updateStore((store, now) => {
    removeExpiredWarnings(store, now);

    const guildWarnings = (store[guildId] ??= {});
    const warnings = (guildWarnings[memberId] ??= []);
    warnings.push({ issuedAt: now });

    return {
      result: warnings.length,
      changed: true,
    };
  });
}

export function removeWarning(guildId: string, memberId: string) {
  return updateStore((store, now) => {
    const changed = removeExpiredWarnings(store, now);
    const guildWarnings = store[guildId];
    const warnings = guildWarnings?.[memberId];

    if (!warnings?.length) {
      return { result: 0, changed };
    }

    warnings.shift();
    if (warnings.length === 0) {
      delete guildWarnings[memberId];
    }
    if (guildWarnings && Object.keys(guildWarnings).length === 0) {
      delete store[guildId];
    }

    return { result: warnings.length, changed: true };
  });
}

export function resetWarnings(guildId: string, memberId: string) {
  return updateStore((store, now) => {
    const changed = removeExpiredWarnings(store, now);
    const guildWarnings = store[guildId];

    if (!guildWarnings?.[memberId]) {
      return { result: undefined, changed };
    }

    delete guildWarnings[memberId];
    if (Object.keys(guildWarnings).length === 0) {
      delete store[guildId];
    }

    return { result: undefined, changed: true };
  });
}

export function expireWarnings() {
  return updateStore((store, now) => ({
    result: undefined,
    changed: removeExpiredWarnings(store, now),
  }));
}