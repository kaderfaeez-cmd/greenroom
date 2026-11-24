/** Date helpers shared by the store, the dashboard and the job workspace. */

/** yyyy-mm-dd key for a calendar day (used for the practice-activity log). */
export function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Value for an <input type="date"> showing a stored interview timestamp. */
export function toDateInputValue(iso: string): string {
  return iso.slice(0, 10);
}

/** Stored interview timestamp for a picked date: 09:00 local time on that day. */
export function fromDateInputValue(value: string): string {
  return new Date(value + "T09:00:00").toISOString();
}
