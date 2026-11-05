import React, { useMemo, useState } from 'react';
import {
  RotateCcw,
} from 'lucide-react';
import { DashboardAnalyticsSummary } from '../services/LongTermAnalyticsService';
import { QuestionHistoryRecord, SubjectName } from '../types/jee';

interface AnalyticsDashboardViewProps {
  analytics: DashboardAnalyticsSummary;
  historyMap: Record<string, QuestionHistoryRecord>;
  onStartFullTest: () => void;
  onPracticeChapter: (subject: SubjectName, chapter: string) => void;
  onRetestMistakes: (subject?: SubjectName, chapter?: string) => void;
  onOpenReport: (testId: string) => void;
}

type TrendMetric = 'accuracy' | 'score' | 'percentile';

export const AnalyticsDashboardView: React.FC<AnalyticsDashboardViewProps> = ({
  analytics,
  historyMap,
  onStartFullTest,
  onPracticeChapter,
  onRetestMistakes,
  onOpenReport,
}) => {
  const [trendMetric, setTrendMetric] = useState<TrendMetric>('accuracy');
  const [subjectFilter, setSubjectFilter] = useState<'ALL' | SubjectName>('ALL');
  const [chapterSubjectFilter, setChapterSubjectFilter] = useState<'ALL' | SubjectName>('ALL');

  const masteryCounts = useMemo(() => {
    const counts = {
      incorrect: 0,
      corrected: 0,
      mastered: 0,
      attempted: 0,
    };
    for (const h of Object.values(historyMap)) {
      if (h.masteryState === 'incorrect') counts.incorrect++;
      else if (h.masteryState === 'corrected') counts.corrected++;
      else if (h.masteryState === 'mastered') counts.mastered++;
      else if (h.masteryState === 'attempted') counts.attempted++;
    }
    return counts;
  }, [historyMap]);

  const filteredChapters = useMemo(() => {
    if (chapterSubjectFilter === 'ALL') return analytics.chapterStats;
    return analytics.chapterStats.filter((c) => c.subject === chapterSubjectFilter);
  }, [analytics.chapterStats, chapterSubjectFilter]);

  const chartPoints = useMemo(() => {
    return analytics.trendSeries.map((pt) => {
      let yVal = 0;
      let unit = '';
      if (trendMetric === 'score') {
        if (subjectFilter === 'ALL') {
          yVal = pt.normalizedScore300;
          unit = ' pts';
        } else {
          yVal = pt.subjectScoreNormalized100[subjectFilter] ?? 0;
          unit = ' pts';
        }
      } else if (trendMetric === 'percentile') {
        yVal = pt.estimatedPercentile ?? 0;
        unit = ' %ile';
      } else {
        if (subjectFilter === 'ALL') {
          yVal = pt.accuracy;
          unit = '%';
        } else {
          yVal = pt.subjectAccuracy[subjectFilter] ?? 0;
          unit = '%';
        }
      }
      return {
        ...pt,
        yVal,
        unit,
      };
    });
  }, [analytics.trendSeries, trendMetric, subjectFilter]);

  if (!analytics.hasData) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#0F0F11] text-neutral-900 dark:text-neutral-100 py-12 px-4 sm:px-6">
        <div className="max-w-2xl mx-auto p-8 rounded-lg bg-neutral-50 dark:bg-[#18181B] border border-neutral-200 dark:border-neutral-800 text-center space-y-4">
          <div className="space-y-1">
            <h1 className="text-xl font-bold text-neutral-950 dark:text-white">
              No performance data yet
            </h1>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 max-w-md mx-auto leading-relaxed">
              Complete your first Full Syllabus or Chapter Test to unlock longitudinal accuracy graphs, chapter improvement tracking, and mistake retests.
            </p>
          </div>
          <div className="pt-2">
            <button
              type="button"
              onClick={onStartFullTest}
              className="px-4 py-2 text-xs font-medium text-white dark:text-neutral-900 bg-neutral-900 dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-100 rounded transition-colors cursor-pointer"
            >
              Start Full Test
            </button>
          </div>
        </div>
      </div>
    );
  }

  const maxY =
    trendMetric === 'score' && subjectFilter === 'ALL' ? 300 : 100;

  return (
    <div className="min-h-screen bg-white dark:bg-[#0F0F11] text-neutral-900 dark:text-neutral-100 py-8 px-4 sm:px-6 overflow-x-hidden w-full max-w-full">
      <div className="max-w-6xl mx-auto space-y-8 min-w-0 w-full">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-neutral-200 dark:border-neutral-800 pb-5">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-950 dark:text-white">
              Analytics
            </h1>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Tracked across {analytics.testsAttempted} completed test
              {analytics.testsAttempted === 1 ? '' : 's'} and {analytics.questionsAttempted} question responses.
            </p>
          </div>

          {analytics.questionsNeedingReviewCount > 0 && (
            <button
              type="button"
              onClick={() => onRetestMistakes()}
              className="px-3.5 py-1.5 text-xs font-medium text-neutral-900 dark:text-neutral-100 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700 rounded transition-colors flex items-center gap-1.5 self-start md:self-auto cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>
                Retest {analytics.questionsNeedingReviewCount} Mistake
                {analytics.questionsNeedingReviewCount === 1 ? '' : 's'}
              </span>
            </button>
          )}
        </div>

        {/* 6-Metric Overview Strip */}
        <section aria-label="Key Metrics" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-3.5 rounded-lg bg-white dark:bg-[#18181B] border border-neutral-200 dark:border-neutral-800">
            <div className="text-xs text-neutral-500 dark:text-neutral-400">Tests Attempted</div>
            <div className="text-xl font-mono font-bold text-neutral-950 dark:text-white mt-1 tabular-nums">
              {analytics.testsAttempted}
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-white dark:bg-[#18181B] border border-neutral-200 dark:border-neutral-800">
            <div className="text-xs text-neutral-500 dark:text-neutral-400">Questions Attempted</div>
            <div className="text-xl font-mono font-bold text-neutral-950 dark:text-white mt-1 tabular-nums">
              {analytics.questionsAttempted}
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-white dark:bg-[#18181B] border border-neutral-200 dark:border-neutral-800">
            <div className="text-xs text-neutral-500 dark:text-neutral-400">Overall Accuracy</div>
            <div className="text-xl font-mono font-bold text-neutral-950 dark:text-white mt-1 tabular-nums">
              {analytics.overallAccuracy}%
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-white dark:bg-[#18181B] border border-neutral-200 dark:border-neutral-800">
            <div className="text-xs text-neutral-500 dark:text-neutral-400">Avg Scaled Score</div>
            <div className="text-xl font-mono font-bold text-neutral-950 dark:text-white mt-1 tabular-nums">
              {analytics.averageNormalizedScore300}
              <span className="text-xs font-normal text-neutral-400 dark:text-neutral-500"> / 300</span>
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-white dark:bg-[#18181B] border border-neutral-200 dark:border-neutral-800">
            <div className="text-xs text-neutral-500 dark:text-neutral-400">Mistakes in Queue</div>
            <div className="text-xl font-mono font-bold text-neutral-950 dark:text-white mt-1 tabular-nums">
              {analytics.questionsNeedingReviewCount}
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-white dark:bg-[#18181B] border border-neutral-200 dark:border-neutral-800">
            <div className="text-xs text-neutral-500 dark:text-neutral-400">Mistakes Corrected</div>
            <div className="text-xl font-mono font-bold text-neutral-950 dark:text-white mt-1 tabular-nums">
              {analytics.correctedMistakesCount}
            </div>
          </div>
        </section>

        {/* Performance Trend Graph */}
        <section aria-label="Performance Trend" className="p-5 rounded-lg bg-white dark:bg-[#18181B] border border-neutral-200 dark:border-neutral-800 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-neutral-950 dark:text-white">Performance Trend Over Time</h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Score trajectory and accuracy over completed tests
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Metric Switcher */}
              <div className="flex items-center gap-0.5 p-0.5 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded text-xs">
                {(
                  [
                    { id: 'accuracy', label: 'Accuracy' },
                    { id: 'score', label: 'Score' },
                    { id: 'percentile', label: 'Percentile' },
                  ] as Array<{ id: TrendMetric; label: string }>
                ).map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setTrendMetric(m.id)}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                      trendMetric === m.id
                        ? 'bg-white dark:bg-neutral-700 text-neutral-950 dark:text-white font-semibold shadow-xs'
                        : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              {/* Subject Switcher */}
              <div className="flex items-center gap-0.5 p-0.5 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded text-xs">
                {(['ALL', 'Physics', 'Chemistry', 'Mathematics'] as const).map((sub) => (
                  <button
                    key={sub}
                    type="button"
                    onClick={() => setSubjectFilter(sub)}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
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

          {/* SVG Line Chart */}
          <div className="w-full overflow-x-auto pt-2">
            <div className="min-w-[600px] h-60 relative">
              <svg
                viewBox="0 0 800 220"
                className="w-full h-full overflow-visible"
                aria-label="Performance trend chart"
              >
                {/* Horizontal Grid Lines */}
                {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                  const y = 185 - ratio * 150;
                  const labelVal = Math.round(ratio * maxY);
                  return (
                    <g key={idx}>
                      <line
                        x1="50"
                        y1={y}
                        x2="770"
                        y2={y}
                        className="stroke-neutral-200 dark:stroke-neutral-800"
                        strokeDasharray="4 4"
                      />
                      <text
                        x="40"
                        y={y + 4}
                        textAnchor="end"
                        className="fill-neutral-500 dark:fill-neutral-400"
                        fontFamily="JetBrains Mono, monospace"
                        fontSize="10"
                      >
                        {labelVal}
                      </text>
                    </g>
                  );
                })}

                {/* Plot Line & Points */}
                {chartPoints.length > 0 && (
                  <>
                    {chartPoints.length > 1 && (
                      <polyline
                        fill="none"
                        className="stroke-neutral-900 dark:stroke-white"
                        strokeWidth="2"
                        points={chartPoints
                          .map((pt, i) => {
                            const x =
                              50 +
                              (i / Math.max(1, chartPoints.length - 1)) * 700;
                            const clamped = Math.max(0, Math.min(maxY, pt.yVal));
                            const y = 185 - (clamped / maxY) * 150;
                            return `${x},${y}`;
                          })
                          .join(' ')}
                      />
                    )}

                    {chartPoints.map((pt, i) => {
                      const x =
                        chartPoints.length === 1
                          ? 400
                          : 50 + (i / (chartPoints.length - 1)) * 700;
                      const clamped = Math.max(0, Math.min(maxY, pt.yVal));
                      const y = 185 - (clamped / maxY) * 150;

                      return (
                        <g
                          key={pt.testId}
                          className="cursor-pointer"
                          onClick={() => onOpenReport(pt.testId)}
                        >
                          <circle
                            cx={x}
                            cy={y}
                            r="4.5"
                            className="fill-neutral-900 dark:fill-white stroke-white dark:stroke-[#18181B]"
                            strokeWidth="2"
                          />
                          <text
                            x={x}
                            y={y - 8}
                            textAnchor="middle"
                            className="fill-neutral-900 dark:fill-white font-mono text-[10px] font-semibold"
                          >
                            {pt.yVal}
                            {pt.unit}
                          </text>
                          <text
                            x={x}
                            y="204"
                            textAnchor="middle"
                            className="fill-neutral-500 dark:fill-neutral-400 font-mono text-[10px]"
                          >
                            {pt.dateShort}
                          </text>
                        </g>
                      );
                    })}
                  </>
                )}
              </svg>
            </div>
          </div>
        </section>

        {/* Subject Breakdown & Question Mastery */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Subject Breakdown */}
          <div className="lg:col-span-7 p-5 rounded-lg bg-white dark:bg-[#18181B] border border-neutral-200 dark:border-neutral-800 space-y-4">
            <h2 className="text-base font-semibold text-neutral-950 dark:text-white">Subject Performance</h2>
            <div className="space-y-3">
              {(['Physics', 'Chemistry', 'Mathematics'] as SubjectName[]).map((sub) => {
                const sb = analytics.subjectBreakdown[sub];
                return (
                  <div
                    key={sub}
                    className="p-3.5 rounded bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-neutral-900 dark:text-neutral-100">{sub}</span>
                      <span className="font-mono font-semibold text-neutral-900 dark:text-neutral-100 tabular-nums">
                        {sb.accuracy}% Accuracy
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-neutral-200 dark:bg-neutral-800 overflow-hidden">
                      <div
                        className="h-full bg-neutral-900 dark:bg-white rounded-full"
                        style={{ width: `${Math.min(100, sb.accuracy)}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] font-mono text-neutral-500 dark:text-neutral-400 tabular-nums">
                      <span>Attempted: {sb.attempted}</span>
                      <span>Correct: {sb.correct}</span>
                      <span>Incorrect: {sb.incorrect}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Question Mastery */}
          <div className="lg:col-span-5 p-5 rounded-lg bg-white dark:bg-[#18181B] border border-neutral-200 dark:border-neutral-800 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <h2 className="text-base font-semibold text-neutral-950 dark:text-white">
                Question Mastery
              </h2>
              <div className="grid grid-cols-2 gap-2.5 text-xs font-mono tabular-nums">
                <div className="p-3 rounded bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800">
                  <div className="text-neutral-500 dark:text-neutral-400 font-sans">Mastered (2+ ✓)</div>
                  <div className="text-lg font-bold text-neutral-950 dark:text-white mt-0.5">
                    {masteryCounts.mastered}
                  </div>
                </div>
                <div className="p-3 rounded bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800">
                  <div className="text-neutral-500 dark:text-neutral-400 font-sans">Corrected (✗ → ✓)</div>
                  <div className="text-lg font-bold text-neutral-950 dark:text-white mt-0.5">
                    {masteryCounts.corrected}
                  </div>
                </div>
                <div className="p-3 rounded bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800">
                  <div className="text-neutral-500 dark:text-neutral-400 font-sans">Needs Review (✗)</div>
                  <div className="text-lg font-bold text-neutral-950 dark:text-white mt-0.5">
                    {masteryCounts.incorrect}
                  </div>
                </div>
                <div className="p-3 rounded bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800">
                  <div className="text-neutral-500 dark:text-neutral-400 font-sans">Attempted (1× ✓)</div>
                  <div className="text-lg font-bold text-neutral-950 dark:text-white mt-0.5">
                    {masteryCounts.attempted}
                  </div>
                </div>
              </div>
            </div>

            {analytics.errorTypeBreakdown.length > 0 && (
              <div className="space-y-2 pt-3 border-t border-neutral-200 dark:border-neutral-800">
                <div className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                  Frequent Error Categories
                </div>
                {analytics.errorTypeBreakdown.slice(0, 4).map((err) => (
                  <div
                    key={err.category}
                    className="flex items-center justify-between text-xs font-mono tabular-nums"
                  >
                    <span className="text-neutral-600 dark:text-neutral-400 font-sans">{err.category}</span>
                    <span className="text-neutral-900 dark:text-neutral-100 font-medium">
                      {err.count} ({err.percentage}%)
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Chapter Mastery Table */}
        <section aria-label="Chapter Mastery Table" className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-neutral-950 dark:text-white">
                Chapter Breakdown
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Accuracy, progress delta, and mistake retest options per chapter
              </p>
            </div>

            <div className="flex items-center gap-0.5 p-0.5 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded text-xs">
              {(['ALL', 'Physics', 'Chemistry', 'Mathematics'] as const).map((sub) => (
                <button
                  key={sub}
                  type="button"
                  onClick={() => setChapterSubjectFilter(sub)}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                    chapterSubjectFilter === sub
                      ? 'bg-white dark:bg-neutral-700 text-neutral-950 dark:text-white font-semibold shadow-xs'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white'
                  }`}
                >
                  {sub === 'ALL' ? 'All' : sub}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 overflow-hidden bg-white dark:bg-[#18181B]">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-neutral-200 dark:border-neutral-800 font-medium text-neutral-600 dark:text-neutral-400 bg-neutral-50 dark:bg-neutral-800/60">
                    <th className="py-3 px-4">Chapter</th>
                    <th className="py-3 px-4">Subject</th>
                    <th className="py-3 px-4 text-right">Attempted</th>
                    <th className="py-3 px-4 text-right">Accuracy</th>
                    <th className="py-3 px-4 text-right">Progress Delta</th>
                    <th className="py-3 px-4 text-right">Mistakes</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                  {filteredChapters.map((c) => (
                    <tr
                      key={`${c.subject}::${c.chapter}`}
                      className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors"
                    >
                      <td className="py-3 px-4 font-semibold text-neutral-950 dark:text-white text-xs">{c.chapter}</td>
                      <td className="py-3 px-4 text-neutral-600 dark:text-neutral-400">{c.subject}</td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-neutral-700 dark:text-neutral-300">
                        {c.attempted} ({c.correct}✓ / {c.incorrect}✗)
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-neutral-950 dark:text-white">
                        {c.accuracy}%
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums">
                        {c.improvementDeltaPoints !== null ? (
                          <span
                            className={
                              c.improvementDeltaPoints >= 0
                                ? 'text-neutral-950 dark:text-neutral-100 font-semibold'
                                : 'text-neutral-600 dark:text-neutral-400'
                            }
                          >
                            {c.improvementDeltaPoints >= 0 ? '+' : ''}
                            {c.improvementDeltaPoints} pts
                          </span>
                        ) : (
                          <span className="text-neutral-400 dark:text-neutral-500">Baseline</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums">
                        {c.activeMistakesInPool > 0 ? (
                          <span className="font-semibold text-neutral-950 dark:text-white">
                            {c.activeMistakesInPool} wrong
                          </span>
                        ) : (
                          <span className="text-neutral-400 dark:text-neutral-500">0</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {c.activeMistakesInPool > 0 && (
                            <button
                              type="button"
                              onClick={() => onRetestMistakes(c.subject, c.chapter)}
                              className="px-2.5 py-1 rounded bg-white dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 font-medium whitespace-nowrap cursor-pointer transition-colors"
                            >
                              Retest ({c.activeMistakesInPool})
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => onPracticeChapter(c.subject, c.chapter)}
                            className="px-2.5 py-1 rounded bg-neutral-900 dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-100 text-white dark:text-neutral-900 font-medium whitespace-nowrap cursor-pointer transition-colors"
                          >
                            Practice
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
