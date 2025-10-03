import { useMemo } from 'react';
import { Activity, Violation, StatusSummary } from '../types';
import { checkAllViolations, calculateSummary } from '../services/tachoService';

/**
 * A custom hook that performs all tachograph analysis (violations and summary).
 * It memoizes the results to prevent re-calculation on every render.
 * @param activities The list of user activities.
 * @param lastWeeklyRestEnd The end date of the last known weekly rest.
 * @returns An object containing the calculated violations and summary.
 */
const useTachoAnalysis = (activities: Activity[], lastWeeklyRestEnd: Date | null) => {
  const analysisResult = useMemo<{ violations: Violation[]; summary: StatusSummary | null; }>(() => {
    const newViolations = checkAllViolations(activities, lastWeeklyRestEnd);
    const newSummary = calculateSummary(activities, lastWeeklyRestEnd);
    return { violations: newViolations, summary: newSummary };
  }, [activities, lastWeeklyRestEnd]);

  return analysisResult;
};

export default useTachoAnalysis;
