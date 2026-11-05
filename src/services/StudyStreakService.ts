import { QuestionHistoryRecord, TestResultReport } from '../types/jee';

export interface DayActivity {
  dateStr: string;
  dayLabel: string;
  dateNumber: number;
  hasActivity: boolean;
  isToday: boolean;
  testsCount: number;
}

export interface StudyStreakInfo {
  currentStreak: number;
  bestStreak: number;
  testedToday: boolean;
  streakStatus: 'maintained' | 'at_risk' | 'broken' | 'unstarted';
  motivationalMessage: string;
  subMessage: string;
  lastActiveDateFormatted: string | null;
  brokenStreakCount: number;
  weeklyActivity: DayActivity[];
  totalActiveDays: number;
}

function toLocalDateStr(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export class StudyStreakService {
  /**
   * Computes the daily study streak, activity calendar, and motivational state
   * from test reports and student question history.
   */
  public static calculateStreak(
    reports: TestResultReport[] = [],
    historyMap: Record<string, QuestionHistoryRecord> = {}
  ): StudyStreakInfo {
    const activityCountByDate = new Map<string, number>();

    // 1. Gather submission timestamps from test reports
    for (const report of reports) {
      if (!report.submittedAt) continue;
      const d = new Date(report.submittedAt);
      if (isNaN(d.getTime())) continue;
      const dateStr = toLocalDateStr(d);
      activityCountByDate.set(dateStr, (activityCountByDate.get(dateStr) || 0) + 1);
    }

    // 2. Gather question attempt timestamps from historyMap
    for (const rec of Object.values(historyMap)) {
      if (!rec) continue;
      if (rec.lastAttemptedAt) {
        const d = new Date(rec.lastAttemptedAt);
        if (!isNaN(d.getTime())) {
          const dateStr = toLocalDateStr(d);
          activityCountByDate.set(dateStr, (activityCountByDate.get(dateStr) || 0) + 1);
        }
      }
      if (Array.isArray(rec.attempts)) {
        for (const att of rec.attempts) {
          if (!att.timestamp) continue;
          const d = new Date(att.timestamp);
          if (!isNaN(d.getTime())) {
            const dateStr = toLocalDateStr(d);
            activityCountByDate.set(dateStr, (activityCountByDate.get(dateStr) || 0) + 1);
          }
        }
      }
    }

    const today = new Date();
    const todayStr = toLocalDateStr(today);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = toLocalDateStr(yesterday);

    const testedToday = activityCountByDate.has(todayStr);
    const testedYesterday = activityCountByDate.has(yesterdayStr);

    // Compute active dates sorted chronologically
    const allActiveDates = Array.from(activityCountByDate.keys()).sort();
    const activeDateSet = new Set(allActiveDates);
    const totalActiveDays = activeDateSet.size;

    // Calculate Best Streak across full historical record
    let bestStreak = 0;
    if (allActiveDates.length > 0) {
      let tempStreak = 1;
      bestStreak = 1;
      for (let i = 1; i < allActiveDates.length; i++) {
        const prev = new Date(allActiveDates[i - 1]);
        const curr = new Date(allActiveDates[i]);
        const diffMs = curr.getTime() - prev.getTime();
        const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
          tempStreak++;
          if (tempStreak > bestStreak) bestStreak = tempStreak;
        } else if (diffDays > 1) {
          tempStreak = 1;
        }
      }
    }

    // Calculate Current Streak & Status
    let currentStreak = 0;
    let streakStatus: StudyStreakInfo['streakStatus'] = 'unstarted';
    let brokenStreakCount = 0;

    if (totalActiveDays === 0) {
      // New user - zero tests completed yet
      streakStatus = 'unstarted';
      currentStreak = 0;
    } else if (testedToday) {
      // Streak maintained today! Count backward from today
      streakStatus = 'maintained';
      currentStreak = 1;

      const cursor = new Date(today);
      while (true) {
        cursor.setDate(cursor.getDate() - 1);
        const cursorStr = toLocalDateStr(cursor);
        if (activeDateSet.has(cursorStr)) {
          currentStreak++;
        } else {
          break;
        }
      }
      if (currentStreak > bestStreak) {
        bestStreak = currentStreak;
      }
    } else if (testedYesterday) {
      // Tested yesterday but not yet today: Streak is at risk!
      streakStatus = 'at_risk';
      currentStreak = 1;

      const cursor = new Date(yesterday);
      while (true) {
        cursor.setDate(cursor.getDate() - 1);
        const cursorStr = toLocalDateStr(cursor);
        if (activeDateSet.has(cursorStr)) {
          currentStreak++;
        } else {
          break;
        }
      }
    } else {
      // Missed today AND missed yesterday -> Streak broken
      streakStatus = 'broken';
      currentStreak = 0;

      // Find the last consecutive run before the break
      if (allActiveDates.length > 0) {
        const lastDate = new Date(allActiveDates[allActiveDates.length - 1]);
        let run = 1;
        const cursor = new Date(lastDate);
        while (true) {
          cursor.setDate(cursor.getDate() - 1);
          const cursorStr = toLocalDateStr(cursor);
          if (activeDateSet.has(cursorStr)) {
            run++;
          } else {
            break;
          }
        }
        brokenStreakCount = run;
      }
    }

    // Determine Motivational Messages
    let motivationalMessage = '';
    let subMessage = '';

    if (streakStatus === 'maintained') {
      if (currentStreak === 1) {
        motivationalMessage = 'Day 1 in the books! Your streak has begun.';
        subMessage = 'Consistency in problem-solving is the single biggest predictor of JEE rank.';
      } else if (currentStreak <= 3) {
        motivationalMessage = `${currentStreak}-Day Study Streak maintained!`;
        subMessage = 'Daily problem velocity is compounding your formula recall and accuracy.';
      } else if (currentStreak <= 6) {
        motivationalMessage = `${currentStreak}-Day Study Streak! Relentless discipline.`;
        subMessage = 'Exam stamina and problem recognition are becoming second nature.';
      } else {
        motivationalMessage = `${currentStreak}-Day Master Streak! Exceptional preparation rigor.`;
        subMessage = 'Championship-grade daily habit across Physics, Chemistry, and Mathematics.';
      }
    } else if (streakStatus === 'at_risk') {
      motivationalMessage = `Your ${currentStreak}-day streak is on the line!`;
      subMessage = 'Take a Full Test, practice chapters, or review flashcards today to keep your streak burning.';
    } else if (streakStatus === 'broken') {
      if (brokenStreakCount > 1) {
        motivationalMessage = `Streak reset after ${brokenStreakCount} days. Time to rebuild!`;
        subMessage = 'Top rankers do not dwell on missed days. Take a test now to ignite a fresh, stronger streak.';
      } else {
        motivationalMessage = 'Study streak reset. Every day is a clean slate.';
        subMessage = 'Complete a test today to start your comeback run toward JEE consistency.';
      }
    } else {
      // Unstarted
      motivationalMessage = '0-Day Streak. Start your first exam session today!';
      subMessage = 'Complete a Full Syllabus or Chapter Test to kick off your daily preparation streak.';
    }

    // Format last active date
    let lastActiveDateFormatted: string | null = null;
    if (allActiveDates.length > 0) {
      const lastStr = allActiveDates[allActiveDates.length - 1];
      const parts = lastStr.split('-');
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      lastActiveDateFormatted = d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      });
    }

    // Generate 7-day activity strip ending with today
    const weeklyActivity: DayActivity[] = [];
    const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dStr = toLocalDateStr(d);
      const isDayToday = i === 0;
      const count = activityCountByDate.get(dStr) || 0;

      weeklyActivity.push({
        dateStr: dStr,
        dayLabel: DAY_NAMES[d.getDay()],
        dateNumber: d.getDate(),
        hasActivity: count > 0,
        isToday: isDayToday,
        testsCount: count,
      });
    }

    return {
      currentStreak,
      bestStreak: Math.max(bestStreak, currentStreak),
      testedToday,
      streakStatus,
      motivationalMessage,
      subMessage,
      lastActiveDateFormatted,
      brokenStreakCount,
      weeklyActivity,
      totalActiveDays,
    };
  }
}
