import React, { useMemo, useState } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  Circle,
  Target,
  Plus,
  Trash2,
  Award,
  Flame,
  BookOpen,
  TrendingUp,
  AlertCircle,
  ArrowRight,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import {
  QuestionHistoryRecord,
  SubjectName,
  TestMode,
  TestResultReport,
} from '../types/jee';

export interface CalendarTarget {
  id: string;
  dateStr: string; // YYYY-MM-DD
  title: string;
  type: 'full_syllabus' | 'chapter_test' | 'active_recall' | 'mistake_retest' | 'custom';
  subject?: SubjectName;
  chapter?: string;
  notes?: string;
  completed: boolean;
  createdAt: string;
}

interface TestCalendarViewProps {
  reports: TestResultReport[];
  historyMap: Record<string, QuestionHistoryRecord>;
  onOpenReport: (testId: string) => void;
  onStartFullTest: () => void;
  onPracticeChapter: (subject?: SubjectName, chapter?: string) => void;
  onRetestMistakes: (subject?: SubjectName, chapter?: string, questionIds?: string[]) => void;
  onNavigateToRecall?: () => void;
}

const LS_CALENDAR_TARGETS_KEY = 'jee_calendar_scheduled_targets_v1';

function toLocalDateStr(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseLocalDateStr(dateStr: string): Date {
  const parts = dateStr.split('-');
  return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
}

function formatMinutes(seconds: number): string {
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return `${hrs}h ${rem}m`;
}

export const TestCalendarView: React.FC<TestCalendarViewProps> = ({
  reports = [],
  historyMap = {},
  onOpenReport,
  onStartFullTest,
  onPracticeChapter,
  onRetestMistakes,
  onNavigateToRecall,
}) => {
  const today = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => toLocalDateStr(today), [today]);

  const [currentMonthDate, setCurrentMonthDate] = useState<Date>(() => {
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });

  const [selectedDateStr, setSelectedDateStr] = useState<string>(todayStr);
  const [showAddTargetModal, setShowAddTargetModal] = useState(false);
  const [newTargetTitle, setNewTargetTitle] = useState('');
  const [newTargetType, setNewTargetType] = useState<CalendarTarget['type']>('full_syllabus');

  // Load scheduled targets from localStorage
  const [targets, setTargets] = useState<CalendarTarget[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(LS_CALENDAR_TARGETS_KEY);
        if (saved) return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    // Default initial practice milestones
    const defaultFuture1 = new Date();
    defaultFuture1.setDate(defaultFuture1.getDate() + 2);
    const defaultFuture2 = new Date();
    defaultFuture2.setDate(defaultFuture2.getDate() + 5);

    return [
      {
        id: 'default-target-1',
        dateStr: toLocalDateStr(defaultFuture1),
        title: 'Full Syllabus Mock Test #2',
        type: 'full_syllabus',
        completed: false,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'default-target-2',
        dateStr: toLocalDateStr(defaultFuture2),
        title: 'Physics Mechanics & Electrostatics Sprint',
        type: 'chapter_test',
        subject: 'Physics',
        completed: false,
        createdAt: new Date().toISOString(),
      },
    ];
  });

  const saveTargets = (updated: CalendarTarget[]) => {
    setTargets(updated);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(LS_CALENDAR_TARGETS_KEY, JSON.stringify(updated));
      } catch {
        // ignore
      }
    }
  };

  const handleToggleTarget = (id: string) => {
    const next = targets.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t));
    saveTargets(next);
  };

  const handleDeleteTarget = (id: string) => {
    const next = targets.filter((t) => t.id !== id);
    saveTargets(next);
  };

  const handleAddTarget = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTargetTitle.trim()) return;

    const newTarget: CalendarTarget = {
      id: `target-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      dateStr: selectedDateStr,
      title: newTargetTitle.trim(),
      type: newTargetType,
      completed: false,
      createdAt: new Date().toISOString(),
    };

    saveTargets([...targets, newTarget]);
    setNewTargetTitle('');
    setShowAddTargetModal(false);
  };

  const handleAddQuickTarget = (title: string, type: CalendarTarget['type']) => {
    const newTarget: CalendarTarget = {
      id: `target-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      dateStr: selectedDateStr,
      title,
      type,
      completed: false,
      createdAt: new Date().toISOString(),
    };
    saveTargets([...targets, newTarget]);
  };

  // Group reports by local date string
  const reportsByDate = useMemo(() => {
    const map = new Map<string, TestResultReport[]>();
    for (const r of reports) {
      if (!r.submittedAt) continue;
      const d = new Date(r.submittedAt);
      if (isNaN(d.getTime())) continue;
      const dStr = toLocalDateStr(d);
      const list = map.get(dStr) || [];
      list.push(r);
      map.set(dStr, list);
    }
    return map;
  }, [reports]);

  // Group targets by local date string
  const targetsByDate = useMemo(() => {
    const map = new Map<string, CalendarTarget[]>();
    for (const t of targets) {
      const list = map.get(t.dateStr) || [];
      list.push(t);
      map.set(t.dateStr, list);
    }
    return map;
  }, [targets]);

  // Month navigation helpers
  const handlePrevMonth = () => {
    setCurrentMonthDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonthDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleGoToToday = () => {
    setCurrentMonthDate(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDateStr(todayStr);
  };

  // Month grid computations
  const currentYear = currentMonthDate.getFullYear();
  const currentMonth = currentMonthDate.getMonth();

  const monthLabel = useMemo(() => {
    return currentMonthDate.toLocaleDateString(undefined, {
      month: 'long',
      year: 'numeric',
    });
  }, [currentMonthDate]);

  // Grid dates construction (Mon-Sun layout)
  const calendarCells = useMemo(() => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);

    // Monday is 1, Sunday is 0 in JS. We want Mon (0) to Sun (6)
    let startDayOfWeek = firstDayOfMonth.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6; // Sunday becomes index 6

    const cells: Array<{
      date: Date;
      dateStr: string;
      dateNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      isSelected: boolean;
      reports: TestResultReport[];
      targets: CalendarTarget[];
    }> = [];

    // Preceding month filler
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = new Date(currentYear, currentMonth, -i);
      const dStr = toLocalDateStr(d);
      cells.push({
        date: d,
        dateStr: dStr,
        dateNumber: d.getDate(),
        isCurrentMonth: false,
        isToday: dStr === todayStr,
        isSelected: dStr === selectedDateStr,
        reports: reportsByDate.get(dStr) || [],
        targets: targetsByDate.get(dStr) || [],
      });
    }

    // Days in current month
    for (let day = 1; day <= lastDayOfMonth.getDate(); day++) {
      const d = new Date(currentYear, currentMonth, day);
      const dStr = toLocalDateStr(d);
      cells.push({
        date: d,
        dateStr: dStr,
        dateNumber: day,
        isCurrentMonth: true,
        isToday: dStr === todayStr,
        isSelected: dStr === selectedDateStr,
        reports: reportsByDate.get(dStr) || [],
        targets: targetsByDate.get(dStr) || [],
      });
    }

    // Trailing days filler to complete full rows (multiple of 7)
    const totalCurrentCells = cells.length;
    const remainingTo42 = totalCurrentCells <= 35 ? 35 - totalCurrentCells : 42 - totalCurrentCells;
    for (let i = 1; i <= remainingTo42; i++) {
      const d = new Date(currentYear, currentMonth + 1, i);
      const dStr = toLocalDateStr(d);
      cells.push({
        date: d,
        dateStr: dStr,
        dateNumber: d.getDate(),
        isCurrentMonth: false,
        isToday: dStr === todayStr,
        isSelected: dStr === selectedDateStr,
        reports: reportsByDate.get(dStr) || [],
        targets: targetsByDate.get(dStr) || [],
      });
    }

    return cells;
  }, [currentYear, currentMonth, todayStr, selectedDateStr, reportsByDate, targetsByDate]);

  // Monthly summary metrics
  const monthMetrics = useMemo(() => {
    let testCount = 0;
    const activeDates = new Set<string>();
    let totalScoreSum = 0;
    let totalAccuracySum = 0;
    let bestScore = 0;

    for (const [dStr, list] of reportsByDate.entries()) {
      const d = parseLocalDateStr(dStr);
      if (d.getFullYear() === currentYear && d.getMonth() === currentMonth) {
        testCount += list.length;
        activeDates.add(dStr);
        for (const r of list) {
          totalScoreSum += r.totalMarks;
          totalAccuracySum += r.accuracy;
          if (r.totalMarks > bestScore) bestScore = r.totalMarks;
        }
      }
    }

    let upcomingTargetsThisMonth = 0;
    for (const [dStr, list] of targetsByDate.entries()) {
      const d = parseLocalDateStr(dStr);
      if (d.getFullYear() === currentYear && d.getMonth() === currentMonth) {
        upcomingTargetsThisMonth += list.filter((t) => !t.completed).length;
      }
    }

    const avgScore = testCount > 0 ? Math.round(totalScoreSum / testCount) : 0;
    const avgAccuracy = testCount > 0 ? Math.round(totalAccuracySum / testCount) : 0;

    return {
      testCount,
      activeDays: activeDates.size,
      avgScore,
      avgAccuracy,
      bestScore,
      upcomingTargetsThisMonth,
    };
  }, [reportsByDate, targetsByDate, currentYear, currentMonth]);

  // Selected date data
  const selectedDate = useMemo(() => parseLocalDateStr(selectedDateStr), [selectedDateStr]);
  const selectedDateFormatted = useMemo(() => {
    return selectedDate.toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }, [selectedDate]);

  const selectedDayReports = reportsByDate.get(selectedDateStr) || [];
  const selectedDayTargets = targetsByDate.get(selectedDateStr) || [];
  const isSelectedToday = selectedDateStr === todayStr;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200 dark:border-neutral-800">
        <div>
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-neutral-900 dark:text-white" />
            <h1 className="text-xl font-bold tracking-tight text-neutral-950 dark:text-white">
              Test & Study Calendar
            </h1>
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Track daily exam attempts, review score history by date, and schedule upcoming practice milestones.
          </p>
        </div>

        {/* Month Navigation Strip */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={handleGoToToday}
            className="px-2.5 py-1.5 text-xs font-mono font-medium rounded border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-neutral-700 dark:text-neutral-300 cursor-pointer"
          >
            Today
          </button>
          <div className="flex items-center border border-neutral-200 dark:border-neutral-800 rounded overflow-hidden">
            <button
              type="button"
              onClick={handlePrevMonth}
              aria-label="Previous month"
              className="p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-neutral-600 dark:text-neutral-400 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-1.5 text-xs font-semibold font-mono text-neutral-900 dark:text-neutral-100 min-w-[130px] text-center">
              {monthLabel}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              aria-label="Next month"
              className="p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-neutral-600 dark:text-neutral-400 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Monthly Metrics Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-neutral-50 dark:bg-[#18181B] border border-neutral-200 dark:border-neutral-800 rounded-lg p-3">
          <div className="text-[11px] font-mono text-neutral-500 dark:text-neutral-400 uppercase">
            Tests in Month
          </div>
          <div className="text-xl font-bold font-mono text-neutral-950 dark:text-white mt-1">
            {monthMetrics.testCount}
          </div>
        </div>
        <div className="bg-neutral-50 dark:bg-[#18181B] border border-neutral-200 dark:border-neutral-800 rounded-lg p-3">
          <div className="text-[11px] font-mono text-neutral-500 dark:text-neutral-400 uppercase">
            Active Study Days
          </div>
          <div className="text-xl font-bold font-mono text-neutral-950 dark:text-white mt-1">
            {monthMetrics.activeDays}
          </div>
        </div>
        <div className="bg-neutral-50 dark:bg-[#18181B] border border-neutral-200 dark:border-neutral-800 rounded-lg p-3">
          <div className="text-[11px] font-mono text-neutral-500 dark:text-neutral-400 uppercase">
            Month Avg Score
          </div>
          <div className="text-xl font-bold font-mono text-neutral-950 dark:text-white mt-1">
            {monthMetrics.avgScore} <span className="text-xs font-normal text-neutral-400">pts</span>
          </div>
        </div>
        <div className="bg-neutral-50 dark:bg-[#18181B] border border-neutral-200 dark:border-neutral-800 rounded-lg p-3">
          <div className="text-[11px] font-mono text-neutral-500 dark:text-neutral-400 uppercase">
            Avg Accuracy
          </div>
          <div className="text-xl font-bold font-mono text-neutral-950 dark:text-white mt-1">
            {monthMetrics.avgAccuracy}%
          </div>
        </div>
        <div className="bg-neutral-50 dark:bg-[#18181B] border border-neutral-200 dark:border-neutral-800 rounded-lg p-3 col-span-2 sm:col-span-1">
          <div className="text-[11px] font-mono text-neutral-500 dark:text-neutral-400 uppercase">
            Planned Targets
          </div>
          <div className="text-xl font-bold font-mono text-neutral-950 dark:text-white mt-1">
            {monthMetrics.upcomingTargetsThisMonth}
          </div>
        </div>
      </div>

      {/* Main Grid & Day Inspector Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Full Monthly Calendar Grid (8 cols) */}
        <div className="lg:col-span-8 bg-white dark:bg-[#18181B] border border-neutral-200 dark:border-neutral-800 rounded-lg p-4 sm:p-5 shadow-xs">
          {/* Day of Week Headers */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2 text-center">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
              <div
                key={day}
                className="text-[11px] font-mono font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 py-1"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid Cells */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {calendarCells.map((cell) => {
              const hasTests = cell.reports.length > 0;
              const hasTargets = cell.targets.length > 0;
              const bestDayScore = hasTests
                ? Math.max(...cell.reports.map((r) => r.totalMarks))
                : null;
              const avgDayAccuracy = hasTests
                ? Math.round(
                    cell.reports.reduce((acc, r) => acc + r.accuracy, 0) / cell.reports.length
                  )
                : null;

              return (
                <button
                  key={cell.dateStr}
                  type="button"
                  onClick={() => setSelectedDateStr(cell.dateStr)}
                  className={`min-h-[72px] sm:min-h-[88px] p-1.5 sm:p-2 rounded-lg border text-left flex flex-col justify-between transition-all cursor-pointer relative group ${
                    cell.isSelected
                      ? 'border-neutral-950 dark:border-white ring-2 ring-neutral-950/20 dark:ring-white/20 bg-neutral-50 dark:bg-[#202024]'
                      : cell.isToday
                      ? 'border-neutral-900/40 dark:border-neutral-600 bg-neutral-50/60 dark:bg-[#1A1A1E]'
                      : cell.isCurrentMonth
                      ? 'border-neutral-200/80 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-700 bg-white dark:bg-[#141416]'
                      : 'border-transparent text-neutral-300 dark:text-neutral-700 hover:border-neutral-200 dark:hover:border-neutral-800 bg-neutral-50/20 dark:bg-neutral-900/10'
                  }`}
                >
                  {/* Cell Header: Day Number & Indicators */}
                  <div className="flex items-center justify-between w-full">
                    <span
                      className={`text-xs font-mono font-semibold ${
                        cell.isToday
                          ? 'w-5 h-5 rounded-full bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 flex items-center justify-center text-[10px]'
                          : cell.isCurrentMonth
                          ? 'text-neutral-900 dark:text-neutral-100'
                          : 'text-neutral-400 dark:text-neutral-600'
                      }`}
                    >
                      {cell.dateNumber}
                    </span>

                    {/* Today label if today */}
                    {cell.isToday && (
                      <span className="hidden sm:inline text-[9px] font-mono uppercase font-semibold text-neutral-500 dark:text-neutral-400">
                        Today
                      </span>
                    )}

                    {/* Small Activity Dot */}
                    {hasTests && !cell.isToday && (
                      <span
                        className="w-2 h-2 rounded-full bg-emerald-600 dark:bg-emerald-400 shrink-0"
                        title={`${cell.reports.length} test(s) taken`}
                      />
                    )}
                  </div>

                  {/* Cell Body: Completed Test Badges or Scheduled Target */}
                  <div className="mt-1 space-y-1 w-full overflow-hidden">
                    {hasTests ? (
                      <div className="space-y-0.5">
                        <div className="flex items-center justify-between text-[10px] font-mono leading-none">
                          <span className="font-semibold text-emerald-700 dark:text-emerald-400 truncate">
                            {cell.reports.length === 1 ? '1 Test' : `${cell.reports.length} Tests`}
                          </span>
                          <span className="text-neutral-600 dark:text-neutral-400 text-[9px]">
                            {bestDayScore !== null ? `${bestDayScore}p` : ''}
                          </span>
                        </div>
                        {avgDayAccuracy !== null && (
                          <div className="hidden sm:block text-[9px] font-mono text-neutral-500 dark:text-neutral-400 truncate">
                            {avgDayAccuracy}% Acc
                          </div>
                        )}
                      </div>
                    ) : hasTargets ? (
                      <div className="flex items-center gap-1 text-[9px] font-mono text-amber-700 dark:text-amber-400 truncate">
                        <Target className="w-2.5 h-2.5 shrink-0" />
                        <span className="truncate">{cell.targets[0].title}</span>
                      </div>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Calendar Legend */}
          <div className="mt-4 pt-3 border-t border-neutral-200 dark:border-neutral-800 flex flex-wrap items-center gap-4 text-xs text-neutral-500 dark:text-neutral-400">
            <div className="flex items-center gap-1.5 font-mono text-[11px]">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 dark:bg-emerald-400" />
              <span>Completed Test</span>
            </div>
            <div className="flex items-center gap-1.5 font-mono text-[11px]">
              <Target className="w-3 h-3 text-amber-600 dark:text-amber-400" />
              <span>Scheduled Practice Target</span>
            </div>
            <div className="flex items-center gap-1.5 font-mono text-[11px]">
              <span className="w-4 h-4 rounded-full bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 flex items-center justify-center text-[9px] font-bold">
                •
              </span>
              <span>Today</span>
            </div>
          </div>
        </div>

        {/* Right: Selected Day Inspector & Target Planner (4 cols) */}
        <div className="lg:col-span-4 bg-white dark:bg-[#18181B] border border-neutral-200 dark:border-neutral-800 rounded-lg p-5 shadow-xs space-y-5">
          {/* Day Inspector Header */}
          <div className="border-b border-neutral-200 dark:border-neutral-800 pb-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-medium text-neutral-500 dark:text-neutral-400 uppercase">
                Day Inspector
              </span>
              {isSelectedToday && (
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                  Today
                </span>
              )}
            </div>
            <h2 className="text-base font-bold text-neutral-950 dark:text-white mt-1">
              {selectedDateFormatted}
            </h2>
          </div>

          {/* Completed Tests on Selected Date */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase font-mono tracking-wider text-neutral-700 dark:text-neutral-300">
                Completed Tests ({selectedDayReports.length})
              </h3>
              {selectedDayReports.length === 0 && (
                <span className="text-[11px] text-neutral-400 font-mono">None</span>
              )}
            </div>

            {selectedDayReports.length > 0 ? (
              <div className="space-y-2.5">
                {selectedDayReports.map((report) => (
                  <div
                    key={report.testId}
                    className="p-3 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-[#121214] space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-xs font-bold text-neutral-950 dark:text-white">
                          {report.title}
                        </div>
                        <div className="text-[10px] font-mono text-neutral-500 dark:text-neutral-400 mt-0.5">
                          {report.mode === TestMode.FULL_SYLLABUS
                            ? 'Full Syllabus Mock'
                            : 'Chapter Practice Test'}{' '}
                          · {report.totalQuestions} Questions
                        </div>
                      </div>
                      <span className="text-xs font-mono font-bold text-neutral-900 dark:text-white shrink-0">
                        {report.totalMarks} / {report.maxMarks} pts
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-[10px] font-mono pt-1 border-t border-neutral-200 dark:border-neutral-800/80">
                      <div>
                        <span className="text-neutral-400 block">Accuracy</span>
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                          {report.accuracy}%
                        </span>
                      </div>
                      <div>
                        <span className="text-neutral-400 block">Time Spent</span>
                        <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                          {formatMinutes(report.totalTimeSpentSeconds)}
                        </span>
                      </div>
                      <div>
                        <span className="text-neutral-400 block">Tab Switches</span>
                        <span
                          className={`font-semibold ${
                            (report.tabSwitchCount || 0) > 0
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-neutral-600 dark:text-neutral-400'
                          }`}
                        >
                          {report.tabSwitchCount || 0}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => onOpenReport(report.testId)}
                        className="flex-1 py-1 px-2 text-[11px] font-medium bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 rounded hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <span>Review Report</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onRetestMistakes(undefined, undefined, undefined)}
                        title="Retest Mistakes from this attempt"
                        className="py-1 px-2 text-[11px] font-medium border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Mistakes</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-lg border border-dashed border-neutral-200 dark:border-neutral-800 text-center space-y-2">
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  No tests completed on this day.
                </p>
                {isSelectedToday ? (
                  <button
                    type="button"
                    onClick={onStartFullTest}
                    className="px-3 py-1.5 text-xs font-medium bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 rounded hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <span>Start Test Today</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onPracticeChapter()}
                    className="px-3 py-1.5 text-xs font-medium border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <span>Select Chapter Practice</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Scheduled Study Targets on Selected Date */}
          <div className="space-y-3 pt-2 border-t border-neutral-200 dark:border-neutral-800">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase font-mono tracking-wider text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>Scheduled Targets ({selectedDayTargets.length})</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddTargetModal(!showAddTargetModal)}
                className="text-xs text-neutral-700 dark:text-neutral-300 hover:text-neutral-950 dark:hover:text-white font-medium flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>Add Target</span>
              </button>
            </div>

            {/* Target List */}
            {selectedDayTargets.length > 0 ? (
              <div className="space-y-2">
                {selectedDayTargets.map((target) => (
                  <div
                    key={target.id}
                    className={`p-2.5 rounded-lg border flex items-center justify-between gap-2 transition-all ${
                      target.completed
                        ? 'border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/30 opacity-70'
                        : 'border-amber-200 dark:border-amber-800/80 bg-amber-50/40 dark:bg-amber-950/20'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleToggleTarget(target.id)}
                      className="flex items-center gap-2 text-left flex-1 cursor-pointer"
                    >
                      {target.completed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      ) : (
                        <Circle className="w-4 h-4 text-neutral-400 dark:text-neutral-500 shrink-0" />
                      )}
                      <div>
                        <span
                          className={`text-xs font-medium block ${
                            target.completed
                              ? 'line-through text-neutral-500 dark:text-neutral-400'
                              : 'text-neutral-900 dark:text-white'
                          }`}
                        >
                          {target.title}
                        </span>
                        <span className="text-[10px] font-mono text-neutral-400 uppercase">
                          {target.type.replace('_', ' ')}
                        </span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteTarget(target.id)}
                      aria-label="Delete Target"
                      className="text-neutral-400 hover:text-red-600 dark:hover:text-red-400 p-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-neutral-400 font-mono">No target scheduled for this date.</p>
            )}

            {/* Quick 1-Click Target Addition Presets */}
            <div className="pt-2">
              <span className="text-[10px] font-mono uppercase text-neutral-400 block mb-1.5">
                Quick Schedule Target:
              </span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => handleAddQuickTarget('Full Syllabus JEE Mock', 'full_syllabus')}
                  className="px-2 py-1 text-[10px] font-mono rounded border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-colors cursor-pointer"
                >
                  + Full Mock
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleAddQuickTarget('Physics Mechanics Sprint', 'chapter_test')
                  }
                  className="px-2 py-1 text-[10px] font-mono rounded border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-colors cursor-pointer"
                >
                  + Physics Sprint
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleAddQuickTarget('Chemistry Organic Practice', 'chapter_test')
                  }
                  className="px-2 py-1 text-[10px] font-mono rounded border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-colors cursor-pointer"
                >
                  + Chemistry Test
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleAddQuickTarget('Mathematics Calculus Review', 'chapter_test')
                  }
                  className="px-2 py-1 text-[10px] font-mono rounded border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-colors cursor-pointer"
                >
                  + Math Calculus
                </button>
              </div>
            </div>

            {/* Custom Target Modal / Form */}
            {showAddTargetModal && (
              <form onSubmit={handleAddTarget} className="pt-2 space-y-2">
                <div className="text-[11px] font-semibold text-neutral-900 dark:text-white">
                  Add Custom Target for {selectedDateFormatted}
                </div>
                <input
                  type="text"
                  value={newTargetTitle}
                  onChange={(e) => setNewTargetTitle(e.target.value)}
                  placeholder="e.g. Thermodynamics & Rotational Motion Test"
                  className="w-full px-3 py-1.5 text-xs rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#121214] text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-neutral-900 dark:focus:ring-white"
                  autoFocus
                />
                <div className="flex items-center gap-2">
                  <select
                    value={newTargetType}
                    onChange={(e) => setNewTargetType(e.target.value as CalendarTarget['type'])}
                    className="text-xs px-2 py-1 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#121214] text-neutral-700 dark:text-neutral-300"
                  >
                    <option value="full_syllabus">Full Syllabus Test</option>
                    <option value="chapter_test">Chapter Test</option>
                    <option value="active_recall">Active Recall Flashcards</option>
                    <option value="mistake_retest">Mistake Retest</option>
                    <option value="custom">Custom Goal</option>
                  </select>
                  <button
                    type="submit"
                    className="px-3 py-1 text-xs font-medium bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 rounded hover:bg-neutral-800 dark:hover:bg-neutral-200 cursor-pointer"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddTargetModal(false)}
                    className="px-2 py-1 text-xs text-neutral-500 hover:text-neutral-700 cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
