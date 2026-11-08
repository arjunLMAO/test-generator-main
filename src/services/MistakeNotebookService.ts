import {
  NormalizedQuestion,
  QuestionHistoryRecord,
  SubjectName,
  TestResultReport,
  VisualAsset,
} from '../types/jee';

export type ErrorCategory =
  | 'calculation'
  | 'formula_forgot'
  | 'concept_gap'
  | 'time_crunch'
  | 'misread'
  | 'unclassified';

export interface NotebookEntry {
  questionId: string;
  personalNote: string;
  errorCategory: ErrorCategory;
  resolved: boolean;
  pinnedFormula?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface MistakeItem {
  questionId: string;
  subject: SubjectName;
  chapter: string;
  topic?: string;
  questionText: string;
  questionType: string;
  userAnswer?: string | number | null;
  correctAnswer?: string | number | null;
  solution?: string;
  explanation?: string;
  commonMistake?: string;
  visualAsset?: VisualAsset | null;
  imageUrl?: string | null;
  images?: string[];
  reactionSchemes?: any[];
  incorrectCount: number;
  lastAttemptedAt?: string;
  sourceTestTitle?: string;
  // Personal notebook annotations
  entry: NotebookEntry;
}

export const ERROR_CATEGORIES: Array<{
  id: ErrorCategory;
  label: string;
  shortLabel: string;
  description: string;
  colorLight: string;
  colorDark: string;
}> = [
  {
    id: 'calculation',
    label: 'Calculation / Algebra Slip',
    shortLabel: 'Calculation',
    description: 'Arithmetic error, algebraic slip, unit conversion, or sign mistake.',
    colorLight: 'text-amber-700 bg-amber-50 border-amber-200',
    colorDark: 'text-amber-400 bg-amber-950/40 border-amber-800',
  },
  {
    id: 'formula_forgot',
    label: 'Forgot Formula / Rule',
    shortLabel: 'Formula Slip',
    description: 'Could not recall theorem, identity, standard integral, or reaction reagent.',
    colorLight: 'text-rose-700 bg-rose-50 border-rose-200',
    colorDark: 'text-rose-400 bg-rose-950/40 border-rose-800',
  },
  {
    id: 'concept_gap',
    label: 'Conceptual Theory Gap',
    shortLabel: 'Concept Gap',
    description: 'Fundamental law not understood, boundary condition missed, or incorrect principle applied.',
    colorLight: 'text-indigo-700 bg-indigo-50 border-indigo-200',
    colorDark: 'text-indigo-400 bg-indigo-950/40 border-indigo-800',
  },
  {
    id: 'time_crunch',
    label: 'Time Pressure / Rushed',
    shortLabel: 'Rushed / Panic',
    description: 'Rushed due to ticking timer, panicked under exam countdown, or made wild guess.',
    colorLight: 'text-orange-700 bg-orange-50 border-orange-200',
    colorDark: 'text-orange-400 bg-orange-950/40 border-orange-800',
  },
  {
    id: 'misread',
    label: 'Misread Question / Trap',
    shortLabel: 'Trap / Misread',
    description: 'Overlooked "NOT", "INCORRECT", "IS NOT TRUE", or fell for distractor trap.',
    colorLight: 'text-purple-700 bg-purple-50 border-purple-200',
    colorDark: 'text-purple-400 bg-purple-950/40 border-purple-800',
  },
  {
    id: 'unclassified',
    label: 'Unclassified Mistake',
    shortLabel: 'Unclassified',
    description: 'Needs diagnostic tagging to understand error cause.',
    colorLight: 'text-neutral-700 bg-neutral-100 border-neutral-300',
    colorDark: 'text-neutral-300 bg-neutral-800 border-neutral-700',
  },
];

const LS_NOTEBOOK_ENTRIES_KEY = 'jee_mistake_notebook_entries_v1';

export class MistakeNotebookService {
  /**
   * Load stored personal student annotations from localStorage
   */
  public static loadEntries(): Record<string, NotebookEntry> {
    if (typeof window === 'undefined') return {};
    try {
      const raw = localStorage.getItem(LS_NOTEBOOK_ENTRIES_KEY);
      if (raw) return JSON.parse(raw);
    } catch {
      // ignore
    }
    return {};
  }

