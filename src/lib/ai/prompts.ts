import type { JobAnalysis, QuestionCategory } from "@/lib/types";

/** Prompt builders for the Gemini-backed engine. All request strict JSON. */

export function analyzePrompt(description: string): string {
  return `You are a senior technical recruiter and hiring manager with 15 years of experience. Analyze this job description with the insight of someone who has written hundreds of them and knows what they really mean.

Return ONLY valid JSON matching exactly this shape (no markdown, no commentary):
{
  "company": string,
  "role": string,
  "seniority": string,
  "location": string,
  "salary": string | null,
  "requiredSkills": string[],
  "preferredSkills": string[],
  "responsibilities": string[],
  "technologies": string[],
  "softSkills": string[],
  "atsKeywords": string[],
  "cultureSignals": string[],
  "hiddenExpectations": string[],
  "likelyStages": string[],
  "redFlags": string[],
  "summary": string
}

Rules:
- hiddenExpectations: read between the lines — what will this job ACTUALLY involve that the ad doesn't say?
- cultureSignals: infer culture from the language used, with reasoning.
- likelyStages: predict the real interview process for this company type and seniority, with what each stage tests.
- redFlags: honest warnings a career coach would give. Empty array if genuinely none.
- summary: 2-3 sentences a busy candidate can absorb in 10 seconds.
- Arrays: 3-8 items each, specific to THIS job, never generic filler.

Job description:
"""
${description}
"""`;
}

export function questionsPrompt(analysis: JobAnalysis): string {
  return `You are an interview coach who has prepped candidates for offers at top companies. Generate 12 highly personalized interview questions for this specific role.

Role context:
${JSON.stringify(analysis, null, 2)}

Return ONLY valid JSON: an array of exactly 12 objects with this shape:
{
  "category": "recruiter" | "behavioural" | "technical" | "system-design" | "leadership" | "culture" | "scenario",
  "question": string,
  "whyTheyAsk": string,
  "evaluating": string[],
  "answerFramework": string,
  "strongAnswerExample": string,
  "commonMistakes": string[],
  "difficulty": "easy" | "medium" | "hard"
}

Rules:
- Mix: 2 recruiter, 3 behavioural, 3 technical (referencing the ACTUAL technologies above), 1 system-design (skip for junior roles, use scenario instead), 1 leadership (skip for junior, use behavioural), 1 culture, 1 scenario.
- Questions must reference the specific company, stack, and responsibilities — a reader should be able to tell which job these are for.
- strongAnswerExample: a realistic first-person answer, 60-100 words, concrete and specific.
- whyTheyAsk: the interviewer's real motive, stated candidly.
- commonMistakes: 2-3 specific traps.`;
}

export function mockQuestionPrompt(
  analysis: JobAnalysis,
  category: QuestionCategory,
  previousTurns: string,
): string {
  return `You are conducting a realistic ${category} interview for this role:
${analysis.role} at ${analysis.company} (${analysis.seniority}). Stack: ${analysis.technologies.join(", ") || "n/a"}.

Conversation so far:
${previousTurns || "(none — this is the opening question)"}

Ask the SINGLE next interview question. Rules:
- If the candidate just answered, ask a natural follow-up that digs into their answer — challenge an assumption, ask for specifics, or probe a gap. Only move to a new topic if the current one is exhausted.
- Sound like a real human interviewer: brief, direct, occasionally acknowledging their previous answer in a few words first.
- Never ask multiple questions at once. Never explain what you're evaluating.
- Return ONLY the question text, no JSON, no quotes.`;
}

export function mockFeedbackPrompt(question: string, answer: string): string {
  return `You are a direct but supportive interview coach. Evaluate this interview answer.

Question: "${question}"
Answer: "${answer}"

Return ONLY valid JSON:
{
  "scores": { "structure": 1-10, "clarity": 1-10, "depth": 1-10, "confidence": 1-10, "overall": number },
  "feedback": string
}

Rules:
- overall = average of the four scores, one decimal.
- feedback: 3-5 short paragraphs separated by blank lines. Lead with the strongest thing they did, then the 2 highest-impact improvements with a concrete rewrite suggestion for their weakest moment. Quote their own words when pointing at problems.
- Be honest — a 5 is a 5. Inflated scores help nobody.`;
}

export function starSuggestPrompt(competency: string, roughNotes: string): string {
  return `You are an interview coach helping a candidate turn rough notes into a tight STAR story for the competency "${competency}".

Their rough notes:
"""
${roughNotes}
"""

Return ONLY valid JSON:
{
  "title": string,
  "situation": string,
  "task": string,
  "action": string,
  "result": string,
  "tags": string[]
}

Rules:
- Stay 100% faithful to their facts — polish the telling, never invent achievements.
- situation/task: 1-2 sentences each. action: 2-4 sentences, "I" statements. result: 1-2 sentences, quantified if their notes allow.
- title: 4-8 words, memorable.
- tags: 2-4 competency tags.`;
}
