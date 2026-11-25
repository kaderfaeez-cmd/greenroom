/**
 * Date helpers shared by the store, the dashboard and the job workspace.
 * Everything here works in the user's local calendar: a "day" is the day on
 * the user's wall clock, not the UTC date (toISOString) which is off by one
 * for part of the day everywhere except UTC.
 */

const pad = (n: number) => String(n).padStart(2, "0");

/** yyyy-mm-dd key for the local calendar day of `date`. */
export function dayKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Value for an <input type="date"> showing a stored interview timestamp (local day). */
export function toDateInputValue(iso: string): string {
  return dayKey(new Date(iso));
}

/** Stored interview timestamp for a picked date: 09:00 local time on that day. */
export function fromDateInputValue(value: string): string {
  return new Date(value + "T09:00:00").toISOString();
}
