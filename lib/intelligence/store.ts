import "server-only";

import { promises as fs } from "fs";
import path from "path";
import { createSeedState } from "./seed";
import type { PersistedIntelligenceState } from "./state";

const INTELLIGENCE_FILE = path.join(
  process.cwd(),
  "data",
  "intelligence.json",
);

let accessChain: Promise<unknown> = Promise.resolve();
let writeSequence = 0;

function withSerializedAccess<T>(operation: () => Promise<T>): Promise<T> {
  const pending = accessChain.then(operation, operation);
  accessChain = pending.then(
    () => undefined,
    () => undefined,
  );
  return pending;
}

function isPersistedState(value: unknown): value is PersistedIntelligenceState {
  if (!value || typeof value !== "object") return false;
  const state = value as Partial<PersistedIntelligenceState>;

  return (
    state.schemaVersion === 2 &&
    typeof state.updatedAt === "string" &&
    typeof state.runSequence === "number" &&
    Boolean(state.boundary) &&
    state.boundary?.mode === "shadow" &&
    state.boundary.mainFlowConnected === false &&
    state.boundary.shadowOnly === true &&
    state.boundary.enforced === false &&
    state.boundary.deployedRules === 0 &&
    state.boundary.store === "data/intelligence.json" &&
    state.boundary.syntheticDataOnly === true &&
    state.boundary.externalCalls === false &&
    Array.isArray(state.agents) &&
    Array.isArray(state.reports) &&
    Boolean(state.graph) &&
    Array.isArray(state.graph?.nodes) &&
    Array.isArray(state.graph?.edges) &&
    Array.isArray(state.patterns) &&
    Array.isArray(state.shadowRules) &&
    Array.isArray(state.riskAssessments) &&
    Boolean(state.shadowOutput) &&
    state.shadowOutput?.shadowOnly === true &&
    state.shadowOutput.enforced === false &&
    state.shadowOutput.mainFlowConnected === false &&
    Array.isArray(state.agentRuns)
  );
}

async function atomicWrite(state: PersistedIntelligenceState): Promise<void> {
  const directory = path.dirname(INTELLIGENCE_FILE);
  const tempFile = `${INTELLIGENCE_FILE}.${process.pid}.${++writeSequence}.tmp`;
  await fs.mkdir(directory, { recursive: true });

  try {
    await fs.writeFile(tempFile, JSON.stringify(state, null, 2), "utf8");
    await fs.rename(tempFile, INTELLIGENCE_FILE);
  } catch (error) {
    await fs.unlink(tempFile).catch(() => undefined);
    throw error;
  }
}

async function readWithoutLock(): Promise<PersistedIntelligenceState> {
  try {
    const contents = await fs.readFile(INTELLIGENCE_FILE, "utf8");
    const parsed: unknown = JSON.parse(contents);
    if (!isPersistedState(parsed)) {
      throw new Error("Unsupported intelligence store shape");
    }
    return parsed;
  } catch {
    const seeded = createSeedState();
    await atomicWrite(seeded);
    return seeded;
  }
}

export function readIntelligenceState(): Promise<PersistedIntelligenceState> {
  return withSerializedAccess(readWithoutLock);
}

export function mutateIntelligenceState(
  mutation: (state: PersistedIntelligenceState) => void | Promise<void>,
): Promise<PersistedIntelligenceState> {
  return withSerializedAccess(async () => {
    const state = await readWithoutLock();
    await mutation(state);
    await atomicWrite(state);
    return state;
  });
}

export function resetIntelligenceState(): Promise<PersistedIntelligenceState> {
  return withSerializedAccess(async () => {
    const seeded = createSeedState();
    await atomicWrite(seeded);
    return seeded;
  });
}
