import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Brain,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  Filter,
  Flame,
  HelpCircle,
  Layers,
  Play,
  RefreshCw,
  RotateCcw,
  Search,
  Sparkles,
  Zap,
} from 'lucide-react';
import {
  ActiveRecallService,
  DeckStats,
  Flashcard,
  ReviewRating,
} from '../services/ActiveRecallService';
import {
  NormalizedQuestion,
  QuestionHistoryRecord,
  SubjectName,
} from '../types/jee';
import { MathText } from './MathText';

interface ActiveRecallViewProps {
  historyMap: Record<string, QuestionHistoryRecord>;
  questionsById: Map<string, NormalizedQuestion>;
  onStartFullTest: () => void;
  onOpenChapterSelector: (subject?: SubjectName) => void;
  onOpenDashboard: () => void;
}

const ALL_SUBJECTS: SubjectName[] = ['Physics', 'Chemistry', 'Mathematics'];

const SUBJECT_THEMES: Record<
  SubjectName,
  { line: string; bg: string; text: string; border: string }
> = {
  Physics: {
    line: '#2563EB',
    bg: 'bg-blue-50 dark:bg-blue-950/40',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-200 dark:border-blue-800',
  },
  Chemistry: {
    line: '#059669',
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-200 dark:border-emerald-800',
  },
  Mathematics: {
    line: '#7C3AED',
    bg: 'bg-purple-50 dark:bg-purple-950/40',
    text: 'text-purple-700 dark:text-purple-300',
    border: 'border-purple-200 dark:border-purple-800',
  },
};

