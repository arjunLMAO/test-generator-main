import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  Flame,
  Search,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { DashboardAnalyticsSummary } from '../services/LongTermAnalyticsService';
import { StudyStreakInfo, StudyStreakService } from '../services/StudyStreakService';
import {
  GeneratedTest,
  QuestionBankDiagnostics,
  QuestionHistoryRecord,
  SubjectName,
  TestResultReport,
} from '../types/jee';
import { ActiveNavTab } from './Navbar';

interface LandingDashboardViewProps {
  diagnostics: QuestionBankDiagnostics;
  analytics: DashboardAnalyticsSummary;
  activeTest: GeneratedTest | null;
  recentReport: TestResultReport | null;
  reports?: TestResultReport[];
  historyMap?: Record<string, QuestionHistoryRecord>;
  remainingActiveTestSeconds: number;
  onStartFullSyllabusOverview: () => void;
  onOpenChapterSelector: (presetSubject?: SubjectName, presetChapter?: string) => void;
  onResumeActiveTest: () => void;
  onDiscardActiveTest: () => void;
  onOpenReport: (testId: string) => void;
  onRetestMistakes: (subject?: SubjectName, chapter?: string) => void;
  onNavigateTab: (tab: ActiveNavTab) => void;
}

function formatDurationClock(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const hrs = Math.floor(safe / 3600);
  const mins = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  if (hrs > 0) {
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export const LandingDashboardView: React.FC<LandingDashboardViewProps> = ({
  diagnostics,
  analytics,
  activeTest,
  recentReport,
  reports = [],
  historyMap = {},
  remainingActiveTestSeconds,
  onStartFullSyllabusOverview,
  onOpenChapterSelector,
  onResumeActiveTest,
  onDiscardActiveTest,
  onOpenReport,
  onRetestMistakes,
  onNavigateTab,
}) => {
  const totalChapters = diagnostics.chapterInventories.length;

  const streakInfo: StudyStreakInfo = useMemo(() => {
    return StudyStreakService.calculateStreak(reports, historyMap);
  }, [reports, historyMap]);

  const [chapterFilterTab, setChapterFilterTab] = useState<'ALL' | SubjectName>('ALL');
  const [chapterSearch, setChapterSearch] = useState('');

  const filteredInventories = useMemo(() => {
    return diagnostics.chapterInventories.filter((inv) => {
      if (chapterFilterTab !== 'ALL' && inv.subject !== chapterFilterTab) return false;
      if (chapterSearch.trim()) {
        const q = chapterSearch.toLowerCase();
        return (
          inv.chapter.toLowerCase().includes(q) ||
          inv.topics.some((t) => t.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [diagnostics.chapterInventories, chapterFilterTab, chapterSearch]);

  return (
    <div className="bg-white dark:bg-[#0F0F11] text-neutral-900 dark:text-neutral-100 min-h-screen transition-colors overflow-x-hidden w-full max-w-full">
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-10 min-w-0 w-full">
        {/* Active Test Recovery Banner */}
        {activeTest && (
          <div className="bg-neutral-50 dark:bg-[#18181B] border border-neutral-300 dark:border-neutral-700 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 text-xs font-medium text-neutral-600 dark:text-neutral-400">
                <Clock className="w-3.5 h-3.5 text-neutral-800 dark:text-neutral-200" />
                <span>Test in progress</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">
                  {formatDurationClock(remainingActiveTestSeconds)} remaining
                </span>
              </div>
              <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{activeTest.title}</p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {activeTest.subjects.join(' · ')} · {activeTest.questions.length} Questions · Responses saved automatically
              </p>
            </div>
            <div className="flex items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={onDiscardActiveTest}
                className="px-3 py-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:text-red-700 dark:hover:text-red-400 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Discard</span>
              </button>
              <button
                type="button"
                onClick={onResumeActiveTest}
                className="px-3.5 py-1.5 text-xs font-medium text-white dark:text-neutral-950 bg-neutral-900 dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-200 rounded transition-colors cursor-pointer"
              >
                Resume Test
              </button>
            </div>
          </div>
        )}

        {/* Compact Application Heading */}
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-950 dark:text-white">
            Dashboard
          </h1>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Prepare a test, practise selected chapters, or revisit your mistakes.
          </p>
        </div>

        {/* Daily Study Streak Indicator */}
        <section
          aria-label="Daily Study Streak"
          className="bg-neutral-50 dark:bg-[#18181B] border border-neutral-200 dark:border-neutral-800 rounded-lg p-5 transition-colors"
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            {/* Left: Streak Counter & Status & Motivational Message */}
            <div className="space-y-3 max-w-xl">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center border transition-colors ${
                    streakInfo.streakStatus === 'maintained'
                      ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400'
                      : streakInfo.streakStatus === 'at_risk'
                      ? 'bg-amber-500/10 border-amber-300 dark:border-amber-700 text-amber-600 dark:text-amber-400 animate-pulse'
                      : streakInfo.streakStatus === 'broken'
                      ? 'bg-neutral-100 dark:bg-neutral-800 border-neutral-300 dark:border-neutral-700 text-neutral-500 dark:text-neutral-400'
                      : 'bg-neutral-100 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-400 dark:text-neutral-500'
                  }`}
                >
                  <Flame
                    className={`w-5 h-5 ${
                      streakInfo.streakStatus === 'maintained' || streakInfo.streakStatus === 'at_risk'
                        ? 'fill-current'
                        : ''
                    }`}
                  />
                </div>

                <div>
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl font-bold font-mono tracking-tight text-neutral-950 dark:text-white">
                      {streakInfo.currentStreak} Day{streakInfo.currentStreak === 1 ? '' : 's'}
                    </span>

                    {/* Status Badge */}
                    {streakInfo.streakStatus === 'maintained' && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span>Active today</span>
                      </span>
                    )}

                    {streakInfo.streakStatus === 'at_risk' && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded border border-amber-300 dark:border-amber-700">
                        <AlertCircle className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                        <span>At risk · Test today</span>
                      </span>
                    )}

                    {streakInfo.streakStatus === 'broken' && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-mono text-neutral-600 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded border border-neutral-300 dark:border-neutral-700">
                        <span>Streak reset</span>
                      </span>
                    )}

                    {streakInfo.streakStatus === 'unstarted' && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-mono text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded border border-neutral-200 dark:border-neutral-700">
                        <span>Start your streak</span>
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-neutral-500 dark:text-neutral-400 font-mono mt-0.5">
                    Daily Study Streak
                  </div>
                </div>
              </div>

              {/* Motivational Message Block */}
              <div className="space-y-1">
                <p className="text-sm font-semibold text-neutral-900 dark:text-white">
                  {streakInfo.motivationalMessage}
                </p>
                <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                  {streakInfo.subMessage}
                </p>
              </div>
            </div>

            {/* Right: 7-Day Activity Strip & History Metrics */}
            <div className="space-y-3 shrink-0">
              {/* 7-Day Calendar Strip */}
              <div>
                <div className="text-[11px] font-mono text-neutral-500 dark:text-neutral-400 mb-2 flex items-center justify-between">
                  <span>Last 7 Days</span>
                  {streakInfo.lastActiveDateFormatted && (
                    <span>Last active: {streakInfo.lastActiveDateFormatted}</span>
                  )}
                </div>

                <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                  {streakInfo.weeklyActivity.map((day) => {
                    return (
                      <div
                        key={day.dateStr}
                        className={`flex flex-col items-center justify-center p-2 rounded border text-center transition-all min-w-[38px] sm:min-w-[44px] ${
                          day.isToday
                            ? 'border-neutral-900 dark:border-white bg-white dark:bg-[#121214] font-semibold ring-1 ring-neutral-900/10 dark:ring-white/10'
                            : 'border-neutral-200 dark:border-neutral-800 bg-white/60 dark:bg-[#121214]/60'
                        }`}
                      >
                        <span className="text-[10px] text-neutral-500 dark:text-neutral-400 font-mono uppercase">
                          {day.dayLabel}
                        </span>
                        <span className="text-xs font-mono font-medium text-neutral-900 dark:text-white my-0.5">
                          {day.dateNumber}
                        </span>

                        <div className="mt-1 flex items-center justify-center">
                          {day.hasActivity ? (
                            <span
                              title={`Test activity completed (${day.testsCount} attempt${day.testsCount > 1 ? 's' : ''})`}
                              className="w-2.5 h-2.5 rounded-full bg-emerald-600 dark:bg-emerald-400 inline-block shadow-xs"
                            />
                          ) : day.isToday ? (
                            <span
                              title="Pending test activity today"
                              className="w-2.5 h-2.5 rounded-full border border-dashed border-amber-600 dark:border-amber-400 inline-block"
                            />
                          ) : (
                            <span
                              title="No test activity"
                              className="w-1.5 h-1.5 rounded-full bg-neutral-300 dark:bg-neutral-700 inline-block"
                            />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Bottom Quick Stats & CTA */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-neutral-200/80 dark:border-neutral-800/80 text-[11px] font-mono text-neutral-500 dark:text-neutral-400">
                <div className="flex items-center gap-3">
                  <span>
                    Best Streak: <strong className="text-neutral-900 dark:text-white font-bold">{streakInfo.bestStreak}d</strong>
                  </span>
                  <span>·</span>
                  <span>
                    Total Active: <strong className="text-neutral-900 dark:text-white font-bold">{streakInfo.totalActiveDays}d</strong>
                  </span>
                </div>

                {!streakInfo.testedToday && (
                  <button
                    type="button"
                    onClick={onStartFullSyllabusOverview}
                    className="text-xs font-semibold text-neutral-900 dark:text-white hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <span>{streakInfo.streakStatus === 'at_risk' ? 'Maintain Streak →' : 'Test Today →'}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Three Core Test Actions Grid */}
        <section aria-label="Test Options">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* 1. Full Syllabus Test (Primary) */}
            <div className="bg-white dark:bg-[#18181B] border border-neutral-300 dark:border-neutral-800 rounded-lg p-6 flex flex-col justify-between space-y-5">
              <div className="space-y-2">
                <h2 className="text-lg font-semibold text-neutral-950 dark:text-white">
                  Full Syllabus Test
                </h2>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                  Complete examination practice across Physics, Chemistry, and Mathematics.
                </p>
                <div className="pt-2 text-xs font-mono text-neutral-600 dark:text-neutral-400 flex flex-wrap items-center gap-1.5">
                  <span>75 Questions</span>
                  <span aria-hidden="true">·</span>
                  <span>300 Marks</span>
                  <span aria-hidden="true">·</span>
                  <span>3 Hours</span>
                </div>
              </div>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={onStartFullSyllabusOverview}
                  className="w-full py-2 px-3 text-xs font-medium text-white dark:text-neutral-950 bg-neutral-900 dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-200 rounded transition-colors cursor-pointer"
                >
                  Start Full Test
                </button>
              </div>
            </div>

            {/* 2. Chapter Test (Secondary) */}
            <div className="bg-white dark:bg-[#18181B] border border-neutral-200 dark:border-neutral-800 rounded-lg p-6 flex flex-col justify-between space-y-5">
              <div className="space-y-2">
                <h2 className="text-lg font-semibold text-neutral-950 dark:text-white">
                  Chapter Test
                </h2>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                  Choose specific subjects and chapters to drill targeted concepts.
                </p>
                <div className="pt-2 text-xs font-mono text-neutral-600 dark:text-neutral-400 flex flex-wrap items-center gap-1.5">
                  <span>25 Qs / Subject</span>
                  <span aria-hidden="true">·</span>
                  <span>100 Marks / Subject</span>
                  <span aria-hidden="true">·</span>
                  <span>1–3 Hours</span>
                </div>
              </div>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => onOpenChapterSelector()}
                  className="w-full py-2 px-3 text-xs font-medium text-neutral-900 dark:text-neutral-100 bg-white dark:bg-[#121214] border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded transition-colors cursor-pointer"
                >
                  Select Chapters
                </button>
              </div>
            </div>

            {/* 3. Retest Mistakes (Secondary) */}
            <div className="bg-white dark:bg-[#18181B] border border-neutral-200 dark:border-neutral-800 rounded-lg p-6 flex flex-col justify-between space-y-5">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-neutral-950 dark:text-white">
                    Retest Mistakes
                  </h2>
                  {analytics.questionsNeedingReviewCount > 0 && (
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200">
                      {analytics.questionsNeedingReviewCount}
                    </span>
                  )}
                </div>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                  {analytics.questionsNeedingReviewCount > 0
                    ? `Review and solve questions you previously got incorrect.`
                    : `No active mistakes in your queue. Complete a test to track incorrect answers.`}
                </p>
                <div className="pt-2 text-xs font-mono text-neutral-600 dark:text-neutral-400 flex flex-wrap items-center gap-1.5">
                  {analytics.questionsNeedingReviewCount > 0 ? (
                    <>
                      <span>{analytics.questionsNeedingReviewCount} Questions</span>
                      <span aria-hidden="true">·</span>
                      <span>Targeted Practice</span>
                    </>
                  ) : (
                    <span>Queue Clear</span>
                  )}
                </div>
              </div>
              <div className="pt-2 space-y-2">
                {analytics.questionsNeedingReviewCount > 0 ? (
                  <button
                    type="button"
                    onClick={() => onRetestMistakes()}
                    className="w-full py-2 px-3 text-xs font-medium text-neutral-900 dark:text-neutral-100 bg-white dark:bg-[#121214] border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded transition-colors cursor-pointer"
                  >
                    Retest Mistakes
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled
                    className="w-full py-2 px-3 text-xs font-medium text-neutral-400 dark:text-neutral-600 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded cursor-not-allowed"
                  >
                    No Mistakes to Retest
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => onNavigateTab('recall')}
                  className="w-full py-1.5 px-3 text-[11px] font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white transition-colors cursor-pointer flex items-center justify-center gap-1"
                >
                  <span>Memorize via Active Recall Flashcards →</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Performance Summary / Empty State */}
        <section aria-label="Performance Overview" className="space-y-4 pt-4 border-t border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-neutral-950 dark:text-white">Recent Performance</h2>
            {analytics.hasData && (
              <button
                type="button"
                onClick={() => onNavigateTab('analytics')}
                className="text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white transition-colors cursor-pointer"
              >
                View Full Analytics →
              </button>
            )}
          </div>

          {!analytics.hasData ? (
            <div className="bg-neutral-50 dark:bg-[#18181B] border border-neutral-200 dark:border-neutral-800 rounded-lg p-6 text-sm text-neutral-600 dark:text-neutral-400 space-y-1">
              <p className="font-medium text-neutral-900 dark:text-neutral-100">No test attempts recorded yet.</p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Complete a Full Syllabus or Chapter Test to track your score history, accuracy across subjects, and mistakes.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-[#18181B] border border-neutral-200 dark:border-neutral-800 rounded-lg p-4">
                  <div className="text-xs text-neutral-500 dark:text-neutral-400">Tests Completed</div>
                  <div className="text-2xl font-bold font-mono text-neutral-950 dark:text-white mt-1 tabular-nums">
                    {analytics.testsAttempted}
                  </div>
                  <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 font-mono tabular-nums">
                    {analytics.questionsAttempted} questions
                  </div>
                </div>

                <div className="bg-white dark:bg-[#18181B] border border-neutral-200 dark:border-neutral-800 rounded-lg p-4">
                  <div className="text-xs text-neutral-500 dark:text-neutral-400">Overall Accuracy</div>
                  <div className="text-2xl font-bold font-mono text-neutral-950 dark:text-white mt-1 tabular-nums">
                    {analytics.overallAccuracy}%
                  </div>
                  <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 font-mono tabular-nums">
                    {analytics.totalCorrect} correct · {analytics.totalIncorrect} wrong
                  </div>
                </div>

                <div className="bg-white dark:bg-[#18181B] border border-neutral-200 dark:border-neutral-800 rounded-lg p-4">
                  <div className="text-xs text-neutral-500 dark:text-neutral-400">Average Scaled Score</div>
                  <div className="text-2xl font-bold font-mono text-neutral-950 dark:text-white mt-1 tabular-nums">
                    {analytics.averageNormalizedScore300}
                    <span className="text-xs font-normal text-neutral-500 dark:text-neutral-400"> / 300</span>
                  </div>
                  <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 font-mono tabular-nums">
                    Percentile: {analytics.latestPercentile ?? '—'}
                  </div>
                </div>

                <div className="bg-white dark:bg-[#18181B] border border-neutral-200 dark:border-neutral-800 rounded-lg p-4">
                  <div className="text-xs text-neutral-500 dark:text-neutral-400">Strongest Subject</div>
                  <div className="text-xl font-bold text-neutral-950 dark:text-white mt-1 truncate">
                    {analytics.strongestSubject ? analytics.strongestSubject.subject : '—'}
                  </div>
                  <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 font-mono tabular-nums">
                    {analytics.strongestSubject
                      ? `${analytics.strongestSubject.accuracy}% accuracy`
                      : 'More tests needed'}
                  </div>
                </div>
              </div>

              {recentReport && (
                <div className="bg-neutral-50 dark:bg-[#18181B] border border-neutral-200 dark:border-neutral-800 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="text-xs text-neutral-500 dark:text-neutral-400">
                      Latest Attempt · {new Date(recentReport.submittedAt).toLocaleDateString('en-IN')}
                    </div>
                    <div className="text-sm font-semibold text-neutral-950 dark:text-white">
                      {recentReport.title}
                    </div>
                    <div className="text-xs font-mono text-neutral-600 dark:text-neutral-400 tabular-nums">
                      Score: {recentReport.totalMarks}/{recentReport.maxMarks} · Accuracy: {recentReport.accuracy}% · Mistakes: {recentReport.incorrect}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onOpenReport(recentReport.testId)}
                    className="px-3 py-1.5 text-xs font-medium text-neutral-900 dark:text-neutral-100 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded transition-colors cursor-pointer self-start sm:self-auto"
                  >
                    View Result Report
                  </button>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Syllabus / Subject Overview */}
        <section aria-label="Syllabus by Subject" className="space-y-6 pt-4 border-t border-neutral-200 dark:border-neutral-800">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-neutral-950 dark:text-white">
                Syllabus & Chapter Directory
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                All {totalChapters} chapters and {diagnostics.validQuestionsCount.toLocaleString()} total questions available across JEE syllabus.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onOpenChapterSelector()}
              className="text-xs font-medium text-neutral-900 dark:text-white hover:underline flex items-center gap-1 cursor-pointer self-start sm:self-auto"
            >
              <span>Open Custom Chapter Builder</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Subject Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {(['Physics', 'Chemistry', 'Mathematics'] as SubjectName[]).map((sub) => {
              const info = diagnostics.bySubject[sub];
              return (
                <div
                  key={sub}
                  className="bg-white dark:bg-[#18181B] border border-neutral-200 dark:border-neutral-800 rounded-lg p-5 flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-semibold text-neutral-950 dark:text-white">{sub}</h3>
                      <span className="text-xs font-mono text-neutral-500 dark:text-neutral-400 tabular-nums">
                        {info.chaptersCount} Chapters
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800 text-xs font-mono tabular-nums">
                      <div>
                        <div className="text-neutral-400 dark:text-neutral-500 font-sans">Total</div>
                        <div className="font-semibold text-neutral-900 dark:text-neutral-100 mt-0.5">{info.total}</div>
                      </div>
                      <div>
                        <div className="text-neutral-400 dark:text-neutral-500 font-sans">MCQ</div>
                        <div className="font-semibold text-neutral-900 dark:text-neutral-100 mt-0.5">{info.mcq}</div>
                      </div>
                      <div>
                        <div className="text-neutral-400 dark:text-neutral-500 font-sans">Integer</div>
                        <div className="font-semibold text-neutral-900 dark:text-neutral-100 mt-0.5">{info.integer}</div>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setChapterFilterTab(sub);
                      onOpenChapterSelector(sub);
                    }}
                    className="w-full py-1.5 px-3 text-xs font-medium text-neutral-800 dark:text-neutral-200 bg-neutral-50 dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 border border-neutral-200 dark:border-neutral-700 rounded transition-colors cursor-pointer"
                  >
                    Select {sub} Chapters
                  </button>
                </div>
              );
            })}
          </div>

          {/* Full Interactive Chapter Roster */}
          <div className="p-5 bg-white dark:bg-[#18181B] border border-neutral-200 dark:border-neutral-800 rounded-lg space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-neutral-700 dark:text-neutral-300" />
                <h3 className="text-sm font-semibold text-neutral-900 dark:text-white uppercase tracking-wider">
                  All Available Chapters ({filteredInventories.length} shown)
                </h3>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={chapterSearch}
                  onChange={(e) => setChapterSearch(e.target.value)}
                  placeholder="Search chapters..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-[#121214] border border-neutral-300 dark:border-neutral-700 rounded text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:border-neutral-900 dark:focus:border-white"
                />
              </div>
            </div>

            {/* Subject Filter Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 text-xs">
              {(['ALL', 'Physics', 'Chemistry', 'Mathematics'] as const).map((tab) => {
                const count =
                  tab === 'ALL'
                    ? diagnostics.chapterInventories.length
                    : diagnostics.bySubject[tab].chaptersCount;
                const isSelected = chapterFilterTab === tab;
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setChapterFilterTab(tab)}
                    className={`px-3 py-1.5 rounded text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-white dark:bg-neutral-700 text-neutral-950 dark:text-white font-semibold shadow-xs'
                        : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white'
                    }`}
                  >
                    <span>{tab === 'ALL' ? 'All Chapters' : tab}</span>
                    <span className="font-mono text-[11px] opacity-70">({count})</span>
                  </button>
                );
              })}
            </div>

            {/* Chapter Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-[500px] overflow-y-auto pr-1">
              {filteredInventories.map((inv) => (
                <div
                  key={`${inv.subject}::${inv.chapter}`}
                  className="p-3 bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 rounded-lg hover:border-neutral-400 dark:hover:border-neutral-600 transition-colors flex flex-col justify-between gap-2"
                >
                  <div>
                    <div className="flex items-center justify-between text-[11px] font-mono text-neutral-500 dark:text-neutral-400">
                      <span>{inv.subject}</span>
                      <span>{inv.totalQuestions} Qs</span>
                    </div>
                    <div className="text-xs font-semibold text-neutral-950 dark:text-white mt-1 leading-snug">
                      {inv.chapter}
                    </div>
                    <div className="text-[11px] font-mono text-neutral-500 dark:text-neutral-400 mt-1">
                      {inv.mcqCount} MCQ · {inv.integerCount} Num
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onOpenChapterSelector(inv.subject, inv.chapter)}
                    className="w-full mt-1 py-1 px-2 text-[11px] font-medium text-neutral-900 dark:text-neutral-100 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded transition-colors cursor-pointer text-center"
                  >
                    Drill Chapter →
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Clean, Restrained Footer */}
        <footer className="pt-8 border-t border-neutral-200 dark:border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-500 dark:text-neutral-400">
          <div>Test Generator</div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => onNavigateTab('chapters')}
              className="hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              Select Chapters
            </button>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => onNavigateTab('history')}
              className="hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              History
            </button>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => onNavigateTab('mastery')}
              className="hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              Mastery
            </button>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => onNavigateTab('analytics')}
              className="hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              Analytics
            </button>
          </div>
        </footer>
      </main>
    </div>
  );
};
