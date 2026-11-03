# JEE Main Test Generator

A full-stack **computer-based testing (CBT) platform** built around **5,263 verified JEE Main previous-year questions** across Physics, Chemistry, and Mathematics.

**[Live Demo](https://test-generator-app-navy.vercel.app/)**

Generate custom tests, simulate the examination environment, analyse mistakes, and track performance—all within a single platform.

<img width="1274" height="682" alt="Test Generator Interface" src="https://github.com/user-attachments/assets/538f97c2-89be-42e2-a191-f1e3f2db4fad" />

## Features

- **Custom Test Generation** — Generate full-syllabus mocks, subject-specific tests, or chapter-wise assessments.
- **Configurable Difficulty** — Control the distribution of Easy, Medium, and Hard questions.
- **Authentic PYQ Bank** — 5,263 verified JEE Main questions with checked answers and solutions.
- **CBT Interface** — Timed examinations, question navigation, response tracking, and an on-screen numerical keypad.
- **Examination Monitoring** — Tab-switch detection records when students navigate away from the examination window in an audit log.
- **Target Score** — Set a target score before beginning an examination.
- **Mathematical Rendering** — KaTeX-powered mathematical equations and dynamically rendered scientific diagrams using SVG.
- **Detailed Performance Analytics** — Analyse scores, accuracy, subject-wise performance, time expenditure, and mistakes.
- **Chapter-wise Mastery Tracking** — Visualise chapter-wise accuracy and compare performance against an approximately 65% JEE Main reference benchmark.
- **Chapter-wise Drills** — Practise individual chapters through targeted question sets.
- **Flashcards** — An additional tool for concept revision and active recall.
- **Mistake Retests** — Generate targeted tests from incorrectly answered or skipped questions.
- **Percentile Estimation** — View an estimated percentile alongside examination performance.
- **Performance Logging** — Record test data for future performance analysis.
- **Reduced Repetition** — Question-history-aware test generation helps minimise repeated questions across tests.

<img width="1104" height="613" alt="Test Interface and Features" src="https://github.com/user-attachments/assets/e05d503d-c060-4369-9c8e-6b08335bf98b" />

## Question Bank

| Subject | Questions |
|:---|---:|
| Physics | 1,753 |
| Chemistry | 1,863 |
| Mathematics | 1,647 |
| **Total** | **5,263** |

Questions can be filtered by **subject, chapter, difficulty, and question type**.

## Performance Analytics & Diagnostics

The diagnostic system is designed to help students understand not only their examination scores but also the factors contributing to those scores.

### Overall Performance Report

The score report provides:

- Raw score
- Percentage score
- Estimated percentile, where supported
- Total attempted questions
- Accuracy rate
- Penalty deductions

These metrics provide a high-level overview of examination performance.

> **Note:** Percentile estimates are not official JEE percentiles and should not be interpreted as actual NTA results.

<img width="1280" height="679" alt="Performance Report" src="https://github.com/user-attachments/assets/9adb45c7-3ce1-40ae-83d1-697de28227a6" />

### Subject-Level Performance

Performance can be examined separately across **Physics, Chemistry, and Mathematics**.

This helps distinguish between an overall score limited by one weaker subject and a score reflecting more uniform performance.

### Question-Type Analysis

Where supported, reports separate MCQ and numerical-question performance.

This can help identify whether performance differences arise from conceptual mistakes, numerical execution, or differences in performance between question formats.

<img width="1280" height="679" alt="Question Type Analysis" src="https://github.com/user-attachments/assets/09978e08-9135-413f-8bbd-4a71daf38339" />

### Time Analytics

Time analysis compares the time spent on different response outcomes.

| Category | Diagnostic Purpose |
|:---|:---|
| Correct responses | Examines the time required to solve questions successfully. |
| Incorrect responses | Helps identify inefficient approaches and unproductive time expenditure. |
| Unattempted questions | Helps investigate questions that were skipped or left incomplete. |

For example, a student may achieve high accuracy on a topic but take substantially longer than expected to solve its questions.

Another student may answer quickly but make repeated calculation errors.

These cases require different interventions, even if their overall scores are similar.

### Step-by-Step Solution Review

After submission, the platform provides a solution-review workflow with detailed derivations and diagrammatic references where available.

This allows students to compare their approach with the intended solution and identify where their reasoning diverged.

### One-Click Mistake Retests

The mistake-retest workflow creates a targeted assessment using questions the student answered incorrectly or left unattempted.

The workflow reduces the friction between identifying a weakness and practising it again.

A typical revision cycle is:

**Complete a test → Review the diagnostic report → Identify mistakes → Generate a mistake retest → Attempt the selected questions again → Reassess performance**

<img width="1280" height="680" alt="Solution Review and Mistake Retests" src="https://github.com/user-attachments/assets/17b279ba-fbd9-4742-8827-e92bd6e40d55" />

### Chapter-wise Mastery Tracking

The mastery chart visualises chapter-wise accuracy using results from completed tests.

Performance is compared against an approximately 65% reference benchmark based on JEE Main requirements.

For example, answering 8 out of 10 questions correctly produces 80% accuracy, allowing students to compare their performance with the reference benchmark.

This helps identify chapters that may require further practice.

### Chapter-wise Drills and Flashcards

The platform also provides focused revision tools beyond full-length examinations.

- **Chapter-wise Drills:** Practise individual chapters through targeted question sets.
- **Flashcards:** Revise and recall important concepts through flashcard-based practice.

## Examination Environment

The CBT interface is designed to simulate the structure of a computer-based examination.

It includes:

- Examination timer
- Subject-wise navigation
- Question palette
- Answer status indicators
- Mark-for-review functionality
- On-screen numerical keypad
- Target score display
- Tab-switch detection and incident logging

When a student navigates away from the examination window, the platform records the detected incident in its audit log.

## Workflow

**Generate → Attempt → Evaluate → Analyse → Practise → Retest**

1. Configure a full-length, subject-wise, or chapter-wise test.
2. Set a target score and attempt the examination in the timed CBT interface.
3. Review solutions and detailed performance analytics.
4. Examine chapter-wise accuracy and identify areas requiring improvement.
5. Use chapter drills, flashcards, or mistake-based retests for targeted revision.
6. Track performance through subsequent tests.

## Tech Stack

- **Backend:** Node.js, Express
- **Deployment:** Vercel-compatible serverless API
- **Rendering:** KaTeX, SVG
- **Storage & Delivery:** Backend persistence, static question-bank assets, and browser storage

## Purpose

The goal is to make JEE preparation more targeted: not just taking tests, but identifying weaknesses, revisiting mistakes, practising specific chapters, and measuring performance against defined benchmarks.

The platform brings examination simulation, performance analysis, and targeted revision together in one environment.

> **Note:** Percentile figures are estimates, not official NTA results.
