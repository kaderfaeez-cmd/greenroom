/** Max lengths (characters) for /api/ai inputs. Kept zod-free so client code can import it cheaply. */
export const LIMITS = {
  description: 20_000,
  question: 2_000,
  answer: 6_000,
  roughNotes: 6_000,
  competency: 100,
  /** The client sends only the tail of the transcript, so this is never hit in normal use. */
  previousTurns: 12_000,
  shortText: 300,
  longText: 2_000,
  listItems: 30,
} as const;
