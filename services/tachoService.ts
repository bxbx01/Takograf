import { Activity, ActivityType, Violation, ViolationLevel, StatusSummary, Suggestion } from '../types';
import {
  CONTINUOUS_DRIVING_LIMIT,
  DAILY_DRIVING_LIMIT_EXTENDED,
  DAILY_DRIVING_LIMIT_NORMAL,
  WEEKLY_DRIVING_LIMIT,
  BI_WEEKLY_DRIVING_LIMIT,
  MINIMUM_BREAK_AFTER_CONTINUOUS_DRIVING,
  MINIMUM_SPLIT_BREAK_1,
  MINIMUM_SPLIT_BREAK_2,
  DAILY_REST_NORMAL,
  DAILY_REST_REDUCED,
  MAX_WORK_PERIOD_BEFORE_WEEKLY_REST,
  HOUR,
  DAY,
  MINUTE,
  WEEKLY_REST_REDUCED,
  WEEKLY_REST_NORMAL,
  DAILY_WORK_PERIOD_NORMAL,
  DAILY_WORK_PERIOD_EXTENDED
} from '../constants';
import { getWeekNumber, getAllWeeksInRange, getWeekEnd } from '../utils/date';
import { formatDuration, formatFullDuration } from '../utils/formatters';

// --- Internal Helper Functions ---

const processOngoingActivities = (activities: Activity[]): Activity[] => {
    const now = new Date();
    return activities.map(act => {
        if (act.end === null) {
            return { ...act, end: now };
        }
        return act;
    });
};

/**
 * Injects implicit rest periods into the activity stream for gaps larger than a reduced daily rest.
 * @param sortedActivities - A list of activities, sorted by start time.
 * @returns A new list of activities including the implicit rests.
 */
const augmentActivitiesWithImplicitRests = (sortedActivities: Activity[]): Activity[] => {
    if (sortedActivities.length < 2) {
        return sortedActivities;
    }

    const allEvents: Activity[] = [sortedActivities[0]];
    for (let i = 0; i < sortedActivities.length - 1; i++) {
        const currentAct = sortedActivities[i];
        const nextAct = sortedActivities[i + 1];
        const gapDuration = nextAct.start.getTime() - currentAct.end!.getTime();

        if (gapDuration >= DAILY_REST_REDUCED) {
            allEvents.push({
                id: `implicit-rest-${currentAct.id}-${nextAct.id}`,
                type: ActivityType.REST,
                start: currentAct.end!,
                end: nextAct.start,
            });
        }
        allEvents.push(nextAct);
    }
    return allEvents;
};

interface RestDebt {
    amount: number;
    deadline: Date;
}

/**
 * Calculates and compensates for rest debts based on reduced weekly rests.
 * This is a central function for all rest debt logic.
 * @param activities - All activities.
 * @param initialWeeklyRestEnd - The end date of the last weekly rest before the activities start.
 * @returns An array of outstanding rest debts.
 */
