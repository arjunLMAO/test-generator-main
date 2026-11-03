# JEE Main Test Generator

A full-stack **computer-based testing (CBT) platform** built around **5,263 verified JEE Main previous-year questions** across Physics, Chemistry, and Mathematics.

**[Live Demo](https://test-generator-app-navy.vercel.app/)**

Generate custom tests, simulate the examination environment, analyze mistakes, and track performance—all within a single platform.

<img width="1280" height="683" alt="Screenshot 2026-10-08 at 13 57 58" src="https://github.com/user-attachments/assets/81e49491-6144-4156-a2bd-a4563702734d" />


## Features

* **Custom Test Generation** — Generate full-syllabus mocks, subject-specific tests, or chapter-wise assessments.
* **Configurable Difficulty** — Control the distribution of Easy, Medium, and Hard questions.
* **Authentic PYQ Bank** — 5,263 verified JEE Main questions with checked answers and solutions.
* **CBT Interface** — Timed examinations, question navigation, response tracking, and an on-screen numerical keypad.
* **Mathematical Rendering** — KaTeX-powered mathematical equations and dynamically rendered scientific diagrams using SVG.
* **Detailed Performance Analytics** — Analyze scores, accuracy, subject-wise performance, time expenditure, and mistakes.
* **Mistake Retests** — Generate targeted tests from incorrectly answered or skipped questions.
* **Percentile Estimation** — View an estimated percentile alongside examination performance.
* **Performance Logging** — Record test data for future performance analysis.
* **Reduced Repetition** — Question-history-aware test generation helps minimize repeated questions across tests.

  <img width="1280" height="685" alt="Screenshot 2026-10-08 at 13 58 33" src="https://github.com/user-attachments/assets/8b7ac1fc-7265-4c0b-b07e-eebd34db6bc9" />


## Question Bank

| Subject     | Questions |
| :---------- | --------: |
| Physics     |     1,753 |
| Chemistry   |     1,863 |
| Mathematics |     1,647 |
| **Total**   | **5,263** |

Questions can be filtered by **subject, chapter, difficulty, and question type**.

## Performance Analytics & Diagnostics

The diagnostic system is designed to help students understand not only their examination scores but also the factors contributing to those scores.

### Overall Performance Report

The score report provides:

* Raw score
* Percentage score
* Estimated percentile, where supported
* Total attempted questions
* Accuracy rate
* Penalty deductions

These metrics provide a high-level overview of examination performance.

> **Note:** Percentile estimates are not official JEE percentiles. An estimated percentile should not be interpreted as an actual NTA result unless it is derived from a validated, representative dataset and the relevant examination methodology.

### Subject-Level Performance

Performance can be examined separately across **Physics, Chemistry, and Mathematics**.

This helps distinguish between an overall score that is limited by one weaker subject and a score reflecting more uniform performance.

### Question-Type Analysis

Where supported, reports separate MCQ and numerical-question performance.

This can help identify whether performance differences arise from conceptual mistakes, numerical execution, or differences in performance between question formats.

### Time Analytics

Time analysis compares the time spent on different response outcomes.

| Category              | Diagnostic Purpose                                                                   |
| :-------------------- | :----------------------------------------------------------------------------------- |
| Correct responses     | Examines the time required to solve questions successfully.                          |
| Incorrect responses   | Helps identify inefficient approaches and potentially unproductive time expenditure. |
| Unattempted questions | Helps investigate questions that were skipped or left incomplete.                    |

For example, a student may achieve high accuracy on a topic but take substantially longer than expected to solve its questions.

Another student may answer quickly but make repeated calculation errors.

These cases require different interventions, even if their overall scores are similar.

### Step-by-Step Solution Review

After submission, the platform provides a solution-review workflow with detailed derivations and diagrammatic references where available.

This allows students to compare their approach with the intended solution and identify the point at which their reasoning diverged.

### One-Click Mistake Retests

The mistake-retest workflow creates a targeted assessment using questions the student answered incorrectly or left unattempted.

The workflow is intended to reduce the friction between identifying a weakness and practicing it again.

A typical revision cycle is:

**Complete a test → Review the diagnostic report → Identify incorrect and skipped questions → Generate a mistake retest → Attempt the selected questions again → Reassess understanding**

This transforms examination results into a reusable source of revision material.

## Workflow

**Generate → Attempt → Evaluate → Analyze → Retest**

1. Configure a full-length, subject-wise, or chapter-wise test.
2. Attempt it in the timed CBT interface.
3. Review solutions and detailed performance analytics.
4. Identify weak areas and generate mistake-based retests.
5. Log results to support future performance analysis.

## Tech Stack

* **Backend:** Node.js, Express
* **Deployment:** Vercel-compatible serverless API
* **Rendering:** KaTeX, SVG
* **Storage & Delivery:** Backend persistence, static question-bank assets, and browser storage

## Purpose

The goal is to make JEE preparation more targeted: not just taking tests, but identifying weaknesses, revisiting mistakes, and measuring progress over time.

> **Note:** Percentile figures are estimates, not official NTA results.
