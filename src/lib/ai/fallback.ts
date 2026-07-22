import type {
  Difficulty,
  InterviewQuestion,
  JobAnalysis,
  MockScores,
  QuestionCategory,
} from "@/lib/types";
import { uid } from "@/lib/utils";

/**
 * Zero-key analysis engine. Used when no Gemini key is configured or the API
 * fails. Heuristic, deterministic, and honest about being a lighter engine —
 * the UI labels results from this path as "Quick analysis".
 */

const TECH_TERMS = [
  "react", "next.js", "nextjs", "vue", "angular", "svelte", "typescript",
  "javascript", "node", "node.js", "python", "django", "flask", "fastapi",
  "java", "spring", "kotlin", "swift", "go", "golang", "rust", "c#", ".net",
  "php", "laravel", "ruby", "rails", "sql", "postgresql", "postgres", "mysql",
  "mongodb", "redis", "graphql", "rest", "docker", "kubernetes", "aws",
  "azure", "gcp", "terraform", "ci/cd", "git", "linux", "html", "css",
  "tailwind", "sass", "figma", "jest", "cypress", "playwright", "kafka",
  "rabbitmq", "elasticsearch", "react native", "flutter", "firebase",
  "supabase", "vercel", "serverless", "microservices", "machine learning",
  "tensorflow", "pytorch", "pandas", "numpy", "spark", "airflow", "excel",
  "power bi", "tableau", "salesforce", "sap", "jira", "confluence",
];

const SOFT_SKILL_PATTERNS: Array<[RegExp, string]> = [
  [/communicat/i, "Communication"],
  [/collaborat|cross[- ]functional|team player/i, "Collaboration"],
  [/leadership|lead a team|mentor/i, "Leadership & mentoring"],
  [/problem[- ]solv/i, "Problem solving"],
  [/detail[- ]orient|attention to detail/i, "Attention to detail"],
  [/fast[- ]paced|dynamic environment/i, "Working under pressure"],
  [/stakeholder/i, "Stakeholder management"],
  [/self[- ]start|autonomous|independen/i, "Autonomy & initiative"],
  [/adapt/i, "Adaptability"],
  [/prioriti[sz]/i, "Prioritisation"],
  [/present/i, "Presentation skills"],
];

const SENIORITY_PATTERNS: Array<[RegExp, string]> = [
  [/\b(principal|staff)\b/i, "Staff / Principal"],
  [/\b(senior|snr|sr\.?)\b/i, "Senior"],
  [/\b(lead|head of)\b/i, "Lead"],
  [/\b(junior|jnr|jr\.?|entry[- ]level|graduate|intern)\b/i, "Junior / Entry"],
  [/\b(mid[- ]level|intermediate)\b/i, "Mid-level"],
];

function extractLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.replace(/^[\s•\-–—*·▪◦]+/, "").trim())
    .filter((l) => l.length > 0);
}

function findSalary(text: string): string | null {
  const m = text.match(
    /(?:R|ZAR|\$|€|£|USD|EUR|GBP)\s?[\d][\d\s,.kK]*(?:\s?(?:-|to|–)\s?(?:R|ZAR|\$|€|£)?\s?[\d][\d\s,.kK]*)?(?:\s?(?:per|\/)\s?(?:year|annum|month|mo|yr|hour|hr))?/,
  );
  return m ? m[0].trim() : null;
}

