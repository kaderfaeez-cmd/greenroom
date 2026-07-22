/** Application pipeline stages, in board order. */
export const STAGES = [
  "wishlist",
  "applied",
  "screen",
  "technical",
  "final",
  "offer",
  "closed",
] as const;
export type Stage = (typeof STAGES)[number];

export const STAGE_LABELS: Record<Stage, string> = {
  wishlist: "Wishlist",
  applied: "Applied",
  screen: "Screen",
  technical: "Technical",
  final: "Final round",
  offer: "Offer",
  closed: "Closed",
};

export type QuestionCategory =
  | "recruiter"
  | "behavioural"
  | "technical"
  | "system-design"
  | "leadership"
  | "culture"
  | "scenario";

export const QUESTION_CATEGORY_LABELS: Record<QuestionCategory, string> = {
  recruiter: "Recruiter screen",
  behavioural: "Behavioural",
  technical: "Technical",
  "system-design": "System design",
  leadership: "Leadership",
  culture: "Culture fit",
  scenario: "Scenario",
};

export type Difficulty = "easy" | "medium" | "hard";

export interface InterviewQuestion {
  id: string;
  category: QuestionCategory;
  question: string;
  whyTheyAsk: string;
  evaluating: string[];
  answerFramework: string;
  strongAnswerExample: string;
  commonMistakes: string[];
  difficulty: Difficulty;
  practiced: boolean;
}

export interface JobAnalysis {
  company: string;
  role: string;
  seniority: string;
  location: string;
  salary: string | null;
  requiredSkills: string[];
  preferredSkills: string[];
  responsibilities: string[];
  technologies: string[];
  softSkills: string[];
  atsKeywords: string[];
  cultureSignals: string[];
  hiddenExpectations: string[];
  likelyStages: string[];
  redFlags: string[];
  summary: string;
}

export interface StarStory {
  id: string;
  title: string;
  competency: string;
  situation: string;
  task: string;
  action: string;
  result: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface MockTurn {
  id: string;
  role: "interviewer" | "candidate" | "feedback";
  content: string;
  /** Present on feedback turns: 1–10 scores. */
  scores?: MockScores;
  at: string;
}

export interface MockScores {
  structure: number;
  clarity: number;
  depth: number;
  confidence: number;
  overall: number;
}

export interface MockSession {
  id: string;
  jobId: string;
  category: QuestionCategory;
  turns: MockTurn[];
  startedAt: string;
  endedAt: string | null;
  averageScore: number | null;
}

export interface JobNote {
  id: string;
  text: string;
  createdAt: string;
}

export interface Job {
  id: string;
  company: string;
  role: string;
  stage: Stage;
  descriptionRaw: string;
  analysis: JobAnalysis | null;
  questions: InterviewQuestion[];
  notes: JobNote[];
  interviewDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export type AiTask =
  | "analyze"
  | "questions"
  | "mock-question"
  | "mock-feedback"
  | "star-suggest";

export interface AiRequest {
  task: AiTask;
  payload: Record<string, unknown>;
}
