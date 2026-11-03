import {
  NormalizedQuestion,
  QuestionHistoryRecord,
  SubjectName,
} from '../types/jee';

export type ReviewRating = 1 | 2 | 3 | 4; // 1 = Again, 2 = Hard, 3 = Good, 4 = Easy

export interface Flashcard {
  id: string;
  questionId?: string;
  subject: SubjectName;
  chapter: string;
  topic?: string;
  title: string;
  frontPrompt: string;
  formulaOrConcept: string;
  explanation: string;
  commonPitfall?: string;
  studentMistakeContext?: string;
  sourceOrigin: 'mistake_history' | 'curated_high_yield';

  // Spaced Repetition (SM-2 + Leitner 5-box intervals)
  repetition: number;
  intervalDays: number;
  easeFactor: number; // default 2.5, min 1.3
  nextReviewDate: string; // ISO string
  lastReviewedAt?: string;
  streak: number;
  lapseCount: number;
  box: number; // 1 to 5
}

export interface DeckStats {
  totalCards: number;
  dueToday: number;
  learning: number; // Box 1-2
  reviewing: number; // Box 3-4
  mastered: number; // Box 5
  bySubject: Record<SubjectName, { total: number; due: number; mastered: number }>;
  retentionRate: number;
  mistakeDerivedCount: number;
}

const STORAGE_KEY = 'test_generator_flashcards_v2';

// High-Yield JEE Core Formulas across Physics, Chemistry, and Mathematics
const HIGH_YIELD_SEED_CARDS: Omit<
  Flashcard,
  'repetition' | 'intervalDays' | 'easeFactor' | 'nextReviewDate' | 'streak' | 'lapseCount' | 'box'
