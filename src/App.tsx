/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActiveRecallView } from './components/ActiveRecallView';
import { AnalyticsDashboardView } from './components/AnalyticsDashboardView';
import { ChapterMasteryView } from './components/ChapterMasteryView';
import { ChapterSelectorView } from './components/ChapterSelectorView';
import { ExamWorkspaceView } from './components/ExamWorkspaceView';
import { LandingDashboardView } from './components/LandingDashboardView';
import { ActiveNavTab, Navbar } from './components/Navbar';
import { TestHistoryView } from './components/TestHistoryView';
import { TestOverviewModal } from './components/TestOverviewModal';
import { TestResultsView } from './components/TestResultsView';
import { LongTermAnalyticsService } from './services/LongTermAnalyticsService';
import { QuestionBankEngine } from './services/QuestionBankEngine';
import { questionBankService } from './services/QuestionBankService';
import { ScoringAndAnalyticsService } from './services/ScoringAndAnalyticsService';
import { TestGeneratorService } from './services/TestGeneratorService';
import {
  GeneratedTest,
  NormalizedQuestion,
  QuestionBankDiagnostics,
  QuestionHistoryRecord,
  QuestionPaletteStatus,
  QuestionResponseState,
  SubjectName,
  TestMode,
  TestResultReport,
  TestStatus,
} from './types/jee';

const USER_ID = 'student-arjun';
const LS_ACTIVE_TEST_KEY = 'vectra_jee_active_test_v1';
const LS_REPORTS_KEY = 'vectra_jee_reports_v1';
const LS_HISTORY_KEY = 'vectra_jee_history_v1';
const LS_THEME_KEY = 'test_generator_theme_v1';

type ViewScreen =
  | 'dashboard'
  | 'chapters'
  | 'exam'
  | 'results'
  | 'analytics'
  | 'history'
  | 'mastery'
  | 'recall';

interface OverviewPendingConfig {
  mode: TestMode;
  selectedSubjects: SubjectName[];
  chaptersBySubject: Partial<Record<SubjectName, string[]>>;
  allowFlexibleCount: boolean;
  targetQuestionIds?: string[];
  sourceAttemptId?: string;
}

export interface MistakeRetestOptions {
  attemptId?: string;
  subject?: SubjectName;
  chapter?: string;
  questionIds?: string[];
}

