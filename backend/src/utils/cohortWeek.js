/**
 * Calendar week of a cohort: Week 1 = Introduction week, Weeks 2–11 = the 10 graded
 * learning weeks (assessment week_number = calendarWeek - 1), Week 12 = final
 * assessment + capstone submission. Capped to [1, 12].
 */
export function currentCalendarWeek(cohort, now = new Date()) {
  const start = new Date(cohort.start_date);
  const diffMs = now.getTime() - start.getTime();
  if (diffMs < 0) return 0; // cohort hasn't started yet
  const week = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000)) + 1;
  return Math.min(Math.max(week, 1), 12);
}

/** A video for week N is visible once the cohort has reached calendar week N (never before). */
export function isWeekUnlocked(cohort, weekNumber, now = new Date()) {
  return currentCalendarWeek(cohort, now) >= weekNumber;
}

/** An assessment is only attemptable within its own opens_at/closes_at window (Thursday–Sunday of its week). */
export function isAssessmentOpen(assessment, now = new Date()) {
  const opens = new Date(assessment.opens_at);
  const closes = new Date(assessment.closes_at);
  return now >= opens && now <= closes;
}