export const ActiveRecallView: React.FC<ActiveRecallViewProps> = ({
  historyMap,
  questionsById,
  onStartFullTest,
  onOpenChapterSelector,
  onOpenDashboard,
}) => {
  // Master Deck state
  const [deck, setDeck] = useState<Flashcard[]>(() => ActiveRecallService.getDeck());
  const [viewMode, setViewMode] = useState<'study' | 'browser'>('study');
  const [activeSubject, setActiveSubject] = useState<'ALL' | SubjectName>('ALL');
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  // Active Review Session State
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [studySessionCompleted, setStudySessionCompleted] = useState(false);
  const [sessionReviewsCount, setSessionReviewsCount] = useState(0);
  const [sessionRatings, setSessionRatings] = useState<Record<ReviewRating, number>>({
    1: 0,
    2: 0,
    3: 0,
    4: 0,
  });

  // Browser Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [boxFilter, setBoxFilter] = useState<'ALL' | 'due' | '1' | '2' | '3' | '4' | '5'>('ALL');
  const [originFilter, setOriginFilter] = useState<'ALL' | 'mistake_history' | 'curated_high_yield'>('ALL');

  // Compute deck statistics
  const stats: DeckStats = useMemo(() => {
    return ActiveRecallService.getDeckStats(deck);
  }, [deck]);

  // Filter due cards for review session
  const dueCards = useMemo(() => {
    return ActiveRecallService.getDueCards(deck, activeSubject === 'ALL' ? undefined : activeSubject);
  }, [deck, activeSubject]);

  // Current card being studied
  const currentCard: Flashcard | undefined = dueCards[currentCardIndex];

  // Auto-sync mistakes on mount
  useEffect(() => {
    const { updatedDeck, newlyExtracted } = ActiveRecallService.extractCardsFromMistakes(
      historyMap,
      questionsById,
      deck
    );
    if (newlyExtracted > 0) {
      setDeck(updatedDeck);
      setSyncNotice(`Extracted ${newlyExtracted} new formula flashcard${newlyExtracted > 1 ? 's' : ''} from recent test mistakes.`);
      const t = setTimeout(() => setSyncNotice(null), 6000);
      return () => clearTimeout(t);
    }
  }, [historyMap, questionsById]);

  // Handle manual sync button
  const handleManualSync = () => {
    const { updatedDeck, newlyExtracted } = ActiveRecallService.extractCardsFromMistakes(
      historyMap,
      questionsById,
      deck
    );
    setDeck(updatedDeck);
    if (newlyExtracted > 0) {
      setSyncNotice(`Extracted ${newlyExtracted} new flashcard${newlyExtracted > 1 ? 's' : ''} from test mistakes.`);
    } else {
      setSyncNotice('All mistake questions are already extracted into your active recall deck.');
    }
    const t = setTimeout(() => setSyncNotice(null), 5000);
  };

  // Keyboard navigation for active recall review
  useEffect(() => {
    if (viewMode !== 'study' || studySessionCompleted || !currentCard) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept when user is typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.code === 'Space') {
        e.preventDefault();
        setIsFlipped((prev) => !prev);
      } else if (isFlipped) {
        if (e.key === '1') handleRateCard(1);
        else if (e.key === '2') handleRateCard(2);
        else if (e.key === '3') handleRateCard(3);
        else if (e.key === '4') handleRateCard(4);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewMode, isFlipped, studySessionCompleted, currentCard]);

  // Rate current card and advance
  const handleRateCard = (rating: ReviewRating) => {
    if (!currentCard) return;

    // Process SM-2 algorithm update
    const { updatedDeck } = ActiveRecallService.processCardReview(currentCard.id, rating, deck);
    setDeck(updatedDeck);

    // Track session metrics
    setSessionReviewsCount((prev) => prev + 1);
    setSessionRatings((prev) => ({ ...prev, [rating]: prev[rating] + 1 }));

    setIsFlipped(false);

    // If rating is 'Again' (1), re-queue it at the end of the current due list
    if (currentCardIndex + 1 >= dueCards.length) {
      setStudySessionCompleted(true);
    } else {
      setCurrentCardIndex((prev) => prev + 1);
    }
  };

  // Reset session to review all cards or restart
  const handleRestartSession = () => {
    setCurrentCardIndex(0);
    setIsFlipped(false);
    setStudySessionCompleted(false);
  };

  // Filtered cards for browser view
  const browserCards = useMemo(() => {
    const now = new Date().getTime();
    return deck.filter((card) => {
      if (activeSubject !== 'ALL' && card.subject !== activeSubject) return false;
      if (originFilter !== 'ALL' && card.sourceOrigin !== originFilter) return false;

      if (boxFilter === 'due') {
        if (new Date(card.nextReviewDate).getTime() > now) return false;
      } else if (boxFilter !== 'ALL') {
        if (card.box !== Number(boxFilter)) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          card.chapter.toLowerCase().includes(q) ||
          card.title.toLowerCase().includes(q) ||
          card.frontPrompt.toLowerCase().includes(q) ||
          card.formulaOrConcept.toLowerCase().includes(q) ||
          (card.topic && card.topic.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [deck, activeSubject, originFilter, boxFilter, searchQuery]);

  return (
    <div className="min-h-screen bg-white dark:bg-[#0F0F11] text-neutral-900 dark:text-neutral-100 py-8 px-4 sm:px-6 transition-colors overflow-x-hidden w-full max-w-full">
      <div className="max-w-6xl mx-auto space-y-8 min-w-0 w-full">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-neutral-200 dark:border-neutral-800 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-neutral-900 dark:text-neutral-100" />
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-950 dark:text-white">
                Active Recall
              </h1>
            </div>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 max-w-2xl">
              Spaced-repetition formula memorization and conceptual recall extracted from your mistake history and high-yield JEE blueprints.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleManualSync}
              className="px-3 py-1.5 text-xs font-medium text-neutral-700 dark:text-neutral-300 bg-white dark:bg-[#18181B] border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Rescan test history and extract formulas from any newly missed questions"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Sync Mistakes</span>
            </button>

            {/* Mode Toggle: Study vs Browse */}
            <div className="inline-flex rounded border border-neutral-300 dark:border-neutral-700 p-0.5 bg-neutral-100 dark:bg-neutral-900 text-xs font-medium">
              <button
                type="button"
                onClick={() => {
                  setViewMode('study');
                  setStudySessionCompleted(false);
                }}
                className={`px-3 py-1 rounded transition-colors cursor-pointer ${
                  viewMode === 'study'
                    ? 'bg-white dark:bg-[#18181B] text-neutral-950 dark:text-white font-semibold shadow-xs'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white'
                }`}
              >
                Study Queue
              </button>
              <button
                type="button"
                onClick={() => setViewMode('browser')}
                className={`px-3 py-1 rounded transition-colors cursor-pointer ${
                  viewMode === 'browser'
                    ? 'bg-white dark:bg-[#18181B] text-neutral-950 dark:text-white font-semibold shadow-xs'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white'
                }`}
              >
                Deck Browser ({deck.length})
              </button>
            </div>
          </div>
        </div>

        {/* Sync Notification Banner */}
        {syncNotice && (
          <div className="bg-neutral-100 dark:bg-[#18181B] border border-neutral-300 dark:border-neutral-700 rounded-lg p-3 text-xs text-neutral-800 dark:text-neutral-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-neutral-900 dark:text-white" />
              <span>{syncNotice}</span>
            </div>
            <button
              type="button"
              onClick={() => setSyncNotice(null)}
              className="text-neutral-400 hover:text-neutral-700 dark:hover:text-white"
            >
              ✕
            </button>
          </div>
        )}

        {/* Global Spaced-Repetition Deck Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="p-3.5 rounded-lg bg-neutral-50 dark:bg-[#18181B] border border-neutral-200 dark:border-neutral-800">
            <div className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">Due for Review</div>
            <div className="text-2xl font-bold font-mono text-neutral-950 dark:text-white mt-1">
              {stats.dueToday}
            </div>
            <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 font-mono">
              Ready to drill today
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-neutral-50 dark:bg-[#18181B] border border-neutral-200 dark:border-neutral-800">
            <div className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">Learning Stage</div>
            <div className="text-2xl font-bold font-mono text-neutral-950 dark:text-white mt-1">
              {stats.learning}
            </div>
            <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 font-mono">
              Leitner Box 1 & 2
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-neutral-50 dark:bg-[#18181B] border border-neutral-200 dark:border-neutral-800">
            <div className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">Reviewing</div>
            <div className="text-2xl font-bold font-mono text-neutral-950 dark:text-white mt-1">
              {stats.reviewing}
            </div>
            <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 font-mono">
              Leitner Box 3 & 4
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-neutral-50 dark:bg-[#18181B] border border-neutral-200 dark:border-neutral-800">
            <div className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">Mastered Formulas</div>
            <div className="text-2xl font-bold font-mono text-neutral-950 dark:text-white mt-1">
              {stats.mastered}
            </div>
            <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 font-mono">
              Box 5 (Permanent recall)
            </div>
          </div>

          <div className="col-span-2 sm:col-span-1 p-3.5 rounded-lg bg-neutral-50 dark:bg-[#18181B] border border-neutral-200 dark:border-neutral-800">
            <div className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">From Mistake Pool</div>
            <div className="text-2xl font-bold font-mono text-neutral-950 dark:text-white mt-1">
              {stats.mistakeDerivedCount}
            </div>
            <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 font-mono">
              Extracted from exam errors
            </div>
          </div>
        </div>

        {/* Subject Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-2 bg-neutral-50 dark:bg-[#18181B] border border-neutral-200 dark:border-neutral-800 rounded-lg text-xs">
          <div className="flex flex-wrap items-center gap-1">
            {(['ALL', 'Physics', 'Chemistry', 'Mathematics'] as const).map((sub) => {
              const isSelected = activeSubject === sub;
              const subDueCount =
                sub === 'ALL' ? stats.dueToday : stats.bySubject[sub]?.due || 0;
              const subTotalCount =
                sub === 'ALL' ? stats.totalCards : stats.bySubject[sub]?.total || 0;

              return (
                <button
                  key={sub}
                  type="button"
                  onClick={() => {
                    setActiveSubject(sub);
                    setCurrentCardIndex(0);
                    setIsFlipped(false);
                    setStudySessionCompleted(false);
                  }}
                  className={`px-3 py-1.5 rounded font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 font-semibold shadow-xs'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white bg-white dark:bg-[#121214] border border-neutral-200 dark:border-neutral-700'
                  }`}
                >
                  {sub !== 'ALL' && (
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: SUBJECT_THEMES[sub].line }}
                    />
                  )}
                  <span>{sub === 'ALL' ? 'All Subjects' : sub}</span>
                  <span className="font-mono text-[11px] opacity-75">
                    ({subDueCount} due / {subTotalCount})
                  </span>
                </button>
              );
            })}
          </div>

          <div className="text-[11px] text-neutral-500 dark:text-neutral-400 font-mono hidden sm:block">
            SM-2 Algorithm · Intervals: 10m · 1d · 3d · 6d · 14d+
          </div>
        </div>

        {/* =========================================================================
            MODE 1: ACTIVE RECALL STUDY SESSION
           ========================================================================= */}
        {viewMode === 'study' && (
          <div className="space-y-6">
            {!studySessionCompleted && currentCard ? (
              <div className="space-y-4">
                {/* Session Progress Header */}
                <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400 font-mono">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-neutral-900 dark:text-white">
                      Card {currentCardIndex + 1} of {dueCards.length}
                    </span>
                    <span>·</span>
                    <span>Box {currentCard.box} of 5</span>
                    <span>·</span>
                    <span className="text-emerald-700 dark:text-emerald-400">
                      Streak: {currentCard.streak}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span>
                      {dueCards.length - (currentCardIndex + 1)} remaining in queue
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-1.5 bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-neutral-900 dark:bg-white transition-all duration-300"
                    style={{
                      width: `${Math.round(((currentCardIndex + 1) / dueCards.length) * 100)}%`,
                    }}
                  />
                </div>

                {/* INTERACTIVE FLASHCARD CONTAINER */}
                <div
                  className={`relative rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#141416] p-6 sm:p-8 shadow-sm min-h-[380px] flex flex-col justify-between transition-all ${
                    isFlipped
                      ? 'border-neutral-400 dark:border-neutral-600 ring-1 ring-neutral-400/30'
                      : ''
                  }`}
                >
                  {/* Card Meta Top Header */}
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-100 dark:border-neutral-800/80 pb-3">
                      <div className="flex items-center gap-2 text-xs">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: SUBJECT_THEMES[currentCard.subject].line }}
                        />
                        <span className="font-semibold text-neutral-900 dark:text-white">
                          {currentCard.subject}
                        </span>
                        <span className="text-neutral-400">·</span>
                        <span className="text-neutral-600 dark:text-neutral-400 font-medium">
                          {currentCard.chapter}
                        </span>
                        {currentCard.topic && (
                          <>
                            <span className="text-neutral-400">·</span>
                            <span className="text-neutral-500 dark:text-neutral-400">
                              {currentCard.topic}
                            </span>
                          </>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {currentCard.sourceOrigin === 'mistake_history' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-mono text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/40 px-2 py-0.5 rounded border border-red-200 dark:border-red-900">
                            <AlertTriangle className="w-3 h-3" />
                            <span>From Exam Mistake</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-mono text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-900">
                            <Sparkles className="w-3 h-3" />
                            <span>Core JEE Blueprint</span>
                          </span>
                        )}

                        <span className="text-[11px] font-mono text-neutral-400 dark:text-neutral-500">
                          Ease {currentCard.easeFactor}
                        </span>
                      </div>
                    </div>

                    {/* Card Title */}
                    <div className="mt-4">
                      <h2 className="text-lg sm:text-xl font-bold text-neutral-950 dark:text-white">
                        {currentCard.title}
                      </h2>
                    </div>

                    {/* CARD FRONT (ACTIVE RECALL PROMPT) */}
                    <div className="mt-4 text-sm leading-relaxed text-neutral-800 dark:text-neutral-200 space-y-3">
                      <div className="p-4 rounded-lg bg-neutral-50 dark:bg-[#18181B] border border-neutral-200 dark:border-neutral-800">
                        <MathText text={currentCard.frontPrompt} />
                      </div>

                      {/* Mistake Context Anchor if applicable */}
                      {currentCard.studentMistakeContext && (
                        <div className="text-xs text-neutral-500 dark:text-neutral-400 font-mono bg-neutral-50/60 dark:bg-neutral-900/60 p-2.5 rounded border border-dashed border-neutral-200 dark:border-neutral-800">
                          {currentCard.studentMistakeContext}
                        </div>
                      )}
                    </div>

                    {/* CARD BACK (REVEALED FORMULA & PRINCIPLE) */}
                    {isFlipped && (
                      <div className="mt-6 pt-5 border-t border-neutral-200 dark:border-neutral-800 space-y-4 animate-fadeIn">
                        <div>
                          <div className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 font-mono mb-2">
                            Governing Formula & Mathematical Identity
                          </div>
                          <div className="p-4 rounded-lg bg-neutral-100/90 dark:bg-[#0c0c0e] border border-neutral-300 dark:border-neutral-700 overflow-x-auto text-neutral-950 dark:text-white font-mono">
                            <MathText text={currentCard.formulaOrConcept} block />
                          </div>
                        </div>

                        {/* Derivation / Explanation */}
                        <div className="space-y-1">
                          <div className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 font-mono">
                            Key Principle & Conditions of Validity
                          </div>
                          <div className="text-xs sm:text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed bg-neutral-50 dark:bg-[#18181B] p-3 rounded border border-neutral-200 dark:border-neutral-800">
                            <MathText text={currentCard.explanation} />
                          </div>
                        </div>

                        {/* Common Trap / Pitfall */}
                        {currentCard.commonPitfall && (
                          <div className="space-y-1">
                            <div className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 font-mono flex items-center gap-1.5">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              <span>Critical Trap to Avoid</span>
                            </div>
                            <div className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed bg-amber-50/40 dark:bg-amber-950/20 p-2.5 rounded border border-amber-200 dark:border-amber-900/50">
                              <MathText text={currentCard.commonPitfall} />
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* BOTTOM CONTROLS */}
                  <div className="mt-8 pt-4 border-t border-neutral-100 dark:border-neutral-800/80">
                    {!isFlipped ? (
                      /* FLIP TRIGGER */
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                        <span className="text-xs text-neutral-500 dark:text-neutral-400 font-mono hidden sm:inline">
                          Press <kbd className="px-1.5 py-0.5 bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded text-[11px]">Space</kbd> to reveal answer
                        </span>

                        <button
                          type="button"
                          onClick={() => setIsFlipped(true)}
                          className="w-full sm:w-auto px-6 py-2.5 text-xs font-semibold text-white dark:text-neutral-950 bg-neutral-900 dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-200 rounded transition-colors cursor-pointer flex items-center justify-center gap-2"
                        >
                          <Zap className="w-3.5 h-3.5" />
                          <span>Show Formula & Answer</span>
                        </button>
                      </div>
                    ) : (
                      /* 4 SPACED-REPETITION RATING BUTTONS */
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400 font-mono">
                          <span>Rate your recall quality:</span>
                          <span className="hidden sm:inline">Keys 1, 2, 3, 4</span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          <button
                            type="button"
                            onClick={() => handleRateCard(1)}
                            className="p-3 rounded-lg border border-red-300 dark:border-red-900 bg-red-50/60 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-950/60 text-left transition-colors cursor-pointer group"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-red-800 dark:text-red-300">
                                [1] Again
                              </span>
                              <span className="text-[10px] font-mono text-red-600 dark:text-red-400">
                                &lt;10 min
                              </span>
                            </div>
                            <div className="text-[11px] text-red-700 dark:text-red-400 mt-1">
                              Forgot formula · Re-drill
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleRateCard(2)}
                            className="p-3 rounded-lg border border-amber-300 dark:border-amber-900 bg-amber-50/60 dark:bg-amber-950/30 hover:bg-amber-100 dark:hover:bg-amber-950/60 text-left transition-colors cursor-pointer group"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-amber-800 dark:text-amber-300">
                                [2] Hard
                              </span>
                              <span className="text-[10px] font-mono text-amber-600 dark:text-amber-400">
                                1 day
                              </span>
                            </div>
                            <div className="text-[11px] text-amber-700 dark:text-amber-400 mt-1">
                              Hesitated / partial recall
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleRateCard(3)}
                            className="p-3 rounded-lg border border-blue-300 dark:border-blue-900 bg-blue-50/60 dark:bg-blue-950/30 hover:bg-blue-100 dark:hover:bg-blue-950/60 text-left transition-colors cursor-pointer group"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-blue-800 dark:text-blue-300">
                                [3] Good
                              </span>
                              <span className="text-[10px] font-mono text-blue-600 dark:text-blue-400">
                                3 days
                              </span>
                            </div>
                            <div className="text-[11px] text-blue-700 dark:text-blue-400 mt-1">
                              Accurate recall with effort
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleRateCard(4)}
                            className="p-3 rounded-lg border border-emerald-300 dark:border-emerald-900 bg-emerald-50/60 dark:bg-emerald-950/30 hover:bg-emerald-100 dark:hover:bg-emerald-950/60 text-left transition-colors cursor-pointer group"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                                [4] Easy
                              </span>
                              <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400">
                                6+ days
                              </span>
                            </div>
                            <div className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-1">
                              Instant effortless recall
                            </div>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* ALL DUE CARDS COMPLETED / ZERO CARDS DUE */
              <div className="p-8 sm:p-12 text-center rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-[#18181B] space-y-5">
                <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-6 h-6" />
                </div>

                <div className="space-y-1.5 max-w-md mx-auto">
                  <h3 className="text-lg font-bold text-neutral-950 dark:text-white">
                    {sessionReviewsCount > 0
                      ? 'Daily Active Recall Complete!'
                      : 'No Cards Due for Review Right Now'}
                  </h3>
                  <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                    {sessionReviewsCount > 0
                      ? `You reviewed ${sessionReviewsCount} flashcards in this session. The SM-2 spaced-repetition algorithm has rescheduled these cards to optimize your long-term memory retention.`
                      : 'All cards in this subject are scheduled for future intervals. You can browse all flashcards in the Deck Browser or start a test to feed new mistakes into your queue.'}
                  </p>
                </div>

                {sessionReviewsCount > 0 && (
                  <div className="grid grid-cols-4 gap-2 max-w-sm mx-auto text-xs font-mono pt-2">
                    <div className="p-2 rounded bg-white dark:bg-[#121214] border border-neutral-200 dark:border-neutral-800">
                      <div className="text-red-600 font-bold">{sessionRatings[1]}</div>
                      <div className="text-[10px] text-neutral-500">Again</div>
                    </div>
                    <div className="p-2 rounded bg-white dark:bg-[#121214] border border-neutral-200 dark:border-neutral-800">
                      <div className="text-amber-600 font-bold">{sessionRatings[2]}</div>
                      <div className="text-[10px] text-neutral-500">Hard</div>
                    </div>
                    <div className="p-2 rounded bg-white dark:bg-[#121214] border border-neutral-200 dark:border-neutral-800">
                      <div className="text-blue-600 font-bold">{sessionRatings[3]}</div>
                      <div className="text-[10px] text-neutral-500">Good</div>
                    </div>
                    <div className="p-2 rounded bg-white dark:bg-[#121214] border border-neutral-200 dark:border-neutral-800">
                      <div className="text-emerald-600 font-bold">{sessionRatings[4]}</div>
                      <div className="text-[10px] text-neutral-500">Easy</div>
                    </div>
                  </div>
                )}

                <div className="pt-3 flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => setViewMode('browser')}
                    className="px-4 py-2 text-xs font-medium text-neutral-800 dark:text-neutral-200 bg-white dark:bg-[#121214] border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded transition-colors cursor-pointer"
                  >
                    Browse Entire Deck ({deck.length} cards)
                  </button>

                  <button
                    type="button"
                    onClick={onStartFullTest}
                    className="px-4 py-2 text-xs font-semibold text-white dark:text-neutral-950 bg-neutral-900 dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-200 rounded transition-colors cursor-pointer"
                  >
                    Start Full Test
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            MODE 2: DECK BROWSER & MANAGEMENT
           ========================================================================= */}
        {viewMode === 'browser' && (
          <div className="space-y-4">
            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-neutral-50 dark:bg-[#18181B] border border-neutral-200 dark:border-neutral-800 rounded-lg">
              <div className="relative w-full sm:w-72">
                <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search formulas, chapters, topics..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-[#121214] border border-neutral-300 dark:border-neutral-700 rounded text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:border-neutral-900 dark:focus:border-white"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                {/* Leitner Box Filter */}
                <select
                  value={boxFilter}
                  onChange={(e) => setBoxFilter(e.target.value as any)}
                  className="px-2.5 py-1.5 bg-white dark:bg-[#121214] border border-neutral-300 dark:border-neutral-700 rounded text-neutral-800 dark:text-neutral-200 cursor-pointer text-xs"
                >
                  <option value="ALL">All Leitner Boxes</option>
                  <option value="due">⏰ Due Today Only</option>
                  <option value="1">Box 1 (Daily review)</option>
                  <option value="2">Box 2 (3-day interval)</option>
                  <option value="3">Box 3 (6-day interval)</option>
                  <option value="4">Box 4 (14-day interval)</option>
                  <option value="5">Box 5 (Mastered 30d+)</option>
                </select>

                {/* Source Filter */}
                <select
                  value={originFilter}
                  onChange={(e) => setOriginFilter(e.target.value as any)}
                  className="px-2.5 py-1.5 bg-white dark:bg-[#121214] border border-neutral-300 dark:border-neutral-700 rounded text-neutral-800 dark:text-neutral-200 cursor-pointer text-xs"
                >
                  <option value="ALL">All Card Sources</option>
                  <option value="mistake_history">From Mistake Pool</option>
                  <option value="curated_high_yield">Core High-Yield Blueprints</option>
                </select>
              </div>
            </div>

            {/* Flashcard List */}
            {browserCards.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {browserCards.map((card) => {
                  const isDue = new Date(card.nextReviewDate).getTime() <= new Date().getTime();
                  const dueDate = new Date(card.nextReviewDate).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                  });

                  return (
                    <div
                      key={card.id}
                      className="p-4 rounded-lg bg-neutral-50 dark:bg-[#18181B] border border-neutral-200 dark:border-neutral-800 flex flex-col justify-between space-y-3"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5 text-xs font-semibold text-neutral-900 dark:text-white">
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: SUBJECT_THEMES[card.subject].line }}
                            />
                            {card.subject} · {card.chapter}
                          </span>

                          <div className="flex items-center gap-1.5 text-[11px] font-mono">
                            {isDue ? (
                              <span className="text-amber-700 dark:text-amber-400 font-bold">
                                Due Today
                              </span>
                            ) : (
                              <span className="text-neutral-500 dark:text-neutral-400">
                                Due {dueDate}
                              </span>
                            )}
                            <span className="text-neutral-300 dark:text-neutral-700">·</span>
                            <span className="text-neutral-600 dark:text-neutral-400">
                              Box {card.box}/5
                            </span>
                          </div>
                        </div>

                        <h4 className="text-sm font-bold text-neutral-950 dark:text-white">
                          {card.title}
                        </h4>

                        {/* Formula Preview Block */}
                        <div className="p-2.5 rounded bg-white dark:bg-[#121214] border border-neutral-200 dark:border-neutral-800 text-xs overflow-x-auto font-mono">
                          <MathText text={card.formulaOrConcept} inline />
                        </div>
                      </div>

                      <div className="pt-2 border-t border-neutral-200/60 dark:border-neutral-800 flex items-center justify-between text-[11px] font-mono text-neutral-500 dark:text-neutral-400">
                        <span>
                          {card.sourceOrigin === 'mistake_history'
                            ? 'Extracted from mistake'
                            : 'Curated JEE blueprint'}
                        </span>

                        <span>Streak: {card.streak} · Lapses: {card.lapseCount}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-12 text-center rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-[#18181B] text-neutral-500 dark:text-neutral-400 text-xs space-y-2">
                <Search className="w-5 h-5 mx-auto text-neutral-400" />
                <p>No flashcards matched your query.</p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setBoxFilter('ALL');
                    setOriginFilter('ALL');
                    setActiveSubject('ALL');
                  }}
                  className="text-neutral-900 dark:text-white underline cursor-pointer"
                >
                  Clear search filters
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