>[] = [
  // --- PHYSICS ---
  {
    id: 'seed-phy-01',
    subject: 'Physics',
    chapter: 'Modern Physics',
    topic: 'Photoelectric Effect',
    title: 'Einstein Photoelectric Equation & Stopping Potential',
    frontPrompt:
      'State the Einstein photoelectric equation relating photon frequency $\\nu$, work function $\\phi$, and maximum kinetic energy $K_{\\max}$ of emitted photoelectrons. What is the relation to stopping potential $V_s$?',
    formulaOrConcept:
      '$$h\\nu = \\phi + K_{\\max} = \\phi + e V_s$$\n$$\\implies e V_s = h\\nu - h\\nu_0 = \\frac{hc}{\\lambda} - \\frac{hc}{\\lambda_0}$$',
    explanation:
      'Photoelectric emission occurs only if $\\nu \\ge \\nu_0$ (threshold frequency). The stopping potential $V_s$ depends linearly on frequency $\\nu$ with slope $h/e$, completely independent of light intensity.',
    commonPitfall:
      'Confusing intensity with frequency: Increasing intensity increases photocurrent (number of electrons per second), but DOES NOT increase stopping potential or electron kinetic energy.',
    sourceOrigin: 'curated_high_yield',
  },
  {
    id: 'seed-phy-02',
    subject: 'Physics',
    chapter: 'Modern Physics',
    topic: 'de Broglie Wavelength',
    title: 'de Broglie Wavelength of Charged & Thermal Particles',
    frontPrompt:
      'Write the de Broglie wavelength $\\lambda$ of a particle of mass $m$ and charge $q$ accelerated through potential difference $V$, and for a thermal neutron at temperature $T$.',
    formulaOrConcept:
      '$$\\text{Accelerated charge: } \\lambda = \\frac{h}{p} = \\frac{h}{\\sqrt{2m q V}}$$\n$$\\text{For electron: } \\lambda \\approx \\frac{12.27}{\\sqrt{V}}\\text{ \\AA}$$\n$$\\text{Thermal particle: } \\lambda = \\frac{h}{\\sqrt{3m k_B T}}$$',
    explanation:
      'Momentum $p = \\sqrt{2mE}$. For thermal particles, average kinetic energy is $\\frac{3}{2}k_B T$, so $p = \\sqrt{3mk_B T}$.',
    commonPitfall:
      'For relativistic velocities ($v \\approx c$), $p \\neq \\sqrt{2mE}$; relativistic momentum $p = \\gamma m v$ must be used.',
    sourceOrigin: 'curated_high_yield',
  },
  {
    id: 'seed-phy-03',
    subject: 'Physics',
    chapter: 'Current Electricity',
    topic: 'Resistivity and Drift Velocity',
    title: 'Drift Velocity, Current Density, and Mobility',
    frontPrompt:
      'State the expression for drift velocity $v_d$ of conduction electrons in terms of electric field $E$ and relaxation time $\\tau$, and express current density $J$ in terms of drift velocity.',
    formulaOrConcept:
      '$$v_d = -\\frac{e E \\tau}{m} = -\\mu E$$\n$$I = n e A v_d \\implies J = \\frac{I}{A} = n e v_d = \\sigma E = \\frac{E}{\\rho}$$\n$$\\sigma = \\frac{n e^2 \\tau}{m}, \\quad \\rho = \\frac{m}{n e^2 \\tau}$$',
    explanation:
      'Mobility $\\mu = \\frac{e\\tau}{m}$ is the drift velocity acquired per unit electric field. In conductors, as temperature increases, lattice vibrations increase, $\\tau$ decreases, causing $\\rho$ to increase.',
    commonPitfall:
      'Remember that drift velocity is extremely small ($\sim 10^{-4}\\text{ m/s}$), while thermal speed is large ($\sim 10^5\\text{ m/s}$), and the signal propagates at speed of light.',
    sourceOrigin: 'curated_high_yield',
  },
  {
    id: 'seed-phy-04',
    subject: 'Physics',
    chapter: 'Electromagnetic Induction',
    topic: 'LC Oscillations',
    title: 'LC Circuit Angular Frequency & Energy Oscillation',
    frontPrompt:
      'For an ideal LC circuit with initial capacitor charge $Q_0$, what is the natural oscillation frequency $\\omega_0$ and the instantaneous energy balance equation?',
    formulaOrConcept:
      '$$\\omega_0 = \\frac{1}{\\sqrt{LC}}, \\quad f = \\frac{1}{2\\pi\\sqrt{LC}}$$\n$$q(t) = Q_0 \\cos(\\omega_0 t), \\quad i(t) = -\\omega_0 Q_0 \\sin(\\omega_0 t)$$\n$$U_{\\text{total}} = \\frac{q(t)^2}{2C} + \\frac{1}{2} L i(t)^2 = \\frac{Q_0^2}{2C} = \\text{constant}$$',
    explanation:
      'Energy oscillates between purely electric (stored in capacitor $E$-field) and purely magnetic (stored in inductor $B$-field). When $q = Q_0/\\sqrt{2}$, electric and magnetic energies are equal.',
    commonPitfall:
      'The frequency of energy oscillations is $2f_0$ (double the frequency of charge/current oscillations) because energy is quadratic in $q$ and $i$.',
    sourceOrigin: 'curated_high_yield',
  },
  {
    id: 'seed-phy-05',
    subject: 'Physics',
    chapter: 'Rotational Motion',
    topic: 'Pure Rolling Motion',
    title: 'Acceleration & Friction in Pure Rolling on an Incline',
    frontPrompt:
      'A rigid symmetrical body of mass $M$, radius $R$, and radius of gyration $K$ rolls without slipping down an incline of angle $\\theta$. What is its linear acceleration $a$ and the minimum coefficient of friction $\\mu_s$ required?',
    formulaOrConcept:
      '$$a = \\frac{g \\sin\\theta}{1 + \\frac{K^2}{R^2}} = \\frac{g \\sin\\theta}{1 + \\frac{I_{\\text{cm}}}{M R^2}}$$\n$$f_s = \\frac{M g \\sin\\theta}{1 + \\frac{R^2}{K^2}} \\le \\mu_s M g \\cos\\theta$$\n$$\\mu_{s,\\min} = \\frac{\\tan\\theta}{1 + \\frac{R^2}{K^2}}$$',
    explanation:
      'Solid sphere ($K^2/R^2 = 2/5 = 0.4$) has higher acceleration than a disc ($0.5$), hollow sphere ($2/3 \\approx 0.67$), or ring ($1.0$). Therefore, the solid sphere reaches the bottom first.',
    commonPitfall:
      'In pure rolling, static friction does NO net work because the point of contact is instantaneously at rest ($v_{\\text{contact}} = 0$). Mechanical energy is conserved.',
    sourceOrigin: 'curated_high_yield',
  },

  // --- CHEMISTRY ---
  {
    id: 'seed-chm-01',
    subject: 'Chemistry',
    chapter: 'Electrochemistry',
    topic: 'Nernst Equation',
    title: 'Nernst Equation at 298 K & Equilibrium Constant',
    frontPrompt:
      'State the Nernst Equation for a general cell reaction $aA + bB \\rightleftharpoons cC + dD$ at $T = 298\\text{ K}$. What is the condition when the cell is at equilibrium?',
    formulaOrConcept:
      '$$E_{\\text{cell}} = E^\\circ_{\\text{cell}} - \\frac{2.303 R T}{n F} \\log_{10} Q$$\n$$\\text{At 298 K: } E_{\\text{cell}} = E^\\circ_{\\text{cell}} - \\frac{0.0591}{n} \\log_{10} \\left(\\frac{[C]^c [D]^d}{[A]^a [B]^b}\\right)$$\n$$\\text{At equilibrium: } E_{\\text{cell}} = 0 \\implies E^\\circ_{\\text{cell}} = \\frac{0.0591}{n} \\log_{10} K_{eq}$$',
    explanation:
      'Gibbs free energy change $\\Delta G = -n F E_{\\text{cell}}$. A cell reaction is spontaneous if $E_{\\text{cell}} > 0$, meaning $\\Delta G < 0$.',
    commonPitfall:
      'Pure solids and pure liquids have activity $= 1$ and must NOT be included in reaction quotient $Q$. Do not confuse $E_{\\text{cell}}$ (which drops to 0 at equilibrium) with $E^\\circ_{\\text{cell}}$ (constant).',
    sourceOrigin: 'curated_high_yield',
  },
  {
    id: 'seed-chm-02',
    subject: 'Chemistry',
    chapter: 'Chemical Kinetics',
    topic: 'Arrhenius Equation',
    title: 'Arrhenius Equation & Two-Temperature Rate Form',
    frontPrompt:
      'Write the Arrhenius equation showing temperature dependence of rate constant $k$, and express the ratio of rate constants $k_2/k_1$ at two temperatures $T_1$ and $T_2$.',
    formulaOrConcept:
      '$$k = A e^{-\\frac{E_a}{R T}}$$\n$$\\ln k = \\ln A - \\frac{E_a}{R T} \\implies \\log_{10} k = \\log_{10} A - \\frac{E_a}{2.303 R T}$$\n$$\\log_{10}\\left(\\frac{k_2}{k_1}\\right) = \\frac{E_a}{2.303 R} \\left(\\frac{1}{T_1} - \\frac{1}{T_2}\\right) = \\frac{E_a (T_2 - T_1)}{2.303 R T_1 T_2}$$',
    explanation:
      'A plot of $\\log_{10} k$ vs $1/T$ is linear with negative slope $= -\\frac{E_a}{2.303 R}$ and intercept $= \\log_{10} A$. Higher activation energy $E_a$ means rate is more sensitive to temperature.',
    commonPitfall:
      'A catalyst lowers $E_a$ for both forward and reverse reactions equally, increasing both rates but leaving equilibrium constant $K_{eq}$ unchanged.',
    sourceOrigin: 'curated_high_yield',
  },
  {
    id: 'seed-chm-03',
    subject: 'Chemistry',
    chapter: 'Coordination Compounds',
    topic: 'Magnetic Moment and Spin',
    title: 'Spin-Only Magnetic Moment Formula',
    frontPrompt:
      'Give the spin-only magnetic moment formula $\\mu_s$ for a transition metal coordination complex containing $n$ unpaired electrons. What units is it expressed in?',
    formulaOrConcept:
      '$$\\mu_s = \\sqrt{n(n + 2)} \\text{ BM (Bohr Magnetons)}$$\n$$\\text{For } n = 1: \\mu = \\sqrt{3} \\approx 1.73\\text{ BM}$$\n$$\\text{For } n = 2: \\mu = \\sqrt{8} \\approx 2.83\\text{ BM}$$\n$$\\text{For } n = 3: \\mu = \\sqrt{15} \\approx 3.87\\text{ BM}$$\n$$\\text{For } n = 4: \\mu = \\sqrt{24} \\approx 4.90\\text{ BM}$$\n$$\\text{For } n = 5: \\mu = \\sqrt{35} \\approx 5.92\\text{ BM}$$',
    explanation:
      'Strong field ligands (e.g., $\\text{CN}^-$, $\\text{CO}$) cause large $\\Delta_o > P$ forcing electron pairing (low spin complex, smaller $\\mu$). Weak field ligands (e.g., $\\text{F}^-$, $\\text{Cl}^-$) yield high spin complexes with larger $\\mu$.',
    commonPitfall:
      'Remember that $d^8, d^9, d^{10}$ configurations have identical numbers of unpaired electrons in both high-spin and low-spin octahedral geometries.',
    sourceOrigin: 'curated_high_yield',
  },
  {
    id: 'seed-chm-04',
    subject: 'Chemistry',
    chapter: 'Organic Chemistry',
    topic: 'Aldehydes and Ketones',
    title: 'Aldol vs Cannizzaro Reaction Distinction',
    frontPrompt:
      'What structural feature determines whether an aldehyde undergoes Aldol condensation versus Cannizzaro reaction in the presence of concentrated base?',
    formulaOrConcept:
      '$$\\text{Aldol: Requires } \\alpha\\text{-hydrogen } (\\ge 1 \\text{ H on } C_\\alpha)$$\n$$\\text{Mechanism: Base abstracts } \\alpha\\text{-H} \\to \\text{enolate nucleophile} \\to \\beta\\text{-hydroxycarbonyl}$$\n$$\\text{Cannizzaro: Strictly NO } \\alpha\\text{-hydrogen (e.g. HCHO, PhCHO, } (CH_3)_3C\\text{-CHO})$$\n$$\\text{Mechanism: Nucleophilic } OH^- \\text{ attack } \\to \\text{hydride shift (redox disproportionation)}$$\n$$2\\text{RCHO} + \\text{NaOH} \\xrightarrow{\\Delta} \\text{RCOONa} + \\text{RCH}_2\\text{OH}$$',
    explanation:
      'Without an enolizable proton on the $\\alpha$-carbon, deprotonation cannot occur. The concentrated base instead attacks the carbonyl carbon directly, triggering an intermolecular hydride ($H^-$) transfer.',
    commonPitfall:
      'Benzaldehyde ($\text{C}_6\text{H}_5\text{CHO}$) has hydrogen atoms on the benzene ring, but ZERO $\\alpha$-hydrogens on the carbon attached to the carbonyl. It undergoes Cannizzaro, NOT Aldol.',
    sourceOrigin: 'curated_high_yield',
  },

  // --- MATHEMATICS ---
  {
    id: 'seed-mth-01',
    subject: 'Mathematics',
    chapter: 'Calculus',
    topic: 'Definite Integrals',
    title: 'Leibniz Integral Rule for Differentiation Under the Integral Sign',
    frontPrompt:
      'State Leibniz’s Rule for differentiating an integral $I(x) = \\int_{u(x)}^{v(x)} f(x, t)\\,dt$ with respect to $x$.',
    formulaOrConcept:
      '$$\\frac{d}{dx}\\left[\\int_{u(x)}^{v(x)} f(x, t)\\,dt\\right] = f(x, v(x))\\cdot v\'(x) - f(x, u(x))\\cdot u\'(x) + \\int_{u(x)}^{v(x)} \\frac{\\partial f}{\\partial x}(x, t)\\,dt$$\n$$\\text{If } f \\text{ depends only on } t: \\quad \\frac{d}{dx}\\left[\\int_{u(x)}^{v(x)} f(t)\\,dt\\right] = f(v(x))\\cdot v\'(x) - f(u(x))\\cdot u\'(x)$$',
    explanation:
      'Frequently used in JEE to evaluate limits of the form $\\frac{0}{0}$ using L’Hôpital’s Rule where the numerator or denominator contains an integral with variable limits.',
    commonPitfall:
      'Forgetting the chain rule derivative of the upper limit $v\'(x)$ or lower limit $u\'(x)$. If $v(x) = x^2$, remember to multiply by $2x$.',
    sourceOrigin: 'curated_high_yield',
  },
  {
    id: 'seed-mth-02',
    subject: 'Mathematics',
    chapter: 'Conic Sections',
    topic: 'Tangents to Parabola, Ellipse, and Hyperbola',
    title: 'Standard Slope-Form Equations of Tangents to Conics',
    frontPrompt:
      'Write the slope-form equations of tangent (slope $m$) to: 1) Parabola $y^2 = 4ax$, 2) Ellipse $\\frac{x^2}{a^2} + \\frac{y^2}{b^2} = 1$, and 3) Hyperbola $\\frac{x^2}{a^2} - \\frac{y^2}{b^2} = 1$.',
    formulaOrConcept:
      '$$\\text{1) Parabola } y^2 = 4ax: \\quad y = mx + \\frac{a}{m} \\quad (m \\neq 0)$$\n$$\\text{2) Ellipse } \\frac{x^2}{a^2} + \\frac{y^2}{b^2} = 1: \\quad y = mx \\pm \\sqrt{a^2 m^2 + b^2}$$\n$$\\text{3) Hyperbola } \\frac{x^2}{a^2} - \\frac{y^2}{b^2} = 1: \\quad y = mx \\pm \\sqrt{a^2 m^2 - b^2} \\quad (a^2 m^2 > b^2)$$',
    explanation:
      'The director circle (locus of points from which perpendicular tangents can be drawn) is a point (directrix $x = -a$) for parabola, $x^2 + y^2 = a^2 + b^2$ for ellipse, and $x^2 + y^2 = a^2 - b^2$ for hyperbola.',
    commonPitfall:
      'For the rectangular hyperbola $xy = c^2$, the tangent at point $(ct, c/t)$ is $x + t^2 y = 2ct$, with slope $m = -1/t^2$.',
    sourceOrigin: 'curated_high_yield',
  },
  {
    id: 'seed-mth-03',
    subject: 'Mathematics',
    chapter: 'Vectors and 3D Geometry',
    topic: 'Skew Lines',
    title: 'Shortest Distance Between Two Skew Lines',
    frontPrompt:
      'Given two non-parallel, non-intersecting skew lines $\\mathbf{r} = \\mathbf{a}_1 + \\lambda \\mathbf{b}_1$ and $\\mathbf{r} = \\mathbf{a}_2 + \\mu \\mathbf{b}_2$, write the formula for the shortest distance $d$ between them.',
    formulaOrConcept:
      '$$d = \\left| \\frac{(\\mathbf{a}_2 - \\mathbf{a}_1) \\cdot (\\mathbf{b}_1 \\times \\mathbf{b}_2)}{|\\mathbf{b}_1 \\times \\mathbf{b}_2|} \\right|$$\n$$\\text{Condition for intersection (coplanarity): } (\\mathbf{a}_2 - \\mathbf{a}_1) \\cdot (\\mathbf{b}_1 \\times \\mathbf{b}_2) = 0$$\n$$\\text{In Cartesian: } \\begin{vmatrix} x_2 - x_1 & y_2 - y_1 & z_2 - z_1 \\\\ a_1 & b_1 & c_1 \\\\ a_2 & b_2 & c_2 \\end{vmatrix} = 0$$',
    explanation:
      'The vector $\\mathbf{b}_1 \\times \\mathbf{b}_2$ is perpendicular to both lines, so the shortest distance is the scalar projection of $(\\mathbf{a}_2 - \\mathbf{a}_1)$ onto this unit normal vector.',
    commonPitfall:
      'If the lines are parallel ($\\mathbf{b}_1 \\parallel \\mathbf{b}_2$), $|\\mathbf{b}_1 \\times \\mathbf{b}_2| = 0$, so you must use the parallel distance formula: $d = \\frac{|(\\mathbf{a}_2 - \\mathbf{a}_1) \\times \\mathbf{b}|}{|\\mathbf{b}|}$.',
    sourceOrigin: 'curated_high_yield',
  },
  {
    id: 'seed-mth-04',
    subject: 'Mathematics',
    chapter: 'Trigonometry & Complex Numbers',
    topic: 'De Moivre & Cube Roots of Unity',
    title: 'Properties of Cube Roots of Unity ($\\omega$)',
    frontPrompt:
      'State the fundamental algebraic identities for the complex cube roots of unity $1, \\omega, \\omega^2$, where $\\omega = e^{i 2\\pi/3} = -\\frac{1}{2} + i\\frac{\\sqrt{3}}{2}$.',
    formulaOrConcept:
      '$$1 + \\omega + \\omega^2 = 0, \\quad \\omega^3 = 1, \\quad \\omega^4 = \\omega$$\n$$\\omega^2 = \\bar{\\omega} = \\frac{1}{\\omega} = -\\frac{1}{2} - i\\frac{\\sqrt{3}}{2}$$\n$$a^3 + b^3 + c^3 - 3abc = (a + b + c)(a + b\\omega + c\\omega^2)(a + b\\omega^2 + c\\omega)$$\n$$x^2 + x + 1 = 0 \\implies x = \\omega, \\omega^2$$',
    explanation:
      'The roots form an equilateral triangle inscribed in the unit circle $|z| = 1$ with vertices at $1, e^{i 2\\pi/3}, e^{i 4\\pi/3}$. Any sum $\\sum_{k=0}^{n-1} \\omega^k$ equals 0 if $n$ is a multiple of 3.',
    commonPitfall:
      'Be alert to $x^2 - x + 1 = 0$; its roots are $-\\omega$ and $-\\omega^2$ (NOT $\\omega$ and $\\omega^2$).',
    sourceOrigin: 'curated_high_yield',
  },
];

