export enum ActivityType {
  START_WORK = 'İşe Başlama',
  DRIVING = 'Sürüş',
  BREAK = 'Mola',
  REST = 'Dinlenme',
  OTHER_WORK = 'Diğer İş',
  END_WORK = 'İş Bitimi',
}

export interface Activity {
  id: string;
  type: ActivityType;
  start: Date;
  end: Date | null;
}

export enum ViolationLevel {
  Info = 'Bilgi',
  Warning = 'Uyarı',
  Violation = 'İhlal',
}

export interface Violation {
  level: ViolationLevel;
  message: string;
  activityId?: string;
}

export interface Suggestion {
  level: ViolationLevel;
  message: string;
}

export interface StatusSummary {
  remainingContinuousDriving: number;
  remainingDailyDrivingNormal: number;
  remainingDailyDrivingExtended: number;
  remainingDailyWorkNormal: number;
  remainingDailyWorkExtended: number;
  remainingWeeklyDriving: number;
  remainingBiWeeklyDriving: number;
  timeUntilWeeklyRestDue: number;
  nextActionSuggestion: Suggestion;
  extendedDrivesUsedThisWeek: number;
  extendedWorkPeriodsUsedThisWeek: number;
  reducedRestsUsed: number;
  totalUncompensatedRest: number;
  uncompensatedRestDeadline: Date | null;
  splitBreakInfo: {
    firstPartTaken: boolean;
  } | null;
  currentWeekKey: string;
}

export interface ActivitySettings {
  hours: number;
  minutes: number;
}

export type DurationalActivityType = ActivityType.DRIVING | ActivityType.BREAK | ActivityType.REST | ActivityType.OTHER_WORK;

export type AppSettings = {
  [key in DurationalActivityType]: ActivitySettings;
};