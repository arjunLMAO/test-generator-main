import React, { useMemo, useState, useEffect } from 'react';
import {
  AlertTriangle,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  Moon,
  Send,
  Sun,
  Target,
  X,
} from 'lucide-react';
import {
  GeneratedTest,
  NormalizedQuestion,
  QuestionPaletteStatus,
  QuestionResponseState,
  SubjectName,
} from '../types/jee';
import { MathText } from './MathText';
import { QuestionVisuals } from './VisualDiagramRenderer';
import { sanitizeStudentQuestionText } from '../services/StudentQuestionSerializer';

export interface ExamWorkspaceViewProps {
  test: GeneratedTest;
  questionsById: Map<string, NormalizedQuestion>;
  remainingSeconds: number;
  onUpdateResponse: (
    questionId: string,
    updater: (prev: QuestionResponseState) => QuestionResponseState,
    nextOrder?: number,
    nextSubject?: SubjectName
  ) => void;
  onNavigateQuestion: (targetOrder: number) => void;
  onSubmitTest: (autoSubmitted: boolean) => void;
  isSubmitting?: boolean;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
}

function formatTimer(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const hrs = Math.floor(safe / 3600);
  const mins = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  if (hrs > 0) {
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export const ExamWorkspaceView: React.FC<ExamWorkspaceViewProps> = ({
  test,
  questionsById,
  remainingSeconds,
  onUpdateResponse,
  onNavigateQuestion,
  onSubmitTest,
  isSubmitting = false,
  theme,
  onToggleTheme,
}) => {
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [isLocalSubmitting, setIsLocalSubmitting] = useState(false);
  const [integerInput, setIntegerInput] = useState('');
  const [tabSwitchCount, setTabSwitchCount] = useState<number>(test.tabSwitchCount || 0);
  const [lastTabSwitchWarning, setLastTabSwitchWarning] = useState<string | null>(null);

  // Immediate escape key listener to revert back to test
  useEffect(() => {
    if (!showSubmitModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting && !isLocalSubmitting) {
        setShowSubmitModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showSubmitModal, isSubmitting, isLocalSubmitting]);

  // Tab switch detector
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Tab hidden
      } else {
        // Tab visible again after being hidden
        setTabSwitchCount((prev) => {
          const next = prev + 1;
          test.tabSwitchCount = next;
          setLastTabSwitchWarning(
            `Tab switch detected (Incident #${next}). Navigating away from the examination window is recorded in your audit log.`
          );
          return next;
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [test]);

  const currentAllocation = useMemo(() => {
    return (
      test.questions.find((q) => q.order === test.currentQuestionOrder) ||
      test.questions[0]
    );
  }, [test.questions, test.currentQuestionOrder]);

  const currentQuestion = useMemo(() => {
    return questionsById.get(currentAllocation.questionId);
  }, [questionsById, currentAllocation.questionId]);

  const currentSubject = currentAllocation.subject;

  const currentResponse = useMemo(() => {
    return (
      test.responses[currentAllocation.questionId] || {
        questionId: currentAllocation.questionId,
        answer: null,
        markedForReview: false,
        status: QuestionPaletteStatus.VISITED,
        timeSpentSeconds: 0,
        visitCount: 1,
      }
    );
  }, [test.responses, currentAllocation.questionId]);

  // Synchronize numerical input
  useEffect(() => {
    if (currentAllocation.type === 'integer') {
      setIntegerInput(currentResponse.answer ? String(currentResponse.answer) : '');
    } else {
      setIntegerInput('');
    }
  }, [currentAllocation.questionId, currentAllocation.type, currentResponse.answer]);

  // Group questions by subject
  const subjectGroups = useMemo(() => {
    const map = new Map<SubjectName, typeof test.questions>();
    for (const sub of test.subjects) {
      map.set(sub, []);
    }
    for (const q of test.questions) {
      const list = map.get(q.subject) || [];
      list.push(q);
      map.set(q.subject, list);
    }
    return map;
  }, [test.questions, test.subjects]);

  const handleSelectOption = (opt: string) => {
    onUpdateResponse(currentAllocation.questionId, (prev) => {
      const isAlreadySelected = prev.answer === opt;
      const nextAnswer = isAlreadySelected ? null : opt;
      return {
        ...prev,
        answer: nextAnswer,
        status: nextAnswer
          ? prev.markedForReview
            ? QuestionPaletteStatus.ANSWERED_MARKED_REVIEW
            : QuestionPaletteStatus.ANSWERED
          : prev.markedForReview
            ? QuestionPaletteStatus.MARKED_REVIEW
            : QuestionPaletteStatus.VISITED,
        lastUpdatedAt: new Date().toISOString(),
      };
    });
  };

  const handleSaveInteger = (val: string) => {
    setIntegerInput(val);
    const cleaned = val.trim();
    onUpdateResponse(currentAllocation.questionId, (prev) => {
      const nextAnswer = cleaned !== '' ? cleaned : null;
      return {
        ...prev,
        answer: nextAnswer,
        status: nextAnswer
          ? prev.markedForReview
            ? QuestionPaletteStatus.ANSWERED_MARKED_REVIEW
            : QuestionPaletteStatus.ANSWERED
          : prev.markedForReview
            ? QuestionPaletteStatus.MARKED_REVIEW
            : QuestionPaletteStatus.VISITED,
        lastUpdatedAt: new Date().toISOString(),
      };
    });
  };

  const handleClearResponse = () => {
    setIntegerInput('');
    onUpdateResponse(currentAllocation.questionId, (prev) => ({
      ...prev,
      answer: null,
      status: prev.markedForReview
        ? QuestionPaletteStatus.MARKED_REVIEW
        : QuestionPaletteStatus.VISITED,
      lastUpdatedAt: new Date().toISOString(),
    }));
  };

  const handleToggleMarkForReview = () => {
    onUpdateResponse(currentAllocation.questionId, (prev) => {
      const nextMarked = !prev.markedForReview;
      let nextStatus = prev.status;
      if (prev.answer) {
        nextStatus = nextMarked
          ? QuestionPaletteStatus.ANSWERED_MARKED_REVIEW
          : QuestionPaletteStatus.ANSWERED;
      } else {
        nextStatus = nextMarked
          ? QuestionPaletteStatus.MARKED_REVIEW
          : QuestionPaletteStatus.VISITED;
      }
      return {
        ...prev,
        markedForReview: nextMarked,
        status: nextStatus,
        lastUpdatedAt: new Date().toISOString(),
      };
    });
  };

  const handleSaveAndNext = () => {
    const currentIndex = test.questions.findIndex((q) => q.order === currentAllocation.order);
    if (currentIndex < test.questions.length - 1) {
      onNavigateQuestion(test.questions[currentIndex + 1].order);
    }
  };

  const handlePrevious = () => {
    const currentIndex = test.questions.findIndex((q) => q.order === currentAllocation.order);
    if (currentIndex > 0) {
      onNavigateQuestion(test.questions[currentIndex - 1].order);
    }
  };

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === 'ArrowRight') {
        handleSaveAndNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrevious();
      } else if (['a', 'b', 'c', 'd', 'A', 'B', 'C', 'D'].includes(e.key) && currentAllocation.type === 'mcq') {
        handleSelectOption(e.key.toUpperCase());
      } else if (e.key === 'm' || e.key === 'M') {
        handleToggleMarkForReview();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentAllocation, handleSaveAndNext, handlePrevious, handleSelectOption, handleToggleMarkForReview]);

  // Palette counts
  const stats = useMemo(() => {
    let answered = 0;
    let marked = 0;
    let answeredAndMarked = 0;
    let notAnswered = 0;

    for (const q of test.questions) {
      const r = test.responses[q.questionId];
      if (r?.answer && r.markedForReview) answeredAndMarked++;
      else if (r?.answer) answered++;
      else if (r?.markedForReview) marked++;
      else notAnswered++;
    }

    return { answered, marked, answeredAndMarked, notAnswered, total: test.questions.length };
  }, [test.questions, test.responses]);

  return (
    <div className="min-h-screen bg-white dark:bg-[#0F0F11] text-neutral-900 dark:text-neutral-100 flex flex-col transition-colors overflow-x-hidden w-full max-w-full">
      {/* Top Examination Bar */}
      <header className="sticky top-0 z-30 bg-white dark:bg-[#121214] border-b border-neutral-200 dark:border-neutral-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className="font-semibold text-sm tracking-tight text-neutral-950 dark:text-white shrink-0">
              Test Generator
            </span>
            <span className="text-neutral-300 dark:text-neutral-700" aria-hidden="true">/</span>
            <span className="text-xs text-neutral-600 dark:text-neutral-400 font-medium truncate max-w-[160px] sm:max-w-xs">
              {test.title}
            </span>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* Target Score Indicator */}
            {test.targetScore !== undefined && test.targetScore > 0 && (
              <div
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-xs font-mono"
                title="Target Score Goal"
              >
                <Target className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400" />
                <span className="text-neutral-500 dark:text-neutral-400">Target:</span>
                <span className="font-semibold text-neutral-900 dark:text-white">{test.targetScore}</span>
              </div>
            )}

            {/* Tab Switch Badge */}
            {tabSwitchCount > 0 && (
              <div
                className="flex items-center gap-1.5 px-2 py-1 rounded border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 text-xs font-mono"
                title="Tab switches detected"
              >
                <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                <span>Switches: {tabSwitchCount}</span>
              </div>
            )}

            {/* Theme Toggle Button */}
            {onToggleTheme && (
              <button
                type="button"
                onClick={onToggleTheme}
                aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                className="p-1.5 rounded text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                {theme === 'dark' ? (
                  <Sun className="w-4 h-4 text-amber-400" />
                ) : (
                  <Moon className="w-4 h-4 text-neutral-600" />
                )}
              </button>
            )}

            {/* Timer */}
            <div
              className={`flex items-center gap-1.5 px-3 py-1 rounded border text-xs font-mono font-medium tabular-nums ${
                remainingSeconds < 300
                  ? 'border-red-300 dark:border-red-900 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300'
                  : 'border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200'
              }`}
              title="Time Remaining"
            >
              <Clock className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400" />
              <span>{formatTimer(remainingSeconds)}</span>
            </div>

            {/* Submit Button */}
            <button
              type="button"
              disabled={isSubmitting || isLocalSubmitting}
              onClick={() => setShowSubmitModal(true)}
              className="px-3.5 py-1.5 bg-neutral-900 dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-200 text-white dark:text-neutral-950 text-xs font-medium rounded transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting || isLocalSubmitting ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <Send className="w-3 h-3" />
                  <span>Submit Test</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Tab Switch Warning Banner */}
        {lastTabSwitchWarning && (
          <div className="bg-amber-50 dark:bg-amber-950/60 border-t border-b border-amber-200 dark:border-amber-800 px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3 text-xs text-amber-900 dark:text-amber-200">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span className="font-medium">{lastTabSwitchWarning}</span>
            </div>
            <button
              type="button"
              onClick={() => setLastTabSwitchWarning(null)}
              className="px-2.5 py-0.5 rounded bg-amber-200/60 dark:bg-amber-800/60 hover:bg-amber-300 dark:hover:bg-amber-700 text-amber-950 dark:text-amber-100 font-medium transition-colors cursor-pointer shrink-0 text-xs"
            >
              Acknowledge
            </button>
          </div>
        )}

        {/* Subject Subheader */}
        <div className="bg-neutral-50 dark:bg-[#18181B] border-t border-neutral-200 dark:border-neutral-800 px-4 sm:px-6 h-10 flex items-center justify-between">
          <div className="flex items-center gap-1">
            {test.subjects.map((sub) => {
              const isActive = sub === currentSubject;
              const subQuestions = subjectGroups.get(sub) || [];
              const subAnswered = subQuestions.filter(
                (q) => test.responses[q.questionId]?.answer
              ).length;

              return (
                <button
                  key={sub}
                  type="button"
                  onClick={() => {
                    const firstInSub = subQuestions[0];
                    if (firstInSub) onNavigateQuestion(firstInSub.order);
                  }}
                  className={`px-3 py-1 text-xs font-medium rounded transition-colors cursor-pointer flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-white dark:bg-[#27272A] border border-neutral-300 dark:border-neutral-600 text-neutral-950 dark:text-white font-semibold shadow-xs'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800'
                  }`}
                >
                  <span>{sub}</span>
                  <span className="text-[11px] font-mono text-neutral-400 dark:text-neutral-500">
                    ({subAnswered}/{subQuestions.length})
                  </span>
                </button>
              );
            })}
          </div>

          <div className="text-xs text-neutral-500 dark:text-neutral-400 hidden sm:flex items-center gap-3">
            <span>
              Question <strong className="text-neutral-900 dark:text-white font-mono">{currentAllocation.order}</strong> of{' '}
              <span className="font-mono">{test.questions.length}</span>
            </span>
            <span className="text-neutral-300 dark:text-neutral-700" aria-hidden="true">·</span>
            <span className="uppercase text-[11px] font-medium tracking-wide text-neutral-500 dark:text-neutral-400">
              {currentAllocation.type === 'mcq' ? 'MCQ (+4, -1)' : 'Numerical (+4, 0)'}
            </span>
          </div>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 8 Cols: Question Statement & Answer Input */}
        <main className="lg:col-span-8 flex flex-col gap-5">
          {/* Question Card */}
          <section
            aria-label="Question Content"
            className="p-6 bg-white dark:bg-[#18181B] border border-neutral-200 dark:border-neutral-800 rounded-lg shadow-xs"
          >
            {/* Header info */}
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-neutral-100 dark:border-neutral-800 text-xs text-neutral-500 dark:text-neutral-400">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-neutral-900 dark:text-white">
                  Question {currentAllocation.order}
                </span>
                {currentQuestion?.chapter && (
                  <>
                    <span className="text-neutral-300 dark:text-neutral-700" aria-hidden="true">·</span>
                    <span className="text-neutral-600 dark:text-neutral-400 truncate max-w-xs">{currentQuestion.chapter}</span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-2 font-mono text-[11px]">
                <span className="text-emerald-700 dark:text-emerald-400 font-medium">+4 Marks</span>
                <span className="text-neutral-300 dark:text-neutral-700" aria-hidden="true">·</span>
                <span className="text-neutral-600 dark:text-neutral-400">
                  {currentAllocation.type === 'mcq' ? '-1 Neg' : 'No Neg'}
                </span>
              </div>
            </div>

            {/* Question Text with KaTeX */}
            <div className="text-neutral-900 dark:text-neutral-100 leading-relaxed text-base">
              {currentQuestion?.question ? (
                <MathText text={sanitizeStudentQuestionText(currentQuestion.question)} />
              ) : (
                <p className="text-neutral-400 dark:text-neutral-600 italic">Loading question statement...</p>
              )}
            </div>

            {/* Question Diagrams / Visuals */}
            {currentQuestion && (
              <div className="mt-4">
                <QuestionVisuals
                  visuals={currentQuestion.images}
                  visualAsset={currentQuestion.visualAsset}
                  imageUrl={currentQuestion.image}
                  subject={currentQuestion.subject}
                  chapter={currentQuestion.chapter}
                  visualRequired={currentQuestion.visualRequired}
                  visualStatus={currentQuestion.visualStatus}
                  questionOrder={currentAllocation.order}
                />
              </div>
            )}
          </section>

          {/* Answer Options Card */}
          <section
            aria-label="Answer Options"
            className="p-6 bg-white dark:bg-[#18181B] border border-neutral-200 dark:border-neutral-800 rounded-lg shadow-xs space-y-4"
          >
            <h3 className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">
              {currentAllocation.type === 'mcq' ? 'Select One Option' : 'Numerical Answer'}
            </h3>

            {currentAllocation.type === 'mcq' && currentQuestion?.options ? (
              <div className="space-y-2.5">
                {(['A', 'B', 'C', 'D'] as const).map((letter, idx) => {
                  const optionText = currentQuestion.options ? currentQuestion.options[idx] : '';
                  const isSelected = currentResponse.answer === letter;

                  return (
                    <button
                      key={letter}
                      type="button"
                      onClick={() => handleSelectOption(letter)}
                      className={`w-full text-left p-3.5 rounded-md border text-sm flex items-start gap-3 transition-colors cursor-pointer ${
                        isSelected
                          ? 'border-neutral-950 dark:border-white bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 font-medium'
                          : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#18181B] hover:bg-neutral-50 dark:hover:bg-neutral-800/60 text-neutral-900 dark:text-neutral-100'
                      }`}
                    >
                      <span
                        className={`w-6 h-6 rounded flex items-center justify-center font-mono font-bold text-xs shrink-0 mt-0.5 border ${
                          isSelected
                            ? 'bg-white dark:bg-neutral-950 text-neutral-950 dark:text-white border-white dark:border-neutral-950'
                            : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-300 dark:border-neutral-700'
                        }`}
                      >
                        {letter}
                      </span>
                      <div className="flex-1 min-w-0 pt-0.5">
                        <MathText text={optionText} inline className={isSelected ? 'text-white dark:text-neutral-950' : ''} />
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-3">
                <label className="block text-xs text-neutral-600 dark:text-neutral-400">
                  Enter integer or numerical value (rounded to 2 decimal places if required):
                </label>
                <div className="flex items-center gap-3 max-w-sm">
                  <input
                    type="number"
                    step="any"
                    value={integerInput}
                    onChange={(e) => handleSaveInteger(e.target.value)}
                    placeholder="Enter answer"
                    className="flex-1 px-3 py-2 text-sm border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#141416] text-neutral-900 dark:text-white rounded focus:border-neutral-950 dark:focus:border-white focus:outline-none font-mono"
                  />
                  {integerInput && (
                    <button
                      type="button"
                      onClick={handleClearResponse}
                      className="px-3 py-2 text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white border border-neutral-200 dark:border-neutral-700 rounded hover:bg-neutral-50 dark:hover:bg-neutral-800"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Action Bar */}
            <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleToggleMarkForReview}
                  className={`px-3 py-2 text-xs font-medium rounded border transition-colors cursor-pointer flex items-center gap-1.5 ${
                    currentResponse.markedForReview
                      ? 'border-amber-400 dark:border-amber-600 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 font-semibold'
                      : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#18181B] text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                  }`}
                >
                  <Bookmark className={`w-3.5 h-3.5 ${currentResponse.markedForReview ? 'fill-amber-500' : ''}`} />
                  <span>
                    {currentResponse.markedForReview ? 'Marked for Review' : 'Mark for Review'}
                  </span>
                </button>

                {currentResponse.answer && (
                  <button
                    type="button"
                    onClick={handleClearResponse}
                    className="px-3 py-2 text-xs font-medium text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
                  >
                    Clear Response
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrevious}
                  disabled={currentAllocation.order === 1}
                  className="px-3 py-2 text-xs font-medium border border-neutral-200 dark:border-neutral-800 rounded bg-white dark:bg-[#18181B] text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Previous</span>
                </button>
                <button
                  type="button"
                  onClick={handleSaveAndNext}
                  className="px-4 py-2 text-xs font-medium bg-neutral-900 dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-200 text-white dark:text-neutral-950 rounded transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <span>Save & Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </section>
        </main>

        {/* Right 4 Cols: Question Palette & Navigation */}
        <aside className="lg:col-span-4 bg-white dark:bg-[#18181B] border border-neutral-200 dark:border-neutral-800 rounded-lg p-5 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
            <h2 className="text-xs font-semibold text-neutral-900 dark:text-white uppercase tracking-wider">
              Question Palette
            </h2>
            <span className="text-xs font-mono text-neutral-500 dark:text-neutral-400">
              {currentSubject}
            </span>
          </div>

          {/* Palette Status Legend */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 text-[9px] flex items-center justify-center font-bold">✓</span>
              <span className="text-neutral-600 dark:text-neutral-400">Answered ({stats.answered})</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#141416]"></span>
              <span className="text-neutral-600 dark:text-neutral-400">Unanswered ({stats.notAnswered})</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-amber-400"></span>
              <span className="text-neutral-600 dark:text-neutral-400">Marked ({stats.marked})</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-amber-600 text-white text-[9px] flex items-center justify-center font-bold">✓</span>
              <span className="text-neutral-600 dark:text-neutral-400">Ans & Marked ({stats.answeredAndMarked})</span>
            </div>
          </div>

          {/* Grid of question buttons */}
          <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800">
            <div className="grid grid-cols-5 gap-1.5 max-h-[360px] overflow-y-auto p-1">
              {(subjectGroups.get(currentSubject) || []).map((q) => {
                const isCurrent = q.order === currentAllocation.order;
                const resp = test.responses[q.questionId];
                const hasAnswer = Boolean(resp?.answer);
                const isMarked = Boolean(resp?.markedForReview);

                let badgeClass = 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#141416] text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800';
                if (hasAnswer && isMarked) {
                  badgeClass = 'bg-amber-600 text-white border-amber-700 font-semibold';
                } else if (hasAnswer) {
                  badgeClass = 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 border-neutral-900 dark:border-white font-semibold';
                } else if (isMarked) {
                  badgeClass = 'bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-700 font-semibold';
                }

                return (
                  <button
                    key={q.questionId}
                    type="button"
                    onClick={() => onNavigateQuestion(q.order)}
                    className={`h-9 rounded border text-xs font-mono font-medium transition-all cursor-pointer flex items-center justify-center relative ${badgeClass} ${
                      isCurrent ? 'ring-2 ring-neutral-950 dark:ring-white ring-offset-1 dark:ring-offset-[#18181B] font-bold' : ''
                    }`}
                  >
                    <span>{q.order}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>
      </div>

      {/* Confirmation Submit Modal */}
      {showSubmitModal && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            // Revert immediately back to test if clicking backdrop
            if (e.target === e.currentTarget && !isSubmitting && !isLocalSubmitting) {
              setShowSubmitModal(false);
            }
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
        >
          <div className="bg-white dark:bg-[#18181B] border border-neutral-200 dark:border-neutral-800 rounded-lg max-w-md w-full p-6 shadow-xl space-y-4 text-neutral-900 dark:text-white transition-all">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-neutral-950 dark:text-white">
                {isSubmitting || isLocalSubmitting ? 'Submitting & Evaluating Test' : 'Confirm Test Submission'}
              </h3>
              {!isSubmitting && !isLocalSubmitting && (
                <button
                  type="button"
                  onClick={() => setShowSubmitModal(false)}
                  title="Resume Test (Esc)"
                  aria-label="Resume test"
                  className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer p-1 rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {isSubmitting || isLocalSubmitting ? (
              <div className="py-8 flex flex-col items-center justify-center space-y-3 text-center">
                <Loader2 className="w-8 h-8 animate-spin text-neutral-900 dark:text-white" />
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-neutral-950 dark:text-white">
                    Evaluating JEE Test Responses
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-xs leading-relaxed">
                    Scoring answers against official key, recording efficiency metrics, and preparing your report...
                  </p>
                </div>
              </div>
            ) : (
              <>
                <p className="text-xs text-neutral-600 dark:text-neutral-400">
                  Are you sure you want to finish your test? Review your attempt summary below:
                </p>

                <div className="bg-neutral-50 dark:bg-[#121214] border border-neutral-200 dark:border-neutral-800 rounded p-4 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-neutral-500 dark:text-neutral-400">Total Questions:</span>
                    <span className="font-mono font-semibold text-neutral-900 dark:text-white ml-1.5">{stats.total}</span>
                  </div>
                  <div>
                    <span className="text-neutral-500 dark:text-neutral-400">Attempted:</span>
                    <span className="font-mono font-semibold text-neutral-900 dark:text-white ml-1.5">
                      {stats.answered + stats.answeredAndMarked}
                    </span>
                  </div>
                  <div>
                    <span className="text-neutral-500 dark:text-neutral-400">Unattempted:</span>
                    <span className="font-mono font-semibold text-neutral-900 dark:text-white ml-1.5">
                      {stats.notAnswered + stats.marked}
                    </span>
                  </div>
                  <div>
                    <span className="text-neutral-500 dark:text-neutral-400">Marked for Review:</span>
                    <span className="font-mono font-semibold text-neutral-900 dark:text-white ml-1.5">
                      {stats.marked + stats.answeredAndMarked}
                    </span>
                  </div>
                  {test.targetScore !== undefined && test.targetScore > 0 && (
                    <div>
                      <span className="text-neutral-500 dark:text-neutral-400">Target Goal:</span>
                      <span className="font-mono font-semibold text-neutral-900 dark:text-white ml-1.5">{test.targetScore} pts</span>
                    </div>
                  )}
                  <div>
                    <span className="text-neutral-500 dark:text-neutral-400">Tab Switches:</span>
                    <span className={`font-mono font-semibold ml-1.5 ${tabSwitchCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-neutral-900 dark:text-white'}`}>
                      {tabSwitchCount} {tabSwitchCount > 0 ? '(logged)' : '(clean)'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowSubmitModal(false)}
                    className="px-4 py-2 text-xs font-medium border border-neutral-300 dark:border-neutral-700 rounded hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 cursor-pointer transition-colors"
                  >
                    Resume Test
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsLocalSubmitting(true);
                      onSubmitTest(false);
                    }}
                    className="px-4 py-2 text-xs font-medium bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 rounded hover:bg-neutral-800 dark:hover:bg-neutral-200 cursor-pointer transition-colors flex items-center gap-1.5"
                  >
                    <span>Submit Now</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