const calculateAndCompensateRestDebts = (activities: Activity[], initialWeeklyRestEnd: Date | null): RestDebt[] => {
    let restDebts: RestDebt[] = [];
    
    const relevantActivities = activities
        .filter(act => !initialWeeklyRestEnd || act.end! > initialWeeklyRestEnd)
        .sort((a, b) => a.start.getTime() - b.start.getTime());

    // Logic to identify and invalidate consecutive reduced rests
    const weeklyRests = relevantActivities.filter(act => {
        const duration = act.end!.getTime() - act.start.getTime();
        return act.type === ActivityType.REST && duration >= WEEKLY_REST_REDUCED;
    });

    const restsByWeek = new Map<string, { isReduced: boolean, actId: string }[]>();
    weeklyRests.forEach(rest => {
        const duration = rest.end!.getTime() - rest.start.getTime();
        const weekKey = getWeekNumber(rest.end!);
        if (!restsByWeek.has(weekKey)) restsByWeek.set(weekKey, []);
        restsByWeek.get(weekKey)!.push({
            isReduced: duration < WEEKLY_REST_NORMAL,
            actId: rest.id,
        });
    });
    
    const invalidReducedRestIds = new Set<string>();
    const sortedWeekKeys = Array.from(restsByWeek.keys()).sort();
    if (sortedWeekKeys.length > 1) {
        const allWeeksInPeriod = getAllWeeksInRange(sortedWeekKeys[0], sortedWeekKeys[sortedWeekKeys.length - 1]);
        for (let i = 0; i < allWeeksInPeriod.length - 1; i++) {
            const week1Rests = restsByWeek.get(allWeeksInPeriod[i]) || [];
            const week2Rests = restsByWeek.get(allWeeksInPeriod[i + 1]) || [];
            const hasNormalRestInPeriod = week1Rests.some(r => !r.isReduced) || week2Rests.some(r => !r.isReduced);
            if (week1Rests.length > 0 && week1Rests.every(r => r.isReduced) &&
                week2Rests.length > 0 && week2Rests.every(r => r.isReduced) &&
                !hasNormalRestInPeriod) {
                week2Rests.forEach(r => invalidReducedRestIds.add(r.actId));
            }
        }
    }

    // Main debt calculation loop
    const weeksWithNormalRestCompleted = new Set<string>();
    const weeksWithReducedRestCompleted = new Set<string>();

    for (const act of relevantActivities) {
        if (act.type !== ActivityType.REST) continue;

        const restDuration = act.end!.getTime() - act.start.getTime();
        const weekKey = getWeekNumber(act.end!);

        // Debt payment with surplus from normal/long rests
        if (restDuration >= WEEKLY_REST_NORMAL) {
            weeksWithNormalRestCompleted.add(weekKey);
            let surplus = restDuration - WEEKLY_REST_NORMAL;
            if (surplus > 0) {
                restDebts.sort((a, b) => a.deadline.getTime() - b.deadline.getTime());
                for (const debt of restDebts) {
                    if (surplus <= 0) break;
                    const payment = Math.min(surplus, debt.amount);
                    debt.amount -= payment;
                    surplus -= payment;
                }
                restDebts = restDebts.filter(d => d.amount > MINUTE);
            }
        } 
        // Debt creation from the FIRST valid reduced rest in a week
        else if (restDuration >= WEEKLY_REST_REDUCED && 
                   !invalidReducedRestIds.has(act.id) &&
                   !weeksWithNormalRestCompleted.has(weekKey) &&
                   !weeksWithReducedRestCompleted.has(weekKey)) {
            const deficit = WEEKLY_REST_NORMAL - restDuration;
            const endOfWeek = getWeekEnd(act.end!);
            const deadline = new Date(endOfWeek.getTime() + 2 * 7 * DAY);
            restDebts.push({ amount: deficit, deadline: deadline });
            weeksWithReducedRestCompleted.add(weekKey);
        }
    }

    return restDebts.sort((a, b) => a.deadline.getTime() - b.deadline.getTime());
};

// --- Violation Checking Sub-routines ---

const _checkInputValidation = (activities: Activity[]): Violation[] => {
    const violations: Violation[] = [];
    for (let i = 0; i < activities.length - 1; i++) {
        if (activities[i].end! > activities[i+1].start) {
            violations.push({
                level: ViolationLevel.Violation,
                message: `Hata: Faaliyetler çakışıyor. '${activities[i+1].type}' faaliyeti, henüz bitmemiş olan '${activities[i].type}' faaliyeti sırasında başlıyor.`,
                activityId: activities[i+1].id
            });
        }
    }
    return violations;
};

const _checkContinuousDriving = (activities: Activity[]): Violation[] => {
    const violations: Violation[] = [];
    let continuousDrivingTime = 0;
    let potentialFirstSplitBreak = false;
    for (const activity of activities) {
        if (activity.type === ActivityType.DRIVING) {
            continuousDrivingTime += activity.end!.getTime() - activity.start.getTime();
            if (continuousDrivingTime > CONTINUOUS_DRIVING_LIMIT + (5 * MINUTE)) {
                violations.push({
                    level: ViolationLevel.Violation,
                    message: `İHLAL! Kesintisiz sürüş süresi (4 saat 30 dakika) aşıldı! Mevcut kesintisiz sürüş: ${formatDuration(continuousDrivingTime)}.`,
                    activityId: activity.id,
                });
            }
        } else if (activity.type === ActivityType.BREAK || activity.type === ActivityType.REST) {
            const breakDuration = activity.end!.getTime() - activity.start.getTime();
            if (breakDuration >= MINIMUM_BREAK_AFTER_CONTINUOUS_DRIVING || (potentialFirstSplitBreak && breakDuration >= MINIMUM_SPLIT_BREAK_2)) {
                continuousDrivingTime = 0;
                potentialFirstSplitBreak = false;
            } else if (breakDuration >= MINIMUM_SPLIT_BREAK_1) {
                potentialFirstSplitBreak = true;
            }
        }
    }
    return violations;
};

