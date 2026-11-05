import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  RotateCcw,
  Search,
} from 'lucide-react';
import { SubjectName, TestMode, TestResultReport } from '../types/jee';

interface TestHistoryViewProps {
  reports: TestResultReport[];
  onOpenReport: (testId: string) => void;
  onRetestAttemptMistakes: (attemptId: string) => void;
  onStartNewTest: () => void;
}

function formatDurationMinutes(seconds: number): string {
  const m = Math.round(seconds / 60);
  return `${m}m`;
}

export const TestHistoryView: React.FC<TestHistoryViewProps> = ({
  reports,
  onOpenReport,
  onRetestAttemptMistakes,
  onStartNewTest,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [subjectFilter, setSubjectFilter] = useState<'ALL' | SubjectName>('ALL');

  const filteredReports = useMemo(() => {
    return reports.filter((rep) => {
      if (subjectFilter !== 'ALL' && !rep.subjects.includes(subjectFilter)) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = rep.title.toLowerCase().includes(q);
        const matchesChapters = Object.values(rep.chaptersBySubject).some((chaps) =>
          chaps?.some((c) => c.toLowerCase().includes(q))
        );
        return matchesTitle || matchesChapters;
      }
      return true;
    });
  }, [reports, subjectFilter, searchQuery]);

  if (reports.length === 0) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#0F0F11] text-neutral-900 dark:text-neutral-100 py-12 px-4 sm:px-6">
        <div className="max-w-2xl mx-auto p-8 rounded-lg bg-neutral-50 dark:bg-[#18181B] border border-neutral-200 dark:border-neutral-800 text-center space-y-4">
          <div className="space-y-1">
            <h1 className="text-xl font-bold text-neutral-950 dark:text-white">
              No completed tests yet
            </h1>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 max-w-md mx-auto leading-relaxed">
              Every completed test will appear here with your score breakdown, accuracy, and options to retest incorrect questions.
            </p>
          </div>
          <div className="pt-2">
            <button
              type="button"
              onClick={onStartNewTest}
              className="px-4 py-2 text-xs font-medium text-white dark:text-neutral-900 bg-neutral-900 dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-100 rounded transition-colors cursor-pointer"
            >
              Start Full Test
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-[#0F0F11] text-neutral-900 dark:text-neutral-100 py-8 px-4 sm:px-6 overflow-x-hidden w-full max-w-full">
      <div className="max-w-6xl mx-auto space-y-6 min-w-0 w-full">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-neutral-200 dark:border-neutral-800 pb-5">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-950 dark:text-white">
              Test History ({reports.length})
            </h1>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Review previous exam attempts and launch targeted mistake retests.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative w-60">
              <Search className="w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search history..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-[#18181B] border border-neutral-300 dark:border-neutral-700 rounded text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:border-neutral-900 dark:focus:border-neutral-300"
              />
            </div>

            <div className="flex items-center gap-1 p-0.5 bg-neutral-100 dark:bg-neutral-800 rounded border border-neutral-200 dark:border-neutral-700 text-xs">
              {(['ALL', 'Physics', 'Chemistry', 'Mathematics'] as const).map((sub) => (
                <button
                  key={sub}
                  type="button"
                  onClick={() => setSubjectFilter(sub)}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                    subjectFilter === sub
                      ? 'bg-white dark:bg-neutral-700 text-neutral-950 dark:text-white font-semibold shadow-xs'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white'
                  }`}
                >
                  {sub === 'ALL' ? 'All' : sub}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* History Table */}
        <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 overflow-hidden bg-white dark:bg-[#18181B]">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-neutral-800 font-medium text-neutral-600 dark:text-neutral-400 bg-neutral-50 dark:bg-neutral-800/60">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Test Title</th>
                  <th className="py-3 px-4">Subjects</th>
                  <th className="py-3 px-4 text-right">Score</th>
                  <th className="py-3 px-4 text-right">Accuracy</th>
                  <th className="py-3 px-4 text-right">Mistakes</th>
                  <th className="py-3 px-4 text-right">Time</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                {filteredReports.map((rep) => {
                  const dateFormatted = new Date(rep.submittedAt).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  });
                  const allChaps = Object.values(rep.chaptersBySubject).flat().filter(Boolean);
                  const chapDisplay =
                    rep.mode === TestMode.FULL_SYLLABUS
                      ? 'Full Syllabus'
                      : allChaps.length <= 2
                        ? allChaps.join(', ')
                        : `${allChaps.slice(0, 2).join(', ')} + ${allChaps.length - 2} more`;

                  const modeLabel =
                    rep.mode === TestMode.WRONG_QUESTION_RETEST
                      ? 'Mistake Retest'
                      : rep.mode === TestMode.FULL_SYLLABUS
                        ? 'Full Syllabus'
                        : 'Chapter Test';

                  return (
                    <tr
                      key={rep.testId}
                      onClick={() => onOpenReport(rep.testId)}
                      className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors cursor-pointer"
                    >
                      <td className="py-3 px-4 font-mono text-neutral-500 dark:text-neutral-400 whitespace-nowrap tabular-nums">
                        {dateFormatted}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-neutral-950 dark:text-white text-xs">{rep.title}</div>
                        <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 flex flex-wrap items-center gap-1.5 font-mono">
                          <span>{modeLabel}</span>
                          <span aria-hidden="true">·</span>
                          <span>{rep.totalQuestions} Qs</span>
                          {rep.targetScore !== undefined && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span
                                className={`px-1.5 py-0.2 rounded text-[10px] ${
                                  rep.targetScoreMet
                                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-semibold'
                                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
                                }`}
                              >
                                Target {rep.targetScore} {rep.targetScoreMet ? '✓' : `(${rep.totalMarks - rep.targetScore > 0 ? `+${rep.totalMarks - rep.targetScore}` : rep.totalMarks - rep.targetScore})`}
                              </span>
                            </>
                          )}
                          {rep.tabSwitchCount !== undefined && rep.tabSwitchCount > 0 && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="px-1.5 py-0.2 rounded text-[10px] bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 font-medium">
                                ⚠️ {rep.tabSwitchCount} {rep.tabSwitchCount === 1 ? 'switch' : 'switches'}
                              </span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-neutral-800 dark:text-neutral-200 font-medium">{rep.subjects.join(' · ')}</div>
                        <div className="text-neutral-500 dark:text-neutral-400 text-[11px] truncate max-w-xs" title={chapDisplay}>
                          {chapDisplay}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-neutral-950 dark:text-white">
                        {rep.totalMarks} <span className="text-neutral-400 dark:text-neutral-500 font-normal">/ {rep.maxMarks}</span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-neutral-900 dark:text-neutral-100">
                        {rep.accuracy}%
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums">
                        {rep.incorrect > 0 ? (
                          <span className="font-medium text-neutral-800 dark:text-neutral-200">{rep.incorrect}</span>
                        ) : (
                          <span className="text-neutral-500 dark:text-neutral-400 inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>0</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-neutral-500 dark:text-neutral-400">
                        {formatDurationMinutes(rep.totalTimeSpentSeconds)}
                      </td>
                      <td
                        className="py-3 px-4 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-1.5">
                          {rep.incorrect > 0 && (
                            <button
                              type="button"
                              onClick={() => onRetestAttemptMistakes(rep.testId)}
                              className="px-2.5 py-1 rounded bg-white dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 font-medium flex items-center gap-1 whitespace-nowrap cursor-pointer transition-colors"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Retest ({rep.incorrect})</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => onOpenReport(rep.testId)}
                            className="px-2.5 py-1 rounded bg-neutral-900 dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-100 text-white dark:text-neutral-900 font-medium inline-flex items-center gap-1 whitespace-nowrap cursor-pointer transition-colors"
                          >
                            <span>Report</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