  /**
   * Save notebook entries to localStorage
   */
  public static saveEntries(entries: Record<string, NotebookEntry>): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(LS_NOTEBOOK_ENTRIES_KEY, JSON.stringify(entries));
    } catch {
      // ignore
    }
  }

  /**
   * Aggregate all mistakes across historyMap and completed test reports
   */
  public static extractMistakes(
    historyMap: Record<string, QuestionHistoryRecord> = {},
    questionsById: Map<string, NormalizedQuestion>,
    reports: TestResultReport[] = []
  ): MistakeItem[] {
    const entries = this.loadEntries();
    const mistakesMap = new Map<string, MistakeItem>();

    // 1. Gather mistakes from historyMap
    for (const [qId, rec] of Object.entries(historyMap)) {
      if (!rec) continue;
      const isMistake =
        rec.lastResult === 'incorrect' ||
        rec.masteryState === 'incorrect' ||
        (rec.incorrectCount && rec.incorrectCount > 0);

      if (!isMistake) continue;

      const q = questionsById.get(qId);
      if (!q) continue;

      // Extract user's last attempted answer from attempts timeline if available
      let lastUserAns: string | number | null = null;
      if (Array.isArray(rec.attempts) && rec.attempts.length > 0) {
        for (let i = rec.attempts.length - 1; i >= 0; i--) {
          const att = rec.attempts[i];
          if (att.answer !== undefined && att.answer !== null) {
            lastUserAns = att.answer;
            break;
          }
        }
      }

      const existingEntry: NotebookEntry = entries[qId] || {
        questionId: qId,
        personalNote: '',
        errorCategory: 'unclassified',
        resolved: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mistakesMap.set(qId, {
        questionId: qId,
        subject: q.subject,
        chapter: q.chapter,
        topic: q.topic,
        questionText: q.question,
        questionType: q.type,
        userAnswer: lastUserAns,
        correctAnswer: q.correctAnswer,
        solution: q.solution,
        explanation: q.explanation,
        commonMistake: q.commonMistake,
        visualAsset: q.visualAsset,
        imageUrl: q.image,
        images: q.images,
        reactionSchemes: q.reactionSchemes,
        incorrectCount: rec.incorrectCount || 1,
        lastAttemptedAt: rec.lastAttemptedAt,
        entry: existingEntry,
      });
    }

    // 2. Also check completed test reports for any incorrect question results
    for (const rep of reports) {
      if (!Array.isArray(rep.questionResults)) continue;
      for (const qr of rep.questionResults) {
        if (qr.result !== 'incorrect') continue;

        const q = questionsById.get(qr.questionId);
        if (!q) continue;

        const existing = mistakesMap.get(qr.questionId);
        if (existing) {
          if (!existing.userAnswer && qr.studentAnswer !== undefined && qr.studentAnswer !== null) {
            existing.userAnswer = qr.studentAnswer;
          }
          if (!existing.sourceTestTitle) {
            existing.sourceTestTitle = rep.title;
          }
        } else {
          const existingEntry: NotebookEntry = entries[qr.questionId] || {
            questionId: qr.questionId,
            personalNote: '',
            errorCategory: (qr.possibleErrorType as ErrorCategory) || 'unclassified',
            resolved: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          mistakesMap.set(qr.questionId, {
            questionId: qr.questionId,
            subject: q.subject,
            chapter: q.chapter,
            topic: q.topic,
            questionText: q.question,
            questionType: q.type,
            userAnswer: qr.studentAnswer,
            correctAnswer: q.correctAnswer,
            solution: q.solution || qr.solution,
            explanation: q.explanation || qr.explanation,
            commonMistake: q.commonMistake || qr.commonMistake,
            visualAsset: q.visualAsset || qr.visualAsset,
            imageUrl: q.image || qr.image,
            images: q.images || qr.images,
            reactionSchemes: q.reactionSchemes,
            incorrectCount: 1,
            lastAttemptedAt: rep.submittedAt,
            sourceTestTitle: rep.title,
            entry: existingEntry,
          });
        }
      }
    }

    // Sort by recent / unresolved first
    return Array.from(mistakesMap.values()).sort((a, b) => {
      // Unresolved first
      if (a.entry.resolved !== b.entry.resolved) {
        return a.entry.resolved ? 1 : -1;
      }
      // Highest incorrect count
      if (b.incorrectCount !== a.incorrectCount) {
        return b.incorrectCount - a.incorrectCount;
      }
      // Most recent timestamp
      const timeA = a.lastAttemptedAt ? new Date(a.lastAttemptedAt).getTime() : 0;
      const timeB = b.lastAttemptedAt ? new Date(b.lastAttemptedAt).getTime() : 0;
      return timeB - timeA;
    });
  }

  /**
   * Update or create a student's personal notebook entry
   */
  public static updateEntry(
    questionId: string,
    updates: Partial<NotebookEntry>
  ): Record<string, NotebookEntry> {
    const entries = this.loadEntries();
    const current = entries[questionId] || {
      questionId,
      personalNote: '',
      errorCategory: 'unclassified',
      resolved: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updated: NotebookEntry = {
      ...current,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    entries[questionId] = updated;
    this.saveEntries(entries);
    return entries;
  }
}