const _checkDailyRules = (activities: Activity[], lastWeeklyRestEnd: Date | null): Violation[] => {
    const violations: Violation[] = [];
    const firstActivityTime = activities.length > 0 ? activities[0].start : null;
    let lastQualifyingRestEnd: Date = lastWeeklyRestEnd ?? firstActivityTime ?? new Date();
    let lastWeeklyRestForRights: Date = lastWeeklyRestEnd ?? firstActivityTime ?? new Date();
    let driveTimeInCurrentWorkPeriod = 0;
    let reducedRestsUsedSinceLastWeekly = 0;
    const extendedDrivesPerWeek = new Map<string, number>();
    const extendedWorkPeriodsPerWeek = new Map<string, number>();

    // Process completed work periods
    for (const activity of activities) {
        if (activity.end! <= lastQualifyingRestEnd) continue;
        if (activity.type === ActivityType.DRIVING) {
            driveTimeInCurrentWorkPeriod += activity.end!.getTime() - Math.max(activity.start.getTime(), lastQualifyingRestEnd.getTime());
        }
        if (activity.type === ActivityType.REST) {
            const restDuration = activity.end!.getTime() - activity.start.getTime();
            if (restDuration >= WEEKLY_REST_REDUCED) {
                lastWeeklyRestForRights = activity.end!;
                reducedRestsUsedSinceLastWeekly = 0;
            }
            if (restDuration >= DAILY_REST_REDUCED) {
                const workPeriodEnd = activity.start;
                const workPeriodDuration = workPeriodEnd.getTime() - lastQualifyingRestEnd.getTime();
                if (workPeriodDuration > DAY) {
                    violations.push({
                        level: ViolationLevel.Violation,
                        message: `İHLAL! Son dinlenmenizin bitiminden itibaren 24 saat içinde yeni bir günlük dinlenme almadınız.`,
                        activityId: activity.id,
                    });
                }
                const weekKey = getWeekNumber(workPeriodEnd);
                const driveExtensionsUsed = extendedDrivesPerWeek.get(weekKey) || 0;
                const workExtensionsUsed = extendedWorkPeriodsPerWeek.get(weekKey) || 0;
                if (workPeriodDuration > DAILY_WORK_PERIOD_EXTENDED || (workPeriodDuration > DAILY_WORK_PERIOD_NORMAL && workExtensionsUsed >= 2)) {
                    violations.push({ level: ViolationLevel.Violation, message: `İHLAL! Günlük çalışma süresi aşıldı. Süre: ${formatDuration(workPeriodDuration)}.`, activityId: activity.id });
                } else if (workPeriodDuration > DAILY_WORK_PERIOD_NORMAL) {
                    extendedWorkPeriodsPerWeek.set(weekKey, workExtensionsUsed + 1);
                }
                if (driveTimeInCurrentWorkPeriod > DAILY_DRIVING_LIMIT_EXTENDED || (driveTimeInCurrentWorkPeriod > DAILY_DRIVING_LIMIT_NORMAL && driveExtensionsUsed >= 2)) {
                    violations.push({ level: ViolationLevel.Violation, message: `İHLAL! Günlük sürüş süresi aşıldı. Sürüş: ${formatDuration(driveTimeInCurrentWorkPeriod)}.`, activityId: activity.id });
                } else if (driveTimeInCurrentWorkPeriod > DAILY_DRIVING_LIMIT_NORMAL) {
                    extendedDrivesPerWeek.set(weekKey, driveExtensionsUsed + 1);
                }
                if (restDuration < DAILY_REST_NORMAL) {
                    if (reducedRestsUsedSinceLastWeekly < 3) reducedRestsUsedSinceLastWeekly++;
                    else violations.push({ level: ViolationLevel.Violation, message: `İHLAL! Yetersiz günlük dinlenme. Kısaltılmış dinlenme hakkınız kalmadı. Dinlenme: ${formatDuration(restDuration)}.`, activityId: activity.id });
                }
                lastQualifyingRestEnd = activity.end!;
                driveTimeInCurrentWorkPeriod = 0;
            }
        }
    }
    
    // Process ongoing work period
    const lastActivity = activities.length > 0 ? activities[activities.length - 1] : null;
    if (lastActivity && lastActivity.end! > lastQualifyingRestEnd) {
        const ongoingWorkDuration = lastActivity.end!.getTime() - lastQualifyingRestEnd.getTime();
        let driveInOngoingPeriod = activities.filter(act => act.end! > lastQualifyingRestEnd && act.type === ActivityType.DRIVING)
            .reduce((sum, act) => sum + (act.end!.getTime() - Math.max(act.start.getTime(), lastQualifyingRestEnd.getTime())), 0);
        
        if (ongoingWorkDuration > DAY) violations.push({ level: ViolationLevel.Violation, message: `İHLAL! Son dinlenmenizden bu yana 24 saatlik periyotta yeterli günlük dinlenme alınmadı.`, activityId: lastActivity.id });

        const weekKey = getWeekNumber(lastActivity.end!);
        const driveExtensionsUsed = extendedDrivesPerWeek.get(weekKey) || 0;
        const workExtensionsUsed = extendedWorkPeriodsPerWeek.get(weekKey) || 0;
        if (ongoingWorkDuration > DAILY_WORK_PERIOD_EXTENDED || (ongoingWorkDuration > DAILY_WORK_PERIOD_NORMAL && workExtensionsUsed >= 2))
             violations.push({ level: ViolationLevel.Violation, message: `İHLAL! Mevcut çalışma periyodunda mesai limiti aşıldı! Süre: ${formatDuration(ongoingWorkDuration)}.`, activityId: lastActivity.id });
        if (driveInOngoingPeriod > DAILY_DRIVING_LIMIT_EXTENDED || (driveInOngoingPeriod > DAILY_DRIVING_LIMIT_NORMAL && driveExtensionsUsed >= 2))
            violations.push({ level: ViolationLevel.Violation, message: `İHLAL! Mevcut çalışma periyodunda sürüş limiti aşıldı! Sürüş: ${formatDuration(driveInOngoingPeriod)}.`, activityId: lastActivity.id });
    }
    return violations;
};

