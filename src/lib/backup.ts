/** Validation of a backup file before it replaces the stored app data. */

export type BackupParseResult = { ok: true; text: string } | { ok: false; error: string };

const INVALID = "That file isn't a valid Greenroom backup.";

export function parseBackup(text: string): BackupParseResult {
  try {
    const parsed = JSON.parse(text);
    if (!parsed?.state || typeof parsed.state !== "object") {
      return { ok: false, error: INVALID };
    }
    return { ok: true, text };
  } catch {
    return { ok: false, error: INVALID };
  }
}
