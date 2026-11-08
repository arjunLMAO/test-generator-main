import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  CornerDownRight,
  ExternalLink,
  Filter,
  Layers,
  Pencil,
  Play,
  RotateCcw,
  Search,
  Sparkles,
  Tag,
  Trash2,
  X,
} from 'lucide-react';
import {
  ERROR_CATEGORIES,
  ErrorCategory,
  MistakeItem,
  MistakeNotebookService,
  NotebookEntry,
} from '../services/MistakeNotebookService';
import {
  NormalizedQuestion,
  QuestionHistoryRecord,
  SubjectName,
  TestResultReport,
} from '../types/jee';
import { MathText } from './MathText';
import { QuestionVisuals } from './VisualDiagramRenderer';

interface MistakeNotebookViewProps {
  historyMap: Record<string, QuestionHistoryRecord>;
  questionsById: Map<string, NormalizedQuestion>;
  reports: TestResultReport[];
  onRetestMistakes: (subject?: SubjectName, chapter?: string, questionIds?: string[]) => void;
  onOpenChapterSelector: (subject?: SubjectName, chapter?: string) => void;
  onStartFullTest: () => void;
  theme?: 'light' | 'dark';
}

const ALL_SUBJECTS: SubjectName[] = ['Physics', 'Chemistry', 'Mathematics'];

