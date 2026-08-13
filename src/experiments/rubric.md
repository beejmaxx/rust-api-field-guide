# Scoring rubric

<p class="chapter-subtitle">Measure observable design judgment, not resemblance to one canonical solution.</p>

Score the final challenge out of 18. Partial credit is encouraged. A different design can earn full credit when its tradeoffs are explicit and consistent.

## 1. Information model — 0 to 3

- **0:** metadata and payload are an unstructured blob.
- **1:** distinct fields exist, but important validated states collapse back to strings or booleans.
- **2:** stable metadata is separated from variable payload representation.
- **3:** the design also explains why each distinction belongs in a type and what remains private.

## 2. Ownership and transformation — 0 to 3

- **0:** borrowed data is retained unsafely or ownership is not specified.
- **1:** the API mostly owns values but transformation requires needless cloning or serialization.
- **2:** borrow, mutate, consume, and transform operations use appropriate receivers.
- **3:** type-changing transformation and streaming constraints are defended clearly.

## 3. Construction and validation — 0 to 3

- **0:** invalid destination or authentication reaches network activity.
- **1:** validation exists but its observation point is unclear.
- **2:** the terminal or phase boundary returns structured validation errors.
- **3:** compile-time phases and runtime checks are chosen according to omission cost, with complexity acknowledged.

## 4. Retry and replayability — 0 to 4

- **0:** the design resends a consumed value or assumes every payload is `Clone`.
- **1:** attempts are looped, but response classification or replay is incomplete.
- **2:** responses and errors can both be classified; attempt counting is clear.
- **3:** replayability is explicit through a value capability or attempt factory.
- **4:** idempotency, delay policy, unreplayable inputs, and exhausted failure context form one coherent contract.

## 5. Evolution and errors — 0 to 3

- **0:** one opaque string error and public representation leave little evolution room.
- **1:** errors are structured or representation is hidden, but not both.
- **2:** callers can classify failures while implementation details remain private.
- **3:** the design identifies a plausible version-two extension and a deliberate compatibility seam.

## 6. Communication — 0 to 2

- **0:** signatures are internally inconsistent or unexplained.
- **1:** the happy path is understandable.
- **2:** alternatives, assumptions, and tradeoffs are concise enough for a reviewer to evaluate.

## Interpreting a result

| Score | Interpretation |
|---:|---|
| 0–6 | Mechanisms are being recalled without a stable design model yet. |
| 7–11 | Several sound local choices; work on interactions among ownership, errors, and evolution. |
| 12–15 | Strong practical design with a few missing edge contracts. |
| 16–18 | Coherent, defensible public API judgment. |

The score is diagnostic, not a grade. Record the weakest category and use that—not preference alone—to choose the next edition.