export default function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(LS_THEME_KEY);
      if (saved === 'dark' || saved === 'light') return saved;
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });

  useEffect(() => {
    if (typeof document !== 'undefined') {
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
        document.documentElement.setAttribute('data-theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.setAttribute('data-theme', 'light');
      }
      localStorage.setItem(LS_THEME_KEY, theme);
    }
  }, [theme]);

  const handleToggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [loadingStatus, setLoadingStatus] = useState('Loading 55-chapter question bank & your progress...');
  const [showDiagnosticsDrawer, setShowDiagnosticsDrawer] = useState(false);

  const [questions, setQuestions] = useState<NormalizedQuestion[]>([]);
  const [diagnostics, setDiagnostics] = useState<QuestionBankDiagnostics | null>(null);

  const [activeTest, setActiveTest] = useState<GeneratedTest | null>(null);
  const [reports, setReports] = useState<TestResultReport[]>([]);
  const [historyMap, setHistoryMap] = useState<Record<string, QuestionHistoryRecord>>({});

  const [currentView, setCurrentView] = useState<ViewScreen>('dashboard');
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);

  const [chapterPreset, setChapterPreset] = useState<{
    subject?: SubjectName;
    chapter?: string;
  }>({});

  const [overviewConfig, setOverviewConfig] = useState<OverviewPendingConfig | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);

  // Dedicated Retest Launch Overlay State (Parts 22, 23, 29, 31)
  const [retestLaunchState, setRetestLaunchState] = useState<{
    status: 'preparing' | 'ready' | 'error';
    mistakeCount: number;
    errorMessage?: string;
  } | null>(null);

  // Build client-side QuestionBankEngine mirror for instant lookups & fallback
  const clientEngine = useMemo(() => {
    const eng = new QuestionBankEngine();
    if (questions.length > 0) {
      eng.ingestFiles([{ filePath: 'server-loaded.json', content: questions }]);
    }
    return eng;
  }, [questions]);

  const questionsById = useMemo(() => {
    const map = new Map<string, NormalizedQuestion>();
    for (const q of questions) {
      map.set(q.id, q);
    }
    return map;
  }, [questions]);

  // Initial load of Question Bank and Student Persistent State
  useEffect(() => {
    let mounted = true;

    async function initializePlatform() {
      setIsLoading(true);
      setLoadError(null);
      try {
        setLoadingStatus('Connecting to authentic JEE question repository...');
        const [qbData, userData] = await Promise.all([
          questionBankService.loadQuestionBank({
            forceReload: loadAttempt > 0,
            onProgress: (_loaded, _total, msg) => {
              if (mounted) setLoadingStatus(msg);
            },
          }),
          fetch(`/api/student/${USER_ID}/state`)
            .then((res) => (res.ok ? res.json() : null))
            .catch(() => null),
        ]);

        if (!mounted) return;

        setQuestions(qbData.questions || []);
        setDiagnostics(qbData.diagnostics || null);

        // Merge server state with localStorage fallback if local has newer active test responses
        const lsActiveRaw = localStorage.getItem(LS_ACTIVE_TEST_KEY);
        let recoveredActive: GeneratedTest | null = userData?.activeTest || null;

        if (lsActiveRaw) {
          try {
            const parsedLs = JSON.parse(lsActiveRaw) as GeneratedTest;
            if (
              recoveredActive &&
              parsedLs.id === recoveredActive.id &&
              parsedLs.status === TestStatus.IN_PROGRESS
            ) {
              recoveredActive = {
                ...recoveredActive,
                responses: parsedLs.responses || recoveredActive.responses,
                currentQuestionOrder:
                  parsedLs.currentQuestionOrder || recoveredActive.currentQuestionOrder,
                activeSubject: parsedLs.activeSubject || recoveredActive.activeSubject,
              };
            } else if (!recoveredActive && parsedLs.status === TestStatus.IN_PROGRESS) {
              recoveredActive = parsedLs;
            }
          } catch {
            // ignore malformed local cache
          }
        }

        // Merge server reports & history with localStorage cache so refreshing or reopening never loses attempt/mistake data
        let mergedReports: TestResultReport[] = userData?.reports || [];
        try {
          const lsReportsRaw = localStorage.getItem(LS_REPORTS_KEY);
          if (lsReportsRaw) {
            const parsedReports = JSON.parse(lsReportsRaw) as TestResultReport[];
            const seenIds = new Set(mergedReports.map((r) => r.testId));
            for (const r of parsedReports) {
              if (r && r.testId && !seenIds.has(r.testId)) {
                seenIds.add(r.testId);
                mergedReports.push(r);
              }
            }
          }
        } catch {
          // ignore malformed cache
        }

        let mergedHistory: Record<string, QuestionHistoryRecord> = {
          ...(userData?.historyMap || {}),
        };
        try {
          const lsHistRaw = localStorage.getItem(LS_HISTORY_KEY);
          if (lsHistRaw) {
            const parsedHist = JSON.parse(lsHistRaw) as Record<string, QuestionHistoryRecord>;
            for (const [qid, rec] of Object.entries(parsedHist)) {
              if (!mergedHistory[qid] || (rec.attemptCount || 0) > (mergedHistory[qid].attemptCount || 0)) {
                mergedHistory[qid] = rec;
              }
            }
          }
        } catch {
          // ignore malformed cache
        }

        setActiveTest(recoveredActive);
        setReports(mergedReports);
        setHistoryMap(mergedHistory);
        setLoadError(null);
      } catch (err: any) {
        if (!mounted) return;
        setLoadError(err?.message || 'Failed to initialize platform.');
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    initializePlatform();
    return () => {
      mounted = false;
    };
  }, [loadAttempt]);

  // Sync active test to localStorage and debounce server autosave
  const autosaveTimeoutRef = useRef< ReturnType<typeof setTimeout> | null >(null);

  const persistActiveTestState = useCallback((updatedTest: GeneratedTest | null) => {
    if (!updatedTest) {
      localStorage.removeItem(LS_ACTIVE_TEST_KEY);
      return;
    }
    localStorage.setItem(LS_ACTIVE_TEST_KEY, JSON.stringify(updatedTest));

    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current);
    }
    autosaveTimeoutRef.current = setTimeout(() => {
      fetch(`/api/tests/${updatedTest.id}/autosave`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: USER_ID,
          responses: updatedTest.responses,
          currentQuestionOrder: updatedTest.currentQuestionOrder,
          activeSubject: updatedTest.activeSubject,
        }),
      }).catch(() => {
        // Retain local state silently if network is temporarily offline
      });
    }, 350);
  }, []);

  // Update active test response handler
  const handleUpdateResponse = useCallback(
    (
      questionId: string,
      updater: (prev: QuestionResponseState) => QuestionResponseState
    ) => {
      setActiveTest((prevTest) => {
        if (!prevTest) return null;
        const existing = prevTest.responses[questionId] || {
          questionId,
          answer: null,
          status: QuestionPaletteStatus.VISITED,
          markedForReview: false,
          visited: true,
          timeSpentSeconds: 0,
          lastUpdatedAt: new Date().toISOString(),
        };
        const updatedResp = updater(existing);
        const nextTest: GeneratedTest = {
          ...prevTest,
          responses: {
            ...prevTest.responses,
            [questionId]: updatedResp,
          },
        };
        persistActiveTestState(nextTest);
        return nextTest;
      });
    },
    [persistActiveTestState]
  );

  // Navigate to a specific question order inside the active test
  const handleNavigateQuestion = useCallback(
    (targetOrder: number) => {
      setActiveTest((prevTest) => {
        if (!prevTest) return null;
        const targetAlloc = prevTest.questions.find((q) => q.order === targetOrder);
        if (!targetAlloc) return prevTest;

        const existingResp = prevTest.responses[targetAlloc.questionId];
        const nextStatus =
          existingResp?.status === QuestionPaletteStatus.NOT_VISITED
            ? QuestionPaletteStatus.VISITED
            : existingResp?.status || QuestionPaletteStatus.VISITED;

        const nextTest: GeneratedTest = {
          ...prevTest,
          currentQuestionOrder: targetOrder,
          activeSubject: targetAlloc.subject,
          responses: {
            ...prevTest.responses,
            [targetAlloc.questionId]: {
              ...(existingResp || {
                questionId: targetAlloc.questionId,
                answer: null,
                markedForReview: false,
                timeSpentSeconds: 0,
              }),
              visited: true,
              status: nextStatus,
              lastUpdatedAt: new Date().toISOString(),
            },
          },
        };
        persistActiveTestState(nextTest);
        return nextTest;
      });
    },
    [persistActiveTestState]
  );

  // Submit active test (Idempotent, server-scored)
  const isSubmittingRef = useRef(false);

  const handleSubmitTest = useCallback(
    async (autoSubmitted = false) => {
      if (!activeTest || isSubmittingRef.current) return;
      isSubmittingRef.current = true;

      const testToSubmit = activeTest;
      try {
        const resp = await fetch(`/api/tests/${testToSubmit.id}/submit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: USER_ID,
            testSnapshot: testToSubmit,
            autoSubmitted,
          }),
        });

        if (resp.ok) {
          const data = await resp.json();
          const newReport: TestResultReport = data.report;
          const newHistory: Record<string, QuestionHistoryRecord> = data.historyMap;

          setReports((prev) => {
            const exists = prev.some((r) => r.testId === newReport.testId);
            const next = exists ? prev : [newReport, ...prev];
            localStorage.setItem(LS_REPORTS_KEY, JSON.stringify(next));
            return next;
          });
          setHistoryMap(newHistory);
          localStorage.setItem(LS_HISTORY_KEY, JSON.stringify(newHistory));
          setActiveTest(null);
          localStorage.removeItem(LS_ACTIVE_TEST_KEY);

          setSelectedReportId(newReport.testId);
          setCurrentView('results');
        } else {
          // Local authoritative fallback if server unreachable
          const { report, updatedHistoryMap } =
            ScoringAndAnalyticsService.evaluateAndRecordTest(
              testToSubmit,
              clientEngine,
              historyMap,
              autoSubmitted
            );
          setReports((prev) => {
            const next = [report, ...prev];
            localStorage.setItem(LS_REPORTS_KEY, JSON.stringify(next));
            return next;
          });
          setHistoryMap(updatedHistoryMap);
          localStorage.setItem(LS_HISTORY_KEY, JSON.stringify(updatedHistoryMap));
          setActiveTest(null);
          localStorage.removeItem(LS_ACTIVE_TEST_KEY);
          setSelectedReportId(report.testId);
          setCurrentView('results');
        }
      } finally {
        isSubmittingRef.current = false;
      }
    },
    [activeTest, clientEngine, historyMap]
  );

  // Server-backed countdown timer (Section 16)
  useEffect(() => {
    if (!activeTest || activeTest.status !== TestStatus.IN_PROGRESS) {
      setRemainingSeconds(0);
      return;
    }

    const computeRemaining = () => {
      const startMs = new Date(activeTest.startTime).getTime();
      const elapsedSeconds = Math.floor((Date.now() - startMs) / 1000);
      return Math.max(0, activeTest.durationSeconds - elapsedSeconds);
    };

    const initialRem = computeRemaining();
    setRemainingSeconds(initialRem);

    if (initialRem <= 0 && currentView === 'exam') {
      handleSubmitTest(true);
      return;
    }

    const timer = setInterval(() => {
      const rem = computeRemaining();
      setRemainingSeconds(rem);
      if (rem <= 0 && currentView === 'exam') {
        clearInterval(timer);
        handleSubmitTest(true);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [activeTest, currentView, handleSubmitTest]);

  // Confirm & Generate Test from Overview Modal
  const handleConfirmStartTest = async (targetScore?: number) => {
    if (!overviewConfig) return;
    setGenerationError(null);

    try {
      const resp = await fetch('/api/tests/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: USER_ID,
          mode: overviewConfig.mode,
          selectedSubjects: overviewConfig.selectedSubjects,
          chaptersBySubject: overviewConfig.chaptersBySubject,
          allowFlexibleCount: overviewConfig.allowFlexibleCount,
          targetScore,
        }),
      });

      if (resp.ok) {
        const outcome = await resp.json();
        if (outcome && outcome.success && outcome.test) {
          const generated: GeneratedTest = {
            ...outcome.test,
            targetScore,
            tabSwitchCount: 0,
          };
          setActiveTest(generated);
          persistActiveTestState(generated);
          setOverviewConfig(null);
          setCurrentView('exam');
          return;
        }
      }
    } catch {
      // Fallback to client engine if offline or server route fails
    }

    // Authoritative client engine fallback
    const outcome = TestGeneratorService.generateTest(
      clientEngine,
      {
        userId: USER_ID,
        mode: overviewConfig.mode,
        selectedSubjects: overviewConfig.selectedSubjects,
        chaptersBySubject: overviewConfig.chaptersBySubject,
        allowFlexibleCount: overviewConfig.allowFlexibleCount,
        targetScore,
      },
      historyMap
    );

    if (!outcome.success || !outcome.test) {
      setGenerationError(outcome.error || 'Failed to generate test.');
      return;
    }
    const finalTest: GeneratedTest = {
      ...outcome.test,
      targetScore,
      tabSwitchCount: 0,
    };
    setActiveTest(finalTest);
    persistActiveTestState(finalTest);
    setOverviewConfig(null);
    setCurrentView('exam');
  };

  // Discard unfinished test
  const handleDiscardActiveTest = async () => {
    if (!activeTest) return;
    const id = activeTest.id;
    setActiveTest(null);
    localStorage.removeItem(LS_ACTIVE_TEST_KEY);
    await fetch(`/api/tests/${id}?userId=${USER_ID}`, { method: 'DELETE' }).catch(() => {});
  };

  // Central Reusable Retest Function (Parts 16–32, 42)
  const startMistakeRetest = useCallback(
    async (options: MistakeRetestOptions = {}) => {
      if (!diagnostics) return;

      const { attemptId, subject, chapter, questionIds } = options;
      const candidateIds: string[] = [];

      // 1. Explicit question IDs passed directly (e.g. single question retest or custom list)
      if (questionIds && questionIds.length > 0) {
        candidateIds.push(...questionIds);
      }

      // 2. Specific completed test attempt ID passed (e.g. "Retest N Mistakes" on Results screen)
      if (candidateIds.length === 0 && attemptId) {
        const targetReport = reports.find((r) => r.testId === attemptId);
        if (targetReport) {
          for (const qr of targetReport.questionResults) {
            if (qr.result !== 'incorrect') continue;
            if (subject && qr.subject !== subject) continue;
            if (chapter && qr.chapter !== chapter) continue;
            candidateIds.push(qr.questionId);
          }
        }
      }

      // 3. Fallback / global or chapter-level mistake lookup from persistent historyMap & saved reports
      if (candidateIds.length === 0) {
        const activeMistakeIds: string[] = [];
        const historicalMistakeIds: string[] = [];

        for (const rec of Object.values(historyMap)) {
          if (subject && rec.subject !== subject) continue;
          if (chapter && rec.chapter !== chapter) continue;
          if (rec.lastResult === 'incorrect' || rec.masteryState === 'incorrect') {
            activeMistakeIds.push(rec.questionId);
          } else if (rec.incorrectCount > 0 && rec.lastResult !== 'correct') {
            historicalMistakeIds.push(rec.questionId);
          }
        }

        if (activeMistakeIds.length > 0) {
          candidateIds.push(...activeMistakeIds);
        } else if (historicalMistakeIds.length > 0) {
          candidateIds.push(...historicalMistakeIds);
        } else {
          // Also scan saved reports in case a mistake exists in report archive
          for (const rep of reports) {
            for (const qr of rep.questionResults) {
              if (qr.result !== 'incorrect') continue;
              if (subject && qr.subject !== subject) continue;
              if (chapter && qr.chapter !== chapter) continue;
              candidateIds.push(qr.questionId);
            }
          }
        }
      }

      // Deduplicate question IDs (Part 32)
      const uniqueCandidateIds = Array.from(
        new Set(candidateIds.map((id) => String(id).trim()).filter(Boolean))
      );

      if (uniqueCandidateIds.length === 0) {
        setRetestLaunchState({
          status: 'error',
          mistakeCount: 0,
          errorMessage: 'You have no mistakes to retest in this selection.',
        });
        return;
      }

      // Validate questions exist in current question bank (Part 31)
      const validMistakeQuestions = uniqueCandidateIds
        .map((id) => questionsById.get(id))
        .filter((q): q is NormalizedQuestion => Boolean(q));

      if (validMistakeQuestions.length === 0) {
        setRetestLaunchState({
          status: 'error',
          mistakeCount: 0,
          errorMessage: 'These questions are no longer available in the question bank.',
        });
        return;
      }

      const validMistakeIds = validMistakeQuestions.map((q) => q.id);
      const subjectsWithMistakes = (['Physics', 'Chemistry', 'Mathematics'] as SubjectName[]).filter(
        (sub) => validMistakeQuestions.some((q) => q.subject === sub)
      );
      const chaptersMap: Partial<Record<SubjectName, string[]>> = {};
      for (const sub of subjectsWithMistakes) {
        chaptersMap[sub] = Array.from(
          new Set(validMistakeQuestions.filter((q) => q.subject === sub).map((q) => q.chapter))
        );
      }

      // Show animated Retest Launch Overlay (Part 23)
      setOverviewConfig(null);
      setGenerationError(null);
      setRetestLaunchState({
        status: 'preparing',
        mistakeCount: validMistakeIds.length,
      });

      await new Promise((r) => setTimeout(r, 420));

      setRetestLaunchState({
        status: 'ready',
        mistakeCount: validMistakeIds.length,
      });

      let generatedTest: GeneratedTest | null = null;

      try {
        const resp = await fetch('/api/tests/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: USER_ID,
            mode: TestMode.WRONG_QUESTION_RETEST,
            selectedSubjects: subjectsWithMistakes,
            chaptersBySubject: chaptersMap,
            allowFlexibleCount: true,
            targetQuestionIds: validMistakeIds,
            sourceAttemptId: attemptId,
          }),
        });
        const outcome = await resp.json();
        if (resp.ok && outcome.success && outcome.test) {
          generatedTest = outcome.test;
        }
      } catch {
        // Fallback to client engine below
      }

      if (!generatedTest) {
        const fallbackOutcome = TestGeneratorService.generateTest(
          clientEngine,
          {
            userId: USER_ID,
            mode: TestMode.WRONG_QUESTION_RETEST,
            selectedSubjects: subjectsWithMistakes,
            chaptersBySubject: chaptersMap,
            allowFlexibleCount: true,
            targetQuestionIds: validMistakeIds,
            sourceAttemptId: attemptId,
          },
          historyMap
        );
        if (fallbackOutcome.success && fallbackOutcome.test) {
          generatedTest = fallbackOutcome.test;
        } else {
          setRetestLaunchState({
            status: 'error',
            mistakeCount: validMistakeIds.length,
            errorMessage:
              fallbackOutcome.error || 'Something went wrong while preparing your retest.',
          });
          return;
        }
      }

      await new Promise((r) => setTimeout(r, 450));

      setActiveTest(generatedTest);
      persistActiveTestState(generatedTest);
      setRetestLaunchState(null);
      setCurrentView('exam');
    },
    [diagnostics, reports, historyMap, questionsById, clientEngine, persistActiveTestState]
  );

  // Compute longitudinal analytics from real reports and question history
  const analyticsSummary = useMemo(() => {
    return LongTermAnalyticsService.computeAnalytics(reports, historyMap);
  }, [reports, historyMap]);

  const activeReport = useMemo(() => {
    if (!selectedReportId) return reports[0] || null;
    return reports.find((r) => r.testId === selectedReportId) || reports[0] || null;
  }, [reports, selectedReportId]);

  const handleOpenFullSyllabusOverview = () => {
    if (!diagnostics) return;
    const allChaptersBySub: Partial<Record<SubjectName, string[]>> = {
      Physics: diagnostics.chapterInventories
        .filter((c) => c.subject === 'Physics')
        .map((c) => c.chapter),
      Chemistry: diagnostics.chapterInventories
        .filter((c) => c.subject === 'Chemistry')
        .map((c) => c.chapter),
      Mathematics: diagnostics.chapterInventories
        .filter((c) => c.subject === 'Mathematics')
        .map((c) => c.chapter),
    };
    setGenerationError(null);
    setOverviewConfig({
      mode: TestMode.FULL_SYLLABUS,
      selectedSubjects: ['Physics', 'Chemistry', 'Mathematics'],
      chaptersBySubject: allChaptersBySub,
      allowFlexibleCount: false,
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#0F0F11] text-neutral-900 dark:text-neutral-100 flex flex-col items-center justify-center p-6 space-y-4">
        <div className="w-8 h-8 rounded-full border-2 border-neutral-900 dark:border-neutral-100 border-t-transparent animate-spin" />
        <div className="text-center space-y-1 max-w-sm">
          <div className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
            Loading Workspace
          </div>
          <p className="text-sm text-neutral-800 dark:text-neutral-200">
            {loadingStatus}
          </p>
        </div>
      </div>
    );
  }

  if (loadError || !diagnostics) {
    const errorDetails = questionBankService.getLastError();
    return (
      <div className="min-h-screen bg-white dark:bg-[#0F0F11] text-neutral-900 dark:text-neutral-100 flex flex-col items-center justify-center p-6 space-y-4">
        <div className="max-w-md w-full p-6 rounded-lg bg-white dark:bg-[#18181B] border border-neutral-300 dark:border-neutral-700 text-center space-y-3 shadow-sm">
          <div className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">Unable to load question bank</div>
          <h2 className="text-lg font-bold text-neutral-950 dark:text-white">
            Workspace Initialization Error
          </h2>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
            {loadError || 'Unable to load the question bank. Please try refreshing.'}
          </p>
          <div className="pt-2 flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={() => setLoadAttempt((p) => p + 1)}
              className="px-4 py-2 text-xs font-medium bg-neutral-900 dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-200 text-white dark:text-neutral-950 rounded cursor-pointer transition-colors"
            >
              Retry
            </button>
            <button
              type="button"
              onClick={() => setShowDiagnosticsDrawer((p) => !p)}
              className="text-xs text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 underline underline-offset-4 cursor-pointer"
            >
              {showDiagnosticsDrawer ? 'Hide Details' : 'View Diagnostics'}
            </button>
          </div>

          {showDiagnosticsDrawer && (
            <div className="mt-4 p-3 rounded bg-neutral-50 dark:bg-[#121214] border border-neutral-200 dark:border-neutral-800 text-left font-mono text-[11px] text-neutral-600 dark:text-neutral-400 space-y-1 overflow-x-auto">
              <div>
                <strong className="text-neutral-800 dark:text-neutral-200">Category:</strong>{' '}
                {errorDetails?.category || 'QUESTION_BANK_FETCH_FAILED'}
              </div>
              <div>
                <strong className="text-neutral-800 dark:text-neutral-200">Environment:</strong>{' '}
                {errorDetails?.environment || (typeof process !== 'undefined' ? process.env?.NODE_ENV : 'production')}
              </div>
              <div>
                <strong className="text-neutral-800 dark:text-neutral-200">Attempts:</strong>{' '}
                {errorDetails?.attemptsMade || 3} of 3
              </div>
              <div>
                <strong className="text-neutral-800 dark:text-neutral-200">Endpoints:</strong> /api/question-bank, /question-bank/manifest.json
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-[#0F0F11] text-neutral-900 dark:text-neutral-100 selection:bg-neutral-200 dark:selection:bg-neutral-800 transition-colors">
      {/* Show Top Navbar on all screens EXCEPT during an active examination */}
      {currentView !== 'exam' && (
        <Navbar
          activeTab={
            currentView === 'results'
              ? 'history'
              : (currentView as ActiveNavTab)
          }
          onSelectTab={(tab) => setCurrentView(tab)}
          hasActiveTest={Boolean(activeTest)}
          onResumeTest={() => setCurrentView('exam')}
          onStartFullTest={handleOpenFullSyllabusOverview}
          theme={theme}
          onToggleTheme={handleToggleTheme}
        />
      )}

      {/* VIEW ROUTER WITH SMOOTH PAGE TRANSITION (Part 8) */}
      <div key={currentView} className="animate-page-enter">
        {currentView === 'dashboard' && (
          <LandingDashboardView
            diagnostics={diagnostics}
            analytics={analyticsSummary}
            activeTest={activeTest}
            recentReport={reports[0] || null}
            remainingActiveTestSeconds={remainingSeconds}
            onStartFullSyllabusOverview={handleOpenFullSyllabusOverview}
            onOpenChapterSelector={(presetSubject, presetChapter) => {
              setChapterPreset({ subject: presetSubject, chapter: presetChapter });
              setCurrentView('chapters');
            }}
            onResumeActiveTest={() => setCurrentView('exam')}
            onDiscardActiveTest={handleDiscardActiveTest}
            onOpenReport={(testId) => {
              setSelectedReportId(testId);
              setCurrentView('results');
            }}
            onRetestMistakes={(sub, chap) => startMistakeRetest({ subject: sub, chapter: chap })}
            onNavigateTab={(tab) => setCurrentView(tab)}
          />
        )}

        {currentView === 'chapters' && (
          <ChapterSelectorView
            diagnostics={diagnostics}
            historyMap={historyMap}
            initialSubject={chapterPreset.subject}
            initialChapter={chapterPreset.chapter}
            onStartChapterTestOverview={(cfg) => {
              if (cfg.mode === TestMode.WRONG_QUESTION_RETEST) {
                const sub = cfg.selectedSubjects.length === 1 ? cfg.selectedSubjects[0] : undefined;
                const chap =
                  sub && cfg.chaptersBySubject[sub]?.length === 1
                    ? cfg.chaptersBySubject[sub]![0]
                    : undefined;
                startMistakeRetest({ subject: sub, chapter: chap });
                return;
              }
              setGenerationError(null);
              setOverviewConfig(cfg);
            }}
            onCancel={() => setCurrentView('dashboard')}
          />
        )}

        {currentView === 'exam' && activeTest && (
          <ExamWorkspaceView
            test={activeTest}
            questionsById={questionsById}
            remainingSeconds={remainingSeconds}
            onUpdateResponse={handleUpdateResponse}
            onNavigateQuestion={handleNavigateQuestion}
            onSubmitTest={handleSubmitTest}
            theme={theme}
            onToggleTheme={handleToggleTheme}
          />
        )}

        {currentView === 'results' && activeReport && (
          <TestResultsView
            report={activeReport}
            onBackToDashboard={() => setCurrentView('dashboard')}
            onPracticeWeakChapters={(subject, chapters) => {
              setGenerationError(null);
              setOverviewConfig({
                mode: TestMode.CHAPTER_TEST,
                selectedSubjects: [subject],
                chaptersBySubject: { [subject]: chapters },
                allowFlexibleCount: true,
              });
            }}
            onRetestMistakes={(sub, chap, questionIds) =>
              startMistakeRetest({
                attemptId: activeReport.testId,
                subject: sub,
                chapter: chap,
                questionIds,
              })
            }
          />
        )}

        {currentView === 'analytics' && (
          <AnalyticsDashboardView
            analytics={analyticsSummary}
            historyMap={historyMap}
            onStartFullTest={handleOpenFullSyllabusOverview}
            onPracticeChapter={(subject, chapter) => {
              setChapterPreset({ subject, chapter });
              setCurrentView('chapters');
            }}
            onRetestMistakes={(sub, chap) => startMistakeRetest({ subject: sub, chapter: chap })}
            onOpenReport={(testId) => {
              setSelectedReportId(testId);
              setCurrentView('results');
            }}
          />
        )}

        {currentView === 'history' && (
          <TestHistoryView
            reports={reports}
            onOpenReport={(testId) => {
              setSelectedReportId(testId);
              setCurrentView('results');
            }}
            onRetestAttemptMistakes={(testId) => startMistakeRetest({ attemptId: testId })}
            onStartNewTest={handleOpenFullSyllabusOverview}
          />
        )}

        {currentView === 'mastery' && diagnostics && (
          <ChapterMasteryView
            diagnostics={diagnostics}
            historyMap={historyMap}
            reports={reports}
            onPracticeChapter={(subject, chapter) => {
              setChapterPreset({ subject, chapter });
              setCurrentView('chapters');
            }}
            onRetestMistakes={(sub, chap) => startMistakeRetest({ subject: sub, chapter: chap })}
            onStartFullTest={handleOpenFullSyllabusOverview}
            onOpenChapterSelector={(sub) => {
              if (sub) setChapterPreset({ subject: sub });
              setCurrentView('chapters');
            }}
          />
        )}

        {currentView === 'recall' && (
          <ActiveRecallView
            historyMap={historyMap}
            questionsById={questionsById}
            onStartFullTest={handleOpenFullSyllabusOverview}
            onOpenChapterSelector={(sub) => {
              if (sub) setChapterPreset({ subject: sub });
              setCurrentView('chapters');
            }}
            onOpenDashboard={() => setCurrentView('dashboard')}
          />
        )}
      </div>

      {/* DEDICATED MISTAKE RETEST LAUNCH OVERLAY */}
      {retestLaunchState && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-page-enter"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-lg bg-white dark:bg-[#18181B] border border-neutral-300 dark:border-neutral-700 p-6 text-center space-y-5 shadow-lg text-neutral-900 dark:text-white">
            {retestLaunchState.status === 'error' ? (
              <>
                <div className="w-10 h-10 rounded-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 flex items-center justify-center mx-auto text-base font-bold">
                  !
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-neutral-950 dark:text-white">Unable to start retest</h3>
                  <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                    {retestLaunchState.errorMessage}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setRetestLaunchState(null)}
                  className="px-4 py-2 rounded bg-neutral-900 dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-200 text-xs font-medium text-white dark:text-neutral-950 cursor-pointer transition-colors"
                >
                  Close
                </button>
              </>
            ) : (
              <>
                <div className="w-10 h-10 rounded-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 flex items-center justify-center mx-auto">
                  {retestLaunchState.status === 'preparing' ? (
                    <div className="w-5 h-5 rounded-full border-2 border-neutral-900 dark:border-white border-t-transparent animate-spin" />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 flex items-center justify-center font-bold text-xs">
                      ✓
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <div className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                    Mistake Remediation
                  </div>
                  <h3 className="text-base font-bold text-neutral-950 dark:text-white">
                    {retestLaunchState.status === 'preparing'
                      ? 'Preparing your mistakes...'
                      : `${retestLaunchState.mistakeCount} mistake${
                          retestLaunchState.mistakeCount === 1 ? '' : 's'
                        } ready for review`}
                  </h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    {retestLaunchState.status === 'preparing'
                      ? 'Isolating incorrect questions and setting up fresh attempt...'
                      : 'Launching test session...'}
                  </p>
                </div>

                <div className="w-full h-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden border border-neutral-200 dark:border-neutral-700">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      retestLaunchState.status === 'preparing'
                        ? 'w-1/2 bg-neutral-400 dark:bg-neutral-500'
                        : 'w-full bg-neutral-900 dark:bg-white'
                    }`}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* PRE-TEST OVERVIEW & GENERATION TRANSITION MODAL (Section 18, 75) */}
      {overviewConfig && (
        <TestOverviewModal
          mode={overviewConfig.mode}
          selectedSubjects={overviewConfig.selectedSubjects}
          chaptersBySubject={overviewConfig.chaptersBySubject}
          allowFlexibleCount={overviewConfig.allowFlexibleCount}
          errorMessage={generationError}
          onConfirmStart={handleConfirmStartTest}
          onClose={() => {
            setOverviewConfig(null);
            setGenerationError(null);
          }}
        />
      )}
    </div>
  );
}
