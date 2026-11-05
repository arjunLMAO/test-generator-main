import React, { useMemo, useState, useEffect } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Check,
  Clock,
  RotateCcw,
  Search,
} from 'lucide-react';
import {
  ChapterInventory,
  DEFAULT_SCORING_CONFIG,
  QuestionBankDiagnostics,
  QuestionHistoryRecord,
  SubjectName,
  TestMode,
} from '../types/jee';

interface ChapterSelectorViewProps {
  diagnostics: QuestionBankDiagnostics;
  historyMap: Record<string, QuestionHistoryRecord>;
  initialSubject?: SubjectName;
  initialChapter?: string;
  onStartChapterTestOverview: (config: {
    mode: TestMode;
    selectedSubjects: SubjectName[];
    chaptersBySubject: Partial<Record<SubjectName, string[]>>;
    allowFlexibleCount: boolean;
  }) => void;
  onCancel: () => void;
}

const ALL_SUBJECTS: SubjectName[] = ['Physics', 'Chemistry', 'Mathematics'];

export const ChapterSelectorView: React.FC<ChapterSelectorViewProps> = ({
  diagnostics,
  historyMap,
  initialSubject,
  initialChapter,
  onStartChapterTestOverview,
  onCancel,
}) => {
  const [selectedSubjects, setSelectedSubjects] = useState<SubjectName[]>(
    initialSubject ? [initialSubject] : ['Physics', 'Chemistry', 'Mathematics']
  );
  const [viewSubjectTab, setViewSubjectTab] = useState<'ALL' | SubjectName>(initialSubject || 'ALL');

  const [selectedChapters, setSelectedChapters] = useState<Record<SubjectName, string[]>>({
    Physics: initialSubject === 'Physics' && initialChapter ? [initialChapter] : [],
    Chemistry: initialSubject === 'Chemistry' && initialChapter ? [initialChapter] : [],
    Mathematics: initialSubject === 'Mathematics' && initialChapter ? [initialChapter] : [],
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [allowFlexibleCount, setAllowFlexibleCount] = useState(false);

  useEffect(() => {
    if (initialSubject) {
      setSelectedSubjects((prev) =>
        prev.includes(initialSubject) ? prev : [...prev, initialSubject]
      );
      setViewSubjectTab(initialSubject);
      if (initialChapter) {
        setSelectedChapters((prev) => ({
          ...prev,
          [initialSubject]: prev[initialSubject].includes(initialChapter)
            ? prev[initialSubject]
            : [...prev[initialSubject], initialChapter],
        }));
      }
    }
  }, [initialSubject, initialChapter]);

  // Group chapters dynamically from question bank diagnostics
  const chaptersBySubjectBank = useMemo(() => {
    const grouped: Record<SubjectName, ChapterInventory[]> = {
      Physics: [],
      Chemistry: [],
      Mathematics: [],
    };
    for (const inv of diagnostics.chapterInventories) {
      grouped[inv.subject].push(inv);
    }
    return grouped;
  }, [diagnostics.chapterInventories]);

  // Compute historical accuracy and active mistakes per chapter from real historyMap
  const chapterHistoryStats = useMemo(() => {
    const stats = new Map<
      string,
      { attempted: number; correct: number; activeMistakes: number }
    >();
    for (const rec of Object.values(historyMap)) {
      const key = `${rec.subject}::${rec.chapter}`;
      const cur = stats.get(key) || { attempted: 0, correct: 0, activeMistakes: 0 };
      if (rec.attemptCount > 0) {
        cur.attempted++;
        if (rec.lastResult === 'correct') cur.correct++;
        if (rec.lastResult === 'incorrect' || rec.masteryState === 'incorrect') {
          cur.activeMistakes++;
        }
      }
      stats.set(key, cur);
    }
    return stats;
  }, [historyMap]);

  const toggleSubject = (sub: SubjectName) => {
    setSelectedSubjects((prev) => {
      if (prev.includes(sub)) {
        return prev.filter((s) => s !== sub);
      }
      return ALL_SUBJECTS.filter((s) => [...prev, sub].includes(s));
    });
  };

  const toggleChapter = (sub: SubjectName, chapterName: string) => {
    if (!selectedSubjects.includes(sub)) {
      setSelectedSubjects((prev) => ALL_SUBJECTS.filter((s) => [...prev, sub].includes(s)));
    }
    setSelectedChapters((prev) => {
      const cur = prev[sub] || [];
      const next = cur.includes(chapterName)
        ? cur.filter((c) => c !== chapterName)
        : [...cur, chapterName];
      return { ...prev, [sub]: next };
    });
  };

  const selectAllForSubject = (sub: SubjectName) => {
    if (!selectedSubjects.includes(sub)) {
      setSelectedSubjects((prev) => ALL_SUBJECTS.filter((s) => [...prev, sub].includes(s)));
    }
    const allNames = chaptersBySubjectBank[sub].map((c) => c.chapter);
    setSelectedChapters((prev) => ({ ...prev, [sub]: allNames }));
  };

  const clearSubjectChapters = (sub: SubjectName) => {
    setSelectedChapters((prev) => ({ ...prev, [sub]: [] }));
  };

  // Calculate inventory & validation per selected subject
  const subjectInventorySummary = useMemo(() => {
    return selectedSubjects.map((sub) => {
      const chosenSet = new Set(selectedChapters[sub] || []);
      const matchingInvs = chaptersBySubjectBank[sub].filter((c) => chosenSet.has(c.chapter));
      const mcqAvailable = matchingInvs.reduce((s, c) => s + c.mcqCount, 0);
      const intAvailable = matchingInvs.reduce((s, c) => s + c.integerCount, 0);
      const activeMistakesAvailable = Array.from(chosenSet).reduce((sum, ch) => {
        const st = chapterHistoryStats.get(`${sub}::${ch}`);
        return sum + (st?.activeMistakes || 0);
      }, 0);

      const mcqRequired = DEFAULT_SCORING_CONFIG.mcqCountPerSubject;
      const intRequired = DEFAULT_SCORING_CONFIG.integerCountPerSubject;
      const hasShortfall = mcqAvailable < mcqRequired || intAvailable < intRequired;

      return {
        subject: sub,
        chaptersCount: chosenSet.size,
        mcqAvailable,
        intAvailable,
        mcqRequired,
        intRequired,
        hasShortfall,
        activeMistakesAvailable,
      };
    });
  }, [selectedSubjects, selectedChapters, chaptersBySubjectBank, chapterHistoryStats]);

  const totalSelectedSubjectsCount = selectedSubjects.length;
  const standardQuestionCount = totalSelectedSubjectsCount * 25;
  const durationHours = totalSelectedSubjectsCount;
  const durationFormatted = `${durationHours}:00:00`;

  const totalMistakesInSelection = subjectInventorySummary.reduce(
    (s, item) => s + item.activeMistakesAvailable,
    0
  );

  const anySubjectWithoutChapters = subjectInventorySummary.some((s) => s.chaptersCount === 0);
  const anySubjectWithShortfall = subjectInventorySummary.some(
    (s) => s.chaptersCount > 0 && s.hasShortfall
  );

  const canGenerateStandardTest =
    totalSelectedSubjectsCount > 0 &&
    !anySubjectWithoutChapters &&
    (!anySubjectWithShortfall || allowFlexibleCount);

  const handleGenerateStandard = () => {
    if (!canGenerateStandardTest) return;
    const filteredChapters: Partial<Record<SubjectName, string[]>> = {};
    for (const sub of selectedSubjects) {
      filteredChapters[sub] = selectedChapters[sub];
    }
    onStartChapterTestOverview({
      mode: TestMode.CHAPTER_TEST,
      selectedSubjects,
      chaptersBySubject: filteredChapters,
      allowFlexibleCount,
    });
  };

  const handleGenerateMistakeRetest = () => {
    if (totalSelectedSubjectsCount === 0 || anySubjectWithoutChapters || totalMistakesInSelection === 0) {
      return;
    }
    const filteredChapters: Partial<Record<SubjectName, string[]>> = {};
    for (const sub of selectedSubjects) {
      filteredChapters[sub] = selectedChapters[sub];
    }
    onStartChapterTestOverview({
      mode: TestMode.WRONG_QUESTION_RETEST,
      selectedSubjects,
      chaptersBySubject: filteredChapters,
      allowFlexibleCount: true,
    });
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#0F0F11] text-neutral-900 dark:text-neutral-100 py-8 px-4 sm:px-6 transition-colors overflow-x-hidden w-full max-w-full">
      <div className="max-w-6xl mx-auto space-y-8 min-w-0 w-full">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-neutral-200 dark:border-neutral-800 pb-5">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-950 dark:text-white">
              Select Chapters
            </h1>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 max-w-2xl">
              Choose 1 to 3 subjects and select chapters for your targeted test.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="px-3.5 py-1.5 text-xs font-medium text-neutral-800 dark:text-neutral-200 bg-white dark:bg-[#18181B] border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded transition-colors self-start sm:self-auto cursor-pointer"
          >
            ← Back to Dashboard
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT 8 COLUMNS: Subject Toggles & Chapter Trees */}
          <div className="lg:col-span-8 space-y-6">
            {/* Step 1: Subject Selection */}
            <div className="p-5 rounded-lg bg-white dark:bg-[#18181B] border border-neutral-200 dark:border-neutral-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-neutral-950 dark:text-white">
                    1. Subjects
                  </h2>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    25 questions (20 MCQ + 5 Numerical) per selected subject
                  </p>
                </div>
                <span className="text-xs font-mono text-neutral-600 dark:text-neutral-400 font-medium tabular-nums">
                  {selectedSubjects.length} of 3 active
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {ALL_SUBJECTS.map((sub) => {
                  const isSelected = selectedSubjects.includes(sub);
                  const chapCount = selectedChapters[sub]?.length || 0;
                  const totalSubChaps = chaptersBySubjectBank[sub]?.length || 0;
                  return (
                    <button
                      key={sub}
                      type="button"
                      onClick={() => toggleSubject(sub)}
                      className={`p-4 rounded-lg border text-left transition-colors cursor-pointer ${
                        isSelected
                          ? 'border-neutral-900 dark:border-white bg-neutral-50 dark:bg-neutral-800 text-neutral-950 dark:text-white'
                          : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#121214] text-neutral-600 dark:text-neutral-400 hover:border-neutral-300 dark:hover:border-neutral-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-neutral-900 dark:text-white">{sub}</span>
                        <div
                          className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                            isSelected
                              ? 'bg-neutral-900 dark:bg-white border-neutral-900 dark:border-white text-white dark:text-neutral-950'
                              : 'border-neutral-300 dark:border-neutral-700 bg-transparent'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3" />}
                        </div>
                      </div>
                      <div className="mt-1 text-xs font-mono tabular-nums text-neutral-500 dark:text-neutral-400">
                        {chapCount} / {totalSubChaps} chapters
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Search & Chapter Selection */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-neutral-950 dark:text-white">
                    2. Select Chapters
                  </h2>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    All {diagnostics.chapterInventories.length} chapters available across JEE syllabus. Click chapters to include or exclude.
                  </p>
                </div>
                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search all chapters..."
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
                      : chaptersBySubjectBank[tab]?.length || 0;
                  const isSelectedTab = viewSubjectTab === tab;
                  return (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setViewSubjectTab(tab)}
                      className={`px-3 py-1.5 rounded text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                        isSelectedTab
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

              {(() => {
                const subjectsToDisplay = viewSubjectTab === 'ALL' ? ALL_SUBJECTS : [viewSubjectTab];
                return subjectsToDisplay.map((sub) => {
                  const subChapters = chaptersBySubjectBank[sub] || [];
                  const filtered = subChapters.filter((c) =>
                    c.chapter.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
                    c.topics.some((t) => t.toLowerCase().includes(searchQuery.trim().toLowerCase()))
                  );
                  const chosenList = selectedChapters[sub] || [];
                  const isSubActiveInTest = selectedSubjects.includes(sub);

                  return (
                    <div
                      key={sub}
                      className="rounded-lg bg-white dark:bg-[#18181B] border border-neutral-200 dark:border-neutral-800 overflow-hidden"
                    >
                      <div className="px-4 py-3 bg-neutral-50 dark:bg-[#141416] border-b border-neutral-200 dark:border-neutral-800 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-semibold text-neutral-950 dark:text-white">{sub}</h3>
                          <span className="text-xs font-mono text-neutral-500 dark:text-neutral-400 tabular-nums">
                            · {chosenList.length} of {subChapters.length} selected
                          </span>
                          {!isSubActiveInTest && chosenList.length === 0 && (
                            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
                              Inactive in test
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <button
                            type="button"
                            onClick={() => selectAllForSubject(sub)}
                            className="text-neutral-900 dark:text-neutral-200 hover:underline font-medium cursor-pointer"
                          >
                            Select all
                          </button>
                          <span className="text-neutral-300 dark:text-neutral-700">|</span>
                          <button
                            type="button"
                            onClick={() => clearSubjectChapters(sub)}
                            className="text-neutral-500 hover:text-neutral-900 dark:hover:text-white font-medium cursor-pointer"
                          >
                            Clear
                          </button>
                        </div>
                      </div>

                      <div className="p-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                        {filtered.map((chapInv) => {
                          const isChecked = chosenList.includes(chapInv.chapter);
                          const histStat = chapterHistoryStats.get(`${sub}::${chapInv.chapter}`);
                          const hasLowSingleInventory =
                            chapInv.mcqCount < 20 || chapInv.integerCount < 5;

                          return (
                            <div
                              key={chapInv.chapter}
                              onClick={() => toggleChapter(sub, chapInv.chapter)}
                              role="checkbox"
                              aria-checked={isChecked}
                              tabIndex={0}
                              onKeyDown={(e) => {
                                if (e.key === ' ' || e.key === 'Enter') {
                                  e.preventDefault();
                                  toggleChapter(sub, chapInv.chapter);
                                }
                              }}
                              className={`p-3 rounded border transition-colors cursor-pointer flex items-start gap-2.5 ${
                                isChecked
                                  ? 'bg-neutral-100 dark:bg-neutral-800 border-neutral-900 dark:border-neutral-300 text-neutral-950 dark:text-white font-medium'
                                  : 'bg-white dark:bg-[#121214] border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:border-neutral-300 dark:hover:border-neutral-700'
                              }`}
                            >
                              <div
                                className={`mt-0.5 w-3.5 h-3.5 rounded flex items-center justify-center border shrink-0 ${
                                  isChecked
                                    ? 'bg-neutral-900 dark:bg-white border-neutral-900 dark:border-white text-white dark:text-neutral-950'
                                    : 'border-neutral-300 dark:border-neutral-700 bg-transparent'
                                }`}
                              >
                                {isChecked && <Check className="w-2.5 h-2.5" />}
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="text-xs font-medium leading-snug">
                                  {chapInv.chapter}
                                </div>
                                <div className="mt-1 flex flex-wrap items-center gap-1 text-[11px] font-mono text-neutral-500 dark:text-neutral-400 tabular-nums">
                                  <span>{chapInv.totalQuestions} Qs</span>
                                  <span aria-hidden="true">·</span>
                                  <span>{chapInv.mcqCount} MCQ</span>
                                  <span aria-hidden="true">·</span>
                                  <span>{chapInv.integerCount} Int</span>
                                  {hasLowSingleInventory && (
                                    <>
                                      <span aria-hidden="true">·</span>
                                      <span className="text-neutral-700 dark:text-neutral-300 underline underline-offset-2">
                                        Combine chapters
                                      </span>
                                    </>
                                  )}
                                </div>
                                {histStat && histStat.attempted > 0 && (
                                  <div className="mt-1 flex items-center gap-1.5 text-[11px] font-mono tabular-nums text-neutral-600 dark:text-neutral-400">
                                    <span>Attempted: {histStat.attempted}</span>
                                    {histStat.activeMistakes > 0 && (
                                      <span>· {histStat.activeMistakes} mistakes</span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>

          {/* RIGHT 4 COLUMNS: Configuration Summary Panel */}
          <div className="lg:col-span-4 lg:sticky lg:top-20 space-y-4">
            <div className="p-5 rounded-lg bg-white dark:bg-[#18181B] border border-neutral-300 dark:border-neutral-800 space-y-4">
              <div>
                <h2 className="text-base font-bold text-neutral-950 dark:text-white">
                  Test Summary
                </h2>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">Configured parameters</p>
              </div>

              {/* Subject Breakdown */}
              <div className="space-y-2 pt-2 border-t border-neutral-200 dark:border-neutral-800 text-xs">
                {ALL_SUBJECTS.map((sub) => {
                  const isSubSelected = selectedSubjects.includes(sub);
                  const count = isSubSelected ? selectedChapters[sub]?.length || 0 : 0;
                  return (
                    <div key={sub} className="flex items-center justify-between">
                      <span className={isSubSelected ? 'text-neutral-900 dark:text-white font-medium' : 'text-neutral-400 dark:text-neutral-600'}>
                        {sub}
                      </span>
                      <span
                        className={`font-mono tabular-nums ${
                          isSubSelected && count > 0
                            ? 'text-neutral-900 dark:text-white font-semibold'
                            : isSubSelected
                              ? 'text-neutral-600 dark:text-neutral-400'
                              : 'text-neutral-400 dark:text-neutral-600'
                        }`}
                      >
                        {count} chapter{count === 1 ? '' : 's'}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Question Count & Duration */}
              <div className="p-3 rounded bg-neutral-50 dark:bg-[#121214] border border-neutral-200 dark:border-neutral-800 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-neutral-600 dark:text-neutral-400">Questions</span>
                  <span className="font-mono font-semibold text-neutral-950 dark:text-white tabular-nums">
                    {standardQuestionCount}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-neutral-600 dark:text-neutral-400">Duration</span>
                  <span className="font-mono font-semibold text-neutral-950 dark:text-white tabular-nums flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {durationFormatted}
                  </span>
                </div>
                <div className="pt-2 border-t border-neutral-200 dark:border-neutral-800 text-[11px] font-mono text-neutral-500 dark:text-neutral-400 tabular-nums">
                  20 MCQ + 5 Integer per selected subject
                </div>
              </div>

              {/* Validation & Inventory Warnings */}
              {totalSelectedSubjectsCount === 0 && (
                <div className="p-3 rounded bg-neutral-50 dark:bg-[#121214] border border-neutral-300 dark:border-neutral-700 text-xs text-neutral-700 dark:text-neutral-300 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-neutral-700 dark:text-neutral-300" />
                  <span>Select at least one subject to configure a test.</span>
                </div>
              )}

              {anySubjectWithoutChapters && (
                <div className="p-3 rounded bg-neutral-50 dark:bg-[#121214] border border-neutral-300 dark:border-neutral-700 text-xs text-neutral-700 dark:text-neutral-300 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-neutral-700 dark:text-neutral-300" />
                  <span>
                    Select at least one chapter for each active subject (
                    {subjectInventorySummary
                      .filter((s) => s.chaptersCount === 0)
                      .map((s) => s.subject)
                      .join(', ')}
                    ).
                  </span>
                </div>
              )}

              {anySubjectWithShortfall && !anySubjectWithoutChapters && (
                <div className="p-3 rounded bg-neutral-50 dark:bg-[#121214] border border-neutral-300 dark:border-neutral-700 space-y-2 text-xs">
                  <div className="flex items-start gap-2 text-neutral-800 dark:text-neutral-200">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-neutral-700 dark:text-neutral-300" />
                    <div>
                      <div className="font-medium">Chapter Question Threshold</div>
                      {subjectInventorySummary
                        .filter((s) => s.hasShortfall)
                        .map((s) => (
                          <p key={s.subject} className="mt-0.5 text-neutral-600 dark:text-neutral-400 leading-relaxed">
                            {s.subject} has{' '}
                            <span className="font-mono font-semibold">{s.mcqAvailable} MCQs</span> and{' '}
                            <span className="font-mono font-semibold">{s.intAvailable} Integer</span>{' '}
                            (Required: 20 MCQs + 5 Integer).
                          </p>
                        ))}
                    </div>
                  </div>

                  <label className="flex items-start gap-2 pt-2 border-t border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allowFlexibleCount}
                      onChange={(e) => setAllowFlexibleCount(e.target.checked)}
                      className="mt-0.5 rounded border-neutral-300 dark:border-neutral-700"
                    />
                    <span>
                      Allow creating a shorter test using the exact available questions
                    </span>
                  </label>
                </div>
              )}

              {/* Primary CTA */}
              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  disabled={!canGenerateStandardTest}
                  onClick={handleGenerateStandard}
                  className={`w-full py-2.5 px-3 rounded text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${
                    canGenerateStandardTest
                      ? 'bg-neutral-900 dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-200 text-white dark:text-neutral-950 cursor-pointer'
                      : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-600 cursor-not-allowed border border-neutral-200 dark:border-neutral-700'
                  }`}
                >
                  <span>Generate Test</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>

                {totalMistakesInSelection > 0 && !anySubjectWithoutChapters && (
                  <button
                    type="button"
                    onClick={handleGenerateMistakeRetest}
                    className="w-full py-2 px-3 rounded text-xs font-medium text-neutral-900 dark:text-neutral-100 bg-white dark:bg-[#121214] border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>
                      Retest {totalMistakesInSelection} Mistake
                      {totalMistakesInSelection === 1 ? '' : 's'}
                    </span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
