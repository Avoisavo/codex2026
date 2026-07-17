import { promises as fs } from "fs";
import path from "path";
import { type DbShape, seedDb } from "./types";

const FILE = path.join(process.cwd(), "data", "db.json");

// Serialise all access so concurrent requests can't clobber the file.
let chain: Promise<unknown> = Promise.resolve();
function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = chain.then(fn, fn);
  chain = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

async function readRaw(): Promise<DbShape> {
  try {
    const txt = await fs.readFile(FILE, "utf-8");
    const parsed = JSON.parse(txt) as Partial<DbShape>;
    return {
      users: parsed.users ?? [],
      transfers: parsed.transfers ?? [],
      suspicious: parsed.suspicious ?? [],
    };
  } catch {
    // Missing or corrupt → create seeded file
    const seeded = seedDb();
    await writeRaw(seeded);
    return seeded;
  }
}

async function writeRaw(db: DbShape): Promise<void> {
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(db, null, 2), "utf-8");
}

/** Read the whole local DB (seeds on first use). */
export function read(): Promise<DbShape> {
  return withLock(readRaw);
}

/** Atomically read-modify-write the local DB. */
export function mutate(fn: (db: DbShape) => void): Promise<DbShape> {
  return withLock(async () => {
    const db = await readRaw();
    fn(db);
    await writeRaw(db);
    return db;
  });
}

/** Replace the entire local DB (used by reset). */
export function replace(db: DbShape): Promise<DbShape> {
  return withLock(async () => {
    await writeRaw(db);
    return db;
  });
}
