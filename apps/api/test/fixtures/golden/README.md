# Golden-set retrieval fixture

Used by `src/modules/ai/retrieval/retrieval.golden.spec.ts` (Task 10 of
`docs/ai-rag/implementation-plan.md`) to measure whether vector retrieval actually returns the
right page, and to calibrate `MIN_SIMILARITY`.

## `document.pdf`

18 pages, one linear-algebra subtopic per page, ~11k characters total (roughly one chunk per
page at the default `CHUNK_MAX_CHARS = 2000`).

| Page | Topic                                  | Page | Topic                                  |
| ---- | -------------------------------------- | ---- | -------------------------------------- |
| 1    | Vector spaces and subspaces            | 10   | Diagonalization                        |
| 2    | Linear independence and basis          | 11   | Symmetric / orthogonal diagonalization |
| 3    | Dimension and rank                     | 12   | Inner product spaces                   |
| 4    | Linear transformations                 | 13   | Gram-Schmidt orthogonalization         |
| 5    | Matrix representation                  | 14   | QR decomposition                       |
| 6    | Change of basis                        | 15   | Singular value decomposition           |
| 7    | Determinants                           | 16   | Least squares problems                 |
| 8    | Eigenvalues, characteristic polynomial | 17   | Positive definite matrices             |
| 9    | Eigenvectors and eigenspaces           | 18   | Jordan canonical form                  |

**Deliberately single-subject.** A real past paper or lecture-note set is one subject
throughout, so every page is semantically similar and retrieval has to discriminate finely.
Pages 8–11 in particular are all eigen-adjacent, which is the hard case. A multi-topic
document (thermodynamics on page 3, graph theory on page 7) would separate far too cleanly
and would flatter the measured quality.

**Known limitation.** This is authored prose, not a scanned real-world document: no OCR noise,
no tables, no figure captions, uniform register. Numbers measured against it are therefore
optimistic relative to a genuine upload. **Re-validate the calibrated `MIN_SIMILARITY` against
a real past paper before trusting the off-topic refusal in production.**

## `questions.json`

10 on-topic questions with `expectedPages`, plus 12 off-topic questions.

**The off-topic set was widened from 3 to 12 on 2026-08-16, and the result changed the design's
conclusion.** With three probes the on-topic and off-topic similarity bands did not overlap
(0.675 vs 0.641), and `MIN_SIMILARITY` was calibrated inside that 0.034 gap. With twelve —
adding instruction-shaped requests and adjacent technical subjects, which is what real chat
traffic is made of — the off-topic ceiling rose to **0.713 and the bands now overlap**.

The gap was an artefact of the sample. No similarity threshold can separate on- from off-topic
on this corpus, so refusal must rest on the model's `OFF_TOPIC` sentinel, and `MIN_SIMILARITY`
survives only as a retrieval-quality gate deciding whether to answer from chunks or fall back to
the full document.

If you widen the set further, expect the ceiling to rise again rather than fall.

Page numbers are **1-based** and refer to `document.pdf` in this directory. **If that document
is replaced, every `expectedPages` value must be re-authored** — a stale mapping leaves the
eval passing while measuring nothing.

The questions avoid reusing the page headings verbatim, so a hit requires matching body content
rather than a title keyword.

## Why the eval asserts top-1 and top-3, not top-6

The fixture yields roughly one chunk per page, so with ~18 chunks a "somewhere in the top-6"
hit is a 1-in-3 coin flip — an 80% top-6 threshold would be satisfied by near-random ranking.
Top-1 has a ~6% random baseline here, so it measures ranking quality rather than luck.

Production still _serves_ top-6 (`RETRIEVAL_TOP_K`); this is a stricter measurement of the same
result set, not a change to what chat receives.

## Running it

Needs a live Ollama and Postgres, so it is opt-in:

```bash
RUN_GOLDEN_EVAL=1 pnpm --filter api test -- retrieval.golden
```
