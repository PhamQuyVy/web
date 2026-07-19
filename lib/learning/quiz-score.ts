export type QuizQuestionAnswer = { id: string; answer: string };

export function calculateQuizScore(questions: QuizQuestionAnswer[], answers: Record<string, string>) {
  return questions.reduce(
    (score, question) => score + (answers[question.id] === question.answer ? 1 : 0),
    0,
  );
}
