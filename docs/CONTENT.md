# Questions and sources

The question bank covers selected topics in IN3050 and IN3230 using material available on 15 November 2026. The IN3230 bank excludes the C programming midterm and slides marked as outside the syllabus.

## Question files

- `src/content/in3050.json` contains the original IN3050 questions.
- `src/content/in3050-exam-foundations.json` and `in3050-exam-learning.json` draw on past and mock exams and lecture notes.
- `src/content/in3050-unsupervised.json` covers hierarchical clustering, k-means, autoencoders, PCA, and t-SNE from lecture 12.
- `src/content/in3230-core.json` covers networking principles, transport, congestion control, and wireless communications.
- `src/content/in3230-advanced.json` covers HTTP and QUIC, cloud computing, MPLS, interconnects, and network operations.
- `src/content/in3230-notes.json` contains applied questions based on IN3230 notes and slides.
- `src/content/in3230-wireless-iot.json` covers massive IoT, LoRaWAN, and NB-IoT from Wireless Communications III.
- The `*-topics.json` files hold topics, learning objectives, and source paths. `sources.json` records relative paths and SHA-256 checksums. `archived.json` holds retired questions that existing sessions still reference.

Each question has one correct answer, an explanation, a difficulty level, and specific references. Count PDF pages from the first page of the file. Count notebook cells and Word paragraphs from 1. State assumptions and show the intermediate steps in calculations.

## Past exams

The IN3050 bank includes questions adapted from 2020–2023 exams and mock exams. Some original free-response questions have been adapted to multiple-choice or true-or-false, sometimes with new values or examples. References identify the original document, PDF page, and question number where available. The bank excludes older topics absent from the current lecture material and questions marked as IN4050 only.

Some older answer keys contain typos or imprecise simplifications. Check answers against lecture materials and independent calculations. The IN3230 bank can use the same process for available past or mock exams.

## Add material

1. Pull the latest project files and run `npm ci`.
2. Keep original files in the local `resources/` directory or a separate resource folder. Place only assets intended for public distribution in `public/`.
3. Add a unique topic ID, description, objectives, and `sourcePaths` to the relevant topics file.
4. Add questions with unique, stable question and answer IDs. Use `choice` or `boolean` for `type` and `easy`, `medium`, or `hard` for `difficulty`. Import any new question file in `src/data.ts`.
5. Add precise `sourceRefs` and record each source's relative path, title, course, kind, and SHA-256 in `sources.json`. Use `kind: "Exam"` for past exams and mock exams. The syllabus lists the sources referenced by each topic's questions.
6. Run `npm test` and `npm run build`, then review the questions and explanations in the browser before committing.

The author converts source material into questions. The app reads the bundled question bank.

## Mathematical expressions

KaTeX renders inline `\(...\)` and display `\[...\]` math in questions, options, explanations, and tables. Escape each backslash in JSON.

```json
{
  "prompt": "What happens when \\(\\alpha\\) increases in \\(w_{t+1}=w_t-\\alpha\\nabla L(w_t)\\)?",
  "explanation": "Here \\(\\alpha\\) is the learning rate. A fraction can be written as \\[f(x)=\\frac{x^2}{2}\\]."
}
```

Use commands such as `\\lambda`, `x_i`, `n^2`, `\\frac{a}{b}`, and `\\begin{bmatrix}1&2\\\\3&4\\end{bmatrix}` within a JSON expression. Use `\\text{word}` for prose and `\\mathrm{ms}` for units. The tests check LaTeX syntax. Preview long expressions in the browser to check scrolling.

## Quality and session history

Give each question one correct answer and plausible distractors. Verify units, thresholds, rounding, and intermediate calculations. Use original diagrams and small tables with `table: { caption, columns, rows }` when they help.

Saved sessions reference question and answer IDs. Fix typos and translate equivalent wording under the existing IDs. For a change in meaning or the correct answer, move the original question to `archived.json` and assign a new ID to the revision. Legacy samples remain available to old sessions.

Multiple-choice options are shuffled per session and keep their order after a reload. True-or-false options use a fixed order. The static site includes the questions, explanations, and source metadata. Original course files stay local.