const _checkWeeklyDrivingRules = (activities: Activity[]): Violation[] => {
    const violations: Violation[] = [];
    const weeklyDriveTimes = new Map<string, number>();
    activities.forEach(act => {
        if (act.type === ActivityType.DRIVING) {
            let startTime = act.start.getTime();
            const endTime = act.end!.getTime();
            while (startTime < endTime) {
                const currentDate = new Date(startTime);
                const weekKey = getWeekNumber(currentDate);
                const dayOfWeek = currentDate.getUTCDay();
                const daysToNextMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
                const endOfWeek = new Date(currentDate);
                endOfWeek.setUTCDate(currentDate.getUTCDate() + daysToNextMonday);
                endOfWeek.setUTCHours(0, 0, 0, 0);
                const segmentEndTime = Math.min(endTime, endOfWeek.getTime());
                const durationInWeek = segmentEndTime - startTime;
                if (durationInWeek > 0) {
                    weeklyDriveTimes.set(weekKey, (weeklyDriveTimes.get(weekKey) || 0) + durationInWeek);
                }
                startTime = segmentEndTime;
            }
        }
    });

    const sortedWeekKeys = Array.from(weeklyDriveTimes.keys()).sort();
    if (sortedWeekKeys.length === 0) return [];
    
    // Single week violations
    weeklyDriveTimes.forEach((duration, weekKey) => {
        if (duration > WEEKLY_DRIVING_LIMIT) {
            violations.push({ level: ViolationLevel.Violation, message: `İHLAL! Haftalık sürüş süresi (56 saat) aşıldı (${weekKey})! Bu hafta: ${formatDuration(duration)}.` });
        }
    });

    // Bi-weekly violations
    const allWeeksInPeriod = getAllWeeksInRange(sortedWeekKeys[0], sortedWeekKeys[sortedWeekKeys.length - 1]);
    for (let i = 0; i < allWeeksInPeriod.length - 1; i++) {
        const week1Key = allWeeksInPeriod[i];
        const week2Key = allWeeksInPeriod[i + 1];
        const biWeeklyTotal = (weeklyDriveTimes.get(week1Key) || 0) + (weeklyDriveTimes.get(week2Key) || 0);
        if (biWeeklyTotal > BI_WEEKLY_DRIVING_LIMIT) {
            violations.push({ level: ViolationLevel.Violation, message: `İHLAL! İki haftalık sürüş süresi (90 saat) aşıldı! (${week1Key} & ${week2Key}). Toplam: ${formatDuration(biWeeklyTotal)}.` });
        }
    }
    return violations;
};