function findCompany(text: string): string {
  // "Senior Engineer — Acme, Remote" / "Engineer at Acme" / "Join Acme"
  const title = text.match(/[—–-]\s*([A-Z][A-Za-z0-9&.' ]{1,30}?)\s*[,(\n]/);
  if (title && !/remote|hybrid|onsite/i.test(title[1])) return title[1].trim();
  const at = text.match(/(?:\bat|\bjoin|about)\s+([A-Z][A-Za-z0-9&.']{1,30}(?:\s[A-Z][A-Za-z0-9&.']{1,20}){0,2})(?:'s)?\b/);
  if (at) return at[1].trim();
  // "Acme is a fast-growing..." pattern
  const isA = text.match(/\b([A-Z][A-Za-z0-9&.']{2,30})\s+is\s+a\b/);
  if (isA) return isA[1].trim();
  const firstLine = extractLines(text)[0] ?? "";
  if (firstLine.length < 50 && /^[A-Z]/.test(firstLine) && !/engineer|developer|manager|designer|analyst/i.test(firstLine)) {
    return firstLine;
  }
  return "Unknown company";
}

function findRole(text: string): string {
  const rolePattern =
    /((?:senior|junior|lead|staff|principal|mid[- ]level)?\s?(?:full[- ]?stack|front[- ]?end|back[- ]?end|software|web|mobile|data|devops|cloud|qa|ml|ai|platform|product|project|ux|ui)?\s?(?:engineer|developer|designer|manager|analyst|scientist|architect|consultant|specialist|administrator|lead))/i;
  const m = text.match(rolePattern);
  return m ? m[1].trim().replace(/\s+/g, " ") : "Unknown role";
}

export function analyzeFallback(description: string): JobAnalysis {
  const lower = description.toLowerCase();
  const lines = extractLines(description);

  const technologies = TECH_TERMS.filter((t) => {
    const escaped = t.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
    return new RegExp(`(?:^|[^a-z])${escaped}(?:[^a-z]|$)`, "i").test(lower);
  }).map((t) => (t === "nextjs" ? "next.js" : t));
  const uniqueTech = [...new Set(technologies)];

  const softSkills = SOFT_SKILL_PATTERNS.filter(([re]) => re.test(description)).map(
    ([, label]) => label,
  );

  const seniority =
    SENIORITY_PATTERNS.find(([re]) => re.test(description))?.[1] ?? "Not specified";

  const responsibilities = lines
    .filter((l) =>
      /^(you will|you'll|design|build|develop|maintain|implement|lead|own|drive|collaborate|work with|create|manage|support|write|review|deploy|monitor|improve|optimi[sz]e)/i.test(l),
    )
    .slice(0, 8);

  // Section capture stops at the next known heading so bullets don't bleed across.
  const SECTION_END =
    /(?:nice to have|preferred|bonus|advantageous|benefits|we offer|perks|about (?:us|you|the)|responsibilit|what you(?:'|’)ll do|salary|compensation|how to apply)/i;

  const sliceSection = (match: RegExpMatchArray | null): string[] => {
    if (!match) return [];
    const body = match[1];
    const endIdx = body.slice(3).search(SECTION_END);
    return extractLines(endIdx >= 0 ? body.slice(0, endIdx + 3) : body);
  };

  const requiredSection = description.match(
    /(?:requirements?|must have|qualifications|what you(?:'|’)ll need|essential)[:\s]([\s\S]{0,800})/i,
  );
  const requiredLines = sliceSection(requiredSection).slice(0, 8);
  const requiredSkills =
    requiredLines.length > 0
      ? requiredLines
      : uniqueTech.slice(0, 6).map((t) => `Working proficiency in ${t}`);

  const preferredSection = description.match(
    /(?:nice to have|preferred|bonus|advantageous)[:\s]([\s\S]{0,500})/i,
  );
  const preferredSkills = sliceSection(preferredSection).slice(0, 6);

  const location =
    description.match(/\b(remote|hybrid|on[- ]?site)\b/i)?.[1] ??
    description.match(/(?:located in|based in|location:?\s*)([A-Z][A-Za-z ,]+)/)?.[1]?.trim() ??
    "Not specified";

  const cultureSignals: string[] = [];
  if (/fast[- ]paced|startup|scale[- ]?up/i.test(description))
    cultureSignals.push("Fast-paced environment — expect breadth over deep specialisation");
  if (/work[- ]life balance|flexible/i.test(description))
    cultureSignals.push("Flexibility emphasised — likely values autonomy");
  if (/collaborat|team/i.test(description))
    cultureSignals.push("Team collaboration repeatedly mentioned — expect pairing and reviews");
  if (/customer|client|user[- ]cent/i.test(description))
    cultureSignals.push("Customer-centric language — frame answers around user impact");

  const hiddenExpectations: string[] = [];
  if (/ambigu|wear many hats|scrappy/i.test(description))
    hiddenExpectations.push("Comfort with ambiguity — they may lack mature processes");
  if (/mentor|junior/i.test(description))
    hiddenExpectations.push("You may be expected to mentor less experienced colleagues");
  if (/legacy|migrat/i.test(description))
    hiddenExpectations.push("Likely legacy code or migration work behind the scenes");
  if (/on[- ]call|production support/i.test(description))
    hiddenExpectations.push("Production support / on-call duty is part of the job");
  if (hiddenExpectations.length === 0)
    hiddenExpectations.push(
      "Job ads sell the best version of the role — ask in the interview what a typical week actually looks like",
    );

  const redFlags: string[] = [];
  if (/rockstar|ninja|guru|wizard/i.test(description))
    redFlags.push('"Rockstar/ninja" language can signal unrealistic expectations');
  if (/urgent|immediate start|asap/i.test(description))
    redFlags.push("Urgency language may indicate turnover or planning issues");
  if (/wear many hats/i.test(description) && seniority.includes("Junior"))
    redFlags.push("Broad responsibilities at junior level — clarify scope and support");

  const likelyStages = [
    "Recruiter screen (30 min) — motivation, salary range, notice period",
    "Hiring manager interview — experience deep-dive, team fit",
    uniqueTech.length > 0
      ? `Technical round — expect questions on ${uniqueTech.slice(0, 3).join(", ")}`
      : "Skills assessment or case study",
    "Final round — values, culture, senior stakeholder",
  ];

  const company = findCompany(description);
  const role = findRole(description);

  return {
    company,
    role,
    seniority,
    location,
    salary: findSalary(description),
    requiredSkills,
    preferredSkills,
    responsibilities,
    technologies: uniqueTech,
    softSkills,
    atsKeywords: [...new Set([...uniqueTech, ...softSkills.map((s) => s.toLowerCase())])].slice(0, 15),
    cultureSignals,
    hiddenExpectations,
    likelyStages,
    redFlags,
    summary: `${
      seniority === "Not specified" || role.toLowerCase().includes(seniority.toLowerCase())
        ? ""
        : seniority + " "
    }${role} position${company === "Unknown company" ? "" : " at " + company}. ${uniqueTech.length > 0 ? "Core stack: " + uniqueTech.slice(0, 5).join(", ") + "." : ""} ${softSkills.length > 0 ? "Strong emphasis on " + softSkills.slice(0, 2).join(" and ").toLowerCase() + "." : ""}`.trim(),
  };
}

interface QuestionTemplate {
  category: QuestionCategory;
  difficulty: Difficulty;
  question: (a: JobAnalysis) => string;
  whyTheyAsk: string;
  evaluating: string[];
  answerFramework: string;
  strongAnswerExample: string;
  commonMistakes: string[];
  when?: (a: JobAnalysis) => boolean;
}

const QUESTION_TEMPLATES: QuestionTemplate[] = [
  {
    category: "recruiter",
    difficulty: "easy",
    question: (a) => `Tell me about yourself and why you're interested in this ${a.role} role.`,
    whyTheyAsk: "Opens every screen. Recruiters check communication, relevance, and whether your story maps to the job.",
    evaluating: ["Concise self-presentation", "Relevance to the role", "Genuine motivation"],
    answerFramework: "Present → past → future: current position and strength, one relevant achievement, why THIS role is the logical next step. 60–90 seconds.",
    strongAnswerExample: "I'm a developer focused on shipping user-facing products — most recently I built and launched a web platform that grew to 140+ active users. Before that I delivered client projects end to end. I'm applying here because this role centres on exactly that: owning features from idea to production.",
    commonMistakes: ["Reciting your CV chronologically", "Talking for 3+ minutes", "No link back to the role"],
  },
  {
    category: "recruiter",
    difficulty: "easy",
    question: () => "What are your salary expectations?",
    whyTheyAsk: "Budget filter. They want to know early if you're affordable — and whether you know your market value.",
    evaluating: ["Market awareness", "Negotiation posture", "Flexibility"],
    answerFramework: "Give a researched range, anchor slightly above target, signal flexibility on total package. Never a single number, never 'whatever you offer'.",
    strongAnswerExample: "Based on market data for this level and location I'm targeting the R–R range, though I weigh total package and growth, so I'm open to discussing structure.",
    commonMistakes: ["Underselling out of fear", "Refusing to answer at all", "Naming a number without research"],
  },
  {
    category: "behavioural",
    difficulty: "medium",
    question: () => "Tell me about a time you had to deliver under a tight deadline.",
    whyTheyAsk: "Deadline pressure is universal. They probe prioritisation, communication, and composure.",
    evaluating: ["Prioritisation", "Communication under pressure", "Outcome ownership"],
    answerFramework: "STAR. Emphasise the decision you made about what NOT to do, how you communicated the trade-off, and the measurable result.",
    strongAnswerExample: "Client needed a working recipe platform before a product launch (S). I owned the build (T). I cut scope to the core QR flow, shipped that first, and flagged the deferred features in writing (A). We launched on time; deferred items shipped the next week (R).",
    commonMistakes: ["Story with no measurable result", "Hero narrative — 'I worked all night'", "Blaming others for the deadline"],
  },
  {
    category: "behavioural",
    difficulty: "medium",
    question: () => "Describe a conflict with a colleague or client and how you resolved it.",
    whyTheyAsk: "Everyone hits conflict. They check maturity: do you escalate, avoid, or resolve?",
    evaluating: ["Emotional intelligence", "Direct communication", "Focus on the problem, not the person"],
    answerFramework: "STAR with emphasis on the other person's perspective. Show you sought to understand before pushing your view. End with the relationship intact or improved.",
    strongAnswerExample: "A client kept changing requirements mid-build (S). Instead of pushing back by email, I called them, walked through the cost of each change, and proposed a change-request process (A). Scope stabilised and the client renewed for a second project (R).",
    commonMistakes: ["'I've never had a conflict' — reads as evasive", "Painting the other person as the villain", "No resolution, just venting"],
  },
  {
    category: "behavioural",
    difficulty: "hard",
    question: () => "Tell me about a time you failed. What did you learn?",
    whyTheyAsk: "Tests self-awareness and growth mindset. Weak candidates dodge; strong ones own real failures.",
    evaluating: ["Honesty", "Self-awareness", "Applied learning"],
    answerFramework: "Pick a real failure with real stakes. Own your part plainly, name the lesson, then show a later situation where you applied it.",
    strongAnswerExample: "I once over-promised a delivery date without checking dependencies. It slipped two weeks and cost trust. Since then I estimate with buffers, confirm dependencies first, and share risks early — my last three projects all landed on the dates I committed.",
    commonMistakes: ["Fake failure ('I work too hard')", "Failure with no lesson", "Blaming circumstances"],
  },
  {
    category: "technical",
    difficulty: "medium",
    question: (a) =>
      a.technologies.length > 0
        ? `Walk me through a project where you used ${a.technologies[0]}. What decisions did you make and why?`
        : "Walk me through your most technically challenging project. What decisions did you make and why?",
    whyTheyAsk: "Project deep-dives separate people who used a technology from people who understand it.",
    evaluating: ["Depth of understanding", "Decision-making rationale", "Trade-off awareness"],
    answerFramework: "Context → constraint → decision → alternative you rejected and why → outcome. Name specific trade-offs; that's what seniors listen for.",
    strongAnswerExample: "For a live prediction platform I chose server-side rendering for the leaderboard because scores change constantly and SEO mattered. I considered pure client fetching but first-paint latency on mobile data was unacceptable. Result: sub-second loads for 148 active users during the tournament.",
    commonMistakes: ["Describing WHAT without WHY", "Claiming solo credit for team work", "No mention of trade-offs considered"],
  },
  {
    category: "technical",
    difficulty: "hard",
    question: (a) =>
      a.technologies.length > 1
        ? `How would you debug a performance problem in a production ${a.technologies[0]} application?`
        : "How would you debug a performance problem in production?",
    whyTheyAsk: "Debugging methodology reveals experience level faster than any algorithm question.",
    evaluating: ["Systematic approach", "Tooling knowledge", "Production awareness"],
    answerFramework: "Measure first — never guess. Reproduce, profile, isolate, fix one variable, verify with the same measurement. Mention monitoring so it doesn't recur.",
    strongAnswerExample: "First I'd quantify: which metric regressed, since when, for which users. Then correlate with deploys. Profile the suspected path, form one hypothesis, test it in isolation, ship the fix behind a flag, and confirm the metric recovers. Then add an alert so we catch the next one before users do.",
    commonMistakes: ["Jumping straight to a guessed fix", "No measurement before or after", "Ignoring the 'don't let it recur' step"],
  },
  {
    category: "system-design",
    difficulty: "hard",
    question: () => "Design a system that needs to handle a sudden 10x traffic spike. What breaks first and how do you prepare?",
    whyTheyAsk: "Tests whether you think in bottlenecks and failure modes rather than boxes and arrows.",
    evaluating: ["Bottleneck identification", "Pragmatism over buzzwords", "Cost awareness"],
    answerFramework: "Identify the bottleneck order: DB connections → app CPU → bandwidth. Cache aggressively, queue writes, degrade gracefully. Say what you'd NOT build until needed.",
    strongAnswerExample: "First casualty is usually the database — connection pool exhaustion. I'd put a CDN and cache in front of read-heavy endpoints, queue non-critical writes, and add autoscaling on the app tier. I would not shard pre-emptively; that complexity isn't justified until data proves it.",
    commonMistakes: ["Buzzword salad — Kafka + microservices for everything", "No mention of measuring or load testing", "Over-engineering for imaginary scale"],
    when: (a) => !a.seniority.includes("Junior"),
  },
  {
    category: "leadership",
    difficulty: "medium",
    question: () => "How do you bring a struggling teammate up to speed without hurting delivery?",
    whyTheyAsk: "Even non-managers get this at mid+ level. Tests empathy plus pragmatism.",
    evaluating: ["Coaching instinct", "Balancing individual vs team needs", "Discretion"],
    answerFramework: "Diagnose privately first — skill gap, context gap, or personal issue? Pair on real work, set small visible wins, review progress. Escalate only after genuine support.",
    strongAnswerExample: "I'd start with a private conversation to understand the cause. If it's a skill gap, I'd pair with them on a real ticket, then give them a slightly stretched task with a check-in halfway. People rarely need rescuing — they need context and a fair runway.",
    commonMistakes: ["Going straight to the manager", "Public correction", "Doing their work for them"],
    when: (a) => !a.seniority.includes("Junior"),
  },
  {
    category: "culture",
    difficulty: "easy",
    question: (a) =>
      a.company !== "Unknown company"
        ? `Why do you want to work at ${a.company} specifically?`
        : "Why do you want to work at this company specifically?",
    whyTheyAsk: "Filters spray-and-pray applicants. They want evidence you researched them.",
    evaluating: ["Research effort", "Genuine motivation", "Values alignment"],
    answerFramework: "One specific fact about the company (product, market, engineering culture) + one personal connection to it + what you bring. Never 'great culture' with no specifics.",
    strongAnswerExample: "Your product solves scheduling for small clinics — I've built client platforms in exactly that under-served small-business space, and I like that your engineering blog shows you ship weekly. That pace matches how I work.",
    commonMistakes: ["Generic praise that fits any company", "Only talking about what YOU get", "Visibly zero research"],
  },
  {
    category: "scenario",
    difficulty: "medium",
    question: () => "You disagree with a technical decision your team has already made. What do you do?",
    whyTheyAsk: "Tests disagree-and-commit maturity. Both silent compliance and endless relitigating are failure modes.",
    evaluating: ["Judgement on when to push", "Communication", "Commitment after decision"],
    answerFramework: "Assess stakes first. If material: raise concerns once, with data, to the right audience. Then commit fully regardless of outcome — and revisit only if new evidence appears.",
    strongAnswerExample: "If it's reversible and low-stakes, I note my concern and move on. If it risks users or serious rework, I write up the concern with evidence and propose an alternative. Once the team decides, I execute that decision as if it were mine.",
    commonMistakes: ["'I'd escalate to management' as step one", "Relitigating in every standup", "Pretending you'd always agree"],
  },
  {
    category: "recruiter",
    difficulty: "easy",
    question: () => "Do you have any questions for us?",
    whyTheyAsk: "Your questions reveal more than your answers — they show what you actually care about.",
    evaluating: ["Engagement", "Seniority of thinking", "Preparation"],
    answerFramework: "Always have 3 ready: one about the team's current challenge, one about how success is measured in 6 months, one about the interviewer's own experience. Never 'no questions'.",
    strongAnswerExample: "What does the first 90 days look like for this role — and what would make you say the hire was a clear success? Also, what's the hardest problem the team is working on right now?",
    commonMistakes: ["No questions at all", "Only asking about leave and perks", "Questions answered on page one of their website"],
  },
];

export function questionsFallback(analysis: JobAnalysis): InterviewQuestion[] {
  return QUESTION_TEMPLATES.filter((t) => !t.when || t.when(analysis)).map((t) => ({
    id: uid("q_"),
    category: t.category,
    question: t.question(analysis),
    whyTheyAsk: t.whyTheyAsk,
    evaluating: t.evaluating,
    answerFramework: t.answerFramework,
    strongAnswerExample: t.strongAnswerExample,
    commonMistakes: t.commonMistakes,
    difficulty: t.difficulty,
    practiced: false,
  }));
}

/** Heuristic scoring of a mock-interview answer. */
export function scoreFallback(answer: string): { scores: MockScores; feedback: string } {
  const words = answer.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const sentences = answer.split(/[.!?]+/).filter((s) => s.trim().length > 3);
  const avgSentence = sentences.length > 0 ? wordCount / sentences.length : wordCount;

  const hasStructure = /first|then|finally|because|so that|as a result|for example|situation|result/i.test(answer);
  const hasNumbers =
    /\d|\b(?:one|two|three|four|five|six|seven|eight|nine|ten|dozen|half|double|triple)\s+(?:weeks?|days?|months?|years?|users?|clients?|people|percent|times?|projects?)\b/i.test(
      answer,
    );
  const hasHedging = /(maybe|i guess|i think possibly|kind of|sort of|not sure)/i.test(answer);
  const hasOwnership = /\bI (built|led|designed|decided|shipped|fixed|created|owned|delivered|launched)\b/i.test(answer);

  const lengthScore =
    wordCount < 20 ? 3 : wordCount < 50 ? 6 : wordCount <= 220 ? 9 : 6;
  const structure = Math.min(10, (hasStructure ? 7 : 4) + (hasNumbers ? 2 : 0));
  const clarity = Math.min(10, avgSentence > 30 ? 4 : avgSentence > 22 ? 6 : 8) + (hasHedging ? -1 : 1);
  const depth = Math.min(10, lengthScore + (hasNumbers ? 1 : 0));
  const confidence = Math.min(10, (hasHedging ? 4 : 7) + (hasOwnership ? 2 : 0));

  const scores: MockScores = {
    structure: Math.max(1, Math.min(10, structure)),
    clarity: Math.max(1, Math.min(10, clarity)),
    depth: Math.max(1, Math.min(10, depth)),
    confidence: Math.max(1, Math.min(10, confidence)),
    overall: 0,
  };
  scores.overall = Math.round(
    ((scores.structure + scores.clarity + scores.depth + scores.confidence) / 4) * 10,
  ) / 10;

  const notes: string[] = [];
  if (wordCount < 30)
    notes.push("Too short — interviewers read brevity here as lack of experience. Aim for 60–150 words with one concrete example.");
  if (wordCount > 250)
    notes.push("Running long. Tighten to the strongest example; end on the result.");
  if (!hasStructure)
    notes.push("Add structure: situation → what you did → result. Signposting words (\"first\", \"as a result\") help the listener follow.");
  if (!hasNumbers)
    notes.push("No numbers. Even one metric (users, %, time saved) makes the story land harder.");
  if (hasHedging)
    notes.push("Hedging language detected (\"I guess\", \"kind of\"). State things plainly — you either did it or you didn't.");
  if (!hasOwnership)
    notes.push('Use "I" for your own actions. "We" everywhere hides your contribution.');
  if (notes.length === 0)
    notes.push("Solid answer — structured, concrete, confident. Consider one sharper opening line that states the outcome up front.");

  return { scores, feedback: notes.join("\n\n") };
}