export const MistakeNotebookView: React.FC<MistakeNotebookViewProps> = ({
  historyMap,
  questionsById,
  reports,
  onRetestMistakes,
  onOpenChapterSelector,
  onStartFullTest,
  theme = 'light',
}) => {
  // 1. Extract mistakes
  const [entries, setEntries] = useState<Record<string, NotebookEntry>>(() =>
    MistakeNotebookService.loadEntries()
  );

  const allMistakes: MistakeItem[] = useMemo(() => {
    return MistakeNotebookService.extractMistakes(historyMap, questionsById, reports);
  }, [historyMap, questionsById, reports]);

  // Filters & State
  const [selectedSubject, setSelectedSubject] = useState<SubjectName | 'all'>('all');
  const [selectedErrorCategory, setSelectedErrorCategory] = useState<ErrorCategory | 'all'>('all');
  const [resolutionFilter, setResolutionFilter] = useState<'all' | 'unresolved' | 'resolved'>('unresolved');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'page' | 'list'>('page');
  const [activePageIndex, setActivePageIndex] = useState(0);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  // Filtered mistakes
  const filteredMistakes = useMemo(() => {
    return allMistakes.filter((item) => {
      // Subject filter
      if (selectedSubject !== 'all' && item.subject !== selectedSubject) return false;

      // Error category filter
      const category = entries[item.questionId]?.errorCategory || item.entry.errorCategory;
      if (selectedErrorCategory !== 'all' && category !== selectedErrorCategory) return false;

      // Resolution status filter
      const isResolved = entries[item.questionId]?.resolved ?? item.entry.resolved;
      if (resolutionFilter === 'unresolved' && isResolved) return false;
      if (resolutionFilter === 'resolved' && !isResolved) return false;

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const inText = item.questionText.toLowerCase().includes(query);
        const inChapter = item.chapter.toLowerCase().includes(query);
        const inNote = (entries[item.questionId]?.personalNote || '').toLowerCase().includes(query);
        if (!inText && !inChapter && !inNote) return false;
      }

      return true;
    });
  }, [allMistakes, selectedSubject, selectedErrorCategory, resolutionFilter, searchQuery, entries]);

  // Keep active index in bounds
  const currentMistake: MistakeItem | null = useMemo(() => {
    if (filteredMistakes.length === 0) return null;
    const safeIdx = Math.max(0, Math.min(activePageIndex, filteredMistakes.length - 1));
    return filteredMistakes[safeIdx] || null;
  }, [filteredMistakes, activePageIndex]);

  // Overview Stats
  const stats = useMemo(() => {
    let resolvedCount = 0;
    let unresolvedCount = 0;
    const categoryCounts: Record<ErrorCategory, number> = {
      calculation: 0,
      formula_forgot: 0,
      concept_gap: 0,
      time_crunch: 0,
      misread: 0,
      unclassified: 0,
    };

    for (const m of allMistakes) {
      const entry = entries[m.questionId] || m.entry;
      if (entry.resolved) {
        resolvedCount++;
      } else {
        unresolvedCount++;
      }
      const cat = entry.errorCategory || 'unclassified';
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    }

    // Top error category
    let topCat: ErrorCategory = 'calculation';
    let topVal = -1;
    for (const [c, count] of Object.entries(categoryCounts)) {
      if (c !== 'unclassified' && count > topVal) {
        topVal = count;
        topCat = c as ErrorCategory;
      }
    }

    return {
      total: allMistakes.length,
      resolved: resolvedCount,
      unresolved: unresolvedCount,
      categoryCounts,
      topCategory: topVal > 0 ? topCat : null,
    };
  }, [allMistakes, entries]);

  // Handle note change
  const handleUpdateNote = (questionId: string, noteText: string) => {
    const updated = MistakeNotebookService.updateEntry(questionId, { personalNote: noteText });
    setEntries({ ...updated });
    setSaveStatus('Saved');
    setTimeout(() => setSaveStatus(null), 1500);
  };

  // Handle category change
  const handleUpdateCategory = (questionId: string, category: ErrorCategory) => {
    const updated = MistakeNotebookService.updateEntry(questionId, { errorCategory: category });
    setEntries({ ...updated });
  };

  // Handle resolution toggle
  const handleToggleResolved = (questionId: string) => {
    const currentResolved = entries[questionId]?.resolved ?? false;
    const updated = MistakeNotebookService.updateEntry(questionId, { resolved: !currentResolved });
    setEntries({ ...updated });
  };

  // Quick insertion helpers for personal notes
  const handleInsertQuickNote = (questionId: string, snippet: string) => {
    const currentNote = entries[questionId]?.personalNote || '';
    const updatedNote = currentNote ? `${currentNote}\n• ${snippet}` : `• ${snippet}`;
    handleUpdateNote(questionId, updatedNote);
  };

  const isDarkMode = theme === 'dark';

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Notebook Header Cover Stamp */}
      <div className="relative border-b border-neutral-200 dark:border-neutral-800 pb-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-neutral-900 dark:text-white" />
              <h1 className="text-xl font-bold tracking-tight text-neutral-950 dark:text-white font-mono uppercase">
                Student Mistake Notebook
              </h1>
            </div>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
              Self-correction journal for JEE Physics, Chemistry, and Mathematics. Tag root causes, document key formulas, and master previous slips.
            </p>
          </div>

          {/* Quick Retest CTA */}
          <div className="flex items-center gap-2 self-start md:self-auto">
            {filteredMistakes.length > 0 && (
              <button
                type="button"
                onClick={() =>
                  onRetestMistakes(
                    selectedSubject !== 'all' ? selectedSubject : undefined,
                    undefined,
                    filteredMistakes.map((m) => m.questionId)
                  )
                }
                className="px-3.5 py-1.5 text-xs font-semibold bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 rounded hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Retest {filteredMistakes.length} Mistake{filteredMistakes.length === 1 ? '' : 's'}</span>
              </button>
            )}

            {/* View Mode Toggle */}
            <div className="flex items-center border border-neutral-300 dark:border-neutral-700 rounded p-0.5 bg-neutral-100 dark:bg-neutral-800">
              <button
                type="button"
                onClick={() => setViewMode('page')}
                className={`px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer ${
                  viewMode === 'page'
                    ? 'bg-white dark:bg-[#18181B] text-neutral-950 dark:text-white shadow-xs'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white'
                }`}
              >
                Page View
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer ${
                  viewMode === 'list'
                    ? 'bg-white dark:bg-[#18181B] text-neutral-950 dark:text-white shadow-xs'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white'
                }`}
              >
                List View
              </button>
            </div>
          </div>
        </div>

        {/* Notebook Summary Metrics Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-neutral-200/80 dark:border-neutral-800/80">
          <div className="bg-neutral-50 dark:bg-[#18181B] border border-neutral-200 dark:border-neutral-800 rounded p-3">
            <span className="text-[11px] font-mono uppercase text-neutral-500 dark:text-neutral-400 block">
              Total Logged
            </span>
            <span className="text-xl font-bold font-mono text-neutral-950 dark:text-white mt-0.5 block">
              {stats.total}
            </span>
          </div>
          <div className="bg-neutral-50 dark:bg-[#18181B] border border-neutral-200 dark:border-neutral-800 rounded p-3">
            <span className="text-[11px] font-mono uppercase text-neutral-500 dark:text-neutral-400 block">
              Needs Revision
            </span>
            <span className="text-xl font-bold font-mono text-rose-600 dark:text-rose-400 mt-0.5 block">
              {stats.unresolved}
            </span>
          </div>
          <div className="bg-neutral-50 dark:bg-[#18181B] border border-neutral-200 dark:border-neutral-800 rounded p-3">
            <span className="text-[11px] font-mono uppercase text-neutral-500 dark:text-neutral-400 block">
              Resolved & Mastered
            </span>
            <span className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5 block">
              {stats.resolved}
            </span>
          </div>
          <div className="bg-neutral-50 dark:bg-[#18181B] border border-neutral-200 dark:border-neutral-800 rounded p-3">
            <span className="text-[11px] font-mono uppercase text-neutral-500 dark:text-neutral-400 block">
              Primary Error Type
            </span>
            <span className="text-sm font-semibold font-mono text-neutral-900 dark:text-white mt-1.5 block truncate">
              {stats.topCategory
                ? ERROR_CATEGORIES.find((c) => c.id === stats.topCategory)?.shortLabel
                : 'No mistakes'}
            </span>
          </div>
        </div>
      </div>

      {/* Subject Binder Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
          <button
            type="button"
            onClick={() => {
              setSelectedSubject('all');
              setActivePageIndex(0);
            }}
            className={`px-3 py-1.5 text-xs font-mono font-medium rounded border transition-colors cursor-pointer ${
              selectedSubject === 'all'
                ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 border-neutral-900 dark:border-white'
                : 'bg-white dark:bg-[#18181B] text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-800 hover:text-neutral-950 dark:hover:text-white'
            }`}
          >
            All Subjects ({allMistakes.length})
          </button>
          {ALL_SUBJECTS.map((sub) => {
            const count = allMistakes.filter((m) => m.subject === sub).length;
            const isSelected = selectedSubject === sub;
            return (
              <button
                key={sub}
                type="button"
                onClick={() => {
                  setSelectedSubject(sub);
                  setActivePageIndex(0);
                }}
                className={`px-3 py-1.5 text-xs font-mono font-medium rounded border transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 border-neutral-900 dark:border-white'
                    : 'bg-white dark:bg-[#18181B] text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-800 hover:text-neutral-950 dark:hover:text-white'
                }`}
              >
                {sub} ({count})
              </button>
            );
          })}
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setActivePageIndex(0);
            }}
            placeholder="Search question, chapter, notes..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#18181B] text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-neutral-900 dark:focus:ring-white"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Secondary Filters: Error Category & Resolution */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs bg-neutral-50 dark:bg-[#141416] p-2.5 rounded-lg border border-neutral-200 dark:border-neutral-800">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-mono uppercase text-neutral-500 dark:text-neutral-400 mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3" />
            <span>Cause:</span>
          </span>
          <button
            type="button"
            onClick={() => {
              setSelectedErrorCategory('all');
              setActivePageIndex(0);
            }}
            className={`px-2 py-0.5 rounded text-[11px] font-mono cursor-pointer transition-colors ${
              selectedErrorCategory === 'all'
                ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 font-bold'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white'
            }`}
          >
            All
          </button>
          {ERROR_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                setSelectedErrorCategory(cat.id);
                setActivePageIndex(0);
              }}
              className={`px-2 py-0.5 rounded text-[11px] font-mono cursor-pointer transition-colors ${
                selectedErrorCategory === cat.id
                  ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 font-bold'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white'
              }`}
            >
              {cat.shortLabel}
            </button>
          ))}
        </div>

        {/* Resolution Status Filter */}
        <div className="flex items-center gap-1 font-mono text-[11px]">
          <span className="text-neutral-500 dark:text-neutral-400 mr-1">Status:</span>
          <button
            type="button"
            onClick={() => {
              setResolutionFilter('unresolved');
              setActivePageIndex(0);
            }}
            className={`px-2 py-0.5 rounded cursor-pointer ${
              resolutionFilter === 'unresolved'
                ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 font-bold'
                : 'text-neutral-600 dark:text-neutral-400'
            }`}
          >
            Unresolved
          </button>
          <button
            type="button"
            onClick={() => {
              setResolutionFilter('resolved');
              setActivePageIndex(0);
            }}
            className={`px-2 py-0.5 rounded cursor-pointer ${
              resolutionFilter === 'resolved'
                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold'
                : 'text-neutral-600 dark:text-neutral-400'
            }`}
          >
            Resolved
          </button>
          <button
            type="button"
            onClick={() => {
              setResolutionFilter('all');
              setActivePageIndex(0);
            }}
            className={`px-2 py-0.5 rounded cursor-pointer ${
              resolutionFilter === 'all'
                ? 'bg-neutral-200 dark:bg-neutral-700 text-neutral-900 dark:text-white font-bold'
                : 'text-neutral-600 dark:text-neutral-400'
            }`}
          >
            All
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {filteredMistakes.length === 0 ? (
        /* Empty Notebook State */
        <div
          className={`rounded-xl border border-neutral-300 dark:border-neutral-800 p-12 text-center shadow-md relative overflow-hidden ${
            isDarkMode ? 'notebook-page-dark' : 'notebook-page-light'
          }`}
        >
          {/* Notebook Punch Holes on the left */}
          <div className="absolute left-4 top-0 bottom-0 flex flex-col justify-around py-8 pointer-events-none">
            {[1, 2, 3, 4, 5].map((hole) => (
              <div
                key={hole}
                className="w-4 h-4 rounded-full bg-neutral-200 dark:bg-neutral-800 shadow-inner ring-1 ring-neutral-300 dark:ring-neutral-700"
              />
            ))}
          </div>

          <div className="max-w-md mx-auto space-y-4 pl-12">
            <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-lg font-bold text-neutral-950 dark:text-white font-mono">
                {allMistakes.length === 0
                  ? 'Your Mistake Notebook is Clean!'
                  : 'No Mistakes Match This Filter'}
              </h3>
              <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                {allMistakes.length === 0
                  ? 'Whenever you take a Full Syllabus Mock or Chapter Practice test, any incorrect responses are automatically collected here with your answers, correct keys, and a ruled notebook canvas for personal revision notes.'
                  : 'Try clearing the search query or changing the cause/status filters to view your recorded mistakes.'}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              {allMistakes.length === 0 ? (
                <>
                  <button
                    type="button"
                    onClick={onStartFullTest}
                    className="px-4 py-2 text-xs font-medium bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 rounded hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors cursor-pointer"
                  >
                    Start Full Syllabus Mock
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenChapterSelector()}
                    className="px-4 py-2 text-xs font-medium border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                  >
                    Select Chapter Test
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSubject('all');
                    setSelectedErrorCategory('all');
                    setResolutionFilter('all');
                    setSearchQuery('');
                  }}
                  className="px-4 py-2 text-xs font-medium bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 rounded hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors cursor-pointer"
                >
                  Clear All Filters
                </button>
              )}
            </div>
          </div>
        </div>
      ) : viewMode === 'page' && currentMistake ? (
        /* SINGLE PAGE FLIP VIEW WITH AUTHENTIC NOTEBOOK BACKGROUND */
        <div className="space-y-4">
          {/* Page Navigation Bar */}
          <div className="flex items-center justify-between px-2 text-xs font-mono text-neutral-500 dark:text-neutral-400">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-neutral-900 dark:text-white">
                Page {activePageIndex + 1} of {filteredMistakes.length}
              </span>
              <span>·</span>
              <span>{currentMistake.subject}</span>
              <span>/</span>
              <span>{currentMistake.chapter}</span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={activePageIndex === 0}
                onClick={() => setActivePageIndex((p) => Math.max(0, p - 1))}
                className="px-2.5 py-1 rounded border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Prev Page</span>
              </button>
              <button
                type="button"
                disabled={activePageIndex >= filteredMistakes.length - 1}
                onClick={() =>
                  setActivePageIndex((p) => Math.min(filteredMistakes.length - 1, p + 1))
                }
                className="px-2.5 py-1 rounded border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1"
              >
                <span className="hidden sm:inline">Next Page</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* THE NOTEBOOK PAGE */}
          <div
            className={`rounded-xl border border-neutral-300 dark:border-neutral-700 shadow-xl overflow-hidden relative transition-all ${
              isDarkMode ? 'notebook-page-dark' : 'notebook-page-light'
            }`}
          >
            {/* Binder Spiral Punches on Left Spine */}
            <div className="absolute left-3 sm:left-4 top-0 bottom-0 flex flex-col justify-around py-8 pointer-events-none z-10">
              {[1, 2, 3, 4, 5, 6, 7].map((hole) => (
                <div
                  key={hole}
                  className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-neutral-200 dark:bg-neutral-800 shadow-inner ring-1 ring-neutral-300 dark:ring-neutral-700"
                />
              ))}
            </div>

            {/* Notebook Margin Area (Left of Red Line) & Ruled Body (Right of Red Line) */}
            <div className="pl-14 sm:pl-20 pr-4 sm:pr-8 py-6 space-y-6">
              {/* Top Marginalia Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-300/80 dark:border-neutral-700/80 pb-3">
                <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                  <span className="font-bold text-neutral-950 dark:text-white uppercase tracking-wider">
                    {currentMistake.subject}
                  </span>
                  <span className="text-neutral-400">·</span>
                  <span className="text-neutral-700 dark:text-neutral-300 font-medium">
                    {currentMistake.chapter}
                  </span>
                  {currentMistake.topic && (
                    <>
                      <span className="text-neutral-400">·</span>
                      <span className="text-neutral-500 dark:text-neutral-400 text-[11px]">
                        {currentMistake.topic}
                      </span>
                    </>
                  )}
                  {currentMistake.incorrectCount > 1 && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400">
                      Missed {currentMistake.incorrectCount}x
                    </span>
                  )}
                </div>

                {/* Status & Error Reason Pickers */}
                <div className="flex items-center gap-2">
                  {/* Cause Tag Selector */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-mono text-neutral-500 dark:text-neutral-400">
                      Cause:
                    </span>
                    <select
                      value={entries[currentMistake.questionId]?.errorCategory || currentMistake.entry.errorCategory}
                      onChange={(e) =>
                        handleUpdateCategory(
                          currentMistake.questionId,
                          e.target.value as ErrorCategory
                        )
                      }
                      className="text-xs font-mono font-medium px-2 py-1 rounded border border-neutral-300 dark:border-neutral-700 bg-white/90 dark:bg-[#18181B] text-neutral-900 dark:text-white cursor-pointer"
                    >
                      {ERROR_CATEGORIES.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Resolved Toggle Button */}
                  <button
                    type="button"
                    onClick={() => handleToggleResolved(currentMistake.questionId)}
                    className={`px-2.5 py-1 rounded text-xs font-mono font-medium border transition-colors flex items-center gap-1 cursor-pointer ${
                      entries[currentMistake.questionId]?.resolved
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white bg-white/60 dark:bg-neutral-800/60'
                    }`}
                  >
                    {entries[currentMistake.questionId]?.resolved ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Resolved</span>
                      </>
                    ) : (
                      <>
                        <Circle className="w-3.5 h-3.5" />
                        <span>Mark Resolved</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Problem Statement on Ruled Page */}
              <div className="space-y-3">
                <div className="text-xs font-mono text-neutral-400 uppercase tracking-widest">
                  Problem Statement
                </div>
                <div className="text-sm text-neutral-900 dark:text-neutral-100 leading-relaxed font-serif">
                  <MathText text={currentMistake.questionText} />
                </div>

                {(currentMistake.visualAsset || currentMistake.imageUrl || (currentMistake.images && currentMistake.images.length > 0)) ? (
                  <div className="my-3 p-3 bg-white/80 dark:bg-[#141416]/80 rounded border border-neutral-200 dark:border-neutral-800">
                    <QuestionVisuals
                      visualAsset={currentMistake.visualAsset}
                      imageUrl={currentMistake.imageUrl}
                      visuals={currentMistake.images}
                      subject={currentMistake.subject}
                      chapter={currentMistake.chapter}
                    />
                  </div>
                ) : null}
              </div>

              {/* Your Answer vs Correct Answer Box */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-lg border border-neutral-200/90 dark:border-neutral-800 bg-white/80 dark:bg-[#141416]/80 text-xs font-mono">
                <div>
                  <span className="text-neutral-500 dark:text-neutral-400 block text-[11px] uppercase">
                    Your Response:
                  </span>
                  <span className="text-rose-600 dark:text-rose-400 font-bold text-sm line-through mt-0.5 block">
                    {currentMistake.userAnswer !== undefined && currentMistake.userAnswer !== null
                      ? String(currentMistake.userAnswer)
                      : '(Unattempted / Timed Out)'}
                  </span>
                </div>
                <div>
                  <span className="text-neutral-500 dark:text-neutral-400 block text-[11px] uppercase">
                    Correct JEE Answer:
                  </span>
                  <span className="text-emerald-700 dark:text-emerald-400 font-bold text-sm mt-0.5 block">
                    {String(currentMistake.correctAnswer)}
                  </span>
                </div>
              </div>

              {/* Student's Personal Ruled Learning Area */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-neutral-900 dark:text-white uppercase tracking-wider">
                    <Pencil className="w-3.5 h-3.5 text-neutral-500" />
                    <span>My Learning & Defense Notes:</span>
                  </div>
                  {saveStatus && (
                    <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400">
                      ✓ {saveStatus}
                    </span>
                  )}
                </div>

                {/* Quick Insert Snippet Pills */}
                <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono">
                  <span className="text-neutral-400">Quick Prompt:</span>
                  <button
                    type="button"
                    onClick={() =>
                      handleInsertQuickNote(
                        currentMistake.questionId,
                        'Calculation Slip: Watch arithmetic & sign convention in step 2.'
                      )
                    }
                    className="px-2 py-0.5 rounded border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 cursor-pointer"
                  >
                    + Calculation slip
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleInsertQuickNote(
                        currentMistake.questionId,
                        'Key Formula: Write out the exact theorem before substituting values.'
                      )
                    }
                    className="px-2 py-0.5 rounded border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 cursor-pointer"
                  >
                    + Formula note
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleInsertQuickNote(
                        currentMistake.questionId,
                        'Trap Avoided: Watch out for boundary conditions and units (cm vs m, J vs kJ).'
                      )
                    }
                    className="px-2 py-0.5 rounded border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 cursor-pointer"
                  >
                    + Trap warning
                  </button>
                </div>

                {/* Ruled Notebook Writing Area */}
                <div className="relative">
                  <textarea
                    rows={4}
                    value={entries[currentMistake.questionId]?.personalNote || ''}
                    onChange={(e) =>
                      handleUpdateNote(currentMistake.questionId, e.target.value)
                    }
                    placeholder="Write your personal handwritten takeaway here (e.g. why you picked the wrong option, which formula you slipped on, and how to verify next time)..."
                    className={`w-full p-3 text-sm rounded border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-neutral-900 dark:focus:ring-white resize-y font-sans transition-all ${
                      isDarkMode ? 'notebook-ruled-input-dark' : 'notebook-ruled-input-light'
                    }`}
                  />
                </div>
              </div>

              {/* Official Solution & Explanation */}
              {(currentMistake.solution || currentMistake.explanation) && (
                <div className="space-y-2 pt-2 border-t border-neutral-300/80 dark:border-neutral-700/80">
                  <div className="text-xs font-mono text-neutral-500 dark:text-neutral-400 uppercase tracking-widest">
                    Official Solution & Conceptual Breakdown
                  </div>
                  <div className="p-4 rounded-lg bg-white/70 dark:bg-[#121214]/70 border border-neutral-200 dark:border-neutral-800 text-xs text-neutral-800 dark:text-neutral-200 leading-relaxed space-y-2">
                    {currentMistake.solution && (
                      <div>
                        <MathText text={currentMistake.solution} />
                      </div>
                    )}
                    {currentMistake.explanation && currentMistake.explanation !== currentMistake.solution && (
                      <div className="pt-2 border-t border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400">
                        <strong className="text-neutral-800 dark:text-neutral-200">Concept Note: </strong>
                        <MathText text={currentMistake.explanation} />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Page Bottom Actions */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-neutral-300/80 dark:border-neutral-700/80">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      onRetestMistakes(
                        currentMistake.subject,
                        currentMistake.chapter,
                        [currentMistake.questionId]
                      )
                    }
                    className="px-3.5 py-1.5 text-xs font-medium bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 rounded hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Retest This Question Now</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      onOpenChapterSelector(currentMistake.subject, currentMistake.chapter)
                    }
                    className="px-3 py-1.5 text-xs font-medium border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                  >
                    Practice {currentMistake.chapter}
                  </button>
                </div>

                {/* Page Flip Buttons */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={activePageIndex === 0}
                    onClick={() => setActivePageIndex((p) => Math.max(0, p - 1))}
                    className="px-3 py-1.5 text-xs font-medium border border-neutral-300 dark:border-neutral-700 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1 text-neutral-700 dark:text-neutral-300"
                  >
                    <ArrowLeft className="w-3 h-3" />
                    <span>Previous</span>
                  </button>
                  <button
                    type="button"
                    disabled={activePageIndex >= filteredMistakes.length - 1}
                    onClick={() =>
                      setActivePageIndex((p) => Math.min(filteredMistakes.length - 1, p + 1))
                    }
                    className="px-3 py-1.5 text-xs font-medium border border-neutral-300 dark:border-neutral-700 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1 text-neutral-700 dark:text-neutral-300"
                  >
                    <span>Next</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* CONTINUOUS NOTEBOOK STACK / LIST VIEW */
        <div className="space-y-5">
          <div className="text-xs font-mono text-neutral-500 dark:text-neutral-400 px-1">
            Showing all {filteredMistakes.length} recorded mistake{filteredMistakes.length === 1 ? '' : 's'} in journal stack:
          </div>

          <div className="space-y-5">
            {filteredMistakes.map((mistake, idx) => {
              const entry = entries[mistake.questionId] || mistake.entry;
              const catObj = ERROR_CATEGORIES.find((c) => c.id === entry.errorCategory) || ERROR_CATEGORIES[0];

              return (
                <div
                  key={mistake.questionId}
                  className={`rounded-xl border border-neutral-300 dark:border-neutral-700 shadow-md overflow-hidden relative ${
                    isDarkMode ? 'notebook-page-dark' : 'notebook-page-light'
                  }`}
                >
                  {/* Punch Holes on the left spine */}
                  <div className="absolute left-3 top-0 bottom-0 flex flex-col justify-around py-6 pointer-events-none z-10">
                    {[1, 2, 3].map((hole) => (
                      <div
                        key={hole}
                        className="w-3 h-3 rounded-full bg-neutral-200 dark:bg-neutral-800 shadow-inner ring-1 ring-neutral-300 dark:ring-neutral-700"
                      />
                    ))}
                  </div>

                  <div className="pl-12 sm:pl-16 pr-4 sm:pr-6 py-5 space-y-4">
                    {/* Header */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-300/80 dark:border-neutral-700/80 pb-2.5">
                      <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                        <span className="font-bold text-neutral-900 dark:text-white">
                          #{idx + 1}
                        </span>
                        <span className="text-neutral-400">·</span>
                        <span className="font-semibold text-neutral-950 dark:text-white">
                          {mistake.subject}
                        </span>
                        <span className="text-neutral-400">/</span>
                        <span className="text-neutral-700 dark:text-neutral-300">
                          {mistake.chapter}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Error Tag */}
                        <select
                          value={entry.errorCategory}
                          onChange={(e) =>
                            handleUpdateCategory(
                              mistake.questionId,
                              e.target.value as ErrorCategory
                            )
                          }
                          className="text-[11px] font-mono px-2 py-0.5 rounded border border-neutral-300 dark:border-neutral-700 bg-white/80 dark:bg-[#18181B] text-neutral-900 dark:text-white"
                        >
                          {ERROR_CATEGORIES.map((cat) => (
                            <option key={cat.id} value={cat.id}>
                              {cat.shortLabel}
                            </option>
                          ))}
                        </select>

                        {/* Resolved Toggle */}
                        <button
                          type="button"
                          onClick={() => handleToggleResolved(mistake.questionId)}
                          className={`text-xs font-mono px-2 py-0.5 rounded border transition-colors cursor-pointer flex items-center gap-1 ${
                            entry.resolved
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 bg-white/60 dark:bg-neutral-800/60'
                          }`}
                        >
                          {entry.resolved ? <Check className="w-3 h-3" /> : <Circle className="w-3 h-3" />}
                          <span>{entry.resolved ? 'Resolved' : 'Review'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Question Text */}
                    <div className="text-xs sm:text-sm text-neutral-900 dark:text-neutral-100 font-serif leading-relaxed">
                      <MathText text={mistake.questionText} />
                    </div>

                    {/* Answers Breakdown */}
                    <div className="grid grid-cols-2 gap-2 text-xs font-mono p-2.5 rounded bg-white/70 dark:bg-[#141416]/70 border border-neutral-200 dark:border-neutral-800">
                      <div>
                        <span className="text-neutral-400 text-[10px] uppercase block">Your Answer:</span>
                        <span className="text-rose-600 dark:text-rose-400 font-bold line-through">
                          {mistake.userAnswer !== undefined && mistake.userAnswer !== null
                            ? String(mistake.userAnswer)
                            : '(Unattempted)'}
                        </span>
                      </div>
                      <div>
                        <span className="text-neutral-400 text-[10px] uppercase block">Correct Answer:</span>
                        <span className="text-emerald-700 dark:text-emerald-400 font-bold">
                          {String(mistake.correctAnswer)}
                        </span>
                      </div>
                    </div>

                    {/* Personal Ruled Note Input */}
                    <div className="space-y-1.5">
                      <div className="text-[11px] font-mono font-semibold text-neutral-700 dark:text-neutral-300 uppercase flex items-center gap-1">
                        <Pencil className="w-3 h-3" />
                        <span>Takeaway Note:</span>
                      </div>
                      <textarea
                        rows={2}
                        value={entry.personalNote || ''}
                        onChange={(e) =>
                          handleUpdateNote(mistake.questionId, e.target.value)
                        }
                        placeholder="Key formula or reason for mistake..."
                        className={`w-full p-2.5 text-xs rounded border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-neutral-900 dark:focus:ring-white resize-y font-sans ${
                          isDarkMode ? 'notebook-ruled-input-dark' : 'notebook-ruled-input-light'
                        }`}
                      />
                    </div>

                    {/* Bottom Actions */}
                    <div className="flex items-center justify-between pt-1">
                      <button
                        type="button"
                        onClick={() =>
                          onRetestMistakes(mistake.subject, mistake.chapter, [
                            mistake.questionId,
                          ])
                        }
                        className="px-2.5 py-1 text-xs font-medium bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 rounded hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Retest This</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setViewMode('page');
                          setActivePageIndex(idx);
                        }}
                        className="text-xs font-mono text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white cursor-pointer"
                      >
                        Open Full Page →
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