const _checkWeeklyRestRules = (activities: Activity[], lastWeeklyRestEnd: Date | null): Violation[] => {
    const violations: Violation[] = [];
    if (!activities.length) return [];
    
    let workPeriodReferenceDate: Date | null = lastWeeklyRestEnd;
    for (const act of activities) {
        if (act.type === ActivityType.REST && (act.end!.getTime() - act.start.getTime()) >= WEEKLY_REST_REDUCED) {
            if (!workPeriodReferenceDate || act.end! > workPeriodReferenceDate) {
                workPeriodReferenceDate = act.end!;
            }
        }
    }
    if (!workPeriodReferenceDate && activities.length > 0) {
        workPeriodReferenceDate = activities[0].start;
    }
    
    const lastActivity = activities[activities.length - 1];
    if (workPeriodReferenceDate && lastActivity.end!.getTime() - workPeriodReferenceDate.getTime() > MAX_WORK_PERIOD_BEFORE_WEEKLY_REST) {
        if (lastActivity.type !== ActivityType.REST || (lastActivity.end!.getTime() - lastActivity.start.getTime()) < WEEKLY_REST_REDUCED) {
            violations.push({
                level: ViolationLevel.Violation,
                message: `İHLAL! Son haftalık dinlenmenizden itibaren 6 günlük çalışma süresi aşıldı ve yeni bir haftalık dinlenmeye başlanmadı!`,
            });
        }
    }
    
    // Consecutive reduced rests check
    const weeklyRests = activities.filter(act => act.type === ActivityType.REST && (act.end!.getTime() - act.start.getTime()) >= WEEKLY_REST_REDUCED);
    const restsByWeek = new Map<string, { isReduced: boolean, actId: string }[]>();
    weeklyRests.forEach(rest => {
        const duration = rest.end!.getTime() - rest.start.getTime();
        const weekKey = getWeekNumber(rest.end!);
        if (!restsByWeek.has(weekKey)) restsByWeek.set(weekKey, []);
        restsByWeek.get(weekKey)!.push({ isReduced: duration < WEEKLY_REST_NORMAL, actId: rest.id });
    });
    
    const sortedWeekKeys = Array.from(restsByWeek.keys()).sort();
    if (sortedWeekKeys.length > 1) {
        const allWeeksInPeriod = getAllWeeksInRange(sortedWeekKeys[0], sortedWeekKeys[sortedWeekKeys.length - 1]);
        for (let i = 0; i < allWeeksInPeriod.length - 1; i++) {
            const week1Rests = restsByWeek.get(allWeeksInPeriod[i]) || [];
            const week2Rests = restsByWeek.get(allWeeksInPeriod[i + 1]) || [];
            const hasNormalRest = week1Rests.some(r => !r.isReduced) || week2Rests.some(r => !r.isReduced);
            if (week1Rests.length > 0 && week1Rests.every(r => r.isReduced) && week2Rests.length > 0 && week2Rests.every(r => r.isReduced) && !hasNormalRest) {
                violations.push({
                    level: ViolationLevel.Violation,
                    message: `İHLAL! Ardışık iki hafta boyunca azaltılmış haftalık dinlenme yapılamaz. Bu periyotta en az bir normal haftalık dinlenme (45 saat) alınmalıdır.`,
                    activityId: week2Rests[0]?.actId,
                });
            }
        }
    }
    return violations;
};

const _checkRestCompensationRules = (activities: Activity[], lastWeeklyRestEnd: Date | null): Violation[] => {
    const violations: Violation[] = [];
    const firstActivityTime = activities.length > 0 ? activities[0].start : null;
    const outstandingDebts = calculateAndCompensateRestDebts(activities, lastWeeklyRestEnd ?? firstActivityTime);
    if (outstandingDebts.length > 0 && outstandingDebts[0].deadline < new Date()) {
        violations.push({
            level: ViolationLevel.Violation,
            message: `İHLAL! Telafi edilmesi gereken dinlenme süresinin son tarihi (${outstandingDebts[0].deadline.toLocaleDateString('tr-TR')}) geçti!`,
        });
    }
    return violations;
};


// --- Main Exported Functions ---

export const checkAllViolations = (activities: Activity[], lastWeeklyRestEnd: Date | null): Violation[] => {
  if (!activities.length && !lastWeeklyRestEnd) return [];

  const processedActivities = processOngoingActivities(activities);
  
  const initialSortedActivities = [...processedActivities].sort((a, b) => {
      const startDiff = a.start.getTime() - b.start.getTime();
      if (startDiff !== 0) return startDiff;
      return a.end!.getTime() - b.end!.getTime();
  });
  const augmentedActivities = augmentActivitiesWithImplicitRests(initialSortedActivities);
  
  const violations = [
    ..._checkInputValidation(initialSortedActivities),
    ..._checkContinuousDriving(augmentedActivities),
    ..._checkDailyRules(augmentedActivities, lastWeeklyRestEnd),
    ..._checkWeeklyDrivingRules(augmentedActivities),
    ..._checkWeeklyRestRules(augmentedActivities, lastWeeklyRestEnd),
    ..._checkRestCompensationRules(augmentedActivities, lastWeeklyRestEnd),
  ];

  return violations;
};

