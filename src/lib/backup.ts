import { STORE_VERSION, persistedDataSchema } from "./persistence.ts";

/** Validation of a backup file before it replaces the stored app data. */

export type BackupParseResult = { ok: true; text: string } | { ok: false; error: string };

const INVALID = "That file isn't a valid Greenroom backup.";

/**
 * Accepts only a complete, well-formed backup (any version up to the current
 * one) and returns the document to store, already at STORE_VERSION. A file
 * with any malformed entry is rejected whole, so nothing half-valid is written.
 */
export function parseBackup(text: string): BackupParseResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: INVALID };
  }
  if (typeof parsed !== "object" || parsed === null) return { ok: false, error: INVALID };
  const { state, version = 0 } = parsed as { state?: unknown; version?: unknown };
  if (typeof state !== "object" || state === null) return { ok: false, error: INVALID };
  if (typeof version !== "number" || !Number.isInteger(version) || version < 0) {
    return { ok: false, error: INVALID };
  }
  if (version > STORE_VERSION) {
    return { ok: false, error: "That backup comes from a newer version of Greenroom." };
  }
  const data = persistedDataSchema.safeParse(state);
  if (!data.success) {
    return { ok: false, error: `${INVALID} Some saved items are damaged or missing fields.` };
  }
  return { ok: true, text: JSON.stringify({ state: data.data, version: STORE_VERSION }) };
}