export class ActiveRecallService {
  /**
   * Retrieves all flashcards from localStorage, merged with seed cards if empty.
   */
  public static getDeck(): Flashcard[] {
    if (typeof window === 'undefined') {
      return this.initializeSeedDeck();
    }

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        const seeded = this.initializeSeedDeck();
        this.saveDeck(seeded);
        return seeded;
      }
      const parsed: Flashcard[] = JSON.parse(raw);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        const seeded = this.initializeSeedDeck();
        this.saveDeck(seeded);
        return seeded;
      }
      return parsed;
    } catch {
      return this.initializeSeedDeck();
    }
  }

  /**
   * Saves flashcards to localStorage.
   */
  public static saveDeck(cards: Flashcard[]): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
    } catch (e) {
      console.error('Failed to save flashcards deck:', e);
    }
  }

  /**
   * Creates the initial default deck from curated high-yield JEE formulas.
   */
  private static initializeSeedDeck(): Flashcard[] {
    const now = new Date().toISOString();
    return HIGH_YIELD_SEED_CARDS.map((seed, idx) => ({
      ...seed,
      repetition: 0,
      intervalDays: 1,
      easeFactor: 2.5,
      nextReviewDate: now, // immediately due for fresh practice
      streak: 0,
      lapseCount: 0,
      box: 1,
    }));
  }

  /**
   * Scans historyMap and extracts key concepts & formulas from incorrect questions,
   * creating or updating flashcards with active-recall prompts and mistake insights.
   */
  public static extractCardsFromMistakes(
    historyMap: Record<string, QuestionHistoryRecord>,
    questionsMap: Map<string, NormalizedQuestion>,
    existingDeck: Flashcard[]
  ): { updatedDeck: Flashcard[]; newlyExtracted: number } {
    const currentDeck = [...existingDeck];
    const existingQuestionIds = new Set(
      currentDeck.filter((c) => c.questionId).map((c) => c.questionId)
    );

    let newlyExtracted = 0;
    const now = new Date().toISOString();

    for (const [qId, rec] of Object.entries(historyMap)) {
      if (!rec) continue;
      // Only questions where the student made mistakes
      const hasMistake =
        rec.lastResult === 'incorrect' || rec.incorrectCount > 0 || rec.masteryState === 'incorrect';

      if (!hasMistake) continue;
      if (existingQuestionIds.has(qId)) continue;

      const q = questionsMap.get(qId);
      if (!q) continue;

      // Clean prompt formulation
      const cleanSubject = q.subject;
      const cleanChapter = q.chapter || 'Core Mechanics';
      const cleanTopic = q.topic || 'Essential Principle';

      // Synthesize high-yield active recall prompt and formula
      const questionSnippet = q.question.length > 280 ? q.question.substring(0, 275) + '...' : q.question;
      const solutionSnippet = q.solution || q.explanation || 'Apply standard governing equation.';

      // Extract formulas (look for LaTeX equations in solution)
      let formulaBlock = '';
      const displayMathMatch = solutionSnippet.match(/\$\$([\s\S]+?)\$\$/);
      if (displayMathMatch) {
        formulaBlock = `$$${displayMathMatch[1].trim()}$$`;
      } else {
        const inlineMathMatches = solutionSnippet.match(/\$([^$]+)\$/g);
        if (inlineMathMatches && inlineMathMatches.length > 0) {
          formulaBlock = `$$${inlineMathMatches.slice(0, 3).map((m) => m.replace(/\$/g, '')).join(' \\quad \\implies \\quad ') }$$`;
        } else {
          formulaBlock = `$$\\text{Target Principle: } ${cleanTopic}$$`;
        }
      }

      const card: Flashcard = {
        id: `card-mistake-${qId}-${Date.now()}`,
        questionId: qId,
        subject: cleanSubject,
        chapter: cleanChapter,
        topic: cleanTopic,
        title: `${cleanChapter}: ${cleanTopic}`,
        frontPrompt: `In ${cleanChapter} (${cleanTopic}): Given the problem statement below, formulate the governing law, formula, or relationship required to reach the correct solution without error:\n\n> ${questionSnippet}`,
        formulaOrConcept: formulaBlock,
        explanation: solutionSnippet,
        commonPitfall:
          q.commonMistake ||
          'Review dimensional consistency, coordinate sign conventions, and ensure initial and boundary conditions are rigorously checked.',
        studentMistakeContext: rec.lastAnswer
          ? `Your previous attempt: Option "${rec.lastAnswer}". The verified key is "${q.correctAnswer}".`
          : `Missed in previous test attempt. Correct key: "${q.correctAnswer}".`,
        sourceOrigin: 'mistake_history',
        repetition: 0,
        intervalDays: 1,
        easeFactor: 2.5,
        nextReviewDate: now, // immediately due
        streak: 0,
        lapseCount: 1,
        box: 1,
      };

      currentDeck.unshift(card);
      existingQuestionIds.add(qId);
      newlyExtracted++;
    }

    if (newlyExtracted > 0) {
      this.saveDeck(currentDeck);
    }

    return { updatedDeck: currentDeck, newlyExtracted };
  }

  /**
   * Applies SuperMemo SM-2 Spaced-Repetition update when a card is reviewed.
   */
  public static processCardReview(
    cardId: string,
    rating: ReviewRating,
    deck: Flashcard[]
  ): { updatedDeck: Flashcard[]; updatedCard: Flashcard | null } {
    let targetCard: Flashcard | null = null;
    const now = new Date();

    const updatedDeck = deck.map((card) => {
      if (card.id !== cardId) return card;

      let { repetition, intervalDays, easeFactor, streak, lapseCount, box } = card;

      if (rating === 1) {
        // Again: Failed recall, resets repetition & box to 1
        repetition = 0;
        intervalDays = 0.007; // ~10 minutes (due today for re-drilling)
        easeFactor = Math.max(1.3, easeFactor - 0.2);
        box = 1;
        streak = 0;
        lapseCount += 1;
      } else if (rating === 2) {
        // Hard: Recalled with difficulty
        if (repetition === 0) {
          intervalDays = 1;
        } else {
          intervalDays = Math.max(1, Math.round(intervalDays * 1.2));
        }
        easeFactor = Math.max(1.3, easeFactor - 0.15);
        streak += 1;
        repetition += 1;
        box = Math.max(1, Math.min(2, box));
      } else if (rating === 3) {
        // Good: Standard successful recall
        if (repetition === 0) {
          intervalDays = 1;
        } else if (repetition === 1) {
          intervalDays = 3;
        } else {
          intervalDays = Math.round(intervalDays * easeFactor);
        }
        box = Math.min(5, box + 1);
        streak += 1;
        repetition += 1;
      } else if (rating === 4) {
        // Easy: Effortless recall, bonus factor
        if (repetition === 0) {
          intervalDays = 3;
        } else if (repetition === 1) {
          intervalDays = 6;
        } else {
          intervalDays = Math.round(intervalDays * easeFactor * 1.35);
        }
        easeFactor += 0.15;
        box = Math.min(5, box + 1);
        streak += 1;
        repetition += 1;
      }

      const nextDate = new Date(now.getTime() + intervalDays * 86400000);

      const modified: Flashcard = {
        ...card,
        repetition,
        intervalDays,
        easeFactor: Math.round(easeFactor * 100) / 100,
        nextReviewDate: nextDate.toISOString(),
        lastReviewedAt: now.toISOString(),
        streak,
        lapseCount,
        box,
      };

      targetCard = modified;
      return modified;
    });

    this.saveDeck(updatedDeck);
    return { updatedDeck, updatedCard: targetCard };
  }

  /**
   * Returns cards that are currently due for review (nextReviewDate <= now).
   */
  public static getDueCards(deck: Flashcard[], subjectFilter?: SubjectName): Flashcard[] {
    const now = new Date().getTime();
    return deck
      .filter((card) => {
        if (subjectFilter && card.subject !== subjectFilter) return false;
        return new Date(card.nextReviewDate).getTime() <= now;
      })
      .sort((a, b) => {
        // Sort lowest box first, then oldest due date
        if (a.box !== b.box) return a.box - b.box;
        return new Date(a.nextReviewDate).getTime() - new Date(b.nextReviewDate).getTime();
      });
  }

  /**
   * Calculates overall deck analytics and spaced-repetition distribution.
   */
  public static getDeckStats(deck: Flashcard[]): DeckStats {
    const now = new Date().getTime();
    let dueToday = 0;
    let learning = 0;
    let reviewing = 0;
    let mastered = 0;
    let mistakeDerivedCount = 0;

    const bySubject: Record<SubjectName, { total: number; due: number; mastered: number }> = {
      Physics: { total: 0, due: 0, mastered: 0 },
      Chemistry: { total: 0, due: 0, mastered: 0 },
      Mathematics: { total: 0, due: 0, mastered: 0 },
    };

    for (const card of deck) {
      const isDue = new Date(card.nextReviewDate).getTime() <= now;
      if (isDue) dueToday++;

      if (card.box <= 2) learning++;
      else if (card.box <= 4) reviewing++;
      else mastered++;

      if (card.sourceOrigin === 'mistake_history') {
        mistakeDerivedCount++;
      }

      if (bySubject[card.subject]) {
        bySubject[card.subject].total++;
        if (isDue) bySubject[card.subject].due++;
        if (card.box >= 5) bySubject[card.subject].mastered++;
      }
    }

    const totalCards = deck.length;
    const retentionRate =
      totalCards > 0 ? Math.round(((reviewing + mastered) / totalCards) * 100) : 0;

    return {
      totalCards,
      dueToday,
      learning,
      reviewing,
      mastered,
      bySubject,
      retentionRate,
      mistakeDerivedCount,
    };
  }
}
