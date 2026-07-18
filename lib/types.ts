export type Skill = {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  badge: string;
  meta: string;
  href: string;
  active?: boolean;
};

export type RoadmapTask = {
  title: string;
  text: string;
  tags: string[];
};

export type RoadmapStep = {
  id: string;
  number: number;
  title: string;
  time: string;
  accent: string;
  lessonId: string;
  quizId: string;
  tasks: RoadmapTask[];
  note: string;
};

export type VocabularyItem = {
  id: string;
  hanzi: string;
  pinyin: string;
  type: string;
  meaning: string;
  example: string;
  exampleMeaning: string;
  hsk: number;
  topic?: string;
};

export type KnowledgeCard = {
  id: string;
  title: string;
  category: string;
  summary: string;
  examples: string[];
  tip: string;
};

export type CurriculumStage = {
  id: string;
  level: string;
  title: string;
  goal: string;
  focus: string[];
  practice: string[];
  output: string;
  recommendedLessonId: string;
};

export type QuizQuestion = {
  id: string;
  prompt: string;
  options: string[];
  answer: string;
};

export type Lesson = {
  id: string;
  title: string;
  subtitle: string;
  level: string;
  durationMinutes: number;
  summary: string;
  sections: {
    title: string;
    body: string;
  }[];
  vocabularyIds: string[];
  quiz: QuizQuestion[];
};

export type GrammarPattern = {
  id: string;
  title: string;
  level: string;
  formula: string;
  explanation: string;
  examples: string[];
  verified?: boolean;
  sourceName?: string;
  sourceUrl?: string;
  verificationNote?: string;
};

export type Dialogue = {
  id: string;
  title: string;
  level: string;
  situation: string;
  lines: {
    speaker: string;
    hanzi: string;
    pinyin: string;
    meaning: string;
  }[];
};

export type ReadingPractice = {
  id: string;
  title: string;
  level: string;
  passage: string;
  pinyin: string;
  meaning: string;
  questions: string[];
};

export type ListeningPractice = {
  id: string;
  title: string;
  level: string;
  audioText: string;
  pinyin: string;
  meaning: string;
  questions: QuizQuestion[];
};

export type WritingPrompt = {
  id: string;
  title: string;
  level: string;
  prompt: string;
  hints: string[];
  sample: string;
};

export type User = {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: string;
};

export type ManagedUser = {
  id: string;
  email: string;
  name: string;
  provider: string;
  createdAt: string;
  updatedAt: string;
  totalLogins: number;
  loginsToday: number;
  loginsThisMonth: number;
  lastLoginAt: string | null;
};

export type Session = {
  id: string;
  userId: string;
  expiresAt: string;
};

export type QuizAttempt = {
  lessonId: string;
  correct: number;
  total: number;
  answers: Record<string, string>;
  completedAt: string;
};

export type UserProgress = {
  userId: string;
  completedLessonIds: string[];
  lessonCompletions: Record<string, string>;
  quizAttempts: QuizAttempt[];
};

export type AppDb = {
  skills: Skill[];
  roadmap: RoadmapStep[];
  vocabulary: VocabularyItem[];
  knowledge: KnowledgeCard[];
  curriculum: CurriculumStage[];
  lessons: Lesson[];
  grammarPatterns: GrammarPattern[];
  dialogues: Dialogue[];
  listeningPractice: ListeningPractice[];
  readingPractice: ReadingPractice[];
  writingPrompts: WritingPrompt[];
  users: User[];
  sessions: Session[];
  progress: UserProgress[];
};