export const calculateSummary = (activities: Activity[], lastWeeklyRestEnd: Date | null): StatusSummary => {
  const now = new Date();
  const summaryProcessedActivities = activities.map(act => {
      if (act.end === null) {
          // For summary display, we floor the current time to the last full minute.
          // This ensures a timer starting at 18:00 doesn't show 4h29m until 18:01.
          const effectiveNow = new Date(Math.floor(now.getTime() / MINUTE) * MINUTE);
          return { ...act, end: effectiveNow };
      }
      return act;
  });

  const initialSortedActivities = [...summaryProcessedActivities].sort((a, b) => {
      const startDiff = a.start.getTime() - b.start.getTime();
      if (startDiff !== 0) return startDiff;
      return a.end!.getTime() - b.end!.getTime();
  });
  const sortedActivities = augmentActivitiesWithImplicitRests(initialSortedActivities);

  const firstActivityTime = sortedActivities.length > 0 ? sortedActivities[0].start : null;
  const lastActivityTime = sortedActivities.length > 0 ? sortedActivities[sortedActivities.length - 1].end! : new Date();
  const currentWeekKey = getWeekNumber(lastActivityTime);

  if (!activities.length && !lastWeeklyRestEnd) {
    return {
        remainingContinuousDriving: CONTINUOUS_DRIVING_LIMIT,
        remainingDailyDrivingNormal: DAILY_DRIVING_LIMIT_NORMAL,
        remainingDailyDrivingExtended: DAILY_DRIVING_LIMIT_EXTENDED - DAILY_DRIVING_LIMIT_NORMAL,
        remainingDailyWorkNormal: DAILY_WORK_PERIOD_NORMAL,
        remainingDailyWorkExtended: DAILY_WORK_PERIOD_EXTENDED - DAILY_WORK_PERIOD_NORMAL,
        remainingWeeklyDriving: WEEKLY_DRIVING_LIMIT,
        remainingBiWeeklyDriving: BI_WEEKLY_DRIVING_LIMIT,
        timeUntilWeeklyRestDue: MAX_WORK_PERIOD_BEFORE_WEEKLY_REST,
        nextActionSuggestion: { level: ViolationLevel.Info, message: "Başlamak için ilk faaliyetinizi girin." },
        extendedDrivesUsedThisWeek: 0,
        extendedWorkPeriodsUsedThisWeek: 0,
        reducedRestsUsed: 0,
        totalUncompensatedRest: 0,
        uncompensatedRestDeadline: null,
        splitBreakInfo: null,
        currentWeekKey: currentWeekKey,
    };
  }

  // Continuous Driving & Split Break
  let continuousDrivingTime = 0;
  let splitBreakTaken = false;
  for (const act of sortedActivities) {
      if (act.type === ActivityType.DRIVING) continuousDrivingTime += act.end!.getTime() - act.start.getTime();
      else if (act.type === ActivityType.BREAK || act.type === ActivityType.REST) {
          const breakDuration = act.end!.getTime() - act.start.getTime();
          if (breakDuration >= MINIMUM_BREAK_AFTER_CONTINUOUS_DRIVING || (splitBreakTaken && breakDuration >= MINIMUM_SPLIT_BREAK_2)) {
              continuousDrivingTime = 0;
              splitBreakTaken = false;
          } else if (breakDuration >= MINIMUM_SPLIT_BREAK_1) {
              splitBreakTaken = true;
          }
      }
  }

  // Rights used (Extended drive/work, Reduced rest)
  let lastTrueWeeklyRestEnd = lastWeeklyRestEnd ?? firstActivityTime ?? new Date();
  for (let i = sortedActivities.length - 1; i >= 0; i--) {
      const act = sortedActivities[i];
      if (act.type === ActivityType.REST && (act.end!.getTime() - act.start.getTime()) >= WEEKLY_REST_REDUCED) {
          lastTrueWeeklyRestEnd = act.end!;
          break;
      }
  }
  
  let extendedDrivesUsedThisWeek = 0;
  let extendedWorkPeriodsUsedThisWeek = 0;
  let reducedRestsUsed = 0;
  let lastRestEndForRights = lastTrueWeeklyRestEnd;
  
  sortedActivities.forEach(act => {
      if (act.end! <= lastTrueWeeklyRestEnd) return;
      if (act.type === ActivityType.REST && (act.end!.getTime() - act.start.getTime()) >= DAILY_REST_REDUCED) {
        const workPeriodEnd = act.start;
        const workPeriodWeekKey = getWeekNumber(workPeriodEnd);
        const workDuration = workPeriodEnd.getTime() - lastRestEndForRights.getTime();
        const driveInPeriod = sortedActivities
            .filter(a => a.type === ActivityType.DRIVING && a.end! > lastRestEndForRights && a.start < workPeriodEnd)
            .reduce((sum, a) => sum + (Math.min(a.end!.getTime(), workPeriodEnd.getTime()) - Math.max(a.start.getTime(), lastRestEndForRights.getTime())), 0);
        
        if (workPeriodWeekKey === currentWeekKey) {
            if (driveInPeriod > DAILY_DRIVING_LIMIT_NORMAL) extendedDrivesUsedThisWeek++;
            if (workDuration > DAILY_WORK_PERIOD_NORMAL) extendedWorkPeriodsUsedThisWeek++;
        }
        if (act.end!.getTime() - act.start.getTime() < DAILY_REST_NORMAL) reducedRestsUsed++;
        lastRestEndForRights = act.end!;
      }
  });

  // Uncompensated Rest
  const outstandingDebts = calculateAndCompensateRestDebts(sortedActivities, lastWeeklyRestEnd ?? firstActivityTime);

  // Ongoing Period Calculation
  const ongoingWorkPeriodStart = lastRestEndForRights;
  const ongoingWorkDuration = lastActivityTime.getTime() - ongoingWorkPeriodStart.getTime();
  const driveInOngoingPeriod = sortedActivities
      .filter(act => act.end! > ongoingWorkPeriodStart && act.type === ActivityType.DRIVING)
      .reduce((sum, act) => sum + (act.end!.getTime() - Math.max(act.start.getTime(), ongoingWorkPeriodStart.getTime())), 0);
  
  const driveExtensionsAvailable = extendedDrivesUsedThisWeek < 2;
  const workExtensionsAvailable = extendedWorkPeriodsUsedThisWeek < 2;

  if (getWeekNumber(lastActivityTime) === currentWeekKey) {
    if (driveInOngoingPeriod > DAILY_DRIVING_LIMIT_NORMAL && driveExtensionsAvailable) extendedDrivesUsedThisWeek++;
    if (ongoingWorkDuration > DAILY_WORK_PERIOD_NORMAL && workExtensionsAvailable) extendedWorkPeriodsUsedThisWeek++;
  }

  // Weekly/Bi-Weekly Driving
  const weeklyDriveTimes = new Map<string, number>();
    sortedActivities.forEach(act => {
        if (act.type === ActivityType.DRIVING) {
            let startTime = act.start.getTime();
            const endTime = act.end!.getTime();
            while (startTime < endTime) {
                const currentDate = new Date(startTime);
                const weekKey = getWeekNumber(currentDate);
                const dayOfWeek = currentDate.getUTCDay();
                const daysToNextMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
                const endOfWeek = new Date(currentDate);
                endOfWeek.setUTCDate(currentDate.getUTCDate() + daysToNextMonday);
                endOfWeek.setUTCHours(0, 0, 0, 0);
                const segmentEndTime = Math.min(endTime, endOfWeek.getTime());
                const durationInWeek = segmentEndTime - startTime;
                if (durationInWeek > 0) weeklyDriveTimes.set(weekKey, (weeklyDriveTimes.get(weekKey) || 0) + durationInWeek);
                startTime = segmentEndTime;
            }
        }
    });
    const prevWeekKey = getWeekNumber(new Date(lastActivityTime.getTime() - 7 * DAY));
    const currentWeekDriving = weeklyDriveTimes.get(currentWeekKey) || 0;
    const previousWeekDriving = weeklyDriveTimes.get(prevWeekKey) || 0;

  // Time until weekly rest
  let workPeriodReferenceDate: Date | null = lastWeeklyRestEnd;
  for (const act of sortedActivities) {
      if (act.type === ActivityType.REST && (act.end!.getTime() - act.start.getTime()) >= WEEKLY_REST_REDUCED) {
          if (!workPeriodReferenceDate || act.end! > workPeriodReferenceDate) workPeriodReferenceDate = act.end!;
      }
  }
  if (!workPeriodReferenceDate && sortedActivities.length > 0) workPeriodReferenceDate = sortedActivities[0].start;
  const timeSinceStart = workPeriodReferenceDate ? (lastActivityTime.getTime() - workPeriodReferenceDate.getTime()) : 0;
  
  // Final summary construction
  const summary: StatusSummary = {
    remainingContinuousDriving: CONTINUOUS_DRIVING_LIMIT - continuousDrivingTime,
    remainingDailyDrivingNormal: DAILY_DRIVING_LIMIT_NORMAL - Math.min(driveInOngoingPeriod, DAILY_DRIVING_LIMIT_NORMAL),
    remainingDailyDrivingExtended: (DAILY_DRIVING_LIMIT_EXTENDED - DAILY_DRIVING_LIMIT_NORMAL) - Math.max(0, driveInOngoingPeriod - DAILY_DRIVING_LIMIT_NORMAL),
    remainingDailyWorkNormal: DAILY_WORK_PERIOD_NORMAL - Math.min(ongoingWorkDuration, DAILY_WORK_PERIOD_NORMAL),
    remainingDailyWorkExtended: (DAILY_WORK_PERIOD_EXTENDED - DAILY_WORK_PERIOD_NORMAL) - Math.max(0, ongoingWorkDuration - DAILY_WORK_PERIOD_NORMAL),
    remainingWeeklyDriving: WEEKLY_DRIVING_LIMIT - currentWeekDriving,
    remainingBiWeeklyDriving: BI_WEEKLY_DRIVING_LIMIT - (currentWeekDriving + previousWeekDriving),
    timeUntilWeeklyRestDue: MAX_WORK_PERIOD_BEFORE_WEEKLY_REST - timeSinceStart,
    extendedDrivesUsedThisWeek,
    extendedWorkPeriodsUsedThisWeek,
    reducedRestsUsed,
    totalUncompensatedRest: outstandingDebts.reduce((sum, debt) => sum + debt.amount, 0),
    uncompensatedRestDeadline: outstandingDebts.length > 0 ? outstandingDebts[0].deadline : null,
    splitBreakInfo: splitBreakTaken ? { firstPartTaken: true } : null,
    currentWeekKey,
    nextActionSuggestion: { level: ViolationLevel.Info, message: "Yeni bir faaliyet girin." }, // Default, will be overridden
  };

  // Set nextActionSuggestion
  const totalRemainingDriving = summary.remainingDailyDrivingNormal + (extendedDrivesUsedThisWeek < 2 ? summary.remainingDailyDrivingExtended : 0);
  const totalRemainingWork = summary.remainingDailyWorkNormal + (extendedWorkPeriodsUsedThisWeek < 2 ? summary.remainingDailyWorkExtended : 0);
  
  let suggestion: Suggestion = { level: ViolationLevel.Info, message: `Bir sonraki molanıza ${formatDuration(summary.remainingContinuousDriving)} kaldı.` };
  if (summary.remainingBiWeeklyDriving < 0) suggestion = { level: ViolationLevel.Violation, message: `İHLAL! İki haftalık sürüş limitinizi (90 saat) aştınız! Sürüşe devam edemezsiniz.` };
  else if (summary.remainingWeeklyDriving < 0) suggestion = { level: ViolationLevel.Violation, message: `İHLAL! Haftalık sürüş limitinizi (56 saat) aştınız! Bu hafta daha fazla sürüş yapamazsınız.` };
  else if (summary.timeUntilWeeklyRestDue < 0) suggestion = { level: ViolationLevel.Violation, message: `İHLAL! 6 günlük çalışma periyodunu aştınız. ACİLEN haftalık dinlenmeye başlayın!` };
  else if (totalRemainingWork < 0) suggestion = { level: ViolationLevel.Violation, message: `İHLAL! Günlük çalışma sürenizi aştınız. ACİLEN günlük dinlenmeye başlayın.` };
  else if (totalRemainingDriving < 0) suggestion = { level: ViolationLevel.Violation, message: `İHLAL! Günlük sürüş limitinizi aştınız. ACİLEN günlük dinlenmeye başlayın.` };
  else if (summary.remainingContinuousDriving < 0) suggestion = { level: ViolationLevel.Violation, message: `İHLAL! Kesintisiz sürüş limitinizi aştınız. ACİLEN ${formatDuration(MINIMUM_BREAK_AFTER_CONTINUOUS_DRIVING)} mola vermelisiniz!` };
  else if (ongoingWorkDuration > DAILY_WORK_PERIOD_NORMAL && extendedWorkPeriodsUsedThisWeek > 0) suggestion = { level: ViolationLevel.Warning, message: `UYARI! 13 saatlik mesaiyi aştınız, uzatma hakkı kullanılıyor. Kalan süre: ${formatDuration(totalRemainingWork)}` };
  else if (driveInOngoingPeriod > DAILY_DRIVING_LIMIT_NORMAL && extendedDrivesUsedThisWeek > 0) suggestion = { level: ViolationLevel.Warning, message: `UYARI! 9 saatlik sürüşü aştınız, uzatma hakkı kullanılıyor. Kalan süre: ${formatDuration(totalRemainingDriving)}` };
  else if (totalRemainingDriving <= 0) suggestion = { level: ViolationLevel.Warning, message: `Günlük sürüş limitinize ulaştınız. Günlük dinlenmeye başlayın.` };
  else if (totalRemainingWork <= 0) suggestion = { level: ViolationLevel.Warning, message: `Günlük çalışma limitinize ulaştınız. Günlük dinlenmeye başlayın.` };
  else if (summary.remainingContinuousDriving <= 0) suggestion = { level: ViolationLevel.Warning, message: `Kesintisiz sürüş limitinize ulaştınız. ${formatDuration(MINIMUM_BREAK_AFTER_CONTINUOUS_DRIVING)} mola verin.` };
  else if (summary.timeUntilWeeklyRestDue <= DAY) suggestion = { level: ViolationLevel.Info, message: `Haftalık dinlenmeniz yaklaşıyor! Kalan süre: ${formatFullDuration(summary.timeUntilWeeklyRestDue)}.` };
  else if (summary.remainingContinuousDriving <= 30 * MINUTE) suggestion = { level: ViolationLevel.Info, message: `Kesintisiz sürüş limitiniz dolmak üzere. ${formatDuration(MINIMUM_BREAK_AFTER_CONTINUOUS_DRIVING)} mola vermeyi planlayın.` };
  
  summary.nextActionSuggestion = suggestion;

  return summary;
};